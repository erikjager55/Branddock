// =============================================================================
// POST /api/briefing-sources/parse-url
//
// Fetches a public web page and extracts a clean plain-text version of its
// main content, plus the page title. Used by the Setup step's
// BriefingSourcesField to attach external reference materials to the
// campaign briefing — these are then injected into AI prompts as
// additional context.
//
// Body: { url: string }
// Response: { title: string | null; extractedText: string }
//
// Reuses the SSRF-safe fetch + cheerio parsing from products/url-scraper.ts.
// =============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { fetchAndParse } from '@/lib/products/url-scraper';
import { checkGenericRateLimit } from '@/lib/ai/rate-limiter';

export const maxDuration = 30;

// Each call makes an outbound fetch — cap per workspace (DoS / SSRF-probe).
const PARSE_MAX_PER_WINDOW = 20;
const PARSE_WINDOW_MS = 60_000;

const bodySchema = z.object({
  url: z.string().url().max(2048),
});

/** Cap extracted text to keep prompts manageable. */
const MAX_EXTRACTED_CHARS = 12_000;

export async function POST(request: Request) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = await checkGenericRateLimit(`briefing-parse:${workspaceId}`, PARSE_MAX_PER_WINDOW, PARSE_WINDOW_MS);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000)) } },
      );
    }

    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid URL', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { url } = parsed.data;

    let result;
    try {
      result = await fetchAndParse(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch URL';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { $, title } = result;

    // Strip noise
    $('script, style, noscript, nav, header, footer, aside, iframe, svg, form').remove();

    // Prefer the main content area when available
    const main =
      $('article').first().text() ||
      $('main').first().text() ||
      $('[role="main"]').first().text() ||
      $('body').text();

    // Collapse whitespace
    const cleanText = main
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    const extractedText =
      cleanText.length > MAX_EXTRACTED_CHARS
        ? cleanText.slice(0, MAX_EXTRACTED_CHARS) + '\n\n[…truncated]'
        : cleanText;

    return NextResponse.json({
      title: title ?? null,
      extractedText,
    });
  } catch (error) {
    console.error('[POST /api/briefing-sources/parse-url]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
