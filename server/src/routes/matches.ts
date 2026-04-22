import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db';
import { authenticate } from '../middleware/authenticate';

export async function matchRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const matches = await query(
      `SELECT m.*,
              CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END AS partner_id,
              p.display_name, p.photos, p.city_display, p.birth_date,
              u.verification_level,
              (SELECT content FROM messages WHERE match_id = m.id AND is_deleted = false ORDER BY created_at DESC LIMIT 1) AS last_message_content,
              (SELECT created_at FROM messages WHERE match_id = m.id AND is_deleted = false ORDER BY created_at DESC LIMIT 1) AS last_message_at,
              (SELECT sender_id FROM messages WHERE match_id = m.id AND is_deleted = false ORDER BY created_at DESC LIMIT 1) AS last_sender_id,
              (SELECT COUNT(*) FROM messages WHERE match_id = m.id AND sender_id != $1 AND read_at IS NULL) AS unread_count
       FROM matches m
       JOIN profiles p ON p.user_id = CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END
       JOIN users u ON u.id = p.user_id
       WHERE (m.user_a_id = $1 OR m.user_b_id = $1)
         AND m.status IN ('pending', 'active')
       ORDER BY COALESCE(last_message_at, m.matched_at) DESC`,
      [user.id]
    );
    return { matches };
  });

  app.get('/expired', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const matches = await query(
      `SELECT m.*,
              CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END AS partner_id,
              p.display_name, p.photos
       FROM matches m
       JOIN profiles p ON p.user_id = CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END
       WHERE (m.user_a_id = $1 OR m.user_b_id = $1)
         AND m.status = 'expired'
         AND m.updated_at > NOW() - INTERVAL '7 days'
       ORDER BY m.updated_at DESC
       LIMIT 20`,
      [user.id]
    );
    return { matches };
  });

  app.get('/:matchId', { preHandler: [authenticate] }, async (req, reply) => {
    const user = req.user as { id: string };
    const { matchId } = req.params as { matchId: string };

    const match = await queryOne(
      `SELECT m.*,
              CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END AS partner_id
       FROM matches m
       WHERE m.id = $2 AND (m.user_a_id = $1 OR m.user_b_id = $1)`,
      [user.id, matchId]
    );

    if (!match) return reply.code(404).send({ error: 'Match not found' });
    return match;
  });

  app.get('/:matchId/insights', { preHandler: [authenticate] }, async (req, reply) => {
    const user = req.user as { id: string };
    const { matchId } = req.params as { matchId: string };

    const match = await queryOne<{ match_score: number; match_reasons: unknown[] }>(
      `SELECT match_score, match_reasons FROM matches
       WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)`,
      [matchId, user.id]
    );

    if (!match) return reply.code(404).send({ error: 'Match not found' });

    return {
      score: match.match_score,
      scorePercent: Math.round((match.match_score ?? 0.5) * 100),
      reasons: match.match_reasons ?? [],
    };
  });

  app.post('/:matchId/unmatch', { preHandler: [authenticate] }, async (req, reply) => {
    const user = req.user as { id: string };
    const { matchId } = req.params as { matchId: string };
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);

    const updated = await query(
      `UPDATE matches
       SET status = 'unmatched', unmatched_by = $1, unmatch_reason = $2, updated_at = NOW()
       WHERE id = $3 AND (user_a_id = $1 OR user_b_id = $1)
         AND status IN ('pending','active')
       RETURNING id`,
      [user.id, reason ?? null, matchId]
    );

    if (updated.length === 0) return reply.code(404).send({ error: 'Match not found' });
    return { unmatched: true };
  });
}
