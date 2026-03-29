/**
 * Cleanup Demo Data Script
 *
 * Surgically removes all demo/seed data while preserving:
 * - Erik's user account + session (stays logged in)
 * - Organization "Branddock Agency" + workspace "Branddock Demo"
 * - 11 canonical brand assets (reset to DRAFT, empty content/framework)
 * - ExplorationConfig records (AI configuration)
 * - MediumEnrichment records with workspaceId: null (system defaults)
 *
 * Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" npx tsx scripts/cleanup-demo-data.ts
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL is required");
  process.exit(1);
}

// Safety guard: block production and cloud databases
if (process.env.NODE_ENV === "production") {
  console.error("ERROR: Cleanup is blocked in production (NODE_ENV=production).");
  process.exit(1);
}
const cloudHosts = [".neon.tech", ".supabase.co", ".amazonaws.com", ".render.com", ".railway.app", ".fly.dev", ".planetscale.com", ".cockroachlabs.cloud", ".digitalocean.com", ".azure.com"];
if (cloudHosts.some((host) => connectionString.includes(host))) {
  console.error("ERROR: Cleanup is blocked for cloud databases. Detected cloud host in DATABASE_URL.");
  process.exit(1);
}
// Check only the database name portion of the URL for "_test"
let isTestDb = false;
try {
  const dbName = new URL(connectionString).pathname.replace(/^\//, "");
  isTestDb = dbName.endsWith("_test") || dbName.includes("_test_");
} catch {
  // If URL parsing fails, fall through to SEED_CONFIRM check
}
if (!isTestDb && process.env.SEED_CONFIRM !== "yes") {
  console.error(
    "ERROR: Cleanup will DELETE demo data in this database.\n" +
    `  Database: ${connectionString.replace(/\/\/.*?@/, "//***@")}\n` +
    "  To confirm, run with: SEED_CONFIRM=yes npx tsx scripts/cleanup-demo-data.ts\n" +
    "  For test databases, use a URL containing '_test'."
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEMO_USER_ID = "demo-user-erik-001";
const DEMO_ORG_ID = "demo-org-branddock-001";
const DEMO_WORKSPACE_ID = "demo-workspace-branddock-001";

async function cleanup() {
  console.log("=== Branddock Demo Data Cleanup ===\n");
  console.log(`Database: ${connectionString?.replace(/\/\/.*?@/, "//***@")}`);
  console.log(`Preserving user: ${DEMO_USER_ID}`);
  console.log(`Preserving org: ${DEMO_ORG_ID}`);
  console.log(`Preserving workspace: ${DEMO_WORKSPACE_ID}\n`);

  // Pre-flight: verify Erik's user exists
  const erik = await prisma.user.findUnique({ where: { id: DEMO_USER_ID } });
  if (!erik) {
    console.error("ERROR: Demo user not found. Is the database seeded?");
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`Found user: ${erik.name} (${erik.email})\n`);

  // Count before
  const beforeCounts = await getCounts();
  console.log("Before cleanup:");
  for (const [table, count] of Object.entries(beforeCounts)) {
    if (count > 0) console.log(`  ${table}: ${count}`);
  }
  console.log();

  // ============================================
  // DELETE — in reverse dependency order
  // ============================================

  console.log("Deleting demo data...\n");

  // S9: Settings & Help
  await del("appearancePreference");
  await del("notificationPreference");
  await del("invoice");
  await del("paymentMethod");
  await del("subscription");
  await del("plan");
  await del("connectedAccount");
  await del("emailPreference");
  await del("userPassword");
  await del("userProfile");
  await del("platformRating");
  await del("featureVote");
  await del("featureRequest");
  await del("supportTicket");
  await del("faqItem");
  await del("videoTutorial");
  await del("helpArticle");
  await del("helpCategory");
  await del("processedStripeEvent");
  await del("aiUsageRecord");

  // Auth — preserve Erik's session + account
  await del("session", { where: { userId: { not: DEMO_USER_ID } } });
  await del("account", { where: { userId: { not: DEMO_USER_ID } } });
  await del("verification");

  // Organization
  await del("invitation");
  await del("workspaceMemberAccess");

  // Personas — chat AI
  await del("personaChatContext");
  await del("personaChatInsight");
  await del("personaChatMessage");
  await del("personaChatSession");
  // PersonaChatConfig — keep? Plan says delete
  await del("personaChatConfig");
  await del("aIPersonaAnalysisMessage");
  await del("aIPersonaAnalysisSession");
  await del("personaResearchMethod");

  // Competitors
  await del("competitorProduct");
  await del("competitor");

  // Products
  await del("productImage");
  await del("productPersona");
  await del("product");

  // Personas
  await del("persona");

  // Brandstyle
  await del("styleguideColor");
  await del("brandStyleguide");

  // S6: Campaigns + Content Studio
  await del("deliverableComponent");
  await del("mediumEnrichment", { where: { workspaceId: { not: null } } }); // Keep system defaults (null workspaceId)
  await del("improveSuggestion");
  await del("insertedInsight");
  await del("contentVersion");
  await del("deliverable");
  await del("campaignKnowledgeAsset");
  await del("campaignTeamMember");
  await del("campaignTemplate");
  await del("campaignObjective");
  await del("campaignStrategy");
  await del("campaign");

  // Business Strategy
  await del("keyResult");
  await del("milestone");
  await del("progressSnapshot");
  await del("objective");
  await del("focusArea");
  await del("businessStrategy");

  // Workshops
  await del("interviewQuestion");
  await del("interviewAssetLink");
  await del("interview");
  await del("interviewQuestionTemplate");
  await del("workshopAgendaItem");
  await del("workshopObjective");
  await del("workshopPhoto");
  await del("workshopNote");
  await del("workshopParticipant");
  await del("workshopRecommendation");
  await del("workshopFinding");
  await del("workshopStep");
  await del("workshop");
  await del("workshopBundle");

  // Brand Assets — versions + research methods (assets themselves get RESET, not deleted)
  await del("brandAssetVersion");
  await del("brandAssetResearchMethod");

  // Dashboard + Notifications
  await del("notification");
  await del("dashboardPreference");

  // S5: Research & Validation
  await del("bundlePurchase");
  await del("researchStudy");
  await del("validationPlanMethod");
  await del("validationPlanAsset");
  await del("validationPlan");
  await del("bundleMethod");
  await del("bundleAsset");
  await del("researchBundle");

  // Knowledge
  await del("knowledgeResource");

  // Trends
  await del("detectedTrend");
  await del("trendResearchJob");
  await del("trend");

  // Market Insights (legacy)
  await del("insightSourceUrl");
  await del("marketInsight");

  // Brand Alignment
  await del("alignmentIssue");
  await del("moduleScore");
  await del("alignmentScan");
  await del("websiteScan");

  // Research
  await del("researchPlan");
  await del("purchasedBundle");

  // Versioning
  await del("resourceVersion");

  // AI Exploration — sessions + messages (configs are kept)
  await del("explorationMessage");
  await del("explorationSession");
  await del("itemKnowledgeSource");

  // WorkspaceAiConfig — keep (user-configured AI models)
  // ExplorationConfig + ExplorationKnowledgeItem — keep (AI configuration)

  // Delete demo users (NOT Erik)
  await del("organizationMember", { where: { userId: { not: DEMO_USER_ID } } });
  await del("user", { where: { id: { not: DEMO_USER_ID } } });

  // Delete other orgs and workspaces (keep Branddock Agency + Demo workspace)
  await del("workspace", { where: { id: { not: DEMO_WORKSPACE_ID } } });
  await del("organization", { where: { id: { not: DEMO_ORG_ID } } });

  // ============================================
  // RESET — brand assets to DRAFT with empty content
  // ============================================
  console.log("\nResetting brand assets to DRAFT...");
  const resetResult = await prisma.brandAsset.updateMany({
    where: { workspaceId: DEMO_WORKSPACE_ID },
    data: {
      status: "DRAFT",
      content: Prisma.DbNull,
      frameworkData: Prisma.DbNull,
      coveragePercentage: 0,
      isLocked: false,
      lockedById: null,
      lockedAt: null,
    },
  });
  console.log(`  Reset ${resetResult.count} brand assets to DRAFT\n`);

  // Re-create research methods (AI_EXPLORATION only, status AVAILABLE)
  console.log("Re-creating research methods...");
  const brandAssets = await prisma.brandAsset.findMany({
    where: { workspaceId: DEMO_WORKSPACE_ID },
    select: { id: true, name: true },
  });

  for (const asset of brandAssets) {
    await prisma.brandAssetResearchMethod.create({
      data: {
        brandAssetId: asset.id,
        method: "AI_EXPLORATION",
        status: "AVAILABLE",
        progress: 0,
        weight: 0.15,
        workspaceId: DEMO_WORKSPACE_ID,
      },
    });
  }
  console.log(`  Created ${brandAssets.length} AI_EXPLORATION research methods\n`);

  // Count after
  const afterCounts = await getCounts();
  console.log("After cleanup:");
  for (const [table, count] of Object.entries(afterCounts)) {
    if (count > 0) console.log(`  ${table}: ${count}`);
  }

  console.log("\n=== Cleanup complete ===");
  console.log("Preserved: Erik's user, session, org, workspace, brand assets (DRAFT), AI configs");
}

// Helper: delete with optional filter
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function del(model: string, options?: { where: Record<string, any> }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaModel = (prisma as any)[model] as {
    deleteMany: (args?: { where?: Record<string, unknown> }) => Promise<{ count: number }>;
  } | undefined;
  if (!prismaModel?.deleteMany) {
    console.log(`  SKIP ${model} (model not found)`);
    return;
  }
  const result = await prismaModel.deleteMany(options ?? undefined);
  if (result.count > 0) {
    console.log(`  Deleted ${result.count} from ${model}`);
  }
}

async function getCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const models = [
    "user", "organization", "workspace", "brandAsset", "persona",
    "product", "campaign", "competitor", "businessStrategy",
    "notification", "knowledgeResource", "detectedTrend",
    "alignmentScan", "explorationConfig",
  ];
  for (const model of models) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaModel = (prisma as any)[model] as {
      count: () => Promise<number>;
    } | undefined;
    if (prismaModel?.count) {
      counts[model] = await prismaModel.count();
    }
  }
  return counts;
}

cleanup()
  .catch(async (e) => {
    console.error("Cleanup failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
