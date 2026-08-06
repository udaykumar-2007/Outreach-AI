import { scanWorker } from './workers/scanWorker.js';
import { outreachWorker } from './workers/outreachWorker.js';
import { inboxWorker } from './workers/inboxWorker.js';
import { portfolioWorker } from './workers/portfolioWorker.js';
import { autopostWorker } from './workers/autopostWorker.js';
import { redisConnection } from './queues.js';

console.log('===================================================');
console.log(' Outreach AI Background Workers Initialized');
console.log(' - scan-queue listener active');
console.log(' - outreach-queue listener active');
console.log(' - inbox-queue listener active');
console.log(' - portfolio-queue listener active');
console.log(' - autopost-queue listener active');
console.log('===================================================');

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down worker processes...`);
  
  try {
    // Close worker listeners
    await scanWorker.close();
    await outreachWorker.close();
    await inboxWorker.close();
    await portfolioWorker.close();
    await autopostWorker.close();
    console.log('BullMQ worker connections closed.');
    
    // Close redis connection
    await redisConnection.quit();
    console.log('Redis worker connection closed.');
  } catch (err) {
    console.error('Error during worker shutdown:', err);
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
