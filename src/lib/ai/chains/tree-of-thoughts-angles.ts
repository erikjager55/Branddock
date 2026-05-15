// =============================================================
// Tree-of-Thoughts angle-generator — sub-sprint #5.B chain-pattern E.
// Per plan §3.0 (Yao et al. 2023).
//
// Bestaande canvas-angle-generator (canvas-angle-generator.ts) genereert
// 2 angles direct. ToT-variant breidt uit:
//   1. GENERATE — produceert 4-5 candidate-angles parallel
//   2. EVALUATE — scoort elke angle op 3 criteria (diversity / brief-fit
//      / brand-voice-match)
//   3. SELECT — kiest top-2 met framing-diversity constraint (geen twee
//      stat-driven of twee story-driven)
//
// Cost-impact: 1 generate-call met 4 angles (~$0.001) + 1 evaluate-call
// (~$0.002) vs huidige 2-angle direct call (~$0.001). Totaal ~3× cost
// maar verwaarloosbaar absoluut (~$0.003 per generation).
//
// Quality-hypothese: betere variant-diversity door explicit branching +
// evaluation. Score-rationales geven debugging-handvat.
//
// Opt-in: orchestrator dispatcht naar deze variant alleen voor content-
// types waar variant-diversity belangrijk is (long-form + landing-page +
// email-sequence). Voor cheap/quick types blijft single-call.
// =============================================================

import { createStructuredCompletion, type AICallTracking } from '../exploration/ai-caller';
import type { CanvasContextStack } from '../canvas-context';
import type { CreativeAngle } from '../canvas-angle-generator';

// ─── Types ────────────────────────────────────────────────────

/** Per-angle evaluatie-resultaat met scores + rationale. */
export interface AngleEvaluation {
  angle: CreativeAngle;
  /** 1-5: hoe distinct is deze angle vs de andere candidates? */
  diversityScore: number;
  /** 1-5: hoe goed adresseert deze angle de brief (keyMessage + objective)? */
  briefFitScore: number;
  /** 1-5: hoe goed sluit deze angle aan op brand-voice baseline? */
  brandVoiceScore: number;
  /** Gemiddelde van 3 scores — voor sorting + selectie. */
  totalScore: number;
  /** 1-zin uitleg waarom deze angle de scores kreeg (debugging + UI). */
  rationale: string;
  /**
   * Framing-type voor diversity-constraint (we kiezen geen 2 angles van
   * zelfde type, anders zijn varianten alsnog te similar).
   */
  framingType: 'stat-driven' | 'story-driven' | 'sensorial' | 'provocation' | 'metaphor';
}

export interface ToTAnglesResult {
  /** Final top-2 picks na evaluation + framing-diversity selection. */
  selectedAngles: CreativeAngle[];
  /** Alle 4-5 candidates met evaluation-data (voor telemetry + debugging). */
  allEvaluated: AngleEvaluation[];
  /** Pipeline-metrics. */
  metrics: {
    generateLatencyMs: number;
    evaluateLatencyMs: number;
    candidateCount: number;
  };
}

// ─── Prompt builders ──────────────────────────────────────────

