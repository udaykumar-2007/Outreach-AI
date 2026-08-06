import http from 'http';
import app from './app.js';
import { initSocketServer, pubSubClient } from './socket.js';
import { redisConnection } from './services/queues.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io WebSocket server
initSocketServer(server);

// Start server listening
server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` Outreach AI Backend running on port ${PORT}`);
  console.log(` API Endpoint: http://localhost:${PORT}`);
  console.log(` WebSocket server listening for client handshakes`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===================================================`);
});

// Handle graceful shutdowns
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  
  server.close(async () => {
    console.log('HTTP and WebSocket servers closed.');
    
    try {
      // Close Redis connections
      await redisConnection.quit();
      await pubSubClient.quit();
      console.log('Redis connections closed successfully.');
    } catch (err) {
      console.error('Error closing Redis connections:', err);
    }
    
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
