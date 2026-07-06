import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";
import { getUsageThisMonth } from "@/lib/stripe/usage-tracker";

// =============================================================
// GET /api/settings/billing/usage
// Returns usage data: seats, AI generations, research studies, storage.
// Seats/research/AI-generations zijn echte counts (AI = AiUsageRecord deze maand);
// storage-tracking is nog niet geïmplementeerd (toont 0).
// =============================================================
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    // Fetch subscription with plan, org member count, and research study count in parallel
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { organizationId: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const [subscription, memberCount, studyCount, aiUsage] = await Promise.all([
      prisma.subscription.findUnique({
        where: { workspaceId },
        include: { plan: true },
      }),
      prisma.organizationMember.count({
        where: { organizationId: workspace.organizationId },
      }),
      prisma.researchStudy.count({
        where: { workspaceId },
      }),
      getUsageThisMonth(workspaceId),
    ]);

    const plan = subscription?.plan;

    const usage = {
      seats: {
        used: memberCount,
        limit: plan?.maxSeats ?? 1,
      },
      aiGenerations: {
        used: aiUsage.callCount,
        limit: plan?.maxAiGenerations ?? 100,
      },
      researchStudies: {
        used: studyCount,
        limit: plan?.maxResearchStudies ?? 5,
      },
      storage: {
        // Storage-tracking is nog niet geïmplementeerd — 0 i.p.v. een fake waarde.
        usedGb: 0,
        limitGb: plan?.maxStorageGb ?? 5,
      },
    };

    return NextResponse.json({
      usage,
      // Top-level convenience fields for E2E test compatibility
      aiTokens: usage.aiGenerations,
    });
  } catch (error) {
    console.error("[GET /api/settings/billing/usage]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
