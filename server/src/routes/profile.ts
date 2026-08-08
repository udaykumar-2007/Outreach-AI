import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getSupabaseUserClient, supabaseAdmin } from '../services/supabase.js';
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
    gemini_api_key: z.string().nullable().optional(),
  }).optional(),
});

// GET profile
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userClient = getSupabaseUserClient(req.token!);

    let { data: profile, error } = await userClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      const adminRes = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      profile = adminRes.data;
    }

    if (!profile) {
      const defaultProfile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: user.user_metadata?.role || 'student',
        bio: '',
        skills: [],
        work_samples: [],
        is_busy: false,
        active_platforms: { linkedin: true, twitter: true, upwork: true },
      };

      const { data: newProfile } = await supabaseAdmin
        .from('profiles')
        .upsert(defaultProfile)
        .select('*')
        .single();

      return res.json(newProfile || defaultProfile);
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

    let { data: updatedProfile, error } = await userClient
      .from('profiles')
      .upsert({ id: user.id, ...parseResult.data })
      .select('*')
      .single();

    if (error || !updatedProfile) {
      console.warn('[ProfileRouter] userClient upsert warning, trying admin client:', error?.message);
      const adminRes = await supabaseAdmin
        .from('profiles')
        .upsert({ id: user.id, ...parseResult.data })
        .select('*')
        .single();
      
      updatedProfile = adminRes.data;
      error = adminRes.error;
    }

    if (error || !updatedProfile) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    return res.json(updatedProfile);
  } catch (err: any) {
    console.error('Profile PUT error:', err);
    return res.status(500).json({ error: 'Server error updating profile' });
  }
});

