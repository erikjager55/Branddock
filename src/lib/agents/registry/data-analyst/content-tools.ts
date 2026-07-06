// =============================================================
// Data Analyst — curated query-tools: content-domein.
//
// Vier read-only tools op de content-data van de workspace. Elke tool is
// een vaste, hand-geschreven Prisma-query (geen query-builder, geen vrije
// SQL vanuit het model) die zijn resultaat als server-owned TABLE-artefact
// registreert via recordTableArtifact — het model krijgt een compacte
// samenvatting + preview terug en kan tabel-cijfers dus niet verzinnen.
//
// Raw SQL komt uitsluitend voor als vaste, geparametriseerde tagged-
// template ($queryRaw) voor date_trunc-maandaggregaties — Prisma groupBy
// kan niet op een afgeleide maand groeperen en een row-fetch + JS-telling
// zou op volle workspaces een cap nodig hebben die de cijfers stil
// vervalst (task-risico "grote aggregaties").
// =============================================================

import { prisma } from "@/lib/prisma";
import type { BrandclawTool } from "@/lib/brandclaw/orchestrator/types";
import { MAX_TABLE_ROWS, recordTableArtifact } from "./table-contract";
import {
  clampInt,
  errorResult,
  monthWindowStart,
  pickEnum,
  sinceDaysAgo,
} from "./shared";

// ─── 1. Content-productie per maand ──────────────────────────
// Query: date_trunc('month') over Deliverable JOIN Campaign, hard op
// Campaign.workspaceId; counts per status + published. LIMIT = months (≤24).

export const queryContentProductionTool: BrandclawTool = {
  definition: {
    name: "query_content_production",
    description:
      "Monthly content-production counts for this workspace: deliverables created per month, split by status (not started / in progress / completed) plus how many are published. Result is attached as a TABLE artifact automatically. Use for questions about content volume and production trends over time.",
    input_schema: {
      type: "object",
      properties: {
        months: {
          type: "number",
          description: "How many months back to include (1-24). Default 12.",
        },
      },
    },
  },
  async execute(input, ctx) {
    const months = clampInt(input.months, 12, 1, 24);
    const since = monthWindowStart(months);
    try {
      const rows = await prisma.$queryRaw<
        Array<{
          month: string;
          total: number;
          completed: number;
          in_progress: number;
          not_started: number;
          published: number;
        }>
      >`
        SELECT to_char(date_trunc('month', d."createdAt"), 'YYYY-MM') AS month,
               count(*)::int AS total,
               count(*) FILTER (WHERE d."status"::text = 'COMPLETED')::int AS completed,
               count(*) FILTER (WHERE d."status"::text = 'IN_PROGRESS')::int AS in_progress,
               count(*) FILTER (WHERE d."status"::text = 'NOT_STARTED')::int AS not_started,
               count(*) FILTER (WHERE d."publishedAt" IS NOT NULL)::int AS published
        FROM "Deliverable" d
        JOIN "Campaign" c ON c.id = d."campaignId"
        WHERE c."workspaceId" = ${ctx.workspaceId}
          AND d."createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT ${months}
      `;

      const totalCreated = rows.reduce((sum, r) => sum + r.total, 0);
      return {
        content: recordTableArtifact(ctx, {
          title: `Content production per month (last ${months} months)`,
          content: {
            columns: [
              { key: "month", label: "Month", type: "text" },
              { key: "total", label: "Created", type: "number" },
              { key: "notStarted", label: "Not started", type: "number" },
              { key: "inProgress", label: "In progress", type: "number" },
              { key: "completed", label: "Completed", type: "number" },
              { key: "published", label: "Published", type: "number" },
            ],
            rows: rows.map((r) => ({
              month: r.month,
              total: r.total,
              notStarted: r.not_started,
              inProgress: r.in_progress,
              completed: r.completed,
              published: r.published,
            })),
            summary: `${totalCreated} deliverables created in the last ${months} months (${rows.length} months with activity).`,
          },
        }),
      };
    } catch (err) {
      return errorResult(err, "QUERY_CONTENT_PRODUCTION_FAILED");
    }
  },
};

// ─── 2. Content-inventaris per type × status ─────────────────
// Query: Deliverable.groupBy(['contentType','status']) where
// campaign.workspaceId — gepivoteerd naar één rij per contentType.

