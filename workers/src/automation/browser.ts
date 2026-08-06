import { chromium, BrowserContext, Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Safe CommonJS path resolution without import.meta
const SESSIONS_DIR = typeof __dirname !== 'undefined'
  ? path.join(__dirname, '../../storage/sessions')
  : path.join(process.cwd(), 'storage/sessions');

// Ensure session persistence directories exist
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Generate random viewport dimensions
function getRandomViewport() {
  const widths = [1280, 1366, 1440, 1536, 1600];
  const heights = [768, 800, 900, 1024];
  const width = widths[Math.floor(Math.random() * widths.length)];
  const height = heights[Math.floor(Math.random() * heights.length)];
  return { width, height };
}

// Sleep for random duration between min and max (in milliseconds)
export function sleep(min = 1500, max = 5000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Smooth scrolling script
export async function smoothScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
  await sleep(1000, 2000);
}

// Check for captcha elements or block indicators
export async function checkForCaptcha(page: Page): Promise<boolean> {
  const captchaSelectors = [
    'iframe[src*="recaptcha"]',
    'div[class*="captcha"]',
    'iframe[src*="hcaptcha"]',
    '#challenge-running',
    'text="Verify you are human"',
    'text="security check"',
  ];

  for (const selector of captchaSelectors) {
    try {
      const isVisible = await page.locator(selector).first().isVisible({ timeout: 500 });
      if (isVisible) {
        console.log(`[CAPTCHA DETECTED] Match on selector: ${selector}`);
        return true;
      }
    } catch {
      // ignore timeout/missing element errors
    }
  }
  return false;
}

interface BrowserSession {
  context: BrowserContext;
  page: Page;
  browser: any;
  statePath: string;
}

// Create a configured browser instance
export async function getBrowserSession(userId: string, platform: string): Promise<BrowserSession> {
  const statePath = path.join(SESSIONS_DIR, `state_${userId}_${platform}.json`);
  const viewport = getRandomViewport();

  // Launch playwright Chromium
  const browser = await chromium.launch({
    headless: true, // running headlessly as requested
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  let contextOptions: any = {
    viewport,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  };

  // Load session cookies/state if they exist
  if (fs.existsSync(statePath)) {
    try {
      contextOptions.storageState = statePath;
      console.log(`[Playwright] Loaded active session cookies for user: ${userId} (${platform})`);
    } catch (err) {
      console.error('Failed to load session cookies:', err);
    }
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  // Add bypass navigator.webdriver detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  return { context, page, browser, statePath };
}

// Save active session cookies/localStorage
export async function saveBrowserSession(context: BrowserContext, statePath: string): Promise<void> {
  try {
    await context.storageState({ path: statePath });
    console.log(`[Playwright] Session state saved to: ${statePath}`);
  } catch (err) {
    console.error('Failed to save browser state:', err);
  }
}

// Convert real social URL to local mock URL if simulation is active
export function getTargetUrl(url: string, platform: string): string {
  const simulate = process.env.SIMULATE_AUTOMATION === 'true';
  if (!simulate) return url;

  const port = process.env.PORT || 5000;
  if (platform === 'linkedin') {
    if (url.includes('search')) {
      const q = new URL(url).searchParams.get('keywords') || 'React';
      return `http://localhost:${port}/mock/linkedin?keywords=${encodeURIComponent(q)}`;
    }
    if (url.includes('profile')) {
      const parts = url.split('/');
      const slug = parts[parts.length - 1] || parts[parts.length - 2];
      return `http://localhost:${port}/mock/linkedin/profile/${slug}`;
    }
    return `http://localhost:${port}/mock/linkedin`;
  }

  if (platform === 'twitter') {
    return `http://localhost:${port}/mock/twitter`;
  }

  if (platform === 'upwork') {
    return `http://localhost:${port}/mock/upwork`;
  }

  return url;
}
