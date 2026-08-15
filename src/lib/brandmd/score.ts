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

  // Kleursysteem: primary + on-primary paar aanwezig = teken van systeem.
  max += 40;
  const hasPrimaryPair = !!model.colors.primary && !!model.colors['on-primary'];
  if (hasPrimaryPair) points += 40;
  else notes.push('no primary/on-primary color pair detected');

  // Typografie: heading- én body-rol gevonden.
  max += 30;
  const hasHeading = !!model.typography['headline-lg'] || !!model.typography['headline-md'] || !!model.typography['headline-display'];
  const hasBody = !!model.typography['body-md'] || !!model.typography['body-lg'];
  if (hasHeading && hasBody) points += 30;
  else notes.push('heading/body typography roles incomplete');

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

  if ((md?.guardrails.dont.length ?? 0) > 0) points += 35;
  else notes.push('no machine-checkable guardrails');

  if ((model.extensions.brandFoundation?.personas.length ?? 0) > 0) points += 35;
  else notes.push('no audience/personas for targeting');

  if ((md?.products.length ?? 0) > 0) points += 15;
  else notes.push('no product context');

  if ((md?.channelTones.length ?? 0) > 0) points += 15;
  else notes.push('no per-channel tones');

  return {
    score: points,
    explanation:
      notes.length === 0
        ? 'Guardrails, audience, products and channel tones all present.'
        : notes.join('; ') + '.',
  };
}
