// =============================================================
// brand.md generator-scan — anonieme, workspace-loze variant
//
// Bewust NIET de volledige brandstyle-pipeline (die is workspace- en
// job-gebonden, met screenshots/vision): dit is de gratis-generator-
// variant met een strak kosten- en tijdsplafond — één gebonden fetch-
// pass (homepage + max 3 same-origin stylesheets, byte-gecapt) plus
// precies één AI-call voor strategie/voice-extractie. Alles wat de AI
// afleidde is per definitie `unvalidated`; alleen direct geëxtraheerde
// tokens (kleuren/fonts/naam) zijn "gezien maar onbevestigd" — in het
// draft-profiel dus óók unvalidated. Validatie hoort bij de levende
// versie, niet bij een scan (touchpoints v2, eerlijkheids-principe).
//
// Netwerk uitsluitend via safeFetch (SSRF-guard, audit 2026-06-26).
// =============================================================

import { safeFetch } from '@/lib/utils/ssrf';
import { anthropicClient } from '@/lib/ai/anthropic-client';
import type {
  DesignSystemModel,
  BrandMdExtension,
  ColorToken,
  SemanticColorRole,
} from '@/lib/export/design-system/canonical';
import { DRAFT_PAYLOAD_VERSION } from './constants';

const MAX_HTML_BYTES = 900_000;
const MAX_CSS_FILES = 3;
const MAX_CSS_BYTES = 300_000;
const MAX_TEXT_FOR_AI = 6_000;
const FETCH_TIMEOUT_MS = 15_000;

// ─── Payload (geborgd in GeneratedBrandProfile.payload) ───────────────

export interface BrandMdDraftPayload {
  version: typeof DRAFT_PAYLOAD_VERSION;
  sourceUrl: string;
  domain: string;
  name: string;
  tagline?: string;
  language: string;
  colors: string[];            // hex, in gevonden-frequentie-volgorde
  fonts: string[];             // font-family-namen
  strategy: {
    purpose?: string;
    positioning?: string;
    personality?: string;
    promise?: string;
  };
  voice: {
    description?: string;
    tonalRules: string[];
    wordsWeUse: string[];
    wordsWeAvoid: string[];
  };
  audience: Array<{ name: string; description: string }>;
  products: Array<{ name: string; description: string }>;
}

export function normalizeDomain(rawUrl: string): string {
  const u = new URL(rawUrl);
  return u.hostname.replace(/^www\./, '').toLowerCase();
}

// ─── Scan ─────────────────────────────────────────────────────────────

export async function scanWebsiteForBrandMd(rawUrl: string): Promise<BrandMdDraftPayload> {
  const url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).toString();
  const domain = normalizeDomain(url);

  const html = await fetchBounded(url, MAX_HTML_BYTES);
  const meta = extractMeta(html);
  const css = await fetchStylesheets(url, html);
  const colors = extractColors(html + '\n' + css);
  const fonts = extractFonts(html, css);
  const text = extractVisibleText(html).slice(0, MAX_TEXT_FOR_AI);

  const ai = await extractBrandSignals(meta.title ?? domain, meta.description, text);

  return {
    version: DRAFT_PAYLOAD_VERSION,
    sourceUrl: url,
    domain,
    name: ai.brandName || meta.title || domain,
    tagline: ai.tagline ?? meta.description ?? undefined,
    language: ai.language ?? 'en',
    colors,
    fonts,
    strategy: ai.strategy,
    voice: ai.voice,
    audience: ai.audience,
    products: ai.products,
  };
}

async function fetchBounded(url: string, maxBytes: number): Promise<string> {
  const res = await safeFetch(url, {
    headers: {
      'User-Agent': 'Branddock-brandmd-generator/1.0 (+https://branddock.app/brandmd)',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Site returned HTTP ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  return new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, maxBytes));
}

async function fetchStylesheets(pageUrl: string, html: string): Promise<string> {
  const origin = new URL(pageUrl).origin;
  const hrefs = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .concat(
      [...html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/gi)].map((m) => m[1]),
    );
  const sameOrigin = [...new Set(hrefs)]
    .map((href) => {
      try {
        return new URL(href, pageUrl).toString();
      } catch {
        return null;
      }
    })
    .filter((u): u is string => !!u && u.startsWith(origin))
    .slice(0, MAX_CSS_FILES);

  const chunks: string[] = [];
  for (const cssUrl of sameOrigin) {
    try {
      chunks.push(await fetchBounded(cssUrl, MAX_CSS_BYTES));
    } catch {
      // Eén kapotte stylesheet mag de scan niet laten falen.
    }
  }
  // Inline <style>-blokken tellen ook mee.
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    chunks.push(m[1]);
  }
  return chunks.join('\n');
}

