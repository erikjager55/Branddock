// ============================================================
// Brand Foundation Coherence Check
//
// Detecteert interne tegenstrijdigheden in een BrandPersonalityFrameworkData
// record vóórdat de data naar de generatie-pipeline gaat.
//
// Het BB-fenomeen (drift-meting week 1) was: toneDimensions zegt
// "Funny + Enthusiastic" terwijl spectrumSliders zegt "strongly Reserved
// + strongly Serious + strongly Traditional" — onverenigbaar. LLMs kiezen
// dan de meerderheid en negeren de minderheid, met willekeurige output
// als gevolg.
//
// Deze checker draait realtime in de Brand Personality editor als warning,
// en optioneel via een batch-script over alle workspaces om bestaande
// data te valideren.
// ============================================================

export type ConflictSeverity = 'INFO' | 'WARNING' | 'ERROR';

export type ConflictKind =
  | 'TONE_SPECTRUM_MISMATCH'
  | 'WORDS_USE_AVOID_OVERLAP'
  | 'TRAIT_DIMENSION_MISMATCH'
  | 'EMPTY_ANTI_PATTERNS'
  | 'INCONSISTENT_REGISTER';

export interface CoherenceConflict {
  kind: ConflictKind;
  severity: ConflictSeverity;
  /** Concrete uitleg voor de gebruiker */
  message: string;
  /** Welke velden zijn betrokken (voor UI-highlighting) */
  fields: string[];
  /** Concrete voorbeeld-data om de uitleg te onderbouwen */
  evidence?: Record<string, unknown>;
}

// ─── Type-mirrors van BrandPersonalityFrameworkData ──

interface BrandPersonalityInput {
  primaryDimension?: string;
  secondaryDimension?: string;
  dimensionScores?: Record<string, number>;
  personalityTraits?: Array<{
    name?: string;
    description?: string;
    weAreThis?: string;
    butNeverThat?: string;
  }>;
  spectrumSliders?: {
    friendlyFormal?: number;
    energeticThoughtful?: number;
    modernTraditional?: number;
    innovativeProven?: number;
    playfulSerious?: number;
    inclusiveExclusive?: number;
    boldReserved?: number;
  };
  toneDimensions?: {
    formalCasual?: number;
    seriousFunny?: number;
    respectfulIrreverent?: number;
    matterOfFactEnthusiastic?: number;
  };
  wordsWeUse?: string[];
  wordsWeAvoid?: string[];
  writingSample?: string;
}

// ─── Cross-axis mappings tussen spectrum en tone ──

/**
 * Welke spectrum-slider en tone-dimensie meten ongeveer hetzelfde
 * en zouden dus in dezelfde richting moeten leunen?
 *
 * direction = 'aligned' betekent: lage waarde op beide = zelfde kant.
 * direction = 'inverted' betekent: lage waarde op de één = hoge op de ander.
 */
const SPECTRUM_TONE_PAIRS: Array<{
  spectrum: keyof NonNullable<BrandPersonalityInput['spectrumSliders']>;
  spectrumLow: string;
  spectrumHigh: string;
  tone: keyof NonNullable<BrandPersonalityInput['toneDimensions']>;
  toneLow: string;
  toneHigh: string;
  direction: 'aligned' | 'inverted';
}> = [
  {
    spectrum: 'playfulSerious',
    spectrumLow: 'Playful',
    spectrumHigh: 'Serious',
    tone: 'seriousFunny',
    toneLow: 'Serious',
    toneHigh: 'Funny',
    direction: 'inverted', // playful=1 ~ funny=7
  },
  {
    spectrum: 'friendlyFormal',
    spectrumLow: 'Friendly',
    spectrumHigh: 'Formal',
    tone: 'formalCasual',
    toneLow: 'Formal',
    toneHigh: 'Casual',
    direction: 'inverted', // friendly=1 ~ casual=7
  },
  {
    spectrum: 'boldReserved',
    spectrumLow: 'Bold',
    spectrumHigh: 'Reserved',
    tone: 'matterOfFactEnthusiastic',
    toneLow: 'Matter-of-fact',
    toneHigh: 'Enthusiastic',
    direction: 'inverted', // bold=1 ~ enthusiastic=7
  },
];

/**
 * Helper: bepaal of een waarde op een 1-7 schaal "uitgesproken" is
 * (≥5 of ≤3) — neutrale waarden (4) tellen niet mee voor mismatch-detectie.
 */
function isPronounced(value: number | undefined): boolean {
  if (value === undefined || value === null) return false;
  return value >= 5 || value <= 3;
}

/**
 * Helper: zit een waarde in de "low" helft van een 1-7 schaal?
 */
function isLow(value: number): boolean {
  return value <= 3;
}

// ─── Checks ──────────────────────────────────────────

