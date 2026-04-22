import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { query, queryOne } from '../db';
import { authenticate } from '../middleware/authenticate';
import { compareFaces, detectLiveness } from '../integrations/faceApiClient';
import { getObjectBuffer, getUploadUrl, getPublicUrl } from '../integrations/r2Client';
import { FACE_MATCH_THRESHOLD } from '@verified/shared';

export async function verificationRoutes(app: FastifyInstance) {
  app.get('/status', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const rows = await query<{ type: string; status: string; verified_at: string | null }>(
      'SELECT type, status, verified_at FROM verifications WHERE user_id = $1',
      [user.id]
    );
    const byType = Object.fromEntries(rows.map((r) => [r.type, r]));
    const userRow = await queryOne<{ verification_level: string }>(
      'SELECT verification_level FROM users WHERE id = $1',
      [user.id]
    );

    return {
      email: byType['email'] ?? null,
      selfie: byType['selfie_capture'] ?? null,
      overallLevel: userRow?.verification_level ?? 'none',
    };
  });

  // Step 1: Get presigned URL to upload selfie to R2
  app.post('/selfie/upload-url', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const key = `selfies/${user.id}/${nanoid()}.jpg`;
    const uploadUrl = await getUploadUrl(key, 'image/jpeg');
    return { uploadUrl, key };
  });

  // Step 2: Confirm selfie uploaded — run liveness check
  app.post('/selfie/confirm', { preHandler: [authenticate] }, async (req, reply) => {
    const { key } = z.object({ key: z.string() }).parse(req.body);
    const user = req.user as { id: string };

    const imageBuffer = await getObjectBuffer(key);
    const isLive = await detectLiveness(imageBuffer);

    if (!isLive) {
      return reply.code(400).send({
        error: 'No face detected. Please retake your selfie in good lighting.',
      });
    }

    // Store selfie key on profile
    await query(
      'UPDATE profiles SET selfie_s3_key = $1, updated_at = NOW() WHERE user_id = $2',
      [key, user.id]
    );

    await query(
      `INSERT INTO verifications (user_id, type, status, verified_at)
       VALUES ($1, 'selfie_capture', 'passed', NOW())
       ON CONFLICT (user_id, type) DO UPDATE
       SET status = 'passed', verified_at = NOW(), updated_at = NOW()`,
      [user.id]
    );

    // Upgrade verification level to 'full' (email + selfie = full)
    await query(
      `UPDATE users SET verification_level = 'full', updated_at = NOW() WHERE id = $1`,
      [user.id]
    );

    return { verified: true, message: 'Selfie verified. You are now fully verified!' };
  });

  // Called after each profile photo upload — checks face match against selfie
  app.post('/photo/face-match', { preHandler: [authenticate] }, async (req, reply) => {
    const { photoKey } = z.object({ photoKey: z.string() }).parse(req.body);
    const user = req.user as { id: string };

    const profile = await queryOne<{ selfie_s3_key: string | null }>(
      'SELECT selfie_s3_key FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (!profile?.selfie_s3_key) {
      return reply.code(400).send({ error: 'Complete selfie verification first' });
    }

    const [selfieBuffer, photoBuffer] = await Promise.all([
      getObjectBuffer(profile.selfie_s3_key),
      getObjectBuffer(photoKey),
    ]);

    const { match, score } = await compareFaces(selfieBuffer, photoBuffer);

    return {
      approved: match,
      score: Math.round(score * 100),
      threshold: Math.round(FACE_MATCH_THRESHOLD * 100),
      message: match
        ? 'Photo approved — face matches your selfie.'
        : `Photo rejected — face similarity ${Math.round(score * 100)}% is below the ${Math.round(FACE_MATCH_THRESHOLD * 100)}% threshold.`,
    };
  });
}
