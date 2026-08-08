import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues.js';
import { supabaseAdmin } from '../services/supabase.js';
import { getBrowserSession, getTargetUrl, sleep } from '../automation/browser.js';
import { classifySentiment } from '../services/gemini.js';
import { publishLog } from '../services/publisher.js';

interface InboxJobData {
  userId: string;
  campaignId: string;
  platform: 'linkedin' | 'twitter' | 'upwork';
}

export const inboxWorker = new Worker<InboxJobData>(
  'inbox-queue',
  async (job: Job<InboxJobData>) => {
    const { userId, campaignId, platform } = job.data;
    console.log(`[InboxWorker] Running inbox poll job ${job.id} for user ${userId} on ${platform}`);

    // Fetch messaged leads for this user & platform
    const { data: leads, error: leadsErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('status', 'messaged');

    if (leadsErr) {
      console.error('[InboxWorker] Error fetching messaged leads:', leadsErr);
      return;
    }

    if (!leads || leads.length === 0) {
      console.log('[InboxWorker] No active messaged leads to poll. Exiting.');
      return;
    }

    // Fetch user profile keys for Gemini validation
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('api_keys')
      .eq('id', userId)
      .single();
    const keys = profile?.api_keys || {};

    const { context, page, browser, statePath } = await getBrowserSession(userId, platform);

    try {
      for (const lead of leads) {
        // Build mock / real path to messaging page
        let targetUrl = lead.profile_url;
        if (platform === 'linkedin') {
          const username = lead.profile_url.substring(lead.profile_url.lastIndexOf('/') + 1) || 'alex-rivera';
          targetUrl = `https://www.linkedin.com/messaging/thread/${username}`;
        } else if (platform === 'twitter') {
          const handle = lead.profile_url.substring(lead.profile_url.lastIndexOf('/') + 1) || 'elena_codes';
          targetUrl = `https://x.com/messages/${handle}`;
        }

        const navigateUrl = getTargetUrl(targetUrl, platform);
        console.log(`[InboxWorker] Checking messages for lead ${lead.name} at: ${navigateUrl}`);
        
        await page.goto(navigateUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await sleep(1500, 3000);

        // Scrape latest message text. In mock, check .message.received elements
        let messageText = '';
        let direction: 'received' | 'sent' = 'received';

        if (platform === 'linkedin') {
          const receivedMessages = page.locator('.message.received');
          const count = await receivedMessages.count();
          if (count > 0) {
            // Get the last message
            messageText = (await receivedMessages.nth(count - 1).innerText({ timeout: 1000 })).trim();
          }
        } else if (platform === 'twitter') {
          // Tweet DM mock contains .tweet-dm-bubble or .message.received
          const receivedMessages = page.locator('.message.received');
          const count = await receivedMessages.count();
          if (count > 0) {
            messageText = (await receivedMessages.nth(count - 1).innerText({ timeout: 1000 })).trim();
          }
        }

        if (!messageText) {
          console.log(`[InboxWorker] No received messages found for lead ${lead.name}.`);
          continue;
        }

        // Check if this message was already recorded
        const { data: existingMsg } = await supabaseAdmin
          .from('messages')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('direction', 'received')
          .eq('content', messageText)
          .maybeSingle();

        if (existingMsg) {
          console.log(`[InboxWorker] Message already recorded. Skipping.`);
          continue;
        }

        console.log(`[InboxWorker] New message discovered from ${lead.name}: "${messageText}"`);

        // A. Insert message into DB
        const { data: newMsg, error: insertMsgErr } = await supabaseAdmin
          .from('messages')
          .insert({
            lead_id: lead.id,
            user_id: userId,
            direction: 'received',
            content: messageText,
          })
          .select('*')
          .single();

        if (insertMsgErr || !newMsg) {
          console.error('[InboxWorker] Error inserting message:', insertMsgErr);
          continue;
        }

        await publishLog(userId, 'MESSAGE_RECEIVED', {
          message: newMsg,
          leadId: lead.id,
        });

        // B. Grade Sentiment with Gemini
        const sentimentResult = await classifySentiment(messageText, keys.gemini_api_key);
        console.log(`[InboxWorker] Classified sentiment for ${lead.name}: ${sentimentResult.sentiment}`);

        // Update message sentiment
        const { data: updatedMsg } = await supabaseAdmin
          .from('messages')
          .update({ sentiment: sentimentResult.sentiment })
          .eq('id', newMsg.id)
          .select('*')
          .single();

        if (updatedMsg) {
          await publishLog(userId, 'SENTIMENT_CLASSIFIED', {
            message: updatedMsg,
            leadId: lead.id,
          });
        }

        // C. Update CRM lead pipeline status
        let updatedLeadStatus = lead.status;
        if (sentimentResult.sentiment === 'positive') {
          updatedLeadStatus = 'interested'; // Human Hand-off inbox item!
        } else if (sentimentResult.sentiment === 'negative') {
          updatedLeadStatus = 'rejected'; // Auto archive!
        }

        const { data: updatedLead } = await supabaseAdmin
          .from('leads')
          .update({ status: updatedLeadStatus })
          .eq('id', lead.id)
          .select('*')
          .single();

        if (updatedLead) {
          await publishLog(userId, 'LEAD_SCORED', { lead: updatedLead });
        }
      }
    } catch (err) {
      console.error('[InboxWorker] Error running inbox scanner:', err);
    } finally {
      await browser.close();
    }
  },
  { connection: redisConnection, concurrency: 1 }
);
