import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/export/brand-kit/data
//
// Aggregates full brand data for the active workspace into a
// single structured payload that the client-side ZIP builder
// consumes to produce a Claude Design compatible brand kit.
//
// Returns full records (not the reduced AI-prompt context from
// brand-context.ts) because the export needs all fields incl.
// logo URLs, framework data, media references, etc.
// =============================================================

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const [
      workspace,
      styleguide,
      brandAssets,
      personas,
      products,
      competitors,
    ] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          id: true,
          name: true,
          slug: true,
          contentLanguage: true,
          createdAt: true,
          organization: {
            select: { name: true, type: true, logoUrl: true },
          },
        },
      }),

      prisma.brandStyleguide.findFirst({
        where: { workspaceId },
        include: {
          colors: { orderBy: { sortOrder: "asc" } },
          logos: { orderBy: { sortOrder: "asc" } },
        },
      }),

      prisma.brandAsset.findMany({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          description: true,
          content: true,
          frameworkType: true,
          frameworkData: true,
          status: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      prisma.persona.findMany({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          tagline: true,
          avatarUrl: true,
          age: true,
          gender: true,
          location: true,
          occupation: true,
          income: true,
          education: true,
          familyStatus: true,
          personalityType: true,
          coreValues: true,
          interests: true,
          goals: true,
          motivations: true,
          frustrations: true,
          behaviors: true,
          preferredChannels: true,
          techStack: true,
          buyingTriggers: true,
          decisionCriteria: true,
          quote: true,
          bio: true,
          strategicImplications: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      prisma.product.findMany({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          category: true,
          description: true,
          pricingModel: true,
          pricingDetails: true,
          features: true,
          benefits: true,
          useCases: true,
          sourceUrl: true,
          images: {
            select: {
              url: true,
              category: true,
              altText: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),

      prisma.competitor.findMany({
        where: { workspaceId, status: "ANALYZED" },
        select: {
          id: true,
          name: true,
          tier: true,
          competitiveScore: true,
          websiteUrl: true,
          logoUrl: true,
          description: true,
          foundingYear: true,
          headquarters: true,
          employeeRange: true,
          valueProposition: true,
          targetAudience: true,
          differentiators: true,
          mainOfferings: true,
          pricingModel: true,
          strengths: true,
          weaknesses: true,
          toneOfVoice: true,
          messagingThemes: true,
          visualStyleNotes: true,
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json({
      workspace,
      styleguide,
      brandAssets,
      personas,
      products,
      competitors,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/export/brand-kit/data]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
