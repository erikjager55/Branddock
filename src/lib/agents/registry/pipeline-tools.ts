// =============================================================
// Agents registry — pipeline-as-tool wrappers (ADR D1-verfijning).
//
// Bestaande motoren (deep research, strategie-stappen) draaien als
// orchestrator-tools bínnen de agent-loop. Kern-afspraken:
//   - Grote output (volledige rapporten) gaat NIET door de model-context
//     maar via de run-collector als server-owned artefact; het model
//     krijgt een compacte samenvatting terug.
//   - Write-through: het deep-research-rapport landt direct als
//     KnowledgeResource (domain-first — Knowledge Library toont hem
//     meteen), met een LINK-artefact op de run.
//   - Elke tool is fail-soft richting het model (isError-result), nooit
//     een loop-brekende throw.
//
// De contentgeneratie-pipeline (`orchestrateContentGeneration`) is hier
// bewust GEEN tool: die draait in de confirm-route ná goedkeuring van
// het create_deliverable-proposal (task-risico: anders dubbele
// generatie-triggers vanuit loop-turns).
// =============================================================

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runDeepResearch } from "@/lib/knowledge-research/orchestrator";
import {
  buildCreativePipelineContext,
  buildStrategyFoundation,
  buildConceptDrivenStrategy,
  generateCreativeConcepts,
  generateInsights,
} from "@/lib/campaigns/strategy-chain";
import type {
  CreativeConcept,
  HumanInsight,
} from "@/lib/campaigns/strategy-blueprint.types";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import type {
  BrandclawTool,
  ToolExecuteResult,
} from "@/lib/brandclaw/orchestrator/types";
import { recordArtifact } from "./run-collector";

// Compacte config: de interne deep-research-deadline wordt in de praktijk
// niet door élke fase gerespecteerd (smoke 2026-07-06: 8-min-config liep
// 15+ min door hangende scrapes/LLM-fases) — daarom bovenop de config een
// eigen harde kill (abort + race) zodat de agent-run-guard nooit eerst afgaat.
const DEEP_RESEARCH_DEADLINE_MS = 5 * 60 * 1000;
const DEEP_RESEARCH_HARD_KILL_MS = DEEP_RESEARCH_DEADLINE_MS + 90 * 1000;

/**
 * Snelheids-preset voor de strategist-tools: de volledige keten (foundation
 * → insights → concepts → strategy) moet binnen één synchrone agent-run
 * passen (guard 720s). Smoke 2026-07-06: foundation op de default
 * 'grounded'-preset kostte alleen al ~6 min. De wizard blijft de plek voor
 * diepe ('grounded'/'research-backed') runs — de agent levert snelle,
 * beslisklare counsel.
 */
const AGENT_PIPELINE_CONFIG = {
  strategyDepth: "basic",
  creativeRange: "single",
  modelRigor: "fast",
} as const;


/** Harde per-stap-deadline: een hangende chain-stap mag de run-guard niet
 * blokkeren (tool-executes zijn onbegrensd binnen de loop — review-finding). */
const STRATEGY_STEP_DEADLINE_MS = 6 * 60 * 1000;

