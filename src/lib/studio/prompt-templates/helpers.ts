// =============================================================
// Shared helpers and types for prompt templates.
//
// Extracted from index.ts to break circular dependencies:
// index.ts imports template files, which need these helpers.
// =============================================================

import type { GenerationContext } from '../context-builder';
import type { TypeSettings, TextSettings } from '@/types/studio';

// ─── Types ─────────────────────────────────────────────────

export interface PromptTemplate {
  /** System prompt defining the AI's role and output format */
  systemPrompt: string;
  /** Build the user prompt from context, settings, and user input */
  buildUserPrompt: (params: UserPromptParams) => string;
}

export interface UserPromptParams {
  userPrompt: string;
  context: GenerationContext;
  settings: TypeSettings | null;
  deliverableTitle: string;
  contentType: string;
}

// ─── Shared Helpers ────────────────────────────────────────

/** Extract tone and length from settings (TextSettings) */
export function extractTextSettings(settings: TypeSettings | null): {
  tone: string;
  length: string;
  targetAudience: string;
} {
  const ts = settings as TextSettings | null;
  return {
    tone: ts?.tone || 'professional',
    length: ts?.length || 'medium',
    targetAudience: ts?.targetAudience || '',
  };
}

/** Build a context block string from all available context sources */
export function buildContextBlock(context: GenerationContext): string {
  const parts: string[] = [];

  if (context.brandContext) {
    parts.push('=== BRAND CONTEXT ===');
    parts.push(context.brandContext);
    parts.push('=== END BRAND CONTEXT ===');
    parts.push('');
  }

  if (context.personaContext) {
    parts.push(context.personaContext);
    parts.push('');
  }

  if (context.campaignContext) {
    parts.push('=== CAMPAIGN CONTEXT ===');
    parts.push(context.campaignContext);
    parts.push('=== END CAMPAIGN CONTEXT ===');
    parts.push('');
  }

  if (context.deliverableBrief) {
    parts.push('=== DELIVERABLE BRIEF ===');
    parts.push(context.deliverableBrief);
    parts.push('=== END DELIVERABLE BRIEF ===');
    parts.push('');
  }

  return parts.join('\n');
}

// ─── Base System Prompt ────────────────────────────────────

const OUTPUT_FORMAT_INSTRUCTIONS = `

## OUTPUT FORMAT
- Output your content in **markdown** format.
- Use proper markdown headings (# for H1, ## for H2, ### for H3).
- Use **bold** and *italic* for emphasis.
- Use bullet lists (- item) and numbered lists (1. item) where appropriate.
- Use > for blockquotes.
- Use --- for section dividers where appropriate.
- Use [link text](url) for hyperlinks.
- Do NOT wrap your output in code fences or JSON.
- Do NOT include meta-commentary like "Here is your content:" — just output the content directly.`;

/**
 * Implicit Chain-of-Thought reasoning instructions (content-test #5.B,
 * chain-of-prompts pattern A from plan §3.0).
 *
 * Implicit-CoT: model thinks through key questions before writing, but
 * does NOT output the reasoning. Cost-neutral (geen extra tokens in output);
 * quality-positive (anti-spray-and-pray; reduces drift van brief).
 *
 * Verschilt van expliciete `<thinking>` blocks (zou reasoning in output
 * dumpen) en van Plan-and-Solve (aparte plan-call). Implicit-CoT is de
 * laagdrempelige eerste chain-upgrade vóór Plan-and-Solve uitrol.
 *
 * Versie-bump 1.0.0 → 1.1.0 (minor: content-tuning, output-format compat).
 */
const REASONING_APPROACH = `

## REASONING APPROACH (mental, not output)

Before writing your content, mentally verify each item below. Do NOT include this reasoning in your output — just use it to inform your writing:

1. **Key message clarity**: What is the ONE thing the audience must walk away with?
2. **Audience fit**: Is your tone matched to their context (boardroom vs feed vs inbox)?
3. **Evidence-anchor**: Which concrete fact / example / number anchors the abstract claim?
4. **Structure-fit**: Does this content-type's structure (heading depth, CTA placement) serve the message?
5. **Anti-cliché check**: Are you using corporate jargon ("synergy", "leverage", "innovative") or hyperbole ("revolutionary", "unparalleled") that signals AI-generated voice? Replace with concrete language.
6. **Brand-voice match**: Does the tone reflect this specific brand's voice baseline, or could this be from any company?

If any answer is unclear, the content will feel generic. Mentally adjust BEFORE writing — then produce only the final content.
`;

/**
 * Formula library voor headlines, hooks en CTAs — geïnspireerd op Cowork
 * content-creation skill §4.2. Geef het model expliciete formules om uit te
 * kiezen i.p.v. te improviseren. Verbetert headline-variatie en CTA-kwaliteit.
 *
 * Versie 1.2.0 (toegevoegd 2026-05-12 — content-test improvement #2/#3/#5).
 */