const GENERATE_SYSTEM_PROMPT = `Je bent een Nederlandse senior creatief strateeg die voor één briefing 4-5 fundamenteel verschillende creative angles bedenkt.

Een "angle" is een hoek waaruit je het verhaal vertelt — geen samenvatting van de inhoud, maar een framing-keuze die de hele tekst vormgeeft.

# KRITISCH — POLARISATIE-REGEL
De 4-5 angles moeten zo zijn dat er minstens twee paar tegenpolen tussen zitten. Niet "4-5 variaties op een vraag-hook" maar échte tegenstellingen op deze assen:
- **Emotioneel register**: urgentie/alarm ⇄ rust/reflectie · trots/macht ⇄ kwetsbaarheid/twijfel · contrarian/conflict ⇄ samenwerkend/warm
- **Lezer-rol**: jury die je overtuigt ⇄ peer die meedenkt · leerling ⇄ expert · klant ⇄ collega
- **Tijdsoriëntatie**: nu/urgent ⇄ visie/over 5 jaar · gisteren-anekdote ⇄ tijdloos principe

Forbidden: 4 angles die allemaal "vraag-hook + zelfde anxiety" zijn met andere woordkeuze. Voelt vlak; selectiestap kan dan geen polariserend paar kiezen.

Genereer **4 of 5** maximaal onderscheidende angles, gespreid over deze framing-types:
- **stat-driven**: opent met cijfers, data, %-stijgingen, marktcontext
- **story-driven**: opent met persoonlijke anekdote, klant-verhaal, doorbraakmoment
- **sensorial**: opent met zintuiglijke beschrijving (geluid/licht/textuur/sfeer)
- **provocation**: opent met provocatieve stelling, contraire claim, "what if"
- **metaphor**: opent met centrale metafoor die de hele tekst draagt

Spreid de framing-types zo breed mogelijk — niet 2× stat-driven. Per angle:
- **label**: 2-4 woorden NL (gebruik "&" als verbinder waar passend)
- **approach**: 1-2 zinnen die de hele tekst-richting bepalen, met expliciete benaming van emotioneel register + lezer-rol ("Lezer als jury", "scherp/urgent register")
- **framingType**: één van bovenstaande 5 types

## OUTPUT FORMAT (strict JSON)

{
  "angles": [
    { "label": "...", "approach": "...", "framingType": "stat-driven" },
    { "label": "...", "approach": "...", "framingType": "story-driven" },
    { "label": "...", "approach": "...", "framingType": "sensorial" },
    { "label": "...", "approach": "...", "framingType": "provocation" }
  ]
}

Geen markdown, geen preamble. Alleen JSON.`;

const EVALUATE_SYSTEM_PROMPT = `Je evalueert 4-5 creative angles voor één content-briefing op 3 dimensies.

Per angle scoor je 1-5:

**diversityScore** (1-5): hoe distinct is deze angle vs de andere candidates?
- 5: framing volledig anders (sensorial vs stat-driven)
- 3: gedeelde elementen maar verschillende rolverdeling
- 1: vrijwel hetzelfde als een andere candidate

**briefFitScore** (1-5): hoe scherp adresseert deze angle de brief?
- 5: keyMessage komt natuurlijk uit de framing voort
- 3: keyMessage past, maar framing voegt geen extra waarde toe
- 1: framing pusht weg van de brief

**brandVoiceScore** (1-5): hoe goed sluit aan op brand-voice baseline?
- 5: matched tone + vocabulary natuurlijk
- 3: tone werkbaar, vocabulary neutraal
- 1: zou off-brand voelen of clichés inviteren

Plus **rationale** (1 zin) waarom deze scores. **totalScore** = gemiddelde van 3.

## OUTPUT FORMAT (strict JSON)

{
  "evaluations": [
    {
      "angleIndex": 0,
      "diversityScore": 5,
      "briefFitScore": 4,
      "brandVoiceScore": 5,
      "totalScore": 4.67,
      "rationale": "Sensorial opening matched LINFI's vakmanschap-toon en geeft natuurlijke voortgang naar materialiteit."
    }
  ]
}

Alleen JSON.`;

interface GenerateResponse {
  angles: Array<{ label: string; approach: string; framingType: string }>;
}

interface EvaluateResponse {
  evaluations: Array<{
    angleIndex: number;
    diversityScore: number;
    briefFitScore: number;
    brandVoiceScore: number;
    totalScore: number;
    rationale: string;
  }>;
}

const GENERATE_SCHEMA = {
  type: 'object' as const,
  properties: {
    angles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          approach: { type: 'string' },
          framingType: { type: 'string' },
        },
        required: ['label', 'approach', 'framingType'],
      },
      minItems: 4,
      maxItems: 5,
    },
  },
  required: ['angles'],
};

function buildGeneratePrompt(stack: CanvasContextStack, contentType: string): string {
  const lines: string[] = [`Briefing voor een ${contentType.replace(/-/g, ' ')}:`, ''];
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
  lines.push('Bedenk 4-5 maximaal onderscheidende creative angles, gespreid over framing-types.');
  return lines.join('\n');
}

