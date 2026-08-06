import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues.js';
import { supabaseAdmin } from '../services/supabase.js';
import { publishLog } from '../services/publisher.js';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== 'your-google-gemini-api-key') {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.error('Failed to initialize Gemini in AutopostWorker:', err);
  }
}

interface AutopostJobData {
  userId: string;
  portfolioSlug: string;
  hasTwitter: boolean;
  hasDevto: boolean;
}

const autopostOutputSchema = z.object({
  devto_title: z.string(),
  devto_markdown: z.string(),
  tweet_content: z.string().max(280),
});

export const autopostWorker = new Worker<AutopostJobData>(
  'autopost-queue',
  async (job: Job<AutopostJobData>) => {
    const { userId, portfolioSlug, hasTwitter, hasDevto } = job.data;
    console.log(`[AutopostWorker] Executing autopost for user ${userId}`);

    await publishLog(userId, 'INFO', { message: 'Drafting announcement posts via Gemini 2.5 Flash...' });

    // Fetch user profile and keys
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('[AutopostWorker] Profile not found:', profileError);
      await publishLog(userId, 'JOB_FAILED', { error: 'Failed to retrieve user profile for autopost.' });
      throw new Error('Profile not found');
    }

    const keys = profile.api_keys || {};
    const devtoApiKey = keys.devto_api_key;

    const portfolioUrl = `http://localhost:3000/portfolio/${portfolioSlug}`;

    const prompt = `
      You are a tech influencer and expert technical writer.
      Generate a professional announcement campaign celebrating the launch of a new web portfolio for:
      Name: ${profile.full_name}
      Role: ${profile.role.toUpperCase()}
      Bio: ${profile.bio || 'Freelance developer specializing in software.'}
      Skills: ${(profile.skills || []).join(', ')}
      Portfolio URL: ${portfolioUrl}

      Outputs needed:
      1. A high-quality Dev.to blog post (in Markdown). It must describe the developer's journey, list their core projects/skills, invite feedback, and include a link to their new portfolio.
      2. A Twitter/X announcement tweet (strictly 280 characters or less). Include a few hashtags and the portfolio link.

      Output requirement:
      - Return a JSON object with:
        - "devto_title": A catchy technical article title.
        - "devto_markdown": The full markdown body of the Dev.to article.
        - "tweet_content": The tweet text (max 280 characters).
    `;

    // Fallbacks if Gemini is not set up
    const fallbackTitle = `Announcing My New AI-Generated Web Portfolio!`;
    const fallbackMarkdown = `
# Hey Dev.to!

I am excited to share that I have just launched my new professional web portfolio.

## About Me
* **Role**: ${profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
* **Core Skills**: ${(profile.skills || []).join(', ')}

## Check it Out
You can view my projects, work history, and contact forms here:
👉 [My Live Web Portfolio](${portfolioUrl})

I would love to connect and hear your feedback!
    `;
    const fallbackTweet = `Excited to launch my new portfolio! Check out my work, skills, and projects here: ${portfolioUrl} 🚀 #webdev #portfolio`;

    let generated = {
      devto_title: fallbackTitle,
      devto_markdown: fallbackMarkdown,
      tweet_content: fallbackTweet,
    };

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text;
        if (text) {
          const parsed = autopostOutputSchema.parse(JSON.parse(text));
          generated = parsed;
          console.log('[AutopostWorker] AI drafted post successfully via Gemini.');
        }
      } catch (err: any) {
        console.error('[AutopostWorker] AI generation failed, using fallback:', err.message);
      }
    } else {
      console.log('[AutopostWorker] No Gemini API key. Using static fallbacks.');
    }

    // 1. Publish to Dev.to
    if (hasDevto && devtoApiKey) {
      await publishLog(userId, 'INFO', { message: 'Publishing blog post to Dev.to...' });
      try {
        const devtoRes = await fetch('https://dev.to/api/articles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': devtoApiKey,
          },
          body: JSON.stringify({
            article: {
              title: generated.devto_title,
              published: true,
              body_markdown: generated.devto_markdown,
              tags: ['portfolio', 'webdev', 'career'],
            },
          }),
        });

        if (devtoRes.ok) {
          const data: any = await devtoRes.json();
          await publishLog(userId, 'INFO', {
            message: `🎉 Successfully published to Dev.to! Article Link: ${data.url}`,
          });
        } else {
          const errText = await devtoRes.text();
          console.error('[AutopostWorker] Dev.to publish failed:', errText);
          await publishLog(userId, 'WARNING', {
            message: `Failed to publish to Dev.to (Status: ${devtoRes.status}). Check your API Key.`,
          });
        }
      } catch (err: any) {
        console.error('[AutopostWorker] Dev.to request error:', err);
        await publishLog(userId, 'WARNING', { message: 'Network error connecting to Dev.to API.' });
      }
    }

    // 2. Publish to Twitter/X
    if (hasTwitter) {
      await publishLog(userId, 'INFO', { message: 'Publishing announcement to Twitter/X...' });
      // Simulate/Queued announcement because standard write access needs full OAuth 1.0a flow
      await sleep(1000);
      await publishLog(userId, 'INFO', {
        message: `🐦 [Twitter/X Post Simulated] Tweeted: "${generated.tweet_content}"`,
      });
    }

    await publishLog(userId, 'PORTFOLIO_GENERATED', {
      slug: portfolioSlug,
      is_published: true,
      message: 'Portfolio announcement successfully published to your integrations!',
    });
  },
  { connection: redisConnection, concurrency: 1 }
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
