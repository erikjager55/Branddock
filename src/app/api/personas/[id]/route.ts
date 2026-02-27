import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { z } from "zod";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { requireUnlocked } from "@/lib/lock-guard";
import { createVersion } from "@/lib/versioning";
import { buildPersonaSnapshot } from "@/lib/snapshot-builders";

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

const updatePersonaSchema = z.object({
  name: z.string().min(1).max(100).optional(),
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
  strategicImplications: z.string().optional(),
  preferredChannels: z.array(z.string().max(200)).max(20).optional(),
  techStack: z.array(z.string().max(200)).max(20).optional(),
  quote: z.string().max(500).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  buyingTriggers: z.array(z.string().max(500)).max(10).optional(),
  decisionCriteria: z.array(z.string().max(500)).max(10).optional(),
});

// GET /api/personas/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
      include: {
        researchMethods: true,
        createdBy: { select: { name: true, avatarUrl: true } },
        lockedBy: { select: { id: true, name: true } },
      },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const validationPercentage = computeValidationPercentage(
      persona.researchMethods.map((m) => ({ method: m.method, status: m.status }))
    );

    return NextResponse.json({
      ...persona,
      validationPercentage,
      lockedAt: persona.lockedAt?.toISOString() ?? null,
      lockedBy: persona.lockedBy ? { id: persona.lockedBy.id, name: persona.lockedBy.name } : null,
      createdAt: persona.createdAt.toISOString(),
      updatedAt: persona.updatedAt.toISOString(),
      researchMethods: persona.researchMethods.map((m) => ({
        ...m,
        completedAt: m.completedAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/personas/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/personas/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const session = await getServerSession();

    const { id } = await params;

    const lockResponse = await requireUnlocked("persona", id);
    if (lockResponse) return lockResponse;

    const existing = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updatePersonaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const persona = await prisma.persona.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.tagline !== undefined && { tagline: data.tagline }),
        ...(data.age !== undefined && { age: data.age }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.occupation !== undefined && { occupation: data.occupation }),
        ...(data.education !== undefined && { education: data.education }),
        ...(data.income !== undefined && { income: data.income }),
        ...(data.familyStatus !== undefined && { familyStatus: data.familyStatus }),
        ...(data.goals !== undefined && { goals: data.goals }),
        ...(data.motivations !== undefined && { motivations: data.motivations }),
        ...(data.frustrations !== undefined && { frustrations: data.frustrations }),
        ...(data.behaviors !== undefined && { behaviors: data.behaviors }),
        ...(data.coreValues !== undefined && { coreValues: data.coreValues }),
        ...(data.interests !== undefined && { interests: data.interests }),
        ...(data.personalityType !== undefined && { personalityType: data.personalityType }),
        ...(data.strategicImplications !== undefined && { strategicImplications: data.strategicImplications }),
        ...(data.preferredChannels !== undefined && { preferredChannels: data.preferredChannels }),
        ...(data.techStack !== undefined && { techStack: data.techStack }),
        ...(data.quote !== undefined && { quote: data.quote }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.buyingTriggers !== undefined && { buyingTriggers: data.buyingTriggers }),
        ...(data.decisionCriteria !== undefined && { decisionCriteria: data.decisionCriteria }),
      },
      include: {
        researchMethods: true,
      },
    });

    // ── Smart auto-versioning: only for content changes, with changeNote ──
    try {
      const userId = session?.user?.id;
      if (userId) {
        const CONTENT_FIELDS = [
          'name', 'tagline', 'age', 'gender', 'location', 'occupation',
          'education', 'income', 'familyStatus', 'personalityType',
          'coreValues', 'interests', 'goals', 'motivations', 'frustrations',
          'behaviors', 'strategicImplications', 'preferredChannels', 'techStack', 'quote', 'bio',
          'buyingTriggers', 'decisionCriteria',
        ] as const;

        const changedFields: string[] = [];
        for (const field of CONTENT_FIELDS) {
          if (data[field as keyof typeof data] !== undefined) {
            const oldVal = JSON.stringify((existing as Record<string, unknown>)[field] ?? null);
            const newVal = JSON.stringify(data[field as keyof typeof data] ?? null);
            if (oldVal !== newVal) {
              changedFields.push(field);
            }
          }
        }

        if (changedFields.length > 0) {
          const fieldLabels: Record<string, string> = {
            name: 'Name', tagline: 'Tagline', age: 'Age', gender: 'Gender',
            location: 'Location', occupation: 'Occupation', education: 'Education',
            income: 'Income', familyStatus: 'Family status',
            personalityType: 'Personality type', strategicImplications: 'Strategic implications',
            coreValues: 'Core values',
            interests: 'Interests', goals: 'Goals', motivations: 'Motivations',
            frustrations: 'Frustrations', behaviors: 'Behaviors',
            preferredChannels: 'Preferred channels', techStack: 'Tech stack',
            quote: 'Quote', bio: 'Bio', buyingTriggers: 'Buying triggers',
            decisionCriteria: 'Decision criteria',
          };

          const labels = changedFields.map(f => fieldLabels[f] || f);
          const changeNote = labels.length <= 3
            ? `Updated ${labels.join(', ')}`
            : `Updated ${labels.slice(0, 2).join(', ')} +${labels.length - 2} more`;

          await createVersion({
            resourceType: 'PERSONA',
            resourceId: id,
            snapshot: buildPersonaSnapshot(persona),
            changeType: 'MANUAL_SAVE',
            changeNote,
            userId,
            workspaceId,
          });
        }
      }
    } catch (versionError) {
      console.error('[Persona version snapshot failed]', versionError);
    }
    // ── End auto-versioning ──

    invalidateCache(cacheKeys.prefixes.personas(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ persona });
  } catch (error) {
    console.error("[PATCH /api/personas/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/personas/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    // Lock check — persona must be unlocked to delete
    const lockResponse = await requireUnlocked("persona", id);
    if (lockResponse) return lockResponse;

    const existing = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    try {
      await prisma.persona.delete({ where: { id } });
    } catch (deleteError: unknown) {
      console.error("[DELETE /api/personas/:id] Prisma delete error:", deleteError);

      // Foreign key constraint error — provide useful message
      const prismaError = deleteError as { code?: string; message?: string };
      if (prismaError?.code === "P2003") {
        return NextResponse.json(
          {
            error: "Cannot delete: persona has related records without cascade.",
            detail: prismaError.message,
          },
          { status: 409 }
        );
      }
      throw deleteError;
    }

    // Clean up orphan ResourceVersion records (generic table, no FK)
    await prisma.resourceVersion
      .deleteMany({
        where: { resourceType: "PERSONA", resourceId: id },
      })
      .catch((e: unknown) =>
        console.error("[DELETE /api/personas/:id] ResourceVersion cleanup failed:", e)
      );

    invalidateCache(cacheKeys.prefixes.personas(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/personas/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
