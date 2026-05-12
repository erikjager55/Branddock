#!/usr/bin/env tsx
/**
 * Position-swap calibration wrapper voor judge-LLM calls.
 * Sub-sprint #5.B chain-pattern anti-bias measures per plan §3.1.4.
 *
 * Probleem (uit externe research): LLM-as-judge heeft sterke biases:
 *   - **Position bias**: 1e optie krijgt vaak voorkeur (~60% van calls)
 *   - **Agreeableness bias**: judges keuren te makkelijk goed (TNR < 25%)
 *
 * Oplossing: roep judge 2× aan met geswapte order. Accepteer alleen
 * consistente vote. Twee-uitkomsten:
 *   - Beide rondes wijzen zelfde winner aan → trustworthy verdict
 *   - Rondes wijzen verschillende winners aan → "inconsistent" (mogelijk
 *     equivalent in kwaliteit, gebruik fallback-strategie)
 *
 * Te gebruiken als wrapper rond Promptfoo's `llm-rubric` of als
 * standalone tool voor A/B-tests tussen prompt-versies.
 *
 * Usage:
 *   import { positionSwappedJudge } from './position-swap-judge';
 *   const result = await positionSwappedJudge({
 *     candidateA: '...content A...',
 *     candidateB: '...content B...',
 *     rubric: 'Welke variant is meer engaging?',
 *     judgeModel: 'claude-haiku-4-5-20251001',
 *   });
 *   // result: { winner: 'A' | 'B' | 'inconsistent', confidence: number, rationales: [...] }
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Minimal interface voor de Anthropic-client-call. Hiermee kan een mock
 * worden geïnjecteerd in smoke-tests zonder de echte client te raken.
 */
export interface JudgeClient {
  call: (input: {
    system: string;
    userMessage: string;
    model: string;
    temperature: number;
  }) => Promise<{ text: string }>;
}

export interface PositionSwapInput {
  candidateA: string;
  candidateB: string;
  rubric: string;
  judgeModel?: string;
  /**
   * Optionele extra context-info doorgegeven aan judge (e.g. brief,
   * brand-voice baseline). Wordt in system-prompt geinjecteerd.
   */
  context?: string;
  /** Default 0.0 = deterministic judging. */
  temperature?: number;
  /**
   * Optionele client-override voor smoke-tests. Default = nieuwe Anthropic
   * SDK instance met ANTHROPIC_API_KEY uit env.
   */
  client?: JudgeClient;
}

export interface PositionSwapResult {
  /** 'A' / 'B' = consistent vote; 'inconsistent' = rondes-disagreement. */
  winner: 'A' | 'B' | 'inconsistent';
  /**
   * 1.0 = beide rondes wijzen zelfde winner; 0.0 = inconsistent (rondes
   * disagree). Bij inconsistent: equivalent-kwaliteit signaal.
   */
  confidence: number;
  /** Per-ronde data voor debug + telemetry. */
  rounds: Array<{
    /** Volgorde in deze ronde: 'AB' = A eerst, 'BA' = B eerst. */
    order: 'AB' | 'BA';
    /** Welke positie de judge koos: 'first' of 'second'. */
    pickedPosition: 'first' | 'second';
    /** Welke originele candidate dat was (A of B). */
    pickedCandidate: 'A' | 'B';
    /** 1-2 zin rationale van de judge. */
    rationale: string;
  }>;
}

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

const JUDGE_SYSTEM_PROMPT = `Je bent een onafhankelijke kwaliteitsjudger. Je beoordeelt twee content-varianten tegen een rubric en kiest een winnaar.

## REGELS

1. Lees BEIDE varianten volledig vóór je oordeel
2. Pas de rubric STRIKT toe — geen extra criteria
3. Bij gelijke kwaliteit: kies de eerste variant (default)
4. Geef 1-2 zin rationale die naar SPECIFIEKE textuele evidence verwijst

## OUTPUT FORMAT (strict JSON)

{
  "winner": "first" | "second",
  "rationale": "1-2 zin met citaat-evidence uit de gekozen variant"
}

Geen markdown, geen commentary, alleen JSON.`;

function buildJudgePrompt(
  firstCandidate: string,
  secondCandidate: string,
  rubric: string,
  context?: string,
): string {
  const lines: string[] = [];
  if (context) {
    lines.push('# Context');
    lines.push(context);
    lines.push('');
  }
  lines.push('# Rubric');
  lines.push(rubric);
  lines.push('');
  lines.push('# Variant 1 (first)');
  lines.push(firstCandidate);
  lines.push('');
  lines.push('# Variant 2 (second)');
  lines.push(secondCandidate);
  lines.push('');
  lines.push('Kies de winnaar volgens de rubric. Return JSON.');
  return lines.join('\n');
}

interface JudgeResponse {
  winner: 'first' | 'second';
  rationale: string;
}

