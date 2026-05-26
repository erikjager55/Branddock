// =============================================================
// Model + workflow comparison experiment — 2026-05-13
//
// Goal: validate Opus 4.7 + thinking is the best model for brand-
// voice-matched content generation; evaluate 3 alternative workflows
// for shorter/cheaper paths to similar quality.
//
// Approach:
//   - Hardcoded Napking brand-voice fingerprint (real data from DB
//     2026-05-13) + a representative blog-post brief.
//   - Build system-prompt mirroring canvas-orchestrator structure
//     (BVD + self-check + brand-context). Same prompt for all
//     conditions; only model + workflow varies.
//   - 7 conditions; for each capture: output text, wall-clock latency,
//     token-usage (when SDK exposes), estimated cost.
//   - Single batch-judge call (Sonnet 4.6) scores all outputs on
//     0-100 brand-voice-match across 3 dimensions (style, essence,
//     rules). Composite weighted average per F-VAL spec
//     (35% / 45% / 20%).
//   - Output: docs/experiments/2026-05-13-model-comparison-report.md
// =============================================================

import { config as loadEnv } from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local') });

// ─── Fixture: Napking brand-voice fingerprint ─────────────
const BRAND_NAME = 'Napking';
const CONTENT_LANGUAGE = 'nl';
const VOICE_DESCRIPTION = `Napking speaks with practical confidence and no-nonsense clarity. The voice is direct, service-oriented, and reassuring—emphasizing reliability through concrete details (HACCP, 280+ restaurants, exact delivery schedules) rather than abstract promises. It uses the informal Dutch 'je/jij' consistently, creating approachable professionalism. Sentences are short and declarative. The brand leans on sensory precision ('vlekkeloos,' 'kraakhelder,' 'smetteloos') and operational transparency to build trust. Sustainability is presented as embedded practice, not virtue signaling. The tone is helpful without being chatty, confident without being boastful.`;

const WORDS_WE_USE = ['vlekkeloos','smetteloos','kraakhelder','onberispelijk','omkijken','scherp','flexibel','afkeur','rejects','poule','voorraad','beheren','afleveren','retour','abonnement','uitblinken','streven','zorgeloos','transparant','eindverantwoordelijk'];
const WORDS_WE_AVOID = ['revolutionair','innovatief','toonaangevend','excellent','premium','luxe','passie','gedreven','uniek','exclusief','state-of-the-art','cutting-edge','game-changer'];
const ANTI_PATTERNS = ['Ontdek de magie van','Jouw ultieme oplossing voor','Wij gaan voor excellentie','Passie voor perfectie','Innovatieve textieloplossingen','Til je restaurant naar een hoger niveau','De nummer 1 in','Exclusieve service','Onze missie is om te inspireren','Game-changing textiel','Premium kwaliteit voor de veeleisende professional','Laat ons je verrassen'];

const WRITING_SAMPLES = [
  `Heb ik wel genoeg textiel op voorraad? Is er voldoende kokskleding? Bij Napking heb je hier geen omkijken naar. Wij zijn dé flexibele partner voor horecatextiel in de Randstad. Wij doen het textielbeheer en de reiniging voor meer dan 280 restaurants in de regio. Bij ons kun je rekenen op vlekkeloze servetten, kraakheldere tafellakens, schone koksjassen, frisse theedoeken en onberispelijke kleding voor de bediening. Wij leveren je het juiste textiel op de juiste plek en op het juiste moment.`,
  `Vlekkeloos (samen)werken – dat is ons streven. Sinds 2010 bieden wij smetteloos linnen voor restaurants in de Randstad en daarbuiten. We reinigen, verhuren, beheren en verkopen horecatextiel voor restaurants die hun focus liever leggen op waar zij goed in zijn: gerechten bereiden en gasten een mooie beleving bezorgen. Ondertussen doen wij waar wij in uitblinken: jou vlekkeloos textiel leveren. Precies op het moment dat jij het nodig hebt.`,
  `Nee. Wij werken met een uniek abonnementsysteem: wat je als vuile was inlevert, sturen wij een week later schoon retour. Je hoeft dus geen bestellingen te plaatsen. Met dit systeem blijft je voorraad goed op peil. Heb je tijdelijk meer of minder nodig? Geen probleem, dan passen we het abonnement snel aan.`,
];

