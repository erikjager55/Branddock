import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assembleCanvasContext } from "@/lib/ai/canvas-context";
import { generateCreativeAngles } from "@/lib/ai/canvas-angle-generator";
import { anthropicClient } from "@/lib/ai/anthropic-client";
import { resolveCanvasModelForContentType } from "@/lib/ai/canvas-model-routing";
import { resolveHumanVoiceMode } from "@/lib/brand-fidelity/fidelity-config";
import {
  generateLandingPageVariantBatch,
  LP_VARIANT_PROMPT_VERSION,
} from "@/lib/landing-pages/variant-generator";
import {
  runVariantTellRewriteIfNeeded,
  buildVariantTellFeedback,
  parseVariantRewriteResponse,
  VARIANT_REWRITE_SYSTEM_PROMPT,
} from "@/lib/landing-pages/variant-tell-rewrite";
import { flattenPageVariantToText } from "@/lib/landing-pages/flatten-variant";
import { hasOwnVariantSchema } from "@/lib/landing-pages/page-type-schemas";
import type { LandingPageVariantContent } from "@/lib/landing-pages/variant-schema";
import { runFidelityScoring } from "@/lib/brand-fidelity/fidelity-runner";
import { detectAiTells } from "@/lib/brand-fidelity/ai-tell-detector";
import { ensureBrandArchetype } from "@/lib/landing-pages/ensure-archetype";
import { ensureLayoutStyle } from "@/lib/landing-pages/ensure-layout-style";
import { trackAICallStart, trackAICallComplete } from "@/lib/learning-loop/call-tracker";
import { PUCK_WEBPAGE_TYPES } from "@/lib/landing-pages/webpage-types";
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
 * Returns:
 *   - variant: LandingPageVariantContent (gevalideerd)
 *   - puckData: Puck-tree (klaar voor Step 3)
 *   - retried: boolean (true als generator een retry deed op validation-fail)
 *   - inputTokens + outputTokens (cost-tracking)
 *
 * Failure-modes:
 *   - Auth/membership/deliverable-not-found → 4xx
 *   - Anthropic generation-fail na retry → 502
 *   - Validation-fail die niet via retry herstelt → caught + 502
 */

interface RequestBody {
  userPrompt?: string;
  includeProblem?: boolean;
  includePricing?: boolean;
  /** Aantal variants om te genereren (1-4, default 2). >=2 levert user-keuze. */
  count?: 1 | 2 | 3 | 4;
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

