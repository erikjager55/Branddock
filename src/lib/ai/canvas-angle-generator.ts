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

# KRITISCH — POLARISATIE-REGEL
De twee angles MOETEN op minstens twee assen *tegenovergestelde* posities innemen. Niet "iets anders", maar **tegenpolen**. Een lezer die A leest en daarna B leest moet voelen: "deze posts vechten met elkaar, ze passen niet in dezelfde redactie".

Kies bewust uit tegenstellings-paren:
- **Hook-stijl**: statistiek/data ⇄ persoonlijke anekdote · provocatie/conflict ⇄ uitnodiging/vraag · scènefoto ⇄ abstracte stelling
- **Emotioneel register**: urgentie/alarm ⇄ rust/reflectie · trots/macht ⇄ kwetsbaarheid/twijfel · scherp/contrarian ⇄ warm/samenwerkend
- **Bewijsvoering**: cijfers/ROI ⇄ verhaal/scene · framework/lijst ⇄ doorlopende monoloog · klant-case ⇄ branche-observatie
- **Lezer-rol**: expert die je iets leert ⇄ peer die met je meedenkt · jury die je overtuigt ⇄ vriend die je waarschuwt
- **Tijdsoriëntatie**: nu/urgentie ⇄ over 5 jaar/visie · gisteren-anekdote ⇄ tijdloos principe

Forbidden: "praktisch & nuchter" naast "professioneel & duidelijk" (synoniemen), of "tijdwinst" naast "efficiëntie" (zelfde frame). Voelt vlak.

Output: exact 2 angles. Label kort (2-4 woorden NL, gebruik "&" als verbinder waar passend). Approach: 1-2 zinnen die de hele tekst-richting bepalen — benoem expliciet welke tegenstellings-as je hier kiest.

Voorbeelden van échte polarisatie:
- Vastgoed-pitch: { label: "Schaal & trots", approach: "Hook met bouw-cijfers, statige toon, lezer als jury die imponeerwaarde beoordeelt." } versus { label: "Daglicht & lucht", approach: "Open met zintuiglijk frame ('lichtval om half negen'), persoonlijke observatie, lezer als toekomstige bewoner die de ruimte voelt." } — *as: data-jury vs zintuig-bewoner*
- SaaS launch: { label: "Tijdwinst & rust", approach: "Voor-na in concrete uren, framework-lijst, lezer als peer-operator." } versus { label: "Macht & controle", approach: "Power-fantasie, één persoonlijk doorbraak-moment, lezer als ambitieuze leader." } — *as: rust vs macht / lijst vs verhaal*
- Horeca textiel-service: { label: "Cijfers & verlies", approach: "Open met % rejects/extra spoedwerk-kosten, contrarian stelling 'goedkoop is duurst', lezer als jury van inkoopbeslissing." } versus { label: "Vrijdagavond stress", approach: "Scène: keuken op piek, kok grijpt naast schone theedoek, lezer als peer die het herkent." } — *as: data-jury vs scène-peer*

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
    '',
    // F-variant-polarize (audit 2026-05-15): de angle-generator forceert
    // tegenstellings-paren. De main-LLM heeft de neiging om beide varianten
    // naar een veilig midden te trekken (vergelijkbare tone, vergelijkbare
    // structuur) waardoor het polarisatie-werk in de angle-stap weer wegloopt.
    // Deze directive zegt expliciet: pak je positie, leun erin, geen
    // middenweg.
    '**TEGENPOOL-DIRECTIVE (kritiek):** Een sibling-variant uit een tégen-overgestelde creative angle wordt parallel gegenereerd. Jouw taak is NIET een nette compromis-tekst maar een onverbloemde positie aan jouw kant van de tegenstelling.',
    '- Als jouw angle "data/cijfers" is → jouw sibling is "scène/anekdote". Schrijf zonder schaamte vol met cijfers, percentages, ROI. Geen verzachtende verhaal-anekdotes "om het toegankelijk te houden".',
    '- Als jouw angle "urgentie/alarm" is → jouw sibling is "rust/reflectie". Schrijf urgent, scherp, alarm. Geen geruststellende slot-alinea.',
    '- Als jouw angle "contrarian/conflict" is → jouw sibling is "samenwerkend/uitnodigend". Open met de provocatie, eindig met de provocatie. Geen "natuurlijk respecteren wij..." disclaimer.',
    'Een sterke variant durft 70% naar één pool. Voorzichtig in het midden = beide varianten voelen hetzelfde = waardeloos.',
    '',
    '**Structurele divergentie (kritiek):** Kies BEWUST een ander structuurpatroon dan een logisch-evidente blog-structuur:',
    '- Vermijd dezelfde subkop-tekst als sibling kan verzinnen ("De verborgen kosten", "Hoe het werkt", "HACCP-compliance" zijn voor de hand liggend — kies een minder voor-de-hand-liggende sectionering).',
    '- Kies één structuurarchetype: **framework** (subkopjes + lijsten + checklist) **of** **narrative** (verhaal + scène + persoonlijk moment) **of** **comparison** (voor-na, A-vs-B) **of** **case-study** (één klant, concrete data, doorbraak) — dat past bij déze angle.',
    '- Lengte van alinea\'s + subsecties varieert: sommige angles dragen 2-3 lange alinea\'s zonder kopjes; andere dragen veel korte subsecties. Laat de angle de structuur bepalen, niet de "standaard blog-template".',
    '',
    'Een lezer die beide varianten naast elkaar ziet moet binnen 5 seconden ervaren: "dit zijn fundamenteel andere benaderingen, niet twee bewerkingen van hetzelfde stuk".',
  ].join('\n');
}