const BRIEF = {
  title: 'Hoe wij ervoor zorgen dat jouw restaurant geen omkijken meer heeft naar horecatextiel',
  keyMessage: 'Met Napking heb je geen omkijken meer naar je textiel: je krijgt vlekkeloos linnen op het moment dat het nodig is, beheerd via een flexibel abonnementsysteem.',
  audience: 'Restauranthouders in de Randstad die hun aandacht liever bij hun gasten en gerechten leggen dan bij textielbeheer.',
  goal: 'Vertrouwen wekken in Napking als operationele partner — concrete details over hoe het systeem werkt, niet abstracte beloftes.',
  wordCount: '300-400 woorden body section (geen titel of CTA, alleen body).',
};

// ─── Prompt builder (mirrors canvas-orchestrator F21 + F22 structure) ──
function buildSystemPrompt(): string {
  const voiceguideBlock = [
    `Voice: ${VOICE_DESCRIPTION}`,
    `Words we use: ${WORDS_WE_USE.join(', ')}`,
    `Words we avoid: ${WORDS_WE_AVOID.join(', ')}`,
    `Anti-patterns (never write): ${ANTI_PATTERNS.join(', ')}`,
    `Writing samples — match THIS voice-fingerprint exactly (woordkeuze, ritme, openingsstijl, zinsstructuur): ${WRITING_SAMPLES.map((s, i) => `[${i + 1}] "${s}"`).join(' ')}`,
  ].join('. ');

  return [
    '## BRAND VOICE DIRECTIVE — NON-NEGOTIABLE',
    'All content MUST conform to these rules. They override any conflicting generic advice.',
    '',
    `**Language**: Write ALL content in Nederlands. Every word, heading, hashtag, and CTA — no exceptions.`,
    '',
    '**VOICE FINGERPRINT — MUST MATCH BEFORE OUTPUT**:',
    voiceguideBlock,
    '',
    `**Brand name**: Use "${BRAND_NAME}" (not "we" or "our company") when referring to the brand. Ensure the brand name appears naturally in the content.`,
    '',
    'Apply this voice identity WITHIN the structural methodology specified below.',
    '',
    '## Brand Context',
    `**Brand Name:** ${BRAND_NAME}`,
    '',
    '## Brief',
    `**Title**: ${BRIEF.title}`,
    `**Key message**: ${BRIEF.keyMessage}`,
    `**Audience**: ${BRIEF.audience}`,
    `**Goal**: ${BRIEF.goal}`,
    `**Format**: ${BRIEF.wordCount}`,
    '',
    '## SELF-CHECK BEFORE RESPONDING — PERFORM MENTALLY, REVISE INLINE IF NEEDED',
    '1. **Voice-fingerprint match**: Komt het ritme + openingsstijl overeen met Writing sample [1] uit de Voice Fingerprint? Zo nee → herschrijf de eerste alinea.',
    '2. **Words we use frequency**: Verschijnen tenminste 2 termen uit "Words we use" per alinea?',
    '3. **Geen verboden termen**: Komen er termen uit "Words we avoid" of "Anti-patterns" voor?',
    `4. **Brand-naam aanwezig**: Komt "${BRAND_NAME}" expliciet voor in de hoofdtekst?`,
    '5. **AI-clichés geschrapt**: Geen "in de wereld van vandaag", "het is belangrijk om", etc.',
    '',
    'Als één van bovenstaande checks zou falen, herschrijf VOORDAT je antwoordt.',
  ].join('\n');
}

