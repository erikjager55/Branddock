/**
 * GEO/SEO Fase 3 — deterministische, judge-vrije GEO-fidelity-scorer.
 *
 * Meet hoe goed gegenereerde long-form-content "citeerbaar" is voor AI-answer-
 * engines, langs vijf signalen die 1-op-1 de buildGeoDirective()-principes
 * spiegelen: answer-first, atomic chunking, cited-stats, entity-clarity en
 * structurele cues (TL;DR / vraag-koppen / lijsten). Volledig in-process
 * (sub-milliseconde, geen LLM) zodat hij compute-gated als 4e F-VAL-pijler kan
 * draaien zonder kosten of judge-afhankelijkheid.
 *
 * Pure functie — geen DB/AI. Heuristisch maar deterministisch + reproduceerbaar.
 */

export interface GeoSignalScores {
  /** Eerste alinea beantwoordt direct + bondig (0-100). */
  answerFirst: number;
  /** Aandeel alinea's in citeerbare brokken van 2-4 zinnen (0-100). */
  atomicChunking: number;
  /** Cijfers/feiten met een bron-cue in de buurt (0-100). */
  citedStats: number;
  /** Lage dichtheid vage voornaamwoorden aan zinsbegin (0-100). */
  entityClarity: number;
  /** Aanwezigheid van TL;DR / vraag-koppen / lijsten (0-100). */
  structuredCues: number;
}

export interface GeoScoreResult {
  /** Gewogen composiet 0-100. */
  score: number;
  signals: GeoSignalScores;
  /** Mensleesbare zwakke punten (signaal < 60). */
  findings: string[];
}

export const GEO_SCORER_VERSION = 'geo-fidelity-v1.0';

const SIGNAL_WEIGHTS: Record<keyof GeoSignalScores, number> = {
  answerFirst: 0.25,
  atomicChunking: 0.2,
  citedStats: 0.2,
  entityClarity: 0.2,
  structuredCues: 0.15,
};

/** Vage voornaamwoorden (NL + EN) die entity-clarity ondermijnen aan zinsbegin.
 *  Veel hiervan (het/die/dat/deze/this/that) zijn óók lidwoord/aanwijzend
 *  voornaamwoord ("Het platform analyseert..."); daarom telt scoreEntityClarity
 *  een opener alleen als vaag wanneer er een werkwoord/hulpwerkwoord op volgt
 *  (pronoun-gebruik: "Het is...", "Dit zorgt..."). */
const VAGUE_OPENERS = new Set([
  'dit', 'dat', 'deze', 'die', 'het', 'ze', 'hij', 'zij', 'hun', 'hen',
  'this', 'that', 'these', 'those', 'it', 'they', 'them', 'their',
]);

/** Werkwoord/hulpwerkwoord-cues (NL + EN): als een vage opener hierdoor wordt
 *  gevolgd, is het pronoun-gebruik (vaag) i.p.v. lidwoord (legitiem). */
const VERB_CUES = new Set([
  'is', 'was', 'zijn', 'wordt', 'werd', 'worden', 'heeft', 'hebben', 'had', 'kan', 'kon',
  'moet', 'moest', 'gaat', 'ging', 'zorgt', 'maakt', 'betekent', 'geeft', 'blijft', 'lijkt',
  'are', 'were', 'has', 'have', 'can', 'will', 'makes', 'means', 'provides', 'gives',
  'remains', 'shows', 'helps', 'lets', 'allows', 'ensures',
]);

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

function splitParagraphs(text: string): string[] {
  // Alinea = blank-line-gescheiden blok. NIET op elke enkele \n splitsen, anders
  // worden hard-wrapped regels/koppen elk een "alinea" en scheef je atomicChunking.
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

/** Answer-first: de eerste alinea is bondig (≤55 woorden) + de eerste zin ≤25 woorden. */
function scoreAnswerFirst(paragraphs: string[]): number {
  if (paragraphs.length === 0) return 0;
  const first = paragraphs[0];
  const words = first.split(/\s+/).filter(Boolean).length;
  const firstSentenceWords = (splitSentences(first)[0] ?? first).split(/\s+/).filter(Boolean).length;
  const lengthScore = words <= 55 ? 100 : Math.max(0, 100 - (words - 55) * 2);
  const leadScore = firstSentenceWords <= 25 ? 100 : Math.max(0, 100 - (firstSentenceWords - 25) * 4);
  return clamp(lengthScore * 0.6 + leadScore * 0.4);
}

/** Atomic chunking: aandeel alinea's met 1-4 zinnen; muren (>5 zinnen) tellen niet mee. */
function scoreAtomicChunking(paragraphs: string[]): number {
  const bodies = paragraphs.filter((p) => p.split(/\s+/).filter(Boolean).length >= 8);
  if (bodies.length === 0) return paragraphs.length > 0 ? 70 : 0;
  const ok = bodies.filter((p) => {
    const n = splitSentences(p).length;
    return n >= 1 && n <= 4;
  }).length;
  return clamp((ok / bodies.length) * 100);
}

/** Cited-stats: cijfers met een ECHTE bron-cue in dezelfde zin. Een kaal getal
 *  of percentage telt NIET als geciteerd (dat is juist de ongefundeerde-claim-
 *  anti-pattern). Geldige cues: een bronwoord (bron/volgens/according to/source),
 *  een eigennaam+jaartal ("Gartner 2026"), of een parenthetische attributie
 *  ("(McKinsey, 2025)"). Hoofdletter-detectie is bewust case-sensitive. */
function scoreCitedStats(sentences: string[]): number {
  const SOURCE_WORD = /\b(bron|volgens|according to|source|gerapporteerd door|reported by)\b/i;
  // Eigennaam (Hoofdletter) gevolgd door jaartal, of een parenthetische attributie.
  const ATTRIBUTED = /\b[A-Z][A-Za-z&.]+(?:\s+[A-Za-z&.]+)?\s*,?\s*(?:19|20)\d{2}\b|\([A-Z][^)]{0,40}\)/;
  const STAT = /\d/;
  const statSentences = sentences.filter((s) => STAT.test(s));
  if (statSentences.length === 0) return 40; // geen stats → neutraal-laag, niet gestraft als 0
  const cited = statSentences.filter((s) => SOURCE_WORD.test(s) || ATTRIBUTED.test(s)).length;
  return clamp((cited / statSentences.length) * 100);
}

