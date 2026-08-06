import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Setup connection option for BullMQ (maxRetriesPerRequest must be null for BullMQ)
export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const scanQueue = new Queue('scan-queue', { connection: redisConnection });
export const outreachQueue = new Queue('outreach-queue', { connection: redisConnection });
export const inboxQueue = new Queue('inbox-queue', { connection: redisConnection });
export const portfolioQueue = new Queue('portfolio-queue', { connection: redisConnection });
export const autopostQueue = new Queue('autopost-queue', { connection: redisConnection });

console.log('BullMQ Queues initialized with Redis:', redisUrl);