const USER_PROMPT = `Schrijf nu de body section van de blog-post volgens bovenstaande brief. Alleen de body (geen titel, geen CTA). 300-400 woorden, opgedeeld in 3-5 alinea's. Output alleen de body-tekst.`;

const SYSTEM_PROMPT = buildSystemPrompt();

// ─── Cost-estimate per provider (USD per 1M tokens, public 2026-Q1 prices) ──
// Approximate; real-time invoicing may differ.
const COST_PER_M_INPUT: Record<string, number> = {
  'claude-opus-4-7': 15.0,
  'claude-sonnet-4-6': 3.0,
  'claude-haiku-4-5-20251001': 1.0,
  'gpt-5.4': 5.0,
  'gpt-5.4-mini': 0.6,
  'gemini-3.1-pro-preview': 3.5,
  'gemini-3-flash-preview': 0.3,
};
const COST_PER_M_OUTPUT: Record<string, number> = {
  'claude-opus-4-7': 75.0,
  'claude-sonnet-4-6': 15.0,
  'claude-haiku-4-5-20251001': 5.0,
  'gpt-5.4': 15.0,
  'gpt-5.4-mini': 2.4,
  'gemini-3.1-pro-preview': 10.5,
  'gemini-3-flash-preview': 2.5,
};

interface RunResult {
  conditionId: string;
  label: string;
  model: string;
  approach: string;
  output: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  error?: string;
}

// ─── Provider clients (lazy init) ─────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── Helpers per provider ─────────────────────────────────
async function callAnthropic(model: string, withThinking: boolean): Promise<{ text: string; in: number; out: number }> {
  // F27: Opus 4.7+ vereist nieuwe thinking-API (adaptive + output_config.effort).
  // Sonnet 4.6 + 4.5 + Opus 4.5/4.6 ondersteunen nog legacy (type: 'enabled').
  const isOpus47Plus = /opus-4-7|opus-4-8|opus-5/.test(model);
  let params: unknown;
  if (withThinking && isOpus47Plus) {
    params = {
      model,
      max_tokens: 4096 + 4000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: USER_PROMPT }],
    };
  } else if (withThinking) {
    params = {
      model,
      max_tokens: 4096 + 4000,
      thinking: { type: 'enabled', budget_tokens: 4000 },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: USER_PROMPT }],
    };
  } else {
    params = {
      model,
      max_tokens: 4096,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: USER_PROMPT }],
    };
  }
  const res = await anthropic.messages.create(params as Anthropic.Messages.MessageCreateParamsNonStreaming);
  const textBlock = res.content.find((b) => b.type === 'text');
  const text = textBlock && 'text' in textBlock ? textBlock.text : '';
  return {
    text,
    in: res.usage.input_tokens,
    out: res.usage.output_tokens,
  };
}

async function callOpenAI(model: string): Promise<{ text: string; in: number; out: number }> {
  const res = await openai.chat.completions.create({
    model,
    max_completion_tokens: 4096,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT },
    ],
  });
  const text = res.choices[0]?.message?.content ?? '';
  return {
    text,
    in: res.usage?.prompt_tokens ?? 0,
    out: res.usage?.completion_tokens ?? 0,
  };
}

