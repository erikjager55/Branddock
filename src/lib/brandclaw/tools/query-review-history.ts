// =============================================================
// Brandclaw tool — query_review_history (ADR 2026-05-08).
//
// Anthropic-tool die de review-log source-accessor wrap't (Δ-1 paste-in
// review-flow). Input: `sinceDays` (default 30). Returns ContentReviewLog
// rows + finding-distribution per severity/category + snapshot-ids. Use
// voor 'review_pattern' dimensie observations (e.g. source-mix trends,
// composite-drift over manuele reviews).
// =============================================================

import { getDataSourceRegistry } from "../data-sources";
import { sinceNDaysAgo } from "../time-window";
import { getRegistryForTests as getToolRegistry } from "../orchestrator/tool-registry";
import type {
  BrandclawTool,
  BrandclawRunContext,
  ToolExecuteResult,
} from "../orchestrator/types";

const TOOL_NAME = "query_review_history";

const tool: BrandclawTool = {
  definition: {
    name: TOOL_NAME,
    description:
      "Query recent ContentReviewLog rows (paste-in / URL / file review runs) within a time-window. Returns review-metadata + composite scores + finding-distribution + source-mix. Use for 'review_pattern' dimension observations.",
    input_schema: {
      type: "object",
      properties: {
        sinceDays: {
          type: "number",
          description:
            "Time-window in days. Recent rows only. Default 30. Cap 365.",
        },
      },
    },
  },
  async execute(input: Record<string, unknown>, ctx: BrandclawRunContext): Promise<ToolExecuteResult> {
    const sinceDaysRaw = input.sinceDays;
    const sinceDays =
      typeof sinceDaysRaw === "number" && Number.isFinite(sinceDaysRaw) && sinceDaysRaw > 0
        ? Math.min(Math.floor(sinceDaysRaw), 365)
        : 30;

    const registry = await getDataSourceRegistry();
    const source = registry.getSource("review_log");
    const result = await source.query({
      workspaceId: ctx.workspaceId,
      window: sinceNDaysAgo(sinceDays),
    });

    return {
      content: {
        sourceType: "review_log",
        windowLabel: result.meta.windowLabel,
        rowCount: result.meta.rowCount,
        snapshotIds: result.snapshotIds,
        rows: result.rows,
      },
    };
  },
};

getToolRegistry().register("strategy_analyst", tool);

export { tool as queryReviewHistoryTool };