async function withStepDeadline<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} exceeded ${Math.round(STRATEGY_STEP_DEADLINE_MS / 1000)}s and was aborted`)),
          STRATEGY_STEP_DEADLINE_MS,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function errorResult(err: unknown, code: string): ToolExecuteResult {
  return {
    content: { error: err instanceof Error ? err.message : String(err) },
    isError: true,
    errorCode: code,
  };
}

// ─── Research Analyst ────────────────────────────────────────

export const runDeepResearchTool: BrandclawTool = {
  definition: {
    name: "run_deep_research",
    description:
      "Run a full multi-source deep-research pipeline (search, read, verify, synthesize) on a topic, grounded in the workspace brand context. The full cited report is saved to the Knowledge Library and attached to this run automatically — you receive a summary back. Expensive and slow (minutes): call at most once per run.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The research question or topic, as specific as possible.",
        },
      },
      required: ["topic"],
    },
  },
  async execute(input, ctx) {
    const topic = typeof input.topic === "string" ? input.topic.trim() : "";
    if (!topic) {
      return { content: { error: "topic is required" }, isError: true, errorCode: "INVALID_INPUT" };
    }
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), DEEP_RESEARCH_DEADLINE_MS + 30_000);
    try {
      const researchPromise = runDeepResearch({
        workspaceId: ctx.workspaceId,
        topic,
        answers: [],
        useBrandContext: true,
        sendEvent: () => {
          /* non-SSE caller — voortgang is niet zichtbaar nodig in de loop */
        },
        signal: controller.signal,
        // Gereduceerde config (task-risico pipeline-in-loop-wallclock):
        // compacter dan de Knowledge-Library-run; verify uit voor tempo —
        // de agent benoemt onzekerheid zelf in zijn samenvatting.
        config: {
          maxSearchQueries: 3,
          maxSourcesToScrape: 6,
          enableVerify: false,
          deadlineMs: DEEP_RESEARCH_DEADLINE_MS,
        },
      });
      // Harde bovengrens: ook als een fase de abort negeert, komt de tool
      // binnen de agent-run-guard terug met een eerlijke fout.
      const report = await Promise.race([
        researchPromise,
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Deep research exceeded ${Math.round(DEEP_RESEARCH_HARD_KILL_MS / 1000)}s and was aborted — try a narrower topic.`,
                ),
              ),
            DEEP_RESEARCH_HARD_KILL_MS,
          ),
        ),
      ]);

      // Domain-first write-through: rapport direct in de Knowledge Library.
      const resource = await prisma.knowledgeResource.create({
        data: {
          workspaceId: ctx.workspaceId,
          title: report.suggestedTitle,
          description:
            report.summary.slice(0, 240) || "Agent-generated deep-research report.",
          type: "article",
          category: report.suggestedCategory ?? "",
          tags: (report.suggestedTags ?? []) as unknown as Prisma.InputJsonValue,
          content: report.markdown.slice(0, 200_000),
          aiSummary: report.summary,
          aiKeyTakeaways: (report.keyTakeaways ?? []) as unknown as Prisma.InputJsonValue,
          source: "AGENT",
          importedMetadata: { sources: report.sources } as unknown as Prisma.InputJsonValue,
        },
      });
      invalidateCache(cacheKeys.prefixes.knowledgeResources(ctx.workspaceId));

      // Server-owned artefacten: byte-exact rapport + deep-link.
      recordArtifact(ctx.runId, {
        type: "REPORT",
        title: report.suggestedTitle,
        content: { markdown: report.markdown, knowledgeResourceId: resource.id },
      });
      recordArtifact(ctx.runId, {
        type: "LINK",
        title: `Saved to Knowledge Library: ${report.suggestedTitle}`,
        content: {
          entityType: "knowledgeResource",
          entityId: resource.id,
          label: report.suggestedTitle,
        },
      });

      return {
        content: {
          status: "report_created",
          knowledgeResourceId: resource.id,
          title: report.suggestedTitle,
          summary: report.summary,
          keyTakeaways: report.keyTakeaways,
          sourceCount: report.sources.length,
          warnings: report.warnings,
          note: "The full report is saved to the Knowledge Library and attached to this run as a REPORT artifact. Summarize the key findings in your final answer — do NOT reproduce the full report.",
        },
      };
    } catch (err) {
      return errorResult(err, "DEEP_RESEARCH_FAILED");
    } finally {
      clearTimeout(abortTimer);
    }
  },
};

// ─── Strategist ──────────────────────────────────────────────

const CAMPAIGN_INPUT_PROPERTIES = {
  campaign_name: {
    type: "string",
    description: "Working name for the campaign or strategic initiative.",
  },
  campaign_description: {
    type: "string",
    description: "Short description of what the campaign should achieve.",
  },
  goal_type: {
    type: "string",
    description:
      "Campaign goal type, e.g. BRAND_AWARENESS, LEAD_GENERATION, CONVERSION, ENGAGEMENT. Defaults to BRAND_AWARENESS.",
  },
} as const;

interface CampaignToolInput {
  campaignName: string;
  campaignDescription?: string;
  campaignGoalType?: string;
}

function parseCampaignInput(input: Record<string, unknown>): CampaignToolInput | null {
  const campaignName =
    typeof input.campaign_name === "string" ? input.campaign_name.trim() : "";
  if (!campaignName) return null;
  return {
    campaignName,
    campaignDescription:
      typeof input.campaign_description === "string" ? input.campaign_description : undefined,
    campaignGoalType: typeof input.goal_type === "string" ? input.goal_type : undefined,
  };
}

export const buildStrategyFoundationTool: BrandclawTool = {
  definition: {
    name: "build_strategy_foundation",
    description:
      "Build an evidence-based strategy foundation (audience insights, positioning, strategic direction) for a campaign idea, grounded in the workspace brand DNA. Returns the structured foundation. Slow (~1-2 min).",
    input_schema: {
      type: "object",
      properties: { ...CAMPAIGN_INPUT_PROPERTIES },
      required: ["campaign_name"],
    },
  },
  async execute(input, ctx) {
    const parsed = parseCampaignInput(input);
    if (!parsed) {
      return { content: { error: "campaign_name is required" }, isError: true, errorCode: "INVALID_INPUT" };
    }
    try {
      const { foundation } = await withStepDeadline(buildStrategyFoundation({
        workspaceId: ctx.workspaceId,
        wizardContext: parsed,
        pipelineConfig: AGENT_PIPELINE_CONFIG,
      }), "build_strategy_foundation");
      return { content: { foundation } };
    } catch (err) {
      return errorResult(err, "STRATEGY_FOUNDATION_FAILED");
    }
  },
};

