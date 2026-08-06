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
    console.error('Failed to initialize Gemini in PortfolioWorker:', err);
  }
}

interface PortfolioJobData {
  userId: string;
  fullName: string;
  role: 'student' | 'freelancer';
  bio: string;
  skills: string[];
  workSamples: Array<{
    title: string;
    description: string;
    technologies?: string[];
    url?: string;
  }>;
}

const portfolioOutputSchema = z.object({
  html_code: z.string(),
  css_code: z.string(),
});

export const portfolioWorker = new Worker<PortfolioJobData>(
  'portfolio-queue',
  async (job: Job<PortfolioJobData>) => {
    const { userId, fullName, role, bio, skills, workSamples } = job.data;
    console.log(`[PortfolioWorker] Generating portfolio for user ${userId} (${fullName})`);

    const prompt = `
      You are a master web designer. Build a stunning, professional, single-page web portfolio layout for:
      Name: ${fullName}
      Role: ${role.toUpperCase()}
      Bio: ${bio}
      Skills: ${skills.join(', ')}
      Projects / Work Samples: ${JSON.stringify(workSamples)}

      Design guidelines:
      - Clean, modern, responsive aesthetics (resembling premium Tailwind/Inter UI styles).
      - Use a rich, curated color palette (e.g. elegant slate, indigo, teal, or violet, never default blue).
      - Include a hero section, skills grid, projects cards section with links, and a footer.
      - Ensure text contrast is excellent.
      
      Output requirement:
      - Return a JSON object with:
        - "html_code": The inner HTML body content (do not wrap in <html>, <head>, or <body> tags).
        - "css_code": The raw stylesheet rules (do not include <style> tags).
    `;

    // High quality fallback HTML & CSS in case Gemini is offline or not configured
    const fallbackHtml = `
      <div class="portfolio-wrap">
        <header class="hero">
          <h1>${fullName}</h1>
          <p class="subtitle">${role.charAt(0).toUpperCase() + role.slice(1)} | Portfolio</p>
          <p class="bio">${bio || 'Passionate builder creating high quality software solutions.'}</p>
        </header>

        <section class="skills-sec">
          <h2>Skills</h2>
          <div class="skills-grid">
            ${skills.map(s => `<span class="skill-pill">${s}</span>`).join('\n')}
          </div>
        </section>

        <section class="projects-sec">
          <h2>Projects</h2>
          <div class="projects-grid">
            ${workSamples.map(w => `
              <div class="project-card">
                <h3>${w.title}</h3>
                <p>${w.description}</p>
                <div class="project-tech">
                  ${(w.technologies || []).map(t => `<span class="tech-pill">${t}</span>`).join(' ')}
                </div>
                ${w.url ? `<a href="${w.url}" target="_blank" class="proj-link">View Project &rarr;</a>` : ''}
              </div>
            `).join('\n')}
          </div>
        </section>
      </div>
    `;

    const fallbackCss = `
      body {
        margin: 0;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        background-color: #0f172a;
        color: #f1f5f9;
        display: flex;
        justify-content: center;
        padding: 40px 20px;
      }
      .portfolio-wrap {
        max-width: 800px;
        width: 100%;
      }
      .hero {
        text-align: center;
        padding: 60px 0;
        border-bottom: 1px solid #334155;
      }
      .hero h1 {
        font-size: 3rem;
        margin: 0 0 10px 0;
        background: linear-gradient(to right, #818cf8, #34d399);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .subtitle {
        font-size: 1.25rem;
        color: #94a3b8;
        margin: 0 0 20px 0;
      }
      .bio {
        color: #cbd5e1;
        font-size: 1.1rem;
        max-width: 600px;
        margin: 0 auto;
        line-height: 1.6;
      }
      .skills-sec, .projects-sec {
        padding: 40px 0;
        border-bottom: 1px solid #334155;
      }
      h2 {
        font-size: 2rem;
        color: #818cf8;
        margin-top: 0;
      }
      .skills-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .skill-pill {
        background: #1e293b;
        color: #38bdf8;
        border: 1px solid #334155;
        padding: 8px 16px;
        border-radius: 9999px;
        font-weight: 500;
      }
      .projects-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
      }
      @media(min-width: 640px) {
        .projects-grid { grid-template-columns: 1fr 1fr; }
      }
      .project-card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .project-card h3 {
        margin: 0 0 10px 0;
        color: #f1f5f9;
      }
      .project-card p {
        color: #94a3b8;
        font-size: 0.95rem;
        line-height: 1.5;
        margin: 0 0 15px 0;
      }
      .tech-pill {
        background: #0f172a;
        color: #34d399;
        font-size: 0.8rem;
        padding: 4px 8px;
        border-radius: 4px;
        margin-right: 5px;
      }
      .proj-link {
        color: #38bdf8;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.9rem;
        margin-top: 15px;
        display: inline-block;
      }
    `;

    let finalHtml = fallbackHtml;
    let finalCss = fallbackCss;

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
          const parsed = portfolioOutputSchema.parse(JSON.parse(text));
          finalHtml = parsed.html_code;
          finalCss = parsed.css_code;
          console.log('[PortfolioWorker] Custom web layout generated successfully via Gemini.');
        }
      } catch (err: any) {
        console.error('[PortfolioWorker] AI generation failed, deploying template fallback:', err.message);
      }
    } else {
      console.log('[PortfolioWorker] No Gemini key found. Using beautiful custom CSS/HTML design template.');
    }

    // Upsert portfolio record into database
    const slug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || `user-${userId.substring(0, 5)}`;
    
    // Check if user has an existing slug, we keep their slug
    const { data: existingPort } = await supabaseAdmin
      .from('portfolios')
      .select('slug')
      .eq('user_id', userId)
      .maybeSingle();

    const finalSlug = existingPort?.slug || slug;

    const { data: portfolio, error } = await supabaseAdmin
      .from('portfolios')
      .upsert(
        {
          user_id: userId,
          slug: finalSlug,
          html_code: finalHtml,
          css_code: finalCss,
          is_published: true, // Auto publish first generation
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single();

    if (error || !portfolio) {
      console.error('[PortfolioWorker] Failed to upsert portfolio in DB:', error);
      await publishLog(userId, 'JOB_FAILED', { error: 'Failed to record generated web assets in DB.' });
      throw new Error(error?.message || 'Database insert failed');
    }

    // Publish WebSocket event back to client
    await publishLog(userId, 'PORTFOLIO_GENERATED', {
      slug: portfolio.slug,
      is_published: portfolio.is_published,
      message: 'Your personal AI portfolio website has been generated!',
    });
  },
  { connection: redisConnection, concurrency: 1 }
);
