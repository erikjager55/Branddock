// =============================================================
// Data Analyst — curated query-tool-set (tasks/agents-data-analyst.md).
//
// Eén vaste, hand-geschreven lijst van 7 read-only workspace-query-tools
// (per domein gesplitst in content-tools.ts en workspace-tools.ts).
// Registratie gebeurt in definitions/data-analyst.ts via registerAgentTool
// — zelfde bootstrap-conventie als de pipeline-tools van motor-wiring.
//
// Expliciet verboden (ADR D4 + idea-doc Must-NOT): vrije SQL, dynamische
// query-builders, natural-language-to-Prisma. Nieuwe inzichten = nieuwe
// hand-geschreven tool in deze lijst.
// =============================================================

import type { BrandclawTool } from "@/lib/brandclaw/orchestrator/types";
import {
  queryContentCoverageTool,
  queryContentInventoryTool,
  queryContentProductionTool,
  queryFvalScoresTool,
} from "./content-tools";
import {
  queryAgentRunCostsTool,
  queryCampaignOverviewTool,
  queryCompetitorActivityTool,
} from "./workspace-tools";

/** De volledige curated tool-set van de Data Analyst — read-only, workspace-scoped. */
export const dataAnalystQueryTools: BrandclawTool[] = [
  queryContentProductionTool,
  queryContentInventoryTool,
  queryFvalScoresTool,
  queryContentCoverageTool,
  queryCampaignOverviewTool,
  queryCompetitorActivityTool,
  queryAgentRunCostsTool,
];