async function callGemini(model: string): Promise<{ text: string; in: number; out: number }> {
  const res = await gemini.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: USER_PROMPT }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      maxOutputTokens: 8000,
      thinkingConfig: { thinkingBudget: 4000 },
    },
  });
  const text = res.text ?? '';
  return {
    text,
    in: res.usageMetadata?.promptTokenCount ?? 0,
    out: res.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

// ─── Cost calculator ──────────────────────────────────────
function estimateCost(model: string, inTokens: number, outTokens: number): number {
  const inCost = (inTokens / 1_000_000) * (COST_PER_M_INPUT[model] ?? 0);
  const outCost = (outTokens / 1_000_000) * (COST_PER_M_OUTPUT[model] ?? 0);
  return inCost + outCost;
}

// ─── Condition runners ────────────────────────────────────
async function runCondition(
  conditionId: string,
  label: string,
  approach: string,
  model: string,
  call: () => Promise<{ text: string; in: number; out: number; costMultiplier?: number }>,
): Promise<RunResult> {
  const t0 = Date.now();
  try {
    const r = await call();
    const latency = Date.now() - t0;
    const baseCost = estimateCost(model, r.in, r.out);
    const cost = baseCost * (r.costMultiplier ?? 1);
    return {
      conditionId,
      label,
      model,
      approach,
      output: r.text.trim(),
      latencyMs: latency,
      inputTokens: r.in,
      outputTokens: r.out,
      estimatedCostUsd: cost,
    };
  } catch (err) {
    return {
      conditionId,
      label,
      model,
      approach,
      output: '',
      latencyMs: Date.now() - t0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Workflow: self-critique chain (Sonnet × 3 sequential) ──
async function runSelfCritiqueChain(): Promise<{ text: string; in: number; out: number }> {
  // 1) Generate
  const gen = await callAnthropic('claude-sonnet-4-6', false);
  // 2) Critique
  const critiqueSystem = `Je bent een brand-voice judge voor ${BRAND_NAME}. Lees onderstaande Voice Fingerprint en evalueer de tekst kritisch.\n\n${SYSTEM_PROMPT.substring(0, 3000)}`;
  const critiquePrompt = `# Tekst om te evalueren\n${gen.text}\n\n# Taak\nGeef 3-5 concrete verbeterpunten (woordkeuze, ritme, brand-frame, structure). Geen herschrijving — alleen kritiekpunten.`;
  const critique = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    temperature: 0.3,
    system: critiqueSystem,
    messages: [{ role: 'user', content: critiquePrompt }],
  });
  const critiqueText = (critique.content.find((b) => b.type === 'text') as Anthropic.TextBlock | undefined)?.text ?? '';
  // 3) Revise
  const reviseSystem = SYSTEM_PROMPT;
  const revisePrompt = `# Eerdere versie\n${gen.text}\n\n# Verbeterpunten\n${critiqueText}\n\n# Taak\nSchrijf de tekst opnieuw waarbij elk verbeterpunt is verwerkt. Output alleen de herziene body-tekst (300-400 woorden).`;
  const revise = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    temperature: 0.6,
    system: reviseSystem,
    messages: [{ role: 'user', content: revisePrompt }],
  });
  const reviseText = (revise.content.find((b) => b.type === 'text') as Anthropic.TextBlock | undefined)?.text ?? '';
  return {
    text: reviseText.trim(),
    in: gen.in + critique.usage.input_tokens + revise.usage.input_tokens,
    out: gen.out + critique.usage.output_tokens + revise.usage.output_tokens,
  };
}

// ─── Workflow: Haiku + 2 iter passes ──────────────────────
async function runHaikuIterative(): Promise<{ text: string; in: number; out: number }> {
  // 1) Initial Haiku
  const r1 = await callAnthropic('claude-haiku-4-5-20251001', false);
  let inputTotal = r1.in;
  let outputTotal = r1.out;
  let currentText = r1.text;

  // 2 iter passes with Haiku (cheap rewrite + voiceguide-driven hints)
  for (let i = 0; i < 2; i++) {
    const iterSys = SYSTEM_PROMPT;
    const iterPrompt = `# Huidige tekst\n${currentText}\n\n# Taak\nHerschrijf om beter te matchen met de Voice Fingerprint en de self-check criteria. Output alleen de herziene tekst (300-400 woorden).`;
    const iter = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      temperature: 0.5,
      system: iterSys,
      messages: [{ role: 'user', content: iterPrompt }],
    });
    const iterText = (iter.content.find((b) => b.type === 'text') as Anthropic.TextBlock | undefined)?.text ?? '';
    currentText = iterText;
    inputTotal += iter.usage.input_tokens;
    outputTotal += iter.usage.output_tokens;
  }
  return { text: currentText.trim(), in: inputTotal, out: outputTotal };
}

