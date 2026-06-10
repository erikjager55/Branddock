// POST /api/studio/[deliverableId]/generate-feature-visuals
//
// P2 + Fase 3 (audit 2026-06-10-lp-feature-image-diversity) — AI-feature-
// beelden voor de feature-cards van een landing-page. v2-contract: de client
// stuurt feature-COPY ({features: [{index, heading, body, imageBrief?}],
// pageHeadline}) en de route bouwt de prompts server-side via
// buildFeatureVisualPrompts (scene-templates + angle-rotatie + sibling-
// differentiatie + per-slot seed). Legacy {prompts: string[]} blijft één
// release werken als deprecated fallback (geen persist op dat pad).
//
// Persist: DeliverableComponent per beeld (variantGroup 'feature-visual:<i>',
// imagePromptUsed/aiModel/generationDuration) — fail-soft naar het patroon van
// generate-visual: persist-falen blokkeert de URLs niet. Apart van
// generate-visual zodat de hero-foto + picker onaangeroerd blijven.
//
// Budget: max 4 slots per pagina (de client capt al; hier hard begrensd).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { selectModelForStyle } from '@/lib/ai/visual-brief-prompts';
import { generateFalImage } from '@/lib/integrations/fal/fal-client';
import { buildNegativePrompt } from '@/lib/ai/image-quality/negative-prompts';
import { buildFeatureVisualPrompts, sharpenFeaturePromptForRetry, type BuiltFeaturePrompt } from '@/lib/landing-pages/feature-visual-prompts';
import { decideFeatureRegenerations } from '@/lib/landing-pages/feature-visual-gate';
import { runCopyImageCoherenceJudge } from '@/lib/brand-fidelity/copy-image-coherence-judge';
import { runFeatureSetDiversityJudge } from '@/lib/brand-fidelity/feature-set-diversity-judge';
import { imageBriefSchema } from '@/lib/landing-pages/variant-schema';
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } from '@/lib/security/fetch-with-limit';
import { getStorageProvider } from '@/lib/storage';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

export const FEATURE_IMAGE_BUDGET = 4;
/** Kandidaten per slot. Default 1 + judge-gated retry (kosten-bewust); 2-3 =
 *  quality-mode met beste-kandidaat-selectie — later via WorkspaceAiConfig. */
const FEATURE_CANDIDATE_COUNT = 1;

const featureSlotSchema = z.object({
  index: z.number().int().min(0).max(11),
  heading: z.string().min(1).max(200),
  body: z.string().min(1).max(600),
  imageBrief: imageBriefSchema.nullable().optional(),
});

const requestSchema = z
  .object({
    /** @deprecated legacy pad — client-gebouwde prompts verbatim. */
    prompts: z.array(z.string().min(1).max(1500)).min(1).max(FEATURE_IMAGE_BUDGET).optional(),
    /** v2 — feature-copy; de route bouwt de prompts server-side. */
    features: z.array(featureSlotSchema).min(1).max(FEATURE_IMAGE_BUDGET).optional(),
    pageHeadline: z.string().max(200).optional(),
  })
  .strict()
  .refine(
    (b) => Boolean(b.prompts?.length) !== Boolean(b.features?.length),
    'stuur óf prompts (legacy) óf features (v2), niet beide',
  );

