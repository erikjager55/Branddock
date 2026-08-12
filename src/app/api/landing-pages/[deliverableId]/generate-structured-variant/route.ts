import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import type { HumanVoiceMode } from "@prisma/client";
import { auth } from "@/lib/auth";
import { buildAiErrorResponseInit, buildAiErrorEvent } from "@/lib/ai/error-handler";
import { prisma } from "@/lib/prisma";
import { assembleCanvasContext } from "@/lib/ai/canvas-context";
import { serializeContextForPrompt } from "@/lib/ai/context/fetcher";
import { generateCreativeAngles, type CreativeAngle } from "@/lib/ai/canvas-angle-generator";
import { anthropicClient } from "@/lib/ai/anthropic-client";
import { resolveCanvasModelForContentType } from "@/lib/ai/canvas-model-routing";
import { resolveHumanVoiceMode } from "@/lib/brand-fidelity/fidelity-config";
import {
  generateLandingPageVariantBatch,
  generateLandingPageVariant,
  variantTemperatures,
  variantSlotParams,
  recoveryTemperature,
  LP_VARIANT_PROMPT_VERSION,
  type GenerationResult,
  type LandingPageGenerationParams,
} from "@/lib/landing-pages/variant-generator";
import {
  runVariantTellRewriteIfNeeded,
  buildVariantTellFeedback,
  parseVariantRewriteResponse,
  VARIANT_REWRITE_SYSTEM_PROMPT,
} from "@/lib/landing-pages/variant-tell-rewrite";
import { flattenPageVariantToText } from "@/lib/landing-pages/flatten-variant";
import { hasOwnVariantSchema } from "@/lib/landing-pages/page-type-schemas";
import { LONG_FORM_SEO_TYPES } from "@/lib/ai/seo-pipeline.types";
import { buildGeoKnowledgeContext } from "@/lib/landing-pages/geo-knowledge-context";
import {
  fetchResearchStatCandidates,
  buildResearchStatsBlock,
  type ResearchStatCandidate,
} from "@/lib/landing-pages/research-stats";
import type { LandingPageVariantContent } from "@/lib/landing-pages/variant-schema";
import { runFidelityScoring } from "@/lib/brand-fidelity/fidelity-runner";
import { detectAiTells } from "@/lib/brand-fidelity/ai-tell-detector";
import { ensureBrandArchetype } from "@/lib/landing-pages/ensure-archetype";
import { ensureLayoutStyle } from "@/lib/landing-pages/ensure-layout-style";
import { trackAICallStart, trackAICallComplete } from "@/lib/learning-loop/call-tracker";
import { isPuckRenderable } from "@/lib/landing-pages/webpage-types";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