function checkToneSpectrumMismatch(input: BrandPersonalityInput): CoherenceConflict[] {
  const conflicts: CoherenceConflict[] = [];
  if (!input.spectrumSliders || !input.toneDimensions) return conflicts;

  for (const pair of SPECTRUM_TONE_PAIRS) {
    const spectrumValue = input.spectrumSliders[pair.spectrum];
    const toneValue = input.toneDimensions[pair.tone];
    if (spectrumValue === undefined || toneValue === undefined) continue;
    if (!isPronounced(spectrumValue) || !isPronounced(toneValue)) continue;

    const spectrumIsLow = isLow(spectrumValue);
    const toneIsLow = isLow(toneValue);
    const spectrumLabel = spectrumIsLow ? pair.spectrumLow : pair.spectrumHigh;
    const toneLabel = toneIsLow ? pair.toneLow : pair.toneHigh;

    // For 'inverted' direction: spectrum low + tone low = mismatch (both should disagree)
    // Aligned direction: low+low = match, low+high = mismatch
    let mismatch = false;
    if (pair.direction === 'inverted') {
      mismatch = spectrumIsLow === toneIsLow;
    } else {
      mismatch = spectrumIsLow !== toneIsLow;
    }

    if (mismatch) {
      conflicts.push({
        kind: 'TONE_SPECTRUM_MISMATCH',
        severity: 'WARNING',
        message: `Spectrum-slider zegt "${spectrumLabel}" (${spectrumValue}/7) maar tone-dimensie zegt "${toneLabel}" (${toneValue}/7). Deze meten ongeveer hetzelfde en zouden in dezelfde richting moeten leunen — een AI-generator kan deze tegenstrijdigheid niet harmoniseren en zal één signaal negeren.`,
        fields: [`spectrumSliders.${pair.spectrum}`, `toneDimensions.${pair.tone}`],
        evidence: {
          spectrumValue,
          spectrumLabel,
          toneValue,
          toneLabel,
        },
      });
    }
  }

  return conflicts;
}

function checkWordsUseAvoidOverlap(input: BrandPersonalityInput): CoherenceConflict[] {
  const use = (input.wordsWeUse ?? []).map((w) => w.toLowerCase().trim()).filter(Boolean);
  const avoid = (input.wordsWeAvoid ?? []).map((w) => w.toLowerCase().trim()).filter(Boolean);
  const useSet = new Set(use);
  const overlap = avoid.filter((w) => useSet.has(w));
  if (overlap.length === 0) return [];

  return [
    {
      kind: 'WORDS_USE_AVOID_OVERLAP',
      severity: 'ERROR',
      message: `Eén of meer woorden staan zowel in "Words we use" als "Words we avoid": ${overlap.join(', ')}. Kies per woord één lijst.`,
      fields: ['wordsWeUse', 'wordsWeAvoid'],
      evidence: { overlap },
    },
  ];
}

function checkEmptyAntiPatterns(input: BrandPersonalityInput): CoherenceConflict[] {
  const traits = input.personalityTraits ?? [];
  if (traits.length === 0) return [];
  const filledTraits = traits.filter((t) => t.name);
  if (filledTraits.length === 0) return [];
  const missingAntiPatterns = filledTraits.filter((t) => !t.butNeverThat || t.butNeverThat.trim().length < 3);
  if (missingAntiPatterns.length === 0) return [];

  // Alleen waarschuwen als minder dan helft anti-patterns heeft — kleine missende velden gaan niet meteen om
  if (missingAntiPatterns.length < filledTraits.length / 2) return [];

  return [
    {
      kind: 'EMPTY_ANTI_PATTERNS',
      severity: 'INFO',
      message: `${missingAntiPatterns.length} van ${filledTraits.length} core traits hebben geen "But never:" anti-pattern ingevuld. Anti-patterns voorkomen drift in AI-generaties; ze geven het model expliciete grenzen.`,
      fields: missingAntiPatterns.map((t, i) => `personalityTraits[${i}].butNeverThat`),
      evidence: {
        missingTraitNames: missingAntiPatterns.map((t) => t.name).filter(Boolean),
      },
    },
  ];
}

