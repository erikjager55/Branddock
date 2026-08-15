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
import { relativeLuminance } from '@/lib/landing-pages/brand-tokens';

const MAX_HTML_BYTES = 900_000;
const MAX_CSS_FILES = 3;
const MAX_CSS_BYTES = 300_000;
const MAX_TEXT_FOR_AI = 12_000;
const MAX_EXTRA_PAGES = 2;
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
  /** Verrijking 2026-08-14 (optioneel, additief): kernwaarden uit de copy */
  coreValues?: string[];
  /** Letterlijke zinnen uit de site-copy die de toon dragen */
  exampleLines?: string[];
  /** Verrijking 2026-08-15 (optioneel, additief) — vult de 0.3-secties
   *  Message Pillars en Art Direction zodat het bestand zo compleet
   *  mogelijk is. Eerlijk afgeleid: pillars uit terugkerende thema's in de
   *  copy, art direction uit observeerbare designkeuzes (kleuren/fonts). */
  messagePillars?: Array<{ pillar: string; statements: string[] }>;
  artDirection?: { keywords: string[]; statement?: string };
  /** Welke pagina's zijn meegescand (transparantie + debugging) */
  scannedPaths?: string[];
}

export function normalizeDomain(rawUrl: string): string {
  const u = new URL(rawUrl);
  return u.hostname.replace(/^www\./, '').toLowerCase();
}

// ─── Scan ─────────────────────────────────────────────────────────────

export async function scanWebsiteForBrandMd(rawUrl: string): Promise<BrandMdDraftPayload> {
  const url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).toString();
  const domain = normalizeDomain(url);

  const html = await fetchPrimaryWithRetry(url);
  const meta = extractMeta(html);
  const css = await fetchStylesheets(url, html);
  const colors = extractColors(html + '\n' + css);
  const fonts = extractFonts(html, css);

  // Verrijking: de over-ons/diensten-pagina draagt vaak de échte strategie-
  // en voice-copy — 1-2 extra same-origin-pagina's meelezen (byte-gecapt).
  const extra = await fetchKeyPages(url, html);
  const text = [extractVisibleText(html), ...extra.texts]
    .join('\n\n---\n\n')
    .slice(0, MAX_TEXT_FOR_AI);

  const ai = await extractBrandSignals(meta.title ?? domain, meta.description, text, colors, fonts);

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
    coreValues: ai.coreValues,
    exampleLines: ai.exampleLines,
    messagePillars: ai.messagePillars.length ? ai.messagePillars : undefined,
    artDirection: ai.artDirection,
    scannedPaths: ['/', ...extra.paths],
  };
}

/** Kandidaat-paden waar merkstrategie en voice meestal wonen. */
const KEY_PAGE_PATTERNS =
  /\/(about|over-ons|over|wie-zijn-wij|missie|diensten|services|wat-we-doen|producten|products|aanpak|approach)(\/|$|\?|#)/i;

async function fetchKeyPages(
  pageUrl: string,
  html: string,
): Promise<{ texts: string[]; paths: string[] }> {
  const origin = new URL(pageUrl).origin;
  const candidates = [...html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)]
    .map((m) => {
      try {
        return new URL(m[1], pageUrl);
      } catch {
        return null;
      }
    })
    .filter((u): u is URL => !!u && u.origin === origin && KEY_PAGE_PATTERNS.test(u.pathname));
  const unique: URL[] = [];
  for (const u of candidates) {
    if (!unique.some((x) => x.pathname === u.pathname)) unique.push(u);
    if (unique.length >= MAX_EXTRA_PAGES) break;
  }
  const texts: string[] = [];
  const paths: string[] = [];
  for (const u of unique) {
    try {
      const pageHtml = await fetchBounded(u.toString(), MAX_HTML_BYTES);
      const text = extractVisibleText(pageHtml);
      if (text.length > 200) {
        texts.push(text.slice(0, Math.floor(MAX_TEXT_FOR_AI / 2)));
        paths.push(u.pathname);
      }
    } catch {
      // Eén onbereikbare subpagina mag de scan niet laten falen.
    }
  }
  return { texts, paths };
}

