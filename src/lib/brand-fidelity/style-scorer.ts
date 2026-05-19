// ============================================================
// Pijler 1: Style Scorer — deterministische brand voice match
//
// Pure functie zonder AI-calls. Scoort generated content tegen de
// declared BrandPersonalityFrameworkData in twee dimensies:
//
//  1. wordsWeUse coverage — hoeveel van de declared positieve woorden
//     verschijnen daadwerkelijk in de output?
//  2. trait coverage — verschijnen de declared core traits (naam of
//     karakteristieke descriptors) in de output?
//
// Composite score 0-100. ~1ms per call (geen netwerk).
//
// Aanvullend op pijler 3 (anti-tell + BrandRule wordsWeAvoid). Pijler 1
// dekt het POSITIEVE deel: doet de output wat de brand wel wil.
// ============================================================

// ─── Type-mirrors ────────────────────────────────────

interface PersonalityTraitInput {
  name?: string;
  description?: string;
  weAreThis?: string;
  butNeverThat?: string;
}

interface BrandPersonalityInput {
  personalityTraits?: PersonalityTraitInput[];
  wordsWeUse?: string[];
  brandVoiceDescription?: string;
}

// ─── Output ──────────────────────────────────────────

export interface StyleScoreResult {
  /** 0-100 composite */
  compositeScore: number;
  dimensions: {
    /** % van declared wordsWeUse die in output verschijnen */
    wordsCoverage: { score: number; matched: string[]; missing: string[] };
    /** % van declared traits met name of descriptor zichtbaar */
    traitCoverage: { score: number; matched: string[]; missing: string[] };
  };
  /** Aantal declared positive signals (vocab + traits gecombineerd) */
  declaredSignalCount: number;
  /** Number of words in the analyzed text */
  wordCount: number;
}

// ─── Helpers ─────────────────────────────────────────

/** Lowercase + trim + collapse whitespace */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Word-boundary regex match for a literal phrase, case-insensitive */
function containsWord(haystack: string, needle: string): boolean {
  const trimmed = needle.trim();
  if (!trimmed) return false;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Use \b for ASCII word boundaries — works for most NL content
  return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
}

/** Check if any of the candidate keywords appear in the haystack */
function anyKeywordPresent(haystack: string, keywords: string[]): { found: boolean; matched: string } {
  for (const k of keywords) {
    const trimmed = k.trim();
    if (!trimmed) continue;
    if (containsWord(haystack, trimmed)) return { found: true, matched: trimmed };
  }
  return { found: false, matched: '' };
}

/**
 * Extract candidate keywords for a trait — both the name and
 * 1-3 key descriptors from description/weAreThis fields.
 *
 * Goal: catch the trait via name OR via vocabulary that the trait
 * implies. Don't fail on rigid name-matching.
 */
function traitKeywords(trait: PersonalityTraitInput): string[] {
  const keywords: string[] = [];
  if (trait.name) keywords.push(trait.name);

  // Extract content-bearing words from description + weAreThis
  // (drop articles, prepositions, common verbs)
  const text = [trait.description, trait.weAreThis].filter(Boolean).join(' ');
  if (text) {
    const stopwords = new Set([
      'de', 'het', 'een', 'en', 'of', 'is', 'zijn', 'we', 'wij', 'ons', 'onze',
      'in', 'op', 'aan', 'met', 'voor', 'naar', 'van', 'als', 'dat', 'die',
      'this', 'that', 'the', 'a', 'an', 'and', 'or', 'is', 'are', 'we', 'our',
      'in', 'on', 'at', 'with', 'for', 'to', 'of', 'as', 'never', 'nooit',
    ]);
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}-]/gu, ''))
      .filter((w) => w.length >= 4 && !stopwords.has(w));
    // Take first 3 unique content words as proxy descriptors
    for (const w of words) {
      if (!keywords.includes(w) && keywords.length < 5) keywords.push(w);
    }
  }
  return keywords;
}

// ─── Main scorer ─────────────────────────────────────