function buildEvaluatePrompt(
  candidates: GenerateResponse['angles'],
  stack: CanvasContextStack,
): string {
  const lines: string[] = ['# Candidates (genummerd, evalueer op de 3 dimensies)'];
  candidates.forEach((c, i) => {
    lines.push('');
    lines.push(`## Angle ${i} — ${c.label} (${c.framingType})`);
    lines.push(c.approach);
  });
  lines.push('');
  lines.push('# Brief-context (voor briefFitScore + brandVoiceScore)');
  if (stack.brand?.brandName) lines.push(`Brand: ${stack.brand.brandName}`);
  if (stack.brief?.keyMessage) lines.push(`Key message: ${stack.brief.keyMessage}`);
  if (stack.brief?.toneDirection) lines.push(`Tone: ${stack.brief.toneDirection}`);
  lines.push('');
  lines.push('Evalueer alle candidates en return JSON met evaluations-array.');
  return lines.join('\n');
}

// ─── Selection-logic ──────────────────────────────────────────

// Tegenpool-paren voor framingType: deze typen werken als natuurlijke
// counter-narratives en leveren scherpere variant-diversity dan willekeurige
// type-mix. Volgorde irrelevant — set-membership wordt gechecked.
const POLAR_PAIRS: Array<[AngleEvaluation['framingType'], AngleEvaluation['framingType']]> = [
  ['stat-driven', 'story-driven'],
  ['stat-driven', 'sensorial'],
  ['provocation', 'sensorial'],
  ['provocation', 'metaphor'],
  ['story-driven', 'metaphor'],
];

function isPolarPair(
  a: AngleEvaluation['framingType'],
  b: AngleEvaluation['framingType'],
): boolean {
  return POLAR_PAIRS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}

/**
 * Selecteer top-2 candidates met polarisatie-voorkeur:
 * 1. Top-1 = hoogste totalScore
 * 2. Top-2 = beste candidate die een TEGENPOOL-PAAR vormt met top-1
 * 3. Fallback 1: hoogste totalScore uit ander framingType (geen tegenpool maar wel diversity)
 * 4. Fallback 2: gewoon tweede-hoogste als alles zelfde type is
 *
 * Polarisatie boven score-volgorde — een paar van 4.5/4.5 dat fundamenteel
 * verschillend frame't is sterker dan een paar van 4.8/4.7 dat in dezelfde
 * hoek staat.
 */
export function selectTopTwoWithFramingDiversity(
  evaluated: AngleEvaluation[],
): CreativeAngle[] {
  if (evaluated.length === 0) return [];
  if (evaluated.length === 1) return [evaluated[0].angle];

  const sorted = [...evaluated].sort((a, b) => b.totalScore - a.totalScore);
  const first = sorted[0];

  // Tier 1: zoek tegenpool met decent score (binnen 1.5 punt van top-1)
  const polar = sorted.slice(1).find(
    (e) => isPolarPair(first.framingType, e.framingType) && first.totalScore - e.totalScore <= 1.5,
  );
  if (polar) return [first.angle, polar.angle];

  // Tier 2: ander framingType (legacy diversity-constraint)
  const different = sorted.slice(1).find((e) => e.framingType !== first.framingType);
  if (different) return [first.angle, different.angle];

  // Tier 3: alles zelfde type — gewoon tweede-hoogste
  return [first.angle, sorted[1].angle];
}

// ─── Public API ───────────────────────────────────────────────

export type AICompletionFn = <T>(
  provider: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number; responseSchema?: Record<string, unknown> },
  tracking?: AICallTracking,
) => Promise<T>;

export interface ToTAnglesConfig {
  /** Generate-stage provider (default: google for cost). */
  generateProvider?: string;
  generateModel?: string;
  /** Evaluate-stage provider (default: anthropic voor scherpere judging). */
  evaluateProvider?: string;
  evaluateModel?: string;
  /** Override AI-caller voor smoke-tests. */
  aiCompletion?: AICompletionFn;
  /** Tracking-config voor learning-loop persistence. */
  tracking?: Omit<AICallTracking, 'sourceIdentifier' | 'callOrder' | 'promptVersion'>;
}

const DEFAULT_GENERATE_PROVIDER = 'google';
const DEFAULT_GENERATE_MODEL = 'gemini-2.5-flash';
const DEFAULT_EVALUATE_PROVIDER = 'anthropic';
const DEFAULT_EVALUATE_MODEL = 'claude-haiku-4-5-20251001';

