import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createUser, findUserByEmail, verifyPassword,
  sendEmailOtp, verifyEmailOtp, storeRefreshToken,
  validateRefreshToken, revokeRefreshToken, findUserById,
} from '../services/authService';
import { nanoid } from 'nanoid';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (req, reply) => {
    const { email, password } = registerSchema.parse(req.body);

    const existing = await findUserByEmail(email);
    if (existing) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    const user = await createUser(email, password);
    await sendEmailOtp(user.id, email);

    const accessToken = app.jwt.sign(
      { id: user.id, email: user.email, role: user.role, verificationLevel: user.verification_level },
      { expiresIn: '15m' }
    );
    const refreshToken = nanoid(64);
    await storeRefreshToken(user.id, refreshToken);

    return reply.code(201).send({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, verificationLevel: user.verification_level },
      nextStep: 'verify_email',
    });
  });

  app.post('/login', async (req, reply) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await findUserByEmail(email);
    if (!user || !user.password_hash) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    if (user.account_status === 'banned') {
      return reply.code(403).send({ error: 'Account banned' });
    }

    const accessToken = app.jwt.sign(
      { id: user.id, email: user.email, role: user.role, verificationLevel: user.verification_level },
      { expiresIn: '15m' }
    );
    const refreshToken = nanoid(64);
    await storeRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, verificationLevel: user.verification_level } };
  });

  app.post('/refresh', async (req, reply) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);

    const userId = await validateRefreshToken(refreshToken);
    if (!userId) {
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }

    const user = await findUserById(userId);
    if (!user) return reply.code(401).send({ error: 'User not found' });

    await revokeRefreshToken(refreshToken);
    const newRefreshToken = nanoid(64);
    await storeRefreshToken(userId, newRefreshToken);

    const accessToken = app.jwt.sign(
      { id: user.id, email: user.email, role: user.role, verificationLevel: user.verification_level },
      { expiresIn: '15m' }
    );

    return { accessToken, refreshToken: newRefreshToken };
  });

  app.post('/logout', async (req, reply) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    await revokeRefreshToken(refreshToken);
    return { success: true };
  });

  app.post('/email/request-otp', { preHandler: [async (req, reply) => { try { await req.jwtVerify(); } catch { reply.code(401).send({ error: 'Unauthorized' }); } }] }, async (req) => {
    const user = req.user as { id: string; email: string };
    await sendEmailOtp(user.id, user.email);
    return { message: 'OTP sent to your email' };
  });

  app.post('/email/verify-otp', { preHandler: [async (req, reply) => { try { await req.jwtVerify(); } catch { reply.code(401).send({ error: 'Unauthorized' }); } }] }, async (req, reply) => {
    const { otp } = z.object({ otp: z.string().length(6) }).parse(req.body);
    const user = req.user as { id: string; email: string };

    const verified = await verifyEmailOtp(user.id, otp);
    if (!verified) {
      return reply.code(400).send({ error: 'Invalid or expired OTP' });
    }

    const updatedUser = await findUserById(user.id);
    const accessToken = app.jwt.sign(
      { id: updatedUser!.id, email: updatedUser!.email, role: updatedUser!.role, verificationLevel: updatedUser!.verification_level },
      { expiresIn: '15m' }
    );

    return { verified: true, accessToken, nextStep: 'selfie_capture' };
  });
}
