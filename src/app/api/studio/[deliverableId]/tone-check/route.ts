import { NextRequest, NextResponse } from 'next/server';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { prisma } from '@/lib/prisma';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import { createStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import { formatBrandPersonality, type BrandPersonalityData } from '@/lib/ai/brand-context';
import { serializePersona } from '@/lib/ai/context/persona-serializer';
import type { ValidationStatus } from '@/features/campaigns/types/canvas.types';

// ---------------------------------------------------------------------------
// POST /api/studio/[deliverableId]/tone-check
// Analyzes content against the workspace's BrandVoiceguide tone-of-voice data
// (verhuisd uit BrandStyleguide, ADR 2026-05-15).
// ---------------------------------------------------------------------------

interface ToneCheckAIResponse {
  toneScore: number;
  alignment: 'Strong' | 'Moderate' | 'Weak';
  overallMessage: string;
  violations: string[];
  suggestions: string[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    // Resource-based: workspace van het deliverable i.p.v. cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const workspaceId = await resolveDeliverableWorkspaceId((await params).deliverableId);
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: {
        campaign: { select: { workspaceId: true } },
      },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    if (!deliverable.campaign || deliverable.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const settings = (deliverable.settings ?? {}) as Record<string, unknown>;
    const targetPersonaIds = Array.isArray(settings.targetPersonas)
      ? settings.targetPersonas.filter((id): id is string => typeof id === 'string')
      : [];

    const body = await request.json() as { content: Record<string, string> };
    const content = body?.content;
    if (!content || typeof content !== 'object' || Object.keys(content).length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Fetch tone-of-voice content uit BrandVoiceguide (verhuisd uit BrandStyleguide,
    // ADR 2026-05-15). guidelinesSavedForAi gate vervangt toneSavedForAi.
    //
    // 2026-05-19: legacy fallback toegevoegd voor unmigrated workspaces.
    // BrandPersonality.frameworkData.contentGuidelines / .writingGuidelines
    // bestaan in oudere data-shape. Eerst voiceguide proberen; bij gemis
    // synthese uit legacy zodat de tone-check niet onnodig "no tone guidelines
    // configured" terugkrijgt.
    const voiceguideRow = await prisma.brandVoiceguide.findUnique({
      where: { workspaceId },
      select: {
        contentGuidelines: true,
        writingGuidelines: true,
        examplePhrases: true,
        guidelinesSavedForAi: true,
        examplePhrasesSavedForAi: true,
      },
    });

    type VoiceguideShape = {
      contentGuidelines: string[];
      writingGuidelines: string[];
      examplePhrases: unknown;
      examplePhrasesSavedForAi: boolean;
    };

    let voiceguide: VoiceguideShape | null =
      voiceguideRow && voiceguideRow.guidelinesSavedForAi
        ? {
            contentGuidelines: voiceguideRow.contentGuidelines,
            writingGuidelines: voiceguideRow.writingGuidelines,
            examplePhrases: voiceguideRow.examplePhrases,
            examplePhrasesSavedForAi: voiceguideRow.examplePhrasesSavedForAi,
          }
        : null;

    // Legacy fallback wanneer voiceguide ontbreekt/niet-saved-for-AI
    if (!voiceguide) {
      const personalityAssetForGuidelines = await prisma.brandAsset.findFirst({
        where: { workspaceId, frameworkType: 'BRAND_PERSONALITY' },
        select: { frameworkData: true },
      });
      const legacyData = (personalityAssetForGuidelines?.frameworkData ?? null) as
        | Record<string, unknown>
        | null;
      const legacyContent = Array.isArray(legacyData?.contentGuidelines)
        ? (legacyData.contentGuidelines as unknown[]).filter((v): v is string => typeof v === 'string')
        : [];
      const legacyWriting = Array.isArray(legacyData?.writingGuidelines)
        ? (legacyData.writingGuidelines as unknown[]).filter((v): v is string => typeof v === 'string')
        : [];
      if (legacyContent.length > 0 || legacyWriting.length > 0) {
        voiceguide = {
          contentGuidelines: legacyContent,
          writingGuidelines: legacyWriting,
          examplePhrases: null,
          examplePhrasesSavedForAi: false,
        };
      }
    }

    // No voiceguide AND no legacy guidelines → quick return
    if (!voiceguide) {
      return NextResponse.json({
        toneCheck: { status: 'warn' as ValidationStatus, message: 'No tone guidelines configured' },
        brandVoice: { score: 0, alignment: 'Pending' as const },
        details: [],
      });
    }

    const examplePhrasesAvailable =
      voiceguide.examplePhrasesSavedForAi &&
      voiceguide.examplePhrases &&
      typeof voiceguide.examplePhrases === 'object';
    const hasGuidelines =
      voiceguide.contentGuidelines.length > 0 ||
      voiceguide.writingGuidelines.length > 0 ||
      examplePhrasesAvailable;

    if (!hasGuidelines) {
      return NextResponse.json({
        toneCheck: { status: 'warn' as ValidationStatus, message: 'Tone guidelines are empty' },
        brandVoice: { score: 0, alignment: 'Pending' as const },
        details: [],
      });
    }

    // Fetch brand personality asset
    const personalityAsset = await prisma.brandAsset.findFirst({
      where: { workspaceId, frameworkType: 'BRAND_PERSONALITY' },
      select: { frameworkData: true },
    });

    let personalityText = '';
    if (personalityAsset?.frameworkData && typeof personalityAsset.frameworkData === 'object') {
      personalityText = formatBrandPersonality(personalityAsset.frameworkData as BrandPersonalityData);
    }

    // Fetch target personas
    let personasText = '';
    if (targetPersonaIds.length > 0) {
      const personas = await prisma.persona.findMany({
        where: { id: { in: targetPersonaIds }, workspaceId },
      });
      if (personas.length > 0) {
        const serialized = personas.map((p) => {
          const record = p as unknown as Record<string, unknown>;
          return `### ${p.name}\n${serializePersona(record)}`;
        });
        personasText = serialized.join('\n\n');
      }
    }

    // Build guidelines section
    const guidelinesText = [
      voiceguide.contentGuidelines.length > 0
        ? `Content Guidelines:\n${voiceguide.contentGuidelines.map((g) => `- ${g}`).join('\n')}`
        : '',
      voiceguide.writingGuidelines.length > 0
        ? `Writing Guidelines:\n${voiceguide.writingGuidelines.map((g) => `- ${g}`).join('\n')}`
        : '',
      voiceguide.examplePhrases && voiceguide.examplePhrasesSavedForAi
        ? `Example Phrases (do/don't):\n${JSON.stringify(voiceguide.examplePhrases, null, 2)}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    // Build content section
    const contentText = Object.entries(content)
      .map(([group, text]) => `[${group}]\n${text}`)
      .join('\n\n');

    const systemPrompt = `You are a brand tone-of-voice analyst. Score content against brand guidelines, brand personality, and target audience expectations. Respond with valid JSON only.`;

    const userPromptParts = [
      `## Brand Tone-of-Voice Guidelines\n\n${guidelinesText}`,
      personalityText ? `## Brand Personality\n\n${personalityText}` : '',
      personasText ? `## Target Personas\nEvaluate whether the tone is appropriate for these target personas:\n\n${personasText}` : '',
      `## Content to Analyze\n\n${contentText}`,
      `## Task
Analyze the content above against the brand's tone-of-voice guidelines${personalityText ? ', brand personality' : ''}${personasText ? ', and target persona expectations' : ''}. Return a JSON object with:
- "toneScore": number 0-100 (how well the content matches the brand tone)
- "alignment": "Strong" (score >= 80), "Moderate" (score >= 60), or "Weak" (score < 60)
- "overallMessage": a short summary (1-2 sentences) of the tone analysis
- "violations": array of specific guideline violations found (empty if none)
- "suggestions": array of specific improvement suggestions (empty if none)`,
    ];
    const userPrompt = userPromptParts.filter(Boolean).join('\n\n');

    const { provider, model } = await resolveFeatureModel(workspaceId, 'canvas-quality-check');

    const aiResponse = await createStructuredCompletion<ToneCheckAIResponse>(
      provider,
      model,
      systemPrompt,
      userPrompt,
      { temperature: 0.3, maxTokens: 2048 },
      {
        workspaceId,
        parentEntityType: 'Deliverable',
        parentEntityId: deliverableId,
        sourceIdentifier: 'src/app/api/studio/[deliverableId]/tone-check/route.ts:POST',
      },
    );

    // Normalize score to valid range
    const toneScore = Math.max(0, Math.min(100, Math.round(aiResponse.toneScore ?? 0)));

    // Map score to validation status
    let status: ValidationStatus = 'fail';
    if (toneScore >= 80) status = 'pass';
    else if (toneScore >= 60) status = 'warn';

    const details = [
      ...(aiResponse.violations ?? []),
      ...(aiResponse.suggestions ?? []),
    ];

    return NextResponse.json({
      toneCheck: {
        status,
        message: aiResponse.overallMessage || `Tone score: ${toneScore}/100`,
      },
      brandVoice: {
        score: toneScore,
        alignment: aiResponse.alignment || (toneScore >= 80 ? 'Strong' : toneScore >= 60 ? 'Moderate' : 'Weak'),
      },
      details,
    });
  } catch (error) {
    console.error('[POST /api/studio/[deliverableId]/tone-check]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
