// =============================================================
// Content-discovery fetch-policy — de enige netwerk-touch van de
// discovery-laag. Honest bot-gedrag: SSRF-guard, robots.txt-respect,
// per-host throttle (1 req/s), Branddock-identificerende User-Agent,
// per-request timeout. Plus gedeelde URL-helpers (normalize + hash).
//
// Robots- en throttle-state zijn process-globaal (module-level Maps),
// niet de request-scoped api/cache-laag — zelfde primitive als de
// singleton AI-clients.
// =============================================================
import { createHash } from "node:crypto";
import { assertSafeUrl, assertSafeRedirect } from "@/lib/utils/ssrf";
import type { FetchFn } from "./types";

/** Eerlijke, Branddock-identificerende UA (geen Chrome-spoof — robots-compliant). */
export const USER_AGENT = "Branddock-ContentBot/1.0 (+https://branddock.com)";

const PER_HOST_MIN_INTERVAL_MS = 1000; // 1 req/s per host
const ROBOTS_TTL_MS = 24 * 60 * 60 * 1000; // 1 dag
const DEFAULT_TIMEOUT_MS = 5000;

/** URL-paden die als content-item tellen (blog/news/press/case/…). Shared filter. */
export const CONTENT_PATH_RE =
  /\/(blog|news|press|insight|article|post|case|stor[iy]|nieuws|persbericht|projecten|portfolio|webinar|podcast|video|whitepaper|ebook|guide|resource)/i;

// ─── URL-helpers ──────────────────────────────────────────

const TRACKING_PARAM_RE = /^(utm_|fbclid$|gclid$|mc_|ref$|source$)/i;

/** Canonicaliseer een URL voor dedup: lowercase host, drop fragment +
 *  tracking-params, strip trailing slash. */
export function normalizeUrl(raw: string): string {
  const u = new URL(raw);
  u.hash = "";
  u.hostname = u.hostname.toLowerCase();
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAM_RE.test(key)) u.searchParams.delete(key);
  }
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.slice(0, -1);
  }
  return u.toString();
}

/** SHA-256 over de genormaliseerde URL — de `urlHash` dedup-key. */
export function hashUrl(raw: string): string {
  return createHash("sha256").update(normalizeUrl(raw)).digest("hex");
}

// ─── Per-host throttle ────────────────────────────────────

const MAX_HOST_ENTRIES = 1000; // backstop tegen ongebonden groei in long-lived server
const lastFetchByHost = new Map<string, number>();

/** Verwijder de oudste entry wanneer een Map de cap overschrijdt (insertion-order). */
function capMap<V>(m: Map<string, V>): void {
  if (m.size <= MAX_HOST_ENTRIES) return;
  const oldest = m.keys().next().value;
  if (oldest !== undefined) m.delete(oldest);
}

async function throttleHost(host: string): Promise<void> {
  // Reserveer het slot vóór de await zodat parallelle callers (RSS + sitemap
  // op dezelfde host) netjes achter elkaar in de queue komen i.p.v. dezelfde
  // timestamp te lezen en gelijktijdig te vuren.
  const now = Date.now();
  const next = Math.max(now, (lastFetchByHost.get(host) ?? 0) + PER_HOST_MIN_INTERVAL_MS);
  lastFetchByHost.set(host, next);
  capMap(lastFetchByHost);
  const wait = next - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

function combinedSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/** Low-level fetch: SSRF + throttle + UA + timeout. GEEN robots-check
 *  (gebruikt door getRobots zelf om recursie te vermijden). Returnt null
 *  bij fout / niet-ok. */
async function rawFetch(
  url: string,
  opts?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<Response | null> {
  try {
    assertSafeUrl(url);
    await throttleHost(new URL(url).host);
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      redirect: "follow",
      signal: combinedSignal(opts?.signal, opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    assertSafeRedirect(url, res.url);
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

// ─── Robots.txt ───────────────────────────────────────────

interface RobotsRules {
  disallows: string[];
  sitemaps: string[];
}

const robotsCache = new Map<string, { rules: RobotsRules; fetchedAt: number }>();

/** Minimal robots.txt parse: `Disallow:` onder `User-agent: *` of onze UA,
 *  plus `Sitemap:` directives. Geen volledige RFC 9309 wildcard-engine. */
function parseRobots(body: string): RobotsRules {
  const disallows: string[] = [];
  const sitemaps: string[] = [];
  let applies = false;
  for (const rawLine of body.split("\n")) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const ua = line.match(/^User-agent:\s*(.+)$/i);
    if (ua) {
      const agent = ua[1].trim().toLowerCase();
      applies = agent === "*" || USER_AGENT.toLowerCase().startsWith(agent);
      continue;
    }
    const sm = line.match(/^Sitemap:\s*(.+)$/i);
    if (sm) {
      sitemaps.push(sm[1].trim());
      continue;
    }
    if (applies) {
      const dis = line.match(/^Disallow:\s*(.*)$/i);
      if (dis && dis[1].trim()) disallows.push(dis[1].trim());
    }
  }
  return { disallows, sitemaps };
}

/** Haal robots.txt op (1-dag cache per origin). Faalt zacht → lege regels. */
export async function getRobots(origin: string): Promise<RobotsRules> {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < ROBOTS_TTL_MS) return cached.rules;
  const res = await rawFetch(`${origin}/robots.txt`, { timeoutMs: 4000 });
  const rules: RobotsRules = res ? parseRobots(await res.text()) : { disallows: [], sitemaps: [] };
  robotsCache.set(origin, { rules, fetchedAt: Date.now() });
  capMap(robotsCache);
  return rules;
}

/** True wanneer `path` niet onder een Disallow-prefix valt. */
export function isAllowedByRobots(rules: RobotsRules, path: string): boolean {
  return !rules.disallows.some((d) => path.startsWith(d));
}

// ─── politeFetch (de publieke, robots-respecterende fetch) ─

/** Robots-respecterende fetch met SSRF + throttle + UA + timeout.
 *  Returnt null bij fout, niet-200, of robots-block. */
export const politeFetch: FetchFn = async (url, opts) => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const rules = await getRobots(parsed.origin);
  if (!isAllowedByRobots(rules, parsed.pathname)) return null;
  return rawFetch(url, { signal: opts?.signal });
};

/** Robots-gevonden sitemap-URLs voor een origin (voor de sitemap-discoverer). */
export async function getSitemapsFromRobots(origin: string): Promise<string[]> {
  return (await getRobots(origin)).sitemaps;
}
