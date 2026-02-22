import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Select constants — limit columns fetched for list views
// ---------------------------------------------------------------------------

export const CAMPAIGN_LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  type: true,
  status: true,
  confidence: true,
  campaignGoalType: true,
  description: true,
  contentType: true,
  contentCategory: true,
  qualityScore: true,
  isArchived: true,
  isLocked: true,
  startDate: true,
  endDate: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { knowledgeAssets: true, deliverables: true, teamMembers: true } },
} as const;

export const BRAND_ASSET_LIST_SELECT = {
  id: true,
  name: true,
  status: true,
  description: true,
  updatedAt: true,
} as const;

export const PRODUCT_LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  category: true,
  source: true,
  status: true,
  pricingModel: true,
  categoryIcon: true,
  features: true,
  isLocked: true,
  updatedAt: true,
  _count: { select: { linkedPersonas: true } },
} as const;

export const INSIGHT_LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  category: true,
  scope: true,
  impactLevel: true,
  timeframe: true,
  relevanceScore: true,
  source: true,
  industries: true,
  tags: true,
  howToUse: true,
  useBrandContext: true,
  createdAt: true,
  updatedAt: true,
  sourceUrls: { select: { id: true, name: true, url: true }, take: 3 },
} as const;

export const KNOWLEDGE_RESOURCE_LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  type: true,
  category: true,
  author: true,
  url: true,
  estimatedDuration: true,
  rating: true,
  isFavorite: true,
  isFeatured: true,
  createdAt: true,
} as const;

export const ALIGNMENT_ISSUE_LIST_SELECT = {
  id: true,
  severity: true,
  title: true,
  modulePath: true,
  description: true,
  conflictsWith: true,
  recommendation: true,
  status: true,
  dismissedAt: true,
  dismissReason: true,
  fixAppliedAt: true,
  fixOption: true,
  sourceItemId: true,
  sourceItemType: true,
  targetItemId: true,
  targetItemType: true,
  scanId: true,
} as const;

export const NOTIFICATION_LIST_SELECT = {
  id: true,
  type: true,
  title: true,
  description: true,
  category: true,
  isRead: true,
  actionUrl: true,
  actorName: true,
  createdAt: true,
} as const;

export const PERSONA_RESEARCH_METHOD_SELECT = {
  id: true,
  method: true,
  status: true,
  progress: true,
  completedAt: true,
  artifactsCount: true,
} as const;

// ---------------------------------------------------------------------------
// getCampaignStats — replaces findMany + filter().length + reduce
// ---------------------------------------------------------------------------

export async function getCampaignStats(workspaceId: string) {
  const [active, quick, completed, totalContent] = await Promise.all([
    prisma.campaign.count({
      where: { workspaceId, isArchived: false, type: "STRATEGIC", status: "ACTIVE" },
    }),
    prisma.campaign.count({
      where: { workspaceId, isArchived: false, type: "QUICK", status: "ACTIVE" },
    }),
    prisma.campaign.count({
      where: { workspaceId, isArchived: false, status: "COMPLETED" },
    }),
    prisma.deliverable.count({
      where: { campaign: { workspaceId, isArchived: false } },
    }),
  ]);

  return { active, quick, completed, totalContent };
}

// ---------------------------------------------------------------------------
// getBrandAssetStatusCounts — replaces findMany + 4x filter().length
// ---------------------------------------------------------------------------

export async function getBrandAssetStatusCounts(workspaceId: string) {
  const [total, ready, needsAttention, inProgress, draft] = await Promise.all([
    prisma.brandAsset.count({ where: { workspaceId } }),
    prisma.brandAsset.count({ where: { workspaceId, status: "READY" } }),
    prisma.brandAsset.count({ where: { workspaceId, status: "NEEDS_ATTENTION" } }),
    prisma.brandAsset.count({ where: { workspaceId, status: "IN_PROGRESS" } }),
    prisma.brandAsset.count({ where: { workspaceId, status: "DRAFT" } }),
  ]);

  return { total, ready, needsAttention, inProgress, draft };
}

// ---------------------------------------------------------------------------
// getDashboardReadiness — getBrandAssetStatusCounts + percentage calc
// ---------------------------------------------------------------------------

export async function getDashboardReadiness(workspaceId: string) {
  const counts = await getBrandAssetStatusCounts(workspaceId);
  const percentage =
    counts.total > 0 ? Math.round((counts.ready / counts.total) * 100) : 0;

  return {
    percentage,
    breakdown: {
      ready: counts.ready,
      needAttention: counts.inProgress + counts.needsAttention,
      inProgress: counts.draft,
    },
  };
}

// ---------------------------------------------------------------------------
// getDashboardStats — getBrandAssetStatusCounts + campaign/deliverable counts
// ---------------------------------------------------------------------------

export async function getDashboardStats(workspaceId: string) {
  const [counts, activeCampaigns, contentCreated] = await Promise.all([
    getBrandAssetStatusCounts(workspaceId),
    prisma.campaign.count({ where: { workspaceId, status: "ACTIVE" } }),
    prisma.deliverable.count({
      where: { campaign: { workspaceId }, status: "COMPLETED" },
    }),
  ]);

  return {
    readyToUse: counts.ready,
    needAttention: counts.inProgress + counts.needsAttention,
    inProgress: counts.draft,
    activeCampaigns,
    contentCreated,
  };
}
