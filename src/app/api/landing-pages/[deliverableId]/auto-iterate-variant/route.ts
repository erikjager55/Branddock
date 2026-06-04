import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assembleCanvasContext } from "@/lib/ai/canvas-context";
import { runFidelityScoring } from "@/lib/brand-fidelity/fidelity-runner";
import { anthropicClient } from "@/lib/ai/anthropic-client";
import { landingPageVariantSchema } from "@/lib/landing-pages/variant-schema";
import { flattenVariantToText } from "@/lib/landing-pages/flatten-variant";
import { parseLandingPageVariantResponse } from "@/lib/landing-pages/variant-generator";

/**
 * POST /api/landing-pages/[deliverableId]/auto-iterate-variant
 *
 * LP-specifieke auto-iterate voor Step 2 (gestructureerde variant). De generieke
 * studio-trigger (`/api/studio/[id]/auto-iterate/trigger`) leest platte tekst uit
 * deliverableComponent-rijen en faalt op LP-varianten (0 woorden). Dit endpoint
 * scoort de gestructureerde variant, laat Anthropic ALLEEN de copy herschrijven
 * (structuur intact) en herscoort. Caller vervangt de variant in-place en toont
 * de nieuwe score.
 *
 * Body: { variantIndex: 0-3, variant: LandingPageVariantContent }
 * Returns 200:
 *   - { status: 'skipped', reason } — te weinig content of al boven drempel
 *   - { status: 'no_improvement', score, scoreProjected, threshold }
 *   - { status: 'proposal', score, scoreProjected, threshold, variant }
 *   - { status: 'error', error }
 */

const bodySchema = z.object({
  variantIndex: z.number().int().min(0).max(3),
  variant: landingPageVariantSchema,
});

const SYSTEM_PROMPT = `Je bent een merk-bewuste copywriter. Je herschrijft de COPY van een gestructureerde landing-page-variant zodat die hoger scoort op een brand-voice + content-quality judge, ZONDER de structuur te veranderen.

Regels:
- Behoud exact dezelfde JSON-structuur: dezelfde keys en hetzelfde aantal array-items.
- Wijzig ALLEEN tekstuele copy-waarden (headline, subhead, bullets, body, quotes, CTA-labels, etc.).
- Wijzig GEEN icon-namen, URLs of niet-tekstuele config.
- Schrijf in de merk-stem; vermijd generieke AI-frasen; behoud feitelijke claims (cijfers, namen, certificeringen) exact.
- Antwoord met UITSLUITEND de volledige JSON-variant, geen uitleg, geen code-fences.`;

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
    parsed = bodySchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    select: { id: true, contentType: true, campaign: { select: { workspaceId: true } } },
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

  const ctx = await assembleCanvasContext(deliverable.id, workspaceId);

  // ── 1. Score huidige variant ────────────────────────────
  const beforeText = flattenVariantToText(parsed.variant);
  const before = await runFidelityScoring({
    workspaceId,
    deliverableId,
    contentTypeId: deliverable.contentType,
    contentText: beforeText,
    stack: ctx,
    generatorProvider: "anthropic",
  });
  if (!before) {
    return NextResponse.json({ status: "skipped", reason: "insufficient-content" });
  }
  const score = before.result.compositeScore;
  const threshold = before.result.compositeThreshold;
  if (score >= threshold) {
    return NextResponse.json({ status: "skipped", reason: "above-threshold", score, threshold });
  }

  // ── 2. Rewrite copy (structuur intact) ───────────────────
  const variantJson = JSON.stringify(parsed.variant);
  // Output ≈ even groot als input; schaal mee (~3 chars/token) met headroom.
  const maxTokens = Math.min(8000, Math.max(2000, Math.round((variantJson.length / 3) * 1.4)));
  const pillars = {
    style: before.result.pillars.style.weight > 0 ? before.result.pillars.style.score : null,
    judge: before.result.pillars.judge?.score ?? null,
    rules: before.result.pillars.rules.score,
  };
  const userPrompt = [
    ctx.brand?.brandName ? `Merk: ${ctx.brand.brandName}` : "",
    ctx.brand?.brandToneOfVoice ? `Tone of voice: ${ctx.brand.brandToneOfVoice}` : "",
    `Huidige fidelity-score: ${score}/${threshold} (onder drempel).`,
    `Pijler-scores — stijl: ${pillars.style ?? "n.v.t."}, judge: ${pillars.judge ?? "n.v.t."}, regels: ${pillars.rules ?? "n.v.t."}. Focus op de laagste pijler.`,
    "",
    "Huidige variant (JSON):",
    variantJson,
    "",
    "Geef de verbeterde variant terug als volledige JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  let rawResponse: string;
  try {
    const result = await anthropicClient.createChatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { useCase: "CHAT", temperature: 0.5, maxTokens, timeoutMs: 90_000 },
    );
    rawResponse = result.content;
  } catch (err) {
    const message = err instanceof Error ? err.message : "auto-iterate-variant failed";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }

  const parseResult = parseLandingPageVariantResponse(rawResponse);
  if (!parseResult.success) {
    return NextResponse.json(
      { status: "error", error: "AI-respons niet verwerkbaar als variant — probeer opnieuw." },
      { status: 502 },
    );
  }
  const rewritten = parseResult.data;

  // ── 3. Herscoor de rewrite ───────────────────────────────
  const after = await runFidelityScoring({
    workspaceId,
    deliverableId,
    contentTypeId: deliverable.contentType,
    contentText: flattenVariantToText(rewritten),
    stack: ctx,
    generatorProvider: "anthropic",
  });
  const scoreProjected = after?.result.compositeScore ?? null;

  if (scoreProjected != null && scoreProjected <= score) {
    return NextResponse.json({ status: "no_improvement", score, scoreProjected, threshold });
  }

  return NextResponse.json({ status: "proposal", score, scoreProjected, threshold, variant: rewritten });
}
