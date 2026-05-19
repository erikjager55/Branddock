// ============================================================
// AI-Tell Detector
//
// Detecteert herkenbare AI-output patronen in gegenereerde tekst,
// gebaseerd op gepubliceerd onderzoek (Wikipedia, Gregory Agency,
// AiSDR, Walter Writes, The Conversation, Frankwatching, Bikkelhart,
// Donna van de Ven, huntingthemuse.net, Daphne Ippolito,
// Max Planck Institute, Alyssa Wiens, Olivier Opdebeeck, Rankingmasters).
//
// 10 categorieën:
//   1. Woordkeuze (Engels) — delve, tapestry, robust, etc.
//   2. Woordkeuze (Nederlands) — naadloos, baanbrekend, etc.
//   3. Zinsstructuren — contrastformule, whether-or, vraag-antwoord
//   4. Interpunctie — em-dash misuse, smart quotes
//   5. Opbouw — symmetrische alinea's, bullet-addiction
//   6. Toon en register — disclaimer mantra's, overdreven beleefdheid
//   7. Inhoudelijke tells — geen voorbeelden, verzonnen statistieken
//   8. Technische tells — citeturn, unicode artefacten
//   9. NL-specifieke tells — anglicismen, vertaalde syntax
//
// Eén tell zegt niets; combinatie van vijf-zes in één tekst zegt veel.
// Severity-weging reflecteert dit: aggregate score is wat telt.
// ============================================================

export type TellCategory =
  | 'EN_WORD'
  | 'NL_WORD'
  | 'SENTENCE_STRUCTURE'
  | 'PUNCTUATION'
  | 'STRUCTURE'
  | 'TONE'
  | 'CONTENT'
  | 'TECHNICAL'
  | 'NL_ANGLICISM';