export function scoreBrandStyle(
  text: string,
  personality: BrandPersonalityInput | null | undefined,
): StyleScoreResult {
  const haystack = normalize(text);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  // Empty result if no personality data
  if (!personality) {
    return {
      compositeScore: 0,
      dimensions: {
        wordsCoverage: { score: 0, matched: [], missing: [] },
        traitCoverage: { score: 0, matched: [], missing: [] },
      },
      declaredSignalCount: 0,
      wordCount,
    };
  }

  // ── Dimension 1: wordsWeUse coverage ──
  const wordsWeUse = (personality.wordsWeUse ?? [])
    .map((w) => (typeof w === 'string' ? w.trim() : ''))
    .filter(Boolean);
  const wordsMatched: string[] = [];
  const wordsMissing: string[] = [];
  for (const w of wordsWeUse) {
    if (containsWord(haystack, w)) wordsMatched.push(w);
    else wordsMissing.push(w);
  }
  // F31 (audit 2026-05-13) recalibration: was simple linear coverage
  // (matched/total). Voor merken met grote wordsWeUse-lijsten (Napking
  // 20 woorden) is verwachten dat ALLE woorden in 300-400 woorden tekst
  // verschijnen onrealistisch — natuurlijke output bevat 30-50% van de
  // lijst. Saturation-curve: ratio% match = 100 (vol score), tussenwaarden lineair.
  // Rationale: brand-style is "gebruik genoeg signature words", niet
  // "gebruik ALLE signature words". Quality matters, not exhaustion.
  //
  // 2026-05-19 length-aware saturation: short-form content (LinkedIn-post
  // 200w, instagram-post 150w) heeft minder surface om brand-vocab in te
  // embedden. Verwachten dat 40% van de lijst in 200w verschijnt is
  // onrealistisch. Tiered:
  //   < 200w: 0.33 (≈ 3/10 = 91, 4/10 = 100)
  //   200-500w: 0.37 (medium gradient)
  //   ≥ 500w: 0.40 (long-form baseline, ongewijzigd)
  // Eerste iteratie (0.25/0.30/0.40) was te agressief — gaf score 100
  // bij slechts 3 matches in 200w content (gerapporteerd 2026-05-19
  // "Merkstijl geeft standaard 100"). Nieuwe waardes geven gradient:
  // 1/10 → 30, 2/10 → 61, 3/10 → 91, 4+/10 → 100 voor 200w content.
  const SATURATION_RATIO =
    wordCount < 200 ? 0.33 : wordCount < 500 ? 0.37 : 0.40;
  const wordsCoverageScore =
    wordsWeUse.length > 0
      ? Math.min(100, Math.round((wordsMatched.length / wordsWeUse.length / SATURATION_RATIO) * 100))
      : 100; // No declared words = full score (nothing to fail)

  // ── Dimension 2: trait coverage ──
  const traits = (personality.personalityTraits ?? []).filter((t) => t.name && t.name.trim());
  const traitsMatched: string[] = [];
  const traitsMissing: string[] = [];
  for (const t of traits) {
    const keywords = traitKeywords(t);
    const result = anyKeywordPresent(haystack, keywords);
    if (result.found) traitsMatched.push(t.name as string);
    else traitsMissing.push(t.name as string);
  }
  // F31: zelfde saturation logic voor traits — niet alle persona-traits
  // hoeven aanwezig te zijn voor een goede brand-match.
  const traitCoverageScore =
    traits.length > 0
      ? Math.min(100, Math.round((traitsMatched.length / traits.length / SATURATION_RATIO) * 100))
      : 100;

  // ── Composite (50/50 weights) ──
  const compositeScore = Math.round(wordsCoverageScore * 0.5 + traitCoverageScore * 0.5);

  return {
    compositeScore,
    dimensions: {
      wordsCoverage: { score: wordsCoverageScore, matched: wordsMatched, missing: wordsMissing },
      traitCoverage: { score: traitCoverageScore, matched: traitsMatched, missing: traitsMissing },
    },
    declaredSignalCount: wordsWeUse.length + traits.length,
    wordCount,
  };
}

/**
 * Format a markdown report for a StyleScoreResult.
 */
export function formatStyleReport(result: StyleScoreResult, label?: string): string {
  const lines: string[] = [];
  lines.push(`# Style Scorer Report${label ? ` — ${label}` : ''}`);
  lines.push('');
  lines.push(`- **Composite**: ${result.compositeScore}/100`);
  lines.push(`- **Words coverage**: ${result.dimensions.wordsCoverage.score}/100 (${result.dimensions.wordsCoverage.matched.length} of ${result.dimensions.wordsCoverage.matched.length + result.dimensions.wordsCoverage.missing.length})`);
  lines.push(`- **Trait coverage**: ${result.dimensions.traitCoverage.score}/100 (${result.dimensions.traitCoverage.matched.length} of ${result.dimensions.traitCoverage.matched.length + result.dimensions.traitCoverage.missing.length})`);
  lines.push(`- **Declared signals**: ${result.declaredSignalCount}`);
  lines.push(`- **Word count**: ${result.wordCount}`);
  lines.push('');

  if (result.dimensions.wordsCoverage.matched.length > 0) {
    lines.push(`**Words matched**: ${result.dimensions.wordsCoverage.matched.join(', ')}`);
  }
  if (result.dimensions.wordsCoverage.missing.length > 0) {
    lines.push(`**Words missing**: ${result.dimensions.wordsCoverage.missing.join(', ')}`);
  }
  lines.push('');
  if (result.dimensions.traitCoverage.matched.length > 0) {
    lines.push(`**Traits matched**: ${result.dimensions.traitCoverage.matched.join(', ')}`);
  }
  if (result.dimensions.traitCoverage.missing.length > 0) {
    lines.push(`**Traits missing**: ${result.dimensions.traitCoverage.missing.join(', ')}`);
  }

  return lines.join('\n');
}
