import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assembleCanvasContext } from "@/lib/ai/canvas-context";
import {
  runFidelityScoring,
  buildFidelityScoreEventPayload,
} from "@/lib/brand-fidelity/fidelity-runner";
import {
  landingPageVariantSchema,
  type LandingPageVariantContent,
} from "@/lib/landing-pages/variant-schema";

/**
 * POST /api/landing-pages/[deliverableId]/score-variant-fidelity
 *
 * Track 5 brand-fidelity wiring (plan zippy-twirling-feigenbaum 2026-05-29):
 * scoort een gegenereerde LP-variant via de 3-pijler F-VAL composite-runner
 * en geeft het scoring-payload terug. Bewust losse endpoint i.p.v. SSE-conversie
 * van generate-structured-variant — de generator-route houdt zijn fast JSON-
 * response zodat user variants direct ziet; deze endpoint draait async parallel
 * (~20s) op de geleverde variant-text en client-side store-updates triggeren
 * de bestaande `FidelityScoreBar` rendering.
 *
 * Mirrors per-variant scoring-architectuur uit canvas-orchestrator (F9 audit
 * 2026-05-13): caller geeft variantIndex (0 of 1) door, response is hetzelfde
 * payload-shape als SSE-event `fidelity_score_complete`. Client persisteert
 * via `setFidelityCompleteForVariant(variantIndex, payload)`.
 *
 * Body:
 *   - variantIndex: number (0 of 1 — voor structuredVariantOptions[i])
 *   - variant: LandingPageVariantContent (gevalideerd via landingPageVariantSchema)
 *
 * Returns 200:
 *   - { skipped: false, payload: <fidelity_score_complete payload> }
 *   - { skipped: true, reason: 'insufficient-content' | 'runner-error' | string }
 *
 * Failure-modes:
 *   - Auth/membership/deliverable-not-found → 4xx
 *   - runFidelityScoring throw → 200 met `skipped: true` (fail-soft, geen blocker
 *     voor de generation-flow)
 */

const bodySchema = z.object({
  variantIndex: z.number().int().min(0).max(3),
  variant: landingPageVariantSchema,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  const { deliverableId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json();
    parsed = bodySchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: err.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    select: {
      id: true,
      contentType: true,
      campaign: { select: { workspaceId: true } },
    },
  });
  if (!deliverable) {
    return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
  }
  const workspaceId = deliverable.campaign.workspaceId;

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: { workspaces: { some: { id: workspaceId } } },
    },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "No access to this workspace" }, { status: 403 });
  }

  const contentText = flattenVariantToText(parsed.variant);

  // Same minWords gate als runFidelityScoring (< 50 → null). Vroeg afvangen
  // voorkomt een onnodige canvas-context-assembly call voor te korte variants.
  const wordCount = contentText.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 50) {
    return NextResponse.json({ skipped: true, reason: "insufficient-content" });
  }

  const ctx = await assembleCanvasContext(deliverable.id, workspaceId);

  try {
    const outcome = await runFidelityScoring({
      workspaceId,
      deliverableId,
      contentTypeId: deliverable.contentType,
      contentText,
      stack: ctx,
      // LP-variants worden door Anthropic gegenereerd (zie
      // generate-structured-variant route). Cross-family judge wordt door
      // de runner zelf afgeleid uit deze hint.
      generatorProvider: "anthropic",
    });

    if (!outcome) {
      return NextResponse.json({ skipped: true, reason: "insufficient-content" });
    }

    return NextResponse.json({
      skipped: false,
      payload: buildFidelityScoreEventPayload(outcome.result),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(
      "[score-variant-fidelity] runFidelityScoring threw for deliverable %s variant %d: %s",
      deliverableId,
      parsed.variantIndex,
      reason,
    );
    return NextResponse.json({ skipped: true, reason });
  }
}

/**
 * Plat-tekst-projectie van LandingPageVariantContent voor F-VAL scoring.
 * Concateneert alle copy-velden in display-volgorde (Hero → Trust → Problem
 * → Features → SocialProof → Pricing → FAQ → FinalCta) zodat de runner een
 * representatieve text-blob krijgt om style/judge/rules op uit te voeren.
 *
 * Bewust geen markdown-formatting — de runner werkt op platte tekst en
 * voegt zelf de heuristics-pakketten toe. Veld-namen volgen
 * `landingPageVariantSchema` 1-op-1.
 */
function flattenVariantToText(variant: LandingPageVariantContent): string {
  const parts: string[] = [];

  if (variant.hero.eyebrow) parts.push(variant.hero.eyebrow);
  parts.push(variant.hero.headline);
  parts.push(variant.hero.subhead);
  parts.push(variant.hero.primaryCta);
  if (variant.hero.secondaryCta) parts.push(variant.hero.secondaryCta);

  for (const item of variant.trust.items) {
    parts.push(item.label);
  }

  if (variant.problem) {
    parts.push(variant.problem.heading);
    for (const b of variant.problem.painBullets) parts.push(b);
    parts.push(variant.problem.bridgingSentence);
  }

  parts.push(variant.features.sectionHeading);
  for (const item of variant.features.items) {
    parts.push(item.heading);
    parts.push(item.body);
  }

  for (const t of variant.socialProof.testimonials) {
    parts.push(t.quote);
    parts.push(`${t.authorName}, ${t.authorRole}, ${t.authorCompany}`);
    if (t.outcome) parts.push(t.outcome);
  }
  for (const s of variant.socialProof.impactStats ?? []) {
    parts.push(`${s.value} ${s.label}`);
  }

  if (variant.pricing) {
    for (const tier of variant.pricing.tiers) {
      parts.push(`${tier.name} ${tier.price}`);
      for (const f of tier.features) parts.push(f);
    }
  }

  for (const f of variant.faq.items) {
    parts.push(f.question);
    parts.push(f.answer);
  }

  parts.push(variant.finalCta.heading);
  parts.push(variant.finalCta.riskReducer);
  parts.push(variant.finalCta.primaryCta);

  return parts.filter((p) => typeof p === "string" && p.trim().length > 0).join("\n\n");
}
