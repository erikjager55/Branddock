// =============================================================
// Feedback compiler — sub-sprint #6.B foundation.
// Per plan §3.3: BrandReviewFinding[] + pillar-breakdown → prompt-hint
// string voor re-iterate. Whitelist-based: alleen template-match wordt
// gebruikt, unmatched findings vallen op generic re-prompt fallback.
//
// Templates dekken de 6 BrandReviewFinding-categories met match-regex
// op description-tekst. Hint-tekst is Nederlands (matcht brand-voice
// in 95% van de gevallen) — Engelstalige output blijft werken want de
// hint zit in de system-prompt naast generation-instructies.
// =============================================================

import type { ReviewSeverity, ReviewCategory } from '@/types/brand-review-finding';

export interface FeedbackCompilerFinding {
  category: ReviewCategory;
  severity: ReviewSeverity;
  description: string;
  suggestion?: string | null;
}

export interface FeedbackCompilerInput {
  findings: FeedbackCompilerFinding[];
  /** F-VAL pijler-scores 0-100; gebruikt voor pijler-emphasis-hint. */
  pillarScores?: {
    style?: number;
    judge?: number;
    rules?: number;
  };
  /** Iteration nummer (1 = first re-iterate, 2 = last). */
  attemptNumber: number;
  /** Optioneel: composite-score zelf, voor severity-aware framing. */
  compositeScore?: number;
}

export interface FeedbackCompilerOutput {
  /** Hint-string ge-injecteerd in system-prompt bij re-iterate. */
  promptHint: string;
  /** Template-IDs die matched op de findings; voor learning-loop attribution. */
  appliedTemplates: string[];
  /** Findings zonder template-match (fallback naar generic re-prompt). */
  unmappedFindingsCount: number;
}

interface HintTemplate {
  id: string;
  category: ReviewCategory;
  /** Regex op finding.description (case-insensitive). */
  match: RegExp;
  /** Hint-fragment dat in prompt-hint wordt samengevoegd. */
  hint: string;
}

// ─── 10 Hint-templates ─────────────────────────────────────

const TEMPLATES: HintTemplate[] = [
  // VOICE
  {
    id: 'voice-tone-too-formal',
    category: 'VOICE',
    match: /formal|stijf|afstandelijk|corporate|zakelijk\s*(te)?/i,
    hint: 'Maak de toon warmer en persoonlijker. Vermijd corporate jargon zoals "wij streven ernaar", "onze oplossingen", "kwaliteit en service".',
  },
  {
    id: 'voice-tone-too-casual',
    category: 'VOICE',
    match: /informeel|losjes|jip-en-janneke|kinderachtig|simpel/i,
    hint: 'Verhoog het register iets — behoud warmte maar voeg meer vakkundigheid en specifieke termen toe.',
  },
  {
    id: 'voice-tone-inconsistent',
    category: 'VOICE',
    match: /inconsistent|verschuift|wisselt|niet\s+consequent/i,
    hint: 'Houd één consistente toon vol over alle alinea\'s. Geen plotselinge stijlwissels van warm naar zakelijk en terug.',
  },

  // TERMINOLOGY
  {
    id: 'terminology-banned-term',
    category: 'TERMINOLOGY',
    match: /verboden|niet\s+gebruiken|banned|don'?t\s+use|vermijd/i,
    hint: 'Vermijd de gemarkeerde termen. Gebruik in plaats daarvan brand-eigen vocabulaire dat in de stijlgids staat.',
  },
  {
    id: 'terminology-missing-brand-name',
    category: 'TERMINOLOGY',
    match: /merknaam|brand\s*name|naam\s*ontbreekt|niet\s+vermeld/i,
    hint: 'Noem de merknaam expliciet minstens 1× in elke variant — niet alleen impliciet via "wij" of "ons".',
  },

  // CLAIMS
  {
    id: 'claims-vague',
    category: 'CLAIMS',
    match: /vaag|generic|nietszeggend|onspecifiek|geen\s+concreet/i,
    hint: 'Maak claims concreet met getallen, processen of zintuiglijke details. Vervang "hoogwaardige kwaliteit" door wat dat operationeel betekent.',
  },
  {
    id: 'claims-unsupported-superlative',
    category: 'CLAIMS',
    match: /superlatief|beste|meest|grootste|zonder\s+onderbouwing|overdreven/i,
    hint: 'Schrap onderbouwingsloze superlatieven ("beste", "meest revolutionaire"). Gebruik feitelijke vergelijkingen of laat ze weg.',
  },

  // STYLE
  {
    id: 'style-wall-of-text',
    category: 'STYLE',
    match: /wall.of.text|lange\s+alinea|geen\s+structuur|too\s+long/i,
    hint: 'Breek lange alinea\'s op in 2-3 zinnen. Voor blog/long-form: voeg subkopjes toe elke 100-150 woorden.',
  },
  {
    id: 'style-weak-headline',
    category: 'STYLE',
    match: /headline|titel|hook\s*zwak|opening\s+slap|geen\s+aandacht/i,
    hint: 'Maak de eerste regel scherper. Stat-driven, contraintuïtief of zintuiglijk — niet "Welkom bij..." of "Wij zijn...".',
  },

  // AI_TELL
  {
    id: 'ai-tell-generic-phrasing',
    category: 'AI_TELL',
    match: /generic|ai.tell|machine|gegenereerd|patroon|cliché/i,
    hint: 'Vervang AI-tells zoals "in de wereld van vandaag", "het is belangrijk om op te merken", "samengevat" door directere zinnen.',
  },
];

