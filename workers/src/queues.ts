import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

import { Queue } from 'bullmq';
export const outreachQueue = new Queue('outreach-queue', { connection: redisConnection });
export const autopostQueue = new Queue('autopost-queue', { connection: redisConnection });

console.log('Worker Redis connection established with:', redisUrl);
