import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assembleCanvasContext } from "@/lib/ai/canvas-context";
import { runFidelityScoring } from "@/lib/brand-fidelity/fidelity-runner";
import { detectAiTells } from "@/lib/brand-fidelity/ai-tell-detector";
import { buildHumanVoiceDirective } from "@/lib/studio/human-voice-directive";
import { resolveHumanVoiceMode } from "@/lib/brand-fidelity/fidelity-config";
import { anthropicClient } from "@/lib/ai/anthropic-client";
import { resolveCanvasModelForContentType } from "@/lib/ai/canvas-model-routing";
import { landingPageVariantSchema } from "@/lib/landing-pages/variant-schema";
import { flattenVariantToText } from "@/lib/landing-pages/flatten-variant";
import {
  VARIANT_REWRITE_SYSTEM_PROMPT,
  buildVariantTellFeedback,
  parseVariantRewriteResponse,
  alignVariantCtaParity,
} from "@/lib/landing-pages/variant-tell-rewrite";

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

/** Secties die per stuk geregenereerd mogen worden (P1b). Sleutels = top-level
 *  keys van LandingPageVariantContent. */
const SECTION_KEYS = ['hero', 'trust', 'problem', 'features', 'socialProof', 'pricing', 'faq', 'finalCta'] as const;
const SECTION_LABELS: Record<(typeof SECTION_KEYS)[number], string> = {
  hero: 'hero (headline/subhead/CTA)',
  trust: 'trust-strip',
  problem: 'probleem-sectie',
  features: 'features',
  socialProof: 'social proof (testimonials/stats)',
  pricing: 'pricing',
  faq: 'FAQ',
  finalCta: 'final CTA',
};

const bodySchema = z.object({
  variantIndex: z.number().int().min(0).max(3),
  variant: landingPageVariantSchema,
  /** P1b — optioneel: regenereer ALLEEN deze sectie (i.p.v. de hele variant). */
  section: z.enum(SECTION_KEYS).optional(),
});

// Audit 2026-06-10 (fase 4): de basis-systemprompt is gedeeld met de STRICT
// tell-rewrite (variant-tell-rewrite.ts) zodat beide paden dezelfde
// JSON-structuur-discipline afdwingen. HVD wordt er mode-gated achter geplakt.
const SYSTEM_PROMPT = VARIANT_REWRITE_SYSTEM_PROMPT;