export const queryContentInventoryTool: BrandclawTool = {
  definition: {
    name: "query_content_inventory",
    description:
      "Current content inventory of this workspace: one row per content type with counts per status (not started / in progress / completed) and a total. Result is attached as a TABLE artifact automatically. Use for questions about what content exists and where it stands.",
    input_schema: { type: "object", properties: {} },
  },
  async execute(_input, ctx) {
    try {
      const groups = await prisma.deliverable.groupBy({
        by: ["contentType", "status"],
        where: { campaign: { workspaceId: ctx.workspaceId } },
        _count: { _all: true },
      });

      const byType = new Map<
        string,
        { notStarted: number; inProgress: number; completed: number; total: number }
      >();
      for (const g of groups) {
        const entry =
          byType.get(g.contentType) ?? { notStarted: 0, inProgress: 0, completed: 0, total: 0 };
        const count = g._count._all;
        if (g.status === "NOT_STARTED") entry.notStarted += count;
        else if (g.status === "IN_PROGRESS") entry.inProgress += count;
        else if (g.status === "COMPLETED") entry.completed += count;
        entry.total += count;
        byType.set(g.contentType, entry);
      }

      const rows = Array.from(byType.entries())
        .map(([contentType, counts]) => ({ contentType, ...counts }))
        .sort((a, b) => b.total - a.total || a.contentType.localeCompare(b.contentType))
        .slice(0, MAX_TABLE_ROWS);
      const totalDeliverables = groups.reduce((sum, g) => sum + g._count._all, 0);

      return {
        content: recordTableArtifact(ctx, {
          title: "Content inventory by type and status",
          content: {
            columns: [
              { key: "contentType", label: "Content type", type: "text" },
              { key: "notStarted", label: "Not started", type: "number" },
              { key: "inProgress", label: "In progress", type: "number" },
              { key: "completed", label: "Completed", type: "number" },
              { key: "total", label: "Total", type: "number" },
            ],
            rows,
            summary: `${totalDeliverables} deliverables across ${byType.size} content types.`,
          },
        }),
      };
    } catch (err) {
      return errorResult(err, "QUERY_CONTENT_INVENTORY_FAILED");
    }
  },
};

// ─── 3. F-VAL-scoreverloop (ContentReviewLog) ────────────────
// Query: date_trunc('month') aggregatie over ContentReviewLog op
// workspaceId + createdAt-window; avg/min/max compositeScore per maand.

export const queryFvalScoresTool: BrandclawTool = {
  definition: {
    name: "query_fval_scores",
    description:
      "Brand-fidelity (F-VAL) score trend from the content review log: per month the number of reviews and the average/lowest/highest composite score (0-100). Result is attached as a TABLE artifact automatically. Use for questions about brand-fidelity trends and review activity.",
    input_schema: {
      type: "object",
      properties: {
        sinceDays: {
          type: "number",
          description: "Time-window in days (1-365). Default 90.",
        },
      },
    },
  },
  async execute(input, ctx) {
    const sinceDays = clampInt(input.sinceDays, 90, 1, 365);
    const since = sinceDaysAgo(sinceDays);
    try {
      const rows = await prisma.$queryRaw<
        Array<{ month: string; reviews: number; avg_score: number; min_score: number; max_score: number }>
      >`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
               count(*)::int AS reviews,
               round(avg("compositeScore")::numeric, 1)::float8 AS avg_score,
               round(min("compositeScore")::numeric, 1)::float8 AS min_score,
               round(max("compositeScore")::numeric, 1)::float8 AS max_score
        FROM "ContentReviewLog"
        WHERE "workspaceId" = ${ctx.workspaceId}
          AND "createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 13
      `;

      const totalReviews = rows.reduce((sum, r) => sum + r.reviews, 0);
      const overallAvg =
        totalReviews > 0
          ? Math.round(
              (rows.reduce((sum, r) => sum + r.avg_score * r.reviews, 0) / totalReviews) * 10,
            ) / 10
          : null;

      return {
        content: recordTableArtifact(ctx, {
          title: `F-VAL score trend (last ${sinceDays} days)`,
          content: {
            columns: [
              { key: "month", label: "Month", type: "text" },
              { key: "reviews", label: "Reviews", type: "number" },
              { key: "avgScore", label: "Avg score", type: "number" },
              { key: "minScore", label: "Lowest", type: "number" },
              { key: "maxScore", label: "Highest", type: "number" },
            ],
            rows: rows.map((r) => ({
              month: r.month,
              reviews: r.reviews,
              avgScore: r.avg_score,
              minScore: r.min_score,
              maxScore: r.max_score,
            })),
            summary:
              totalReviews > 0
                ? `${totalReviews} content reviews in the last ${sinceDays} days; weighted average composite score ${overallAvg}.`
                : `No content reviews found in the last ${sinceDays} days.`,
          },
        }),
      };
    } catch (err) {
      return errorResult(err, "QUERY_FVAL_SCORES_FAILED");
    }
  },
};