export type TellSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Softness levels — calibratie tegen menselijke ground-truth (Erik's
 * Frankwatching 2020/2021 artikelen).
 *
 * HARD = patroon dat zelden in geoefend mens-werk voorkomt; sterke AI-tell
 *        (citeturn artefacten, marketing-clichés, AI-overtuiging,
 *         disclaimer-mantra's, "niet omdat... maar omdat...", buzzwords).
 *
 * SOFT = patroon dat ook in mens-werk voorkomt als legitieme stijlkeuze
 *        (contrast-formule "niet alleen X, maar ook Y", em-dash misuse,
 *         formele connectors, oxford-komma, bullet-lists).
 *        Score-weight halveert; alleen problematisch bij hoge density.
 */
export type TellSoftness = 'HARD' | 'SOFT';

export interface TellDefinition {
  id: string;
  category: TellCategory;
  severity: TellSeverity;
  softness: TellSoftness;
  /** Regex source — case insensitive unless overridden */
  pattern: RegExp;
  /** Human-readable description for reporting */
  description: string;
}

export interface DetectedTell {
  definition: TellDefinition;
  matches: string[];
  count: number;
}

export interface AiTellResult {
  /** Total severity-weighted score (higher = more AI-like) */
  score: number;
  /** Number of distinct definitions matched */
  uniqueTellCount: number;
  /** Total individual matches across all tells */
  totalMatches: number;
  /** Per-tell detail */
  detected: DetectedTell[];
  /** Per-category aggregate */
  byCategory: Record<TellCategory, { count: number; score: number }>;
  /** Word count of input text (for normalization) */
  wordCount: number;
  /** Score normalized per 1000 words */
  scorePer1000Words: number;
  /**
   * Verdict on a position-based scale, calibrated against measured human
   * baseline (Erik Jager Frankwatching artikelen 2020/2021):
   *
   *   TOP_TIER         (< 12 /1k): top-tier menselijke schrijver
   *   HUMAN_BASELINE   (12-30 /1k): gemiddeld goed mens-werk
   *   AI_LEANING       (30-50 /1k): herkenbaar AI-output, herwerk wenselijk
   *   PURE_AI          (50+ /1k): vanille ChatGPT-niveau, demo-onwaardig
   */
  verdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI';
  /**
   * Position on a 0-100 scale where:
   *   0   = top-tier menselijke baseline
   *   50  = grens tussen HUMAN_BASELINE en AI_LEANING
   *   100 = pure AI (vanille ChatGPT)
   * Useful for demo visualization (slider/scale).
   */
  humanBaselinePosition: number;
}

// ─── Helpers ────────────────────────────────────────────

const SEVERITY_WEIGHTS: Record<TellSeverity, number> = {
  LOW: 1,
  MEDIUM: 3,
  HIGH: 5,
};

const SOFTNESS_MULTIPLIER: Record<TellSoftness, number> = {
  HARD: 1.0,
  SOFT: 0.5,
};

function tellWeight(def: TellDefinition): number {
  return SEVERITY_WEIGHTS[def.severity] * SOFTNESS_MULTIPLIER[def.softness];
}

/** Build word-boundary regex from list of literal words/phrases */
function wordsRegex(words: string[]): RegExp {
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
}

// ─── Tell definitions ────────────────────────────────────

export const TELL_DEFINITIONS: TellDefinition[] = [
  // ─── 1. Engelse woordkeuze ───
  {
    id: 'en_classic_tells',
    category: 'EN_WORD',
    severity: 'HIGH',
   softness: 'HARD',
    pattern: wordsRegex([
      'delve',
      'delving',
      'tapestry',
      'testament to',
      'intricate',
      'intricacies',
      'interplay',
      'pivotal',
      'meticulous',
      'meticulously',
      'underscore',
      'underscores',
      'bolster',
      'garner',
      'garnered',
      'vibrant',
      'multifaceted',
      'robust',
      'leverage',
      'leveraging',
      'harness',
      'harnessing',
      'streamline',
      'realm',
      'landscape',
      'synergy',
    ]),
    description: 'Klassieke AI-verraders (Engels, Max Planck onderzoek 2022+)',
  },
  {
    id: 'en_buzzword_adjectives',
    category: 'EN_WORD',
    severity: 'MEDIUM',
    softness: 'HARD',
    pattern: wordsRegex([
      'cutting-edge',
      'seamless',
      'innovative',
      'revolutionary',
      'transformative',
      'comprehensive',
      'dynamic',
      'holistic',
      'cohesive',
      'unparalleled',
      'game-changing',
      'state-of-the-art',
    ]),
    description: 'Buzzword-adjectieven (Engels) — overdreven enthousiasme',
  },
  {
    id: 'en_blueprint_verbs',
    category: 'EN_WORD',
    severity: 'MEDIUM',
    softness: 'SOFT',
    pattern: wordsRegex([
      'navigate',
      'foster',
      'unlock',
      'empower',
      'optimize',
      'enhance',
      'embrace',
      'embark',
      'elevate',
      'facilitate',
    ]),
    description: 'AI-blauwdruk werkwoorden (Engels)',
  },
  {
    id: 'en_formal_connectors',
    category: 'EN_WORD',
    severity: 'MEDIUM',
    softness: 'SOFT',
    pattern: wordsRegex([
      'furthermore',
      'moreover',
      'additionally',
      'consequently',
      'notably',
      'crucially',
      'ultimately',
      'indeed',
    ]),
    description: 'Te formele verbindingswoorden (Engels)',
  },
  {
    id: 'en_empty_adverbs',
    category: 'EN_WORD',
    severity: 'LOW',
    softness: 'SOFT',
    pattern: wordsRegex([
      'effectively',
      'efficiently',
      'successfully',
      'strategically',
      'consistently',
      'seamlessly',
    ]),
    description: 'Adverbia die niets toevoegen (Engels)',
  },

  // ─── 2. Nederlandse woordkeuze ───
  {
    id: 'nl_buzzword_adjectives',
    category: 'NL_WORD',
    severity: 'HIGH',
    softness: 'HARD',
    pattern: wordsRegex([
      'verheugd',
      'naadloos',
      'ongeëvenaard',
      'baanbrekend',
      'robuust',
      'veelzijdig',
      'multifunctioneel',
      'intuïtief',
      'doordacht',
      'toonaangevend',
      'vooraanstaand',
      'impactvol',
      'betekenisvol',
      'boeiend',
      'fascinerend',
      'indrukwekkend',
    ]),
    description: 'NL buzzword-adjectieven',
  },
  {
    id: 'nl_filler_adjectives',
    category: 'NL_WORD',
    severity: 'MEDIUM',
    softness: 'SOFT',
    pattern: wordsRegex([
      'krachtig',
      'uitgebreid',
      'op maat',
      'essentieel',
      'cruciaal',
      'waardevol',
    ]),
    description: 'NL adjectieven die opvulling zijn',
  },
  {
    id: 'nl_blueprint_verbs',
    category: 'NL_WORD',
    severity: 'MEDIUM',
    softness: 'SOFT',
    pattern: wordsRegex([
      'ontsluiten',
      'faciliteren',
      'optimaliseren',
      'transformeren',
      'verrijken',
      'verdiepen',
      'omarmen',
      'benutten',
    ]),
    description: 'NL blauwdruk-werkwoorden',
  },
  {
    id: 'nl_formal_connectors',
    category: 'NL_WORD',
    severity: 'MEDIUM',
    softness: 'SOFT',
    pattern: /(^|\.\s+|\n\s*)(bovendien|daarnaast|daarom|kortom|voorts|derhalve|immers)\b/gi,
    description: 'NL te formele verbindingswoorden aan begin van zin',
  },
  {
    id: 'nl_marketing_cliches',
    category: 'NL_WORD',
    severity: 'HIGH',
    softness: 'HARD',
    pattern:
      /(in een wereld die voortdurend verandert|in het huidige digitale tijdperk|in de steeds veranderende wereld|in deze tijd waarin|wij geloven dat|bij [a-z][a-z\s]+ begrijpen we|bij [a-z][a-z\s]+ geloven we|in het (dynamische|complexe|snel veranderende|hedendaagse|moderne) landschap|in de wereld van (het|de) [a-z]+|in het pittoreske)/gi,
    description: 'NL marketing-clichés + landschap/wereld-openers (PR-formule)',
  },
  {
    id: 'nl_passive_ai_narration',
    category: 'TONE',
    severity: 'HIGH',
    softness: 'HARD',
    /** Passieve narratie-werkwoorden die AI-vertelmodus typeren — "werd benaderd",
     *  "stuitte op", "onthulde", "weerspiegelde", "illustreerde" als hoofdverb */
    pattern: /\b(werd benaderd|stuitte op|onthulde|onthulden|illustreerde|weerspiegelde|werd geconfronteerd met|kwam (te|tot) staan voor)\b/gi,
    description: 'Passieve AI-narratie ("werd benaderd", "stuitte op", "onthulde")',
  },
  {
    id: 'nl_subjunctive_corporate',
    category: 'NL_WORD',
    severity: 'HIGH',
    softness: 'HARD',
    /** Corporate subjunctief-constructies: "zich weten te X", "wist te X-en", "slaagt erin om" */
    pattern: /\b(zich (snel |al |ook |inmiddels )?weten te [a-z]+en|wist te [a-z]+en|slaagt erin om|slaagde erin om|weet zich te [a-z]+en)\b/gi,
    description: 'Corporate subjunctief ("zich weten te positioneren", "wist te onderscheiden")',
  },
  {
    id: 'nl_corporate_drama',
    category: 'TONE',
    severity: 'MEDIUM',
    softness: 'HARD',
    /** Drama-versterkers in corporate context */
    pattern: /\b(catastrofaal|cruciale uitdaging|kritieke moment|schokkende realiteit|onthutsend|onmiskenbaar|ongekende (groei|kansen|mogelijkheden)|allesomvattend)\b/gi,
    description: 'Corporate drama-overdrijving',
  },
  {
    id: 'nl_qa_pingpong',
    category: 'SENTENCE_STRUCTURE',
    severity: 'MEDIUM',
    softness: 'HARD',
    /** "Het doel? X." / "De uitdaging? Y." / "Het resultaat? Z." */
    pattern: /\b(het|de) (doel|probleem|resultaat|uitdaging|antwoord|gevolg|nadeel|voordeel|risico|effect)\?\s+[A-Z]/g,
    description: 'Vraag-antwoord-pingpong "Het doel? X." als retoriek-tic',
  },
  {
    id: 'nl_overdreven_adjectives',
    category: 'NL_WORD',
    severity: 'MEDIUM',
    softness: 'HARD',
    pattern: wordsRegex([
      'vooruitstrevend',
      'geraffineerd',
      'verfijnd',
      'uitgekiend',
      'tijdloos',
      'pittoreske',
      'pittoresk',
      'weelderig',
      'weelderige',
      'scherpzinnigheid',
      'vakkundigheid',
      'vakkundig',
      'meesterlijk',
    ]),
    description: 'Overdreven sfeer-adjectieven typisch voor AI-prozaschrijven',
  },
  {
    id: 'nl_extreme_intensifiers',
    category: 'TONE',
    severity: 'LOW',
    softness: 'SOFT',
    /** "non-negotiable", "compromisloos", "haarscherp" — extreme intensifiers */
    pattern: /\b(non-negotiable|compromisloos|compromisloze|haarscherp|onbetwist|onbetwiste|onmiskenbaar)\b/gi,
    description: 'Extreme intensifiers — AI grijpt naar absolute taal',
  },

  // ─── 3. Zinsstructuren ───
  {
    id: 'contrast_formula_nl',
    category: 'SENTENCE_STRUCTURE',
    severity: 'HIGH',
    softness: 'SOFT',
    pattern: /(het is niet zomaar|dit is geen [a-z]+, dit is|niet alleen [a-z\s]+,? maar (ook )?[a-z])/gi,
    description: 'NL contrastformule "Het is niet zomaar X, het is Y"',
  },
  {
    id: 'contrast_formula_en',
    category: 'SENTENCE_STRUCTURE',
    severity: 'HIGH',
    softness: 'SOFT',
    pattern: /(it[''']?s not (just|merely|only) [\w\s]{3,30}(,|—|--)\s+it[''']?s|not just [\w\s]{2,20}\s+—)/gi,
    description: 'EN contrast-formule "It\'s not just X, it\'s Y"',
  },
  {
    id: 'not_because_but_because',
    category: 'SENTENCE_STRUCTURE',
    severity: 'HIGH',
    softness: 'HARD',
    pattern: /\bniet omdat[\w\s,\.]{1,80}?,?\s*maar omdat\b/gi,
    description: 'NL "niet omdat..., maar omdat..." structuur (overgebruikt)',
  },
  {
    id: 'whether_or_nl',
    category: 'SENTENCE_STRUCTURE',
    severity: 'MEDIUM',
    softness: 'SOFT',
    pattern: /\bof je nu [\w\s]{2,30} bent of\b/gi,
    description: 'NL "Of je nu X bent of Y"-constructie',
  },
  {
    id: 'whether_or_en',
    category: 'SENTENCE_STRUCTURE',
    severity: 'MEDIUM',
    softness: 'SOFT',
    pattern: /\bwhether you[''']?re [\w\s]{2,30} or\b/gi,
    description: 'EN "Whether you\'re X or Y"-constructie',
  },
  {
    id: 'announcement_meta',
    category: 'SENTENCE_STRUCTURE',
    severity: 'MEDIUM',
    softness: 'HARD',
    pattern:
      /(laten we (eens )?kijken naar|in dit artikel (verkennen|behandelen|bespreken) we|hieronder (behandelen|bespreken|verkennen) we|in this article we (will )?(explore|cover|discuss))/gi,
    description: 'Aankondigings-zinnen die structuur opsommen i.p.v. inhoud',
  },
  {
    id: 'closing_formula',
    category: 'SENTENCE_STRUCTURE',
    severity: 'MEDIUM',
    softness: 'SOFT',
    pattern:
      /(^|\n\s*)(kortom|tot slot|ultimately|in conclusion|all in all|to sum up|samenvattend),?\s+/gim,
    description: 'Slotformule die kernpunten herhaalt',
  },

  // ─── 4. Interpunctie ───
  {
    id: 'em_dash_overuse',
    category: 'PUNCTUATION',
    severity: 'MEDIUM',
    softness: 'SOFT',
    /** Em-dash (—) gevolgd door spatie + lowercase woord = trailing modifier
     *  Niet de hele em-dash veroordelen, alleen het AI-misbruik patroon */
    pattern: /\S\s*—\s+[a-z]/g,
    description: 'Em-dash trailing modifier (zonder gepaarde em-dash) — Engels patroon in NL',
  },
  {
    id: 'smart_quotes',
    category: 'PUNCTUATION',
    severity: 'LOW',
    softness: 'SOFT',
    pattern: /[“”‘’]/g,
    description: 'Smart quotes (krullende aanhalingstekens) i.p.v. rechte',
  },
  {
    id: 'colon_punchline',
    category: 'PUNCTUATION',
    severity: 'MEDIUM',
    softness: 'SOFT',
    pattern: /(here['']?s the thing|think about it|the truth|de realiteit|de waarheid is|de kern):\s*/gi,
    description: 'Dubbele punt-pingpong "Here\'s the thing:" / "De realiteit:"',
  },

  // ─── 5. Opbouw ───
  {
    id: 'bullet_addiction',
    category: 'STRUCTURE',
    severity: 'LOW',
    softness: 'SOFT',
    /** Detecteert opeenvolgende lijsten van 3 items op rij — moeilijk perfect maar indicatief */
    pattern: /^(\s*[-*•]\s+\S.*\n){3,}/gm,
    description: 'Bullet-lijsten waar prozavorm logischer was',
  },

  // ─── 6. Toon en register ───
  {
    id: 'disclaimer_mantras',
    category: 'TONE',
    severity: 'HIGH',
    softness: 'HARD',
    pattern:
      /(it[''']?s important to note that|het is goed (om )?te beseffen dat|het is belangrijk te beseffen dat|while [\w\s]{2,30}, it[''']?s also true that|it[''']?s worth noting)/gi,
    description: 'Disclaimer-mantra\'s — typisch AI-voorzichtigheid',
  },
  {
    id: 'overpolite_openers',
    category: 'TONE',
    severity: 'HIGH',
    softness: 'HARD',
    pattern: /^(certainly|absolutely|absoluut|wat een goede vraag|great question|of course)[!,.]?/gim,
    description: 'Overdreven beleefde openers',
  },
  {
    id: 'ai_overconviction',
    category: 'TONE',
    severity: 'MEDIUM',
    softness: 'HARD',
    pattern:
      /(zonder dat het ook maar een millimeter|tot op de millimeter|exactly the same|precies hetzelfde|in elk opzicht|in every (single )?way|onder geen enkele omstandigheid|hundred percent|honderd procent (gegarandeerd|zeker))/gi,
    description: 'AI-overtuigingsmarkers — onnatuurlijk absoluut',
  },

  // ─── 7. Inhoudelijke tells ───
  {
    id: 'vague_evidence',
    category: 'CONTENT',
    severity: 'MEDIUM',
    softness: 'HARD',
    pattern:
      /(in talloze projecten|in tal van gevallen|diverse onderzoeken tonen aan|veel onderzoek (toont|wijst) aan|various studies show|countless projects|in many cases|multiple studies indicate)/gi,
    description: 'Vage referenties zonder concrete bron',
  },
  {
    id: 'fake_precision',
    category: 'CONTENT',
    severity: 'MEDIUM',
    softness: 'HARD',
    /** Specifieke percentages (niet rond getal) zonder voetnoot of bron in zelfde zin */
    pattern: /\b\d{1,2}[,.]?\d{0,2}\s*(%|procent)\b(?![^.\n]{0,80}(?:bron|source|onderzoek van|study by))/gi,
    description: 'Concrete percentages zonder verifieerbare bron',
  },

  // ─── 8. Technische tells ───
  {
    id: 'citeturn_artifacts',
    category: 'TECHNICAL',
    severity: 'HIGH',
    softness: 'HARD',
    pattern: /citeturn\d+(search|news|web)\d+/gi,
    description: 'ChatGPT citeturn artefacten (Wikipedia documented)',
  },
  {
    id: 'unicode_artifacts',
    category: 'TECHNICAL',
    severity: 'LOW',
    softness: 'HARD',
    /** Niet-standaard unicode spaces (non-breaking, narrow no-break, em space, etc.) */
    pattern: /[     ]/g,
    description: 'Niet-standaard unicode spaties (NBSP, narrow no-break, etc.)',
  },

  // ─── 9. NL-specifieke tells ───
  {
    id: 'nl_anglicism_translations',
    category: 'NL_ANGLICISM',
    severity: 'MEDIUM',
    softness: 'SOFT',
    pattern:
      /(aan het einde van de dag|in deze ruimte|geleveraged|getargeted|\bgegamechanged|tapijt aan|een (palet|spectrum|scala) aan|onder de motorkap)/gi,
    description: 'Anglicismen — Engelse uitdrukkingen letterlijk vertaald',
  },
  {
    id: 'nl_oxford_comma',
    category: 'NL_ANGLICISM',
    severity: 'LOW',
    softness: 'SOFT',
    pattern: /,\s+(en|of)\s+[a-zA-Z]/g,
    description: 'Oxford-komma in NL (komma vóór "en"/"of")',
  },
];