const FORMULA_LIBRARY = `

## FORMULE-BIBLIOTHEEK (kies bij headlines, hooks, CTAs)

### Headline-formules (kies 1, varieer per variant)
- "Hoe [resultaat] zonder [obstakel]" — *Hoe je teams sneller laat schrijven zonder kwaliteit te verliezen*
- "[Getal] [adjectief] manieren om [resultaat]" — *5 onverwachte manieren om customer churn te verlagen*
- "Waarom [veelgehoorde aanname] verkeerd is (en wat dan wel werkt)" — *Waarom A/B-testen voor SaaS niet meer werkt*
- "De [adjectief] gids voor [onderwerp]" — *De pragmatische gids voor prompt-engineering*
- "[Doe dit], niet [dat]" — *Schrijf voor 1 persoon, niet voor 'het publiek'*
- "Wat [resultaat] ons leerde over [onderwerp]" — *Wat 1000 ARR-conversies ons leerden over pricing-pages*
- "[Onderwerp]: wat [doelgroep] moet weten in [jaar]" — *AI-content: wat marketing-leads moeten weten in 2026*

### Hook-formules voor eerste regel/openingszin
- **Statistiek (verrassend)**: "73% van marketing-managers zegt dat hun grootste uitdaging niet budget is, maar focus."
- **Contraire stelling**: "De beste campagnes beginnen met 'nee' zeggen tegen de meeste kanalen."
- **Vraag**: "Wanneer kocht een marketing-e-mail jouw aandacht voor het laatst écht?"
- **Scenario**: "Stel je voor dat je vóór de livegang al weet welke boodschap aanslaat."
- **Bold claim**: "De meeste landingspagina's verliezen de helft van hun bezoekers in drie seconden."
- **Story opening**: "Vorig kwartaal werkten we 20 uur per week aan rapportage. Dit veranderden we."

Gebruik nooit generieke openers zoals "In de wereld van vandaag", "Het is belangrijk om", of "Samengevat".

### CTA-richtlijnen
- **Actiewerkwoorden**: Start, Probeer, Download, Bekijk, Reserveer, Krijg, Ontvang, Begin, Ontdek. NIET: Submit, Verstuur, Klik hier, Lees meer, Meer info.
- **Specifiek**: "Start je gratis proefperiode" werkt beter dan "Submit" — laat zien WAT er gebeurt.
- **Risico verlagen**: "Geen creditcard nodig", "14 dagen gratis", "Opzeggen wanneer je wilt".
- **Eén primaire CTA per pagina/e-mail** — meerdere concurrerende CTAs verlagen conversie.

### Headline-multivariate output
Wanneer het type meerdere headline-varianten vraagt: produceer 2-3 opties die verschillende formules gebruiken (bv. variant 1 = statistiek, variant 2 = contraire stelling, variant 3 = "hoe X zonder Y"). Geef impliciet aan welke je sterkste vindt door deze als eerste te plaatsen.
`;

export function buildBaseSystemPrompt(typeInstructions: string): string {
  return `${typeInstructions}${OUTPUT_FORMAT_INSTRUCTIONS}${REASONING_APPROACH}${FORMULA_LIBRARY}

## QUALITY GUARDRAILS — MANDATORY
1. NEVER use placeholder values (€XX, $XX, [PRICE], TBD, etc.) — omit pricing entirely if unknown. Exception: press releases and similar formats may use [PLACEHOLDER] markers for names/contacts where the type-specific instructions explicitly call for them.
2. NEVER use internal codes or jargon (Q1, Q2, SKU, FY2025, campaign IDs) — use human-readable dates and names.
3. NEVER mention competitor names negatively — focus on own strengths and differentiation.
4. NEVER leak persona names or segment labels into the copy — these are internal tools, not consumer-facing.
5. NEVER use vague urgency without specifics ("limited time", "binnenkort", "snel" without a concrete date or deadline).
6. ALL product/service names must be self-explanatory or briefly explained on first use.
7. Headlines must be unambiguous — avoid words with unintended double meanings.
8. HEADINGS AND TITLES: Always use sentence case (capitalize only the first word and proper nouns). NEVER use Title Case where every word is capitalized. Example: "How to build a strong brand" NOT "How To Build A Strong Brand".
9. BRAND, PRODUCT AND COMPANY NAMES: Always preserve the original capitalization — in headings, body text, meta tags, CTAs, everywhere. Examples: "iPhone", "LinkedIn", "HubSpot", "WordPress", "Napking", "HelloFresh". NEVER lowercase a brand name ("napking") and NEVER capitalize every letter ("NAPKING") unless the brand officially does so. When the brand's registered form is unknown, default to Title Case of the name.
10. NEVER generate a table of contents with markdown anchor links like [Title](#slug) or --- horizontal rules. Use ## headings to structure content — the reader navigates by scrolling.
11. Every piece of content MUST include a clear, specific call-to-action, unless the content type is informational by nature (e.g., press releases, employee stories, internal comms, impact reports) — in those cases, follow the type-specific instructions for closing elements.
12. Claims must be concrete and verifiable — replace "many" with numbers, "soon" with dates, "leading" with evidence.
13. Write for the end consumer, not the marketing team — no meta-commentary about the content itself.`;
}

/**
 * Format additional settings (beyond tone/length/targetAudience) into a
 * readable specification block for the AI prompt.
 * Filters out the base settings that are already handled by category builders.
 */
export function formatAdditionalSettings(settings: TypeSettings | null): string {
  if (!settings) return '';
  const record = settings as unknown as Record<string, unknown>;
  const BASE_KEYS = new Set(['tone', 'length', 'targetAudience']);
  const entries = Object.entries(record).filter(
    ([key, value]) => !BASE_KEYS.has(key) && value !== '' && value !== undefined && value !== null,
  );
  if (entries.length === 0) return '';

  const lines = entries.map(([key, value]) => {
    // Convert camelCase key to readable label
    const label = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
    if (typeof value === 'boolean') return `${label}: ${value ? 'Yes' : 'No'}`;
    return `${label}: ${value}`;
  });

  return `\n## ADDITIONAL SPECIFICATIONS\n${lines.join('\n')}`;
}
