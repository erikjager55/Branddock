import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import { createStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import { getBrandContext } from '@/lib/ai/brand-context';
import { formatBrandContext } from '@/lib/ai/prompt-templates';

/**
 * POST /api/studio/[deliverableId]/components/[componentId]/persona-check
 *
 * Simulate persona reactions to the generated content of a component.
 * Returns an array of persona reactions with sentiment and relevance scores.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string; componentId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId, componentId } = await params;

    const component = await prisma.deliverableComponent.findFirst({
      where: { id: componentId, deliverableId, deliverable: { campaign: { workspaceId } } },
      include: {
        deliverable: {
          include: {
            campaign: {
              select: { id: true, title: true, campaignGoalType: true },
            },
          },
        },
      },
    });
    if (!component) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!component.generatedContent) {
      return NextResponse.json({ error: 'No generated content to check' }, { status: 400 });
    }

    // Get personas linked to this workspace
    const personas = await prisma.persona.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        occupation: true,
        age: true,
        goals: true,
        frustrations: true,
        interests: true,
        buyingTriggers: true,
      },
      take: 5,
    });

    if (personas.length === 0) {
      return NextResponse.json({ reactions: [] });
    }

    // Resolve AI model for content generation feature
    const resolved = await resolveFeatureModel(workspaceId, 'content-quality');

    // Build brand context
    const brandData = await getBrandContext(workspaceId);
    const brandContext = formatBrandContext(brandData);

    // Build persona descriptions
    const personaDescriptions = personas.map((p) => {
      const goals = Array.isArray(p.goals) ? (p.goals as string[]).join(', ') : '';
      const frustrations = Array.isArray(p.frustrations) ? (p.frustrations as string[]).join(', ') : '';
      return `- ${p.name} (${p.occupation || 'unknown role'}, age ${p.age || '?'}): Goals: ${goals}. Frustrations: ${frustrations}.`;
    }).join('\n');

    const systemPrompt = `You are a persona reaction simulator for brand content evaluation.
Given a piece of generated content and a set of target personas, simulate how each persona would react to the content.

For each persona, provide:
- A short reaction quote (1-2 sentences, in first person from the persona's perspective)
- A relevance score (0-100) — how relevant this content is to the persona
- A sentiment: "positive", "neutral", or "negative"

Return valid JSON as an array of objects with keys: personaId, personaName, reaction, relevanceScore, sentiment.`;

    const userPrompt = `## Brand Context
${brandContext.slice(0, 2000)}

## Campaign
Title: ${component.deliverable.campaign.title}
Goal: ${component.deliverable.campaign.campaignGoalType || 'Not specified'}

## Content to Evaluate
Type: ${component.componentType}
Content: ${component.generatedContent}

## Target Personas
${personaDescriptions}

Simulate each persona's reaction to this content. Return a JSON array.`;

    const result = await createStructuredCompletion(
      resolved.provider,
      resolved.model,
      systemPrompt,
      userPrompt,
      { maxTokens: 2000 },
    );

    // Parse the response — extract JSON array
    let reactions: Array<{
      personaId: string;
      personaName: string;
      reaction: string;
      relevanceScore: number;
      sentiment: string;
    }> = [];

    try {
      const text = typeof result === 'string' ? result : JSON.stringify(result);
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        reactions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If parsing fails, return empty reactions
      console.warn('[Persona Check] Failed to parse AI response');
    }

    // Map AI persona names back to actual persona IDs
    const mappedReactions = reactions.map((r) => {
      const matchedPersona = personas.find(
        (p) => p.name.toLowerCase() === (r.personaName || '').toLowerCase(),
      );
      return {
        personaId: matchedPersona?.id || r.personaId || 'unknown',
        personaName: matchedPersona?.name || r.personaName || 'Unknown',
        reaction: r.reaction || '',
        relevanceScore: Math.max(0, Math.min(100, r.relevanceScore || 50)),
        sentiment: (['positive', 'neutral', 'negative'].includes(r.sentiment)
          ? r.sentiment
          : 'neutral') as 'positive' | 'neutral' | 'negative',
      };
    });

    return NextResponse.json({ reactions: mappedReactions });
  } catch (error) {
    console.error('[Persona Check]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
