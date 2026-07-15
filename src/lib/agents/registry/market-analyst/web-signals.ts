// =============================================================
// Market-analyst — read_competitor_web_signals (research-stack-marco).
//
// Registry-native read-tool (data-analyst-conventie): read-only, harde
// workspace-scope via Competitor.workspaceId, server-owned TABLE via
// recordTableArtifact, alle content-afgeleide strings gefenced. Levert het
// EXTERNE web-/nieuwsbeeld per concurrent (nieuws/funding/lanceringen/
// vermeldingen elders) via Exa neural search met datum-filter — de eigen
// site van de concurrent wordt uitgesloten (dit is wat ANDEREN over hen
// zeggen, niet wat wij van hun site scrapen). On-demand, geen opslag.
// =============================================================

import { prisma } from "@/lib/prisma";
import { fenceUntrustedContent } from "@/lib/ai/untrusted-fence";
import { searchExaSources } from "@/lib/exa/exa-client";
import type { BrandclawTool } from "@/lib/brandclaw/orchestrator/types";
import { MAX_TABLE_ROWS, recordTableArtifact } from "../data-analyst/table-contract";
import { clampInt, errorResult, sinceDaysAgo } from "../data-analyst/shared";

const MAX_COMPETITORS = 5;
const MAX_SIGNALS_PER_COMPETITOR = 10;
const DEFAULT_WINDOW_DAYS = 30;
const MIN_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 90;
const EXA_RESULTS_PER_QUERY = 8;

/** Hostname from a URL (minus a leading www); null if unparseable. */
function baseDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withScheme).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/**
 * True when `host` belongs to the competitor's own site — equal, a subdomain
 * of the own domain, or (for a subdomain-configured websiteUrl) the apex of it.
 * The leading-dot boundary prevents false positives like `evil-acme.com` vs
 * `acme.com`. Without a public-suffix list this can't reduce to eTLD+1, but it
 * covers the apex/www/subdomain configurations that occur in practice.
 */
function isSameSite(host: string | null, ownDomain: string | null): boolean {
  if (!host || !ownDomain) return false;
  return (
    host === ownDomain ||
    host.endsWith(`.${ownDomain}`) ||
    ownDomain.endsWith(`.${host}`)
  );
}

export const readCompetitorWebSignalsTool: BrandclawTool = {
  definition: {
    name: "read_competitor_web_signals",
    description:
      "External web signals about this workspace's competitors — recent news, funding, launches and mentions on OTHER sites. The competitor's own domain is excluded, so this is what third parties say about them, not what we scrape from their site. Neural web search over a recent window. Input: optional competitorId (one competitor) — otherwise all competitors in the workspace (max 5); optional days (7-90, default 30). Use it for \"what moved in our market?\" beyond the competitor-site scrape. Coverage of small or local brands can be thin — an empty result is a valid, honest answer; do not invent signals. Results are attached as a TABLE artifact automatically.",
    input_schema: {
      type: "object",
      properties: {
        competitorId: {
          type: "string",
          description: "Optional: restrict to one competitor by id. Omit to scan all competitors (max 5).",
        },
        days: {
          type: "number",
          description: "Lookback window in days (clamped 7-90, default 30).",
        },
      },
    },
  },
  async execute(input, ctx) {
    // Keyless: honest not-configured error. Marco degrades to its own-site
    // tools; the run does not fail.
    if (!process.env.EXA_API_KEY) {
      return errorResult(
        new Error(
          "External web search is not configured (EXA_API_KEY missing) — external competitor signals are unavailable; rely on the scraped competitor data instead.",
        ),
        "EXA_NOT_CONFIGURED",
      );
    }

    try {
      const days = clampInt(input.days, DEFAULT_WINDOW_DAYS, MIN_WINDOW_DAYS, MAX_WINDOW_DAYS);
      const competitorId = typeof input.competitorId === "string" ? input.competitorId : undefined;

      const competitors = await prisma.competitor.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          status: { not: "ARCHIVED" },
          ...(competitorId ? { id: competitorId } : {}),
        },
        select: { id: true, name: true, websiteUrl: true, mainOfferings: true },
        orderBy: { name: "asc" },
        take: competitorId ? 1 : MAX_COMPETITORS,
      });

      if (competitors.length === 0) {
        return {
          content: {
            competitorsScanned: 0,
            windowDays: days,
            signalCount: 0,
            note: competitorId
              ? "No competitor with that id in this workspace."
              : "No competitors are configured in this workspace yet.",
          },
        };
      }

      const startPublishedDate = sinceDaysAgo(days).toISOString().slice(0, 10);

      // One Exa query per competitor (different exclude-domain each) — sequential
      // fan-out is fine at cap 5. Own-domain excluded at the API AND defensively
      // re-filtered from the results.
      const perCompetitor = await Promise.all(
        competitors.map(async (c) => {
          const ownDomain = baseDomain(c.websiteUrl);
          const anchor = (c.mainOfferings[0] ?? "").slice(0, 40).trim();
          const query = `Recent news, funding or product launches about ${c.name}${
            anchor ? ` (${anchor})` : ""
          }`.slice(0, 95);

          const blocks = await searchExaSources([{ query, queryLayer: "trend" }], {
            startPublishedDate,
            numResults: EXA_RESULTS_PER_QUERY,
            maxResults: MAX_SIGNALS_PER_COMPETITOR,
            excludeDomains: ownDomain ? [ownDomain] : undefined,
          });

          return blocks
            .filter((b) => !isSameSite(baseDomain(b.url), ownDomain))
            .slice(0, MAX_SIGNALS_PER_COMPETITOR)
            .map((b) => ({
              competitor: c.name,
              title: b.title,
              url: b.url,
              publishedAt: b.publishedDate ?? null,
              snippet: b.snippet,
            }));
        }),
      );

      const allSignals = perCompetitor.flat();

      recordTableArtifact(ctx, {
        title: "Competitor web signals",
        content: {
          columns: [
            { key: "competitor", label: "Competitor", type: "text" },
            { key: "title", label: "Signal", type: "text" },
            { key: "publishedAt", label: "Date", type: "date" },
            { key: "url", label: "Source", type: "text" },
          ],
          rows: allSignals.slice(0, MAX_TABLE_ROWS).map((s) => ({
            competitor: s.competitor,
            title: s.title,
            publishedAt: s.publishedAt,
            url: s.url,
          })),
          summary: `${competitors.length} competitor(s) scanned over ${days} days; ${allSignals.length} external web signal(s) found.`,
        },
      });

      return {
        content: {
          competitorsScanned: competitors.length,
          windowDays: days,
          signalCount: allSignals.length,
          // Titles/snippets/URLs are third-party content → mechanically fenced.
          signals: fenceUntrustedContent(
            JSON.stringify(allSignals),
            "external competitor web signals (titles, snippets and URLs are third-party data)",
          ),
        },
      };
    } catch (err) {
      return errorResult(err, "READ_COMPETITOR_WEB_SIGNALS_FAILED");
    }
  },
};

export const marketAnalystWebSignalTools: BrandclawTool[] = [readCompetitorWebSignalsTool];
