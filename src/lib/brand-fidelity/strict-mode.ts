// ============================================================
// STRICT mode — post-generation auto-rewrite loop
//
// Wanneer FidelityConfig.humanVoiceMode === 'STRICT':
//  1. Generate output normaal (BVD + HVD)
//  2. Run AI-tell-detector
//  3. Als verdict AI_LEANING of PURE_AI: één rewrite-call met expliciete
//     tell-feedback in prompt
//  4. Re-detect op rewrite; houd de betere van origineel/herziene
//  5. Anders (HUMAN_BASELINE / TOP_TIER): origineel ongewijzigd
//
// Eén rewrite-attempt per generatie, geen recursie. Kosten ~+50% bij
// AI_LEANING outputs, 0 bij HUMAN_BASELINE.
// ============================================================

import { detectAiTells, type AiTellResult, type DetectedTell } from './ai-tell-detector';

// ─── Types ────────────────────────────────────────

export interface StrictModeResult {
  /** Final text (original if no rewrite needed, or rewritten if improvement) */
  finalText: string;
  /** Detector verdict op de finale tekst */
  finalResult: AiTellResult;
  /** Was er een rewrite uitgevoerd? */
  rewriteAttempted: boolean;
  /** Resultaat op origineel (vóór rewrite) */
  originalResult: AiTellResult;
  /** Resultaat op rewrite-poging — null als niet uitgevoerd of mislukt */
  rewriteResult: AiTellResult | null;
  /** Reden om finale tekst te kiezen (origineel of rewrite) */
  decisionReason: string;
}

export interface RewriteCallback {
  (params: {
    originalText: string;
    feedbackPrompt: string;
  }): Promise<string>;
}

// ─── Feedback-prompt builder ──────────────────

/**
 * Build een feedback-prompt die de top-N tells uit de detector als concrete
 * herwerk-instructies aan de LLM geeft. Geen abstracte "do better" — wel:
 * "Vervang deze 41 em-dash trailing modifiers door komma's; herschrijf de
 * 4 'niet omdat... maar omdat...' constructies; etc."
 */
export function buildRewriteFeedbackPrompt(
  originalText: string,
  detectorResult: AiTellResult,
): string {
  const topTells = detectorResult.detected
    .slice(0, 5) // top 5 highest-impact tells
    .filter((t) => t.count > 0);

  if (topTells.length === 0) {
    // Shouldn't happen if verdict is AI_LEANING / PURE_AI, but defensive
    return [
      `Below is a generated piece that scored ${detectorResult.scorePer1000Words.toFixed(0)}/1000 on AI-tell density (verdict: ${detectorResult.verdict}).`,
      `Rewrite the FULL piece in less AI-typical Dutch — vary sentence length, drop blueprint phrases, write more like a senior human columnist.`,
      `Output only the revised content; same approximate length and structure.`,
      ``,
      `--- ORIGINAL ---`,
      originalText,
    ].join('\n');
  }

  const issues = topTells
    .map((t) => formatTellInstruction(t))
    .filter(Boolean)
    .join('\n');

  return [
    `The piece below scored ${detectorResult.scorePer1000Words.toFixed(0)}/1000 on AI-tell density (verdict: ${detectorResult.verdict}). Top issues to fix:`,
    ``,
    issues,
    ``,
    `Rewrite the FULL piece. Keep the structure, content, and approximate length identical — but eliminate or significantly reduce these patterns. Output only the revised content, no preamble or commentary.`,
    ``,
    `--- ORIGINAL ---`,
    originalText,
  ].join('\n');
}

/** Geëxporteerd (audit 2026-06-10) zodat de LP variant-tell-rewrite dezelfde
 *  concrete herwerk-instructies kan hergebruiken op variant-JSON copy. */