/**
 * POST /api/landing-pages/[deliverableId]/generate-structured-variant
 *
 * Fase 6a wiring (web-page-builder spec §4b paradigma B): genereer 1
 * gestructureerd LandingPageVariantContent via Anthropic + sla op in
 * deliverable.settings.structuredVariant + map naar Puck-tree in
 * deliverable.settings.puckData.
 *
 * Vervangt voor PUCK_WEBPAGE_TYPES content-types de multi-variant flow van
 * /api/studio/[id]/orchestrate. Single variant is bewuste keuze (spec §4d
 * F-VAL gate scoort 1 page; auto-iterate doet refinement op puck-data).
 *
 * Body:
 *   - userPrompt: string (verplicht, min 5 tekens — wat moet de pagina bereiken)
 *   - includeProblem?: boolean (default true)
 *   - includePricing?: boolean (default false)
 *
 * Twee response-modi:
 *
 * 1. **JSON (default, backward-compat)** — genereert de batch parallel en
 *    antwoordt in één keer:
 *      - variants: PageVariantContent[] (gevalideerd)
 *      - variantLabels, deliveredCount, requestedCount
 *      - inputTokens + outputTokens (cost-tracking)
 *
 * 2. **SSE-streaming (B2 `lp-streaming-generation`, perceived speed)** —
 *    opt-in via query `?stream=1` (canoniek; POST + EventSource gaat niet
 *    samen dus de client leest de fetch-body zelf) óf via de header
 *    `Accept: text/event-stream`. Varianten genereren dan SEQUENTIEEL
 *    (slot 0 eerst — de gebruiker ziet variant A zodra die klaar is i.p.v.
 *    een 30-90s spinner) met per slot dezelfde angle/axis + temperature +
 *    recovery-retry als de parallelle batch (gedeelde helpers
 *    `variantSlotParams`/`recoveryTemperature`). Events:
 *      - `variant_started`  {index, label}
 *      - `variant_complete` {index, variant, label} — de VOLLEDIG
 *        gevalideerde (Zod) én na-bewerkte variant (STRICT tell-rewrite +
 *        silent-iterate draaien vóór dit event, zodat de kaart nooit
 *        afwijkt van wat gepersisteerd wordt)
 *      - `variant_failed`   {index, error} — slot-failure ná recovery-retry
 *        (uitbreiding op het event-contract zodat de skeleton-kaart kan
 *        sluiten; all_complete blijft de bron voor partial-delivery)
 *      - `all_complete`     {variants, variantLabels, deliveredCount,
 *                            requestedCount, inputTokens, outputTokens}
 *        — identiek payload-shape aan de JSON-response, ná persist
 *      - `error`            {message, …} — fatale fout (alles mislukt of
 *        persist-fout); shape via buildAiErrorEvent
 *    Geen `section_preview`-events: anthropicClient.createChatCompletion
 *    is non-streaming (geen token-stream beschikbaar) en een fragiele
 *    partial-JSON-parser is bewust buiten scope (task-besluit B2.2).
 *
 * Failure-modes:
 *   - Auth/membership/deliverable-not-found → 4xx (beide modi; de SSE-modus
 *     valideert vóór de stream opent zodat de client kan terugvallen)
 *   - Anthropic generation-fail na retry → 502 (JSON) / `error`-event (SSE)
 *   - Validation-fail die niet via retry herstelt → caught + 502 / `error`
 */

interface RequestBody {
  userPrompt?: string;
  includeProblem?: boolean;
  includePricing?: boolean;
  /** Aantal variants om te genereren (1-4, default 2). >=2 levert user-keuze. */
  count?: 1 | 2 | 3 | 4;
}

// Serverless: multi-variant Opus-batch + tell-rewrite kan minuten kosten;
// expliciete duur voorkomt mid-stream-kill. Fluid Compute-ceiling is 800s.
// B2: 300 → 480 — de sequentiële SSE-modus stapelt slots (4 × ~90s worst
// case + retries) waar de batch parallelliseerde.
export const maxDuration = 480;

// ─── Gedeelde per-variant nabewerking (JSON- én SSE-pad) ─────────────────

type CanvasCtx = Awaited<ReturnType<typeof assembleCanvasContext>>;

interface VariantPostProcessArgs {
  deliverableId: string;
  workspaceId: string;
  contentType: string;
  ctx: CanvasCtx;
  humanVoiceMode: HumanVoiceMode;
  generationModel: string | undefined;
  brandVocabulary: string[];
}

/**
 * Audit 2026-06-10 — learning-loop zichtbaarheid: LP-generatie schreef nooit
 * AICallSnapshot/AICallTrace (prompt-registry + dashboards zagen 0 entries).
 * Best-effort per variant; falen blokkeert nooit. Review-fix: ge-await via
 * allSettled in de caller (niet fire-and-forget) — serverless kan
 * post-response werk bevriezen en de writes zijn enkel DB (~ms), geen LLM.
 */
