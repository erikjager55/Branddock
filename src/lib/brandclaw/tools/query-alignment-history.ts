// =============================================================
// Brandclaw tool — query_alignment_history (ADR 2026-05-08).
//
// Anthropic-tool die de alignment-scan source-accessor wrap't voor
// Strategy Analyst agent-loop. Input: `sinceDays` (default 30). Returns
// recent AlignmentScan rows + issue-counts per severity + snapshot-ids
// die de agent als evidence in observations kan refereren.
// =============================================================

import { getDataSourceRegistry } from "../data-sources";
import { sinceNDaysAgo } from "../time-window";
import { getRegistryForTests as getToolRegistry } from "../orchestrator/tool-registry";
import type {
  BrandclawTool,
  BrandclawRunContext,
  ToolExecuteResult,
} from "../orchestrator/types";

const TOOL_NAME = "query_alignment_history";

const tool: BrandclawTool = {
  definition: {
    name: TOOL_NAME,
    description:
      "Query recent AlignmentScan rows (workspace-wide brand coherence audits) within a time-window. Returns scan-level metadata + issue-counts grouped by severity. Use for 'alignment_gap' dimension observations.",
    input_schema: {
      type: "object",
      properties: {
        sinceDays: {
          type: "number",
          description:
            "Time-window in days. Recent rows only. Default 30. Cap 365 — large windows produce too much data for agent context.",
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
    const source = registry.getSource("alignment_scan");
    const result = await source.query({
      workspaceId: ctx.workspaceId,
      window: sinceNDaysAgo(sinceDays),
    });

    return {
      content: {
        sourceType: "alignment_scan",
        windowLabel: result.meta.windowLabel,
        rowCount: result.meta.rowCount,
        snapshotIds: result.snapshotIds,
        rows: result.rows,
      },
    };
  },
};

getToolRegistry().register("strategy_analyst", tool);

export { tool as queryAlignmentHistoryTool };
