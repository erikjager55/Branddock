// GET/PATCH /api/settings/feature-image-quality
//
// Developer-only knop voor de quality-mode van LP feature-beelden
// (ADR 2026-06-10-feature-visual-pipeline beslissing 6; #322): kandidaten
// per slot via WorkspaceAiConfig featureKey `lp-feature-image-candidates`.
// Apart van /api/settings/ai-models omdat dit een tuning-knop is, geen
// provider/model-keuze — de getypte registry-validatie daar past niet.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { requireDeveloper } from "@/lib/developer-access";
import {
  LP_FEATURE_IMAGE_CANDIDATES_KEY,
  resolveFeatureCandidateCount,
} from "@/lib/landing-pages/feature-image-config";

export async function GET() {
  try {
    const session = await requireDeveloper();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace found" }, { status: 403 });

    const candidates = await resolveFeatureCandidateCount(workspaceId);
    return NextResponse.json({ candidates, isCustomized: candidates !== 1 });
  } catch (error) {
    console.error("[GET /api/settings/feature-image-quality]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const patchSchema = z.object({
  candidates: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireDeveloper();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace found" }, { status: 403 });

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { candidates } = parsed.data;

    if (candidates === 1) {
      // Default — geen override-row (zelfde patroon als ai-models reset).
      await prisma.workspaceAiConfig.deleteMany({
        where: { workspaceId, featureKey: LP_FEATURE_IMAGE_CANDIDATES_KEY },
      });
    } else {
      await prisma.workspaceAiConfig.upsert({
        where: {
          workspaceId_featureKey: { workspaceId, featureKey: LP_FEATURE_IMAGE_CANDIDATES_KEY },
        },
        create: {
          workspaceId,
          featureKey: LP_FEATURE_IMAGE_CANDIDATES_KEY,
          provider: "fal",
          model: String(candidates),
        },
        update: { model: String(candidates) },
      });
    }

    return NextResponse.json({ candidates, isCustomized: candidates !== 1 });
  } catch (error) {
    console.error("[PATCH /api/settings/feature-image-quality]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
