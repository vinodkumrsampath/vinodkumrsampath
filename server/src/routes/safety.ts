import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { query, queryOne } from '../db';
import { authenticate } from '../middleware/authenticate';
import { sendSafetyAlertEmail } from '../integrations/emailClient';

export async function safetyRoutes(app: FastifyInstance) {
  // --- Reports ---
  app.post('/reports', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const { reportedId, reportType, description, evidence } = z.object({
      reportedId: z.string().uuid(),
      reportType: z.enum(['fake_profile','harassment','inappropriate_content','underage','hate_speech','spam','scam','other']),
      description: z.string().max(1000).optional(),
      evidence: z.array(z.record(z.unknown())).optional(),
    }).parse(req.body);

    const report = await queryOne(
      `INSERT INTO reports (reporter_id, reported_id, report_type, description, evidence)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, status, created_at`,
      [user.id, reportedId, reportType, description ?? null, JSON.stringify(evidence ?? [])]
    );

    // Also block the reported user
    await query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [user.id, reportedId]
    );

    return { report };
  });

  app.get('/reports', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const reports = await query(
      'SELECT id, report_type, status, created_at FROM reports WHERE reporter_id = $1 ORDER BY created_at DESC',
      [user.id]
    );
    return { reports };
  });

  // --- Blocks ---
  app.post('/blocks', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const { userId: blockedId } = z.object({ userId: z.string().uuid() }).parse(req.body);

    await query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [user.id, blockedId]
    );

    // Expire any active matches between them
    const [a, b] = [user.id, blockedId].sort();
    await query(
      `UPDATE matches SET status = 'unmatched', updated_at = NOW()
       WHERE user_a_id = $1 AND user_b_id = $2 AND status IN ('pending','active')`,
      [a, b]
    );

    return { blocked: true };
  });

  app.delete('/blocks/:userId', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const { userId: blockedId } = req.params as { userId: string };
    await query('DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [user.id, blockedId]);
    return { unblocked: true };
  });

  app.get('/blocks', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const blocks = await query(
      `SELECT b.blocked_id, p.display_name, b.created_at
       FROM blocks b LEFT JOIN profiles p ON p.user_id = b.blocked_id
       WHERE b.blocker_id = $1`,
      [user.id]
    );
    return { blocks };
  });

  // --- Trusted Contacts ---
  app.post('/trusted-contacts', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const { name, email } = z.object({ name: z.string(), email: z.string().email() }).parse(req.body);

    const count = await queryOne<{ count: string }>(
      'SELECT COUNT(*) AS count FROM trusted_contacts WHERE user_id = $1',
      [user.id]
    );
    if (parseInt(count?.count ?? '0') >= 3) {
      return { error: 'Maximum 3 trusted contacts allowed' };
    }

    const contact = await queryOne(
      'INSERT INTO trusted_contacts (user_id, name, email) VALUES ($1, $2, $3) RETURNING *',
      [user.id, name, email]
    );
    return { contact };
  });

  app.get('/trusted-contacts', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const contacts = await query('SELECT * FROM trusted_contacts WHERE user_id = $1', [user.id]);
    return { contacts };
  });

  app.delete('/trusted-contacts/:id', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const { id } = req.params as { id: string };
    await query('DELETE FROM trusted_contacts WHERE id = $1 AND user_id = $2', [id, user.id]);
    return { deleted: true };
  });

  // --- Safe Meeting Check-Ins ---
  app.post('/check-ins', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const { matchId, meetingLocation, meetingTime } = z.object({
      matchId: z.string().uuid().optional(),
      meetingLocation: z.string().optional(),
      meetingTime: z.string().datetime().optional(),
    }).parse(req.body);

    const token = nanoid(32);
    const checkInUrl = `${process.env.FRONTEND_URL}/safety/check-in/${token}`;

    const checkIn = await queryOne(
      `INSERT INTO safety_check_ins (user_id, match_id, meeting_location, meeting_time, check_in_token)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user.id, matchId ?? null, meetingLocation ?? null, meetingTime ?? null, token]
    );

    // Notify all trusted contacts
    const contacts = await query<{ email: string; name: string }>(
      `SELECT tc.email, tc.name, p.display_name AS user_name
       FROM trusted_contacts tc
       JOIN profiles p ON p.user_id = $1
       WHERE tc.user_id = $1`,
      [user.id]
    );

    for (const contact of contacts) {
      await sendSafetyAlertEmail(contact.email, (contact as any).user_name, checkInUrl).catch(() => {
        // Non-critical: don't fail if email fails
      });
    }

    return { checkIn, checkInUrl };
  });

  app.post('/check-ins/:id/sos', { preHandler: [authenticate] }, async (req, reply) => {
    const user = req.user as { id: string };
    const { id } = req.params as { id: string };

    const updated = await query(
      `UPDATE safety_check_ins
       SET status = 'sos_triggered', sos_triggered_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, user.id]
    );

    if (updated.length === 0) return reply.code(404).send({ error: 'Check-in not found' });

    // TODO: alert moderators via Socket.io in Phase 3
    return { sosTriggerred: true };
  });

  // Public check-in page (for trusted contact, no auth)
  app.get('/check-in/:token', async (req, reply) => {
    const { token } = req.params as { token: string };
    const checkIn = await queryOne(
      `SELECT ci.status, ci.meeting_location, ci.meeting_time, ci.sos_triggered_at,
              p.display_name AS user_name
       FROM safety_check_ins ci
       JOIN profiles p ON p.user_id = ci.user_id
       WHERE ci.check_in_token = $1`,
      [token]
    );

    if (!checkIn) return reply.code(404).send({ error: 'Check-in not found' });
    return checkIn;
  });
}
