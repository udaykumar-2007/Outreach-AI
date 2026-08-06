import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues.js';
import { supabaseAdmin } from '../services/supabase.js';
import { getBrowserSession, getTargetUrl, checkForCaptcha, sleep } from '../automation/browser.js';
import { publishLog } from '../services/publisher.js';

interface OutreachJobData {
  messageId?: string;
  leadId: string;
  userId: string;
  platform: 'linkedin' | 'twitter' | 'upwork' | 'devto';
  profileUrl: string;
  content: string;
}

export const outreachWorker = new Worker<OutreachJobData>(
  'outreach-queue',
  async (job: Job<OutreachJobData>) => {
    const { messageId, leadId, userId, platform, profileUrl, content } = job.data;
    const plat: string = platform;
    console.log(`[OutreachWorker] Processing job ${job.id} - Sending to ${profileUrl}`);

    // Retrieve lead details
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadErr || !lead) {
      console.error(`[OutreachWorker] Lead ${leadId} not found. Skipping.`);
      return;
    }

    // 1. API Credentials validation check
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('api_keys')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      console.error(`[OutreachWorker] Profile error for user ${userId}:`, profileErr);
      await publishLog(userId, 'WARNING', { message: 'Failed to retrieve user keys for outreach.' });
      return;
    }

    const keys = profile.api_keys || {};

    if (plat === 'linkedin') {
      const hasLiCookie = !!keys.linkedin_li_at;
      if (!hasLiCookie) {
        console.log(`[OutreachWorker] LinkedIn li_at cookie not configured for user ${userId}. Skipping outreach.`);
        await publishLog(userId, 'WARNING', {
          message: `LinkedIn outreach skipped. Please configure your LinkedIn li_at cookie in Settings first.`,
        });
        return;
      }
    } else if (plat === 'twitter') {
      const hasTwitter = !!(keys.twitter_api_key && keys.twitter_api_secret && keys.twitter_access_token && keys.twitter_access_secret);
      if (!hasTwitter) {
        console.log(`[OutreachWorker] Twitter API credentials not configured for user ${userId}. Skipping outreach.`);
        await publishLog(userId, 'WARNING', {
          message: `Twitter/X outreach skipped. Please configure all Twitter API credentials in Settings first.`,
        });
        return;
      }
    } else if (plat === 'devto') {
      const hasDevto = !!keys.devto_api_key;
      if (!hasDevto) {
        console.log(`[OutreachWorker] Dev.to API Key not configured for user ${userId}. Skipping outreach.`);
        await publishLog(userId, 'WARNING', {
          message: `Dev.to outreach skipped. Please configure your Dev.to API Key in Settings first.`,
        });
        return;
      }
    } else if (plat === 'upwork') {
      console.log(`[OutreachWorker] Upwork credentials not configured for user ${userId}. Skipping outreach.`);
      await publishLog(userId, 'WARNING', {
        message: `Upwork outreach skipped. Upwork credentials are not configured.`,
      });
      return;
    }

    // 2. Enforce 1 message per hour rate limit
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const { data: recentMsgs, error: msgErr } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('user_id', userId)
      .eq('direction', 'sent')
      .gt('created_at', oneHourAgo);

    if (recentMsgs && recentMsgs.length > 0) {
      console.log(`[OutreachWorker] Rate-limit hit: User ${userId} has already sent a message in the last hour. Delaying outreach.`);
      await publishLog(userId, 'WARNING', {
        message: `Outreach rate-limited (1 message/hour). Postponing message to ${lead.name} to comply with limits.`,
      });
      // Re-enqueue the job with a 15-minute delay to try again later
      await job.changeDelay(15 * 60 * 1000); // 15 minutes delay
      throw new Error('Rate limit of 1 message per hour exceeded. Job postponed.');
    }

    const { context, page, browser, statePath } = await getBrowserSession(userId, platform);

    try {
      // Navigate to target message / profile page
      let targetUrl = profileUrl;
      if (plat === 'linkedin') {
        const username = profileUrl.substring(profileUrl.lastIndexOf('/') + 1) || 'alex-rivera';
        targetUrl = `https://www.linkedin.com/messaging/thread/${username}`;
      } else if (plat === 'twitter') {
        const handle = profileUrl.substring(profileUrl.lastIndexOf('/') + 1) || 'elena_codes';
        targetUrl = `https://x.com/messages/${handle}`;
      } else if (plat === 'devto') {
        targetUrl = profileUrl;
      }

      const navigateUrl = getTargetUrl(targetUrl, platform);
      console.log(`[OutreachWorker] Opening message panel: ${navigateUrl}`);
      await page.goto(navigateUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(2000, 4000);

      // Check for captchas or blocks
      const isBlocked = await checkForCaptcha(page);
      if (isBlocked) {
        console.log('[OutreachWorker] Captcha or blocking page detected. Pausing campaign.');
        
        // Pause campaign in database
        await supabaseAdmin
          .from('campaigns')
          .update({ active: false })
          .eq('id', lead.campaign_id);

        await publishLog(userId, 'CAMPAIGN_PAUSED', {
          campaignId: lead.campaign_id,
          reason: 'Captcha or Account security check block detected.',
        });
        await publishLog(userId, 'JOB_FAILED', {
          leadId,
          error: 'Security challenge block detected by browser automation.',
        });
        throw new Error('Automation block triggered: Captcha detected.');
      }

      // Input text and Send message
      if (plat === 'linkedin') {
        // Find chat input. In mock it is #message-input, in production it uses standard aria-label
        const inputSelector = page.locator('#message-input, [role="textbox"][aria-label*="message"]').first();
        const sendSelector = page.locator('.send-btn, button[type="submit"]:has-text("Send")').first();

        if (await inputSelector.isVisible()) {
          await inputSelector.fill(content);
          await sleep(1000, 2000);
          await sendSelector.click();
          console.log('[OutreachWorker] LinkedIn message typed and click sent.');
        } else {
          throw new Error('LinkedIn chat input field not found.');
        }
      } else if (plat === 'twitter') {
        // Simulating Twitter message send
        const inputSelector = page.locator('#message-input, [data-testid="dmComposerTextInput"]').first();
        const sendSelector = page.locator('.send-btn, [data-testid="dmComposerSendButton"]').first();

        if (await inputSelector.isVisible()) {
          await inputSelector.fill(content);
          await sleep(1000, 2000);
          await sendSelector.click();
          console.log('[OutreachWorker] Twitter direct message sent.');
        } else {
          throw new Error('Twitter DM input field not found.');
        }
      } else if (plat === 'upwork') {
        // Simulating proposal submission
        const submitSelector = page.locator('.job-post-link, button:has-text("Submit Proposal")').first();
        if (await submitSelector.isVisible()) {
          await submitSelector.click();
          console.log('[OutreachWorker] Upwork proposal submission clicked.');
        }
      } else if (plat === 'devto') {
        const inputSelector = page.locator('#message-input, .markdown-textarea, [aria-label="Comment body"]').first();
        const sendSelector = page.locator('.send-btn, button:has-text("Submit"), button:has-text("Publish")').first();

        if (await inputSelector.isVisible()) {
          await inputSelector.fill(content);
          await sleep(1000, 2000);
          await sendSelector.click();
          console.log('[OutreachWorker] Dev.to comment outreach posted.');
        } else {
          console.log('[OutreachWorker] No comment text box visible on this URL. Simulating profile connection message.');
          await sleep(2000);
        }
      }

      await sleep(2000, 4000);

      // Record message in database
      let savedMsg = null;
      if (messageId) {
        // Update existing draft if we had one
        const { data } = await supabaseAdmin
          .from('messages')
          .update({ content })
          .eq('id', messageId)
          .select('*')
          .single();
        savedMsg = data;
      } else {
        // Insert new sent message record
        const { data, error: msgErr } = await supabaseAdmin
          .from('messages')
          .insert({
            lead_id: leadId,
            user_id: userId,
            direction: 'sent',
            content,
            sentiment: 'neutral',
          })
          .select('*')
          .single();
        if (msgErr) console.error('[OutreachWorker] Error saving message log:', msgErr);
        savedMsg = data;
      }

      // Update CRM state to 'messaged'
      await supabaseAdmin
        .from('leads')
        .update({ status: 'messaged' })
        .eq('id', leadId);

      // Notify clients
      if (savedMsg) {
        await publishLog(userId, 'MESSAGE_SENT', {
          message: savedMsg,
          leadId,
        });
      }
    } catch (err: any) {
      console.error('[OutreachWorker] Automation sending failed:', err);
      await publishLog(userId, 'JOB_FAILED', {
        leadId,
        error: err.message || 'Error occurred during message sending.',
      });
      throw err;
    } finally {
      await browser.close();
    }
  },
  { connection: redisConnection, concurrency: 1 }
);
