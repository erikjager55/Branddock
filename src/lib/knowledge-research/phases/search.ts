/**
 * SEARCH-fase: fan-out over de zoekqueries.
 *
 * Baseline = Gemini `searchWithGrounding` (altijd beschikbaar). Die levert
 * echter `vertexaisearch…/grounding-api-redirect/…`-redirect-links; die worden
 * eerst geresolved naar hun eind-URL — anders zou de domein-dedup op het
 * gedeelde redirect-domein draaien en élke run tot 2 bronnen cappen, en zou de
 * opgeslagen bron-URL een vergankelijke redirect zijn. Optioneel = Exa neural
 * search (alleen als `EXA_API_KEY` gezet is) als aanvullende context-tekst.
 *
 * Per gevonden bron wordt een stabiele 1-based `index` toegekend en een
 * `source`-event geëmit. Domein-dedup volgt het patroon uit researcher.ts.
 */

import { searchWithGrounding } from "@/lib/ai/gemini-client";
import { fetchExaContext } from "@/lib/exa/exa-client";
import { fetchScholarContext } from "@/lib/semantic-scholar/scholar-client";
import { assertSafeUrl } from "@/lib/utils/ssrf";
import type { DeepResearchEvent, SourceRef } from "../types";

const MAX_DOMAIN_DUPLICATES = 2;
const REDIRECT_RESOLVE_TIMEOUT_MS = 5000;

export interface SearchInput {
  queries: string[];
  /** Harde bovengrens op het aantal bronnen dat we indexeren. */
  maxSources: number;
  sendEvent: (e: DeepResearchEvent) => void;
  signal: AbortSignal;
}

export interface SearchOutput {
  /** Stabiel genummerde bronnen (1-based index), nog niet gescraped. */
  sources: SourceRef[];
  /** AI-gegronde samenvattings-tekst per query (fallback-context). */
  groundingTexts: Array<{ query: string; text: string }>;
  /** Optionele Exa-context-tekst (leeg als geen key/resultaten). */
  exaContext: string;
  /** Optionele Semantic-Scholar-context (peer-reviewed; leeg zonder key/hits). */
  scholarContext: string;
  warnings: string[];
}

/** Domein uit een URL, zonder www-prefix; 'unknown' bij parse-fout. */
function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/**
 * Resolve een Gemini grounding-redirect-link
 * (`vertexaisearch…/grounding-api-redirect/…`) naar de uiteindelijke bron-URL via
 * de `Location`-header van de 302. Faalt stil (timeout/abort/netwerk) → behoud de
 * werkende redirect-URL. Niet-grounding-URLs worden ongemoeid gelaten.
 */
async function resolveRedirectUrl(url: string, signal: AbortSignal): Promise<string> {
  if (signal.aborted || !url.includes("grounding-api-redirect")) return url;
  try {
    // SSRF-async-upgrade (audit-rest, 2026-07-17): assertSafeUrl resolve't
    // álle DNS-records (sluit private targets + DNS-rebind uit) — de oude
    // sync isPrivateHostname zag alleen IP-literals. Bewust géén safeFetch
    // hier: die volgt de redirect-keten zelf, terwijl deze functie juist de
    // Location-header wil aflezen zonder te volgen (de latere scrape-fase
    // fetcht de bestemming wél via safeFetch).
    await assertSafeUrl(url);
    // GET + redirect:manual: een 302 heeft geen body (de body wordt niet gelezen),
    // dus net zo goedkoop als HEAD maar bewezen werkend op de grounding-endpoint.
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      // Combineer de run-abort met een korte timeout: een afgebroken run wacht
      // niet onnodig op redirect-resolutie.
      signal: AbortSignal.any([signal, AbortSignal.timeout(REDIRECT_RESOLVE_TIMEOUT_MS)]),
    });
    const location = res.headers.get("location");
    if (location && /^https?:\/\//i.test(location)) {
      // SSRF-defense-in-depth: sla geen private/interne bestemming op.
      try {
        await assertSafeUrl(location);
        return location;
      } catch {
        // Onveilige of onparseerbare location → val terug op de redirect-URL.
      }
    }
  } catch {
    // Resolutie mislukt → fallback op de (werkende) redirect-URL.
  }
  return url;
}

