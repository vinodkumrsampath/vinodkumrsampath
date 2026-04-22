import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { query, queryOne } from '../db';
import { moderateText } from '../integrations/moderationClient';
import { MODERATION_AUTO_REMOVE_THRESHOLD } from '@verified/shared';

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing token'));

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { id: string };
      socket.data.userId = payload.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId: string = socket.data.userId;

    socket.on('join_match_room', ({ matchId }: { matchId: string }) => {
      socket.join(`match:${matchId}`);
    });

    socket.on('typing', ({ matchId }: { matchId: string }) => {
      socket.to(`match:${matchId}`).emit('user_typing', { matchId, userId });
    });

    socket.on('read_messages', async ({ matchId, upToMessageId }: { matchId: string; upToMessageId: string }) => {
      await query(
        `UPDATE messages SET read_at = NOW()
         WHERE match_id = $1 AND sender_id != $2 AND read_at IS NULL
           AND created_at <= (SELECT created_at FROM messages WHERE id = $3)`,
        [matchId, userId, upToMessageId]
      );
      socket.to(`match:${matchId}`).emit('message_read', {
        matchId, readerId: userId, readAt: new Date().toISOString(),
      });
    });

    socket.on('send_message', async ({ matchId, content, contentType }: {
      matchId: string; content: string; contentType: string;
    }) => {
      // Verify match membership
      const match = await queryOne(
        `SELECT id, status FROM matches
         WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2) AND status IN ('pending','active')`,
        [matchId, userId]
      );
      if (!match) return;

      // Moderate text
      let moderationStatus = 'approved';
      if (contentType === 'text') {
        const mod = await moderateText(content);
        if (mod.score >= MODERATION_AUTO_REMOVE_THRESHOLD) return;
        if (mod.flagged) moderationStatus = 'flagged';
      }

      const rows = await query(
        `INSERT INTO messages (match_id, sender_id, content, content_type, moderation_status, delivered_at)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
        [matchId, userId, content, contentType, moderationStatus]
      );
      const message = rows[0];

      // Activate match on first message
      await query(
        `UPDATE matches SET status = 'active', first_message_at = COALESCE(first_message_at, NOW()), updated_at = NOW()
         WHERE id = $1 AND status = 'pending'`,
        [matchId]
      );

      io.to(`match:${matchId}`).emit('new_message', { message });
    });

    socket.on('disconnect', () => {
      query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [userId]).catch(() => {});
    });
  });

  return io;
}