async function trackVariantGeneration(
  r: GenerationResult,
  slot: number,
  a: VariantPostProcessArgs,
): Promise<void> {
  try {
    const { traceId } = await trackAICallStart({
      workspaceId: a.workspaceId,
      brandContext: a.ctx.brand,
      payload: {
        model: r.modelUsed,
        messages: [
          { role: "system", content: r.prompt.system },
          { role: "user", content: r.prompt.user },
        ],
      },
      sourceType: "ts-builder",
      sourceIdentifier: "landing-pages.variant-generator",
      parentEntityType: "deliverable",
      parentEntityId: a.deliverableId,
      callOrder: slot,
      promptVersion: LP_VARIANT_PROMPT_VERSION,
    });
    await trackAICallComplete({
      traceId,
      responseMetadata: {
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        stopReason: "end_turn",
        latencyMs: 0,
        wasFromCache: false,
      },
    });
  } catch (trackErr) {
    console.warn(
      "[generate-structured-variant] AI-call tracking failed (non-fatal):",
      trackErr instanceof Error ? trackErr.message : trackErr,
    );
  }
}

/**
 * Audit 2026-06-10 — STRICT-pariteit (fase 4): voor STRICT-workspaces draait
 * per variant een detector-gated anti-tell rewrite (zelfde semantiek als
 * runStrictModeIfApplicable in de canvas-flow). Detector is regex (~0 kosten);
 * de rewrite-LLM-call gebeurt alleen bij verdict AI_LEANING/PURE_AI.
 * Review-fix 2026-06-10: zelfde brand-vocab-whitelist als de composite-
 * detector — anders gate/beloont de rewrite het strippen van geseede woorden.
 * W1 — tell-rewrite parset het LP-schema hard; type-eigen schemas worden in
 * de caller ge-warned + hier ge-gate'd (per-type rewrite = W2-W4).
 */
async function applyStrictTellRewrite(
  r: GenerationResult,
  slot: number,
  a: VariantPostProcessArgs,
): Promise<GenerationResult> {
  if (a.humanVoiceMode !== "STRICT" || hasOwnVariantSchema(a.contentType)) return r;
  const rw = await runVariantTellRewriteIfNeeded(
    r.variant as LandingPageVariantContent,
    async ({ systemPrompt, userPrompt: rwPrompt }) => {
      const res = await anthropicClient.createChatCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: rwPrompt },
        ],
        {
          useCase: "CHAT",
          temperature: 0.5,
          maxTokens: Math.min(8000, Math.max(2000, Math.round((JSON.stringify(r.variant).length / 3) * 1.4))),
          timeoutMs: 90_000,
          ...(a.generationModel ? { model: a.generationModel } : {}),
        },
      );
      return res.content;
    },
    { brandVocabulary: a.brandVocabulary },
  );
  if (!rw.rewritten) return r;
  console.log(
    "[generate-structured-variant] STRICT tell-rewrite variant %d: %s",
    slot,
    rw.decisionReason,
  );
  return { ...r, variant: rw.variant };
}

/**
 * Audit 2026-06-10 (fase 4, item 13) — silent composite-iterate: score de
 * variant server-side en draai bij composite < drempel één rewrite + rescore
 * (keep-if-better), naar canvas-orchestrator-voorbeeld (silent auto-iterate
 * bij <70). OPT-IN via LP_SILENT_ITERATE=1 (zelfde patroon als
 * AUTO_ITERATE_DEEP_SCORE): scoring is in deze flow bewust client-getriggerd
 * (zie score-variant-fidelity docblock — de generator-route houdt zijn fast
 * response); altijd-aan zou de latency +20-60s en judge-kosten ×2 maken.
 * W1 — de iterate rewrite't via het LP-schema (parseVariantRewriteResponse);
 * type-eigen schemas degraderen expliciet (gate in caller + hier).
 */