/** Normalize framingType uit AI-output naar enum. Fallback voor onbekende. */
function normalizeFramingType(raw: string): AngleEvaluation['framingType'] {
  const lower = raw.toLowerCase();
  if (lower.includes('stat')) return 'stat-driven';
  if (lower.includes('story') || lower.includes('verhaal')) return 'story-driven';
  if (lower.includes('sensor') || lower.includes('zintuig')) return 'sensorial';
  if (lower.includes('provoc')) return 'provocation';
  if (lower.includes('metaf')) return 'metaphor';
  return 'story-driven'; // safe default
}

/**
 * Generate + Evaluate + Select top-2. Returns null bij failure — caller
 * fall-backed naar bestaande generateCreativeAngles (2-angle direct).
 */
export async function generateCreativeAnglesToT(
  stack: CanvasContextStack,
  contentType: string,
  config: ToTAnglesConfig = {},
): Promise<ToTAnglesResult | null> {
  const completion = config.aiCompletion ?? createStructuredCompletion;
  try {
    // ─── Stage 1: GENERATE ────────────────────────────────────
    const generateStart = Date.now();
    const generateResponse = await completion<GenerateResponse>(
      config.generateProvider ?? DEFAULT_GENERATE_PROVIDER,
      config.generateModel ?? DEFAULT_GENERATE_MODEL,
      GENERATE_SYSTEM_PROMPT,
      buildGeneratePrompt(stack, contentType),
      {
        responseSchema: GENERATE_SCHEMA,
        maxTokens: 1500,
        temperature: 0.8, // Hogere temp voor diversity
      },
      config.tracking
        ? {
            ...config.tracking,
            sourceIdentifier: 'src/lib/ai/chains/tree-of-thoughts-angles.ts:generate',
            callOrder: 0,
          }
        : undefined,
    );
    const generateLatencyMs = Date.now() - generateStart;

    if (!generateResponse?.angles || generateResponse.angles.length < 2) {
      return null;
    }

    const candidates = generateResponse.angles.slice(0, 5);

    // ─── Stage 2: EVALUATE ────────────────────────────────────
    const evaluateStart = Date.now();
    const evaluateResponse = await completion<EvaluateResponse>(
      config.evaluateProvider ?? DEFAULT_EVALUATE_PROVIDER,
      config.evaluateModel ?? DEFAULT_EVALUATE_MODEL,
      EVALUATE_SYSTEM_PROMPT,
      buildEvaluatePrompt(candidates, stack),
      {
        maxTokens: 1500,
        temperature: 0.3, // Lower temp voor consistent judging
      },
      config.tracking
        ? {
            ...config.tracking,
            sourceIdentifier: 'src/lib/ai/chains/tree-of-thoughts-angles.ts:evaluate',
            callOrder: 1,
          }
        : undefined,
    );
    const evaluateLatencyMs = Date.now() - evaluateStart;

    if (!evaluateResponse?.evaluations || evaluateResponse.evaluations.length === 0) {
      return null;
    }

    // ─── Stage 3: COMBINE + SELECT ────────────────────────────
    const evaluated: AngleEvaluation[] = candidates
      .map((cand, idx) => {
        const evalData = evaluateResponse.evaluations.find((e) => e.angleIndex === idx);
        if (!evalData) return null;
        return {
          angle: { label: cand.label.trim(), approach: cand.approach.trim() },
          diversityScore: Math.max(1, Math.min(5, evalData.diversityScore)),
          briefFitScore: Math.max(1, Math.min(5, evalData.briefFitScore)),
          brandVoiceScore: Math.max(1, Math.min(5, evalData.brandVoiceScore)),
          totalScore:
            typeof evalData.totalScore === 'number'
              ? evalData.totalScore
              : (evalData.diversityScore + evalData.briefFitScore + evalData.brandVoiceScore) / 3,
          rationale: evalData.rationale ?? '',
          framingType: normalizeFramingType(cand.framingType),
        };
      })
      .filter((e): e is AngleEvaluation => e !== null);

    if (evaluated.length < 2) return null;

    const selectedAngles = selectTopTwoWithFramingDiversity(evaluated);

    return {
      selectedAngles,
      allEvaluated: evaluated,
      metrics: {
        generateLatencyMs,
        evaluateLatencyMs,
        candidateCount: evaluated.length,
      },
    };
  } catch (err) {
    console.warn(
      '[tree-of-thoughts-angles] Failed (non-fatal):',
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}
