import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db';
import { authenticate } from '../middleware/authenticate';
import { moderateText } from '../integrations/moderationClient';
import { MODERATION_AUTO_REMOVE_THRESHOLD } from '@verified/shared';

const CONVERSATION_STARTERS: Array<{ id: string; text: string; category: string }> = [
  { id: '1', text: "What's the best trip you've ever taken?", category: 'activity' },
  { id: '2', text: 'What are you currently obsessed with?', category: 'interest' },
  { id: '3', text: 'What would your perfect Sunday look like?', category: 'activity' },
  { id: '4', text: 'What\'s a hidden talent you have?', category: 'humor' },
  { id: '5', text: 'Coffee or tea — and why is this a hill worth dying on?', category: 'humor' },
  { id: '6', text: 'What show are you currently watching?', category: 'interest' },
  { id: '7', text: 'Recommend me a restaurant you love.', category: 'activity' },
  { id: '8', text: 'What\'s something you\'ve changed your mind about recently?', category: 'deep' },
];

export async function messageRoutes(app: FastifyInstance) {
  app.get('/:matchId', { preHandler: [authenticate] }, async (req, reply) => {
    const user = req.user as { id: string };
    const { matchId } = req.params as { matchId: string };
    const { cursor } = req.query as { cursor?: string };

    // Verify user is part of this match
    const match = await queryOne(
      'SELECT id FROM matches WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)',
      [matchId, user.id]
    );
    if (!match) return reply.code(403).send({ error: 'Not your match' });

    const messages = await query(
      `SELECT * FROM messages
       WHERE match_id = $1
         AND is_deleted = false
         ${cursor ? 'AND created_at < $3' : ''}
       ORDER BY created_at DESC
       LIMIT 50
       ${cursor ? '' : ''}`,
      cursor ? [matchId, user.id, cursor] : [matchId, user.id]
    );

    // Mark unread messages as delivered
    await query(
      `UPDATE messages SET delivered_at = NOW()
       WHERE match_id = $1 AND sender_id != $2 AND delivered_at IS NULL`,
      [matchId, user.id]
    );

    return { messages: messages.reverse(), hasMore: messages.length === 50 };
  });

  app.post('/:matchId', { preHandler: [authenticate] }, async (req, reply) => {
    const user = req.user as { id: string };
    const { matchId } = req.params as { matchId: string };

    const { content, contentType = 'text', mediaUrl } = z.object({
      content: z.string().max(2000).optional(),
      contentType: z.enum(['text', 'image', 'gif']).optional(),
      mediaUrl: z.string().url().optional(),
    }).parse(req.body);

    // Verify match exists and is active/pending
    const match = await queryOne<{ id: string; status: string; first_message_at: string | null }>(
      `SELECT id, status, first_message_at FROM matches
       WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)
         AND status IN ('pending','active')`,
      [matchId, user.id]
    );
    if (!match) return reply.code(403).send({ error: 'Match not found or expired' });

    // Text moderation
    let moderationStatus = 'approved';
    if (contentType === 'text' && content) {
      const modResult = await moderateText(content);
      if (modResult.score >= MODERATION_AUTO_REMOVE_THRESHOLD) {
        return reply.code(400).send({ error: 'Message blocked: inappropriate content' });
      }
      if (modResult.flagged) moderationStatus = 'flagged';
    }

    const message = await queryOne(
      `INSERT INTO messages (match_id, sender_id, content, content_type, media_url, moderation_status, delivered_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [matchId, user.id, content ?? null, contentType, mediaUrl ?? null, moderationStatus]
    );

    // Activate match on first message
    if (match.status === 'pending') {
      await query(
        `UPDATE matches SET status = 'active', first_message_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [matchId]
      );
    }

    return { message };
  });

  app.patch('/:messageId/read', { preHandler: [authenticate] }, async (req) => {
    const user = req.user as { id: string };
    const { messageId } = req.params as { messageId: string };

    await query(
      `UPDATE messages SET read_at = NOW()
       WHERE id = $1 AND sender_id != $2 AND read_at IS NULL`,
      [messageId, user.id]
    );

    return { read: true };
  });

  app.delete('/:messageId', { preHandler: [authenticate] }, async (req, reply) => {
    const user = req.user as { id: string };
    const { messageId } = req.params as { messageId: string };

    const updated = await query(
      `UPDATE messages SET is_deleted = true
       WHERE id = $1 AND sender_id = $2 RETURNING id`,
      [messageId, user.id]
    );

    if (updated.length === 0) return reply.code(403).send({ error: 'Not your message' });
    return { deleted: true };
  });

  app.get('/:matchId/starters', { preHandler: [authenticate] }, async (req, reply) => {
    const user = req.user as { id: string };
    const { matchId } = req.params as { matchId: string };

    // Only show starters if no messages yet
    const msgCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) AS count FROM messages WHERE match_id = $1',
      [matchId]
    );
    if (parseInt(msgCount?.count ?? '0') > 0) return { starters: [] };

    // Get shared interests to personalize starters
    const match = await queryOne<{ user_a_id: string; user_b_id: string }>(
      `SELECT user_a_id, user_b_id FROM matches
       WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)`,
      [matchId, user.id]
    );
    if (!match) return reply.code(403).send({ error: 'Not your match' });

    // Shuffle and return 3 starters
    const shuffled = [...CONVERSATION_STARTERS].sort(() => Math.random() - 0.5);
    return { starters: shuffled.slice(0, 3) };
  });
}
