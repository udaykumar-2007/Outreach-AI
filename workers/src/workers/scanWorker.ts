import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues.js';
import { supabaseAdmin } from '../services/supabase.js';
import { getBrowserSession, getTargetUrl, smoothScroll, sleep } from '../automation/browser.js';
import { scoreLead, draftOutreachMessage, draftBusyBufferMessage } from '../services/gemini.js';
import { publishLog } from '../services/publisher.js';
import { outreachQueue } from '../queues.js';

interface ScanJobData {
  campaignId: string;
  userId: string;
  platform: 'linkedin' | 'twitter' | 'upwork';
  targetKeywords: string[];
  targetRole: string;
}

export const scanWorker = new Worker<ScanJobData>(
  'scan-queue',
  async (job: Job<ScanJobData>) => {
    const { campaignId, userId, platform, targetKeywords, targetRole } = job.data;
    console.log(`[ScanWorker] Executing scan job ${job.id} for campaign ${campaignId} (${platform})`);

    // Check if campaign is still active
    const { data: campaign, error: campError } = await supabaseAdmin
      .from('campaigns')
      .select('active')
      .eq('id', campaignId)
      .single();

    if (campError || !campaign || !campaign.active) {
      console.log(`[ScanWorker] Campaign ${campaignId} is paused or deleted. Aborting.`);
      await publishLog(userId, 'CAMPAIGN_PAUSED', { campaignId, message: 'Campaign is inactive.' });
      return;
    }

    // Check if user has configured the necessary API Keys/cookies for this platform
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('api_keys')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      console.error(`[ScanWorker] Profile error for user ${userId}:`, profileErr);
      await publishLog(userId, 'WARNING', { message: 'Failed to retrieve user keys for campaign automation.' });
      return;
    }

    const keys = profile.api_keys || {};

    if (platform === 'linkedin') {
      const hasLiCookie = !!keys.linkedin_li_at;
      if (!hasLiCookie) {
        console.log(`[ScanWorker] LinkedIn li_at cookie not configured for user ${userId}. Pausing campaign.`);
        await supabaseAdmin
          .from('campaigns')
          .update({ active: false })
          .eq('id', campaignId);
        await publishLog(userId, 'WARNING', {
          message: `LinkedIn campaign paused. Please configure your LinkedIn li_at cookie in Settings first.`,
        });
        return;
      }
    } else if (platform === 'twitter') {
      const hasTwitter = !!(keys.twitter_api_key && keys.twitter_api_secret && keys.twitter_access_token && keys.twitter_access_secret);
      if (!hasTwitter) {
        console.log(`[ScanWorker] Twitter API credentials not configured for user ${userId}. Pausing campaign.`);
        await supabaseAdmin
          .from('campaigns')
          .update({ active: false })
          .eq('id', campaignId);
        await publishLog(userId, 'WARNING', {
          message: `Twitter/X campaign paused. Please configure all Twitter API credentials in Settings first.`,
        });
        return;
      }
    }

    const { context, page, browser, statePath } = await getBrowserSession(userId, platform);

    try {
      // Create search query URL based on keyword
      const keyword = targetKeywords[0] || targetRole;
      let searchUrl = '';

      if (platform === 'linkedin') {
        searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keyword)}`;
      } else if (platform === 'twitter') {
        searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&f=user`;
      } else if (platform === 'upwork') {
        searchUrl = `https://www.upwork.com/nx/search/jobs/?q=${encodeURIComponent(keyword)}`;
      }

      const targetUrl = getTargetUrl(searchUrl, platform);
      console.log(`[ScanWorker] Navigating to search target: ${targetUrl}`);
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(2000, 4000);
      await smoothScroll(page);

      // Scrape lists based on selectors
      const discoveredLeads: Array<{ name: string; profileUrl: string; headline: string; company: string }> = [];

      if (platform === 'linkedin') {
        const cards = page.locator('.linkedin-profile-card');
        const count = await cards.count();
        console.log(`[ScanWorker] Found ${count} profile cards on search page.`);
        for (let i = 0; i < count; i++) {
          const card = cards.nth(i);
          const name = (await card.locator('.profile-name').innerText({ timeout: 1000 })).trim();
          const headline = (await card.locator('.profile-title').innerText({ timeout: 1000 })).trim();
          const profileUrl = (await card.locator('.profile-link').getAttribute('href', { timeout: 1000 })) || '';
          discoveredLeads.push({
            name,
            headline,
            profileUrl,
            company: headline.includes('at ') ? headline.split('at ')[1] : 'Unknown',
          });
        }
      } else if (platform === 'twitter') {
        const tweets = page.locator('.twitter-tweet');
        const count = await tweets.count();
        console.log(`[ScanWorker] Found ${count} tweets on search page.`);
        for (let i = 0; i < count; i++) {
          const card = tweets.nth(i);
          const name = (await card.locator('.tweet-author').innerText({ timeout: 1000 })).trim();
          const handle = (await card.locator('.tweet-handle').innerText({ timeout: 1000 })).trim();
          const text = (await card.locator('.tweet-text').innerText({ timeout: 1000 })).trim();
          const profileUrl = (await card.locator('.tweet-link').getAttribute('href', { timeout: 1000 })) || '';
          discoveredLeads.push({
            name: `${name} (${handle})`,
            headline: text,
            profileUrl,
            company: 'Twitter/X Post',
          });
        }
      } else if (platform === 'upwork') {
        const cards = page.locator('.upwork-job-card');
        const count = await cards.count();
        console.log(`[ScanWorker] Found ${count} jobs on search page.`);
        for (let i = 0; i < count; i++) {
          const card = cards.nth(i);
          const name = (await card.locator('.job-title').innerText({ timeout: 1000 })).trim();
          const desc = (await card.locator('.job-description').innerText({ timeout: 1000 })).trim();
          const profileUrl = (await card.locator('.job-post-link').getAttribute('href', { timeout: 1000 })) || '';
          discoveredLeads.push({
            name,
            headline: desc,
            profileUrl,
            company: 'Upwork Project',
          });
        }
      }

      console.log(`[ScanWorker] Processing ${discoveredLeads.length} discovered leads.`);

      for (const leadInfo of discoveredLeads) {
        // A. Check if lead already exists in DB
        const { data: existingLead } = await supabaseAdmin
          .from('leads')
          .select('id, status')
          .eq('user_id', userId)
          .eq('profile_url', leadInfo.profileUrl)
          .maybeSingle();

        if (existingLead) {
          console.log(`[ScanWorker] Lead ${leadInfo.name} already exists. Skipping.`);
          continue;
        }

        // B. Insert as discovered initially
        const { data: newLead, error: insertErr } = await supabaseAdmin
          .from('leads')
          .insert({
            campaign_id: campaignId,
            user_id: userId,
            platform,
            name: leadInfo.name,
            profile_url: leadInfo.profileUrl,
            company: leadInfo.company,
            status: 'discovered',
            match_score: 0,
            reason: 'Newly discovered. Awaiting AI evaluation.',
          })
          .select('*')
          .single();

        if (insertErr || !newLead) {
          console.error('[ScanWorker] Failed to insert discovered lead:', insertErr);
          continue;
        }

        await publishLog(userId, 'LEAD_FOUND', { lead: newLead });

        // C. Navigate to profile detail and score
        console.log(`[ScanWorker] Navigating to detail page for: ${leadInfo.name} (${leadInfo.profileUrl})`);
        const detailTarget = getTargetUrl(leadInfo.profileUrl, platform);
        await page.goto(detailTarget, { waitUntil: 'networkidle', timeout: 30000 });
        await sleep(1500, 3000);

        let bioText = leadInfo.headline;
        if (platform === 'linkedin') {
          try {
            const bioLocator = page.locator('.profile-bio');
            if (await bioLocator.isVisible()) {
              bioText += ' ' + await bioLocator.innerText();
            }
          } catch (e) {
            console.log('[ScanWorker] Could not extract profile bio element, using headline.');
          }
        }

        // Score lead via Gemini
        const scoreResult = await scoreLead(bioText, targetRole, targetKeywords);
        console.log(`[ScanWorker] Scored ${leadInfo.name}: Score=${scoreResult.score}, Match=${scoreResult.is_match}`);

        const updatedStatus = scoreResult.is_match ? 'evaluated' : 'rejected';

        // Update lead status
        const { data: scoredLead } = await supabaseAdmin
          .from('leads')
          .update({
            status: updatedStatus,
            match_score: scoreResult.score,
            reason: scoreResult.reason,
          })
          .eq('id', newLead.id)
          .select('*')
          .single();

        if (scoredLead) {
          await publishLog(userId, 'LEAD_SCORED', { lead: scoredLead });
        }

        // D. If a good match, trigger message drafting and queue outreach!
        if (scoreResult.is_match && scoredLead) {
          // Fetch sender profile details to draft message
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (profile) {
            let draft = '';
            
            // Check freelancer busy buffer mode
            if (profile.role === 'freelancer' && profile.is_busy) {
              const draftObj = await draftBusyBufferMessage(leadInfo.name, bioText);
              draft = draftObj.draft_message;
            } else {
              const draftObj = await draftOutreachMessage(
                leadInfo.name,
                leadInfo.headline,
                bioText,
                platform,
                profile.role,
                profile.skills || [],
                profile.work_samples || []
              );
              draft = draftObj.draft_message;
            }

            console.log(`[ScanWorker] Drafted message for ${leadInfo.name}: "${draft}"`);

            // Queue outreach sending job
            await outreachQueue.add(
              `outreach-send-${scoredLead.id}`,
              {
                leadId: scoredLead.id,
                userId,
                platform,
                profileUrl: leadInfo.profileUrl,
                content: draft,
              },
              {
                removeOnComplete: true,
              }
            );
          }
        }

        // Space out crawls humanely
        await sleep(3000, 6000);
      }
    } catch (err: any) {
      console.error('[ScanWorker] Job encountered an error:', err);
      await publishLog(userId, 'JOB_FAILED', {
        campaignId,
        error: err.message || 'Error occurred during profile crawling.',
      });
      throw err;
    } finally {
      await browser.close();
    }
  },
  { connection: redisConnection, concurrency: 1 }
);
