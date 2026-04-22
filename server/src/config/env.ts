import 'dotenv/config';

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '3001')),

  DATABASE_URL: required('DATABASE_URL'),
  REDIS_URL: optional('REDIS_URL', 'redis://localhost:6379'),

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '30d'),

  // Email (Nodemailer)
  SMTP_HOST: optional('SMTP_HOST', 'smtp.gmail.com'),
  SMTP_PORT: parseInt(optional('SMTP_PORT', '587')),
  SMTP_USER: optional('SMTP_USER', ''),
  SMTP_PASS: optional('SMTP_PASS', ''),
  EMAIL_FROM: optional('EMAIL_FROM', 'noreply@verified.app'),

  // Cloudflare R2 (S3-compatible)
  R2_ENDPOINT: optional('R2_ENDPOINT', ''),
  R2_ACCESS_KEY_ID: optional('R2_ACCESS_KEY_ID', ''),
  R2_SECRET_ACCESS_KEY: optional('R2_SECRET_ACCESS_KEY', ''),
  R2_BUCKET: optional('R2_BUCKET', 'verified-photos'),
  R2_PUBLIC_URL: optional('R2_PUBLIC_URL', ''),

  // Stripe
  STRIPE_SECRET_KEY: optional('STRIPE_SECRET_KEY', ''),
  STRIPE_WEBHOOK_SECRET: optional('STRIPE_WEBHOOK_SECRET', ''),
  STRIPE_PREMIUM_PRICE_ID: optional('STRIPE_PREMIUM_PRICE_ID', ''),

  // Hugging Face (free text moderation)
  HUGGINGFACE_API_KEY: optional('HUGGINGFACE_API_KEY', ''),

  // Field encryption key for sensitive data
  FIELD_ENCRYPTION_KEY: optional('FIELD_ENCRYPTION_KEY', ''),

  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:3000'),
} as const;
