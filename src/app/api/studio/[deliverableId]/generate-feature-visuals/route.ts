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
import { getServerSession } from '@/lib/auth-server';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
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
import { resolveFeatureCandidateCount } from '@/lib/landing-pages/feature-image-config';
import { matchLibraryImagesToSlots } from '@/lib/landing-pages/source-image-matcher';
import { importGeneratedImageToLibrary } from '@/lib/media/import-generated-image';
import { readFile } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';
import { prepareJudgeImage } from '@/lib/brand-fidelity/judge-image';
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } from '@/lib/security/fetch-with-limit';
import { getStorageProvider } from '@/lib/storage';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

export const FEATURE_IMAGE_BUDGET = 4;
/** Een library-match moet óók de coherence-judge passeren — anders AI-pad. */
const LIBRARY_ACCEPT_COHERENCE = 55;

const featureSlotSchema = z.object({
  // max 99: de gap-fill stuurt een cumulatieve slotIndex over componenten —
  // bij user-toegevoegde feature-secties kan die boven het feature-budget
  // uitkomen; een te krappe cap 400'de dan de hele batch (review-3 2026-06-10).
  index: z.number().int().min(0).max(99),
  heading: z.string().min(1).max(200),
  body: z.string().min(1).max(600),
  // .catch(null): een malformed brief degradeert naar het heading/body-
  // fallback-pad i.p.v. de hele batch te laten 400'en.
  imageBrief: imageBriefSchema.nullable().optional().catch(null),
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
  )
  // Duplicate indices zouden de Map-lookups (coherence-pairing), de retry-
  // targeting én de persist-variantGroups corrumperen (review 2026-06-10) —
  // liever een expliciete 400 dan stil verkeerd gedrag.
  .refine(
    (b) => !b.features || new Set(b.features.map((f) => f.index)).size === b.features.length,
    'features[].index moet uniek zijn binnen de request',
  );

interface RouteParams {
  params: Promise<{ deliverableId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    // Resource-based: workspace van het deliverable i.p.v. cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const workspaceId = await resolveDeliverableWorkspaceId((await params).deliverableId);
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
    // F-C quality-mode (follow-up §9): kandidaten per slot via WorkspaceAiConfig
    // (featureKey 'lp-feature-image-candidates'); 1 = budget-default.
    const candidateCount = body.features ? await resolveFeatureCandidateCount(workspaceId) : 1;
    const slotsByIndex = new Map((body.features ?? []).map((f) => [f.index, f]));
    const judgeTextFor = (index: number): string => {
      const slot = slotsByIndex.get(index);
      return slot ? `${slot.heading}\n${slot.body}` : '';
    };

    interface GenResult {
      url: string;
      bytes: Buffer;
      prompt: string;
      index: number;
      durationMs: number;
      iterationCount: number;
      /** Beste niet-gekozen kandidaat (quality-mode) — gratis dupe-swap. */
      runnerUp: { bytes: Buffer; coherence: number | null; visibleLogo: boolean | null } | null;
      /** Winnaar-score uit de kandidaat-selectie (null bij count=1/judge-skip). */
      coherence: number | null;
      /** W5 logo L-Fase 2 — judge-boolean "zichtbaar logo?"; null = ongejudged
       *  of library-beeld (echte merkfoto mag het échte logo dragen). */
      visibleLogo: boolean | null;
      /** Herkomst: AI-generatie of een library-first match. */
      source: 'generated' | 'library';
      /** MediaAsset-id bij een library-match (provenance zonder string-parse). */
      assetId?: string;
    }

    const uploadBytes = async (bytes: Buffer, index: number) => {
      const upload = await storage.upload(bytes, {
        workspaceId,
        fileName: `feature-visual-${deliverableId}-${Date.now()}-${index}.png`,
        contentType: 'image/png',
      });
      return upload.url;
    };

    // Eén generatie-pad voor initiële slots én gerichte retries (Fase 4).
    // Per-slot duration + iteration in het resultaat: de audit-rows kregen
    // eerder de page-run-totaalduur en iterationCount 0 (follow-up §9).
    const generateOne = async (
      slot: BuiltFeaturePrompt,
      opts?: { iteration?: number; candidates?: number },
    ): Promise<GenResult | null> => {
      const t0 = Date.now();
      try {
        // Defaults bevatten anti-collage/triptiek; brandImageryDonts komen
        // gate-correct uit getBrandContext; brief.avoid → userNegations (R6/R7).
        const negativePrompt = buildNegativePrompt({
          brandImageryDonts: stack.brand?.brandImageryDonts ?? [],
          userNegations: slot.avoid ? [slot.avoid] : [],
        });
        const wantCandidates = opts?.candidates ?? candidateCount;
        const result = await generateFalImage(modelId, slot.prompt, {
          imageSize: 'landscape_4_3',
          // Empirisch geverifieerd (scripts/experiments/test-nano-banana-seed.ts):
          // nano-banana-pro honoreert num_images én is deterministisch per seed.
          numImages: wantCandidates,
          referenceImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
          negativePrompt,
          seed: slot.seed,
        });
        const hosted = (result.images ?? []).map((i) => i?.url).filter((u): u is string => Boolean(u)).slice(0, wantCandidates);
        if (hosted.length === 0) return null;
        // allSettled: één mislukte/oversized kandidaat mag het slot niet
        // killen wanneer een andere kandidaat wél binnen is (review follow-ups).
        const settled = await Promise.allSettled(hosted.map((u) => fetchWithSizeLimit(u, AI_IMAGE_SIZE_CAP)));
        const candidates = settled
          .filter((r): r is PromiseFulfilledResult<Buffer> => r.status === 'fulfilled')
          .map((r) => r.value);
        if (candidates.length === 0) return null;

        // Kandidaat-selectie (quality-mode): per kandidaat een G4-coherence-
        // oordeel vóór upload — alleen de winnaar wordt geüpload; de beste
        // verliezer blijft in geheugen als gratis dupe-swap. W5: een logo-vrije
        // kandidaat wint ALTIJD van een kandidaat mét (pseudo-)logo, daarna
        // pas op coherence — gratis logo-preventie (judges draaien toch al).
        let winnerPos = 0;
        let winnerScore: number | null = null;
        let winnerVisibleLogo: boolean | null = null;
        let runnerUp: GenResult['runnerUp'] = null;
        const judgeText = judgeTextFor(slot.index);
        if (candidates.length > 1 && judgeText) {
          const scored = await Promise.all(
            candidates.map(async (bytes) => {
              const prepared = await prepareJudgeImage(bytes);
              judgeCalls++;
              const r = await runCopyImageCoherenceJudge(
                { type: 'base64', mediaType: prepared.mediaType, data: prepared.buffer.toString('base64') },
                judgeText,
              );
              return r ? { score: r.score, visibleLogo: r.visibleLogo } : null;
            }),
          );
          const logoRank = (i: number): number => (scored[i]?.visibleLogo === true ? 1 : 0);
          const order = candidates
            .map((_, i) => i)
            .sort((a, b2) => logoRank(a) - logoRank(b2) || (scored[b2]?.score ?? -1) - (scored[a]?.score ?? -1));
          winnerPos = order[0];
          winnerScore = scored[winnerPos]?.score ?? null;
          winnerVisibleLogo = scored[winnerPos]?.visibleLogo ?? null;
          const second = order[1];
          if (second !== undefined) {
            runnerUp = {
              bytes: candidates[second],
              coherence: scored[second]?.score ?? null,
              visibleLogo: scored[second]?.visibleLogo ?? null,
            };
          }
        }

        const url = await uploadBytes(candidates[winnerPos], slot.index);
        return {
          url,
          bytes: candidates[winnerPos],
          prompt: slot.prompt,
          index: slot.index,
          durationMs: Date.now() - t0,
          iterationCount: opts?.iteration ?? 0,
          runnerUp,
          coherence: winnerScore,
          visibleLogo: winnerVisibleLogo,
          source: 'generated',
        };
      } catch (err) {
        console.error(`[generate-feature-visuals] ${modelId} idx=${slot.index} failed:`, err instanceof Error ? err.message : err);
        return null;
      }
    };

    // Per-index resultaat (behoudt request-volgorde); null bij falen.
    let judgeCalls = 0;
    let diversityCalls = 0;
    let retryAttempts = 0;

    // ── Library-first (tasks/lp-library-first-matching): echte merkfoto's
    // matchen vóór er gegenereerd wordt. Een match wordt alleen geaccepteerd
    // als de coherence-judge 'm ook bij de sectie-copy vindt passen ("echt
    // maar fout" is erger dan goed AI) — anders valt het slot terug op het
    // AI-pad. Gedekte slots kosten $0 aan fal-spend.
    const prefilled = new Map<number, GenResult>();
    if (body.features) {
      const matchRes = await matchLibraryImagesToSlots(
        workspaceId,
        body.features.map((f) => {
          const subject = f.imageBrief?.subject?.trim() ?? '';
          return {
            index: f.index,
            // Te korte subjects vallen terug op heading+body i.p.v. het slot
            // matching-loos te laten (review).
            query: subject.length >= 8 ? subject : `${f.heading}. ${f.body}`,
          };
        }),
      );
      await Promise.all([...matchRes.assignments].map(async ([index, match]) => {
        try {
          // Containment naar het send-to-library-patroon: alleen /uploads/.
          if (match.fileUrl.startsWith('/') && (!match.fileUrl.startsWith('/uploads/') || match.fileUrl.includes('..'))) {
            console.warn(`[generate-feature-visuals] library-match idx=${index} ongeldige fileUrl — AI-pad`);
            return;
          }
          const bytes = match.fileUrl.startsWith('/')
            ? await readFile(resolvePath(process.cwd(), 'public' + match.fileUrl))
            : await fetchWithSizeLimit(match.fileUrl, AI_IMAGE_SIZE_CAP);
          const judgeText = judgeTextFor(index);
          let score: number | null = null;
          if (judgeText) {
            const prepared = await prepareJudgeImage(bytes);
            judgeCalls++;
            const r = await runCopyImageCoherenceJudge(
              { type: 'base64', mediaType: prepared.mediaType, data: prepared.buffer.toString('base64') },
              judgeText,
            );
            score = r?.score ?? null;
          }
          // Fail-CLOSED: zonder judge-oordeel (geen key/timeout) accepteren we
          // de match niet — "echt maar fout" mag de poort niet ongezien door
          // (review library-first 2026-06-11).
          if (score === null || score < LIBRARY_ACCEPT_COHERENCE) {
            console.log(`[generate-feature-visuals] library-match idx=${index} afgewezen (coherence ${score ?? 'geen oordeel'} < ${LIBRARY_ACCEPT_COHERENCE}) — AI-pad`);
            return;
          }
          prefilled.set(index, {
            url: match.fileUrl,
            bytes,
            prompt: `library:${match.assetId} (similarity ${match.similarity.toFixed(2)})`,
            index,
            durationMs: 0,
            iterationCount: 0,
            runnerUp: null,
            coherence: score,
            // W5: een library-beeld is een échte merkfoto — een logo daarop is
            // het échte logo en dus toegestaan ("of het juiste, of geen").
            visibleLogo: null,
            source: 'library',
            assetId: match.assetId,
          });
        } catch (err) {
          console.warn(`[generate-feature-visuals] library-match idx=${index} laad-fout — AI-pad:`, err instanceof Error ? err.message : err);
        }
      }));
      if (matchRes.diagnostics.length > 0) {
        console.log(`[generate-feature-visuals] library-first diagnostiek: ${matchRes.diagnostics.join(' | ')}`);
      }
    }

    const generated = await Promise.all(
      built.map((slot) => prefilled.get(slot.index) ?? generateOne(slot)),
    );

    // ── Fase 4 kwaliteitspoort (alleen v2: legacy mist de copy om tegen te
    // judgen). Paired G4-coherence (beeld-i vs copy-i) + multi-image set-
    // diversity-judge + gratis runner-up-swap + budget-capped gerichte retry.
    const coherenceScores: Array<number | null> = generated.map((g) => g?.coherence ?? null);
    // W5 — logo-spiegel naast de coherence-scores; null = ongejudged/library.
    const visibleLogos: Array<boolean | null> = generated.map((g) => g?.visibleLogo ?? null);
    let dupePairs: Array<[number, number]> = [];
    const regenerated: number[] = [];
    const swapped: number[] = [];
    if (body.features) {
      // count=1-pad: winnaar is nog niet gejudged — paired judge op de upload.
      // Beelden gaan voorbereid (≤4MB, judge-image.ts) naar de vision-judges;
      // ongeschaalde PNG's >5MB maakten de judge anders stil inert (§9).
      const judged = await Promise.all(
        generated.map(async (g, pos) => {
          if (!g || coherenceScores[pos] !== null) return null;
          const judgeText = judgeTextFor(g.index);
          if (!judgeText) return null;
          const prepared = await prepareJudgeImage(g.bytes);
          judgeCalls++;
          return runCopyImageCoherenceJudge(
            { type: 'base64', mediaType: prepared.mediaType, data: prepared.buffer.toString('base64') },
            judgeText,
          ).then((r) => ({ pos, result: r }));
        }),
      );
      for (const j of judged) {
        if (j?.result) {
          coherenceScores[j.pos] = j.result.score;
          // W5: alleen AI-beelden — library blijft null (echte logo toegestaan).
          if (generated[j.pos]?.source !== 'library') visibleLogos[j.pos] = j.result.visibleLogo;
        }
      }

      const preparedWinners = await Promise.all(
        generated.map(async (g) => (g ? { g, prepared: await prepareJudgeImage(g.bytes) } : null)),
      );
      const setImages = preparedWinners
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map(({ g, prepared }) => ({ index: g.index, buffer: prepared.buffer, mediaType: prepared.mediaType }));
      diversityCalls++;
      const diversity = await runFeatureSetDiversityJudge(setImages);
      dupePairs = diversity?.duplicatePairs ?? [];

      // Gratis dupe-swap (quality-mode): de verliezer van een dupe-paar wisselt
      // naar zijn runner-up-kandidaat — al gegenereerd, dus $0 extra. Pas
      // daarna beslist de gate over (resterende) regeneraties.
      let unresolvedPairs: Array<[number, number]> = [];
      for (const [a, b2] of dupePairs) {
        const posA = generated.findIndex((g) => g?.index === a);
        const posB = generated.findIndex((g) => g?.index === b2);
        if (posA < 0 || posB < 0) { continue; }
        const sa = coherenceScores[posA];
        const sb = coherenceScores[posB];
        const aLib = generated[posA]?.source === 'library';
        const bLib = generated[posB]?.source === 'library';
        // Een échte merkfoto mag nooit de verliezer zijn van een (library, AI)-
        // paar — de AI-sibling kan op dezelfde foto geconditioneerd zijn via de
        // brand-anchors (review library-first 2026-06-11). Beide library → skip.
        let loserPos: number;
        if (aLib && bLib) { continue; }
        else if (aLib) loserPos = posB;
        else if (bLib) loserPos = posA;
        else if (sa !== null && sb !== null && sa !== sb) loserPos = sa < sb ? posA : posB;
        else if (generated[posB]?.runnerUp) loserPos = posB;
        else if (generated[posA]?.runnerUp) loserPos = posA;
        else loserPos = posB;
        const loser = generated[loserPos];
        if (loser?.runnerUp) {
          // Fail-soft: een falende runner-up-upload mag de run niet 500'en —
          // dan blijft de originele winnaar staan en beslist de gate.
          try {
            const url = await uploadBytes(loser.runnerUp.bytes, loser.index);
            generated[loserPos] = {
              ...loser,
              url,
              bytes: loser.runnerUp.bytes,
              coherence: loser.runnerUp.coherence,
              visibleLogo: loser.runnerUp.visibleLogo,
              runnerUp: null,
            };
            coherenceScores[loserPos] = loser.runnerUp.coherence;
            visibleLogos[loserPos] = loser.runnerUp.visibleLogo;
            swapped.push(loser.index);
          } catch (err) {
            console.warn(`[generate-feature-visuals] runner-up-swap idx=${loser.index} faalde — origineel blijft:`, err instanceof Error ? err.message : err);
            unresolvedPairs.push([a, b2]);
          }
        } else {
          unresolvedPairs.push([a, b2]);
        }
      }

      // Her-verificatie na swaps: een runner-up uit dezelfde batch kan zélf op
      // de partner lijken — zonder re-judge zou het paar stil aan de gate
      // onttrokken worden (review follow-ups). Eén extra Haiku-call (~$0,005).
      if (swapped.length > 0) {
        const rePrepared = await Promise.all(
          generated.map(async (g) => (g ? { g, prepared: await prepareJudgeImage(g.bytes) } : null)),
        );
        diversityCalls++;
        const reCheck = await runFeatureSetDiversityJudge(
          rePrepared
            .filter((x): x is NonNullable<typeof x> => Boolean(x))
            .map(({ g, prepared }) => ({ index: g.index, buffer: prepared.buffer, mediaType: prepared.mediaType })),
        );
        unresolvedPairs = reCheck?.duplicatePairs ?? unresolvedPairs;
      }

      const protectedIndices = new Set(
        generated.filter((g): g is NonNullable<typeof g> => g?.source === 'library').map((g) => g.index),
      );
      const decision = decideFeatureRegenerations(
        generated
          .map((g, pos) => (g ? { index: g.index, coherenceScore: coherenceScores[pos], visibleLogo: visibleLogos[pos] } : null))
          .filter((s): s is { index: number; coherenceScore: number | null; visibleLogo: boolean | null } => Boolean(s)),
        unresolvedPairs,
        undefined,
        protectedIndices,
      );

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
            const dupePartner = unresolvedPairs.find(([a, b2]) => a === index || b2 === index);
            const otherIndex = dupePartner ? (dupePartner[0] === index ? dupePartner[1] : dupePartner[0]) : null;
            const sharpened = sharpenFeaturePromptForRetry(
              built[pos],
              // W5: een gedetecteerd (pseudo-)logo krijgt z'n eigen hard-verbod-
              // aanscherping — prompt-laag alleen haalt nooit 0 (plan §5).
              reason === 'visible-logo'
                ? { kind: 'visible-logo', subject: subjectFor(index) }
                : reason === 'duplicate' && otherIndex !== null
                  ? { kind: 'duplicate', otherSubject: subjectFor(otherIndex) }
                  : { kind: 'low-coherence', subject: subjectFor(index), rationale: judgeRationale },
            );
            // Retry bewust met 1 kandidaat (kosten-cap); iteration=1 in de
            // audit-row. `regenerated` telt alleen GESLAAGDE retries (§9).
            retryAttempts++;
            const retry = await generateOne(sharpened, { iteration: 1, candidates: 1 });
            if (retry) {
              generated[pos] = retry;
              coherenceScores[pos] = retry.coherence;
              visibleLogos[pos] = retry.visibleLogo;
              regenerated.push(index);
            }
          }),
        );
      }
    }
    const elapsedMs = Date.now() - startMs;
    // Kosten-telemetrie per page-run (pilot-stuurbaarheid, audit §5).
    const genCount = generated.filter(Boolean).length;
    // Werkelijke tellers i.p.v. afgeleide formules: gefaalde retries kosten
    // wél fal-spend en geskipte judges tellen niet (review follow-ups).
    // Initiële fal-calls = slots zónder library-prefill (×candidateCount);
    // regens tellen apart via retryAttempts — een geregenereerd library-slot
    // telt zo alleen als retry, niet óók als initiële generatie (review).
    const initialAiGenAttempts = built.filter((b) => !prefilled.has(b.index)).length;
    const estCost =
      (initialAiGenAttempts * candidateCount + retryAttempts) * 0.13 +
      judgeCalls * 0.001 +
      diversityCalls * 0.005;
    console.log(
      `[generate-feature-visuals] page-run deliverable=${deliverableId} model=${modelId} slots=${built.length} ok=${genCount} candidates=${candidateCount} coherence=[${coherenceScores.map((s) => s ?? '–').join(',')}] logos=[${visibleLogos.map((l) => (l === null ? '–' : l ? 'Y' : 'n')).join(',')}] dupes=${JSON.stringify(dupePairs)} swaps=[${swapped.join(',')}] regens=[${regenerated.join(',')}] retryAttempts=${retryAttempts} judges=${judgeCalls}+${diversityCalls} durationMs=${elapsedMs} estCost=$${estCost.toFixed(2)}`,
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
                imageSource: g.source === 'library' && g.assetId ? `library:${g.assetId}` : 'ai_generated',
                imagePromptUsed: g.prompt,
                // Library-rows claimen geen AI-betrokkenheid (patroon
                // select-library-visual: provider/model null).
                aiProvider: g.source === 'library' ? null : (modelId.startsWith('openai/') ? 'openai' : 'fal'),
                aiModel: g.source === 'library' ? null : modelId,
                generationDuration: g.durationMs,
                status: 'GENERATED',
                generatedAt: new Date(),
                iterationCount: g.iterationCount,
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

    // Library-groei (follow-up 2026-06-11): definitieve AI-winnaars worden
    // fire-and-forget als MediaAsset geregistreerd — de tagger-keten levert
    // beschrijving + embedding zodat de matcher ze bij een volgende pagina
    // kan hergebruiken ($0) i.p.v. opnieuw te genereren. Alleen v2 + alleen
    // 'generated' (library-matches zíjn al assets).
    if (body.features) {
      for (const g of generated) {
        if (!g || g.source !== 'generated') continue;
        const slot = slotsByIndex.get(g.index);
        void importGeneratedImageToLibrary({
          workspaceId,
          fileUrl: g.url,
          fileSize: g.bytes.length,
          name: slot?.imageBrief?.subject?.trim() || slot?.heading || 'Gegenereerd feature-beeld',
          sceneType: slot?.imageBrief?.sceneType ?? null,
          uploadedById: session.user.id,
        });
      }
    }

    // urls index-aligned met de request-volgorde (legacy contract intact);
    // sources geeft herkomst per slot ('generated' | 'library' | null),
    // coherence de G4-score per slot (null = judge geskipt).
    const urls = generated.map((g) => g?.url ?? null);
    const sources = generated.map((g) => g?.source ?? null);
    return NextResponse.json({ urls, sources, coherence: coherenceScores, regenerated, swapped });
  } catch (err) {
    console.error('[generate-feature-visuals] error:', err);
    return NextResponse.json({ error: 'Failed to generate feature visuals' }, { status: 500 });
  }
}
