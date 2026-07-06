// =============================================================
// Data Analyst — curated query-tools: workspace-overzichten.
//
// Drie read-only tools op campagnes, concurrenten en agent-runs. Zelfde
// contract als content-tools.ts: vaste Prisma-queries, harde workspace-
// scope, rij-caps, server-owned TABLE-artefacten via recordTableArtifact.
// =============================================================

import { prisma } from "@/lib/prisma";
import type { BrandclawTool } from "@/lib/brandclaw/orchestrator/types";
import { MAX_TABLE_ROWS, recordTableArtifact } from "./table-contract";
import { clampInt, errorResult, isoDate, pickEnum, sinceDaysAgo } from "./shared";

// ─── 5. Campagne-overzicht met status ────────────────────────
// Query: Campaign.findMany (workspace, default non-archived) met
// _count.deliverables; aparte groupBy(status) voor exacte status-totalen
// (ook voorbij de 200-rij-cap).

const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;

export const queryCampaignOverviewTool: BrandclawTool = {
  definition: {
    name: "query_campaign_overview",
    description:
      "Overview of campaigns in this workspace: one row per campaign with type, status, deliverable count and creation date (most recently updated first). Result is attached as a TABLE artifact automatically. Use for questions about campaign status and workload.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: [...CAMPAIGN_STATUSES],
          description: "Optional status filter. Omit for all statuses.",
        },
        includeArchived: {
          type: "boolean",
          description: "Include archived campaigns. Default false.",
        },
      },
    },
  },
  async execute(input, ctx) {
    const status = pickEnum(input.status, CAMPAIGN_STATUSES, null);
    const includeArchived = input.includeArchived === true;
    try {
      const where = {
        workspaceId: ctx.workspaceId,
        ...(status ? { status } : {}),
        ...(includeArchived ? {} : { isArchived: false }),
      };
      const [campaigns, statusGroups] = await Promise.all([
        prisma.campaign.findMany({
          where,
          select: {
            title: true,
            type: true,
            status: true,
            createdAt: true,
            _count: { select: { deliverables: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: MAX_TABLE_ROWS,
        }),
        prisma.campaign.groupBy({ by: ["status"], where, _count: { _all: true } }),
      ]);

      const totalCampaigns = statusGroups.reduce((sum, g) => sum + g._count._all, 0);
      const statusSummary = statusGroups
        .map((g) => `${g._count._all} ${g.status}`)
        .sort()
        .join(", ");

      return {
        content: recordTableArtifact(ctx, {
          title: status ? `Campaign overview (${status})` : "Campaign overview",
          content: {
            columns: [
              { key: "title", label: "Campaign", type: "text" },
              { key: "type", label: "Type", type: "text" },
              { key: "status", label: "Status", type: "text" },
              { key: "deliverables", label: "Deliverables", type: "number" },
              { key: "created", label: "Created", type: "date" },
            ],
            rows: campaigns.map((c) => ({
              title: c.title,
              type: c.type,
              status: c.status,
              deliverables: c._count.deliverables,
              created: isoDate(c.createdAt),
            })),
            summary:
              totalCampaigns > 0
                ? `${totalCampaigns} campaigns (${statusSummary}).` +
                  (totalCampaigns > MAX_TABLE_ROWS
                    ? ` Table shows the ${MAX_TABLE_ROWS} most recently updated.`
                    : "")
                : "No campaigns found.",
          },
        }),
      };
    } catch (err) {
      return errorResult(err, "QUERY_CAMPAIGN_OVERVIEW_FAILED");
    }
  },
};

// ─── 6. Competitor-snapshot-activiteit ───────────────────────
// Query: Competitor.findMany (workspace) + CompetitorActivity.groupBy
// (competitorId × severity) binnen het window — beide op workspaceId.

export const queryCompetitorActivityTool: BrandclawTool = {
  definition: {
    name: "query_competitor_activity",
    description:
      "Competitor monitoring activity: one row per competitor with tier, status, total snapshots, detected activities in the time-window (and how many were major), and the last scrape date. Result is attached as a TABLE artifact automatically. Use for questions about competitor movement and monitoring freshness.",
    input_schema: {
      type: "object",
      properties: {
        sinceDays: {
          type: "number",
          description: "Time-window in days for activity counts (1-365). Default 90.",
        },
      },
    },
  },
  async execute(input, ctx) {
    const sinceDays = clampInt(input.sinceDays, 90, 1, 365);
    const since = sinceDaysAgo(sinceDays);
    try {
      const [competitors, activityGroups] = await Promise.all([
        prisma.competitor.findMany({
          where: { workspaceId: ctx.workspaceId },
          select: {
            id: true,
            name: true,
            tier: true,
            status: true,
            snapshotCount: true,
            lastScrapedAt: true,
          },
          orderBy: { name: "asc" },
          take: MAX_TABLE_ROWS,
        }),
        prisma.competitorActivity.groupBy({
          by: ["competitorId", "severity"],
          where: { workspaceId: ctx.workspaceId, detectedAt: { gte: since } },
          _count: { _all: true },
        }),
      ]);

      const activityByCompetitor = new Map<string, { total: number; major: number }>();
      for (const g of activityGroups) {
        const entry = activityByCompetitor.get(g.competitorId) ?? { total: 0, major: 0 };
        entry.total += g._count._all;
        if (g.severity === "MAJOR") entry.major += g._count._all;
        activityByCompetitor.set(g.competitorId, entry);
      }

      const totalActivities = activityGroups.reduce((sum, g) => sum + g._count._all, 0);
      return {
        content: recordTableArtifact(ctx, {
          title: `Competitor activity (last ${sinceDays} days)`,
          content: {
            columns: [
              { key: "name", label: "Competitor", type: "text" },
              { key: "tier", label: "Tier", type: "text" },
              { key: "status", label: "Status", type: "text" },
              { key: "snapshots", label: "Snapshots", type: "number" },
              { key: "activities", label: "Activities in window", type: "number" },
              { key: "major", label: "Major", type: "number" },
              { key: "lastScraped", label: "Last scraped", type: "date" },
            ],
            rows: competitors.map((c) => {
              const activity = activityByCompetitor.get(c.id) ?? { total: 0, major: 0 };
              return {
                name: c.name,
                tier: c.tier,
                status: c.status,
                snapshots: c.snapshotCount,
                activities: activity.total,
                major: activity.major,
                lastScraped: isoDate(c.lastScrapedAt),
              };
            }),
            summary: `${competitors.length} competitors; ${totalActivities} detected activities in the last ${sinceDays} days.`,
          },
        }),
      };
    } catch (err) {
      return errorResult(err, "QUERY_COMPETITOR_ACTIVITY_FAILED");
    }
  },
};

// ─── 7. Agent-run-kosten per agent ───────────────────────────
// Query: AgentRun.groupBy(agentId) voor counts/kosten/tokens/latency +
// groupBy(agentId × status) voor status-splits — dogfood voor de A7-
// kosten-instrumentatie (ADR D8: cost-data per run vanaf dag 1).

export const queryAgentRunCostsTool: BrandclawTool = {
  definition: {
    name: "query_agent_run_costs",
    description:
      "AI-agent usage and cost in this workspace: one row per agent with run counts (total / completed / failed), total cost in USD, average latency and token usage within the time-window. Result is attached as a TABLE artifact automatically. Use for questions about agent usage and AI spend.",
    input_schema: {
      type: "object",
      properties: {
        sinceDays: {
          type: "number",
          description: "Time-window in days (1-365). Default 30.",
        },
      },
    },
  },
  async execute(input, ctx) {
    const sinceDays = clampInt(input.sinceDays, 30, 1, 365);
    const since = sinceDaysAgo(sinceDays);
    try {
      const where = { workspaceId: ctx.workspaceId, createdAt: { gte: since } };
      const [totals, statusGroups] = await Promise.all([
        prisma.agentRun.groupBy({
          by: ["agentId"],
          where,
          _count: { _all: true },
          _sum: { totalCostUsd: true, inputTokens: true, outputTokens: true },
          _avg: { latencyMs: true },
        }),
        prisma.agentRun.groupBy({
          by: ["agentId", "status"],
          where,
          _count: { _all: true },
        }),
      ]);

      const statusByAgent = new Map<string, { completed: number; failed: number }>();
      for (const g of statusGroups) {
        const entry = statusByAgent.get(g.agentId) ?? { completed: 0, failed: 0 };
        if (g.status === "COMPLETED") entry.completed += g._count._all;
        if (g.status === "FAILED") entry.failed += g._count._all;
        statusByAgent.set(g.agentId, entry);
      }

      const rows = totals
        .map((g) => {
          const statuses = statusByAgent.get(g.agentId) ?? { completed: 0, failed: 0 };
          return {
            agent: g.agentId,
            runs: g._count._all,
            completed: statuses.completed,
            failed: statuses.failed,
            totalCostUsd: Math.round((g._sum.totalCostUsd?.toNumber() ?? 0) * 10_000) / 10_000,
            avgLatencySec: Math.round(((g._avg.latencyMs ?? 0) / 1000) * 10) / 10,
            inputTokens: g._sum.inputTokens ?? 0,
            outputTokens: g._sum.outputTokens ?? 0,
          };
        })
        .sort((a, b) => b.totalCostUsd - a.totalCostUsd || a.agent.localeCompare(b.agent))
        .slice(0, MAX_TABLE_ROWS);

      const totalRuns = rows.reduce((sum, r) => sum + r.runs, 0);
      const totalCost = Math.round(rows.reduce((sum, r) => sum + r.totalCostUsd, 0) * 10_000) / 10_000;

      return {
        content: recordTableArtifact(ctx, {
          title: `Agent usage and cost (last ${sinceDays} days)`,
          content: {
            columns: [
              { key: "agent", label: "Agent", type: "text" },
              { key: "runs", label: "Runs", type: "number" },
              { key: "completed", label: "Completed", type: "number" },
              { key: "failed", label: "Failed", type: "number" },
              { key: "totalCostUsd", label: "Cost (USD)", type: "number" },
              { key: "avgLatencySec", label: "Avg latency (s)", type: "number" },
              { key: "inputTokens", label: "Input tokens", type: "number" },
              { key: "outputTokens", label: "Output tokens", type: "number" },
            ],
            rows,
            summary: `${totalRuns} agent runs in the last ${sinceDays} days; total cost $${totalCost}.`,
          },
        }),
      };
    } catch (err) {
      return errorResult(err, "QUERY_AGENT_RUN_COSTS_FAILED");
    }
  },
};
