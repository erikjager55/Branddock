/**
 * Documents all composite indexes added to the Prisma schema.
 * These indexes optimise the most common query patterns where
 * routes filter by workspaceId + a second discriminator.
 *
 * Run `npx prisma db push` after changing schema.prisma to apply.
 */

export interface CompositeIndexDefinition {
  model: string;
  fields: string[];
  rationale: string;
}

export const COMPOSITE_INDEXES: CompositeIndexDefinition[] = [
  // BrandAsset
  { model: "BrandAsset", fields: ["workspaceId", "category"], rationale: "Dashboard and brand page filter by category" },
  { model: "BrandAsset", fields: ["workspaceId", "status"], rationale: "Readiness and stats endpoints count by status" },

  // Campaign
  { model: "Campaign", fields: ["workspaceId", "status"], rationale: "Campaign list/stats filter by status" },
  { model: "Campaign", fields: ["workspaceId", "type"], rationale: "Campaign stats count by type" },
  { model: "Campaign", fields: ["workspaceId", "isArchived"], rationale: "Campaign list excludes archived" },

  // MarketInsight
  { model: "MarketInsight", fields: ["workspaceId", "category"], rationale: "Insights page filters by category" },
  { model: "MarketInsight", fields: ["workspaceId", "impactLevel"], rationale: "Insights page filters by impact level" },

  // KnowledgeResource
  { model: "KnowledgeResource", fields: ["workspaceId", "type"], rationale: "Knowledge library filters by resource type" },
  { model: "KnowledgeResource", fields: ["workspaceId", "isArchived"], rationale: "Knowledge library excludes archived" },

  // AlignmentIssue
  { model: "AlignmentIssue", fields: ["workspaceId", "status"], rationale: "Alignment issues list filters by status" },
  { model: "AlignmentIssue", fields: ["workspaceId", "severity"], rationale: "Alignment issues list filters by severity" },

  // Product
  { model: "Product", fields: ["workspaceId", "status"], rationale: "Product list filters by status" },
  { model: "Product", fields: ["workspaceId", "category"], rationale: "Product list filters by category" },

  // BusinessStrategy
  { model: "BusinessStrategy", fields: ["workspaceId", "status"], rationale: "Strategy list filters by status" },

  // Workshop
  { model: "Workshop", fields: ["workspaceId", "status"], rationale: "Workshop list filters by status" },

  // Interview
  { model: "Interview", fields: ["workspaceId", "status"], rationale: "Interview list filters by status" },

  // AlignmentScan
  { model: "AlignmentScan", fields: ["workspaceId", "status"], rationale: "Scan history filters by status" },

  // ResearchStudy
  { model: "ResearchStudy", fields: ["workspaceId", "status"], rationale: "Research list filters by status" },

  // ValidationPlan
  { model: "ValidationPlan", fields: ["workspaceId", "status"], rationale: "Validation plan list filters by status" },

  // Persona
  { model: "Persona", fields: ["workspaceId", "createdAt"], rationale: "Persona list sorts by createdAt" },

  // PersonaChatSession — was missing workspaceId index entirely
  { model: "PersonaChatSession", fields: ["workspaceId"], rationale: "Basic workspace isolation (was missing)" },
  { model: "PersonaChatSession", fields: ["workspaceId", "personaId"], rationale: "Chat sessions filtered by persona within workspace" },

  // SupportTicket
  { model: "SupportTicket", fields: ["workspaceId", "status"], rationale: "Support ticket list filters by status" },

  // Invoice
  { model: "Invoice", fields: ["workspaceId", "status"], rationale: "Invoice list filters by status" },

  // Subscription — already has @@unique([workspaceId])
  { model: "Subscription", fields: ["status"], rationale: "Admin queries filter active subscriptions" },
];
