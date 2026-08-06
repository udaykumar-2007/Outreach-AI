import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { supabase } from './services/supabase.js';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let io: SocketIOServer;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
// Separate client needed for subscribing
const pubSubClient = new IORedis(redisUrl);

export function initSocketServer(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Socket.io authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return next(new Error('Authentication error: Invalid session'));
      }

      (socket as any).user = user;
      next();
    } catch (err) {
      console.error('Socket authentication error:', err);
      next(new Error('Authentication error: Server validation failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    const roomName = `user_${user.id}`;
    socket.join(roomName);
    console.log(`Socket client connected: ${user.email} (Joined Room: ${roomName})`);

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${user.email}`);
    });
  });

  // Subscribe to agent logs
  pubSubClient.subscribe('agent-logs', (err, count) => {
    if (err) {
      console.error('Failed to subscribe to Redis agent-logs:', err);
    } else {
      console.log(`Successfully subscribed to Redis agent-logs. Channels: ${count}`);
    }
  });

  // Forward Redis Pub/Sub events directly to Socket.io client rooms
  pubSubClient.on('message', (channel, message) => {
    if (channel === 'agent-logs') {
      try {
        const payload = JSON.parse(message);
        const { userId, event, data } = payload;
        if (userId && event) {
          io.to(`user_${userId}`).emit(event, data);
        }
      } catch (err) {
        console.error('Error parsing Redis Pub/Sub logs message:', err);
      }
    }
  });

  return io;
}

export function getIO() {
  return io;
}
export { pubSubClient };