// ─── Detector ─────────────────────────────────────────

const ALL_CATEGORIES: TellCategory[] = [
  'EN_WORD',
  'NL_WORD',
  'SENTENCE_STRUCTURE',
  'PUNCTUATION',
  'STRUCTURE',
  'TONE',
  'CONTENT',
  'TECHNICAL',
  'NL_ANGLICISM',
];

function emptyByCategory(): Record<TellCategory, { count: number; score: number }> {
  const obj = {} as Record<TellCategory, { count: number; score: number }>;
  for (const c of ALL_CATEGORIES) obj[c] = { count: 0, score: 0 };
  return obj;
}

/**
 * Verdict-drempels gekalibreerd tegen mens-baseline (Erik's eigen artikelen):
 *  - BB 2021 ("5 powermerken"): ~8 score/1k → TOP_TIER
 *  - BB 2020 ("Sales naar purpose"): ~16 score/1k (na softness-weighting) → HUMAN_BASELINE
 *  - Vanille Opus 4.7 + BVD: ~35-50 score/1k → AI_LEANING
 *  - Pure ChatGPT vanille: schat ~50-80 score/1k → PURE_AI
 */
function classifyVerdict(scorePer1000: number): AiTellResult['verdict'] {
  if (scorePer1000 < 12) return 'TOP_TIER';
  if (scorePer1000 < 30) return 'HUMAN_BASELINE';
  if (scorePer1000 < 50) return 'AI_LEANING';
  return 'PURE_AI';
}

