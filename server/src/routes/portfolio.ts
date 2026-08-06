import { Router, Response, Request } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';
import { getSupabaseUserClient, supabaseAdmin } from '../services/supabase.js';
import { portfolioQueue, autopostQueue } from '../services/queues.js';
import { z } from 'zod';

const router = Router();

// POST /api/portfolio/generate (authenticated)
router.post('/generate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userClient = getSupabaseUserClient(req.token!);

    // Fetch user's profile to pass context to worker
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found. Please complete profile details first.' });
    }

    if (!profile.work_samples || !Array.isArray(profile.work_samples) || profile.work_samples.length === 0) {
      return res.status(400).json({ error: 'Please add at least one work sample before generating your portfolio.' });
    }

    // Add portfolio generation job to the queue
    const job = await portfolioQueue.add(
      `portfolio-${user.id}`,
      {
        userId: user.id,
        fullName: profile.full_name,
        role: profile.role,
        bio: profile.bio,
        skills: profile.skills,
        workSamples: profile.work_samples,
      },
      {
        removeOnComplete: true,
      }
    );

    console.log(`Portfolio generation job ${job.id} enqueued for user ${user.id}`);

    return res.status(211).json({
      message: 'Portfolio generation started. You will be notified once complete.',
      jobId: job.id,
    });
  } catch (err: any) {
    console.error('Portfolio generate error:', err);
    return res.status(500).json({ error: 'Server error triggering portfolio generation' });
  }
});

// GET /api/portfolio/:slug (public - no auth required)
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    // Fetch portfolio by slug using admin client since it's public
    const { data: portfolio, error } = await supabaseAdmin
      .from('portfolios')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !portfolio) {
      return res.status(404).send('<h1>Portfolio not found or private</h1>');
    }

    // If portfolio is not published, check if we are the owner
    if (!portfolio.is_published) {
      // Try to check authorization
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user && user.id === portfolio.user_id) {
          // Owner is allowed to see unpublished portfolio
        } else {
          return res.status(403).send('<h1>Portfolio is not published</h1>');
        }
      } else {
        return res.status(403).send('<h1>Portfolio is not published</h1>');
      }
    }

    // Check Accept headers to decide what to return
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('text/html')) {
      // Return rendered page
      const htmlResponse = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${portfolio.slug} | Outreach AI Portfolio</title>
          <style>
            ${portfolio.css_code}
          </style>
        </head>
        <body>
          ${portfolio.html_code}
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      return res.send(htmlResponse);
    }

    // Default to JSON response
    return res.json(portfolio);
  } catch (err: any) {
    console.error('Portfolio slug GET error:', err);
    return res.status(500).send('<h1>Server error loading portfolio</h1>');
  }
});

// PATCH /api/portfolio/publish (authenticated) - toggle portfolio visibility
router.patch('/publish', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userClient = getSupabaseUserClient(req.token!);

    const publishSchema = z.object({
      is_published: z.boolean(),
      slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
    });

    const parseResult = publishSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
    }

    const { is_published, slug } = parseResult.data;

    // Check if slug is already taken by someone else
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('portfolios')
      .select('user_id')
      .eq('slug', slug)
      .single();

    if (existing && existing.user_id !== user.id) {
      return res.status(400).json({ error: 'This portfolio slug is already taken by another user' });
    }

    // Update or insert portfolio published status and slug
    const { data: updated, error } = await userClient
      .from('portfolios')
      .upsert(
        {
          user_id: user.id,
          slug,
          is_published,
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('Error toggling portfolio publication:', error);
      return res.status(500).json({ error: 'Failed to update publication settings' });
    }

    return res.json(updated);
  } catch (err: any) {
    console.error('Portfolio publish PATCH error:', err);
    return res.status(500).json({ error: 'Server error updating publication settings' });
  }
});

// GET /api/portfolio/my-portfolio (authenticated) - retrieve current user's portfolio
router.get('/my/config', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userClient = getSupabaseUserClient(req.token!);

    const { data: portfolio, error } = await userClient
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching own portfolio:', error);
      return res.status(500).json({ error: 'Failed to retrieve portfolio' });
    }

    return res.json(portfolio || { slug: `${user.id.substring(0, 8)}`, is_published: false, html_code: '', css_code: '' });
  } catch (err: any) {
    console.error('My portfolio GET error:', err);
    return res.status(500).json({ error: 'Server error loading portfolio' });
  }
});

// POST /api/portfolio/autopost (authenticated) - trigger AI blog posting to Dev.to and Twitter
router.post('/autopost', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userClient = getSupabaseUserClient(req.token!);

    // Check if the user has a portfolio generated
    const { data: portfolio, error: portfolioError } = await userClient
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (portfolioError || !portfolio) {
      return res.status(404).json({ error: 'No portfolio found. Please generate your web portfolio first.' });
    }

    // Check if the user has configured keys for Dev.to or Twitter
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('api_keys')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const keys = profile.api_keys || {};
    const hasTwitter = !!(keys.twitter_api_key && keys.twitter_api_secret && keys.twitter_access_token && keys.twitter_access_secret);
    const hasDevto = !!keys.devto_api_key;

    if (!hasTwitter && !hasDevto) {
      return res.status(400).json({ error: 'Please configure at least your Dev.to API key or Twitter API credentials in Settings first.' });
    }

    // Trigger background autopost worker job
    const job = await autopostQueue.add(
      `autopost-${user.id}`,
      {
        userId: user.id,
        portfolioSlug: portfolio.slug,
        hasTwitter,
        hasDevto,
      },
      {
        removeOnComplete: true,
      }
    );

    console.log(`[Autopost] Enqueued autopost job ${job.id} for user ${user.id}`);

    return res.json({
      message: 'Autopost worker triggered. Your technical portfolio announcement will be drafted and published shortly.',
      jobId: job.id,
    });
  } catch (err: any) {
    console.error('Portfolio autopost route error:', err);
    return res.status(500).json({ error: 'Server error triggering autopost' });
  }
});

export default router;