export const mineInsightsTool: BrandclawTool = {
  definition: {
    name: "mine_insights",
    description:
      "Mine human insights (tensions, category conventions, human truths) for a campaign idea, grounded in brand/persona/competitor/trend context. Returns a list of candidate insights to build concepts on. Slow (~1-2 min).",
    input_schema: {
      type: "object",
      properties: { ...CAMPAIGN_INPUT_PROPERTIES },
      required: ["campaign_name"],
    },
  },
  async execute(input, ctx) {
    const parsed = parseCampaignInput(input);
    if (!parsed) {
      return { content: { error: "campaign_name is required" }, isError: true, errorCode: "INVALID_INPUT" };
    }
    try {
      const pipelineCtx = await buildCreativePipelineContext(ctx.workspaceId, {
        wizardContext: parsed,
        pipelineConfig: AGENT_PIPELINE_CONFIG,
      });
      const result = await withStepDeadline(generateInsights(pipelineCtx), "mine_insights");
      return { content: { insights: result.insights } };
    } catch (err) {
      return errorResult(err, "INSIGHT_MINING_FAILED");
    }
  },
};

export const generateCreativeConceptsTool: BrandclawTool = {
  definition: {
    name: "generate_creative_concepts",
    description:
      "Generate creative campaign concepts seeded by a selected insight (pass one insight object exactly as returned by mine_insights). Returns candidate concepts. Slow (~1-2 min).",
    input_schema: {
      type: "object",
      properties: {
        ...CAMPAIGN_INPUT_PROPERTIES,
        insight: {
          type: "object",
          description: "One insight object exactly as returned by mine_insights.",
        },
      },
      required: ["campaign_name", "insight"],
    },
  },
  async execute(input, ctx) {
    const parsed = parseCampaignInput(input);
    const insight = input.insight;
    if (!parsed || !insight || typeof insight !== "object") {
      return {
        content: { error: "campaign_name and insight (object from mine_insights) are required" },
        isError: true,
        errorCode: "INVALID_INPUT",
      };
    }
    try {
      const pipelineCtx = await buildCreativePipelineContext(ctx.workspaceId, {
        wizardContext: parsed,
        pipelineConfig: AGENT_PIPELINE_CONFIG,
      });
      const result = await withStepDeadline(
        generateCreativeConcepts(pipelineCtx, insight as HumanInsight),
        "generate_creative_concepts",
      );
      return { content: { concepts: result.concepts } };
    } catch (err) {
      return errorResult(err, "CONCEPT_GENERATION_FAILED");
    }
  },
};

export const buildConceptStrategyTool: BrandclawTool = {
  definition: {
    name: "build_concept_driven_strategy",
    description:
      "Build the full strategy + architecture layers from a chosen concept and its seeding insight (pass both objects exactly as returned by the earlier tools). Returns the strategy blueprint core. Slow (~2-3 min).",
    input_schema: {
      type: "object",
      properties: {
        ...CAMPAIGN_INPUT_PROPERTIES,
        concept: {
          type: "object",
          description: "One concept object exactly as returned by generate_creative_concepts.",
        },
        insight: {
          type: "object",
          description: "The insight object that seeded the concept.",
        },
      },
      required: ["campaign_name", "concept", "insight"],
    },
  },
  async execute(input, ctx) {
    const parsed = parseCampaignInput(input);
    const { concept, insight } = input;
    if (!parsed || !concept || typeof concept !== "object" || !insight || typeof insight !== "object") {
      return {
        content: { error: "campaign_name, concept and insight objects are required" },
        isError: true,
        errorCode: "INVALID_INPUT",
      };
    }
    try {
      const pipelineCtx = await buildCreativePipelineContext(ctx.workspaceId, {
        wizardContext: parsed,
        pipelineConfig: AGENT_PIPELINE_CONFIG,
      });
      const result = await withStepDeadline(
        buildConceptDrivenStrategy(pipelineCtx, concept as CreativeConcept, insight as HumanInsight),
        "build_concept_driven_strategy",
      );
      return { content: { strategy: result.strategy, architecture: result.architecture } };
    } catch (err) {
      return errorResult(err, "CONCEPT_STRATEGY_FAILED");
    }
  },
};