async function runSingleJudgeCall(
  client: JudgeClient,
  firstCandidate: string,
  secondCandidate: string,
  rubric: string,
  context: string | undefined,
  model: string,
  temperature: number,
): Promise<JudgeResponse> {
  const { text } = await client.call({
    system: JUDGE_SYSTEM_PROMPT,
    userMessage: buildJudgePrompt(firstCandidate, secondCandidate, rubric, context),
    model,
    temperature,
  });
  let jsonText = text.trim();
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonText = jsonMatch[0];
  const parsed = JSON.parse(jsonText) as JudgeResponse;
  if (parsed.winner !== 'first' && parsed.winner !== 'second') {
    throw new Error(`Invalid judge response: winner = ${parsed.winner}`);
  }
  return parsed;
}

/**
 * Default Anthropic-client adapter. Lazy-instantiated zodat smoke-tests
 * geen API-key vereisen wanneer mock-client geïnjecteerd wordt.
 */
function createDefaultClient(): JudgeClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY required for position-swap judge');
  const anthropic = new Anthropic({ apiKey });
  return {
    call: async ({ system, userMessage, model, temperature }) => {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 500,
        temperature,
        system,
        messages: [{ role: 'user', content: userMessage }],
      });
      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('Judge returned non-text response');
      }
      return { text: textBlock.text };
    },
  };
}

/**
 * Run position-swap calibrated judge. Voert 2 rondes uit met geswapte
 * volgorde en aggregeert tot een consistent verdict.
 */
export async function positionSwappedJudge(
  input: PositionSwapInput,
): Promise<PositionSwapResult> {
  const client = input.client ?? createDefaultClient();
  const model = input.judgeModel ?? DEFAULT_MODEL;
  const temperature = input.temperature ?? 0.0;

  // Ronde 1: A first, B second
  const round1 = await runSingleJudgeCall(
    client,
    input.candidateA,
    input.candidateB,
    input.rubric,
    input.context,
    model,
    temperature,
  );

  // Ronde 2: B first, A second (positions swapped)
  const round2 = await runSingleJudgeCall(
    client,
    input.candidateB,
    input.candidateA,
    input.rubric,
    input.context,
    model,
    temperature,
  );

  // Translate round-2 result back to A/B labels (positions waren swapped)
  const round1PickedCandidate: 'A' | 'B' = round1.winner === 'first' ? 'A' : 'B';
  const round2PickedCandidate: 'A' | 'B' = round2.winner === 'first' ? 'B' : 'A';

  const consistent = round1PickedCandidate === round2PickedCandidate;
  const winner: 'A' | 'B' | 'inconsistent' = consistent
    ? round1PickedCandidate
    : 'inconsistent';
  const confidence = consistent ? 1.0 : 0.0;

  return {
    winner,
    confidence,
    rounds: [
      {
        order: 'AB',
        pickedPosition: round1.winner,
        pickedCandidate: round1PickedCandidate,
        rationale: round1.rationale,
      },
      {
        order: 'BA',
        pickedPosition: round2.winner,
        pickedCandidate: round2PickedCandidate,
        rationale: round2.rationale,
      },
    ],
  };
}

// ─── CLI mode ─────────────────────────────────────────────────

/**
 * CLI usage (voor A/B-tests tussen prompt-versies of variant-comparisons):
 *
 *   npx tsx scripts/eval/position-swap-judge.ts \
 *     --candidateA "content A..." \
 *     --candidateB "content B..." \
 *     --rubric "Welke is meer engaging?"
 *
 * Of via env-vars: CANDIDATE_A, CANDIDATE_B, RUBRIC.
 */
async function cli() {
  const args = process.argv.slice(2);
  function getArg(name: string): string | undefined {
    const idx = args.indexOf(`--${name}`);
    if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
    return process.env[name.toUpperCase().replace(/-/g, '_')];
  }
  const candidateA = getArg('candidateA') ?? getArg('candidate-a');
  const candidateB = getArg('candidateB') ?? getArg('candidate-b');
  const rubric = getArg('rubric');
  if (!candidateA || !candidateB || !rubric) {
    console.error('Required: --candidateA, --candidateB, --rubric (or env CANDIDATE_A/B + RUBRIC)');
    process.exit(1);
  }
  const result = await positionSwappedJudge({
    candidateA,
    candidateB,
    rubric,
    context: getArg('context'),
    judgeModel: getArg('model'),
  });
  console.log('\n=== Position-Swap Judge Result ===');
  console.log(`Winner: ${result.winner}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`\nRound 1 (${result.rounds[0].order}): picked ${result.rounds[0].pickedPosition} = ${result.rounds[0].pickedCandidate}`);
  console.log(`  Rationale: ${result.rounds[0].rationale}`);
  console.log(`\nRound 2 (${result.rounds[1].order}): picked ${result.rounds[1].pickedPosition} = ${result.rounds[1].pickedCandidate}`);
  console.log(`  Rationale: ${result.rounds[1].rationale}`);
}

// Run CLI als direct invoked, niet bij import.
if (import.meta.url === `file://${process.argv[1]}`) {
  cli().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
