import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getSupabaseUserClient } from '../services/supabase.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const router = Router();

const profileUpdateSchema = z.object({
  full_name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(['student', 'freelancer']).optional(),
  bio: z.string().max(1000, 'Bio is too long').optional(),
  skills: z.array(z.string()).optional(),
  work_samples: z.array(
    z.object({
      title: z.string().min(1, 'Sample title is required'),
      description: z.string(),
      technologies: z.array(z.string()).optional(),
      url: z.string().url().or(z.literal('')).optional(),
    })
  ).optional(),
  is_busy: z.boolean().optional(),
  active_platforms: z.object({
    linkedin: z.boolean(),
    twitter: z.boolean(),
    upwork: z.boolean(),
  }).optional(),
  api_keys: z.object({
    linkedin_li_at: z.string().nullable().optional(),
    twitter_api_key: z.string().nullable().optional(),
    twitter_api_secret: z.string().nullable().optional(),
    twitter_access_token: z.string().nullable().optional(),
    twitter_access_secret: z.string().nullable().optional(),
    devto_api_key: z.string().nullable().optional(),
  }).optional(),
});

// GET profile
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userClient = getSupabaseUserClient(req.token!);

    const { data: profile, error } = await userClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      // If profile not found, let's create a default profile row
      if (error.code === 'PGRST116') {
        const defaultProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || '',
          role: user.user_metadata?.role || 'student',
          bio: '',
          skills: [],
          work_samples: [],
          is_busy: false,
          active_platforms: { linkedin: true, twitter: true, upwork: true },
        };

        const { data: newProfile, error: insertError } = await userClient
          .from('profiles')
          .insert(defaultProfile)
          .select('*')
          .single();

        if (insertError) {
          console.error('Error creating profile fallback:', insertError);
          return res.status(500).json({ error: 'Failed to initialize profile' });
        }
        return res.json(newProfile);
      }
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: 'Failed to retrieve profile' });
    }

    return res.json(profile);
  } catch (err: any) {
    console.error('Profile GET error:', err);
    return res.status(500).json({ error: 'Server error retrieving profile' });
  }
});

// PUT profile
router.put('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userClient = getSupabaseUserClient(req.token!);

    const parseResult = profileUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
    }

    // Write LinkedIn session cookie file if li_at cookie is updated
    if (parseResult.data.api_keys?.linkedin_li_at) {
      try {
        const sessionsDir = path.join(process.cwd(), 'workers/storage/sessions');
        if (!fs.existsSync(sessionsDir)) {
          fs.mkdirSync(sessionsDir, { recursive: true });
        }
        const statePath = path.join(sessionsDir, `state_${user.id}_linkedin.json`);
        const cookies = [
          {
            name: 'li_at',
            value: parseResult.data.api_keys.linkedin_li_at,
            domain: '.www.linkedin.com',
            path: '/',
            expires: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
            httpOnly: true,
            secure: true,
            sameSite: 'None'
          }
        ];
        fs.writeFileSync(statePath, JSON.stringify(cookies, null, 2), 'utf-8');
        console.log(`[ProfileRouter] Wrote LinkedIn session cookie file for user ${user.id}`);
      } catch (cookieErr) {
        console.error('Failed to write LinkedIn session cookie file:', cookieErr);
      }
    }

    const { data: updatedProfile, error } = await userClient
      .from('profiles')
      .update(parseResult.data)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    return res.json(updatedProfile);
  } catch (err: any) {
    console.error('Profile PUT error:', err);
    return res.status(500).json({ error: 'Server error updating profile' });
  }
});

export default router;
