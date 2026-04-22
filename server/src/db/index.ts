import { Pool } from 'pg';
import { env } from '../config/env';

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

db.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await db.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
