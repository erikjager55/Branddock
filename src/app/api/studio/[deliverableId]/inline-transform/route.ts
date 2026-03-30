import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import { createStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { formatBrandPersonality, type BrandPersonalityData } from '@/lib/ai/brand-context';

// ---------------------------------------------------------------------------
// POST /api/studio/[deliverableId]/inline-transform
// Transforms selected text using an AI action (shorter, urgent, brand_voice, simplify).
// ---------------------------------------------------------------------------

const VALID_ACTIONS = ['shorter', 'urgent', 'brand_voice', 'simplify'] as const;
type TransformAction = (typeof VALID_ACTIONS)[number];

interface TransformAIResponse {
  transformedText: string;
}

const ACTION_INSTRUCTIONS: Record<TransformAction, string> = {
  shorter:
    'Condense the selected text while preserving the core message and key information. Remove filler words and unnecessary phrases. Keep the same tone.',
  urgent:
    'Rewrite the selected text to increase urgency and strengthen the call-to-action. Use active voice, power words, and create a sense of immediacy.',
  brand_voice:
    'Rewrite the selected text to better match the brand personality and tone of voice. Maintain the original meaning but adjust word choice, sentence structure, and style.',
  simplify:
    'Simplify the selected text by using shorter sentences, simpler vocabulary, and clearer structure. Aim for a reading level accessible to a broad audience.',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const rateLimitResult = checkRateLimit(workspaceId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { deliverableId } = await params;

    let body: { selectedText?: string; action?: string; fullContent?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { selectedText, action, fullContent } = body;

    if (!selectedText || typeof selectedText !== 'string' || selectedText.trim().length === 0) {
      return NextResponse.json({ error: 'selectedText is required' }, { status: 400 });
    }

    if (selectedText.length > 5000) {
      return NextResponse.json({ error: 'selectedText exceeds maximum length of 5000 characters' }, { status: 400 });
    }

    if (fullContent !== undefined && typeof fullContent !== 'string') {
      return NextResponse.json({ error: 'fullContent must be a string' }, { status: 400 });
    }

    if (fullContent && fullContent.length > 10000) {
      return NextResponse.json({ error: 'fullContent exceeds maximum length of 10000 characters' }, { status: 400 });
    }

    if (!action || !VALID_ACTIONS.includes(action as TransformAction)) {
      return NextResponse.json(
        { error: `action must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 },
      );
    }

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

    // Fetch brand personality + styleguide for brand_voice action (parallel)
    let personalityContext = '';
    if (action === 'brand_voice') {
      const [personalityAsset, styleguide] = await Promise.all([
        prisma.brandAsset.findFirst({
          where: { workspaceId, frameworkType: 'BRAND_PERSONALITY' },
          select: { frameworkData: true },
        }),
        prisma.brandStyleguide.findFirst({
          where: { workspaceId },
          select: {
            contentGuidelines: true,
            writingGuidelines: true,
          },
        }),
      ]);

      if (personalityAsset?.frameworkData && typeof personalityAsset.frameworkData === 'object') {
        personalityContext = formatBrandPersonality(
          personalityAsset.frameworkData as BrandPersonalityData,
        );
      }

      if (styleguide) {
        const guidelines = [
          ...(styleguide.contentGuidelines ?? []),
          ...(styleguide.writingGuidelines ?? []),
        ]
          .filter(Boolean)
          .map((g) => `- ${g}`)
          .join('\n');
        if (guidelines) {
          personalityContext += `\n\nBrand Writing Guidelines:\n${guidelines}`;
        }
      }

      // Cap personality context to prevent prompt overflow (truncate at last newline)
      if (personalityContext.length > 4000) {
        const truncated = personalityContext.slice(0, 4000);
        const lastNewline = truncated.lastIndexOf('\n');
        personalityContext = lastNewline > 0 ? truncated.slice(0, lastNewline) : truncated;
      }
    }

    const transformAction = action as TransformAction;

    const systemPrompt =
      'You are an expert content editor. Transform the provided text according to the given instructions. Return valid JSON with a single field "transformedText" containing ONLY the rewritten plain text — no explanations, no preamble, no HTML tags.';

    const userPromptParts = [
      `## Instruction\n${ACTION_INSTRUCTIONS[transformAction]}`,
      personalityContext
        ? `## Brand Context\n${personalityContext}`
        : '',
      fullContent
        ? `## Surrounding Content (for context only — do NOT rewrite this)\n${fullContent.slice(0, 2000)}`
        : '',
      `## Text to Transform\n${selectedText}`,
    ];

    const userPrompt = userPromptParts.filter(Boolean).join('\n\n');

    const { provider, model } = await resolveFeatureModel(workspaceId, 'content-improve');

    const aiResponse = await createStructuredCompletion<TransformAIResponse>(
      provider,
      model,
      systemPrompt,
      userPrompt,
      { temperature: 0.7, maxTokens: 1024 },
    );

    const rawTransformed = aiResponse?.transformedText;
    const transformedText =
      typeof rawTransformed === 'string' && rawTransformed.trim().length > 0
        ? rawTransformed
        : selectedText;
    if (transformedText === selectedText) {
      console.warn('[inline-transform] AI returned no valid transformedText, falling back to original');
    }

    return NextResponse.json({ transformedText });
  } catch (error) {
    console.error('[POST /api/studio/[deliverableId]/inline-transform]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