  // Verifieer dat dit een PUCK-webpage type is — voor alle andere types
  // hoort de generator niet aangeroepen te worden (spec §4b is type-specific).
  if (!PUCK_WEBPAGE_TYPES.has(deliverable.contentType)) {
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
  const contentLang = ctx.brand.contentLanguage ?? "nl";
  const locale = contentLang.includes("-")
    ? contentLang
    : contentLang === "nl"
      ? "nl-NL"
      : contentLang === "en"
        ? "en-US"
        : contentLang;

  // Audit 2026-06-10 — HVD-gating (pariteit canvas-orchestrator) + per-type
  // model-routing ('Website & Landing Pages' → claude-sonnet-4-6, benchmark 91).
  // De generator ondersteunt alleen Anthropic; een niet-Anthropic workspace-
  // override valt terug op de generator-default.
  const [humanVoiceMode, routedModel] = await Promise.all([
    resolveHumanVoiceMode(workspaceId),
    resolveCanvasModelForContentType(workspaceId, deliverable.contentType),
  ]);
  const generationModel =
    routedModel.provider === "anthropic" ? routedModel.model : undefined;

  let results;
  try {
    results = await generateLandingPageVariantBatch(
      {
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
      },
      count,
      angles,
      { model: generationModel },
    );
  } catch (err) {
    console.error("[generate-structured-variant] Batch failed", err);
    return NextResponse.json(
      {
        error: "Variant generation failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  // Audit 2026-06-10 — learning-loop zichtbaarheid: LP-generatie schreef nooit
  // AICallSnapshot/AICallTrace (prompt-registry + dashboards zagen 0 entries).
  // Best-effort per variant; falen blokkeert nooit. Review-fix: ge-await via
  // allSettled (niet fire-and-forget) — serverless kan post-response werk
  // bevriezen en de writes zijn enkel DB (~ms), geen LLM.
  const trackingPromises: Promise<void>[] = [];
  for (const [slot, r] of results.entries()) {
    trackingPromises.push((async () => {
      try {
        const { traceId } = await trackAICallStart({
          workspaceId,
          brandContext: ctx.brand,
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
          parentEntityId: deliverableId,
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
    })());
  }
  await Promise.allSettled(trackingPromises);

  // Audit 2026-06-10 — STRICT-pariteit (fase 4): voor STRICT-workspaces draait
  // per variant een detector-gated anti-tell rewrite (zelfde semantiek als
  // runStrictModeIfApplicable in de canvas-flow). Detector is regex (~0 kosten);
  // de rewrite-LLM-call gebeurt alleen bij verdict AI_LEANING/PURE_AI.
  // Review-fix 2026-06-10: zelfde brand-vocab-whitelist als de composite-
  // detector — anders gate/beloont de rewrite het strippen van geseede woorden.
  const brandVocabulary = (ctx.brand.vocabularyDo ?? []).filter(Boolean);

  // W1 — tell-rewrite parset het LP-schema hard; voor de type-eigen schemas
  // (faq/product/microsite) degraderen we expliciet tot een per-type rewrite
  // bestaat (W2-W4). Structured warn conform de silent-return-regel.
  if (humanVoiceMode === "STRICT" && hasOwnVariantSchema(deliverable.contentType)) {
    console.warn("[generate-structured-variant] STRICT tell-rewrite geskipt: geen per-type rewrite-prompt", {
      deliverableId,
      contentType: deliverable.contentType,
    });
  }
  if (humanVoiceMode === "STRICT" && !hasOwnVariantSchema(deliverable.contentType)) {
    const rewritten = await Promise.all(
      results.map((r) =>
        runVariantTellRewriteIfNeeded(r.variant as LandingPageVariantContent, async ({ systemPrompt, userPrompt: rwPrompt }) => {
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
              ...(generationModel ? { model: generationModel } : {}),
            },
          );
          return res.content;
        }, { brandVocabulary }),
      ),
    );
    rewritten.forEach((rw, i) => {
      if (rw.rewritten) {
        console.log(
          "[generate-structured-variant] STRICT tell-rewrite variant %d: %s",
          i,
          rw.decisionReason,
        );
        results[i] = { ...results[i], variant: rw.variant };
      }
    });
  }

  // Audit 2026-06-10 (fase 4, item 13) — silent composite-iterate: score elke
  // variant server-side en draai bij composite < drempel één rewrite + rescore
  // (keep-if-better), naar canvas-orchestrator-voorbeeld (silent auto-iterate
  // bij <70). OPT-IN via LP_SILENT_ITERATE=1 (zelfde patroon als
  // AUTO_ITERATE_DEEP_SCORE): scoring is in deze flow bewust client-getriggerd
  // (zie score-variant-fidelity docblock — de generator-route houdt zijn fast
  // response); altijd-aan zou de latency +20-60s en judge-kosten ×2 maken.
  // W1 — de iterate-helft van dit blok rewrite't via het LP-schema
  // (parseVariantRewriteResponse); voor type-eigen schemas degraderen we
  // expliciet tot er per-type rewrites bestaan (W2-W4).
  if (process.env.LP_SILENT_ITERATE === "1" && hasOwnVariantSchema(deliverable.contentType)) {
    console.warn("[generate-structured-variant] silent-iterate geskipt: geen per-type rewrite", {
      deliverableId,
      contentType: deliverable.contentType,
    });
  }
  if (process.env.LP_SILENT_ITERATE === "1" && !hasOwnVariantSchema(deliverable.contentType)) {
    const iterated = await Promise.all(
      results.map(async (r, slot) => {
        try {
          const text = flattenPageVariantToText(r.variant);
          const wc = text.trim().split(/\s+/).filter(Boolean).length;
          const scored = await runFidelityScoring({
            workspaceId,
            deliverableId,
            contentTypeId: deliverable.contentType,
            contentText: text,
            stack: ctx,
            generatorProvider: "anthropic",
            targetWordCountOverride: wc,
            // Review-fix: transient beslis-score — persist racet anders met de
            // finale settings-write van deze route (variant-verlies-risico).
            skipPersist: true,
          });
          if (!scored || scored.result.compositeScore >= scored.result.compositeThreshold) {
            return null;
          }
          const tellFeedback = buildVariantTellFeedback(detectAiTells(text, { brandVocabulary }));
          const rewriteUserPrompt = [
            ctx.brand?.brandName ? `Merk: ${ctx.brand.brandName}` : "",
            ctx.brand?.brandToneOfVoice ? `Tone of voice: ${ctx.brand.brandToneOfVoice}` : "",
            ctx.brand?.brandVoiceguide ? `\nVoice-fingerprint:\n${ctx.brand.brandVoiceguide.slice(0, 2500)}` : "",
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
              ...(generationModel ? { model: generationModel } : {}),
            },
          );
          const parsedRw = parseVariantRewriteResponse(res.content);
          if (!parsedRw.success) return null;
          const afterText = flattenPageVariantToText(parsedRw.data);
          const rescored = await runFidelityScoring({
            workspaceId,
            deliverableId,
            contentTypeId: deliverable.contentType,
            contentText: afterText,
            stack: ctx,
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
            return parsedRw.data;
          }
          return null;
        } catch (err) {
          console.warn(
            "[generate-structured-variant] silent-iterate variant faalde (non-fatal):",
            err instanceof Error ? err.message : err,
          );
          return null;
        }
      }),
    );
    iterated.forEach((v, i) => {
      if (v) results[i] = { ...results[i], variant: v };
    });
  }

  const variants = results.map((r) => r.variant);
  const variantLabels = results.map((r) => r.angleLabel ?? null);
  const totalInputTokens = results.reduce((s, r) => s + r.inputTokens, 0);
  const totalOutputTokens = results.reduce((s, r) => s + r.outputTokens, 0);

  // Persist options-array — geen .structuredVariant + .puckData hier, dat
  // wordt gezet wanneer user een variant kiest via PATCH /api/studio/[id].
  const existingSettings =
    deliverable.settings && typeof deliverable.settings === "object" && !Array.isArray(deliverable.settings)
      ? (deliverable.settings as Record<string, unknown>)
      : {};

  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: {
      settings: {
        ...existingSettings,
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
  invalidateCache(cacheKeys.prefixes.studio(workspaceId));
  invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

  return NextResponse.json({
    variants,
    variantLabels,
    deliveredCount: variants.length,
    requestedCount: count,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  });
}
