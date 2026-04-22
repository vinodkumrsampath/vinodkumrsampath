import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db';
import { requireFullVerification } from '../middleware/authenticate';
import { AD_CARD_FREQUENCY } from '@verified/shared';
import { getAge } from '@verified/shared';

export async function discoveryRoutes(app: FastifyInstance) {
  app.get('/feed', { preHandler: [requireFullVerification] }, async (req, reply) => {
    const user = req.user as { id: string };
    const { page = 0 } = req.query as { page?: number };

    const myProfile = await queryOne<{
      location: string | null;
      match_distance_km: number;
      age_pref_min: number;
      age_pref_max: number;
      looking_for: string[];
      gender: string;
    }>(
      'SELECT location, match_distance_km, age_pref_min, age_pref_max, looking_for, gender FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (!myProfile) return reply.code(400).send({ error: 'Complete your profile first' });

    // Get already-swiped users
    const swiped = await query<{ swiped_id: string }>(
      'SELECT swiped_id FROM swipes WHERE swiper_id = $1',
      [user.id]
    );
    const swipedIds = swiped.map((s) => s.swiped_id);
    swipedIds.push(user.id);

    const excludePlaceholders = swipedIds.map((_, i) => `$${i + 5}`).join(',');
    const distanceFilter = myProfile.location
      ? `AND ST_DWithin(p.location, ST_GeomFromText('POINT(' || $3 || ' ' || $4 || ')', 4326)::geography, $2 * 1000)`
      : '';

    // Extract lon/lat from PostGIS point (if location set)
    const locationParts = myProfile.location
      ? myProfile.location.replace('POINT(', '').replace(')', '').split(' ')
      : ['0', '0'];

    const profiles = await query(
      `SELECT p.*, u.verification_level,
              DATE_PART('year', AGE(p.birth_date::date)) AS age
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       WHERE u.id NOT IN (${excludePlaceholders.length > 0 ? excludePlaceholders : "'00000000-0000-0000-0000-000000000000'"})
         AND u.account_status = 'active'
         AND u.verification_level = 'full'
         AND p.is_discoverable = true
         AND p.profile_complete = true
         AND DATE_PART('year', AGE(p.birth_date::date)) BETWEEN $5 AND $6
         ${distanceFilter}
       ORDER BY u.last_active_at DESC NULLS LAST
       LIMIT 20 OFFSET $1`,
      [
        page * 20,
        myProfile.match_distance_km,
        locationParts[0],
        locationParts[1],
        myProfile.age_pref_min,
        myProfile.age_pref_max,
        ...swipedIds,
      ]
    );

    // Check if user has premium (no ads)
    const sub = await queryOne<{ tier: string }>(
      'SELECT tier FROM subscriptions WHERE user_id = $1',
      [user.id]
    );
    const isPremium = sub?.tier === 'premium';

    // Inject ad cards for free users
    if (!isPremium && profiles.length > 0) {
      const withAds: unknown[] = [];
      profiles.forEach((p, i) => {
        withAds.push(p);
        if ((i + 1) % AD_CARD_FREQUENCY === 0) {
          withAds.push({ type: 'ad', id: `ad-${i}` });
        }
      });
      return { profiles: withAds, total: profiles.length };
    }

    return { profiles, total: profiles.length };
  });

  app.post('/swipe', { preHandler: [requireFullVerification] }, async (req, reply) => {
    const { targetId, direction } = z.object({
      targetId: z.string().uuid(),
      direction: z.enum(['like', 'pass']),
    }).parse(req.body);

    const user = req.user as { id: string };

    // Prevent self-swipe
    if (targetId === user.id) return reply.code(400).send({ error: 'Cannot swipe on yourself' });

    // Insert swipe (ignore duplicate)
    await query(
      `INSERT INTO swipes (swiper_id, swiped_id, direction)
       VALUES ($1, $2, $3) ON CONFLICT (swiper_id, swiped_id) DO NOTHING`,
      [user.id, targetId, direction]
    );

    if (direction === 'pass') return { matched: false };

    // Check if target has already liked us
    const theirLike = await queryOne(
      `SELECT id FROM swipes WHERE swiper_id = $1 AND swiped_id = $2 AND direction = 'like'`,
      [targetId, user.id]
    );

    if (!theirLike) return { matched: false };

    // Mutual like — create match with canonical ordering
    const [userAId, userBId] = [user.id, targetId].sort();

    const existing = await queryOne(
      'SELECT id FROM matches WHERE user_a_id = $1 AND user_b_id = $2',
      [userAId, userBId]
    );

    if (existing) return { matched: true, matchId: (existing as { id: string }).id };

    const matchScore = await computeMatchScore(user.id, targetId);
    const matchReasons = await computeMatchReasons(user.id, targetId);

    const newMatch = await queryOne<{ id: string }>(
      `INSERT INTO matches (user_a_id, user_b_id, match_score, match_reasons)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userAId, userBId, matchScore, JSON.stringify(matchReasons)]
    );

    // Create message cooldown window
    await query(
      'INSERT INTO message_cooldowns (match_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [newMatch!.id]
    );

    return { matched: true, matchId: newMatch!.id };
  });
}

async function computeMatchScore(userId: string, targetId: string): Promise<number> {
  const [p1, p2] = await Promise.all([
    queryOne<{ interests: string[]; age_pref_min: number; age_pref_max: number; birth_date: string }>(
      'SELECT interests, age_pref_min, age_pref_max, birth_date FROM profiles WHERE user_id = $1',
      [userId]
    ),
    queryOne<{ interests: string[]; birth_date: string }>(
      'SELECT interests, birth_date FROM profiles WHERE user_id = $1',
      [targetId]
    ),
  ]);

  if (!p1 || !p2) return 0.5;

  const sharedInterests = (p1.interests ?? []).filter((i: string) =>
    (p2.interests ?? []).includes(i)
  ).length;
  const interestScore = Math.min(sharedInterests / 5, 1) * 0.5;
  const baseScore = 0.3;

  return Math.min(baseScore + interestScore + 0.2, 1);
}

async function computeMatchReasons(userId: string, targetId: string): Promise<Array<{ factor: string; weight: number; detail: string }>> {
  const [p1, p2] = await Promise.all([
    queryOne<{ interests: string[]; city_display: string | null }>(
      'SELECT interests, city_display FROM profiles WHERE user_id = $1',
      [userId]
    ),
    queryOne<{ interests: string[]; city_display: string | null }>(
      'SELECT interests, city_display FROM profiles WHERE user_id = $1',
      [targetId]
    ),
  ]);

  const reasons = [];
  if (p1 && p2) {
    const shared = (p1.interests ?? []).filter((i: string) => (p2.interests ?? []).includes(i));
    if (shared.length > 0) {
      reasons.push({ factor: 'interests', weight: 0.5, detail: `Both enjoy: ${shared.slice(0, 3).join(', ')}` });
    }
    if (p1.city_display && p2.city_display && p1.city_display === p2.city_display) {
      reasons.push({ factor: 'location', weight: 0.3, detail: `Both in ${p1.city_display}` });
    }
  }

  return reasons;
}
