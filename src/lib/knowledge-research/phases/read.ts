/**
 * READ-fase: haalt de inhoud van de gevonden bronnen op via de bestaande
 * scrape-helper (`scrapeProductUrl`). Per-bron-inhoud komt uitsluitend uit een
 * geslaagde scrape; een lege/mislukte scrape levert geen bron op (`skipped`).
 * De grounding-samenvatting wordt NIET per bron gedupliceerd — de orchestrator
 * (`ensureContent`) voegt die als één enkele samenvattings-bron toe wanneer
 * geen enkele scrape inhoud opleverde.
 *
 * Per bron wordt een `source-read`-event geëmit (`ok` | `skipped`).
 */

import { scrapeProductUrl } from "@/lib/products/url-scraper";
import type { DeepResearchEvent, SourceRef } from "../types";
import type { NumberedSource } from "../prompts";

export interface ReadInput {
  /** Optioneel absoluut tijdstip (Date.now()-basis) waarna de lus stopt en
   * de al-gelezen bronnen als partial result teruggaan — voorkomt dat de
   * leesfase het totale research-budget opeet (agents-research-parity). */
  deadlineAt?: number;
  sources: SourceRef[];
  /** Per-query grounding-samenvattingen als scrape-fallback. */
  groundingTexts: Array<{ query: string; text: string }>;
  maxSourcesToScrape: number;
  sendEvent: (e: DeepResearchEvent) => void;
  signal: AbortSignal;
}

export interface ReadOutput {
  /** Bronnen met geëxtraheerde inhoud, klaar voor verify/synthese. */
  numbered: NumberedSource[];
  warnings: string[];
}

const MIN_CONTENT_CHARS = 100;

/**
 * Scrapet tot `maxSourcesToScrape` bronnen. Gooit een AbortError zodra het
 * signaal afbreekt (gecontroleerd in de loop). Bronnen boven de cap worden
 * met de grounding-fallback gevuld zonder netwerk-call.
 */
export async function runRead(input: ReadInput): Promise<ReadOutput> {
  if (input.signal.aborted) throw new DOMException("Aborted", "AbortError");

  const warnings: string[] = [];
  const numbered: NumberedSource[] = [];

  let scraped = 0;
  let failed = 0;
  for (const src of input.sources) {
    if (input.signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (input.deadlineAt !== undefined && Date.now() > input.deadlineAt) {
      warnings.push(
        `Read stopped early after ${numbered.length} source(s) — time budget reached; remaining sources skipped.`,
      );
      break;
    }

    let content = "";
    const withinScrapeCap = scraped < input.maxSourcesToScrape;

    if (withinScrapeCap) {
      scraped++;
      try {
        const result = await scrapeProductUrl(src.url);
        if (result.bodyText && result.bodyText.trim().length >= MIN_CONTENT_CHARS) {
          content = result.bodyText.trim();
        }
      } catch (error) {
        failed++;
        // Een 403/404 op één losse bron is niet-actionable voor de gebruiker:
        // het technische detail blijft in de server-log, de UI krijgt na de loop
        // één vriendelijke samenvatting (zie onder).
        console.warn(
          `[deep-research/read] Scrape failed for ${src.url}: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
      }
    }

    // Per-bron-inhoud komt uitsluitend uit een geslaagde scrape. Mislukte/lege
    // scrapes worden overgeslagen; de grounding-samenvatting vult via de
    // orchestrator (ensureContent) als ÉÉN bron in, niet gedupliceerd per index.
    if (content) {
      numbered.push({
        index: src.index,
        title: src.title,
        url: src.url,
        content,
      });
      input.sendEvent({ type: "source-read", index: src.index, status: "ok" });
    } else {
      input.sendEvent({ type: "source-read", index: src.index, status: "skipped" });
    }
  }

  // Eén vriendelijke samenvatting i.p.v. een rauwe 403/404-regel per bron. De
  // overgeslagen bronnen blokkeren bots of zijn verplaatst; de synthese gebruikt
  // de bronnen die wél gelezen konden worden (of, als geen enkele lukte, de
  // grounding-samenvatting via orchestrator.ensureContent).
  if (failed > 0) {
    warnings.push(
      `Couldn't open ${failed} of ${scraped} source${scraped === 1 ? "" : "s"} directly (blocked or moved); the report uses the sources that could be read.`,
    );
  }

  return { numbered, warnings };
}