// ─── 4. Persona-/product-dekking in content ──────────────────
// Query: Persona/Product.findMany (workspace) + CampaignKnowledgeAsset-links
// (via campaign.workspaceId, non-archived) + Deliverable.groupBy(campaignId).
// JS-join telt per persona/product de gelinkte campagnes + deliverables.

const COVERAGE_DIMENSIONS = ["personas", "products"] as const;

export const queryContentCoverageTool: BrandclawTool = {
  definition: {
    name: "query_content_coverage",
    description:
      "Coverage of personas or products in content: per persona/product how many (non-archived) campaigns link it as knowledge context and how many deliverables those campaigns contain. Sorted least-covered first. Result is attached as a TABLE artifact automatically. Use for questions like 'which personas have the least content?'.",
    input_schema: {
      type: "object",
      properties: {
        dimension: {
          type: "string",
          enum: [...COVERAGE_DIMENSIONS],
          description: "Which entity to measure coverage for: 'personas' or 'products'.",
        },
      },
      required: ["dimension"],
    },
  },
  async execute(input, ctx) {
    const dimension = pickEnum(input.dimension, COVERAGE_DIMENSIONS, null);
    if (!dimension) {
      return {
        content: { error: "dimension must be 'personas' or 'products'" },
        isError: true,
        errorCode: "INVALID_INPUT",
      };
    }
    try {
      const entities =
        dimension === "personas"
          ? await prisma.persona.findMany({
              where: { workspaceId: ctx.workspaceId },
              select: { id: true, name: true },
              orderBy: { createdAt: "asc" },
              take: MAX_TABLE_ROWS,
            })
          : await prisma.product.findMany({
              where: { workspaceId: ctx.workspaceId },
              select: { id: true, name: true },
              orderBy: { createdAt: "asc" },
              take: MAX_TABLE_ROWS,
            });

      // Links workspace-gescoped via de campaign-relatie; sourceType is een
      // vaste literal uit de CONTEXT_REGISTRY, geen user-input.
      const linkFilter =
        dimension === "personas"
          ? { OR: [{ personaId: { not: null } }, { sourceType: "persona" }] }
          : { OR: [{ productId: { not: null } }, { sourceType: "product" }] };
      const links = await prisma.campaignKnowledgeAsset.findMany({
        where: { campaign: { workspaceId: ctx.workspaceId, isArchived: false }, ...linkFilter },
        select: { campaignId: true, personaId: true, productId: true, sourceType: true, sourceId: true },
        take: 5_000,
      });
      const linksTruncated = links.length === 5_000;

      const deliverableCounts = await prisma.deliverable.groupBy({
        by: ["campaignId"],
        where: { campaign: { workspaceId: ctx.workspaceId, isArchived: false } },
        _count: { _all: true },
      });
      const deliverablesByCampaign = new Map(
        deliverableCounts.map((d) => [d.campaignId, d._count._all]),
      );

      const campaignsByEntity = new Map<string, Set<string>>();
      const expectedSourceType = dimension === "personas" ? "persona" : "product";
      for (const link of links) {
        const entityId =
          (dimension === "personas" ? link.personaId : link.productId) ??
          (link.sourceType === expectedSourceType ? link.sourceId : null);
        if (!entityId) continue;
        const set = campaignsByEntity.get(entityId) ?? new Set<string>();
        set.add(link.campaignId);
        campaignsByEntity.set(entityId, set);
      }

      const rows = entities
        .map((entity) => {
          const campaigns = campaignsByEntity.get(entity.id) ?? new Set<string>();
          const deliverables = Array.from(campaigns).reduce(
            (sum, campaignId) => sum + (deliverablesByCampaign.get(campaignId) ?? 0),
            0,
          );
          return { name: entity.name, linkedCampaigns: campaigns.size, deliverables };
        })
        .sort((a, b) => a.deliverables - b.deliverables || a.name.localeCompare(b.name));

      const uncovered = rows.filter((r) => r.linkedCampaigns === 0).length;
      const label = dimension === "personas" ? "personas" : "products";
      return {
        content: recordTableArtifact(ctx, {
          title: dimension === "personas" ? "Persona coverage in content" : "Product coverage in content",
          content: {
            columns: [
              { key: "name", label: dimension === "personas" ? "Persona" : "Product", type: "text" },
              { key: "linkedCampaigns", label: "Linked campaigns", type: "number" },
              { key: "deliverables", label: "Deliverables in those campaigns", type: "number" },
            ],
            rows,
            summary:
              `${rows.length} ${label}; ${uncovered} without any campaign link (least covered listed first).` +
              (linksTruncated ? " Note: link data was capped at 5000 rows — counts may be incomplete." : ""),
          },
        }),
      };
    } catch (err) {
      return errorResult(err, "QUERY_CONTENT_COVERAGE_FAILED");
    }
  },
};
