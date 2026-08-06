import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getSupabaseUserClient } from '../services/supabase.js';
import { outreachQueue } from '../services/queues.js';
import { z } from 'zod';

const router = Router();

// GET /api/leads
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userClient = getSupabaseUserClient(req.token!);
    const { platform, status } = req.query;

    let query = userClient
      .from('leads')
      .select('*')
      .eq('user_id', user.id);

    if (platform && platform !== 'all') {
      query = query.eq('platform', platform as string);
    }
    if (status) {
      query = query.eq('status', status as string);
    }

    // Sort by match_score descending, then created_at descending
    const { data: leads, error } = await query
      .order('match_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      return res.status(500).json({ error: 'Failed to retrieve leads' });
    }

    return res.json(leads);
  } catch (err: any) {
    console.error('Leads GET error:', err);
    return res.status(500).json({ error: 'Server error retrieving leads' });
  }
});

// GET /api/leads/:id/messages
router.get('/:id/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userClient = getSupabaseUserClient(req.token!);
    const { id } = req.params;

    const { data: messages, error } = await userClient
      .from('messages')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching lead messages:', error);
      return res.status(500).json({ error: 'Failed to retrieve message history' });
    }

    return res.json(messages);
  } catch (err: any) {
    console.error('Lead messages GET error:', err);
    return res.status(500).json({ error: 'Server error retrieving messages' });
  }
});

// POST /api/leads/:id/reply
router.post('/:id/reply', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userClient = getSupabaseUserClient(req.token!);
    const { id } = req.params;

    const replySchema = z.object({
      content: z.string().min(1, 'Message content cannot be empty'),
    });

    const parseResult = replySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
    }

    const { content } = parseResult.data;

    // 1. Verify lead exists and belongs to user
    const { data: lead, error: leadError } = await userClient
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' });
    }

    // 2. Insert message into database
    const { data: message, error: messageError } = await userClient
      .from('messages')
      .insert({
        lead_id: lead.id,
        user_id: user.id,
        direction: 'sent',
        content,
        sentiment: 'neutral', // default for human sent messages
      })
      .select('*')
      .single();

    if (messageError || !message) {
      console.error('Error inserting reply message:', messageError);
      return res.status(500).json({ error: 'Failed to record reply message' });
    }

    // 3. Update lead status to 'messaged' if it's currently evaluated/discovered/interested
    if (lead.status === 'discovered' || lead.status === 'evaluated' || lead.status === 'interested') {
      await userClient
        .from('leads')
        .update({ status: 'messaged' })
        .eq('id', lead.id);
    }

    // 4. Enqueue BullMQ job to actually send the message in background
    await outreachQueue.add(
      `outreach-reply-${message.id}`,
      {
        messageId: message.id,
        leadId: lead.id,
        userId: user.id,
        platform: lead.platform,
        profileUrl: lead.profile_url,
        content: content,
      },
      {
        removeOnComplete: true,
      }
    );

    console.log(`Outreach job queued to send reply message ${message.id} to lead ${lead.name}`);

    return res.status(211).json(message);
  } catch (err: any) {
    console.error('Lead reply POST error:', err);
    return res.status(500).json({ error: 'Server error processing reply' });
  }
});

export default router;
