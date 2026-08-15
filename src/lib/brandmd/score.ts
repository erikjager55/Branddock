// =============================================================
// Brand Score — lichtgewicht, uitlegbare afgeleide van de
// F-VAL-pijlers voor de gratis generator (touchpoints v2 §gate).
//
// Bewust GEEN AI-judge: de score moet deterministisch en bij
// navraag verdedigbaar zijn ("HN-dag-één-proof"). Drie dimensies:
//
//   completeness  (40%) — hoeveel van de brand.md-secties zijn gevuld
//   consistency   (35%) — interne consistentie van wat gevonden is
//                          (kleursysteem, typografie-rollen, voice-signalen)
//   aiReadiness   (25%) — hoe bruikbaar het bestand is voor een agent
//                          (guardrails, personas, products aanwezig)
//
// De uitleg per dimensie gaat mee naar de resultaatpagina zodat het
// cijfer nooit een black box is.
// =============================================================

import type { DesignSystemModel } from '@/lib/export/design-system/canonical';
import { countValidation } from '@/lib/export/design-system/emitters/brandmd';

export interface BrandScoreDimension {
  key: 'completeness' | 'consistency' | 'aiReadiness';
  label: string;
  /** 0-100 */
  score: number;
  weight: number;
  explanation: string;
}

export interface BrandScore {
  /** 0-100, gewogen som van de dimensies */
  total: number;
  dimensions: BrandScoreDimension[];
  /** Voor de resultaatpagina: "X of Y sections verified" */
  validatedSections: number;
  totalSections: number;
}

export function computeBrandScore(model: DesignSystemModel): BrandScore {
  const md = model.extensions.brandMd;
  const counts = countValidation(md);

  const completeness = scoreCompleteness(model);
  const consistency = scoreConsistency(model);
  const aiReadiness = scoreAiReadiness(model);

  const dimensions: BrandScoreDimension[] = [
    {
      key: 'completeness',
      label: 'Completeness',
      score: completeness.score,
      weight: 0.4,
      explanation: completeness.explanation,
    },
    {
      key: 'consistency',
      label: 'Consistency',
      score: consistency.score,
      weight: 0.35,
      explanation: consistency.explanation,
    },
    {
      key: 'aiReadiness',
      label: 'AI-readiness',
      score: aiReadiness.score,
      weight: 0.25,
      explanation: aiReadiness.explanation,
    },
  ];

  const total = Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0));

  return {
    total,
    dimensions,
    validatedSections: counts.validated,
    totalSections: counts.total,
  };
}

interface DimensionResult {
  score: number;
  explanation: string;
}

/** De rollen die `draftPayloadToModel` uit de gescande kleuren vult
 *  (`on-primary` is afgeleid en telt dus niet als eigen keuze mee). */
const SCANNED_COLOR_ROLES = ['primary', 'secondary', 'tertiary', 'surface', 'outline'] as const;

/**
 * Standaardpaletten van veelgebruikte CSS-frameworks. Een site die hierop
 * draait heeft geen kleurkeuze gemaakt — en dat is precies wat de
 * consistency-score hoort te zien. Bewust exact-match op hex: een merk dat
 * toevallig vlakbij zit heeft wél gekozen.
 */
const FRAMEWORK_DEFAULT_HEXES = new Set(
  [
    // Bootstrap 5
    '#0D6EFD', '#6C757D', '#198754', '#DC3545', '#FFC107', '#0DCAF0', '#F8F9FA', '#212529',
    '#6610F2', '#6F42C1', '#D63384', '#FD7E14', '#20C997', '#0DCAF0',
    // Tailwind — de grijstrap die vrijwel elk template ongewijzigd overneemt
    '#111827', '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF',
    '#D1D5DB', '#E5E7EB', '#F3F4F6', '#F9FAFB',
    // WordPress/WooCommerce-defaults
    '#7F54B3', '#A46497', '#96588A',
    // Material Design baseline
    '#2196F3', '#4CAF50', '#F44336', '#FF9800', '#9C27B0',
    // Neutraal zwart/wit — geen merkkeuze
    '#000000', '#FFFFFF',
  ].map((h) => h.toUpperCase()),
);

function isFrameworkDefault(hex: string): boolean {
  return FRAMEWORK_DEFAULT_HEXES.has(hex.trim().toUpperCase());
}

function scoreCompleteness(model: DesignSystemModel): DimensionResult {
  const md = model.extensions.brandMd;
  const checks: Array<[string, boolean]> = [
    // Alleen assets met echte inhoud tellen — de 12 canonical assets bestaan
    // altijd, maar leeg is leeg (zelfde eerlijkheidsregel als de emitter).
    ['strategy', (model.extensions.brandFoundation?.assets ?? []).some((a) => a.summary)],
    ['voice description', !!md?.voiceDescription],
    ['vocabulary', (md?.wordsWeUse.length ?? 0) > 0],
    ['colors', Object.keys(model.colors).length >= 3],
    ['typography', Object.keys(model.typography).length >= 2],
    ['audience', (model.extensions.brandFoundation?.personas.length ?? 0) > 0],
    ['products', (md?.products.length ?? 0) > 0],
    ['guardrails', (md?.guardrails.do.length ?? 0) + (md?.guardrails.dont.length ?? 0) > 0],
    // Verrijking 2026-08-15: de scan streeft naar een zo compleet mogelijk
    // bestand — deze 0.3-secties tellen dus mee in de volledigheid.
    ['message pillars', (md?.messagePillars?.length ?? 0) > 0],
    ['art direction', !!(md?.artDirection?.keywords.length || md?.artDirection?.statement)],
  ];
  const filled = checks.filter(([, ok]) => ok);
  const score = Math.round((filled.length / checks.length) * 100);
  const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);
  return {
    score,
    explanation:
      missing.length === 0
        ? `All ${checks.length} core areas are filled.`
        : `${filled.length} of ${checks.length} core areas filled — missing: ${missing.join(', ')}.`,
  };
}

