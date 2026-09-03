import { Queue, Worker } from 'bullmq';
import { pool } from '../db';

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

export const notifQueue = new Queue('notifications', { connection });

export function startNotifWorker() {
  const worker = new Worker(
    'notifications',
    async (job) => {
      const { userId, type, message, ticketId } = job.data;
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, ticket_id) VALUES ($1,$2,$3,$4)`,
        [userId, type, message, ticketId || null]
      );
    },
    { connection }
  );

  worker.on('failed', (job, err) => console.error(`Notification job ${job?.id} failed:`, err));
  return worker;
}

export async function notify(userId: string, type: string, message: string, ticketId?: string) {
  await notifQueue.add('notify', { userId, type, message, ticketId });
}
