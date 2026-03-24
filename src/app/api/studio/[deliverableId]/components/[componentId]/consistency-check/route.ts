import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import { createStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import type { ConsistencyCheckResult, ConsistencyFlag } from '@/types/studio';

/**
 * POST /api/studio/[deliverableId]/components/[componentId]/consistency-check
 *
 * Check the consistency of a component's content against its approved siblings.
 * Evaluates tone, messaging, brand voice, and CTA alignment.
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
    });
    if (!component) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!component.generatedContent) {
      return NextResponse.json({ error: 'No generated content to check' }, { status: 400 });
    }

    // Get approved siblings
    const approvedSiblings = await prisma.deliverableComponent.findMany({
      where: {
        deliverableId,
        status: 'APPROVED',
        id: { not: componentId },
      },
      select: {
        id: true,
        componentType: true,
        generatedContent: true,
      },
    });

    if (approvedSiblings.length === 0) {
      // No approved siblings to compare against
      const result: ConsistencyCheckResult = {
        overallScore: 100,
        flags: [],
        deliverableCount: 0,
      };
      return NextResponse.json(result);
    }

    // Resolve AI model
    const resolved = await resolveFeatureModel(workspaceId, 'content-quality');

    // Build sibling context
    const siblingContext = approvedSiblings
      .filter((s) => s.generatedContent)
      .map((s) => `### ${s.componentType} (APPROVED)\n${s.generatedContent}`)
      .join('\n\n');

    const systemPrompt = `You are a brand consistency analyst. Your job is to evaluate whether a new piece of content is consistent with previously approved content for the same deliverable.

Evaluate these dimensions:
1. **Tone mismatch** — Does the tone match the approved content?
2. **Message drift** — Does the messaging align with the established direction?
3. **Visual inconsistency** — Are visual/formatting styles consistent (if applicable)?
4. **CTA conflict** — Do calls-to-action complement rather than contradict each other?

Return valid JSON with this structure:
{
  "overallScore": <number 0-100>,
  "flags": [
    {
      "type": "tone_mismatch" | "message_drift" | "visual_inconsistency" | "cta_conflict",
      "severity": "high" | "medium" | "low",
      "description": "<specific description of the issue>",
      "deliverables": ["<names of conflicting components>"]
    }
  ]
}

If the content is fully consistent, return an overallScore of 100 and an empty flags array.`;

    const userPrompt = `## Content Under Review
Type: ${component.componentType}
Label: ${component.componentType}
Content:
${component.generatedContent}

## Approved Siblings
${siblingContext}

Evaluate the content under review for consistency with the approved siblings. Return JSON.`;

    const aiResult = await createStructuredCompletion(
      resolved.provider,
      resolved.model,
      systemPrompt,
      userPrompt,
      { maxTokens: 2000 },
    );

    // Parse the response
    let result: ConsistencyCheckResult = {
      overallScore: 100,
      flags: [],
      deliverableCount: approvedSiblings.length,
    };

    try {
      const text = typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const validTypes = ['tone_mismatch', 'message_drift', 'visual_inconsistency', 'cta_conflict'];
        const validSeverities = ['high', 'medium', 'low'];

        const flags: ConsistencyFlag[] = (Array.isArray(parsed.flags) ? parsed.flags : [])
          .filter((f: Record<string, unknown>) => validTypes.includes(f.type as string))
          .map((f: Record<string, unknown>) => ({
            type: f.type as ConsistencyFlag['type'],
            severity: validSeverities.includes(f.severity as string)
              ? (f.severity as ConsistencyFlag['severity'])
              : 'low',
            description: String(f.description || ''),
            deliverables: Array.isArray(f.deliverables)
              ? (f.deliverables as string[]).map(String)
              : [],
          }));

        result = {
          overallScore: Math.max(0, Math.min(100, Number(parsed.overallScore) || 100)),
          flags,
          deliverableCount: approvedSiblings.length,
        };
      }
    } catch {
      console.warn('[Consistency Check] Failed to parse AI response');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Consistency Check]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
