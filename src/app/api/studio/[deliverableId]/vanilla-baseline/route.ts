import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { prisma } from '@/lib/prisma';
import { generateVanillaBaseline } from '@/lib/brand-fidelity/vanilla-baseline';
import { computeFidelityScore } from '@/lib/brand-fidelity/composition-engine';
import { buildFidelityScoreEventPayload } from '@/lib/brand-fidelity/fidelity-runner';

interface PersonalityTraitInput {
  name?: string;
  description?: string;
  weAreThis?: string;
  butNeverThat?: string;
}
interface BrandPersonalityInput {
  personalityTraits?: PersonalityTraitInput[];
  wordsWeUse?: string[];
  brandVoiceDescription?: string;
}

/**
 * Fetch voice signals voor symmetric scoring tussen Branddock en vanille.
 * BV-WIRE: voiceguide (wordsWeUse + voiceDescription) + legacy
 * BrandPersonality (personalityTraits) — zelfde shape als fidelity-runner.
 */
async function fetchWorkspaceBrandPersonality(
  workspaceId: string,
): Promise<BrandPersonalityInput | null> {
  try {
    const [voiceguide, asset] = await Promise.all([
      prisma.brandVoiceguide.findUnique({
        where: { workspaceId },
        select: { wordsWeUse: true, voiceDescription: true },
      }),
      prisma.brandAsset.findFirst({
        where: { workspaceId, frameworkType: 'BRAND_PERSONALITY' },
        select: { frameworkData: true },
      }),
    ]);

    const personalityData = (asset?.frameworkData ?? null) as Record<string, unknown> | null;

    let wordsWeUse: string[] = [];
    let brandVoiceDescription: string | undefined;

    if (voiceguide && (voiceguide.wordsWeUse?.length || voiceguide.voiceDescription)) {
      wordsWeUse = (voiceguide.wordsWeUse ?? []).filter((w): w is string => typeof w === 'string');
      brandVoiceDescription =
        typeof voiceguide.voiceDescription === 'string' && voiceguide.voiceDescription.length > 0
          ? voiceguide.voiceDescription
          : undefined;
    } else if (personalityData) {
      if (Array.isArray(personalityData.wordsWeUse)) {
        wordsWeUse = personalityData.wordsWeUse.filter((w): w is string => typeof w === 'string');
      }
      if (typeof personalityData.brandVoiceDescription === 'string') {
        brandVoiceDescription = personalityData.brandVoiceDescription;
      }
    }

    const traitsRaw =
      personalityData && Array.isArray(personalityData.personalityTraits)
        ? personalityData.personalityTraits
        : [];
    const personalityTraits: PersonalityTraitInput[] = traitsRaw
      .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
      .map((t) => ({
        name: typeof t.name === 'string' ? t.name : undefined,
        description: typeof t.description === 'string' ? t.description : undefined,
        weAreThis: typeof t.weAreThis === 'string' ? t.weAreThis : undefined,
        butNeverThat: typeof t.butNeverThat === 'string' ? t.butNeverThat : undefined,
      }));

    if (wordsWeUse.length === 0 && personalityTraits.length === 0) return null;
    return { wordsWeUse, personalityTraits, brandVoiceDescription };
  } catch {
    return null;
  }
}

// Maximaal 2 minuten — vanille generatie 20-40s + composition ~20s
export const maxDuration = 120;

interface DeliverableBrief {
  objective?: string;
  keyMessage?: string;
  toneDirection?: string;
  callToAction?: string;
  contentOutline?: string[];
}

// ---------------------------------------------------------------------------
// POST /api/studio/[deliverableId]/vanilla-baseline
//
// Streams SSE events voor de "Vergelijk met vanille AI" demo-panel.
// Genereert een GPT-4o output op basis van alleen de deliverable brief
// (geen BVD/HVD/brand context) en scoort het door dezelfde composition
// engine. Resultaat: vanilla score om naast de Branddock score te tonen.
// ---------------------------------------------------------------------------
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: { campaign: { select: { workspaceId: true } } },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }
    if (!deliverable.campaign || deliverable.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const settings = (deliverable.settings as Record<string, unknown> | null) ?? {};
    const brief = (settings.brief as DeliverableBrief | undefined) ?? {};
    const objective = brief.objective?.trim();
    if (!objective) {
      return NextResponse.json(
        { error: 'Deliverable has no brief.objective — cannot run vanilla baseline' },
        { status: 400 },
      );
    }

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

        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch {
            /* stream closed */
          }
        }, 15_000);

        try {
          // ── Step 1: vanille tekst genereren ──
          sendEvent('vanilla_generating', { stage: 'text' });

          const baseline = await generateVanillaBaseline({
            contentTypeId: deliverable.contentType,
            objective,
            keyMessage: brief.keyMessage?.trim() || undefined,
            toneDirection: brief.toneDirection?.trim() || undefined,
            callToAction: brief.callToAction?.trim() || undefined,
            contentOutline: Array.isArray(brief.contentOutline)
              ? brief.contentOutline.filter((s): s is string => typeof s === 'string')
              : undefined,
          });

          sendEvent('vanilla_text_complete', {
            wordCount: baseline.wordCount,
            generationMs: baseline.generationMs,
            model: baseline.model,
            // Eerste 800 chars als preview voor UI; volledige tekst niet over wire
            preview: baseline.text.slice(0, 800),
          });

          // ── Step 2: scoren via composition engine ──
          sendEvent('vanilla_scoring', { stage: 'scoring' });

          // Symmetric scoring: vanille output wordt gescoord TEGEN de
          // workspace's BrandPersonality signals — dezelfde standaard als
          // de Branddock-side. Vanille kent de declared wordsWeUse +
          // personalityTraits niet (geen BVD geinjecteerd in generation),
          // dus pijler 1 score zakt — dat IS het demo-signaal. Asymmetric
          // weighting (personality:null) zou vanille kunstmatig hoog
          // scoren omdat pijler 1's 0.35 weight herverdeelt.
          const brandPersonality = await fetchWorkspaceBrandPersonality(workspaceId);

          const fidelityResult = await computeFidelityScore({
            contentText: baseline.text,
            workspaceId,
            brandName: 'Vanilla baseline',
            brandVoiceSummary: 'No brand voice specified — generic content writer.',
            personality: brandPersonality, // gelijke maat als Branddock-scoring
            generatorProvider: 'openai',
            targetWordCount: baseline.wordCount, // length-control uit (gebruik eigen length)
          });

          sendEvent('vanilla_score_complete', {
            ...buildFidelityScoreEventPayload(fidelityResult),
            generationMs: baseline.generationMs,
            model: baseline.model,
            wordCount: baseline.wordCount,
          });

          sendEvent('complete', {
            totalMs: baseline.generationMs + fidelityResult.elapsedMs,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('[POST /api/studio/vanilla-baseline] Pipeline error:', message);
          sendEvent('error', { message, recoverable: false });
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
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (error) {
    console.error('[POST /api/studio/[deliverableId]/vanilla-baseline]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