export function formatTellInstruction(detected: DetectedTell): string {
  const { definition, count, matches } = detected;
  const examples = matches.slice(0, 3).map((m) => `"${m.replace(/\n/g, ' ').slice(0, 60)}"`).join(', ');

  switch (definition.id) {
    case 'em_dash_overuse':
      return `- ${count}× em-dash trailing modifier (e.g. ${examples}). Replace standalone em-dashes with commas, periods, or paired em-dashes around a parenthetical. Reserve "—" for genuine asides.`;
    case 'em_dash_glued':
      return `- ${count}× aaneengeplakte em-dash die twee zinsdelen lijmt (${examples}). Vervang door een komma, punt of herformuleer als twee zinnen. Schrijf NOOIT "woord—woord".`;
    case 'hyphen_splice_conjunction':
      return `- ${count}× koppelteken als zinslijm vóór een voegwoord (${examples}). Vervang door komma of punt; een koppelteken verbindt samenstellingen, geen zinsdelen.`;
    case 'not_because_but_because':
      return `- ${count}× "niet omdat... maar omdat..." constructie (${examples}). Replace ALL with "Niet [X]. Wel [Y]." or simply state the reason directly.`;
    case 'contrast_formula_nl':
      return `- ${count}× contrast-formule "niet alleen X, maar ook Y" (${examples}). Vervang door directe stelling of een kortere zin die gewoon Y benoemt.`;
    case 'nl_buzzword_adjectives':
      return `- ${count}× buzzword-adjectief (${examples}). Vervang door specifieke, concrete beschrijvingen — niet "naadloos" maar "zonder zichtbare overgang".`;
    case 'nl_marketing_cliches':
      return `- ${count}× marketing-cliché opener (${examples}). Begin de relevante alinea opnieuw met een concrete observatie of vraag, niet met een wereld/landschap-frame.`;
    case 'nl_passive_ai_narration':
      return `- ${count}× passieve AI-narratie (${examples}). Schrijf in actieve vorm — wie deed wat?`;
    case 'nl_subjunctive_corporate':
      return `- ${count}× corporate subjunctief (${examples}). Vervang door directe actie-werkwoorden.`;
    case 'nl_overdreven_adjectives':
      return `- ${count}× overdreven sfeer-adjectief (${examples}). Schrap of vervang door functionele beschrijving.`;
    case 'announcement_meta':
      return `- ${count}× aankondigings-zin (${examples}). Schrap deze meta-laag, lever direct inhoud.`;
    case 'closing_formula':
      return `- ${count}× slotformule "Kortom"/"Tot slot" (${examples}). Laat de slotalinea zelf werk doen.`;
    case 'nl_oxford_comma':
      return `- ${count}× Oxford-komma in NL (${examples}). Vermijd komma vóór "en"/"of" in opsommingen.`;
    case 'disclaimer_mantras':
      return `- ${count}× disclaimer-mantra (${examples}). Schrijf het gewoon, zonder "Het is goed te beseffen dat...".`;
    case 'ai_overconviction':
      return `- ${count}× AI-overtuigingsmarker (${examples}). Vervang door realistische taal — mensen zijn zelden absoluut.`;
    case 'colon_punchline':
      return `- ${count}× dubbele-punt-pingpong "X: Y" (${examples}). Vervang door volle zinnen.`;
    case 'nl_qa_pingpong':
      return `- ${count}× vraag-antwoord-pingpong "Het doel? X." (${examples}). Schrijf een volle zin.`;
    case 'nl_corporate_drama':
      return `- ${count}× corporate-drama woord (${examples}). Vervang door nuchter taalgebruik.`;
    case 'nl_blueprint_verbs':
      return `- ${count}× blauwdruk-werkwoord (${examples}). Vervang door concrete actie-werkwoorden.`;
    case 'nl_filler_adjectives':
      return `- ${count}× opvulling-adjectief (${examples}). Schrap of maak specifieker.`;
    case 'nl_anglicism_translations':
      return `- ${count}× anglicisme (${examples}). Vervang door natuurlijk Nederlands.`;
    default:
      return `- ${count}× ${definition.description.toLowerCase()} (${examples}). ${definition.description}.`;
  }
}

