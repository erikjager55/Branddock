// =============================================================
// Gemini URL Fallback — Extract page content via Gemini when direct scraping is blocked (403, etc.)
// Uses Gemini's Google Search grounding to access and summarize the target URL.
// =============================================================

import { GoogleGenAI } from '@google/genai';
import type { ScrapedProductData } from './url-scraper';

let cachedClient: InstanceType<typeof GoogleGenAI> | undefined;

function getGeminiClient(): InstanceType<typeof GoogleGenAI> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set — cannot use Gemini URL fallback');
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

/**
 * Fallback scraper that uses Gemini with Google Search grounding to extract
 * content from a URL that blocks direct HTTP requests (403, Cloudflare, etc.).
 * Returns data in the same shape as scrapeProductUrl() for seamless substitution.
 */
export async function scrapeUrlViaGemini(url: string): Promise<ScrapedProductData> {
  const client = getGeminiClient();
  const hostname = new URL(url).hostname;

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user' as const,
        parts: [
          {
            text: `Visit and analyze this specific URL: ${url}

Extract ALL of the following information from the page at ${hostname}:

1. **Page title** (the HTML <title> or main heading)
2. **Meta description** (the page's meta description or og:description)
3. **Full page content** — Extract as much text content as possible from the page:
   - Company/product description
   - Features, services, or offerings listed
   - Pricing information if visible
   - About/team information
   - Any taglines, value propositions, or messaging
   - Contact details, locations
   - Social media links

Return your response in this exact format:
TITLE: [the page title]
DESCRIPTION: [the meta description]
CONTENT:
[all extracted text content, preserving the key information]`,
          },
        ],
      },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.1,
      maxOutputTokens: 8000,
      abortSignal: AbortSignal.timeout(30_000),
    },
  });

  const responseText = response.text?.trim() ?? '';

  if (!responseText || responseText.length < 50) {
    throw new Error('Gemini could not retrieve content from the URL');
  }

  // Parse the structured response
  const titleMatch = responseText.match(/^TITLE:\s*(.+)$/m);
  const descMatch = responseText.match(/^DESCRIPTION:\s*(.+)$/m);
  const contentMatch = responseText.match(/CONTENT:\n([\s\S]+)/);

  const title = titleMatch?.[1]?.trim() || hostname;
  const description = descMatch?.[1]?.trim() || null;
  const bodyText = (contentMatch?.[1]?.trim() || responseText).slice(0, 8000);

  return {
    url,
    title,
    description,
    bodyText,
    images: [], // Gemini fallback cannot extract images
  };
}