/** Extra instructie wanneer de rewrite tot één sectie beperkt is (P1b). */
function sectionScopeInstruction(section: (typeof SECTION_KEYS)[number]): string {
  return `\n\nSCOPE: herschrijf UITSLUITEND de "${section}"-sectie (${SECTION_LABELS[section]}) met een frisse, andere invalshoek. Laat ALLE andere secties EXACT ongewijzigd (kopieer ze letterlijk). Geef nog steeds de volledige JSON terug.`;
}

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
  const beforeWordCount = beforeText.trim().split(/\s+/).filter(Boolean).length;
  const before = await runFidelityScoring({
    workspaceId,
    deliverableId,
    contentTypeId: deliverable.contentType,
    contentText: beforeText,
    stack: ctx,
    generatorProvider: "anthropic",
    // F33-pariteit (audit 2026-06-10): zonder override krijgt variant-copy een
    // ×0.6 length-penalty tegen het 1550-woorden registry-target.
    targetWordCountOverride: beforeWordCount,
  });
  if (!before) {
    return NextResponse.json({ status: "skipped", reason: "insufficient-content" });
  }
  const score = before.result.compositeScore;
  const threshold = before.result.compositeThreshold;
  // Whole-variant auto-iterate = "verbeter" → skip wanneer al boven drempel.
  // Section-scoped (P1b) = expliciete "regenereer deze sectie" → altijd doorgaan.
  if (!parsed.section && score >= threshold) {
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

  // Audit 2026-06-10 (fase 4, item 15) — de rewrite-prompt bevatte alleen
  // brandName + tone + pijler-getallen; de rewriter zag de werkelijke voice-
  // fingerprint nooit (F13-bis-les uit auto-iterate-integration). Nu mee:
  // voiceguide-fingerprint (cap 2500), vocab-rails, concrete detector-tells
  // en top rule-violations zodat de LLM wéét wat er te fixen valt.
  const voiceguideText =
    ctx.brand?.brandVoiceguide?.trim() || ctx.brand?.voiceBaseline1Pager?.trim() || null;
  const vocabDo = (ctx.brand?.vocabularyDo ?? []).filter(Boolean);
  const vocabDont = (ctx.brand?.vocabularyDont ?? []).filter(Boolean);
  // Review-fix 2026-06-10: detector mét brand-vocab-whitelist — anders zegt
  // dezelfde prompt "gebruik 'naadloos'" (vocab-rails) én "vermijd 'naadloos'"
  // (tell-feedback) wanneer een seed-woord in het detector-lexicon staat.
  const tellFeedback = buildVariantTellFeedback(detectAiTells(beforeText, { brandVocabulary: vocabDo }));
  const topViolations = before.result.pillars.rules.result.rules.violations
    .slice(0, 3)
    .map((v) => `- ${v.message}${v.snippet ? ` ("${v.snippet.slice(0, 60)}")` : ""}`);

  const userPrompt = [
    ctx.brand?.brandName ? `Merk: ${ctx.brand.brandName}` : "",
    ctx.brand?.brandToneOfVoice ? `Tone of voice: ${ctx.brand.brandToneOfVoice}` : "",
    voiceguideText ? `\nVoice-fingerprint (volg dit ritme + vocabulaire):\n${voiceguideText.slice(0, 2500)}` : "",
    vocabDo.length > 0 ? `Gebruik waar natuurlijk: ${vocabDo.map((w) => `"${w}"`).join(", ")}.` : "",
    vocabDont.length > 0 ? `Vermijd: ${vocabDont.map((w) => `"${w}"`).join(", ")}.` : "",
    `\nHuidige fidelity-score: ${score}/${threshold}${score < threshold ? " (onder drempel)" : ""}.`,
    `Pijler-scores: stijl ${pillars.style ?? "n.v.t."}, judge ${pillars.judge ?? "n.v.t."}, regels ${pillars.rules ?? "n.v.t."}. Focus op de laagste pijler.`,
    topViolations.length > 0 ? `\nGeconstateerde regel-schendingen:\n${topViolations.join("\n")}` : "",
    tellFeedback ? `\n${tellFeedback}` : "",
    "",
    "Huidige variant (JSON):",
    variantJson,
    "",
    "Geef de verbeterde variant terug als volledige JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  // HVD mode-gated achter de gedeelde rewrite-systemprompt + model-routing
  // ('Website & Landing Pages' → claude-sonnet-4-6; alleen Anthropic-providers).
  const [humanVoiceMode, routedModel] = await Promise.all([
    resolveHumanVoiceMode(workspaceId),
    resolveCanvasModelForContentType(workspaceId, deliverable.contentType),
  ]);
  const hvd =
    humanVoiceMode === "OFF"
      ? ""
      : `\n\n${buildHumanVoiceDirective({ language: ctx.brand?.contentLanguage ?? "nl" })}`;
  const rewriteModel = routedModel.provider === "anthropic" ? routedModel.model : undefined;

  let rawResponse: string;
  try {
    const result = await anthropicClient.createChatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT + hvd + (parsed.section ? sectionScopeInstruction(parsed.section) : "") },
        { role: "user", content: userPrompt },
      ],
      {
        useCase: "CHAT",
        temperature: parsed.section ? 0.7 : 0.5,
        maxTokens,
        timeoutMs: 90_000,
        ...(rewriteModel ? { model: rewriteModel } : {}),
      },
    );
    rawResponse = result.content;
  } catch (err) {
    const message = err instanceof Error ? err.message : "auto-iterate-variant failed";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }

  const parseResult = parseVariantRewriteResponse(rawResponse);
  if (!parseResult.success) {
    return NextResponse.json(
      { status: "error", error: "AI-respons niet verwerkbaar als variant — probeer opnieuw." },
      { status: 502 },
    );
  }
  // Section-scoped: dwing de scope server-side af — neem de originele variant en
  // vervang ALLEEN de gevraagde sectie (zo lekt een AI-drift op andere secties niet).
  // Fallback op de originele sectie wanneer de AI 'm wegliet (optionele secties als
  // problem/pricing mogen ontbreken in een geldige variant) → nooit undefined mergen.
  // alignVariantCtaParity: een hero/finalCta-scoped rewrite kan na de merge de
  // single-CTA discipline breken (nieuwe hero-CTA naast oude finalCta-CTA) —
  // lijn finalCta dan gelijk; no-op voor whole-variant (al schema-gevalideerd).
  const rewritten = alignVariantCtaParity(
    parsed.section
      ? { ...parsed.variant, [parsed.section]: parseResult.data[parsed.section] ?? parsed.variant[parsed.section] }
      : parseResult.data,
  );

  // ── 3. Herscoor de rewrite ───────────────────────────────
  const afterText = flattenVariantToText(rewritten);
  const after = await runFidelityScoring({
    workspaceId,
    deliverableId,
    contentTypeId: deliverable.contentType,
    contentText: afterText,
    stack: ctx,
    generatorProvider: "anthropic",
    targetWordCountOverride: afterText.trim().split(/\s+/).filter(Boolean).length,
  });
  const scoreProjected = after?.result.compositeScore ?? null;

  // Whole-variant "verbeter" → alleen aanbieden bij score-winst. Section-scoped
  // "regenereer" → altijd de nieuwe sectie teruggeven (de user vroeg er expliciet om).
  if (!parsed.section && scoreProjected != null && scoreProjected <= score) {
    return NextResponse.json({ status: "no_improvement", score, scoreProjected, threshold });
  }

  return NextResponse.json({ status: "proposal", score, scoreProjected, threshold, variant: rewritten });
}
