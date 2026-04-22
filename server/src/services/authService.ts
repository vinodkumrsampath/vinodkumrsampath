import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { query, queryOne } from '../db';
import { sendOtpEmail } from '../integrations/emailClient';
import { OTP_EXPIRY_MINUTES } from '@verified/shared';

interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  role: string;
  account_status: string;
  verification_level: string;
}

export async function createUser(email: string, password?: string): Promise<UserRow> {
  const passwordHash = password ? await bcrypt.hash(password, 12) : null;
  const rows = await query<UserRow>(
    `INSERT INTO users (email, password_hash, auth_provider)
     VALUES ($1, $2, 'email')
     RETURNING id, email, password_hash, role, account_status, verification_level`,
    [email.toLowerCase(), passwordHash]
  );
  return rows[0];
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>(
    'SELECT id, email, password_hash, role, account_status, verification_level FROM users WHERE email = $1 AND deleted_at IS NULL',
    [email.toLowerCase()]
  );
}

export async function findUserById(id: string): Promise<UserRow | null> {
  return queryOne<UserRow>(
    'SELECT id, email, password_hash, role, account_status, verification_level FROM users WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function sendEmailOtp(userId: string, email: string): Promise<void> {
  // Invalidate any existing unused OTPs
  await query('UPDATE email_otp SET used = true WHERE user_id = $1 AND used = false', [userId]);

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await query(
    'INSERT INTO email_otp (user_id, email, otp_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [userId, email, otpHash, expiresAt]
  );

  await sendOtpEmail(email, otp);
}

export async function verifyEmailOtp(userId: string, otp: string): Promise<boolean> {
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM email_otp
     WHERE user_id = $1 AND otp_hash = $2 AND used = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId, otpHash]
  );

  if (!row) return false;

  await query('UPDATE email_otp SET used = true WHERE id = $1', [row.id]);
  await query(
    `UPDATE users SET verification_level = 'email', account_status = 'active', updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
  await query(
    `INSERT INTO verifications (user_id, type, status, verified_at)
     VALUES ($1, 'email', 'passed', NOW())
     ON CONFLICT DO NOTHING`,
    [userId]
  );

  return true;
}

export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30d
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );
}

export async function validateRefreshToken(token: string): Promise<string | null> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const row = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM refresh_tokens
     WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()`,
    [tokenHash]
  );
  return row?.user_id ?? null;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await query('UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1', [tokenHash]);
}
