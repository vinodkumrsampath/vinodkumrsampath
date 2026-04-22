import { Queue, Worker } from 'bullmq';
import { createClient } from 'redis';
import { query } from '../db';
import { env } from '../config/env';

const connection = { url: env.REDIS_URL };

export const matchExpiryQueue = new Queue('match-expiry', { connection });

export function startMatchExpiryWorker() {
  const worker = new Worker(
    'match-expiry',
    async (job) => {
      if (job.name === 'expire-pending-matches') {
        const expired = await query<{ id: string }>(
          `UPDATE matches
           SET status = 'expired', updated_at = NOW()
           WHERE status = 'pending' AND expires_at <= NOW()
           RETURNING id`
        );
        if (expired.length > 0) {
          console.log(`Expired ${expired.length} matches`);
        }
      }
    },
    { connection }
  );

  worker.on('failed', (job, err) => {
    console.error(`Match expiry job failed:`, err);
  });

  return worker;
}

// Schedule the expiry job to run every 15 minutes
export async function scheduleMatchExpiry() {
  await matchExpiryQueue.upsertJobScheduler(
    'expire-matches-scheduler',
    { every: 15 * 60 * 1000 },
    { name: 'expire-pending-matches' }
  );
}
