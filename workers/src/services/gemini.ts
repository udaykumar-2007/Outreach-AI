import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== 'your-google-gemini-api-key') {
  try {
    ai = new GoogleGenAI({ apiKey });
    console.log('Google Gen AI SDK initialized successfully with model gemini-2.5-flash.');
  } catch (err) {
    console.error('Failed to initialize Google Gen AI SDK:', err);
  }
} else {
  console.warn('Warning: GEMINI_API_KEY is not set. Using local simulation responses for AI operations.');
}

// Zod schemas for validation
export const leadScoringSchema = z.object({
  is_match: z.boolean(),
  score: z.number().min(0).max(100),
  reason: z.string(),
});

export const messageDraftSchema = z.object({
  draft_message: z.string(),
});

export const sentimentSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
});

export type LeadScoringResult = z.infer<typeof leadScoringSchema>;
export type MessageDraftResult = z.infer<typeof messageDraftSchema>;
export type SentimentResult = z.infer<typeof sentimentSchema>;

// Helper to run gemini-2.5-flash with structured JSON output
async function generateStructuredJSON<T>(prompt: string, schema: z.ZodSchema<T>, fallback: T): Promise<T> {
  if (!ai) {
    // Return mock fallback in simulation/local-dev mode
    console.log('[AI Simulation] Gemini key not provided, utilizing simulated response.');
    return fallback;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const json = JSON.parse(text);
    return schema.parse(json);
  } catch (err: any) {
    console.error('Gemini API call failed, using fallback:', err.message);
    return fallback;
  }
}

// 1. Score Lead
export async function scoreLead(
  profileText: string,
  targetRole: string,
  targetKeywords: string[]
): Promise<LeadScoringResult> {
  const keywordsStr = targetKeywords.join(', ');
  const prompt = `
    You are an expert AI recruiter and lead generation expert.
    Analyze the following scraped social profile/job-post text against the campaign criteria:
    Target Role: "${targetRole}"
    Target Keywords/Topics: [${keywordsStr}]

    Scraped text:
    """
    ${profileText}
    """

    Rate how well this profile/post matches the campaign criteria.
    Return a JSON object conforming exactly to this JSON schema:
    {
      "is_match": boolean,
      "score": number (integer 0 to 100),
      "reason": "A 1-2 sentence explanation of the match score."
    }
  `;

  // Compute a smart mock score based on keyword match for fallback
  const lowercaseText = profileText.toLowerCase();
  let matches = 0;
  targetKeywords.forEach(kw => {
    if (lowercaseText.includes(kw.toLowerCase())) matches++;
  });
  const mockScore = Math.min(30 + matches * 20, 100);
  const mockIsMatch = mockScore >= 60;
  const mockFallback: LeadScoringResult = {
    is_match: mockIsMatch,
    score: mockScore,
    reason: `Simulated Match: Found ${matches} keywords in the scraped profile.`,
  };

  return generateStructuredJSON(prompt, leadScoringSchema, mockFallback);
}

// 2. Draft Outreach Message
export async function draftOutreachMessage(
  leadName: string,
  leadHeadline: string,
  leadBio: string,
  platform: string,
  persona: 'student' | 'freelancer',
  skills: string[],
  workSamples: any[]
): Promise<MessageDraftResult> {
  const limit = platform.toLowerCase() === 'linkedin' ? 280 : platform.toLowerCase() === 'twitter' ? 250 : 800;
  
  const prompt = `
    You are an expert networking agent assisting a ${persona}.
    Draft a personalized connection/outreach pitch to a lead.
    
    Lead details:
    - Name: ${leadName}
    - Title/Headline: ${leadHeadline}
    - Bio/Context: ${leadBio}
    - Platform: ${platform}

    Sender (${persona}) details:
    - Core Skills: ${skills.join(', ')}
    - Projects/Work Samples: ${JSON.stringify(workSamples.map(w => w.title + ': ' + w.description))}

    Constraints:
    - The output must be a short outreach message.
    - Strict maximum length of ${limit} characters. Keep it extremely brief.
    - Write in a natural, warm, human-like voice. Avoid generic buzzwords ("synergy", "deep dive").
    - If student, emphasize learning, sharing work, or networking.
    - If freelancer, focus on solving problems or helping their company, but remain low-pressure.

    Return a JSON object conforming exactly to this JSON schema:
    {
      "draft_message": "The drafted message content"
    }
  `;

  // Fallback draft based on persona
  let fallbackMessage = '';
  if (persona === 'student') {
    fallbackMessage = `Hi ${leadName}, saw your background in ${leadHeadline}. As a student skilled in ${skills.slice(0,2).join(', ')}, I love what you share. Would love to connect and follow your work!`;
  } else {
    fallbackMessage = `Hi ${leadName}, noticed you're looking for solutions related to ${leadHeadline}. I specialize in ${skills.slice(0,2).join(', ')} and have helped companies with similar goals. Let me know if you'd like to chat!`;
  }
  const mockFallback: MessageDraftResult = {
    draft_message: fallbackMessage.slice(0, limit),
  };

  return generateStructuredJSON(prompt, messageDraftSchema, mockFallback);
}

// 3. Draft Busy Buffer Apology
export async function draftBusyBufferMessage(leadName: string, leadContent: string): Promise<MessageDraftResult> {
  const prompt = `
    You are a busy freelancer. A potential client named ${leadName} reached out saying:
    "${leadContent}"
    
    Draft a polite, short reply apologizing for the delay because you are wrapping up an intense client sprint.
    Politely ask if they'd be open to hopping on a brief introductory call in 2 days.
    Keep the tone highly professional, friendly, and brief (~2-3 sentences).

    Return a JSON object conforming exactly to this JSON schema:
    {
      "draft_message": "The busy buffer response"
    }
  `;

  const mockFallback: MessageDraftResult = {
    draft_message: `Hi ${leadName}, thank you for reaching out! I'm currently wrapping up a major project deliverable for a client. I would love to discuss this with you—would you be free to jump on a brief call in about two days once my schedule clears up?`,
  };

  return generateStructuredJSON(prompt, messageDraftSchema, mockFallback);
}

// 4. Classify Reply Sentiment
export async function classifySentiment(receivedMessage: string): Promise<SentimentResult> {
  const prompt = `
    Analyze the sentiment of this received message from a networking pitch.
    Message: "${receivedMessage}"

    Determine the classification:
    - 'positive': They show clear interest, ask for prices, request a resume/portfolio, or ask to book a call/meeting.
    - 'negative': They decline, state they aren't hiring, ask to be removed, express anger, or say "no thanks".
    - 'neutral': Generic acknowledgment, questions without clear negative/positive intent, or auto-reply.

    Return a JSON object conforming exactly to this JSON schema:
    {
      "sentiment": "positive" | "negative" | "neutral"
    }
  `;

  // Basic regex rule for fallback
  const text = receivedMessage.toLowerCase();
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (text.includes('yes') || text.includes('call') || text.includes('schedule') || text.includes('portfolio') || text.includes('resume') || text.includes('interest') || text.includes('sure')) {
    sentiment = 'positive';
  } else if (text.includes('no') || text.includes('not interested') || text.includes('stop') || text.includes('unsubscribe') || text.includes('busy')) {
    sentiment = 'negative';
  }
  const mockFallback: SentimentResult = { sentiment };

  return generateStructuredJSON(prompt, sentimentSchema, mockFallback);
}
