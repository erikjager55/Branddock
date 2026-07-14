// =============================================================
// Data Analyst — curated query-tool: periode-activiteit (week-granulariteit).
//
// Toegevoegd voor Remi (agent-reporter, fase-1-bevinding c): de bestaande
// tools aggregeren per máánd, waardoor "deze week vs vorige week" niet kon.
// Eén vaste, geparametriseerde query — venster van N dagen naast het
// voorgaande venster, één rij per venster. Zelfde contract als de overige
// tools (shared.ts): geclampte inputs, harde workspace-scope, read-only,
// server-owned TABLE via recordTableArtifact. Dana profiteert automatisch mee.
//
// Bewust géén "completed in venster"-kolom: Deliverable heeft geen
// completion-timestamp — een updatedAt-proxy zou stil valse cijfers geven.
// =============================================================

import { prisma } from "@/lib/prisma";
import type { BrandclawTool } from "@/lib/brandclaw/orchestrator/types";
import { recordTableArtifact } from "./table-contract";
import { clampInt, errorResult, sinceDaysAgo } from "./shared";

export const queryPeriodActivityTool: BrandclawTool = {
  definition: {
    name: "query_period_activity",
    description:
      "Activity for a recent window (default: last 7 days) compared to the window before it: deliverables created, deliverables published, content reviews and average F-VAL score — one row per window. Result is attached as a TABLE artifact automatically. Use for weekly reports and 'this week vs last week' questions. Note: completion of deliverables is not timestamped, so 'completed this window' cannot be reported.",
    input_schema: {
      type: "object",
      properties: {
        windowDays: {
          type: "number",
          description: "Window length in days (1-90). Default 7 (a week).",
        },
      },
    },
  },
  async execute(input, ctx) {
    const windowDays = clampInt(input.windowDays, 7, 1, 90);
    const currentStart = sinceDaysAgo(windowDays);
    const previousStart = sinceDaysAgo(windowDays * 2);
    try {
      const rows = await prisma.$queryRaw<
        Array<{
          window: string;
          created: number;
          published: number;
          reviews: number;
          avg_fval: number | null;
        }>
      >`
        WITH windows AS (
          SELECT 'current'::text AS window, ${currentStart}::timestamptz AS win_start, now() AS win_end
          UNION ALL
          SELECT 'previous', ${previousStart}::timestamptz, ${currentStart}::timestamptz
        )
        SELECT w.window,
               (SELECT count(*)::int FROM "Deliverable" d
                  JOIN "Campaign" c ON c.id = d."campaignId"
                 WHERE c."workspaceId" = ${ctx.workspaceId}
                   AND d."createdAt" >= w.win_start AND d."createdAt" < w.win_end) AS created,
               (SELECT count(*)::int FROM "Deliverable" d
                  JOIN "Campaign" c ON c.id = d."campaignId"
                 WHERE c."workspaceId" = ${ctx.workspaceId}
                   AND d."publishedAt" >= w.win_start AND d."publishedAt" < w.win_end) AS published,
               (SELECT count(*)::int FROM "ContentReviewLog" r
                 WHERE r."workspaceId" = ${ctx.workspaceId}
                   AND r."createdAt" >= w.win_start AND r."createdAt" < w.win_end) AS reviews,
               (SELECT round(avg(r."compositeScore")::numeric, 1)::float8 FROM "ContentReviewLog" r
                 WHERE r."workspaceId" = ${ctx.workspaceId}
                   AND r."createdAt" >= w.win_start AND r."createdAt" < w.win_end) AS avg_fval
        FROM windows w
        ORDER BY w.window
      `;

      const current = rows.find((r) => r.window === "current");
      return {
        content: recordTableArtifact(ctx, {
          title: `Activity: last ${windowDays} days vs the ${windowDays} days before`,
          content: {
            columns: [
              { key: "window", label: "Window", type: "text" },
              { key: "created", label: "Deliverables created", type: "number" },
              { key: "published", label: "Published", type: "number" },
              { key: "reviews", label: "Reviews", type: "number" },
              { key: "avgFval", label: "Avg F-VAL", type: "number" },
            ],
            rows: rows.map((r) => ({
              window: r.window,
              created: r.created,
              published: r.published,
              reviews: r.reviews,
              avgFval: r.avg_fval,
            })),
            summary: current
              ? `Last ${windowDays} days: ${current.created} deliverables created, ${current.published} published, ${current.reviews} reviews${current.avg_fval !== null ? ` (avg F-VAL ${current.avg_fval})` : ""}.`
              : `No activity data for the last ${windowDays} days.`,
          },
        }),
      };
    } catch (err) {
      return errorResult(err, "QUERY_PERIOD_ACTIVITY_FAILED");
    }
  },
};