async function applySilentIterate(
  r: GenerationResult,
  slot: number,
  a: VariantPostProcessArgs,
): Promise<GenerationResult> {
  if (process.env.LP_SILENT_ITERATE !== "1" || hasOwnVariantSchema(a.contentType)) return r;
  try {
    const text = flattenPageVariantToText(r.variant);
    const wc = text.trim().split(/\s+/).filter(Boolean).length;
    const scored = await runFidelityScoring({
      workspaceId: a.workspaceId,
      deliverableId: a.deliverableId,
      contentTypeId: a.contentType,
      contentText: text,
      stack: a.ctx,
      generatorProvider: "anthropic",
      targetWordCountOverride: wc,
      // Review-fix: transient beslis-score — persist racet anders met de
      // finale settings-write van deze route (variant-verlies-risico).
      skipPersist: true,
    });
    if (!scored || scored.result.compositeScore >= scored.result.compositeThreshold) {
      return r;
    }
    const tellFeedback = buildVariantTellFeedback(
      detectAiTells(text, { brandVocabulary: a.brandVocabulary }),
    );
    const rewriteUserPrompt = [
      a.ctx.brand?.brandName ? `Merk: ${a.ctx.brand.brandName}` : "",
      a.ctx.brand?.brandToneOfVoice ? `Tone of voice: ${a.ctx.brand.brandToneOfVoice}` : "",
      a.ctx.brand?.brandVoiceguide ? `\nVoice-fingerprint:\n${a.ctx.brand.brandVoiceguide.slice(0, 2500)}` : "",
      `\nFidelity-score: ${scored.result.compositeScore}/${scored.result.compositeThreshold} (onder drempel).`,
      tellFeedback ? `\n${tellFeedback}` : "",
      "",
      "Huidige variant (JSON):",
      JSON.stringify(r.variant),
      "",
      "Geef de verbeterde variant terug als volledige JSON.",
    ].filter(Boolean).join("\n");
    const res = await anthropicClient.createChatCompletion(
      [
        { role: "system", content: VARIANT_REWRITE_SYSTEM_PROMPT },
        { role: "user", content: rewriteUserPrompt },
      ],
      {
        useCase: "CHAT",
        temperature: 0.5,
        maxTokens: Math.min(8000, Math.max(2000, Math.round((JSON.stringify(r.variant).length / 3) * 1.4))),
        timeoutMs: 90_000,
        ...(a.generationModel ? { model: a.generationModel } : {}),
      },
    );
    const parsedRw = parseVariantRewriteResponse(res.content);
    if (!parsedRw.success) return r;
    const afterText = flattenPageVariantToText(parsedRw.data);
    const rescored = await runFidelityScoring({
      workspaceId: a.workspaceId,
      deliverableId: a.deliverableId,
      contentTypeId: a.contentType,
      contentText: afterText,
      stack: a.ctx,
      generatorProvider: "anthropic",
      targetWordCountOverride: afterText.trim().split(/\s+/).filter(Boolean).length,
      skipPersist: true,
    });
    if (rescored && rescored.result.compositeScore > scored.result.compositeScore) {
      console.log(
        "[generate-structured-variant] silent-iterate variant %d: composite %d → %d",
        slot,
        scored.result.compositeScore,
        rescored.result.compositeScore,
      );
      return { ...r, variant: parsedRw.data };
    }
    return r;
  } catch (err) {
    console.warn(
      "[generate-structured-variant] silent-iterate variant faalde (non-fatal):",
      err instanceof Error ? err.message : err,
    );
    return r;
  }
}

