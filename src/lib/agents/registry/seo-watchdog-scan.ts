// =============================================================
// SEO/GEO-watchdog — deterministische scan-tool (tasks/agent-seo-watchdog.md).
//
// Scant gepubliceerde deliverables mét een `geoOptimizationAnalysis`
// (geschreven door de publish-meet-haak) en berekent de 5 vervalsignalen:
// staleness, score-drift (publish- vs actuele score via her-scoring van
// `settings.structuredVariant` — zelfde canonieke bron én zelfde pure functie
// als de meet-haak), canonical-drift, schema-drift en feit-veroudering
// (jaartal-heuristiek op citeableStats). Judge-vrij, $0 AI, read-only —
// geen cache-invalidation nodig (run-finalize invalideert `agents` al).
//
// Fail-soft per record: corrupte analysis of ongeldig variant → skip-teller,
// nooit een run laten falen op één gedrifte rij. Zelfde bewuste blinde vlek
// als de meet-haak: latere puckData/Claw-edits worden niet mee-gescoord
// (zie publish/route.ts + tasks/geo-seo-followup-later.md).
// =============================================================

import { prisma } from "@/lib/prisma";
import { fenceUntrustedContent } from "@/lib/ai/untrusted-fence";
import type { BrandclawTool } from "@/lib/brandclaw/orchestrator/types";
import {
  buildGeoOptimizationAnalysis,
  type GeoOptimizationAnalysis,
} from "@/lib/landing-pages/geo-analysis";
import { isRenderableGeoAnalysis } from "@/lib/landing-pages/geo-panel-view";
import { DEFAULT_STALENESS_DAYS, isContentStale } from "@/lib/landing-pages/author-profile";
import {
  longFormGeoVariantSchema,
  type LongFormGeoVariantContent,
} from "@/lib/landing-pages/page-type-schemas";
import type { GeoSignalScores } from "@/lib/brand-fidelity/geo-fidelity-scorer";
import { recordArtifact } from "./run-collector";
import { clampInt, errorResult } from "./data-analyst/shared";

/** Caps uit het tool-contract: flagged-items in het model-result en LINKs. */
const MAX_FLAGGED_IN_RESULT = 25;
const MAX_LINK_ARTIFACTS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Eén geflagde pagina in het model-result (contract in de task-file). */
export interface GeoDecayFlag {
  deliverableId: string;
  campaignId: string;
  title: string;
  publishedUrl: string | null;
  publishScore: number;
  currentScore: number;
  scoreDelta: number;
  measuredAt: string;
  staleDays: number;
  isStale: boolean;
  canonicalDrift: boolean;
  schemaDrift: { missing: string[]; added: string[] };
  agedStats: Array<{ label: string; year: number }>;
  weakSignals: Array<keyof GeoSignalScores>;
}

/** Diff van de schema.org-@types: publish-meting vs actuele emissie. */
export function diffSchemaTypes(
  publishTypes: string[],
  currentTypes: string[],
): { missing: string[]; added: string[] } {
  const pub = new Set(publishTypes);
  const cur = new Set(currentTypes);
  return {
    missing: publishTypes.filter((t) => !cur.has(t)),
    added: currentTypes.filter((t) => !pub.has(t)),
  };
}

/**
 * Feit-verouderings-heuristiek: jaartallen (1990-2099) in citeableStats die
 * ouder zijn dan het vorige kalenderjaar. Een "2024"-stat in 2026-content is
 * een refresh-kandidaat; het lopende en vorige jaar zijn per definitie vers.
 */
export function findAgedStats(
  variant: LongFormGeoVariantContent,
  now: Date,
): Array<{ label: string; year: number }> {
  const cutoff = now.getFullYear() - 1;
  const aged: Array<{ label: string; year: number }> = [];
  for (const stat of variant.citeableStats) {
    const haystack = `${stat.label} ${stat.value} ${stat.source ?? ""}`;
    const years = haystack.match(/\b(19|20)\d{2}\b/g) ?? [];
    const oldest = years.map(Number).filter((y) => y < cutoff).sort((a, b) => a - b)[0];
    if (oldest !== undefined) aged.push({ label: stat.label, year: oldest });
  }
  return aged;
}

/** Zwakke signalen uit de her-score (<60 — spiegelt de findings-drempel). */
export function weakSignalKeys(signals: GeoSignalScores): Array<keyof GeoSignalScores> {
  return (Object.keys(signals) as Array<keyof GeoSignalScores>).filter(
    (k) => signals[k] < 60,
  );
}

/**
 * Prioriteit binnen de flagged-lijst: stale eerst (het hoofdsignaal waar de
 * watchdog voor bestaat), daarbinnen de grootste score-daling bovenaan.
 */
export function compareFlagPriority(a: GeoDecayFlag, b: GeoDecayFlag): number {
  if (a.isStale !== b.isStale) return a.isStale ? -1 : 1;
  return a.scoreDelta - b.scoreDelta;
}