// ─── Workflow: best-of-3 with Gemini Flash (cheap parallel) ──
async function runGeminiBestOf3(): Promise<{ text: string; in: number; out: number }> {
  const emphasisVariants = [
    '\n\n## CANDIDATE FOCUS\nFocus EXTRA op voice-match: imiteer ritme + openingsstijl van Writing sample [1]. Gebruik termen uit "Words we use" minimaal 2× per alinea.',
    '\n\n## CANDIDATE FOCUS\nFocus EXTRA op brand-essence: maak de key-message expliciet in intro EN slot.',
    '\n\n## CANDIDATE FOCUS\nFocus EXTRA op AI-tell elimination + concrete details: geen clichés, elke claim met getal of zintuiglijke detail.',
  ];
  const candidates = await Promise.all(
    emphasisVariants.map(async (emp) => {
      const res = await gemini.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: USER_PROMPT }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT + emp,
          maxOutputTokens: 4000,
        },
      });
      return {
        text: res.text ?? '',
        in: res.usageMetadata?.promptTokenCount ?? 0,
        out: res.usageMetadata?.candidatesTokenCount ?? 0,
      };
    }),
  );

  // Rank via Haiku (mirrors production)
  const rankPrompt = `Hieronder 3 versies. Score elk op 0-100 op brand-voice-match.\n\n${candidates
    .map((c, i) => `## Versie [${i}]\n${c.text.slice(0, 1500)}`)
    .join('\n\n---\n\n')}\n\nReturn JSON: { "winner": <0|1|2>, "scores": [<s0>,<s1>,<s2>] }`;
  const rankRes = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    temperature: 0.3,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: rankPrompt }],
  });
  const rankText = (rankRes.content.find((b) => b.type === 'text') as Anthropic.TextBlock | undefined)?.text ?? '';
  let winnerIdx = 0;
  try {
    const m = rankText.match(/\{[\s\S]+\}/);
    if (m) {
      const parsed = JSON.parse(m[0]) as { winner: number };
      winnerIdx = Math.max(0, Math.min(2, parsed.winner ?? 0));
    }
  } catch {
    // keep 0
  }
  const totalIn = candidates.reduce((s, c) => s + c.in, 0) + rankRes.usage.input_tokens;
  const totalOut = candidates.reduce((s, c) => s + c.out, 0) + rankRes.usage.output_tokens;
  return { text: candidates[winnerIdx].text.trim(), in: totalIn, out: totalOut };
}

// ─── Judge: batch score all outputs in one Sonnet call ──
interface JudgeScore {
  conditionId: string;
  styleFit: number;
  brandEssence: number;
  rulesCompliance: number;
  composite: number;
  reasoning: string;
}

async function batchJudge(results: RunResult[]): Promise<JudgeScore[]> {
  const judgeSystem = `Je bent een F-VAL judge voor brand-voice fidelity. Evalueer elke versie tegen de Voice Fingerprint.

# Voice fingerprint (target)
${VOICE_DESCRIPTION}

Words we use: ${WORDS_WE_USE.join(', ')}
Words we avoid: ${WORDS_WE_AVOID.join(', ')}
Anti-patterns (never write): ${ANTI_PATTERNS.join(', ')}

# Writing samples (style reference)
${WRITING_SAMPLES.map((s, i) => `[${i + 1}] "${s.slice(0, 300)}..."`).join('\n')}

# Scoring criteria (per versie, 0-100)
1. **styleFit** — woordkeuze ritme + openingsstijl matched Writing sample [1]? Words we use frequentie? Sentence length pattern?
2. **brandEssence** — key-message clarity (geen omkijken, vlekkeloos textiel, abonnement)? Brand-frame consistency? Concrete details vs abstract beloftes?
3. **rulesCompliance** — geen Words we avoid? Geen Anti-patterns? Brand-naam "Napking" aanwezig? Geen AI-cliches?

