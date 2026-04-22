import fs from 'fs';
import path from 'path';
import { db } from './index';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function migrate() {
  const client = await db.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const applied = await client.query<{ filename: string }>(
      'SELECT filename FROM migrations ORDER BY id'
    );
    const appliedSet = new Set(applied.rows.map((r) => r.filename));

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) continue;
      console.log(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  ✓ ${file}`);
    }

    console.log('All migrations applied.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await db.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
