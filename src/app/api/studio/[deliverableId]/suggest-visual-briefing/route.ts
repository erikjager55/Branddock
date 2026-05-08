import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { anthropicClient } from '@/lib/ai/anthropic-client';

// ---------------------------------------------------------------------------
// POST /api/studio/[deliverableId]/suggest-visual-briefing
//
// Generates a 1-2 sentence concrete subject-omschrijving for the Visual
// Brief textarea, derived from the full canvas context (brand, persona,
// product, key message, campaign theme, style chip). User clicks "Suggest
// from content" → gets a fotograaf-style briefing they can edit.
//
// See: tasks/canvas-image-briefing-textarea.md decision 2026-05-08.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Je bent een art-director die in 1-2 zinnen omschrijft wat een beeld moet tonen voor een marketing-content-item.

Schrijf zoals iemand een fotograaf zou briefen: WIE staat er, WAAR speelt het, WAT gebeurt er, welke SFEER. Maximaal 2 zinnen, geen marketing-jargon, geen "engaging" of "compelling".

Als persona-info beschikbaar is: gebruik leeftijd + rol + setting (geen echte naam — werk met archetype).
Als product-info beschikbaar is: noem product expliciet, niet abstract.
Als geen persona/product: geef een metaforisch of conceptueel beeld dat de key-message uitdrukt.

Pas de output-taal aan de content-taal aan (NL voor Nederlandse brand, EN voor Engelse brand).`;

const MAX_BRIEFING_TOKENS = 200;

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

    // Verify deliverable belongs to workspace before doing AI-call
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true },
    });
    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    // Assemble full canvas context — gives us brand + persona + product + brief + concept
    const stack = await assembleCanvasContext(deliverableId, workspaceId);

    // Build a compact context block. Truncate long fields for token budget.
    const personaSummary = stack.personas
      .slice(0, 2)
      .map((p) => `${p.name}: ${p.serialized.slice(0, 200)}`)
      .join('; ');
    const productSummary = stack.products
      .slice(0, 2)
      .map((p) => `${p.name}${p.category ? ` (${p.category})` : ''}${p.description ? ` — ${p.description.slice(0, 120)}` : ''}`)
      .join('; ');

    const userPrompt = [
      `Brand: ${stack.brand.brandName ?? 'Unknown'}`,
      stack.brand.contentLanguage ? `Brand language: ${stack.brand.contentLanguage}` : '',
      personaSummary ? `Personas: ${personaSummary}` : '',
      productSummary ? `Products: ${productSummary}` : '',
      stack.brief?.keyMessage ? `Key message: ${stack.brief.keyMessage}` : '',
      stack.brief?.callToAction ? `Call to action: ${stack.brief.callToAction}` : '',
      stack.concept?.creativePlatform ? `Campaign theme: ${stack.concept.creativePlatform}` : '',
      stack.medium?.platform ? `Platform: ${stack.medium.platform}` : '',
      stack.visualBrief?.styleDirection ? `Style chip: ${stack.visualBrief.styleDirection}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (!stack.brief?.keyMessage && stack.personas.length === 0 && stack.products.length === 0) {
      return NextResponse.json(
        { error: 'Insufficient context — add a key message, persona, or product first' },
        { status: 400 },
      );
    }

    const result = await anthropicClient.createChatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      {
        model: 'claude-haiku-4-5-20251001',
        maxTokens: MAX_BRIEFING_TOKENS,
        temperature: 0.7,
        useCase: 'CHAT',
      },
    );

    const briefing = (result.content ?? '').trim();
    if (!briefing) {
      return NextResponse.json({ error: 'Empty AI response — try again' }, { status: 502 });
    }

    return NextResponse.json({ briefing });
  } catch (err) {
    console.error('[POST /api/studio/:id/suggest-visual-briefing]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