Wees streng maar consistent. Verschillen tussen versies moeten zichtbaar zijn (range gebruiken 30-90).`;

  const judgeUser = results
    .filter((r) => !r.error && r.output)
    .map((r, i) => `## Versie ID="${r.conditionId}" (#${i + 1})\n${r.output.slice(0, 2500)}`)
    .join('\n\n---\n\n') +
    '\n\nReturn ONE JSON object met een "scores" array, één object per versie. Format:\n```json\n{ "scores": [ { "conditionId": "...", "styleFit": 65, "brandEssence": 72, "rulesCompliance": 80, "reasoning": "1-zin korte motivatie" }, ... ] }\n```';

  console.log('[experiment] running batch-judge call (Sonnet 4.6)...');
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    temperature: 0.2,
    system: judgeSystem,
    messages: [{ role: 'user', content: judgeUser }],
  });
  const text = (res.content.find((b) => b.type === 'text') as Anthropic.TextBlock | undefined)?.text ?? '';
  const m = text.match(/\{[\s\S]+\}/);
  if (!m) {
    console.error('Judge returned non-JSON:', text.slice(0, 500));
    return [];
  }
  const parsed = JSON.parse(m[0]) as { scores: Array<{ conditionId: string; styleFit: number; brandEssence: number; rulesCompliance: number; reasoning: string }> };

  return parsed.scores.map((s) => ({
    conditionId: s.conditionId,
    styleFit: s.styleFit,
    brandEssence: s.brandEssence,
    rulesCompliance: s.rulesCompliance,
    composite: Math.round(s.styleFit * 0.35 + s.brandEssence * 0.45 + s.rulesCompliance * 0.2),
    reasoning: s.reasoning,
  }));
}

