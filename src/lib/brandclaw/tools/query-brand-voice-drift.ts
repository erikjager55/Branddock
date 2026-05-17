// =============================================================
// Brandclaw tool — query_brand_voice_drift (ADR 2026-05-08).
//
// Anthropic-tool die de voiceguide source-accessor wrap't. Input:
// `sinceDays` (default 90 — voice drift is een trager fenomeen dan
// alignment-scans). Returns ResourceVersion-historie van BrandVoiceguide
// + current state. Agent doet diff-walk over snapshot.versions ↔
// .current voor 'voice_drift' dimension.
// =============================================================

import { getDataSourceRegistry } from "../data-sources";
import { sinceNDaysAgo } from "../time-window";
import { getRegistryForTests as getToolRegistry } from "../orchestrator/tool-registry";
import type {
  BrandclawTool,
  BrandclawRunContext,
  ToolExecuteResult,
} from "../orchestrator/types";

const TOOL_NAME = "query_brand_voice_drift";

const tool: BrandclawTool = {
  definition: {
    name: TOOL_NAME,
    description:
      "Query BrandVoiceguide ResourceVersion-historie within a time-window plus current voiceguide-state. Returns version-snapshots so the agent can detect drift in wordsWeUse / wordsWeAvoid / antiPatterns / channelTones. Use for 'voice_drift' dimension observations.",
    input_schema: {
      type: "object",
      properties: {
        sinceDays: {
          type: "number",
          description:
            "Time-window in days. Default 90 — voice drift is slower than alignment-scan churn. Cap 365.",
        },
      },
    },
  },
  async execute(input: Record<string, unknown>, ctx: BrandclawRunContext): Promise<ToolExecuteResult> {
    const sinceDaysRaw = input.sinceDays;
    const sinceDays =
      typeof sinceDaysRaw === "number" && Number.isFinite(sinceDaysRaw) && sinceDaysRaw > 0
        ? Math.min(Math.floor(sinceDaysRaw), 365)
        : 90;

    const registry = await getDataSourceRegistry();
    const source = registry.getSource("voiceguide");
    const result = await source.query({
      workspaceId: ctx.workspaceId,
      window: sinceNDaysAgo(sinceDays),
    });

    return {
      content: {
        sourceType: "voiceguide",
        windowLabel: result.meta.windowLabel,
        rowCount: result.meta.rowCount,
        snapshotIds: result.snapshotIds,
        rows: result.rows,
      },
    };
  },
};

getToolRegistry().register("strategy_analyst", tool);

export { tool as queryBrandVoiceDriftTool };
