// =============================================================
// Brandclaw tool — query_content_fidelity (ADR 2026-05-08).
//
// Anthropic-tool die de content-fidelity source-accessor wrap't.
// Input: `sinceDays` (default 30). Returns recent ContentFidelityScore
// rows + finding-counts per severity/category + snapshot-ids. Use voor
// 'fidelity_decline' dimensie observations.
// =============================================================

import { getDataSourceRegistry } from "../data-sources";
import { sinceNDaysAgo } from "../time-window";
import { getRegistryForTests as getToolRegistry } from "../orchestrator/tool-registry";
import type {
  BrandclawTool,
  BrandclawRunContext,
  ToolExecuteResult,
} from "../orchestrator/types";

const TOOL_NAME = "query_content_fidelity";

const tool: BrandclawTool = {
  definition: {
    name: TOOL_NAME,
    description:
      "Query recent ContentFidelityScore rows (per-content-item F-VAL scores) within a time-window. Returns composite + pillar-scores + finding-distribution. Use for 'fidelity_decline' dimension observations and brand-voice drift signals across content-items.",
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
    const source = registry.getSource("content_fidelity");
    const result = await source.query({
      workspaceId: ctx.workspaceId,
      window: sinceNDaysAgo(sinceDays),
    });

    return {
      content: {
        sourceType: "content_fidelity",
        windowLabel: result.meta.windowLabel,
        rowCount: result.meta.rowCount,
        snapshotIds: result.snapshotIds,
        rows: result.rows,
      },
    };
  },
};

getToolRegistry().register("strategy_analyst", tool);

export { tool as queryContentFidelityTool };
