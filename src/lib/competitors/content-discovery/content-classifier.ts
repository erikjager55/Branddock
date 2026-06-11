// =============================================================
// Content-classifier — bepaalt ContentFormat per URL + tagt thema's.
//
// Hybride: deterministische URL-path-regex eerst (gratis, dekt de bulk),
// gebatchte Claude Haiku 4.5-fallback alleen voor ambigue URLs. De
// format-rules + enum-lijst komen uit de A3-probe (100% accuracy op 25
// hand-gelabelde URLs). Theme-tagger = 1 gebatchte Haiku-call.
//
// Beide AI-calls falen zacht → lege Map (URL valt dan terug / krijgt
// geen thema's), nooit een throw — de orchestrator mag nooit breken.
// =============================================================
import { ContentFormat } from "@prisma/client";
import {
  createStructuredCompletion,
  type AICallTracking,
} from "@/lib/ai/exploration/ai-caller";
import { fenceUntrustedContent } from "@/lib/ai/prompts/product-analysis";

const MODEL = "claude-haiku-4-5-20251001";
const TEMPERATURE = 0.3;
const TIMEOUT_MS = 5000;

const VALID_FORMATS = new Set<string>(Object.values(ContentFormat));

export interface ClassifierContext {
  workspaceId: string;
  competitorId: string;
}

// ─── Deterministische URL-path-regels (eerst, gratis) ─────

const REGEX_RULES: Array<[RegExp, ContentFormat]> = [
  [/\/(press|persbericht|announcement)/i, ContentFormat.PRESS_RELEASE],
  [/\/(news|nieuws)(\/|$)/i, ContentFormat.PRESS_RELEASE],
  [/\/(case|cases|case-stud|projecten|portfolio|stor[iy]|klant)/i, ContentFormat.CASE_STUDY],
  [/\/(blog|article|post|insight|branding-tip)/i, ContentFormat.BLOG_POST],
  [/\/(webinar)/i, ContentFormat.WEBINAR],
  [/\/(podcast)/i, ContentFormat.PODCAST],
  [/\/(video|watch)/i, ContentFormat.VIDEO],
  [/\/(event)/i, ContentFormat.EVENT],
  [/\/(ebook|whitepaper)/i, ContentFormat.EBOOK],
  [/\/(docs?|support|faq|voorwaarden)/i, ContentFormat.DOC],
];

function regexFormat(url: string): ContentFormat | null {
  for (const [re, fmt] of REGEX_RULES) {
    if (re.test(url)) return fmt;
  }
  return null;
}

const SYSTEM_FORMAT = `You are classifying URLs from competitor websites by their content format.
Use ONLY URL-shape signals (path, slug-keywords) — you cannot fetch the page.

Pick exactly one of these formats per URL:
- BLOG_POST       (article, opinion, branding tip, marketing how-to under /blog/, /article/, /post/)
- PRESS_RELEASE   (news, announcement, milestone under /news/, /nieuws/, /press/, /persbericht/)
- CASE_STUDY      (customer story, project showcase under /case/, /projecten/, /portfolio/, /stories/)
- EBOOK           (whitepaper, downloadable guide, ebook)
- WEBINAR         (webinar, online seminar)
- PODCAST         (podcast episode)
- VIDEO           (standalone video page, /watch/, /video/)
- SOCIAL_POST     (link to LinkedIn/X/Instagram post)
- DOC             (documentation, FAQ, terms, policy, help-center, /docs/, /support/, /faq/)
- TOOL            (interactive tool, configurator, calculator)
- EVENT           (event page, conference, meetup)
- OTHER           (homepage, /contact/, /about/, /team/, /careers/, listing/index pages — not a content-item)

Respond with ONLY valid JSON, no markdown:
{"results":[{"url":"...","format":"BLOG_POST"}]}`;

interface FormatBatch {
  results: Array<{ url: string; format: string }>;
}