interface RouteParams {
  params: Promise<{ deliverableId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await getServerSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const { deliverableId } = await params;
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true },
    });
    if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let body: z.infer<typeof requestSchema>;
    try {
      body = requestSchema.parse(JSON.parse(await request.text()));
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const stack = await assembleCanvasContext(deliverableId, workspaceId);
    const generateConfig = stack.visualBrief?.generate as { model?: string } | undefined;
    const modelId = generateConfig?.model
      ?? selectModelForStyle(stack.visualBrief?.styleDirection ?? null, {
        contentTypeId: stack.deliverableTypeId ?? null,
        hasTrainedLora: false,
      });

    // Brand-style anchors zodat de feature-beelden matchen met de merk-look.
    const { fetchBrandStyleAnchors, maxAnchorsForModel } = await import('@/lib/ai/brand-style-anchors');
    const anchors = await fetchBrandStyleAnchors(workspaceId);
    const referenceImageUrls = anchors.slice(0, maxAnchorsForModel(modelId)).map((a) => a.fileUrl);

    // v2: server-side prompt-bouw uit feature-copy + imageBriefs; legacy:
    // client-prompts verbatim (zonder brief-avoid/seed — deprecated).
    const built: BuiltFeaturePrompt[] = body.features
      ? buildFeatureVisualPrompts(
          body.features.slice(0, FEATURE_IMAGE_BUDGET),
          body.pageHeadline ?? '',
          { brand: stack.brand, brandTokens: stack.brandTokens },
        )
      : (body.prompts ?? []).slice(0, FEATURE_IMAGE_BUDGET).map((prompt, idx) => ({
          index: idx,
          prompt,
          avoid: null,
          seed: Math.floor(Math.random() * 2_147_483_647),
        }));

    const storage = getStorageProvider();
    const startMs = Date.now();

    // Eén generatie-pad voor initiële slots én gerichte retries (Fase 4).
    const generateOne = async (
      slot: BuiltFeaturePrompt,
    ): Promise<{ url: string; bytes: Buffer; prompt: string; index: number } | null> => {
      try {
        // Defaults bevatten anti-collage/triptiek; brandImageryDonts komen
        // gate-correct uit getBrandContext; brief.avoid → userNegations (R6/R7).
        const negativePrompt = buildNegativePrompt({
          brandImageryDonts: stack.brand?.brandImageryDonts ?? [],
          userNegations: slot.avoid ? [slot.avoid] : [],
        });
        const result = await generateFalImage(modelId, slot.prompt, {
          imageSize: 'landscape_4_3',
          // Quality-mode-haak: 1 kandidaat + judge-gated retry is het kosten-
          // bewuste default ($0,53-0,79/pagina); 2-3 kandidaten + selectie kan
          // later via WorkspaceAiConfig (ontwerp-beslissing audit §4 fase 4).
          numImages: FEATURE_CANDIDATE_COUNT,
          referenceImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
          negativePrompt,
          // Empirisch geverifieerd (scripts/experiments/test-nano-banana-seed.ts):
          // nano-banana-pro is deterministisch per seed — verschillende seeds
          // garanderen verschillende beelden binnen de set (R4).
          seed: slot.seed,
        });
        const hostedUrl = result.images?.[0]?.url;
        if (!hostedUrl) return null;
        const bytes = await fetchWithSizeLimit(hostedUrl, AI_IMAGE_SIZE_CAP);
        const upload = await storage.upload(bytes, {
          workspaceId,
          fileName: `feature-visual-${deliverableId}-${Date.now()}-${slot.index}.png`,
          contentType: 'image/png',
        });
        return { url: upload.url, bytes, prompt: slot.prompt, index: slot.index };
      } catch (err) {
        console.error(`[generate-feature-visuals] ${modelId} idx=${slot.index} failed:`, err instanceof Error ? err.message : err);
        return null;
      }
    };

    // Per-index resultaat (behoudt request-volgorde); null bij falen.
    const generated = await Promise.all(built.map((slot) => generateOne(slot)));

    // ── Fase 4 kwaliteitspoort (alleen v2: legacy mist de copy om tegen te
    // judgen). Paired G4-coherence (beeld-i vs copy-i — niet vs sibling-text)
    // + multi-image set-diversity-judge + budget-capped gerichte retry.
    const coherenceScores: Array<number | null> = generated.map(() => null);
    let dupePairs: Array<[number, number]> = [];
    let regenerated: number[] = [];
    if (body.features) {
      const slotsByIndex = new Map(body.features.map((f) => [f.index, f]));
      const judged = await Promise.all(
        generated.map(async (g, pos) => {
          if (!g) return null;
          const slot = slotsByIndex.get(g.index);
          if (!slot) return null;
          // Lokale uploads zijn niet publiek bereikbaar voor de Anthropic
          // url-source → base64 uit de al-aanwezige bytes (disk/fetch-patroon
          // van visual-fidelity-scorer).
          return runCopyImageCoherenceJudge(
            { type: 'base64', mediaType: 'image/png', data: g.bytes.toString('base64') },
            `${slot.heading}\n${slot.body}`,
          ).then((r) => ({ pos, result: r }));
        }),
      );
      for (const j of judged) {
        if (j?.result) coherenceScores[j.pos] = j.result.score;
      }

      const setImages = generated
        .filter((g): g is NonNullable<typeof g> => Boolean(g))
        .map((g) => ({ index: g.index, buffer: g.bytes, mediaType: 'image/png' as const }));
      const diversity = await runFeatureSetDiversityJudge(setImages);
      dupePairs = diversity?.duplicatePairs ?? [];

      const decision = decideFeatureRegenerations(
        generated
          .map((g, pos) => (g ? { index: g.index, coherenceScore: coherenceScores[pos] } : null))
          .filter((s): s is { index: number; coherenceScore: number | null } => Boolean(s)),
        dupePairs,
      );
      regenerated = decision.regenerate;

      if (decision.regenerate.length > 0) {
        const subjectFor = (index: number): string => {
          const slot = slotsByIndex.get(index);
          return slot?.imageBrief?.subject?.trim() || `${slot?.heading ?? ''} — ${slot?.body ?? ''}`.slice(0, 160);
        };
        await Promise.all(
          decision.regenerate.map(async (index) => {
            const pos = built.findIndex((b) => b.index === index);
            if (pos < 0) return;
            const reason = decision.reasons.get(index);
            const judgeRationale = judged.find((j) => j && generated[j.pos]?.index === index)?.result?.rationale ?? null;
            const dupePartner = dupePairs.find(([a, b2]) => a === index || b2 === index);
            const otherIndex = dupePartner ? (dupePartner[0] === index ? dupePartner[1] : dupePartner[0]) : null;
            const sharpened = sharpenFeaturePromptForRetry(
              built[pos],
              reason === 'duplicate' && otherIndex !== null
                ? { kind: 'duplicate', otherSubject: subjectFor(otherIndex) }
                : { kind: 'low-coherence', subject: subjectFor(index), rationale: judgeRationale },
            );
            const retry = await generateOne(sharpened);
            if (retry) generated[pos] = retry;
          }),
        );
      }
    }
    const elapsedMs = Date.now() - startMs;
    // Kosten-telemetrie per page-run (pilot-stuurbaarheid, audit §5).
    const genCount = generated.filter(Boolean).length;
    const judgeCount = coherenceScores.filter((s) => s !== null).length + (dupePairs ? 1 : 0);
    const estCost = (genCount + regenerated.length) * 0.13 + judgeCount * 0.001 + 0.005;
    console.log(
      `[generate-feature-visuals] page-run deliverable=${deliverableId} model=${modelId} slots=${built.length} ok=${genCount} coherence=[${coherenceScores.map((s) => s ?? '–').join(',')}] dupes=${JSON.stringify(dupePairs)} regens=[${regenerated.join(',')}] durationMs=${elapsedMs} estCost=$${estCost.toFixed(2)}`,
    );

    // Persist alleen op het v2-pad (legacy mist de feature-index-semantiek).
    // Fail-soft naar het generate-visual-patroon: een falende persist mag de
    // gegenereerde URLs nooit blokkeren (orphaned-files-les, gotchas 2026-06-08).
    if (body.features) {
      try {
        await prisma.$transaction(async (tx) => {
          for (const g of generated) {
            if (!g) continue;
            const variantGroup = `feature-visual:${g.index}`;
            await tx.deliverableComponent.deleteMany({ where: { deliverableId, variantGroup } });
            const baseOrder = await tx.deliverableComponent.count({ where: { deliverableId } });
            await tx.deliverableComponent.create({
              data: {
                deliverableId,
                componentType: 'image',
                groupType: 'variant',
                order: baseOrder,
                variantGroup,
                variantIndex: 0,
                isSelected: true,
                imageUrl: g.url,
                imageSource: 'ai_generated',
                imagePromptUsed: g.prompt,
                aiProvider: modelId.startsWith('openai/') ? 'openai' : 'fal',
                aiModel: modelId,
                generationDuration: elapsedMs,
                status: 'GENERATED',
                generatedAt: new Date(),
                iterationCount: 0,
              },
            });
          }
        });
        invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
      } catch (err) {
        console.error(
          '[generate-feature-visuals] component-persist faalde — URLs worden tóch geretourneerd:',
          err instanceof Error ? err.message : err,
        );
      }
    }

    // urls index-aligned met de request-volgorde (legacy contract intact);
    // sources geeft herkomst per slot ('generated' | null), coherence de
    // G4-score per slot (null = judge geskipt) — opstap naar een bron-badge
    // in de variant-editor (audit §4 fase 5, UI-follow-up).
    const urls = generated.map((g) => g?.url ?? null);
    const sources = generated.map((g) => (g ? ('generated' as const) : null));
    return NextResponse.json({ urls, sources, coherence: coherenceScores });
  } catch (err) {
    console.error('[generate-feature-visuals] error:', err);
    return NextResponse.json({ error: 'Failed to generate feature visuals' }, { status: 500 });
  }
}
