import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';

/**
 * GET /api/workspace/export — Full workspace data export as JSON.
 * Fetches all modules in parallel and returns as attachment download.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    const w = { workspaceId };

    // Parallel fetch all module data
    const [
      workspace,
      brandAssets,
      personas,
      products,
      competitors,
      campaigns,
      trends,
      alignmentScans,
      explorationSessions,
      workshops,
      interviews,
      strategies,
      knowledgeResources,
      styleguide,
    ] = await Promise.all([
      // Workspace info
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true, slug: true, createdAt: true },
      }),

      // Brand Assets (all fields + framework data)
      prisma.brandAsset.findMany({
        where: w,
        select: {
          id: true, name: true, slug: true, category: true, status: true,
          description: true, content: true, frameworkType: true, frameworkData: true,
          isLocked: true, createdAt: true, updatedAt: true,
          researchMethods: {
            select: { method: true, status: true, progress: true, weight: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),

      // Personas
      prisma.persona.findMany({
        where: w,
        select: {
          id: true, name: true, tagline: true, location: true, occupation: true,
          quote: true, bio: true, age: true, gender: true, education: true,
          income: true, familyStatus: true, personalityType: true,
          coreValues: true, interests: true, goals: true, motivations: true,
          frustrations: true, behaviors: true, preferredChannels: true,
          buyingTriggers: true, strategicImplications: true,
          avatarUrl: true, avatarSource: true, isLocked: true,
          createdAt: true, updatedAt: true,
          researchMethods: {
            select: { method: true, status: true, progress: true, weight: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),

      // Products
      prisma.product.findMany({
        where: w,
        select: {
          id: true, name: true, slug: true, category: true, description: true,
          features: true, benefits: true, useCases: true,
          pricingModel: true, pricingDetails: true, source: true, sourceUrl: true,
          status: true, isLocked: true, createdAt: true, updatedAt: true,
          images: {
            select: { id: true, url: true, category: true, altText: true, sortOrder: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),

      // Competitors
      prisma.competitor.findMany({
        where: w,
        select: {
          id: true, name: true, slug: true, tier: true, status: true,
          websiteUrl: true, description: true, foundingYear: true, headquarters: true,
          employeeRange: true, valueProposition: true, targetAudience: true,
          differentiators: true, mainOfferings: true, pricingModel: true,
          pricingDetails: true, strengths: true, weaknesses: true,
          toneOfVoice: true, messagingThemes: true, visualStyleNotes: true,
          competitiveScore: true, isLocked: true, createdAt: true, updatedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),

      // Campaigns (with deliverables + strategy + knowledge)
      prisma.campaign.findMany({
        where: w,
        select: {
          id: true, title: true, slug: true, type: true, status: true,
          description: true, campaignGoalType: true, confidence: true,
          strategy: true, startDate: true, endDate: true,
          contentType: true, contentCategory: true, prompt: true, qualityScore: true,
          isArchived: true, createdAt: true, updatedAt: true,
          knowledgeAssets: {
            select: { id: true, assetType: true, brandAssetId: true, personaId: true, productId: true, assetName: true },
          },
          deliverables: {
            select: {
              id: true, title: true, contentType: true, status: true,
              generatedText: true, qualityScore: true, qualityMetrics: true,
              settings: true, createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Trends
      prisma.detectedTrend.findMany({
        where: w,
        select: {
          id: true, title: true, description: true, category: true, scope: true,
          impactLevel: true, timeframe: true, relevanceScore: true, direction: true,
          confidence: true, whyNow: true, aiAnalysis: true, dataPoints: true,
          sourceUrls: true, industries: true, tags: true, howToUse: true, scores: true,
          detectionSource: true, evidenceCount: true, isActivated: true, isDismissed: true,
          imageUrl: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Alignment Scans
      prisma.alignmentScan.findMany({
        where: w,
        select: {
          id: true, status: true, score: true,
          completedAt: true, startedAt: true,
          moduleScores: {
            select: { moduleName: true, score: true, alignedCount: true, reviewCount: true, misalignedCount: true },
          },
          issues: {
            select: {
              id: true, title: true, description: true, modulePath: true,
              severity: true, status: true, recommendation: true,
              sourceItemType: true, sourceItemId: true, targetItemType: true, targetItemId: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
      }),

      // AI Exploration Sessions (with messages + insights)
      prisma.explorationSession.findMany({
        where: w,
        select: {
          id: true, itemType: true, itemId: true, status: true,
          progress: true, totalDimensions: true, answeredDimensions: true,
          insightsData: true, metadata: true, createdAt: true,
          messages: {
            select: { id: true, type: true, content: true, orderIndex: true, metadata: true, createdAt: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Workshops (with findings + recommendations)
      prisma.workshop.findMany({
        where: { brandAsset: { workspaceId } },
        select: {
          id: true, title: true, status: true, scheduledDate: true, completedAt: true,
          durationMinutes: true, facilitatorName: true, executiveSummary: true, canvasData: true,
          findings: {
            select: { id: true, content: true, order: true, category: true },
          },
          recommendations: {
            select: { id: true, content: true, order: true, isCompleted: true },
          },
          participants: {
            select: { name: true, role: true, email: true },
          },
          notes: {
            select: { content: true, authorName: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Interviews
      prisma.interview.findMany({
        where: { brandAsset: { workspaceId } },
        select: {
          id: true, status: true, intervieweeName: true, intervieweePosition: true,
          intervieweeCompany: true, intervieweeEmail: true, scheduledDate: true,
          actualDuration: true, generalNotes: true, approvedAt: true,
          createdAt: true,
          questions: {
            select: { id: true, questionText: true, questionType: true, answerText: true, orderIndex: true, isAnswered: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Business Strategies (with objectives + key results + milestones)
      prisma.businessStrategy.findMany({
        where: w,
        select: {
          id: true, name: true, slug: true, type: true, status: true,
          description: true, vision: true, rationale: true, keyAssumptions: true,
          progressPercentage: true, startDate: true, endDate: true,
          strengths: true, weaknesses: true, opportunities: true, threats: true,
          createdAt: true, updatedAt: true,
          objectives: {
            select: {
              id: true, title: true, description: true, status: true,
              priority: true, metricType: true, targetValue: true, currentValue: true,
              keyResults: {
                select: { id: true, description: true, status: true, progressValue: true },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
          focusAreas: {
            select: { id: true, name: true, color: true },
          },
          milestones: {
            select: { id: true, title: true, status: true, quarter: true, date: true, completedAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Knowledge Resources
      prisma.knowledgeResource.findMany({
        where: w,
        select: {
          id: true, title: true, slug: true, type: true, category: true,
          description: true, url: true, author: true, rating: true,
          difficultyLevel: true, isFeatured: true, isFavorite: true,
          isArchived: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Brandstyle
      prisma.brandStyleguide.findFirst({
        where: w,
        select: {
          id: true, status: true, sourceUrl: true, sourceType: true,
          logoVariations: true, logoGuidelines: true, logoDonts: true,
          primaryFontName: true, primaryFontUrl: true, typeScale: true,
          contentGuidelines: true, writingGuidelines: true, examplePhrases: true,
          photographyStyle: true, photographyGuidelines: true, illustrationGuidelines: true, imageryDonts: true,
          graphicElements: true, patternsTextures: true, iconographyStyle: true, gradientsEffects: true,
          layoutPrinciples: true,
          createdAt: true,
          colors: {
            select: { id: true, hex: true, name: true, category: true, tags: true, notes: true },
          },
        },
      }),
    ]);

    const exportPayload = {
      metadata: {
        exportedAt: new Date().toISOString(),
        workspaceId,
        workspaceName: workspace?.name ?? 'Unknown',
        exportVersion: '1.0',
      },
      workspace,
      brandAssets,
      personas,
      products,
      competitors,
      campaigns,
      trends,
      alignmentScans,
      explorationSessions,
      workshops,
      interviews,
      strategies,
      knowledgeResources,
      brandstyle: styleguide,
    };

    const json = JSON.stringify(exportPayload, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="branddock-workspace-export-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error('GET /api/workspace/export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
