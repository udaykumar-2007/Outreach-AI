import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues.js';
import { supabaseAdmin } from '../services/supabase.js';
import { getBrowserSession, getTargetUrl, checkForCaptcha, sleep } from '../automation/browser.js';
import { publishLog } from '../services/publisher.js';

interface OutreachJobData {
  messageId?: string;
  leadId: string;
  userId: string;
  platform: 'linkedin' | 'twitter' | 'upwork';
  profileUrl: string;
  content: string;
}

export const outreachWorker = new Worker<OutreachJobData>(
  'outreach-queue',
  async (job: Job<OutreachJobData>) => {
    const { messageId, leadId, userId, platform, profileUrl, content } = job.data;
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

    const { context, page, browser, statePath } = await getBrowserSession(userId, platform);

    try {
      // Navigate to target message / profile page
      let targetUrl = profileUrl;
      if (platform === 'linkedin') {
        const username = profileUrl.substring(profileUrl.lastIndexOf('/') + 1) || 'alex-rivera';
        targetUrl = `https://www.linkedin.com/messaging/thread/${username}`;
      } else if (platform === 'twitter') {
        const handle = profileUrl.substring(profileUrl.lastIndexOf('/') + 1) || 'elena_codes';
        targetUrl = `https://x.com/messages/${handle}`;
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
      if (platform === 'linkedin') {
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
      } else if (platform === 'twitter') {
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
      } else if (platform === 'upwork') {
        // Simulating proposal submission
        const submitSelector = page.locator('.job-post-link, button:has-text("Submit Proposal")').first();
        if (await submitSelector.isVisible()) {
          await submitSelector.click();
          console.log('[OutreachWorker] Upwork proposal submission clicked.');
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
