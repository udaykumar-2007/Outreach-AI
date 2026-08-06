import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getSupabaseUserClient } from '../services/supabase.js';

const router = Router();

// GET /api/analytics
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userClient = getSupabaseUserClient(req.token!);

    // Fetch all leads for user
    const { data: leads, error: leadsError } = await userClient
      .from('leads')
      .select('platform, status, created_at');

    if (leadsError) {
      console.error('Error fetching leads for analytics:', leadsError);
      return res.status(500).json({ error: 'Failed to fetch leads analytics' });
    }

    // Fetch all messages for user
    const { data: messages, error: messagesError } = await userClient
      .from('messages')
      .select('direction, created_at');

    if (messagesError) {
      console.error('Error fetching messages for analytics:', messagesError);
      return res.status(500).json({ error: 'Failed to fetch messages analytics' });
    }

    // Calculate Summary Metrics
    const totalLeads = leads?.length || 0;
    const interestedLeads = leads?.filter(l => l.status === 'interested' || l.status === 'converted').length || 0;
    const convertedLeads = leads?.filter(l => l.status === 'converted').length || 0;
    const messagesSent = messages?.filter(m => m.direction === 'sent').length || 0;

    const acceptanceRate = totalLeads > 0 ? Math.round((interestedLeads / totalLeads) * 100) : 0;
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    // Platform Statistics
    const platforms = ['linkedin', 'twitter', 'upwork'];
    const conversionByPlatform = platforms.map(platform => {
      const platformLeads = leads?.filter(l => l.platform === platform) || [];
      const pTotal = platformLeads.length;
      const pInterested = platformLeads.filter(l => l.status === 'interested' || l.status === 'converted').length;
      const pConverted = platformLeads.filter(l => l.status === 'converted').length;
      return {
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        leads: pTotal,
        interested: pInterested,
        converted: pConverted,
        rate: pTotal > 0 ? Math.round((pInterested / pTotal) * 100) : 0,
      };
    });

    // Message volumes by day of week (last 7 days)
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const messageVolumeMap: { [key: string]: { sent: number; received: number } } = {};

    // Initialize map
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = daysOfWeek[d.getDay()];
      messageVolumeMap[dayName] = { sent: 0, received: 0 };
    }

    // Populate daily counts from last 7 days of messages
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    messages?.forEach(msg => {
      const msgDate = new Date(msg.created_at);
      if (msgDate >= sevenDaysAgo) {
        const dayName = daysOfWeek[msgDate.getDay()];
        if (messageVolumeMap[dayName]) {
          if (msg.direction === 'sent') {
            messageVolumeMap[dayName].sent += 1;
          } else {
            messageVolumeMap[dayName].received += 1;
          }
        }
      }
    });

    const messagesByDay = Object.keys(messageVolumeMap).map(day => ({
      day,
      sent: messageVolumeMap[day].sent,
      received: messageVolumeMap[day].received,
    }));

    return res.json({
      summary: {
        totalLeads,
        acceptanceRate,
        conversionRate,
        messagesSent,
        activeClientSlots: convertedLeads, // freelancers keep track of clients landed
      },
      messagesByDay,
      conversionByPlatform,
    });
  } catch (err: any) {
    console.error('Analytics endpoint error:', err);
    return res.status(500).json({ error: 'Server error compiling analytics' });
  }
});

export default router;
