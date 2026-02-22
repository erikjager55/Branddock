import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { z } from "zod";
import { PERSONA_RESEARCH_METHOD_SELECT } from "@/lib/db/queries";
import { setCache, cachedJson, invalidateCache } from "@/lib/api/cache";
import { cacheKeys, CACHE_TTL } from "@/lib/api/cache-keys";

// Validation weights for computing validationPercentage
const VALIDATION_WEIGHTS: Record<string, number> = {
  AI_EXPLORATION: 0.15,
  INTERVIEWS: 0.30,
  QUESTIONNAIRE: 0.30,
  USER_TESTING: 0.25,
};

function computeValidationPercentage(
  researchMethods: { method: string; status: string }[]
): number {
  let total = 0;
  for (const rm of researchMethods) {
    if (rm.status === "COMPLETED") {
      const weight = VALIDATION_WEIGHTS[rm.method] ?? 0;
      total += weight * 100;
    }
  }
  return Math.round(total);
}

const createPersonaSchema = z.object({
  name: z.string().min(1).max(100),
  tagline: z.string().max(200).optional(),
  age: z.string().max(20).optional(),
  gender: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
  occupation: z.string().max(100).optional(),
  education: z.string().max(150).optional(),
  income: z.string().max(50).optional(),
  familyStatus: z.string().max(100).optional(),
  goals: z.array(z.string().max(500)).max(10).optional(),
  motivations: z.array(z.string().max(500)).optional(),
  frustrations: z.array(z.string().max(500)).optional(),
  behaviors: z.array(z.string().max(500)).optional(),
  coreValues: z.array(z.string().max(100)).max(10).optional(),
  interests: z.array(z.string().max(200)).optional(),
  personalityType: z.string().max(200).optional(),
  preferredChannels: z.array(z.string().max(200)).max(20).optional(),
  techStack: z.array(z.string().max(200)).max(20).optional(),
  quote: z.string().max(500).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  buyingTriggers: z.array(z.string().max(500)).max(10).optional(),
  decisionCriteria: z.array(z.string().max(500)).max(10).optional(),
});

// GET /api/personas
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const filter = searchParams.get("filter") || "all";

    // Cache unfiltered requests
    const isUnfiltered = !search && filter === "all";
    if (isUnfiltered) {
      const key = cacheKeys.personas.list(workspaceId);
      const hit = cachedJson(key);
      if (hit) return hit;
    }

    const dbPersonas = await prisma.persona.findMany({
      where: {
        workspaceId,
        ...(search
          ? { name: { contains: search, mode: "insensitive" as const } }
          : {}),
      },
      orderBy: { name: "asc" },
      include: {
        researchMethods: { select: PERSONA_RESEARCH_METHOD_SELECT },
        createdBy: { select: { name: true, avatarUrl: true } },
      },
    });

    const personas = dbPersonas.map((p) => {
      const validationPercentage = computeValidationPercentage(
        p.researchMethods.map((m) => ({ method: m.method, status: m.status }))
      );

      return {
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        avatarUrl: p.avatarUrl,
        avatarSource: p.avatarSource,
        age: p.age,
        gender: p.gender,
        location: p.location,
        occupation: p.occupation,
        education: p.education,
        income: p.income,
        familyStatus: p.familyStatus,
        personalityType: p.personalityType,
        coreValues: p.coreValues,
        interests: p.interests,
        goals: p.goals,
        motivations: p.motivations,
        frustrations: p.frustrations,
        behaviors: p.behaviors,
        strategicImplications: p.strategicImplications,
        preferredChannels: (p.preferredChannels as string[]) ?? [],
        techStack: (p.techStack as string[]) ?? [],
        quote: p.quote,
        bio: p.bio,
        buyingTriggers: (p.buyingTriggers as string[]) ?? [],
        decisionCriteria: (p.decisionCriteria as string[]) ?? [],
        isLocked: p.isLocked,
        lockedAt: p.lockedAt?.toISOString() ?? null,
        validationPercentage,
        researchMethods: p.researchMethods.map((m) => ({
          id: m.id,
          method: m.method,
          status: m.status,
          progress: m.progress,
          completedAt: m.completedAt?.toISOString() ?? null,
          artifactsCount: m.artifactsCount,
        })),
        createdBy: {
          name: p.createdBy.name ?? "Unknown",
          avatarUrl: p.createdBy.avatarUrl,
        },
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    // Apply filter after computing validation
    const filtered =
      filter === "ready"
        ? personas.filter((p) => p.validationPercentage >= 80)
        : filter === "needs_work"
          ? personas.filter((p) => p.validationPercentage < 80)
          : personas;

    const stats = {
      total: personas.length,
      ready: personas.filter((p) => p.validationPercentage >= 80).length,
      needsWork: personas.filter((p) => p.validationPercentage < 80).length,
    };

    const responseData = { personas: filtered, stats };

    // Cache unfiltered response
    if (isUnfiltered) {
      setCache(cacheKeys.personas.list(workspaceId), responseData, CACHE_TTL.OVERVIEW);
    }

    return NextResponse.json(responseData, {
      headers: isUnfiltered ? { 'X-Cache': 'MISS' } : {},
    });
  } catch (error) {
    console.error("[GET /api/personas]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/personas
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createPersonaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const persona = await prisma.persona.create({
      data: {
        name: data.name,
        workspaceId,
        createdById: session.user.id,
        tagline: data.tagline ?? null,
        age: data.age ?? null,
        gender: data.gender ?? null,
        location: data.location ?? null,
        occupation: data.occupation ?? null,
        education: data.education ?? null,
        income: data.income ?? null,
        familyStatus: data.familyStatus ?? null,
        personalityType: data.personalityType ?? null,
        coreValues: data.coreValues ?? [],
        interests: data.interests ?? [],
        goals: data.goals ?? [],
        motivations: data.motivations ?? [],
        frustrations: data.frustrations ?? [],
        behaviors: data.behaviors ?? [],
        preferredChannels: data.preferredChannels ?? [],
        techStack: data.techStack ?? [],
        quote: data.quote ?? null,
        bio: data.bio ?? null,
        buyingTriggers: data.buyingTriggers ?? [],
        decisionCriteria: data.decisionCriteria ?? [],
        researchMethods: {
          create: [
            { method: "AI_EXPLORATION", status: "AVAILABLE", workspaceId },
            { method: "INTERVIEWS", status: "AVAILABLE", workspaceId },
            { method: "QUESTIONNAIRE", status: "AVAILABLE", workspaceId },
            { method: "USER_TESTING", status: "AVAILABLE", workspaceId },
          ],
        },
      },
      include: {
        researchMethods: true,
      },
    });

    invalidateCache(cacheKeys.prefixes.personas(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ persona }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/personas]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
