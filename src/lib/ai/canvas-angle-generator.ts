// =============================================================
// Canvas Creative Angle Generator
//
// Genereert twee distincte creative angles voor een content brief
// vóór de hoofd-generatie. Elke angle krijgt een korte 2-4 woord NL
// label en een kort approach-beschrijving die in de hoofd-prompt
// geïnjecteerd wordt om Variant A en Variant B fundamenteel te
// onderscheiden.
//
// Output bestaat puur om VARIANT DIVERSITY te verbeteren — de oude
// "Generate 2 variants with different creative approaches" prompt
// produceerde te vaak quasi-identieke varianten. Door de angles
// vooraf te kiezen en expliciet te injecteren forceren we echt
// verschillende framing/hook/emphasis per variant.
//
// Cost: ~500 tokens, ~$0.001 per call (Gemini Flash). Verwaarloosbaar
// vs. main generation. Werkt voor alle 53 deliverable types via
// generic prompt structuur.
// =============================================================

import { createStructuredCompletion } from './exploration/ai-caller';
import type { CanvasContextStack } from './canvas-context';

export interface CreativeAngle {
  /** 2-4 woord NL label, e.g. "Schaal & trots", "Daglicht & lucht" */
  label: string;
  /** 1-2 zin omschrijving van de angle voor prompt-injectie */
  approach: string;
}

interface AngleResponse {
  angles: CreativeAngle[];
}

const ANGLE_GENERATOR_SYSTEM_PROMPT = `Je bent een Nederlandse senior creatief strateeg die voor één briefing twee fundamenteel verschillende creative angles bedenkt.

Een "angle" is een hoek waaruit je het verhaal vertelt — niet een samenvatting van de inhoud, maar een framing-keuze die de hele tekst vormgeeft.

Twee goede angles voor dezelfde briefing zijn maximaal onderscheidend op:
- **Opening hook** (statistiek vs persoonlijke observatie vs zintuiglijke beschrijving vs provocatie)
- **Emotioneel register** (trots vs urgentie vs verwondering vs nuchterheid)
- **Bewijsvoering** (cijfers/data vs verhaal/anekdote vs metafoor vs case)
- **Lezer-rol** (expert/peer vs leerling vs partner vs jurylid)

Output: exact 2 angles. Label kort (2-4 woorden NL, gebruik "&" als verbinder waar passend). Approach: 1-2 zinnen die de hele tekst-richting bepalen.

Voorbeelden van sterke angles voor verschillende briefings:
- Voor een corporate vastgoed-pitch: { label: "Schaal & trots", approach: "Open met bouw-cijfers en statige toon, eindig op collective ambition." } versus { label: "Daglicht & lucht", approach: "Open met zintuiglijk frame ('lichtval om half negen'), persoonlijke observatie, ruimte-metaforen." }
- Voor een SaaS feature-launch: { label: "Tijdwinst & rust", approach: "Praktische voor-na vergelijking met concrete uren-besparing." } versus { label: "Macht & controle", approach: "Power-fantasie van complete oversight, dashboard als commandocentrum." }
- Voor een case study: { label: "Cijfers & impact", approach: "Data-driven voor-na, % stijging, ROI." } versus { label: "Mens & moment", approach: "Verhaal van één klant, scene-setting, doorbraakmoment." }

Return ONLY valid JSON, geen preamble.`;

const ANGLE_RESPONSE_SCHEMA = {
  type: 'object' as const,
  properties: {
    angles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          approach: { type: 'string' },
        },
        required: ['label', 'approach'],
      },
      minItems: 2,
      maxItems: 2,
    },
  },
  required: ['angles'],
};

function buildAnglePrompt(stack: CanvasContextStack, contentType: string): string {
  const lines: string[] = [
    `Briefing voor een ${contentType.replace(/-/g, ' ')}:`,
    '',
  ];

  if (stack.brand?.brandName) lines.push(`**Merk:** ${stack.brand.brandName}`);
  if (stack.brand?.brandPersonality) {
    lines.push(`**Brand voice:** ${stack.brand.brandPersonality.slice(0, 400)}`);
  }
  if (stack.brief?.objective) lines.push(`**Doel:** ${stack.brief.objective}`);
  if (stack.brief?.keyMessage) lines.push(`**Kernboodschap:** ${stack.brief.keyMessage}`);
  if (stack.brief?.toneDirection) lines.push(`**Tone:** ${stack.brief.toneDirection}`);
  if (stack.brief?.callToAction) lines.push(`**CTA:** ${stack.brief.callToAction}`);
  if (stack.personas[0]?.name) lines.push(`**Doelgroep:** ${stack.personas[0].name}`);

  lines.push('');
  lines.push('Bedenk 2 maximaal onderscheidende creative angles voor deze briefing.');

  return lines.join('\n');
}

/**
 * Generate two distinct creative angles for the canvas brief.
 *
 * Uses Gemini Flash for cost efficiency — angles are framing decisions,
 * not deep reasoning. ~$0.001 per call vs. ~$0.10 for main generation.
 *
 * Returns null bij ANY failure — caller treats null as "skip angles, fall
 * back to one-shot generation". Never blocks main generation pipeline.
 */
export async function generateCreativeAngles(
  stack: CanvasContextStack,
  contentType: string,
): Promise<CreativeAngle[] | null> {
  try {
    const userPrompt = buildAnglePrompt(stack, contentType);

    const response = await createStructuredCompletion<AngleResponse>(
      'google',
      'gemini-2.5-flash',
      ANGLE_GENERATOR_SYSTEM_PROMPT,
      userPrompt,
      {
        responseSchema: ANGLE_RESPONSE_SCHEMA,
        maxTokens: 600,
        timeoutMs: 30_000,
      },
    );

    if (!response?.angles || !Array.isArray(response.angles) || response.angles.length < 2) {
      return null;
    }

    // Sanitize: ensure non-empty label/approach, max length
    const sanitized: CreativeAngle[] = response.angles
      .slice(0, 2)
      .map((a) => ({
        label: typeof a.label === 'string' ? a.label.trim().slice(0, 40) : '',
        approach: typeof a.approach === 'string' ? a.approach.trim().slice(0, 240) : '',
      }))
      .filter((a) => a.label.length > 0 && a.approach.length > 0);

    return sanitized.length === 2 ? sanitized : null;
  } catch (err) {
    console.warn('[canvas-angle-generator] Failed (non-fatal):', (err as Error).message);
    return null;
  }
}

/**
 * Format an angle as a prompt instruction block to inject into the main
 * generation prompt. Concise and directive — Claude follows it.
 */
export function formatAngleInstruction(angle: CreativeAngle): string {
  return [
    `## Creative Angle: "${angle.label}"`,
    '',
    `**Approach:** ${angle.approach}`,
    '',
    'Schrijf de volledige content vanuit deze angle. Maak duidelijke keuzes die deze hoek versterken — opening, register, bewijsvoering, ritme, alles. Een lezer moet "Schaal & trots" anders ervaren dan "Daglicht & lucht" zelfs als de feiten hetzelfde zijn.',
  ].join('\n');
}
