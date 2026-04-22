import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { query, queryOne } from '../db';
import { authenticate } from '../middleware/authenticate';
import { getUploadUrl, getPublicUrl } from '../integrations/r2Client';
import { moderateImage } from '../integrations/moderationClient';
import { getObjectBuffer } from '../integrations/r2Client';
import { validateBio, validateAge, getAge } from '@verified/shared';

export async function profileRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: [authenticate] }, async (req, reply) => {
    const user = req.user as { id: string };
    const profile = await queryOne(
      'SELECT * FROM profiles WHERE user_id = $1',
      [user.id]
    );
    if (!profile) return reply.code(404).send({ error: 'Profile not found' });
    return profile;
  });

  app.post('/me', { preHandler: [authenticate] }, async (req, reply) => {
    const user = req.user as { id: string };
    const schema = z.object({
      displayName: z.string().min(2).max(50),
      birthDate: z.string(),
      gender: z.string().min(1),
      lookingFor: z.array(z.string()),
      bio: z.string().max(500).optional(),
      occupation: z.string().max(100).optional(),
      education: z.string().max(100).optional(),
      heightCm: z.number().int().min(100).max(250).optional(),
      cityDisplay: z.string().max(100).optional(),
      interests: z.array(z.string()).max(20).optional(),
      lifestyle: z.record(z.unknown()).optional(),
      matchDistanceKm: z.number().int().min(5).max(200).optional(),
      agePrefMin: z.number().int().min(18).max(99).optional(),
      agePrefMax: z.number().int().min(18).max(99).optional(),
    });

    const data = schema.parse(req.body);
    const ageError = validateAge(data.birthDate);
    if (ageError) return reply.code(400).send({ error: ageError });

    const existing = await queryOne('SELECT id FROM profiles WHERE user_id = $1', [user.id]);
    if (existing) {
      await query(
        `UPDATE profiles SET
           display_name = $1, birth_date = $2, gender = $3, looking_for = $4,
           bio = $5, occupation = $6, education = $7, height_cm = $8,
           city_display = $9, interests = $10, lifestyle = $11,
           match_distance_km = COALESCE($12, match_distance_km),
           age_pref_min = COALESCE($13, age_pref_min),
           age_pref_max = COALESCE($14, age_pref_max),
           updated_at = NOW()
         WHERE user_id = $15`,
        [
          data.displayName, data.birthDate, data.gender, data.lookingFor,
          data.bio ?? null, data.occupation ?? null, data.education ?? null, data.heightCm ?? null,
          data.cityDisplay ?? null, data.interests ?? [], JSON.stringify(data.lifestyle ?? {}),
          data.matchDistanceKm ?? null, data.agePrefMin ?? null, data.agePrefMax ?? null,
          user.id,
        ]
      );
    } else {
      await query(
        `INSERT INTO profiles (user_id, display_name, birth_date, gender, looking_for, bio,
           occupation, education, height_cm, city_display, interests, lifestyle,
           match_distance_km, age_pref_min, age_pref_max)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          user.id, data.displayName, data.birthDate, data.gender, data.lookingFor,
          data.bio ?? null, data.occupation ?? null, data.education ?? null, data.heightCm ?? null,
          data.cityDisplay ?? null, data.interests ?? [], JSON.stringify(data.lifestyle ?? {}),
          data.matchDistanceKm ?? 50, data.agePrefMin ?? 18, data.agePrefMax ?? 99,
        ]
      );
    }

    return queryOne('SELECT * FROM profiles WHERE user_id = $1', [user.id]);
  });

  app.post('/me/photos/upload-url', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const key = `photos/${user.id}/${nanoid()}.jpg`;
    const uploadUrl = await getUploadUrl(key, 'image/jpeg');
    return { uploadUrl, key, photoId: nanoid() };
  });

  app.post('/me/photos/confirm', { preHandler: [authenticate] }, async (req, reply) => {
    const { key, photoId } = z.object({ key: z.string(), photoId: z.string() }).parse(req.body);
    const user = req.user as { id: string };

    // Run content moderation
    const imageBuffer = await getObjectBuffer(key);
    const modResult = await moderateImage(imageBuffer);

    if (modResult.score >= 0.95) {
      return reply.code(400).send({
        error: 'Photo contains inappropriate content and cannot be uploaded.',
        moderationScore: modResult.score,
      });
    }

    const moderationStatus = modResult.score >= 0.30 ? 'pending' : 'approved';
    const publicUrl = getPublicUrl(key);

    const photo = {
      id: photoId,
      url: publicUrl,
      thumbnailUrl: publicUrl,
      isPrimary: false,
      order: 99,
      moderationStatus,
      faceMatchScore: null,
      s3Key: key,
    };

    // Append to photos array in profile
    await query(
      `UPDATE profiles
       SET photos = photos || $1::jsonb, updated_at = NOW()
       WHERE user_id = $2`,
      [JSON.stringify([photo]), user.id]
    );

    if (modResult.score >= 0.30) {
      await query(
        `INSERT INTO moderation_queue (content_type, content_id, content_url, source, ai_score, ai_categories, priority)
         VALUES ('profile_photo', $1::uuid, $2, 'ai_auto', $3, $4, $5)`,
        [
          photoId.replace(/-/g, '').padEnd(32, '0').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5'),
          publicUrl, modResult.score, JSON.stringify(modResult.categories),
          modResult.score >= 0.70 ? 2 : 5,
        ]
      );
    }

    return { photo, requiresFaceMatch: true };
  });

  app.delete('/me/photos/:photoId', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const { photoId } = req.params as { photoId: string };

    await query(
      `UPDATE profiles
       SET photos = (
         SELECT jsonb_agg(p) FROM jsonb_array_elements(photos) p WHERE p->>'id' != $1
       ), updated_at = NOW()
       WHERE user_id = $2`,
      [photoId, user.id]
    );

    return { deleted: true };
  });

  app.get('/:userId', { preHandler: [authenticate] }, async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const profile = await queryOne(
      `SELECT p.*, u.verification_level
       FROM profiles p JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1 AND u.deleted_at IS NULL`,
      [userId]
    );
    if (!profile) return reply.code(404).send({ error: 'Profile not found' });
    return profile;
  });
}