/**
 * Linear position 0-100 op de schaal van pure mens (~0) tot pure AI (~100).
 * Anker-punten: 0 score/1k → 0, 100 score/1k → 100, lineaire schaal ertussen.
 * Gecapped op [0, 100].
 */
function computeHumanBaselinePosition(scorePer1000: number): number {
  return Math.max(0, Math.min(100, Math.round(scorePer1000)));
}

export function detectAiTells(text: string): AiTellResult {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const detected: DetectedTell[] = [];
  const byCategory = emptyByCategory();
  let score = 0;
  let totalMatches = 0;

  for (const def of TELL_DEFINITIONS) {
    const re = new RegExp(def.pattern.source, def.pattern.flags);
    const matches = Array.from(text.matchAll(re)).map((m) => m[0]);
    if (matches.length === 0) continue;

    const tellScore = tellWeight(def) * matches.length;
    score += tellScore;
    totalMatches += matches.length;
    byCategory[def.category].count += matches.length;
    byCategory[def.category].score += tellScore;

    detected.push({
      definition: def,
      matches,
      count: matches.length,
    });
  }

  // 2026-05-19: minimum-denominator floor (NORMALIZATION_FLOOR_WORDS=300) om
  // short-form content niet onevenredig te bestraffen. Een 200-woord LinkedIn-
  // post met 5 tells gaf voorheen scorePer1000=25 (HUMAN_BASELINE op het randje
  // van AI_LEANING). Met floor=300: (5/300)*1000=16.7 (gezond HUMAN_BASELINE).
  // Effect: false-positive AI_LEANING/PURE_AI verdict op short-form social
  // content vermindert. 300w = ~1.5× sweet-spot LinkedIn-post target;
  // long-form content (>300w) is onaangetast want max(wordCount, 300) = wordCount.
  const NORMALIZATION_FLOOR_WORDS = 300;
  const denom = Math.max(wordCount, NORMALIZATION_FLOOR_WORDS);
  const scorePer1000Words = denom > 0 ? (score / denom) * 1000 : 0;

  return {
    score,
    uniqueTellCount: detected.length,
    totalMatches,
    detected: detected.sort((a, b) => b.count * tellWeight(b.definition) - a.count * tellWeight(a.definition)),
    byCategory,
    wordCount,
    scorePer1000Words,
    verdict: classifyVerdict(scorePer1000Words),
    humanBaselinePosition: computeHumanBaselinePosition(scorePer1000Words),
  };
}

