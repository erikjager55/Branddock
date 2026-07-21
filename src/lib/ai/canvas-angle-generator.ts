// =============================================================
// Canvas Creative Angle Generator
//
// Genereert N distincte creative angles (default 2) voor een content
// brief vóór de hoofd-generatie. Elke angle krijgt een korte 2-4 woord
// NL label en een kort approach-beschrijving die in de hoofd-prompt
// geïnjecteerd wordt om de varianten fundamenteel te onderscheiden.
// (P3a: count is configureerbaar voor het landingspagina-pad; alle
// andere callers gebruiken de default 2 → backward-compatible.)
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

/** Exported voor deterministische smoke-tests (pure, count-keyed). */
export function buildAngleSystemPrompt(count: number): string {
  const intro = count === 1
    ? `Je bent een Nederlandse senior creatief strateeg die voor één briefing één heldere, uitgesproken creative angle bedenkt.`
    : `Je bent een Nederlandse senior creatief strateeg die voor één briefing ${count} fundamenteel verschillende creative angles bedenkt.`;

  const polariseren = count === 1
    ? `# KRITISCH — KIES POSITIE
Kies één uitgesproken hoek en leun erin. Geen vlak, veilig midden — neem het risico van een duidelijke positie op een van de tegenstellings-assen hieronder.`
    : `# KRITISCH — POLARISATIE-REGEL
Elke angle MOET op minstens twee assen een uitgesproken, van de andere angles afwijkende positie innemen. Geen twee angles mogen dezelfde tegenstellings-as delen. Niet "iets anders", maar **tegenpolen**. Een lezer die twee van deze angles na elkaar leest moet voelen: "deze vechten met elkaar, ze passen niet in dezelfde redactie".`;

  return `${intro}

Een "angle" is een hoek waaruit je het verhaal vertelt — niet een samenvatting van de inhoud, maar een framing-keuze die de hele tekst vormgeeft.

${polariseren}

Kies bewust uit tegenstellings-paren:
- **Hook-stijl**: statistiek/data ⇄ persoonlijke anekdote · provocatie/conflict ⇄ uitnodiging/vraag · scènefoto ⇄ abstracte stelling
- **Emotioneel register**: urgentie/alarm ⇄ rust/reflectie · trots/macht ⇄ kwetsbaarheid/twijfel · scherp/contrarian ⇄ warm/samenwerkend
- **Bewijsvoering**: cijfers/ROI ⇄ verhaal/scene · framework/lijst ⇄ doorlopende monoloog · klant-case ⇄ branche-observatie
- **Lezer-rol**: expert die je iets leert ⇄ peer die met je meedenkt · jury die je overtuigt ⇄ vriend die je waarschuwt
- **Tijdsoriëntatie**: nu/urgentie ⇄ over 5 jaar/visie · gisteren-anekdote ⇄ tijdloos principe

Forbidden: "praktisch & nuchter" naast "professioneel & duidelijk" (synoniemen), of "tijdwinst" naast "efficiëntie" (zelfde frame). Voelt vlak.

Output: exact ${count} angle${count === 1 ? '' : 's'}. Label kort (2-4 woorden NL, gebruik "&" als verbinder waar passend). Approach: 1-2 zinnen die de hele tekst-richting bepalen — benoem expliciet welke tegenstellings-as je hier kiest.

Voorbeelden van échte polarisatie:
- Vastgoed-pitch: { label: "Schaal & trots", approach: "Hook met bouw-cijfers, statige toon, lezer als jury die imponeerwaarde beoordeelt." } versus { label: "Daglicht & lucht", approach: "Open met zintuiglijk frame ('lichtval om half negen'), persoonlijke observatie, lezer als toekomstige bewoner die de ruimte voelt." } — *as: data-jury vs zintuig-bewoner*
- SaaS launch: { label: "Tijdwinst & rust", approach: "Voor-na in concrete uren, framework-lijst, lezer als peer-operator." } versus { label: "Macht & controle", approach: "Power-fantasie, één persoonlijk doorbraak-moment, lezer als ambitieuze leader." } — *as: rust vs macht / lijst vs verhaal*
- Horeca textiel-service: { label: "Cijfers & verlies", approach: "Open met % rejects/extra spoedwerk-kosten, contrarian stelling 'goedkoop is duurst', lezer als jury van inkoopbeslissing." } versus { label: "Vrijdagavond stress", approach: "Scène: keuken op piek, kok grijpt naast schone theedoek, lezer als peer die het herkent." } — *as: data-jury vs scène-peer*

Return ONLY valid JSON, geen preamble.`;
}

/** Exported voor deterministische smoke-tests (pure, count-keyed). */
export function buildAngleSchema(count: number) {
  return {
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
        minItems: count,
        maxItems: count,
      },
    },
    required: ['angles'],
  };
}