// ─── Decision logic ──────────────────────────

const REWRITE_THRESHOLD_VERDICT: Set<AiTellResult['verdict']> = new Set(['AI_LEANING', 'PURE_AI']);

/** Threshold for considering rewrite an improvement: score must drop ≥10% AND verdict not regress */
function isRewriteImprovement(original: AiTellResult, rewrite: AiTellResult): boolean {
  // Hard rule: never accept rewrite that's worse on score
  if (rewrite.scorePer1000Words >= original.scorePer1000Words) return false;
  // Score drop must be meaningful (≥5 absolute, ≥10% relative)
  const scoreDrop = original.scorePer1000Words - rewrite.scorePer1000Words;
  return scoreDrop >= 5 || scoreDrop / original.scorePer1000Words >= 0.10;
}

// ─── Public API ──────────────────────────────

/**
 * Run STRICT mode evaluation + (conditional) rewrite.
 *
 * @param originalText  Generated content text from canvas-orchestrator
 * @param rewriteCallback  Caller-supplied function that takes the feedback
 *                         prompt and returns the rewritten text. Allows the
 *                         caller to use whatever LLM provider/model they want
 *                         (typically same model as original generation).
 *
 * @returns StrictModeResult with finalText (original or rewrite based on
 *          which scored better)
 */
export async function runStrictModeRewrite(
  originalText: string,
  rewriteCallback: RewriteCallback,
): Promise<StrictModeResult> {
  const originalResult = detectAiTells(originalText);

  // No rewrite needed if already in HUMAN_BASELINE or TOP_TIER
  if (!REWRITE_THRESHOLD_VERDICT.has(originalResult.verdict)) {
    return {
      finalText: originalText,
      finalResult: originalResult,
      rewriteAttempted: false,
      originalResult,
      rewriteResult: null,
      decisionReason: `No rewrite needed — verdict ${originalResult.verdict} is already at or above human baseline.`,
    };
  }

  // Build feedback prompt + call rewrite
  const feedbackPrompt = buildRewriteFeedbackPrompt(originalText, originalResult);
  let rewriteText: string;
  try {
    rewriteText = await rewriteCallback({ originalText, feedbackPrompt });
  } catch (err) {
    return {
      finalText: originalText,
      finalResult: originalResult,
      rewriteAttempted: true,
      originalResult,
      rewriteResult: null,
      decisionReason: `Rewrite call failed: ${(err as Error).message}. Keeping original.`,
    };
  }

  // Validate rewrite — must be substantial, not empty/truncated
  if (!rewriteText || rewriteText.trim().length < 200) {
    return {
      finalText: originalText,
      finalResult: originalResult,
      rewriteAttempted: true,
      originalResult,
      rewriteResult: null,
      decisionReason: 'Rewrite output too short (< 200 chars). Keeping original.',
    };
  }

  const rewriteResult = detectAiTells(rewriteText);

  if (isRewriteImprovement(originalResult, rewriteResult)) {
    return {
      finalText: rewriteText,
      finalResult: rewriteResult,
      rewriteAttempted: true,
      originalResult,
      rewriteResult,
      decisionReason: `Rewrite reduced score from ${originalResult.scorePer1000Words.toFixed(0)} to ${rewriteResult.scorePer1000Words.toFixed(0)}/1000 (verdict ${originalResult.verdict} → ${rewriteResult.verdict}).`,
    };
  }

  return {
    finalText: originalText,
    finalResult: originalResult,
    rewriteAttempted: true,
    originalResult,
    rewriteResult,
    decisionReason: `Rewrite did not improve enough (${originalResult.scorePer1000Words.toFixed(0)} → ${rewriteResult.scorePer1000Words.toFixed(0)}/1000). Keeping original.`,
  };
}
