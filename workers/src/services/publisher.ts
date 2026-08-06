import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = new IORedis(redisUrl);

export async function publishLog(userId: string, event: string, data: any) {
  try {
    const payload = JSON.stringify({ userId, event, data });
    await pubClient.publish('agent-logs', payload);
    console.log(`[Redis Pub] Event: ${event} for User: ${userId}`);
  } catch (err) {
    console.error('Failed to publish log via Redis Pub/Sub:', err);
  }
}