function buildAnglePrompt(stack: CanvasContextStack, contentType: string, count: number): string {
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
  lines.push(count === 1
    ? 'Bedenk 1 uitgesproken creative angle voor deze briefing.'
    : `Bedenk ${count} maximaal onderscheidende creative angles voor deze briefing.`);

  return lines.join('\n');
}

/**
 * Generate `count` distinct creative angles for the canvas brief (default 2).
 *
 * Uses Gemini Flash for cost efficiency — angles are framing decisions,
 * not deep reasoning. ~$0.001 per call vs. ~$0.10 for main generation.
 *
 * `count` is configureerbaar voor het landingspagina-pad (P3a, 1-4). Alle
 * andere callers laten het weg → default 2 (backward-compatible).
 *
 * Returns null bij ANY failure OF te weinig valide angles (< count) — caller
 * treats null as "skip angles, fall back". Never blocks main generation.
 */
export async function generateCreativeAngles(
  stack: CanvasContextStack,
  contentType: string,
  count = 2,
): Promise<CreativeAngle[] | null> {
  const n = count < 1 ? 1 : count > 4 ? 4 : count;
  try {
    const userPrompt = buildAnglePrompt(stack, contentType, n);

    const response = await createStructuredCompletion<AngleResponse>(
      'google',
      'gemini-3.5-flash',
      buildAngleSystemPrompt(n),
      userPrompt,
      {
        responseSchema: buildAngleSchema(n),
        // Ruimer budget: 300 + n*200 (n=2 → 700) kapte de angles-JSON af
        // (dogfood 2026-07-07). Angles zijn kort, maar JSON-overhead +
        // structured-output-marges vragen meer kop.
        maxTokens: 800 + n * 500,
        timeoutMs: 30_000,
        // Gemini 2.5-flash heeft dynamic thinking standaard AAN en die
        // thinking-tokens tellen mee in maxOutputTokens — het budget hierboven
        // werd erdoor opgegeten (1800 budget, 214 chars output; dogfood
        // 2026-07-12). Angles zijn framing-keuzes, geen deep reasoning:
        // thinking expliciet uit.
        thinking: { google: { thinkingBudget: 0 } },
      },
    );

    if (!response?.angles || !Array.isArray(response.angles) || response.angles.length < n) {
      return null;
    }

    // Sanitize: ensure non-empty label/approach, max length
    const sanitized: CreativeAngle[] = response.angles
      .slice(0, n)
      .map((a) => ({
        label: typeof a.label === 'string' ? a.label.trim().slice(0, 40) : '',
        approach: typeof a.approach === 'string' ? a.approach.trim().slice(0, 240) : '',
      }))
      .filter((a) => a.label.length > 0 && a.approach.length > 0);

    return sanitized.length === n ? sanitized : null;
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
    '**TEGENPOOL-DIRECTIVE (kritiek):** Er worden parallel andere varianten uit andere creative angles gegenereerd. Jouw taak is NIET een nette compromis-tekst maar een onverbloemde positie aan jouw kant van de tegenstelling.',
    '- Als jouw angle "data/cijfers" is → de tegenpool is "scène/anekdote". Schrijf zonder schaamte vol met cijfers, percentages, ROI. Geen verzachtende verhaal-anekdotes "om het toegankelijk te houden".',
    '- Als jouw angle "urgentie/alarm" is → de tegenpool is "rust/reflectie". Schrijf urgent, scherp, alarm. Geen geruststellende slot-alinea.',
    '- Als jouw angle "contrarian/conflict" is → de tegenpool is "samenwerkend/uitnodigend". Open met de provocatie, eindig met de provocatie. Geen "natuurlijk respecteren wij..." disclaimer.',
    'Een sterke variant durft 70% naar één pool. Voorzichtig in het midden = varianten voelen hetzelfde = waardeloos.',
    '',
    '**Structurele divergentie (kritiek):** Kies BEWUST een ander structuurpatroon dan een logisch-evidente blog-structuur:',
    '- Vermijd subkop-tekst die de andere varianten ook zouden kiezen ("De verborgen kosten", "Hoe het werkt", "HACCP-compliance" zijn voor de hand liggend — kies een minder voor-de-hand-liggende sectionering).',
    '- Kies één structuurarchetype: **framework** (subkopjes + lijsten + checklist) **of** **narrative** (verhaal + scène + persoonlijk moment) **of** **comparison** (voor-na, A-vs-B) **of** **case-study** (één klant, concrete data, doorbraak) — dat past bij déze angle.',
    '- Lengte van alinea\'s + subsecties varieert: sommige angles dragen 2-3 lange alinea\'s zonder kopjes; andere dragen veel korte subsecties. Laat de angle de structuur bepalen, niet de "standaard blog-template".',
    '',
    'Een lezer die de varianten naast elkaar ziet moet binnen 5 seconden ervaren: "dit zijn fundamenteel andere benaderingen, niet bewerkingen van hetzelfde stuk".',
  ].join('\n');
}