export const scanPublishedGeoContentTool: BrandclawTool = {
  definition: {
    name: "scan_published_geo_content",
    description:
      "Scan this workspace's published GEO pages for content decay. Re-scores each page's canonical content source and reports per page: staleness (measured longer than staleAfterDays ago), score drift (publish score vs current score), canonical-URL drift, schema.org type drift and aged statistics (old years in citeable stats). Healthy pages are counted, decayed pages are returned in priority order (max 25). Deep-links to the top pages are attached as LINK artifacts automatically. This tool measures content maintenance only — it has no traffic or ranking data.",
    input_schema: {
      type: "object",
      properties: {
        staleAfterDays: {
          type: "number",
          description: `Staleness threshold in days (1-365). Default ${DEFAULT_STALENESS_DAYS}.`,
        },
      },
    },
  },
  async execute(input, ctx) {
    const staleAfterDays = clampInt(input.staleAfterDays, DEFAULT_STALENESS_DAYS, 1, 365);
    const now = new Date();
    try {
      // Workspace-isolatie via de campaign-relatie is verplicht: de tool
      // draait ook headless (scheduled) met alleen ctx.workspaceId.
      const published = await prisma.deliverable.findMany({
        where: {
          campaign: { workspaceId: ctx.workspaceId },
          approvalStatus: "PUBLISHED",
        },
        select: {
          id: true,
          campaignId: true,
          title: true,
          publishedUrl: true,
          settings: true,
        },
      });

      // JS-filter op de aanwezigheid van een GEO-analyse (pre-launch volumes;
      // geen JSON-path-query nodig — zie task-file contract).
      const geoPages = published.filter((d) => {
        const s = d.settings;
        return s !== null && typeof s === "object" && !Array.isArray(s) &&
          "geoOptimizationAnalysis" in s;
      });

      let skipped = 0;
      const flagged: GeoDecayFlag[] = [];
      let healthy = 0;

      for (const page of geoPages) {
        const settings = page.settings as Record<string, unknown>;
        const analysis = settings.geoOptimizationAnalysis as
          | GeoOptimizationAnalysis
          | undefined;
        if (!isRenderableGeoAnalysis(analysis)) {
          skipped += 1;
          continue;
        }
        // De UI-guard valideert measuredAt/canonicalUrl niet, maar de scan
        // leunt op beide (staleness-anker + drift-vergelijking) — format-drift
        // hier zou als canonical-drift of dateloze flag doorlekken (review).
        if (typeof analysis.measuredAt !== "string" || typeof analysis.canonicalUrl !== "string") {
          skipped += 1;
          continue;
        }
        const parsedVariant = longFormGeoVariantSchema.safeParse(settings.structuredVariant);
        if (!parsedVariant.success) {
          // Analyse aanwezig maar de canonieke contentbron is gedrift —
          // zonder variant is her-scoring onmogelijk; skip i.p.v. gokken.
          skipped += 1;
          continue;
        }

        const current = buildGeoOptimizationAnalysis({
          variant: parsedVariant.data,
          canonicalUrl: page.publishedUrl ?? analysis.canonicalUrl,
          now,
        });

        const measuredMs = new Date(analysis.measuredAt).getTime();
        const staleDays = Number.isNaN(measuredMs)
          ? 0
          : Math.floor((now.getTime() - measuredMs) / DAY_MS);
        const isStale = isContentStale(analysis.measuredAt, now, staleAfterDays);
        const scoreDelta = current.geoScore - analysis.geoScore;
        const canonicalDrift =
          page.publishedUrl !== null && analysis.canonicalUrl !== page.publishedUrl;
        const schemaDrift = diffSchemaTypes(analysis.schemaTypes, current.schemaTypes);
        const agedStats = findAgedStats(parsedVariant.data, now);

        const decayed =
          isStale ||
          scoreDelta < 0 ||
          canonicalDrift ||
          schemaDrift.missing.length > 0 ||
          schemaDrift.added.length > 0 ||
          agedStats.length > 0;
        if (!decayed) {
          healthy += 1;
          continue;
        }
        flagged.push({
          deliverableId: page.id,
          campaignId: page.campaignId,
          title: page.title,
          publishedUrl: page.publishedUrl,
          publishScore: analysis.geoScore,
          currentScore: current.geoScore,
          scoreDelta,
          measuredAt: analysis.measuredAt,
          staleDays,
          isStale,
          canonicalDrift,
          schemaDrift,
          agedStats,
          weakSignals: weakSignalKeys(current.signals),
        });
      }

      flagged.sort(compareFlagPriority);
      const capped = flagged.slice(0, MAX_FLAGGED_IN_RESULT);

      // Server-owned deep-links naar de canvas voor de top-prioriteit-pagina's
      // (entity-navigation case 'deliverable' heeft campaignId nodig).
      for (const flag of flagged.slice(0, MAX_LINK_ARTIFACTS)) {
        recordArtifact(ctx.runId, {
          type: "LINK",
          title: `Open in Content Canvas: ${flag.title}`,
          content: {
            entityType: "deliverable",
            entityId: flag.deliverableId,
            campaignId: flag.campaignId,
            label: flag.title,
          },
        });
      }

      return {
        content: {
          // Expliciet meegegeven zodat het rapport nooit een scandatum hoeft
          // te verzinnen (eerste smoke-run hallucineerde er een).
          scannedAt: now.toISOString(),
          pagesScanned: geoPages.length,
          healthy,
          skipped,
          flaggedCount: flagged.length,
          flaggedTruncated: flagged.length > capped.length,
          staleAfterDays,
          // Titels/URLs/stat-labels zijn content-afgeleid → mechanisch
          // gefenced; het model leest dit uitsluitend als data.
          flagged: fenceUntrustedContent(
            JSON.stringify(capped),
            "decayed GEO pages (content-derived titles and findings)",
          ),
        },
      };
    } catch (err) {
      return errorResult(err, "SCAN_PUBLISHED_GEO_CONTENT_FAILED");
    }
  },
};
