// ============================================================
// External-content ingest helpers — Δ-1 sub-cluster B
//
// Vier source-types worden ondersteund door de review-route. v1 implementeert
// paste + url; file (PDF/DOCX) volgt in B-2 sub-cluster.
//
//   paste → content-string als-is, lichte whitespace-normalisatie
//   url   → native fetch + html-strip (geen externe library — text-only ingest)
//   file  → niet in v1 (placeholder; B-2 add unpdf voor PDF + mammoth voor DOCX)
//
// Char-cap 50_000 op output zodat downstream F-VAL latency-budget bewaakt blijft.
// ============================================================

const INGEST_CHAR_LIMIT = 50_000;
const URL_FETCH_TIMEOUT_MS = 10_000;
const URL_USER_AGENT = 'Branddock-ContentReviewBot/1.0';

export interface IngestResult {
  text: string;
  /** Bytes consumed (post-extraction; informational for diagnostics). */
  textLength: number;
  /** True wanneer de output truncated is op INGEST_CHAR_LIMIT. */
  truncated: boolean;
}

export class IngestError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'EMPTY'
      | 'FETCH_FAILED'
      | 'TIMEOUT'
      | 'PAYWALL_OR_EMPTY'
      | 'NOT_SUPPORTED',
  ) {
    super(message);
    this.name = 'IngestError';
  }
}

/** Ingest paste-in content — light whitespace-normalisatie + char-cap. */
export function ingestPaste(content: string): IngestResult {
  const normalised = content.replace(/\r\n/g, '\n').trim();
  if (!normalised) {
    throw new IngestError('Paste-content is leeg', 'EMPTY');
  }
  return capLength(normalised);
}

/**
 * Ingest URL via native fetch + html-strip. Gebruikt timeout via AbortController
 * om hangende requests te voorkomen. Geen JS-rendering — content moet in raw
 * HTML aanwezig zijn. SPA's zonder SSR returneren minimaal text.
 */
export async function ingestUrl(url: string): Promise<IngestResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': URL_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new IngestError(`URL-fetch timeout na ${URL_FETCH_TIMEOUT_MS}ms`, 'TIMEOUT');
    }
    throw new IngestError(`URL-fetch faalde: ${(err as Error).message}`, 'FETCH_FAILED');
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new IngestError(`URL retourneerde ${response.status}`, 'FETCH_FAILED');
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isHtml = contentType.includes('html');
  const isPlain = contentType.includes('text/plain');
  if (!isHtml && !isPlain) {
    throw new IngestError(
      `URL content-type "${contentType}" niet ondersteund (alleen HTML/text)`,
      'NOT_SUPPORTED',
    );
  }

  const html = await response.text();
  const text = isHtml ? stripHtml(html) : html;

  if (!text.trim()) {
    throw new IngestError(
      'URL retourneerde geen leesbare tekst (mogelijk paywall, JS-rendered SPA, of empty page)',
      'PAYWALL_OR_EMPTY',
    );
  }

  return capLength(text);
}

/**
 * File-ingest placeholder. v1 retourneert NOT_SUPPORTED — sub-cluster B-2
 * voegt unpdf (PDF) + mammoth (DOCX) toe.
 */
export function ingestFile(_fileId: string): never {
  throw new IngestError(
    'File-upload (.docx / .pdf) volgt in Δ-1 sub-cluster B-2',
    'NOT_SUPPORTED',
  );
}

// ─── Helpers ─────────────────────────────────────────

/** Strip HTML tags + collapse whitespace. Geen library — eenvoudige regex-pas. */
function stripHtml(html: string): string {
  return html
    // Remove script + style blocks (incl. content)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    // Replace common block-tags with newlines (preserve paragraphs)
    .replace(/<\/?(p|div|h[1-6]|li|br|tr|td|th)\b[^>]*>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, ' ')
    // HTML entities (basic set; full decode is overkill voor review-pad)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function capLength(text: string): IngestResult {
  if (text.length <= INGEST_CHAR_LIMIT) {
    return { text, textLength: text.length, truncated: false };
  }
  return {
    text: text.slice(0, INGEST_CHAR_LIMIT) + '\n\n[truncated for review-budget]',
    textLength: text.length,
    truncated: true,
  };
}