// ─── Reporter ─────────────────────────────────────────

/** Build a markdown report from detector result */
export function formatTellReport(result: AiTellResult, label?: string): string {
  const lines: string[] = [];
  lines.push(`# AI-Tell Detector Report${label ? ` — ${label}` : ''}`);
  lines.push('');
  lines.push(`- **Verdict**: ${result.verdict}`);
  lines.push(`- **Position on mens↔AI scale**: ${result.humanBaselinePosition} / 100 (0 = top mens, 50 = grens, 100 = pure AI)`);
  lines.push(`- **Score**: ${result.score.toFixed(1)} (${result.scorePer1000Words.toFixed(1)} per 1000 woorden)`);
  lines.push(`- **Unique tells**: ${result.uniqueTellCount} of ${TELL_DEFINITIONS.length}`);
  lines.push(`- **Total matches**: ${result.totalMatches}`);
  lines.push(`- **Word count**: ${result.wordCount}`);
  lines.push('');

  lines.push('## By category');
  lines.push('');
  lines.push('| Category | Matches | Score |');
  lines.push('|---|---|---|');
  for (const [cat, stats] of Object.entries(result.byCategory)) {
    if (stats.count === 0) continue;
    lines.push(`| ${cat} | ${stats.count} | ${stats.score} |`);
  }
  lines.push('');

  if (result.detected.length === 0) {
    lines.push('## Detected tells');
    lines.push('');
    lines.push('_No tells detected._');
    return lines.join('\n');
  }

  lines.push('## Detected tells (sorted by impact)');
  lines.push('');
  for (const d of result.detected) {
    lines.push(`### ${d.definition.id} (${d.definition.severity}, ${d.definition.category})`);
    lines.push(`${d.definition.description}`);
    lines.push(`**Hits**: ${d.count}`);
    const sample = d.matches.slice(0, 5);
    if (sample.length > 0) {
      lines.push('**Examples**:');
      for (const m of sample) lines.push(`- \`${m.slice(0, 120).replace(/\n/g, ' ')}\``);
      if (d.matches.length > 5) lines.push(`- _… and ${d.matches.length - 5} more_`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
