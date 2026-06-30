import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth-server';
import { scrapeProductUrl } from '@/lib/products/url-scraper';
import { checkGenericRateLimit } from '@/lib/ai/rate-limiter';

const bodySchema = z.object({
  url: z.string().url().max(2048),
});

// Each call makes an outbound scrape fetch — cap per user (DoS / SSRF-probe).
const SCRAPE_MAX_PER_WINDOW = 20;
const SCRAPE_WINDOW_MS = 60_000;

/**
 * POST /api/claw/scrape — Scrape a URL and return extracted text.
 * Uses the existing url-scraper with SSRF protection.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const rate = await checkGenericRateLimit(`claw-scrape:${session.user.id}`, SCRAPE_MAX_PER_WINDOW, SCRAPE_WINDOW_MS);
  if (!rate.allowed) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000)) } },
    );
  }

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const { url } = parsed.data;

  try {
    const scraped = await scrapeProductUrl(url);

    // Build readable text from scraped data
    const parts: string[] = [];
    if (scraped.title) parts.push(`Title: ${scraped.title}`);
    if (scraped.description) parts.push(`Description: ${scraped.description}`);
    if (scraped.bodyText) parts.push(scraped.bodyText);

    const content = parts.join('\n\n').slice(0, 20000);

    return Response.json({
      url,
      title: scraped.title,
      content,
      imageCount: scraped.images.length,
    });
  } catch (err) {
    console.error('Claw URL scrape error:', err);
    return Response.json({ error: 'Failed to scrape URL' }, { status: 500 });
  }
}