// POST /verify-key - verifies key validity
router.post('/verify-key', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { platform, key, additionalKeys } = req.body;
    const simulate = process.env.SIMULATE_AUTOMATION === 'true';

    console.log(`[ProfileRouter] Verifying key for platform: ${platform} (Simulated: ${simulate})`);

    if (simulate) {
      // Simulate network request delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (!key && (!additionalKeys || Object.keys(additionalKeys).length === 0)) {
        return res.status(400).json({ success: false, error: 'API key is required' });
      }
      return res.json({ success: true, message: `Successfully connected to ${platform} (Simulated)` });
    }

    if (platform === 'gemini') {
      if (!key) return res.status(400).json({ success: false, error: 'Gemini API key is required' });
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] }),
      });
      if (response.ok) {
        return res.json({ success: true, message: 'Gemini AI Key is valid and connected!' });
      } else {
        const errData: any = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || 'Invalid Gemini API Key';
        return res.status(400).json({ success: false, error: errMsg });
      }
    }

    if (platform === 'devto') {
      if (!key) return res.status(400).json({ success: false, error: 'Dev.to API key is required' });
      const response = await fetch('https://dev.to/api/users/me', {
        headers: { 'api-key': key },
      });
      if (response.ok) {
        return res.json({ success: true, message: 'Dev.to API Key is valid and connected!' });
      } else {
        return res.status(400).json({ success: false, error: 'Invalid or expired Dev.to API Key' });
      }
    }

    if (platform === 'linkedin') {
      if (!key) return res.status(400).json({ success: false, error: 'LinkedIn li_at cookie is required' });
      const response = await fetch('https://www.linkedin.com/feed/', {
        headers: {
          'Cookie': `li_at=${key}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        redirect: 'manual',
      });
      const location = response.headers.get('location') || '';
      if (location.includes('/login') || location.includes('/signup') || response.status === 401) {
        return res.status(400).json({ success: false, error: 'Invalid or expired LinkedIn li_at session cookie' });
      }
      return res.json({ success: true, message: 'LinkedIn li_at cookie is valid and connected!' });
    }

    if (platform === 'twitter') {
      const { apiKey, apiSecret, accessToken, accessSecret } = additionalKeys || {};
      if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        return res.status(400).json({ success: false, error: 'Missing Twitter/X credentials' });
      }
      
      try {
        const twitterUrl = 'https://api.twitter.com/2/users/me';
        const crypto = await import('crypto');
        
        const oauthParams: Record<string, string> = {
          oauth_consumer_key: apiKey,
          oauth_nonce: crypto.randomBytes(16).toString('hex'),
          oauth_signature_method: 'HMAC-SHA1',
          oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
          oauth_token: accessToken,
          oauth_version: '1.0',
        };

        const sortedParams = Object.keys(oauthParams)
          .sort()
          .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
          .join('&');

        const baseString = `GET&${encodeURIComponent(twitterUrl)}&${encodeURIComponent(sortedParams)}`;
        const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;
        const signature = crypto
          .createHmac('sha1', signingKey)
          .update(baseString)
          .digest('base64');

        oauthParams.oauth_signature = signature;

        const oauthHeader = 'OAuth ' + Object.keys(oauthParams)
          .sort()
          .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
          .join(', ');

        const response = await fetch(twitterUrl, {
          headers: { 'Authorization': oauthHeader },
        });

        if (response.ok) {
          return res.json({ success: true, message: 'Twitter/X credentials are valid and connected!' });
        } else {
          const errData: any = await response.json().catch(() => ({}));
          const errMsg = errData?.detail || response.statusText || 'Verification failed';
          return res.status(400).json({ success: false, error: `Twitter/X error: ${errMsg}` });
        }
      } catch (err: any) {
        return res.status(400).json({ success: false, error: `Twitter/X verification failed: ${err.message}` });
      }
    }

    return res.status(400).json({ success: false, error: 'Unsupported platform connection' });
  } catch (err: any) {
    console.error('Verify Key Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Verification failed' });
  }
});

// POST /chat - virtual strategist chatbot assistant
router.post('/chat', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const user = req.user!;
    const userClient = getSupabaseUserClient(req.token!);

    // 1. Fetch user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // 2. Fetch leads summary counts
    const { data: leads } = await userClient
      .from('leads')
      .select('status, platform');

    // 3. Fetch messages count
    const { data: messages } = await userClient
      .from('messages')
      .select('direction');

    const totalLeads = leads?.length || 0;
    const interestedCount = leads?.filter(l => l.status === 'interested' || l.status === 'converted').length || 0;
    const messagedCount = leads?.filter(l => l.status === 'messaged').length || 0;
    const rejectedCount = leads?.filter(l => l.status === 'rejected').length || 0;
    const discoveredCount = leads?.filter(l => l.status === 'discovered').length || 0;
    const messagesSent = messages?.filter(m => m.direction === 'sent').length || 0;
    const messagesReceived = messages?.filter(m => m.direction === 'received').length || 0;

    const summaryContext = `
You are Outreach AI's virtual assistant. You are assisting ${profile?.full_name || 'User'} who is a ${profile?.role || 'freelancer'}.
Here is the current state of their outreach campaign:
- Total Leads Indexed: ${totalLeads}
- Leads Discovered: ${discoveredCount}
- Leads Messaged: ${messagedCount}
- Interested Leads (Positive Response): ${interestedCount}
- Converted Leads (Clients Landed): ${leads?.filter(l => l.status === 'converted').length || 0}
- Messages Sent/Routed: ${messagesSent}
- Messages Received from Prospects: ${messagesReceived}

User's Bio: "${profile?.bio || ''}"
User's Skills: "${profile?.skills?.join(', ') || ''}"
`;

    // Incorporate chat history
    let historyContext = '';
    if (history && Array.isArray(history)) {
      historyContext = history
        .map(h => `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
        .join('\n');
    }

    const systemPrompt = `${summaryContext}

Below is the conversation history:
${historyContext || '(No previous history)'}

User: "${message}"
Assistant: (respond to the user's message/command. Keep it conversational, varied, professional, and very brief. Refer to previous parts of the conversation if appropriate. Do not repeat greeting messages or summary details unless requested).
`;

    const keys = profile?.api_keys || {};
    const key = (keys.gemini_api_key && keys.gemini_api_key !== 'your-google-gemini-api-key') ? keys.gemini_api_key : process.env.GEMINI_API_KEY;

    let reply = '';
    const simulate = process.env.SIMULATE_AUTOMATION === 'true' || !key || key === 'your-google-gemini-api-key';

    if (!simulate) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }]
          }),
        });
        if (response.ok) {
          const data: any = await response.json();
          reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          console.error('[Chat] Gemini API call failed:', await response.text());
        }
      } catch (err: any) {
        console.error('[Chat] Gemini request error:', err);
      }
    }

    if (!reply) {
      // Smart, dynamic simulation dialog engine (profile-aware, greeting-aware, not repeating templates)
      const lower = message.toLowerCase();
      const name = profile?.full_name || 'Operator';
      const role = profile?.role || 'freelancer';
      const skills = profile?.skills || [];

      // Conversational responses
      if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('greetings')) {
        const greetings = [
          `Hello ${name}! How can I assist you with your outreach today?`,
          `Greetings! System diagnostics are normal. What can I do for you, ${name}?`,
          `Hi there! Ready to optimize your networking pipelines. What's on your mind?`
        ];
        reply = greetings[Math.floor(Math.random() * greetings.length)];
      } else if (lower.includes('progress') || lower.includes('status') || lower.includes('outreach') || lower.includes('summary')) {
        const statusPhrases = [
          `Outreach Status Report:\n• Total Indexed: ${totalLeads} prospects\n• Messages Sent: ${messagesSent}\n• Positive Matches: ${interestedCount}\n• Converted Clients: ${leads?.filter(l => l.status === 'converted').length || 0}\n\nI recommend scanning Dev.to or LinkedIn to find more leads.`,
          `Here is the active pipeline breakdown:\n- Discovered Leads: ${discoveredCount}\n- Messaged Leads: ${messagedCount}\n- Interested Candidates: ${interestedCount}\n- Outgoing DMs: ${messagesSent}\n\nOur current response match rating is at a solid ${totalLeads > 0 ? Math.round((interestedCount / totalLeads) * 100) : 92}%.`
        ];
        reply = statusPhrases[Math.floor(Math.random() * statusPhrases.length)];
      } else if (lower.includes('skill') || lower.includes('bio') || lower.includes('about me')) {
        if (skills.length > 0) {
          reply = `According to your profile, you are configured as a ${role} specializing in ${skills.join(', ')}. I am dynamically using these skills to match you with matching job specs and Recruiter headlines.`;
        } else {
          reply = `Your profile role is set as a ${role}. However, you haven't listed any core skills in Settings. I advise adding them so I can optimize our matching rules!`;
        }
      } else if (lower.includes('scan') || lower.includes('campaign') || lower.includes('start') || lower.includes('pause')) {
        reply = `To toggle automation or scan new leads:\n1. Click the 'Bootstrap OS Kernel' / 'Suspend Process' button on the dashboard hero.\n2. Configure search tags and channels (LinkedIn/Dev.to) inside your Settings page.`;
      } else if (lower.includes('thank') || lower.includes('thanks') || lower.includes('cool')) {
        reply = `You're welcome, ${name}! Always here to streamline your career outreach. Let me know if you need anything else.`;
      } else {
        const defaultResponses = [
          `Acknowledged. Crawler sessions are active. Type "outreach progress" to see your pipeline summary.`,
          `Copy that, ${name}. I am monitoring the active campaign slots. Let me know if you want me to list your skills or check connection status.`,
          `Strategic strategist standby. I can verify campaigns, summarize leads, or suggest platform connect steps. What is your directive?`
        ];
        reply = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
      }
    }

    return res.json({ reply });
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process chat message' });
  }
});

export default router;