// ─── Compiler ───────────────────────────────────────────────

/**
 * Selecteer hint-templates die matchen op findings, samen met pijler-
 * emphasis en attempt-aware framing. Output is een geconcateneerde
 * prompt-hint die in system-prompt bij re-iterate wordt geïnjecteerd.
 */
export function compileFeedbackHint(input: FeedbackCompilerInput): FeedbackCompilerOutput {
  const appliedTemplates: string[] = [];
  const hintFragments: string[] = [];
  let unmappedFindingsCount = 0;

  // Prioritize HIGH severity findings first; LOW severity may be filtered
  // wanneer er al genoeg HIGH-hints zijn (cap totaal op 5 fragments).
  const severityRank: Record<ReviewSeverity, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const sortedFindings = [...input.findings].sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity],
  );

  const MAX_FRAGMENTS = 5;
  const matchedTemplateIds = new Set<string>();
  for (const finding of sortedFindings) {
    if (hintFragments.length >= MAX_FRAGMENTS) break;
    const template = TEMPLATES.find(
      (t) => t.category === finding.category && t.match.test(finding.description),
    );
    if (!template) {
      unmappedFindingsCount++;
      continue;
    }
    if (matchedTemplateIds.has(template.id)) continue;
    matchedTemplateIds.add(template.id);
    appliedTemplates.push(template.id);
    hintFragments.push(`- ${template.hint}`);
  }

  // ── Pijler-emphasis: wanneer 1 pijler significant lager is ───
  const pillarEmphasis = buildPillarEmphasis(input.pillarScores);
  if (pillarEmphasis) hintFragments.unshift(pillarEmphasis);

  // ── Attempt-framing ─────────────────────────────────────
  const header =
    input.attemptNumber === 1
      ? '# Verbeterpunten uit vorige variant\n\nDe vorige variant scoorde onder de threshold. Verbeter dit specifiek:'
      : '# Laatste verbeterronde\n\nDit is de 2e en laatste poging. Focus puur op deze punten:';

  // Fallback wanneer geen template matched
  if (hintFragments.length === 0) {
    return {
      promptHint: `${header}\n\n- Herzie tone, claims en structuur voor scherpere brand-fit. Vermijd generieke AI-phrasing.`,
      appliedTemplates: [],
      unmappedFindingsCount,
    };
  }

  return {
    promptHint: `${header}\n\n${hintFragments.join('\n')}`,
    appliedTemplates,
    unmappedFindingsCount,
  };
}

function buildPillarEmphasis(scores: FeedbackCompilerInput['pillarScores']): string | null {
  if (!scores) return null;
  const pillars: Array<{ name: string; score: number; label: string }> = [];
  if (typeof scores.style === 'number') {
    pillars.push({ name: 'style', score: scores.style, label: 'Style-fit (woordkeuze, ritme)' });
  }
  if (typeof scores.judge === 'number') {
    pillars.push({ name: 'judge', score: scores.judge, label: 'Brand-fidelity (essence, do/don\'ts)' });
  }
  if (typeof scores.rules === 'number') {
    pillars.push({ name: 'rules', score: scores.rules, label: 'Rules (banned terms, claims)' });
  }

  if (pillars.length < 2) return null;
  const lowest = pillars.reduce((a, b) => (a.score < b.score ? a : b));
  const others = pillars.filter((p) => p.name !== lowest.name);
  const avgOthers = others.reduce((sum, p) => sum + p.score, 0) / others.length;

  // Alleen emphasis wanneer significante gap (> 15 punten lager)
  if (avgOthers - lowest.score < 15) return null;
  return `**Focuspunt deze ronde**: ${lowest.label} scoort het laagst (${lowest.score} vs ${Math.round(avgOthers)} gemiddeld) — verbeter daar het meest.`;
}
