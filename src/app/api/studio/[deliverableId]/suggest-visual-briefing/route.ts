import { NextRequest, NextResponse } from 'next/server';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
import { buildAiErrorResponseInit } from '@/lib/ai/error-handler';
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

// System prompt is chip-aware: each style chip wants a different kind of
// briefing. A photo-style briefing (wie/waar/wat/sfeer) is useful for
// lifestyle / BTS / UGC, but for quote-text the briefing should describe
// typography intent + layout, and for infographic the briefing should
// describe data hierarchy + chart type. Generic art-director prose was
// producing scene-descriptions even for chips that needed something else.
function buildSystemPrompt(chip: string | null | undefined): string {
  const base = `Je bent een art-director die in 1-2 zinnen omschrijft wat een beeld moet tonen voor een marketing-content-item.

Maximaal 2 zinnen, geen marketing-jargon, geen "engaging" of "compelling". Pas de output-taal aan de content-taal aan (NL voor Nederlandse brand, EN voor Engelse brand).

**Output format**: plain text only. NO markdown formatting — geen **bold**, geen _italic_, geen # headings, geen bullet-points. De output wordt in een textarea getoond die markdown niet rendert; asterisks en hashes verschijnen letterlijk en zien er slordig uit. Schrijf gewoon natuurlijke zinnen.`;

  switch (chip) {
    case 'quote-text':
      return `${base}

Voor een quote-text / typography-poster brief:
- Beschrijf welke quote of phrase centraal staat (noem 'm letterlijk)
- Beschrijf compositie: centered hero / asymmetric / full-bleed
- Beschrijf background-keuze: solid brand color / gradient / texture
Geen persona of scene-beschrijving — typography is het hele beeld.`;

    case 'infographic':
    case 'data-driven':
      return `${base}

Voor een infographic / data-driven brief:
- Beschrijf welk type viz (bar-chart / pie / flow / single-stat hero)
- Beschrijf welk datapunt of cijfer prominent is
- Beschrijf hiërarchie: 1 hero-cijfer + supporting elements, of stap-voor-stap flow
Geen persona of sfeer — data en hiërarchie zijn het verhaal.`;

    case 'product-shot':
      return `${base}

Voor een product-shot brief:
- Noem het product expliciet (naam + categorie)
- Beschrijf camera-perspectief (front-on / drie-kwart / top-down / macro)
- Beschrijf staging: clean studio / contextual props / material details
Persona is afwezig of perifeer — het product is de held.`;

    case 'illustration':
      return `${base}

Voor een illustration brief:
- Beschrijf de gekozen metafoor of het concept (letterlijk vs abstract)
- Beschrijf style-richting: vector / line-art / painterly / geometric
- Beschrijf wat de illustration overbrengt — geen photoreal scene-beschrijving.`;

    case 'lifestyle':
    case 'behind-the-scenes':
    case 'ugc':
    default:
      return `${base}

Schrijf zoals iemand een fotograaf zou briefen: WIE staat er, WAAR speelt het, WAT gebeurt er, welke SFEER.

Als persona-info beschikbaar is: gebruik leeftijd + rol + setting (geen echte naam — werk met archetype).
Als product-info beschikbaar is: noem product expliciet, niet abstract.
Als geen persona/product: geef een metaforisch of conceptueel beeld dat de key-message uitdrukt.`;
  }
}

const MAX_BRIEFING_TOKENS = 200;

export async function POST(
  _request: NextRequest,
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

    const systemPrompt = buildSystemPrompt(stack.visualBrief?.styleDirection ?? null);
    const result = await anthropicClient.createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: 'claude-haiku-4-5-20251001',
        maxTokens: MAX_BRIEFING_TOKENS,
        temperature: 0.7,
        useCase: 'CHAT',
      },
    );

    // Defense-in-depth: strip markdown formatting voor het geval het LLM
    // de plain-text-instructie negeert. De textarea rendert geen markdown,
    // dus **bold** / _italic_ / # heading / - bullet zien er slordig uit.
    // Conservative regex: alleen wrapper-syntax, geen content-mangling.
    function stripMarkdown(text: string): string {
      return text
        .replace(/\*\*\*([^*\n]+)\*\*\*/g, '$1') // ***bold-italic***
        .replace(/\*\*([^*\n]+)\*\*/g, '$1')      // **bold**
        .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1') // _italic_ (skip identifiers)
        .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '$1') // *italic*
        .replace(/`([^`\n]+)`/g, '$1')            // `inline-code`
        .replace(/^#{1,6}\s+/gm, '')              // # heading prefix
        .replace(/^[-*+]\s+/gm, '')               // - bullet prefix
        .replace(/^\d+\.\s+/gm, '')               // 1. numbered-list prefix
        .replace(/\n{3,}/g, '\n\n')               // collapse triple-newlines
        .trim();
    }
    const rawBriefing = (result.content ?? '').trim();
    const briefing = stripMarkdown(rawBriefing);
    if (!briefing) {
      return NextResponse.json({ error: 'Empty AI response — try again' }, { status: 502 });
    }

    return NextResponse.json({ briefing });
  } catch (err) {
    // Diagnostic surface (2026-05-19): voorheen genericke "Internal server
    // error" verborg de echte oorzaak — voor social-media items
    // gerapporteerde 500s waren niet te traceren zonder server-logs.
    // In dev/development env tonen we nu de message + name; in prod
    // (NODE_ENV === 'production') blijft de message generiek.
    const errorObj = err instanceof Error ? err : new Error(String(err));
    console.error('[POST /api/studio/:id/suggest-visual-briefing]', {
      name: errorObj.name,
      message: errorObj.message,
      stack: errorObj.stack,
    });
    const isProd = process.env.NODE_ENV === 'production';
    const { body, status } = buildAiErrorResponseInit(errorObj);
    return NextResponse.json(
      {
        ...body,
        ...(isProd ? {} : { details: errorObj.message, kind: errorObj.name }),
      },
      { status },
    );
  }
}