function scoreConsistency(model: DesignSystemModel): DimensionResult {
  const notes: string[] = [];
  let points = 0;
  let max = 0;

  // Kleursysteem (2026-08-15): niet "is er een paar" — dat is na de
  // on-primary-fix bij iedereen waar en levert dus geen signaal. Wél: is de
  // kleur van dit merk een eigen keuze of het standaardpalet van een CSS-
  // framework? Dat onderscheidt "wij hebben een merk" van "wij hebben een
  // template", en varieert echt (zwarthout.com draait op het complete
  // Bootstrap-5-palet; napking.nl op Tailwind-grijzen plus twee eigen tinten).
  max += 40;
  const scanned = SCANNED_COLOR_ROLES.map((r) => model.colors[r]?.value).filter(
    (v): v is string => typeof v === 'string',
  );
  const own = scanned.filter((hex) => !isFrameworkDefault(hex));
  const primaryIsOwn = !!model.colors.primary && !isFrameworkDefault(model.colors.primary.value);

  if (primaryIsOwn) points += 25;
  else notes.push('primary colour matches a CSS-framework default');

  if (scanned.length > 0 && own.length / scanned.length >= 0.5) points += 15;
  else notes.push(`${own.length} of ${scanned.length} colours are brand-owned`);

  // Typografie: rollen aanwezig (altijd waar bij een scan) telt licht; het
  // onderscheid zit in een bewuste kop/tekst-combinatie versus één font voor
  // alles.
  max += 30;
  const headline = model.typography['headline-lg'] ?? model.typography['headline-md'] ?? model.typography['headline-display'];
  const body = model.typography['body-md'] ?? model.typography['body-lg'];
  if (headline && body) points += 15;
  else notes.push('heading/body typography roles incomplete');

  if (headline && body && headline.fontFamily !== body.fontFamily) points += 15;
  else if (headline && body) notes.push('one typeface for both headings and body');

  // Voice: beschrijving én vocabulaire wijzen dezelfde kant op.
  max += 30;
  const md = model.extensions.brandMd;
  if (md?.voiceDescription && (md.wordsWeUse.length > 0 || (model.extensions.voice?.principles.length ?? 0) > 0)) {
    points += 30;
  } else {
    notes.push('voice signals are thin or single-source');
  }

  const score = Math.round((points / max) * 100);
  return {
    score,
    explanation: notes.length === 0 ? 'Color, typography and voice signals align.' : notes.join('; ') + '.',
  };
}

function scoreAiReadiness(model: DesignSystemModel): DimensionResult {
  const md = model.extensions.brandMd;
  const notes: string[] = [];
  let points = 0;

  // Herweging 2026-08-15. Guardrails en channel-tones wogen samen 50 punten,
  // terwijl een scan ze per definitie niet kán vinden: elk gescand merk kreeg
  // daardoor exact dezelfde 50. Ze blijven meetellen — het zijn echte gaten,
  // en precies wat een workspace vult — maar als minderheid, zodat de score
  // meet wat er staat in plaats van of iemand de gratis versie gebruikte.
  // Wat de scan wél levert wordt nu gegradeerd i.p.v. binair afgevinkt.
  const personas = model.extensions.brandFoundation?.personas.length ?? 0;
  if (personas >= 3) points += 25;
  else if (personas === 2) points += 18;
  else if (personas === 1) points += 10;
  else notes.push('no audience/personas for targeting');

  const products = md?.products.length ?? 0;
  if (products >= 4) points += 20;
  else if (products >= 2) points += 14;
  else if (products === 1) points += 8;
  else notes.push('no product context');

  if ((md?.messagePillars?.length ?? 0) > 0) points += 15;
  else notes.push('no message pillars');

  if (md?.artDirection?.keywords.length || md?.artDirection?.statement) points += 10;
  else notes.push('no art direction');

  // Alleen een mens kan deze twee vaststellen — de scan kan ze niet afleiden.
  if ((md?.guardrails.dont.length ?? 0) > 0) points += 20;
  else notes.push('no machine-checkable guardrails (needs a human)');

  if ((md?.channelTones.length ?? 0) > 0) points += 10;
  else notes.push('no per-channel tones (needs a human)');

  return {
    score: points,
    explanation:
      notes.length === 0
        ? 'Audience, products, pillars, art direction, guardrails and channel tones all present.'
        : notes.join('; ') + '.',
  };
}