/**
 * Voert de fan-out-search uit. Gooit een AbortError zodra het signaal afbreekt;
 * alle andere fouten degraderen naar `warnings` zodat de pipeline doorgaat
 * zolang er minstens één bron of grounding-tekst is.
 */
export async function runSearch(input: SearchInput): Promise<SearchOutput> {
  if (input.signal.aborted) throw new DOMException("Aborted", "AbortError");

  const warnings: string[] = [];
  const groundingTexts: Array<{ query: string; text: string }> = [];

  // 1. Verzamel ruwe grounding-kandidaten (redirect-URLs) over alle queries.
  const rawCandidates: Array<{ url: string; title: string }> = [];
  const seenRaw = new Set<string>();
  for (const query of input.queries) {
    if (input.signal.aborted) throw new DOMException("Aborted", "AbortError");

    try {
      const result = await searchWithGrounding(query, 5);

      if (result.responseText.length > 50) {
        groundingTexts.push({ query, text: result.responseText });
      }

      for (const r of result.urls) {
        if (!r.url || seenRaw.has(r.url)) continue;
        seenRaw.add(r.url);
        rawCandidates.push({ url: r.url, title: r.title || r.url });
      }
    } catch (error) {
      warnings.push(
        `Search failed for "${query.slice(0, 50)}": ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  // 2. Resolve grounding-redirect-links parallel naar hun eind-URL (met fallback
  //    op de werkende redirect-URL), zodat stap 3 op echte domeinen dedupt.
  //    Begrens de fan-out: dedup/cap halveren het aantal tóch, dus resolve hooguit
  //    een ruime marge boven `maxSources`.
  const toResolve = rawCandidates.slice(0, input.maxSources * 2);
  const resolved = await Promise.all(
    toResolve.map(async (c) => ({
      url: await resolveRedirectUrl(c.url, input.signal),
      title: c.title,
    })),
  );

  // 3. Dedup op echte URL + echt domein, ken stabiele 1-based index toe, emit.
  const sources: SourceRef[] = [];
  const seenDomains = new Map<string, number>();
  const seenUrls = new Set<string>();
  let nextIndex = 1;
  for (const c of resolved) {
    if (sources.length >= input.maxSources) break;
    if (seenUrls.has(c.url)) continue;

    const domain = domainOf(c.url);
    const count = seenDomains.get(domain) ?? 0;
    if (count >= MAX_DOMAIN_DUPLICATES) continue;

    seenDomains.set(domain, count + 1);
    seenUrls.add(c.url);

    const ref: SourceRef = {
      index: nextIndex++,
      url: c.url,
      title: c.title,
      origin: "grounding",
      used: false,
    };
    sources.push(ref);
    input.sendEvent({
      type: "source",
      index: ref.index,
      url: ref.url,
      title: ref.title,
      origin: ref.origin,
    });
  }

  // ── Optioneel: Exa neural search als aanvullende context ──
  let exaContext = "";
  if (process.env.EXA_API_KEY) {
    try {
      const exaQueries = input.queries.slice(0, 3).map((q) => ({
        query: q.slice(0, 95),
        queryLayer: "trend" as const,
      }));
      const exa = await fetchExaContext(exaQueries);
      exaContext = exa.contextText;
    } catch (error) {
      warnings.push(
        `Exa enrichment skipped: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  // ── Optioneel: Semantic Scholar als peer-reviewed context ──
  // Zelfde degradatie-patroon als Exa: alleen met key, fouten → warning.
  // Het "scholar"-brontype bestond al in het contract (types.ts) maar was
  // nooit aangesloten — S2-key beschikbaar sinds 2026-07-15 (taak #22).
  let scholarContext = "";
  if (process.env.S2_API_KEY) {
    try {
      const scholarQueries = input.queries.slice(0, 2).map((q) => ({
        query: q.slice(0, 95),
        // 'effectiveness' als generieke research-laag; de client gebruikt de
        // laag alleen als label in de geformatteerde context.
        queryLayer: "effectiveness" as const,
      }));
      const scholar = await fetchScholarContext(scholarQueries);
      scholarContext = scholar.contextText;
    } catch (error) {
      warnings.push(
        `Scholar enrichment skipped: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  return { sources, groundingTexts, exaContext, scholarContext, warnings };
}
