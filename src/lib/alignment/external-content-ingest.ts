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

import { lookup } from 'dns/promises';
import { isIP } from 'net';

const INGEST_CHAR_LIMIT = 50_000;
const URL_FETCH_TIMEOUT_MS = 10_000;
const URL_FETCH_BYTE_CAP = 5 * 1024 * 1024; // 5 MB hard ceiling op response-body
const URL_MAX_REDIRECTS = 3;
const URL_USER_AGENT = 'Branddock-ContentReviewBot/1.0';
const URL_ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

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
      | 'NOT_SUPPORTED'
      | 'BLOCKED_HOST'
      | 'INVALID_URL'
      | 'PAYLOAD_TOO_LARGE',
    options?: { cause?: unknown },
  ) {
    super(message, options as ErrorOptions);
    this.name = 'IngestError';
    // Stabiliseer prototype-chain over module-boundaries / hot-reload.
    Object.setPrototypeOf(this, IngestError.prototype);
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
 *
 * SSRF-hardening:
 *   - Alleen `http:` / `https:` schemes
 *   - DNS-resolve elke hop, blokkeer private/loopback/link-local IPs
 *   - Manual redirect-follow (max 3 hops) zodat redirect-targets opnieuw gevalideerd worden
 *   - Byte-cap op response-body via streaming reader (defense tegen OOM)
 */
export async function ingestUrl(url: string): Promise<IngestResult> {
  let currentUrl = url;
  for (let hop = 0; hop <= URL_MAX_REDIRECTS; hop++) {
    await assertSafeUrl(currentUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        headers: {
          'User-Agent': URL_USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
        },
        signal: controller.signal,
        redirect: 'manual',
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new IngestError(`URL-fetch timeout na ${URL_FETCH_TIMEOUT_MS}ms`, 'TIMEOUT', { cause: err });
      }
      throw new IngestError(
        `URL-fetch faalde: ${(err as Error).message}`,
        'FETCH_FAILED',
        { cause: err instanceof Error ? err : undefined },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // Sommige Node-runtimes returnen `type: 'opaqueredirect'` (status 0) bij
    // `redirect: 'manual'` i.p.v. raw 3xx — guard zodat we niet stilletjes
    // doorvallen naar een non-OK pad zonder Location-handling.
    if (response.type === 'opaqueredirect') {
      throw new IngestError(
        'URL gaf opaque-redirect (Location-header niet leesbaar in deze runtime)',
        'FETCH_FAILED',
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new IngestError(`URL gaf ${response.status} zonder Location-header`, 'FETCH_FAILED');
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
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

    const declaredLength = Number(response.headers.get('content-length') ?? '0');
    if (declaredLength > URL_FETCH_BYTE_CAP) {
      throw new IngestError(
        `URL response te groot (Content-Length ${declaredLength} > ${URL_FETCH_BYTE_CAP} bytes)`,
        'PAYLOAD_TOO_LARGE',
      );
    }

    const html = await readBodyWithCap(response, URL_FETCH_BYTE_CAP);
    const text = isHtml ? stripHtml(html) : html;

    if (!text.trim()) {
      throw new IngestError(
        'URL retourneerde geen leesbare tekst (mogelijk paywall, JS-rendered SPA, of empty page)',
        'PAYWALL_OR_EMPTY',
      );
    }

    return capLength(text);
  }

  throw new IngestError(
    `URL volgde meer dan ${URL_MAX_REDIRECTS} redirects`,
    'FETCH_FAILED',
  );
}

/**
 * File-ingest placeholder. v1 retourneert NOT_SUPPORTED — sub-cluster B-2
 * voegt unpdf (PDF) + mammoth (DOCX) toe.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ingestFile(fileId: string): never {
  throw new IngestError(
    'File-upload (.docx / .pdf) volgt in Δ-1 sub-cluster B-2',
    'NOT_SUPPORTED',
  );
}

// ─── Helpers ─────────────────────────────────────────

/**
 * Reject non-HTTP(S) schemes en private/loopback/link-local hosts om SSRF te
 * voorkomen. Wordt opnieuw aangeroepen voor elke redirect-hop.
 */
async function assertSafeUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new IngestError(`Invalid URL: ${rawUrl}`, 'INVALID_URL');
  }
  if (!URL_ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new IngestError(
      `Scheme "${parsed.protocol}" niet toegestaan (alleen http/https)`,
      'INVALID_URL',
    );
  }
  const host = parsed.hostname;
  if (!host) {
    throw new IngestError('URL mist hostname', 'INVALID_URL');
  }
  // Direct-IP literal: valideer zonder DNS-lookup.
  if (isIP(host)) {
    if (isPrivateIp(host)) {
      throw new IngestError(`Host ${host} is privé/loopback/link-local`, 'BLOCKED_HOST');
    }
    return;
  }
  // Block obvious local hostnames vóór de DNS-call.
  const lower = host.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) {
    throw new IngestError(`Host ${host} is local`, 'BLOCKED_HOST');
  }
  // DNS-resolve en check alle returned A/AAAA records.
  let resolved: { address: string; family: number }[];
  try {
    resolved = await lookup(host, { all: true });
  } catch (err) {
    throw new IngestError(`DNS lookup faalde voor ${host}: ${(err as Error).message}`, 'FETCH_FAILED');
  }
  for (const record of resolved) {
    if (isPrivateIp(record.address)) {
      throw new IngestError(
        `Host ${host} resolved naar privé/loopback/link-local IP ${record.address}`,
        'BLOCKED_HOST',
      );
    }
  }
}

/** RFC1918 + loopback + link-local + cloud-metadata + IPv6-private. */
function isPrivateIp(ip: string): boolean {
  // IPv4
  if (isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + AWS IMDS 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  // IPv6
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::' || lower === '::1') return true;
    if (lower.startsWith('fe80:')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local
    if (lower.startsWith('::ffff:')) {
      // IPv4-mapped — recurse op embedded v4.
      const v4 = lower.split(':').pop();
      if (v4 && isIP(v4) === 4) return isPrivateIp(v4);
    }
    return false;
  }
  return false;
}

/** Stream response body en abort wanneer cumulatieve byte-count > cap. */
async function readBodyWithCap(response: Response, byteCap: number): Promise<string> {
  if (!response.body) return await response.text();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > byteCap) {
        await reader.cancel();
        throw new IngestError(
          `URL response overschreed byte-cap (${byteCap} bytes)`,
          'PAYLOAD_TOO_LARGE',
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
}

/**
 * Strip HTML tags + collapse whitespace. Twee-pas indexOf-scan voor script/
 * style blokken (geen backtracking-prone nested-quantifier regex).
 */
function stripHtml(html: string): string {
  let buf = stripBlock(html, '<script', '</script>');
  buf = stripBlock(buf, '<style', '</style>');
  return buf
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

/** Lineair indexOf-scan om hele <openTag...>...closeTag blokken te verwijderen. */
function stripBlock(input: string, openPrefix: string, closeTag: string): string {
  const lower = input.toLowerCase();
  const lowerOpen = openPrefix.toLowerCase();
  const lowerClose = closeTag.toLowerCase();
  let result = '';
  let cursor = 0;
  while (cursor < input.length) {
    const openIdx = lower.indexOf(lowerOpen, cursor);
    if (openIdx === -1) {
      result += input.slice(cursor);
      break;
    }
    result += input.slice(cursor, openIdx) + ' ';
    const closeIdx = lower.indexOf(lowerClose, openIdx + lowerOpen.length);
    if (closeIdx === -1) {
      // Geen matching close-tag → drop rest van input om geen onveilige content te lekken.
      break;
    }
    cursor = closeIdx + lowerClose.length;
  }
  return result;
}

function capLength(text: string): IngestResult {
  if (text.length <= INGEST_CHAR_LIMIT) {
    return { text, textLength: text.length, truncated: false };
  }
  return {
    text: text.slice(0, INGEST_CHAR_LIMIT) + '\n\n[truncated for review]',
    textLength: text.length,
    truncated: true,
  };
}
