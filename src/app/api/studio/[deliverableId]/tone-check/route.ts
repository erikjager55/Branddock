import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import { createStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import { formatBrandPersonality, type BrandPersonalityData } from '@/lib/ai/brand-context';
import { serializePersona } from '@/lib/ai/context/persona-serializer';
import type { ValidationStatus } from '@/features/campaigns/types/canvas.types';

// ---------------------------------------------------------------------------
// POST /api/studio/[deliverableId]/tone-check
// Analyzes content against the workspace's BrandStyleguide tone-of-voice data.
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
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

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

    // Fetch brand styleguide tone data
    const styleguide = await prisma.brandStyleguide.findFirst({
      where: { workspaceId },
      select: {
        contentGuidelines: true,
        writingGuidelines: true,
        examplePhrases: true,
        toneSavedForAi: true,
      },
    });

    // No styleguide or tone not saved for AI → quick return
    if (!styleguide || !styleguide.toneSavedForAi) {
      return NextResponse.json({
        toneCheck: { status: 'warn' as ValidationStatus, message: 'No tone guidelines configured' },
        brandVoice: { score: 0, alignment: 'Pending' as const },
        details: [],
      });
    }

    const hasGuidelines =
      styleguide.contentGuidelines.length > 0 ||
      styleguide.writingGuidelines.length > 0 ||
      (styleguide.examplePhrases && typeof styleguide.examplePhrases === 'object');

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
      styleguide.contentGuidelines.length > 0
        ? `Content Guidelines:\n${styleguide.contentGuidelines.map((g) => `- ${g}`).join('\n')}`
        : '',
      styleguide.writingGuidelines.length > 0
        ? `Writing Guidelines:\n${styleguide.writingGuidelines.map((g) => `- ${g}`).join('\n')}`
        : '',
      styleguide.examplePhrases
        ? `Example Phrases (do/don't):\n${JSON.stringify(styleguide.examplePhrases, null, 2)}`
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
