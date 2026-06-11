// =============================================================================
// POST /api/studio/[deliverableId]/photo-brief — F42 (audit 2026-05-13)
//
// Genereert een fotograaf-briefing in markdown op basis van de Visual Brief
// + brand-context. User kan briefing downloaden en aan fotograaf geven; na
// shoot upload user de foto via Upload-source.
//
// Voor authenticity-critical content (case-studies, testimonials, locatie-
// specifiek) is echte fotografie hoogwaardiger dan AI-stock. Branddock
// faciliteert nu die workflow zonder het als default te pushen.
// =============================================================================

import { NextResponse } from 'next/server';
import { anthropicClient } from '@/lib/ai/anthropic-client';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
import { prisma } from '@/lib/prisma';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';

const PHOTO_BRIEF_SYSTEM_PROMPT = `Je bent een creative director die fotograaf-briefings schrijft. Op basis van de brand-context + visual-brief schrijf je een concrete, actionable briefing voor een fotograaf.

Structureer als markdown met deze secties:
1. **Doel** — wat moet de foto communiceren (1-2 zinnen)
2. **Onderwerp & compositie** — wie/wat staat er, framing
3. **Locatie & setting** — waar wordt geschoten, achtergrond, props
4. **Lighting & mood** — natuurlijk/studio, warm/koel, tijd van dag
5. **Wardrobe / styling** — kleding-stijl, kleuren-palet aansluitend op brand
6. **Technische specs** — gewenste aspect ratio, resolutie minimum, output formaat
7. **Anti-patterns** — wat de foto NIET moet zijn (cliché stock-look, etc)

Maak het concreet en handelbaar. Geen vage termen ("authentic", "premium"); altijd concreet ("medewerker in keukenuniform, half-portret, koksjas zichtbaar, geen handen in beeld").`;

interface RouteParams {
  params: Promise<{ deliverableId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    // Resource-based: workspace van het deliverable i.p.v. cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const workspaceId = await resolveDeliverableWorkspaceId((await params).deliverableId);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: { campaign: { select: { workspaceId: true } } },
    });
    if (!deliverable || deliverable.campaign?.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 500 });
    }

    // Build context — same stack als canvas-orchestrator gebruikt
    const stack = await assembleCanvasContext(deliverableId, workspaceId);
    if (!stack) {
      return NextResponse.json({ error: 'Could not assemble context' }, { status: 500 });
    }

    const brandSummary = [
      stack.brand.brandName ? `Brand: ${stack.brand.brandName}` : '',
      stack.brand.brandPurpose ? `Purpose: ${stack.brand.brandPurpose}` : '',
      stack.brand.brandPersonality ? `Personality: ${stack.brand.brandPersonality}` : '',
      stack.brand.brandImageryStyle ? `Imagery style: ${stack.brand.brandImageryStyle}` : '',
      stack.brand.brandColors ? `Colors: ${stack.brand.brandColors}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const visualBrief = stack.visualBrief;
    const briefSummary = [
      visualBrief?.briefingText ? `Subject: ${visualBrief.briefingText}` : '',
      visualBrief?.styleDirection ? `Style direction: ${visualBrief.styleDirection}` : '',
      visualBrief?.styleDirectionFreeText
        ? `Additional direction: ${visualBrief.styleDirectionFreeText}`
        : '',
      stack.brief?.keyMessage ? `Key message: ${stack.brief.keyMessage}` : '',
      stack.brief?.objective ? `Objective: ${stack.brief.objective}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const userPrompt = `# Brand context\n${brandSummary}\n\n# Visual brief\n${briefSummary}\n\n# Content type\n${stack.deliverableTypeId ?? 'unknown'}\n\nSchrijf een fotograaf-briefing in markdown.`;

    // Central client (T7, prompt-audit 2026-06-11): retry, truncation
    // detection and the temperature-deprecation guard — the raw SDK call
    // here bypassed all of them. Temperature is passed through; the client
    // drops it for temp-deprecated models (sonnet-4-6 today, precaution).
    const { content: markdown } = await anthropicClient.createChatCompletion(
      [
        { role: 'system', content: PHOTO_BRIEF_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { model: 'claude-sonnet-4-6', maxTokens: 2000, temperature: 0.4 },
    );
    if (!markdown.trim()) {
      return NextResponse.json({ error: 'Generation produced empty brief' }, { status: 502 });
    }

    return NextResponse.json({ markdown });
  } catch (err) {
    console.error('[POST /api/studio/photo-brief]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 },
    );
  }
}
