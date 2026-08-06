import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import mockRouter from './routes/mock.js';
import portfolioRouter from './routes/portfolio.js';
import profileRouter from './routes/profile.js';
import campaignsRouter from './routes/campaigns.js';
import leadsRouter from './routes/leads.js';
import analyticsRouter from './routes/analytics.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Mock pages for Playwright crawler
app.use('/mock', mockRouter);

// Portfolios Router handles its own conditional auth
app.use('/api/portfolio', portfolioRouter);

// Protected routes (require auth middleware)
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/campaigns', requireAuth, campaignsRouter);
app.use('/api/leads', requireAuth, leadsRouter);
app.use('/api/analytics', requireAuth, analyticsRouter);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export default app;