function checkTraitDimensionMismatch(input: BrandPersonalityInput): CoherenceConflict[] {
  // Heuristiek: als primaryDimension Sincerity is, verwacht je traits met
  // warm/eerlijk/familie-vriendelijke woorden, niet bold/enthusiastic/sophisticated.
  // Dit is een lichtgewicht check — alleen flagging bij duidelijke mismatch tussen
  // primaryDimension en eerste trait-name.
  if (!input.primaryDimension || !input.personalityTraits || input.personalityTraits.length === 0) return [];

  const dimension = input.primaryDimension.toLowerCase();
  const firstTrait = input.personalityTraits[0]?.name?.toLowerCase();
  if (!firstTrait) return [];

  // Conflicten woordenboek (klein, illustratief — niet uitputtend)
  const dimensionVocabulary: Record<string, { likely: string[]; unlikely: string[] }> = {
    sincerity: {
      likely: ['eerlijk', 'oprecht', 'down-to-earth', 'familie', 'warm', 'vriendelijk', 'authentiek', 'puur'],
      unlikely: ['stoer', 'gewaagd', 'rebels', 'luxe', 'exclusief', 'avant-garde'],
    },
    excitement: {
      likely: ['speels', 'energiek', 'gewaagd', 'jong', 'creatief', 'levendig'],
      unlikely: ['traditioneel', 'klassiek', 'reserved', 'somber'],
    },
    competence: {
      likely: ['betrouwbaar', 'professioneel', 'precies', 'vakkundig', 'efficiënt'],
      unlikely: ['speels', 'rebels', 'gewaagd'],
    },
    sophistication: {
      likely: ['exclusief', 'verfijnd', 'elegant', 'luxe', 'gepolijst'],
      unlikely: ['simpel', 'volks', 'rauw', 'traditioneel'],
    },
    ruggedness: {
      likely: ['stoer', 'rauw', 'tough', 'outdoor', 'authentiek', 'no-nonsense'],
      unlikely: ['verfijnd', 'gepolijst', 'delicaat'],
    },
  };

  const vocab = dimensionVocabulary[dimension];
  if (!vocab) return [];

  const isUnlikely = vocab.unlikely.some((w) => firstTrait.includes(w));
  if (!isUnlikely) return [];

  return [
    {
      kind: 'TRAIT_DIMENSION_MISMATCH',
      severity: 'INFO',
      message: `Primary dimension is "${input.primaryDimension}" maar de eerste core trait ("${input.personalityTraits[0].name}") leunt taalkundig naar een andere dimensie. Dit is niet per se fout — controleer of de trait inderdaad de Aaker-dimensie ondersteunt.`,
      fields: ['primaryDimension', 'personalityTraits[0].name'],
      evidence: {
        primaryDimension: input.primaryDimension,
        firstTrait: input.personalityTraits[0].name,
      },
    },
  ];
}

// ─── Public API ──────────────────────────────────────

/**
 * Run alle coherence-checks op een BrandPersonalityFrameworkData record.
 * Returns alle gedetecteerde conflicten, gesorteerd op severity (ERROR > WARNING > INFO).
 */
export function checkBrandPersonalityCoherence(input: BrandPersonalityInput): CoherenceConflict[] {
  const all = [
    ...checkToneSpectrumMismatch(input),
    ...checkWordsUseAvoidOverlap(input),
    ...checkEmptyAntiPatterns(input),
    ...checkTraitDimensionMismatch(input),
  ];

  const severityRank: Record<ConflictSeverity, number> = { ERROR: 0, WARNING: 1, INFO: 2 };
  return all.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

/**
 * Quick boolean: heeft dit BrandPersonality record kritieke conflicten
 * (ERROR-severity) die generatie zouden moeten blokkeren?
 */
export function hasBlockingConflicts(input: BrandPersonalityInput): boolean {
  return checkBrandPersonalityCoherence(input).some((c) => c.severity === 'ERROR');
}

/**
 * Format conflicts as a markdown summary for reporting / UI display.
 */
export function formatCoherenceReport(conflicts: CoherenceConflict[], label?: string): string {
  if (conflicts.length === 0) {
    return `# Coherence Check${label ? ` — ${label}` : ''}\n\n✅ Geen conflicten gedetecteerd. Brand Personality is intern consistent.`;
  }

  const lines: string[] = [];
  lines.push(`# Coherence Check${label ? ` — ${label}` : ''}`);
  lines.push('');
  const errorCount = conflicts.filter((c) => c.severity === 'ERROR').length;
  const warningCount = conflicts.filter((c) => c.severity === 'WARNING').length;
  const infoCount = conflicts.filter((c) => c.severity === 'INFO').length;
  lines.push(`**${conflicts.length} conflicten**: ${errorCount} ERROR, ${warningCount} WARNING, ${infoCount} INFO`);
  lines.push('');

  for (const c of conflicts) {
    lines.push(`## ${c.severity}: ${c.kind}`);
    lines.push('');
    lines.push(c.message);
    lines.push('');
    lines.push(`**Velden**: ${c.fields.join(', ')}`);
    if (c.evidence) {
      lines.push('');
      lines.push('**Evidence**:');
      lines.push('```json');
      lines.push(JSON.stringify(c.evidence, null, 2));
      lines.push('```');
    }
    lines.push('');
  }

  return lines.join('\n');
}
