import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth-server';
import { scrapeProductUrl } from '@/lib/products/url-scraper';

const bodySchema = z.object({
  url: z.string().url().max(2048),
});

/**
 * POST /api/claw/scrape — Scrape a URL and return extracted text.
 * Uses the existing url-scraper with SSRF protection.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

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
