// =============================================================
// POST /api/studio/[deliverableId]/components/[componentId]/refine-visual
//
// Pattern D image-quality-chain: image-to-image refine via Gemini compose.
// Trigger: user klikt "Improve" naast een laag-scorende generated image.
//
// Flow:
//   1. Auth + ownership check
//   2. Load component + visual-fidelity score
//   3. Guard: iterationCount < REFINE_MAX_ITERATIONS
//   4. Extract refine-hint uit aiJudgeDimensions (geen hint = no-op 422)
//   5. Fetch brand-style-anchors (voldoen aan composeFromImages min 2 inputs)
//   6. composeFromImages([originalUrl, ...anchorUrls], refinePrompt)
//   7. Upload result naar storage, update component in-place
//   8. Fire-and-forget rescore (Pattern B parity)
//   9. Return updated component
//
// In-place update kiest voor UI-eenvoud: image-slot blijft hetzelfde,
// iterationCount tracking houdt history. Volledige version-history kan in
// een follow-up via ContentVersion-pattern als nodig.
// =============================================================

import { NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { withAiRateLimit } from "@/lib/ai/middleware";
import { composeFromImages, ComposeInvalidImageError, ComposePolicyBlockedError } from "@/lib/ai/gemini-client";
import { fetchBrandStyleAnchors } from "@/lib/ai/brand-style-anchors";
import { getStorageProvider } from "@/lib/storage";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import {
  extractRefineHint,
  buildRefinePromptModification,
  REFINE_MAX_ITERATIONS,
  REFINE_TRIGGER_THRESHOLD,
} from "@/lib/ai/image-quality/refine-loop";
import { scoreImageFidelity } from "@/lib/brand-fidelity/visual-fidelity-scorer";

interface VisualJudgeDimensionsPayload {
  dimensions?: Record<string, { score: number; rationale?: string }>;
  skipped?: boolean;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string; componentId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const { deliverableId, componentId } = await params;

    // Load component + verify ownership via deliverable→campaign→workspace chain
    const component = await prisma.deliverableComponent.findFirst({
      where: {
        id: componentId,
        deliverableId,
        deliverable: { campaign: { workspaceId } },
      },
      select: {
        id: true,
        imageUrl: true,
        imagePromptUsed: true,
        iterationCount: true,
        componentType: true,
      },
    });

    if (!component || component.componentType !== "image" || !component.imageUrl) {
      return NextResponse.json(
        { error: "Component not found or not an image" },
        { status: 404 },
      );
    }

    // Guard 1: max iterations
    if (component.iterationCount >= REFINE_MAX_ITERATIONS) {
      return NextResponse.json(
        {
          error: `Component has reached the maximum of ${REFINE_MAX_ITERATIONS} refine iterations`,
          code: "max-iterations",
        },
        { status: 422 },
      );
    }

    // Load most recent visual-fidelity score
    const score = await prisma.contentVisualFidelityScore.findFirst({
      where: { componentId, workspaceId },
      orderBy: { scoredAt: "desc" },
      select: {
        compositeScore: true,
        aiJudgeDimensions: true,
      },
    });

    if (!score) {
      return NextResponse.json(
        {
          error: "Component has no visual-fidelity score yet — cannot extract refine hint",
          code: "no-score",
        },
        { status: 422 },
      );
    }

    // Guard 2: alleen refine onder threshold (UI behoort dit ook te bewaken,
    // maar server-side enforcement voorkomt onnodige compose-calls).
    if (score.compositeScore >= REFINE_TRIGGER_THRESHOLD) {
      return NextResponse.json(
        {
          error: `Composite score ${score.compositeScore} ≥ threshold ${REFINE_TRIGGER_THRESHOLD} — refine niet nodig`,
          code: "threshold-met",
        },
        { status: 422 },
      );
    }

    const judgeDetail = score.aiJudgeDimensions as VisualJudgeDimensionsPayload | null;
    if (!judgeDetail?.dimensions || judgeDetail.skipped) {
      return NextResponse.json(
        {
          error: "Score is missing AI-judge dimensions — cannot extract refine hint",
          code: "no-dimensions",
        },
        { status: 422 },
      );
    }

    const hint = extractRefineHint(judgeDetail.dimensions);
    if (!hint) {
      return NextResponse.json(
        {
          error: "No dimensions below refine threshold — no actionable hint",
          code: "no-actionable-hint",
        },
        { status: 422 },
      );
    }

    // composeFromImages vereist 2-9 input images. Origineel + brand-anchors
    // dekt de minimum-eis én geeft een brand-style-signaal als bijproduct.
    const anchors = await fetchBrandStyleAnchors(workspaceId);
    const anchorUrls = anchors.slice(0, 3).map((a) => a.fileUrl);
    const composeInputs = [component.imageUrl, ...anchorUrls];

    if (composeInputs.length < 2) {
      return NextResponse.json(
        {
          error: "Workspace heeft geen brand-style-anchors — refine vereist minimaal 1 anchor om composeFromImages te voeden",
          code: "missing-anchors",
        },
        { status: 422 },
      );
    }

    const refinePrompt = buildRefinePromptModification(
      component.imagePromptUsed ?? "",
      hint,
    );

    const startMs = Date.now();
    let composeResult: Awaited<ReturnType<typeof composeFromImages>>;
    try {
      composeResult = await composeFromImages(composeInputs, refinePrompt);
    } catch (err) {
      if (err instanceof ComposePolicyBlockedError) {
        return NextResponse.json(
          {
            error: "Refine geblokkeerd door content-policy van Gemini. Pas de input aan of probeer opnieuw.",
            code: "policy",
          },
          { status: 422 },
        );
      }
      if (err instanceof ComposeInvalidImageError) {
        return NextResponse.json(
          { error: err.message, code: "invalid-image" },
          { status: 422 },
        );
      }
      const message = err instanceof Error ? err.message : "Compose failed";
      return NextResponse.json({ error: message, code: "compose-error" }, { status: 500 });
    }

    // Upload het refined-bytes naar storage. composeFromImages retourneert
    // imageBytes als Buffer (Gemini's base64 reeds decoded), dus direct
    // doorgeven — geen extra fetch nodig.
    const storage = getStorageProvider();
    const ext = composeResult.mimeType === "image/jpeg" ? "jpg" : "png";
    const fileName = `canvas-refined-${componentId}-${Date.now()}.${ext}`;
    const upload = await storage.upload(composeResult.imageBytes, {
      workspaceId,
      fileName,
      contentType: composeResult.mimeType,
    });

    const elapsedMs = Date.now() - startMs;

    const updated = await prisma.deliverableComponent.update({
      where: { id: componentId },
      data: {
        imageUrl: upload.url,
        iterationCount: { increment: 1 },
        imagePromptUsed: refinePrompt,
        generatedAt: new Date(),
        aiProvider: "google",
        aiModel: "gemini-2.5-flash-image",
        generationDuration: elapsedMs,
      },
      select: {
        id: true,
        imageUrl: true,
        iterationCount: true,
        imagePromptUsed: true,
      },
    });

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

    // Auto-score de refined image (zelfde fire-and-forget patroon als generate-*)
    void Promise.allSettled([
      scoreImageFidelity({ componentId, workspaceId }),
    ]).catch(() => {
      /* logged binnen scoreImageFidelity */
    });

    return NextResponse.json({
      component: updated,
      hint: {
        instruction: hint.instruction,
        targetedDimensions: hint.targetedDimensions,
        scores: hint.scores,
      },
      provider: "google",
      model: "gemini-2.5-flash-image",
      generationDuration: elapsedMs,
    });
  } catch (err) {
    console.error("[refine-visual] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
