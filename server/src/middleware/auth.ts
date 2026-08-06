import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase.js';
import { User } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Token is empty' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token or session expired' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err: any) {
    console.error('Authentication middleware error:', err);
    return res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
}