// ─── Main runner ──────────────────────────────────────────
async function main() {
  console.log('=== Model + workflow comparison experiment ===');
  console.log(`Brief: ${BRIEF.title}`);
  console.log(`System prompt: ${SYSTEM_PROMPT.length} chars\n`);

  const conditions: Array<{ id: string; label: string; approach: string; model: string; run: () => Promise<{ text: string; in: number; out: number }> }> = [
    // Model validation: top-tier single-shot per vendor
    { id: 'T0', label: 'Claude Opus 4.7 + thinking', approach: 'single-shot + extended thinking', model: 'claude-opus-4-7', run: () => callAnthropic('claude-opus-4-7', true) },
    { id: 'E1', label: 'Claude Sonnet 4.6 + thinking', approach: 'single-shot + extended thinking', model: 'claude-sonnet-4-6', run: () => callAnthropic('claude-sonnet-4-6', true) },
    { id: 'E2', label: 'GPT-5.4', approach: 'single-shot', model: 'gpt-5.4', run: () => callOpenAI('gpt-5.4') },
    { id: 'E3', label: 'Gemini 3.1 Pro + thinking', approach: 'single-shot + thinking', model: 'gemini-3.1-pro-preview', run: () => callGemini('gemini-3.1-pro-preview') },
    // 3 alternative workflows
    { id: 'A1', label: 'Haiku 4.5 × 3 (1 gen + 2 iter)', approach: 'cheap iterative', model: 'claude-haiku-4-5-20251001', run: runHaikuIterative },
    { id: 'A2', label: 'Sonnet 4.6 self-critique chain', approach: 'gen → critique → revise (3 calls)', model: 'claude-sonnet-4-6', run: runSelfCritiqueChain },
    { id: 'A3', label: 'Gemini 3 Flash best-of-3', approach: 'parallel candidates + ranker', model: 'gemini-3-flash-preview', run: runGeminiBestOf3 },
  ];

  const results: RunResult[] = [];
  for (const cond of conditions) {
    console.log(`[experiment] running ${cond.id}: ${cond.label}...`);
    const r = await runCondition(cond.id, cond.label, cond.approach, cond.model, cond.run);
    results.push(r);
    if (r.error) {
      console.error(`  ERROR: ${r.error}`);
    } else {
      console.log(`  ok — ${r.outputTokens}t out, ${(r.latencyMs / 1000).toFixed(1)}s, ~$${r.estimatedCostUsd.toFixed(4)}`);
    }
  }

  // Save raw outputs for inspection
  const outDir = resolve(process.cwd(), 'docs/experiments');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, '2026-05-13-model-comparison-raw.json'),
    JSON.stringify(results, null, 2),
  );

  // Run judge
  const scores = await batchJudge(results);
  console.log('\n=== Judge results ===');
  for (const s of scores) {
    console.log(`${s.conditionId}: composite ${s.composite} (style ${s.styleFit} / essence ${s.brandEssence} / rules ${s.rulesCompliance})`);
  }

  // Build report
  const reportLines: string[] = [];
  reportLines.push('# Model + workflow comparison — 2026-05-13');
  reportLines.push('');
  reportLines.push('Autonoom experiment om te valideren of Opus 4.7 + thinking de beste model-keuze is voor brand-voice-matched content generation, plus 3 alternatieve werkwijzen voor goedkopere/snellere paden.');
  reportLines.push('');
  reportLines.push('## Setup');
  reportLines.push(`- **Brand**: ${BRAND_NAME} (NL voice, real fingerprint uit DB)`);
  reportLines.push(`- **Taak**: 300-400 woorden blog-post body section`);
  reportLines.push(`- **Prompt-structuur**: identiek aan canvas-orchestrator (BVD + voice-fingerprint + brand-context + self-check)`);
  reportLines.push(`- **Judge**: Claude Sonnet 4.6, batch-call, 3-dimensie scoring met F-VAL gewogen composite (35/45/20)`);
  reportLines.push('');
  reportLines.push('## Resultaten');
  reportLines.push('');
  reportLines.push('| ID | Conditie | Composite | Style | Essence | Rules | Latency | Cost | Tokens out |');
  reportLines.push('|----|----------|----------:|------:|--------:|------:|--------:|-----:|-----------:|');

  const scoreMap = new Map(scores.map((s) => [s.conditionId, s]));
  const ranked = [...results].sort((a, b) => (scoreMap.get(b.conditionId)?.composite ?? 0) - (scoreMap.get(a.conditionId)?.composite ?? 0));
  for (const r of ranked) {
    const s = scoreMap.get(r.conditionId);
    const composite = s?.composite ?? 0;
    const style = s?.styleFit ?? 0;
    const essence = s?.brandEssence ?? 0;
    const rules = s?.rulesCompliance ?? 0;
    const latencyS = (r.latencyMs / 1000).toFixed(1);
    reportLines.push(
      `| ${r.conditionId} | ${r.label} | **${composite}** | ${style} | ${essence} | ${rules} | ${latencyS}s | $${r.estimatedCostUsd.toFixed(4)} | ${r.outputTokens} |`,
    );
  }
  reportLines.push('');
  reportLines.push('## Per-conditie judge-motivatie');
  reportLines.push('');
  for (const r of ranked) {
    const s = scoreMap.get(r.conditionId);
    if (!s) continue;
    reportLines.push(`### ${r.conditionId} — ${r.label} (composite ${s.composite})`);
    reportLines.push(`- Approach: ${r.approach}`);
    reportLines.push(`- Judge: ${s.reasoning}`);
    if (r.error) reportLines.push(`- **ERROR**: ${r.error}`);
    reportLines.push('');
    reportLines.push('Sample output (eerste 500 chars):');
    reportLines.push('```');
    reportLines.push(r.output.slice(0, 500));
    reportLines.push('```');
    reportLines.push('');
  }

  writeFileSync(
    resolve(outDir, '2026-05-13-model-comparison-report.md'),
    reportLines.join('\n'),
  );
  console.log(`\nReport written to docs/experiments/2026-05-13-model-comparison-report.md`);
}

main().catch((err) => {
  console.error('Experiment failed:', err);
  process.exit(1);
});