/**
 * De hoofdpagina één keer opnieuw proberen bij een timeout of netwerkfout.
 *
 * Subpagina's falen al fail-soft, maar een timeout op de hóófdpagina liet de
 * hele scan klappen — en daarmee de lead. Gezien tijdens de benchmark van
 * 2026-08-15: zwarthout.com timede twee van de drie keer uit op de 15s-grens
 * en lukte de derde keer wel. Een trage-maar-bereikbare site kost je zo een
 * bezoeker die verder niets verkeerd deed.
 *
 * Bewust één retry, geen backoff-ladder: de generator draait synchroon met
 * een wachtende bezoeker voor zich, dus doorlooptijd is hier een kost.
 * Een 4xx (bewuste weigering) wordt niet herhaald — alleen timeouts en
 * netwerkfouten.
 */
async function fetchPrimaryWithRetry(url: string): Promise<string> {
  try {
    return await fetchBounded(url, MAX_HTML_BYTES);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isHttpRefusal = /HTTP [45]\d\d/.test(message);
    if (isHttpRefusal) throw err;
    console.warn(`[brandmd-scan] eerste poging op ${url} mislukt (${message}) — één retry`);
    return fetchBounded(url, MAX_HTML_BYTES);
  }
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
  // Incrementeel lezen en afkappen op maxBytes — arrayBuffer() zou een
  // gigantische/streamende body eerst volledig in serverless-geheugen trekken.
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const merged = new Uint8Array(Math.min(received, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const room = merged.length - offset;
    if (room <= 0) break;
    merged.set(room >= chunk.byteLength ? chunk : chunk.subarray(0, room), offset);
    offset += Math.min(chunk.byteLength, room);
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
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
  coreValues: string[];
  exampleLines: string[];
  messagePillars: NonNullable<BrandMdDraftPayload['messagePillars']>;
  artDirection?: BrandMdDraftPayload['artDirection'];
}

async function extractBrandSignals(
  title: string,
  description: string | undefined,
  text: string,
  colors: string[],
  fonts: string[],
): Promise<AiBrandSignals> {
  const empty: AiBrandSignals = {
    strategy: {},
    voice: { tonalRules: [], wordsWeUse: [], wordsWeAvoid: [] },
    audience: [],
    products: [],
    coreValues: [],
    exampleLines: [],
    messagePillars: [],
  };
  if (!text || text.length < 100) return empty;

  let result: { content: string };
  try {
    result = await callExtractionModel(title, description, text, colors, fonts);
  } catch (err) {
    // Fail-soft: AI-uitval (outage, timeout, max_tokens-throw) mag de scan
    // niet doden — kleuren/fonts/meta zijn al binnen; eerlijk mager draft.
    console.warn('[brandmd/scan] AI extraction failed (degrading to thin draft)', {
      error: err instanceof Error ? err.message : String(err),
    });
    return empty;
  }

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
      coreValues: strArray(parsed.coreValues),
      exampleLines: strArray(parsed.exampleLines).slice(0, 5),
      messagePillars: pillarArray(parsed.messagePillars),
      artDirection: parseArtDirection(parsed.artDirection),
    };
  } catch {
    // AI-output onparsebaar → eerlijk mager draft i.p.v. harde fout.
    return empty;
  }
}

function pillarArray(v: unknown): Array<{ pillar: string; statements: string[] }> {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (e): e is { pillar: string; statements?: unknown } =>
        !!e && typeof e === 'object' && typeof (e as Record<string, unknown>).pillar === 'string',
    )
    .map((e) => ({ pillar: e.pillar, statements: strArray(e.statements).slice(0, 2) }))
    .slice(0, 6);
}

function parseArtDirection(v: unknown): BrandMdDraftPayload['artDirection'] {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const keywords = strArray(o.keywords).slice(0, 8);
  const statement = strOrUndefined(o.statement);
  if (!keywords.length && !statement) return undefined;
  return { keywords, statement };
}