function extractMeta(html: string): { title?: string; description?: string } {
  const title =
    matchOne(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ??
    matchOne(html, /<title[^>]*>([^<]+)<\/title>/i);
  const description =
    matchOne(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    matchOne(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  return {
    title: title ? decodeEntities(title.trim()).slice(0, 120) : undefined,
    description: description ? decodeEntities(description.trim()).slice(0, 200) : undefined,
  };
}

function extractColors(source: string): string[] {
  const counts = new Map<string, number>();
  for (const m of source.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    let hex = m[1].toUpperCase();
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const full = `#${hex}`;
    // Ruis eruit: puur zwart/wit domineert elke site en zegt niets over het merk.
    if (full === '#FFFFFF' || full === '#000000') continue;
    counts.set(full, (counts.get(full) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([hex]) => hex);
}

function extractFonts(html: string, css: string): string[] {
  const fonts = new Set<string>();
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?[^"']*family=([^&"']+)/gi)) {
    for (const fam of m[1].split('|')) {
      fonts.add(decodeURIComponent(fam.split(':')[0]).replace(/\+/g, ' ').trim());
    }
  }
  for (const m of css.matchAll(/font-family:\s*([^;}]+)[;}]/gi)) {
    const first = m[1].split(',')[0].replace(/["']/g, '').trim();
    if (
      first &&
      first.length < 40 &&
      !/^(inherit|initial|unset|var\(|sans-serif|serif|monospace|system-ui|-apple-system)/i.test(first)
    ) {
      fonts.add(first);
    }
  }
  return [...fonts].slice(0, 6);
}

function extractVisibleText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  ).trim();
}

// ─── AI-extractie (één call) ──────────────────────────────────────────

interface AiBrandSignals {
  brandName?: string;
  tagline?: string;
  language?: string;
  strategy: BrandMdDraftPayload['strategy'];
  voice: BrandMdDraftPayload['voice'];
  audience: BrandMdDraftPayload['audience'];
  products: BrandMdDraftPayload['products'];
}

async function extractBrandSignals(
  title: string,
  description: string | undefined,
  text: string,
): Promise<AiBrandSignals> {
  const empty: AiBrandSignals = {
    strategy: {},
    voice: { tonalRules: [], wordsWeUse: [], wordsWeAvoid: [] },
    audience: [],
    products: [],
  };
  if (!text || text.length < 100) return empty;

  const result = await anthropicClient.createChatCompletion(
    [
      {
        role: 'system',
        content:
          'You extract brand identity signals from website copy for a brand.md file. ' +
          'Only state what the text supports — never invent facts. Where the text is thin, omit the field. ' +
          'Respond with ONLY a JSON object, no markdown fences, matching: ' +
          '{"brandName": string, "tagline": string?, "language": "en"|"nl"|"de"|"fr"|"es"|"it"|"pt", ' +
          '"strategy": {"purpose": string?, "positioning": string?, "personality": string?, "promise": string?}, ' +
          '"voice": {"description": string?, "tonalRules": string[], "wordsWeUse": string[], "wordsWeAvoid": string[]}, ' +
          '"audience": [{"name": string, "description": string}], ' +
          '"products": [{"name": string, "description": string}]} ' +
          'Keep every string under 300 characters; max 5 items per array. wordsWeUse = distinctive vocabulary that appears in the copy; wordsWeAvoid may be empty.',
      },
      {
        role: 'user',
        content: `Site title: ${title}\nMeta description: ${description ?? '(none)'}\n\nVisible copy:\n${text}`,
      },
    ],
    { maxTokens: 1400, temperature: 0.2 },
  );

  try {
    const raw = result.content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(raw) as Partial<AiBrandSignals> & Record<string, unknown>;
    return {
      brandName: strOrUndefined(parsed.brandName),
      tagline: strOrUndefined(parsed.tagline),
      language: strOrUndefined(parsed.language),
      strategy: {
        purpose: strOrUndefined((parsed.strategy as Record<string, unknown> | undefined)?.purpose),
        positioning: strOrUndefined((parsed.strategy as Record<string, unknown> | undefined)?.positioning),
        personality: strOrUndefined((parsed.strategy as Record<string, unknown> | undefined)?.personality),
        promise: strOrUndefined((parsed.strategy as Record<string, unknown> | undefined)?.promise),
      },
      voice: {
        description: strOrUndefined((parsed.voice as Record<string, unknown> | undefined)?.description),
        tonalRules: strArray((parsed.voice as Record<string, unknown> | undefined)?.tonalRules),
        wordsWeUse: strArray((parsed.voice as Record<string, unknown> | undefined)?.wordsWeUse),
        wordsWeAvoid: strArray((parsed.voice as Record<string, unknown> | undefined)?.wordsWeAvoid),
      },
      audience: objArray(parsed.audience),
      products: objArray(parsed.products),
    };
  } catch {
    // AI-output onparsebaar → eerlijk mager draft i.p.v. harde fout.
    return empty;
  }
}

// ─── Payload → DesignSystemModel (hergebruik emitter + score) ─────────

export function draftPayloadToModel(payload: BrandMdDraftPayload, claimCanonicalUrl?: string): DesignSystemModel {
  const colorRoles: SemanticColorRole[] = ['primary', 'secondary', 'tertiary', 'surface', 'outline'];
  const colors: Partial<Record<SemanticColorRole, ColorToken>> = {};
  payload.colors.slice(0, colorRoles.length).forEach((hex, i) => {
    const role = colorRoles[i];
    colors[role] = { value: hex, role, source: 'scan' };
  });

  const brandMd: BrandMdExtension = {
    tagline: payload.tagline,
    language: payload.language,
    locales: [payload.language],
    voiceDescription: payload.voice.description,
    wordsWeUse: payload.voice.wordsWeUse,
    wordsWeAvoid: payload.voice.wordsWeAvoid,
    channelTones: [],
    products: payload.products.map((p) => ({
      name: p.name,
      description: p.description,
      features: [],
      benefits: [],
      useCases: [],
    })),
    guardrails: {
      do: [],
      dont: payload.voice.wordsWeAvoid.map((w) => `Avoid the word/phrase "${w}"`),
    },
    // Scan-drafts zijn per definitie volledig unvalidated — validatie hoort
    // bij de levende versie (eerlijkheids-principe touchpoints v2).
    validation: {
      strategy: { status: 'unvalidated' },
      voice: { status: 'unvalidated' },
      visual: { status: 'unvalidated' },
      audience: { status: 'unvalidated' },
      products: { status: 'unvalidated' },
    },
    provenance: {
      generatedBy: 'Branddock',
      canonicalUrl: claimCanonicalUrl,
      sourceUrl: payload.sourceUrl,
    },
  };

  return {
    meta: {
      name: payload.name,
      workspaceId: 'draft',
      workspaceSlug: payload.domain,
      generatedAt: new Date().toISOString(),
    },
    colors,
    typography: buildDraftTypography(payload.fonts),
    rounded: {},
    spacing: {},
    elevation: {},
    components: {},
    prose: {},
    extensions: {
      voice:
        payload.voice.tonalRules.length > 0
          ? {
              principles: payload.voice.tonalRules,
              writingGuidelines: [],
              doSayPhrases: [],
              dontSayPhrases: [],
            }
          : undefined,
      brandFoundation: {
        assets: [
          payload.strategy.purpose
            ? { name: 'Purpose', slug: 'purpose', category: 'PURPOSE', summary: payload.strategy.purpose }
            : null,
          payload.strategy.positioning
            ? { name: 'Positioning', slug: 'positioning', category: 'STRATEGY', summary: payload.strategy.positioning }
            : null,
          payload.strategy.personality
            ? { name: 'Personality', slug: 'personality', category: 'PERSONALITY', summary: payload.strategy.personality }
            : null,
          payload.strategy.promise
            ? { name: 'Brand Promise', slug: 'brand-promise', category: 'CORE', summary: payload.strategy.promise }
            : null,
        ].filter((a): a is NonNullable<typeof a> => a !== null),
        personas: payload.audience.map((a) => ({
          name: a.name,
          tagline: a.description,
          keyTraits: [],
          quote: null,
        })),
        competitors: [],
      },
      brandMd,
    },
  };
}

function buildDraftTypography(fonts: string[]): DesignSystemModel['typography'] {
  const typography: DesignSystemModel['typography'] = {};
  if (fonts[0]) {
    typography['headline-lg'] = {
      fontFamily: fonts[0],
      fontSize: '32px',
      fontWeight: 700,
      lineHeight: '1.2',
    };
  }
  if (fonts[1] ?? fonts[0]) {
    typography['body-md'] = {
      fontFamily: fonts[1] ?? fonts[0],
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: '1.6',
    };
  }
  return typography;
}

// ─── Kleine helpers ───────────────────────────────────────────────────

function matchOne(html: string, re: RegExp): string | undefined {
  const m = html.match(re);
  return m?.[1];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function strOrUndefined(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim().slice(0, 300) : undefined;
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.trim().slice(0, 300))
    .slice(0, 5);
}

function objArray(v: unknown): Array<{ name: string; description: string }> {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (e): e is { name: string; description: string } =>
        !!e &&
        typeof e === 'object' &&
        typeof (e as Record<string, unknown>).name === 'string' &&
        typeof (e as Record<string, unknown>).description === 'string',
    )
    .map((e) => ({ name: e.name.slice(0, 120), description: e.description.slice(0, 300) }))
    .slice(0, 5);
}