interface GenerationResponsePayload {
  variants: GenerationResult["variant"][];
  variantLabels: (string | null)[];
  deliveredCount: number;
  requestedCount: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Persist het options-array + generation-meta (gedeeld JSON/SSE-pad) — geen
 * .structuredVariant + .puckData hier, dat wordt gezet wanneer user een
 * variant kiest via PATCH /api/studio/[id]. Retourneert het response-payload
 * dat beide modi 1-op-1 naar de client sturen (JSON-body resp. all_complete).
 */
async function persistVariantOptions(args: {
  deliverableId: string;
  workspaceId: string;
  existingSettings: Record<string, unknown>;
  results: GenerationResult[];
  count: number;
  archetypeResult: Awaited<ReturnType<typeof ensureBrandArchetype>>;
  layoutResult: Awaited<ReturnType<typeof ensureLayoutStyle>>;
}): Promise<GenerationResponsePayload> {
  const { results, count, archetypeResult, layoutResult } = args;
  const variants = results.map((r) => r.variant);
  const variantLabels = results.map((r) => r.angleLabel ?? null);
  const totalInputTokens = results.reduce((s, r) => s + r.inputTokens, 0);
  const totalOutputTokens = results.reduce((s, r) => s + r.outputTokens, 0);

  await prisma.deliverable.update({
    where: { id: args.deliverableId },
    data: {
      settings: {
        ...args.existingSettings,
        structuredVariantOptions: variants,
        structuredVariantLabels: variantLabels,
        structuredGenerationMeta: {
          generatedAt: new Date().toISOString(),
          count,
          requestedCount: count,
          deliveredCount: variants.length,
          inputTokens: totalInputTokens + (archetypeResult.inputTokens ?? 0),
          outputTokens: totalOutputTokens + (archetypeResult.outputTokens ?? 0),
          archetypeClassified: archetypeResult.classified,
          archetype: archetypeResult.archetype,
          archetypeConfidence: archetypeResult.confidence ?? null,
          layoutStyleInferred: layoutResult.inferred,
          layoutStyle: layoutResult.layoutStyle,
          layoutStyleConfidence: layoutResult.confidence ?? null,
        },
      },
    },
  });

  // Cache-invalidatie per CLAUDE.md API conventies (verplicht na mutatie)
  invalidateCache(cacheKeys.prefixes.studio(args.workspaceId));
  invalidateCache(cacheKeys.prefixes.campaigns(args.workspaceId));

  return {
    variants,
    variantLabels,
    deliveredCount: variants.length,
    requestedCount: count,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  };
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

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userPrompt = body.userPrompt?.trim() ?? "";
  if (userPrompt.length < 5) {
    return NextResponse.json(
      { error: "userPrompt must be at least 5 characters" },
      { status: 400 },
    );
  }

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    select: {
      id: true,
      contentType: true,
      settings: true,
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

  // Verifieer dat dit een PUCK-renderable type is (de 5 web-page-types, of een
  // long-form-type met GEO-doel) — voor alle andere types hoort de generator niet
  // aangeroepen te worden (spec §4b is type-specific).
  const persistedInputs = (deliverable.settings && typeof deliverable.settings === "object" && !Array.isArray(deliverable.settings)
    ? ((deliverable.settings as Record<string, unknown>).contentTypeInputs ?? null)
    : null) as Record<string, unknown> | null;
  if (!isPuckRenderable(deliverable.contentType, persistedInputs)) {
    return NextResponse.json(
      {
        error: `Content-type ${deliverable.contentType} ondersteunt geen structured variant generation`,
      },
      { status: 400 },
    );
  }

  // Brand + persona context uit canvas-context (5-min cache)
  const ctx = await assembleCanvasContext(deliverable.id, workspaceId);

  // W2 (plan §2.3 stap 5) — een product-page is ALTIJD aan een product
  // gekoppeld. Layer 7 vult ctx.products settings-first uit de product-select.
  // Geen product → harde guard zodat de generator nooit product-details verzint.
  const linkedProduct = ctx.products[0] ?? null;
  if (deliverable.contentType === "product-page" && !linkedProduct) {
    return NextResponse.json(
      {
        error:
          "Koppel eerst een product. Een product-page hoort altijd bij een product/dienst uit je knowledge-sectie — kies er één in Stap 1.",
      },
      { status: 400 },
    );
  }

  const primaryPersona = ctx.personas[0];
  const personaForGenerator = primaryPersona
    ? {
        name: primaryPersona.name,
        serialized: primaryPersona.serialized,
      }
    : undefined;

  // Strikte integer-validatie: een float (2.5) of gecoerceerde string ("2") zou
  // anders door `>= 1 && <= 4` glippen maar downstream `count === N` missen →
  // verkeerde batch-grootte (temps=4, axes=1). Niet-geldig → graceful default 2.
  const count = (
    typeof body.count === "number" && Number.isInteger(body.count) && body.count >= 1 && body.count <= 4
      ? body.count
      : 2
  ) as 1 | 2 | 3 | 4;

  // V2-1 lazy classification — wanneer archetype nog null is, classify nu zodat
  // tone-hints + brand-render-rules vanaf deze generation actief zijn. Bij
  // failure: archetype blijft null, generator valt terug op layoutStyle-only.
  const archetypeResult = await ensureBrandArchetype(
    workspaceId,
    ctx.brandTokens.archetype ?? null,
    ctx.brand,
  );

  // V2-2 lazy layout-style inference — deterministisch (geen AI), gebruikt
  // archetype + tone-signalen voor "best-guess default". Persisted; user kan
  // later overrulen via brand-styling UI.
  const layoutResult = await ensureLayoutStyle(
    workspaceId,
    ctx.brandTokens.layoutStyle ?? null,
    ctx.brandStyleguideMeta?.layoutStyleInferred ?? false,
    archetypeResult.archetype,
    ctx.brand,
  );

  // P3b — dynamische creative-angles (Gemini Flash, best-effort): geven de twee
  // variants brand-/context-specifieke tegenpool-invalshoeken + leesbare labels.
  // null bij failure → de batch valt terug op de generieke problem/benefit-axis.
  const angles = await generateCreativeAngles(ctx, deliverable.contentType, count);

  // Audit 2026-06-10 — locale volgde hardcoded 'nl-NL'; nu dezelfde precedentie
  // als prompt-templates (BrandVoiceguide.contentLocale > Workspace.contentLanguage,
  // al verwerkt in ctx.brand.contentLanguage als ISO-prefix).
  const contentLang = ctx.brand.contentLanguage ?? "en";
  const locale = contentLang.includes("-")
    ? contentLang
    : contentLang === "nl"
      ? "nl-NL"
      : contentLang === "en"
        ? "en-US"
        : contentLang;

  // Audit 2026-06-10 — HVD-gating (pariteit canvas-orchestrator) + per-type
  // model-routing ('Website & Landing Pages' → claude-sonnet-5, benchmark 91).
  // De generator ondersteunt alleen Anthropic; een niet-Anthropic workspace-
  // override valt terug op de generator-default.
  const [humanVoiceMode, routedModel] = await Promise.all([
    resolveHumanVoiceMode(workspaceId),
    resolveCanvasModelForContentType(workspaceId, deliverable.contentType),
  ]);
  const generationModel =
    routedModel.provider === "anthropic" ? routedModel.model : undefined;

  // Knowledge-context — serialiseer de door de gebruiker geselecteerde Step-1
  // items (al op ctx.additionalContextItems via assembleCanvasContext) tot
  // prompt-tekst, zodat web-page-generatie het bronmateriaal consumeert net als
  // het orchestrator-pad. Leeg → undefined (prompt blijft dan byte-identiek).
  // Long-form GEO: forceer knowledge → primary (volledige bron incl. referenties/URLs reikt
  // het model) + prepend expliciete "## CITEERBARE BRONNEN"-handles, zodat citeableStats een
  // echte bron krijgen i.p.v. genullde labels. Andere page-types houden het bestaande pad.
  // Long-form GEO: fetch a package of real, sourced stat-candidates (Exa + S2)
  // in parallel with the knowledge-context build, and append it as a labeled
  // "## GEVERIFIEERD BRONMATERIAAL" block so citeableStats can rest on genuine
  // current sources. Fail-soft + key-gated: no keys / no items → empty block →
  // additionalContextText is byte-identical to before (golden-set safety).
  const isLongFormGeo = LONG_FORM_SEO_TYPES.has(deliverable.contentType);
  const [baseContextText, researchCandidates] = await Promise.all([
    (async (): Promise<string | undefined> => {
      if (!ctx.additionalContextItems?.length) return undefined;
      return isLongFormGeo
        ? await buildGeoKnowledgeContext(ctx.additionalContextItems, workspaceId)
        : (await serializeContextForPrompt(ctx.additionalContextItems, workspaceId)) || undefined;
    })(),
    isLongFormGeo
      ? fetchResearchStatCandidates(userPrompt)
      : Promise.resolve<ResearchStatCandidate[]>([]),
  ]);
  const researchBlock = buildResearchStatsBlock(researchCandidates);
  const additionalContextText = researchBlock
    ? `${baseContextText ? `${baseContextText}\n` : ""}${researchBlock}`
    : baseContextText;

  const generationParams: LandingPageGenerationParams = {
    // W1 — type-dispatch: server-side contentType (niet client-vertrouwd)
    // stuurt schema + system-prompt; LP/comparison blijven het oude pad.
    contentType: deliverable.contentType,
    brand: ctx.brand,
    persona: personaForGenerator,
    // W2 — gekoppeld product (alleen voor product-page; andere types null).
    product: deliverable.contentType === "product-page" ? linkedProduct : null,
    userPrompt,
    locale,
    includeProblem: body.includeProblem ?? true,
    includePricing: body.includePricing ?? false,
    // Sub-Sprint E — brand-archetype + layoutStyle hints voor tone + depth
    archetype: archetypeResult.archetype,
    layoutStyle: layoutResult.layoutStyle,
    // DTS C1+C2 — vocabulary + voice-sample uit BrandVoiceguide
    vocabularyDo: ctx.brand.vocabularyDo ?? null,
    vocabularyDont: ctx.brand.vocabularyDont ?? null,
    voiceSample: ctx.brand.voiceSample ?? null,
    humanVoiceMode,
    additionalContextText,
  };

  // Audit 2026-06-10 — STRICT-pariteit brand-vocab-whitelist (zie
  // applyStrictTellRewrite): zelfde lijst als de composite-detector.
  const brandVocabulary = (ctx.brand.vocabularyDo ?? []).filter(Boolean);

  // W1 — degradatie-warns (één keer per request, beide modi): tell-rewrite en
  // silent-iterate parsen het LP-schema hard; type-eigen schemas (faq/product/
  // microsite) degraderen expliciet tot per-type rewrites bestaan (W2-W4).
  if (humanVoiceMode === "STRICT" && hasOwnVariantSchema(deliverable.contentType)) {
    console.warn("[generate-structured-variant] STRICT tell-rewrite geskipt: geen per-type rewrite-prompt", {
      deliverableId,
      contentType: deliverable.contentType,
    });
  }
  if (process.env.LP_SILENT_ITERATE === "1" && hasOwnVariantSchema(deliverable.contentType)) {
    console.warn("[generate-structured-variant] silent-iterate geskipt: geen per-type rewrite", {
      deliverableId,
      contentType: deliverable.contentType,
    });
  }

  const existingSettings =
    deliverable.settings && typeof deliverable.settings === "object" && !Array.isArray(deliverable.settings)
      ? (deliverable.settings as Record<string, unknown>)
      : {};

  const postArgs: VariantPostProcessArgs = {
    deliverableId,
    workspaceId,
    contentType: deliverable.contentType,
    ctx,
    humanVoiceMode,
    generationModel,
    brandVocabulary,
  };

  // B2 — SSE-modus-detectie: `?stream=1` (canoniek) of Accept-header.
  const wantsStream =
    request.nextUrl.searchParams.get("stream") === "1" ||
    (request.headers.get("accept") ?? "").includes("text/event-stream");

  if (wantsStream) {
    return streamSequentialGeneration({
      generationParams,
      count,
      angles,
      generationModel,
      postArgs,
      persist: (results) =>
        persistVariantOptions({
          deliverableId,
          workspaceId,
          existingSettings,
          results,
          count,
          archetypeResult,
          layoutResult,
        }),
    });
  }

  // ─── JSON-pad (backward-compat, parallel batch) ────────────────────────

  let results: GenerationResult[];
  try {
    results = await generateLandingPageVariantBatch(
      generationParams,
      count,
      angles,
      { model: generationModel },
    );
  } catch (err) {
    console.error("[generate-structured-variant] Batch failed", err);
    const { body, status } = buildAiErrorResponseInit(err);
    return NextResponse.json(
      { ...body, detail: err instanceof Error ? err.message : String(err) },
      { status },
    );
  }

  await Promise.allSettled(
    results.map((r, slot) => trackVariantGeneration(r, slot, postArgs)),
  );
  results = await Promise.all(
    results.map((r, slot) => applyStrictTellRewrite(r, slot, postArgs)),
  );
  results = await Promise.all(
    results.map((r, slot) => applySilentIterate(r, slot, postArgs)),
  );

  const payload = await persistVariantOptions({
    deliverableId,
    workspaceId,
    existingSettings,
    results,
    count,
    archetypeResult,
    layoutResult,
  });

  return NextResponse.json(payload);
}

// ─── B2: sequentiële SSE-generatie ───────────────────────────────────────

/**
 * Sequentiële variant-generatie als SSE-stream (perceived speed): slot 0
 * eerst, per slot dezelfde divergentie + recovery-retry als de batch.
 * Elke variant doorloopt de volledige nabewerking (tracking best-effort,
 * STRICT tell-rewrite, silent-iterate) VÓÓR zijn `variant_complete`-event —
 * wat de client toont is exact wat gepersisteerd wordt.
 * Heartbeat-comments elke 15s (patroon /api/studio/[id]/orchestrate).
 */
function streamSequentialGeneration(args: {
  generationParams: LandingPageGenerationParams;
  count: 1 | 2 | 3 | 4;
  angles: CreativeAngle[] | null;
  generationModel: string | undefined;
  postArgs: VariantPostProcessArgs;
  persist: (results: GenerationResult[]) => Promise<GenerationResponsePayload>;
}): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: string, data: unknown) {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          /* stream closed */
        }
      }

      // Heartbeat every 15s to prevent connection drops
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          /* stream closed */
        }
      }, 15_000);

      try {
        const temperatures = variantTemperatures(args.count);
        const results: GenerationResult[] = [];
        const trackingPromises: Promise<void>[] = [];

        for (let slot = 0; slot < args.count; slot++) {
          const slotP = variantSlotParams(args.generationParams, args.count, args.angles, slot);
          sendEvent("variant_started", { index: slot, label: slotP.angleLabel ?? null });

          let r: GenerationResult | null = null;
          try {
            r = await generateLandingPageVariant(slotP, {
              temperature: temperatures[slot],
              model: args.generationModel,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[generate-structured-variant] SSE slot ${slot} failed: ${msg}`);
            const retryTemp = recoveryTemperature(temperatures[slot]);
            try {
              console.warn(`[generate-structured-variant] SSE retrying slot ${slot} with recovery-temp ${retryTemp}...`);
              r = await generateLandingPageVariant(slotP, {
                temperature: retryTemp,
                model: args.generationModel,
              });
            } catch (retryErr) {
              const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
              console.error(`[generate-structured-variant] SSE slot ${slot} retry also failed: ${retryMsg}`);
            }
          }

          if (!r) {
            sendEvent("variant_failed", {
              index: slot,
              error: "Variant-generatie mislukte (incl. recovery-retry).",
            });
            continue;
          }

          trackingPromises.push(trackVariantGeneration(r, slot, args.postArgs));
          r = await applyStrictTellRewrite(r, slot, args.postArgs);
          r = await applySilentIterate(r, slot, args.postArgs);
          results.push(r);
          sendEvent("variant_complete", {
            index: slot,
            variant: r.variant,
            label: r.angleLabel ?? null,
          });
        }

        await Promise.allSettled(trackingPromises);

        if (results.length === 0) {
          sendEvent(
            "error",
            buildAiErrorEvent(
              new Error(`All ${args.count} variant-generations failed (incl. recovery retries). See server logs.`),
              { recoverable: false },
            ),
          );
          return;
        }

        const payload = await args.persist(results);
        sendEvent("all_complete", payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[generate-structured-variant] SSE pipeline error:", message);
        sendEvent("error", buildAiErrorEvent(error, { recoverable: false }));
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