async function callExtractionModel(
  title: string,
  description: string | undefined,
  text: string,
  colors: string[],
  fonts: string[],
): Promise<{ content: string }> {
  return anthropicClient.createChatCompletion(
    [
      {
        role: 'system',
        content:
          'You extract brand identity signals from website copy for a BRAND.md file. ' +
          'Only state what the material supports — never invent facts. Where the material is thin, omit the field. ' +
          'Two kinds of fields: EXTRACTED fields quote or paraphrase what the copy literally says; ' +
          'INFERRED fields (strategy.personality, messagePillars, artDirection) may be derived from how the site ' +
          'reads and looks — tone, recurring themes, the observed colors and typefaces — but must stay grounded ' +
          'in those observations, never in category cliches. ' +
          'Respond with ONLY a JSON object, no markdown fences, matching: ' +
          '{"brandName": string, "tagline": string?, "language": "en"|"nl"|"de"|"fr"|"es"|"it"|"pt", ' +
          '"strategy": {"purpose": string?, "positioning": string?, "personality": string?, "promise": string?}, ' +
          '"voice": {"description": string?, "tonalRules": string[], "wordsWeUse": string[], "wordsWeAvoid": string[]}, ' +
          '"audience": [{"name": string, "description": string}], ' +
          '"products": [{"name": string, "description": string}], ' +
          '"coreValues": string[], ' +
          '"exampleLines": string[], ' +
          '"messagePillars": [{"pillar": string, "statements": string[]}], ' +
          '"artDirection": {"keywords": string[], "statement": string}?} ' +
          'Keep every string under 300 characters; max 5 items per array (max 8 for wordsWeUse, max 6 for messagePillars). ' +
          'wordsWeUse = distinctive vocabulary that appears in the copy; wordsWeAvoid may be empty. ' +
          'coreValues = the values the brand explicitly claims or clearly lives in the copy. ' +
          'exampleLines = 3-5 VERBATIM sentences quoted from the copy that best carry the brand voice — copy them exactly, do not rewrite. ' +
          'strategy.personality = dominant archetype plus 3-5 attribute words, derived from the tone even when the copy never names them (e.g. "The Calm Expert — precise, warm, unhurried"); omit only if the copy is too thin to read a tone at all. ' +
          'strategy.promise = the commitment the brand makes to customers, in its own words where possible. ' +
          'messagePillars = the 3-6 recurring themes the copy keeps returning to, one short pillar name each, with 1-2 key statements per pillar taken from or closely paraphrasing the copy. ' +
          'artDirection = 4-6 design keywords plus a 1-2 sentence direction statement, derived from the OBSERVED design signals provided (colors, typefaces) combined with how the copy presents itself; omit if the signals are too thin.',
      },
      {
        role: 'user',
        content:
          `Site title: ${title}\nMeta description: ${description ?? '(none)'}\n` +
          `Observed brand colors (CSS, by frequency): ${colors.length ? colors.join(', ') : '(none found)'}\n` +
          `Observed typefaces: ${fonts.length ? fonts.join(', ') : '(none found)'}\n\n` +
          `Visible copy:\n${text}`,
      },
    ],
    { maxTokens: 3000, temperature: 0.2 },
  );
}

// ─── Payload → DesignSystemModel (hergebruik emitter + score) ─────────

/**
 * Leesbare tekstkleur óp een achtergrondkleur (WCAG-drempel 0.179 op relatieve
 * luminantie). Hergebruikt `relativeLuminance` uit brand-tokens zodat er maar
 * één definitie van luminantie in de codebase bestaat.
 */
function readableTextOn(hex: string): string {
  return relativeLuminance(hex) > 0.179 ? '#111827' : '#FFFFFF';
}

export function draftPayloadToModel(payload: BrandMdDraftPayload, claimCanonicalUrl?: string): DesignSystemModel {
  const colorRoles: SemanticColorRole[] = ['primary', 'secondary', 'tertiary', 'surface', 'outline'];
  const colors: Partial<Record<SemanticColorRole, ColorToken>> = {};
  payload.colors.slice(0, colorRoles.length).forEach((hex, i) => {
    const role = colorRoles[i];
    colors[role] = { value: hex, role, source: 'scan' };
  });

  // `on-primary` is de tekstkleur die ópaan primary ligt en is puur af te
  // leiden — hij stond alleen niet in de rollenlijst, waardoor de paar-check
  // in `scoreConsistency` bij ELKE scan faalde en iedereen dezelfde 40 punten
  // verloor (meting 2026-08-15: zes uiteenlopende sites scoorden allemaal 70).
  if (colors.primary) {
    colors['on-primary'] = {
      value: readableTextOn(colors.primary.value),
      role: 'on-primary',
      source: 'scan',
    };
  }

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
    messagePillars: payload.messagePillars,
    artDirection: payload.artDirection,
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
        payload.voice.tonalRules.length > 0 || (payload.exampleLines?.length ?? 0) > 0
          ? {
              principles: payload.voice.tonalRules,
              writingGuidelines: [],
              doSayPhrases: payload.exampleLines ?? [],
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
          payload.coreValues?.length
            ? { name: 'Core Values', slug: 'core-values', category: 'CULTURE', summary: payload.coreValues.join(' · ') }
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