/** Entity-clarity: straf zinnen die met een vaag VOORNAAMWOORD beginnen — d.w.z.
 *  een vage opener gevolgd door een werkwoord ("Het is...", "Dit zorgt...") of een
 *  heel korte zin. Lidwoord-gebruik ("Het platform analyseert...") wordt NIET
 *  gestraft, zodat correct Nederlands proza niet ten onrechte zakt. */
function scoreEntityClarity(sentences: string[]): number {
  if (sentences.length === 0) return 0;
  const vague = sentences.filter((s) => {
    const words = s.split(/\s+/);
    const firstWord = words[0]?.toLowerCase().replace(/[^a-zà-ÿ]/g, '') ?? '';
    if (!VAGUE_OPENERS.has(firstWord)) return false;
    const secondWord = words[1]?.toLowerCase().replace(/[^a-zà-ÿ]/g, '') ?? '';
    return VERB_CUES.has(secondWord) || words.length <= 4;
  }).length;
  return clamp(100 - (vague / sentences.length) * 200);
}

/** Structurele cues: TL;DR, vraag-koppen (?), en lijst-markers. */
function scoreStructuredCues(text: string, paragraphs: string[]): number {
  const hasTldr = /\b(tl;?dr|samenvatting|key takeaways|kernpunten)\b/i.test(text);
  const hasQuestion = paragraphs.some((p) => p.length <= 120 && p.trimEnd().endsWith('?'));
  const hasList = paragraphs.some((p) => /^\s*([-*•]|\d+[.)])\s+/.test(p));
  const present = [hasTldr, hasQuestion, hasList].filter(Boolean).length;
  return clamp((present / 3) * 100);
}

/**
 * Bereken de deterministische GEO-citeerbaarheidsscore voor één stuk tekst.
 * De caller (composition-engine) draait dit ALLEEN wanneer het GEO-doel actief
 * is (compute-gating). Lege input → score 0.
 */
export function computeGeoScore(contentText: string): GeoScoreResult {
  const text = (contentText ?? '').trim();
  if (!text) {
    const zero: GeoSignalScores = { answerFirst: 0, atomicChunking: 0, citedStats: 0, entityClarity: 0, structuredCues: 0 };
    return { score: 0, signals: zero, findings: ['Lege content — geen GEO-signalen meetbaar.'] };
  }

  const paragraphs = splitParagraphs(text);
  const sentences = splitSentences(text);

  const signals: GeoSignalScores = {
    answerFirst: scoreAnswerFirst(paragraphs),
    atomicChunking: scoreAtomicChunking(paragraphs),
    citedStats: scoreCitedStats(sentences),
    entityClarity: scoreEntityClarity(sentences),
    structuredCues: scoreStructuredCues(text, paragraphs),
  };

  const score = clamp(
    (Object.keys(signals) as (keyof GeoSignalScores)[]).reduce(
      (sum, k) => sum + signals[k] * SIGNAL_WEIGHTS[k],
      0,
    ),
  );

  const LABELS: Record<keyof GeoSignalScores, string> = {
    answerFirst: 'Answer-first: begin met een bondig, zelfstandig antwoord (≤55 woorden).',
    atomicChunking: 'Atomic chunking: splits muren van tekst in brokken van 2-4 zinnen.',
    citedStats: 'Cited-stats: voorzie cijfers van een expliciete bron in dezelfde zin.',
    entityClarity: 'Entity-clarity: vermijd vage voornaamwoorden ("dit"/"het") aan zinsbegin.',
    structuredCues: 'Structurele cues: voeg een TL;DR, vraag-koppen en/of lijsten toe.',
  };
  const findings = (Object.keys(signals) as (keyof GeoSignalScores)[])
    .filter((k) => signals[k] < 60)
    .map((k) => LABELS[k]);

  return { score, signals, findings };
}