function buildTracking(ctx: ClassifierContext | undefined, source: string): AICallTracking | undefined {
  if (!ctx) return undefined;
  return {
    workspaceId: ctx.workspaceId,
    parentEntityType: "Competitor",
    parentEntityId: ctx.competitorId,
    sourceIdentifier: source,
  };
}

async function classifyViaHaiku(
  urls: string[],
  ctx?: ClassifierContext,
): Promise<Map<string, ContentFormat>> {
  const out = new Map<string, ContentFormat>();
  try {
    const result = await createStructuredCompletion<FormatBatch>(
      "anthropic",
      MODEL,
      SYSTEM_FORMAT,
      `Classify these URLs:\n${fenceUntrustedContent(urls.map((u) => `- ${u}`).join("\n"), "competitor sitemap/RSS URLs")}`,
      { temperature: TEMPERATURE, maxTokens: 1200, timeoutMs: TIMEOUT_MS },
      buildTracking(ctx, "src/lib/competitors/content-discovery/content-classifier.ts:classifyViaHaiku"),
    );
    for (const r of result?.results ?? []) {
      const fmt = (r.format ?? "").toUpperCase();
      if (r.url && VALID_FORMATS.has(fmt)) out.set(r.url, fmt as ContentFormat);
    }
  } catch (err) {
    console.warn(`[content-classifier] format-call faalde voor ${ctx?.competitorId ?? "?"}:`, err instanceof Error ? err.message : err);
  }
  return out;
}

/** Format per URL: regex-eerst, Haiku-fallback voor ambigue. URLs die
 *  niet te classificeren zijn ontbreken in de Map (orchestrator dropt ze). */
export async function classifyFormats(
  urls: string[],
  ctx?: ClassifierContext,
): Promise<Map<string, ContentFormat>> {
  const result = new Map<string, ContentFormat>();
  const ambiguous: string[] = [];
  for (const url of urls) {
    const fmt = regexFormat(url);
    if (fmt) result.set(url, fmt);
    else ambiguous.push(url);
  }
  if (ambiguous.length > 0) {
    for (const [url, fmt] of await classifyViaHaiku(ambiguous, ctx)) result.set(url, fmt);
  }
  return result;
}

// ─── Theme-tagger ─────────────────────────────────────────

const SYSTEM_THEMES = `You tag competitor content-items with 2-3 short thematic tags each.
Themes are lowercase noun-phrases (1-3 words) describing the topic, e.g. "brand strategy", "pricing", "ai", "sustainability".

Respond with ONLY valid JSON, no markdown:
{"results":[{"url":"...","themes":["theme1","theme2"]}]}`;

interface ThemeBatch {
  results: Array<{ url: string; themes: string[] }>;
}

/** Tag 2-3 thema's per item (1 gebatchte Haiku-call). Lege Map bij fout. */
export async function tagThemes(
  items: Array<{ url: string; title: string | null }>,
  ctx?: ClassifierContext,
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (items.length === 0) return out;
  try {
    const result = await createStructuredCompletion<ThemeBatch>(
      "anthropic",
      MODEL,
      SYSTEM_THEMES,
      `Tag these items:\n${fenceUntrustedContent(items.map((i) => `- ${i.url}${i.title ? ` (${i.title})` : ""}`).join("\n"), "competitor RSS/sitemap items")}`,
      { temperature: TEMPERATURE, maxTokens: 1500, timeoutMs: TIMEOUT_MS },
      buildTracking(ctx, "src/lib/competitors/content-discovery/content-classifier.ts:tagThemes"),
    );
    for (const r of result?.results ?? []) {
      if (r.url && Array.isArray(r.themes)) {
        out.set(r.url, r.themes.filter((t) => typeof t === "string").slice(0, 3));
      }
    }
  } catch (err) {
    console.warn(`[content-classifier] theme-call faalde voor ${ctx?.competitorId ?? "?"}:`, err instanceof Error ? err.message : err);
  }
  return out;
}
