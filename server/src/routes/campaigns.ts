import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getSupabaseUserClient } from '../services/supabase.js';
import { scanQueue } from '../services/queues.js';
import { z } from 'zod';

const router = Router();

const campaignSchema = z.object({
  platform: z.enum(['linkedin', 'twitter', 'upwork']),
  target_keywords: z.array(z.string()).min(1, 'At least one keyword is required'),
  target_role: z.string().min(2, 'Target role is required'),
  active: z.boolean().optional(),
});

// GET campaigns
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userClient = getSupabaseUserClient(req.token!);

    const { data: campaigns, error } = await userClient
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      return res.status(500).json({ error: 'Failed to retrieve campaigns' });
    }

    return res.json(campaigns);
  } catch (err: any) {
    console.error('Campaigns GET error:', err);
    return res.status(500).json({ error: 'Server error fetching campaigns' });
  }
});

// POST campaign
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userClient = getSupabaseUserClient(req.token!);

    const parseResult = campaignSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
    }

    const { platform, target_keywords, target_role, active } = parseResult.data;

    const { data: campaign, error } = await userClient
      .from('campaigns')
      .insert({
        user_id: user.id,
        platform,
        target_keywords,
        target_role,
        active: active !== undefined ? active : true,
      })
      .select('*')
      .single();

    if (error || !campaign) {
      console.error('Error creating campaign:', error);
      return res.status(500).json({ error: 'Failed to create campaign' });
    }

    // Enqueue initial scan job if campaign is active
    if (campaign.active) {
      await scanQueue.add(
        `scan-${campaign.id}`,
        {
          campaignId: campaign.id,
          userId: user.id,
          platform: campaign.platform,
          targetKeywords: campaign.target_keywords,
          targetRole: campaign.target_role,
        },
        {
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      console.log(`Scan job enqueued for campaign ${campaign.id}`);
    }

    return res.status(211).json(campaign);
  } catch (err: any) {
    console.error('Campaigns POST error:', err);
    return res.status(500).json({ error: 'Server error creating campaign' });
  }
});

// PATCH campaign (toggle active/pause)
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userClient = getSupabaseUserClient(req.token!);
    const { id } = req.params;

    const toggleSchema = z.object({
      active: z.boolean(),
    });

    const parseResult = toggleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const { active } = parseResult.data;

    const { data: campaign, error } = await userClient
      .from('campaigns')
      .update({ active })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !campaign) {
      console.error('Error updating campaign status:', error);
      return res.status(500).json({ error: 'Failed to update campaign' });
    }

    // If campaign is reactivated, trigger scan
    if (active) {
      await scanQueue.add(
        `scan-${campaign.id}`,
        {
          campaignId: campaign.id,
          userId: user.id,
          platform: campaign.platform,
          targetKeywords: campaign.target_keywords,
          targetRole: campaign.target_role,
        },
        {
          removeOnComplete: true,
        }
      );
      console.log(`Scan job re-enqueued for campaign ${campaign.id}`);
    }

    return res.json(campaign);
  } catch (err: any) {
    console.error('Campaign PATCH error:', err);
    return res.status(500).json({ error: 'Server error updating campaign' });
  }
});

export default router;
