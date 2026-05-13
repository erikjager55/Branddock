// =============================================================
// Per-content-type model comparison — 2026-05-13
//
// Goal: per content-type category de beste model-keuze identificeren.
// 8 representanten (1 per categorie) × 6 modellen = 48 condities.
// Per content-type batch-judge ranking om de beste keuze te bepalen.
//
// Models tested (subset van eerdere experiment; alleen working
// single-shot kandidaten):
//   - Claude Opus 4.7 + thinking (adaptive API)
//   - Claude Sonnet 4.6 + thinking
//   - Claude Haiku 4.5 (no thinking)
//   - GPT-5.4
//   - GPT-5.4-mini (cheap-tier)
//   - Gemini 3.1 Pro + thinking
//
// Per-content-type brief gestoeld op Napking brand-context.
// =============================================================

import { config as loadEnv } from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local') });

// ─── Napking brand-voice fingerprint (real data) ──────────
const BRAND_NAME = 'Napking';
const VOICE_DESCRIPTION = `Napking speaks with practical confidence and no-nonsense clarity. The voice is direct, service-oriented, and reassuring—emphasizing reliability through concrete details (HACCP, 280+ restaurants, exact delivery schedules) rather than abstract promises. It uses the informal Dutch 'je/jij' consistently, creating approachable professionalism. Sentences are short and declarative. The brand leans on sensory precision ('vlekkeloos,' 'kraakhelder,' 'smetteloos') and operational transparency to build trust. Sustainability is presented as embedded practice, not virtue signaling. The tone is helpful without being chatty, confident without being boastful.`;
const WORDS_WE_USE = ['vlekkeloos','smetteloos','kraakhelder','onberispelijk','omkijken','scherp','flexibel','afkeur','rejects','poule','voorraad','beheren','afleveren','retour','abonnement','uitblinken','streven','zorgeloos','transparant','eindverantwoordelijk'];
const WORDS_WE_AVOID = ['revolutionair','innovatief','toonaangevend','excellent','premium','luxe','passie','gedreven','uniek','exclusief','state-of-the-art','cutting-edge','game-changer'];
const ANTI_PATTERNS = ['Ontdek de magie van','Jouw ultieme oplossing voor','Wij gaan voor excellentie','Passie voor perfectie','Innovatieve textieloplossingen','Til je restaurant naar een hoger niveau','De nummer 1 in','Exclusieve service','Onze missie is om te inspireren','Game-changing textiel','Premium kwaliteit voor de veeleisende professional','Laat ons je verrassen'];
const WRITING_SAMPLES = [
  `Heb ik wel genoeg textiel op voorraad? Is er voldoende kokskleding? Bij Napking heb je hier geen omkijken naar. Wij zijn dé flexibele partner voor horecatextiel in de Randstad.`,
  `Vlekkeloos (samen)werken – dat is ons streven. Sinds 2010 bieden wij smetteloos linnen voor restaurants in de Randstad en daarbuiten.`,
  `Nee. Wij werken met een uniek abonnementsysteem: wat je als vuile was inlevert, sturen wij een week later schoon retour. Je hoeft dus geen bestellingen te plaatsen.`,
];

// ─── Per-content-type briefs (one representative per category) ──
interface ContentBrief {
  id: string;
  category: string;
  label: string;
  brief: string;
  format: string;
  judgeCriteria: string;
}

const CONTENT_TYPES: ContentBrief[] = [
  {
    id: 'blog-post',
    category: 'Long-Form Content',
    label: 'Blog post body',
    brief: 'Blog over hoe Napking ervoor zorgt dat restaurants geen omkijken meer hebben naar textielbeheer. Doelgroep: restauranthouders in de Randstad. Focus op concrete operationele details (HACCP, 280+ restaurants, abonnementsysteem) i.p.v. abstracte beloftes.',
    format: '300-400 woorden body section, 3-5 alineas met optioneel subkopjes. Geen titel, geen CTA — alleen body-tekst.',
    judgeCriteria: 'Lange-vorm: behoud van voice + structurele helderheid + concrete claims.',
  },
  {
    id: 'linkedin-post',
    category: 'Social Media',
    label: 'LinkedIn post',
    brief: 'Professionele LinkedIn-post over de mijlpaal: Napking levert sinds 2010 textielbeheer voor 280+ restaurants in de Randstad. Toon dankbaarheid + operationele trots zonder boastful te zijn.',
    format: '150-220 woorden, geschikt voor LinkedIn feed. 2-4 korte alineas. Eindigt met een lichte uitnodiging tot reactie (geen aggressieve CTA).',
    judgeCriteria: 'Social: scroll-stoppende opening + persoonlijke nuchterheid + voice-match in beperkte ruimte.',
  },
  {
    id: 'search-ad',
    category: 'Advertising & Paid',
    label: 'Google Search Ad',
    brief: 'Search-ad voor Google: wanneer een restaurant zoekt op "horecatextiel reiniging Amsterdam" of "wasservice restaurant Randstad". Conversie-doel: aanvraag voor gratis inventarisatie.',
    format: '3 headlines (elk ≤30 chars) + 2 descriptions (elk ≤90 chars). Format: `H1: ...\\nH2: ...\\nH3: ...\\nD1: ...\\nD2: ...`',
    judgeCriteria: 'Ad-copy: korte zinnen, scherpe value-prop, geen overdreven taal, brand-name aanwezig.',
  },
  {
    id: 'newsletter',
    category: 'Email & Automation',
    label: 'Customer newsletter section',
    brief: 'Newsletter-sectie voor bestaande Napking-klanten over nieuwe duurzame katoenkeuze (Fairtrade/GOTS/Oeko-Tex servetten). Informatief, niet sales-y — duurzaamheid als embedded practice, niet als marketing-claim.',
    format: '180-250 woorden, 2-3 alineas. Geschikt voor email-body. Geen onderwerp-regel, geen footer — alleen body-content.',
    judgeCriteria: 'Email: directe aanspraak je/jij + relevante operationele info + duurzaamheid zonder virtue signaling.',
  },
  {
    id: 'landing-page',
    category: 'Website & Landing Pages',
    label: 'Landing-page hero',
    brief: 'Hero-sectie voor landingspagina gericht op nieuwe leads: restaurants die op zoek zijn naar een textielpartner. Conversie-doel: gratis inventarisatie aanvragen.',
    format: 'H1 (≤60 chars) + subhead (≤150 chars) + 3 bullet-points (elk ≤80 chars) + CTA-tekst (≤25 chars). Format: `H1: ...\\nSUB: ...\\n- ...\\n- ...\\n- ...\\nCTA: ...`',
    judgeCriteria: 'Landing: punchy H1 zonder superlatieven + concrete bullet-proof points + actiegerichte CTA.',
  },
  {
    id: 'explainer-video',
    category: 'Video & Audio',
    label: 'Explainer video script',
    brief: 'Voice-over script voor een explainer-video (60-90 sec) over hoe het Napking abonnementsysteem werkt: vuile was eruit, schone was retour, geen voorraad-stress.',
    format: '120-180 woorden script, geschikt om binnen 60-90s in te spreken. Markeer scenes met [scene 1: ...] [scene 2: ...]. Spreektaal, geen jargon.',
    judgeCriteria: 'Video: ritme + spreekbaarheid + visuele suggesties + voice-match in kortere zinnen.',
  },
  {
    id: 'press-release',
    category: 'PR, HR & Communications',
    label: 'Press release',
    brief: 'Persbericht over mijlpaal: Napking levert sinds 2010 textielbeheer voor 280+ restaurants in de Randstad, met 100% elektrisch wagenpark sinds 2024. Toon: feitelijk, professioneel, geen marketing-spin.',
    format: '250-350 woorden, klassieke persbericht-structuur: kop, lead (5 W\'s), 2-3 body-alineas met cijfers + quote (mag fictief van CEO Mark/Tess), boilerplate. Format: `KOP: ...\\nLEAD: ...\\n\\nBODY: ...\\n\\nQUOTE: ...\\n\\nBOILERPLATE: ...`',
    judgeCriteria: 'PR: feitelijkheid + concrete cijfers + quotable lijn + brand-voice consistent.',
  },
  {
    id: 'one-pager',
    category: 'Sales Enablement',
    label: 'Sales one-pager',
    brief: 'Sales one-pager (printable) voor accountmanagers: gebruikt in eerste klantgesprek. Doel: kort uitleggen hoe Napking werkt + 3 redenen om over te stappen + contact-trigger.',
    format: '200-260 woorden, structuur: kop, intro (2 zinnen), 3 redenen (elk met label + 1-2 zinnen onderbouwing), contact-trigger (1-2 zinnen). Format: `KOP: ...\\n\\nINTRO: ...\\n\\n1. ...\\n2. ...\\n3. ...\\n\\nCONTACT: ...`',
    judgeCriteria: 'Sales: helder gestructureerd + concrete bewijspunten + uitnodigend zonder pushy te zijn.',
  },
];

// ─── Models to test ───────────────────────────────────────
interface ModelConfig {
  id: string;
  label: string;
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
  withThinking?: boolean;
}

const MODELS: ModelConfig[] = [
  { id: 'opus-4-7', label: 'Claude Opus 4.7 + thinking', provider: 'anthropic', model: 'claude-opus-4-7', withThinking: true },
  { id: 'sonnet-4-6', label: 'Claude Sonnet 4.6 + thinking', provider: 'anthropic', model: 'claude-sonnet-4-6', withThinking: true },
  { id: 'haiku-4-5', label: 'Claude Haiku 4.5', provider: 'anthropic', model: 'claude-haiku-4-5-20251001', withThinking: false },
  { id: 'gpt-5-4', label: 'GPT-5.4', provider: 'openai', model: 'gpt-5.4' },
  { id: 'gpt-5-4-mini', label: 'GPT-5.4 Mini', provider: 'openai', model: 'gpt-5.4-mini' },
  { id: 'gemini-3-1-pro', label: 'Gemini 3.1 Pro + thinking', provider: 'google', model: 'gemini-3.1-pro-preview', withThinking: true },
];

// ─── Cost-estimate per provider/model (USD per 1M tokens) ──
const COST_PER_M_INPUT: Record<string, number> = {
  'claude-opus-4-7': 15.0,
  'claude-sonnet-4-6': 3.0,
  'claude-haiku-4-5-20251001': 1.0,
  'gpt-5.4': 5.0,
  'gpt-5.4-mini': 0.6,
  'gemini-3.1-pro-preview': 3.5,
};
const COST_PER_M_OUTPUT: Record<string, number> = {
  'claude-opus-4-7': 75.0,
  'claude-sonnet-4-6': 15.0,
  'claude-haiku-4-5-20251001': 5.0,
  'gpt-5.4': 15.0,
  'gpt-5.4-mini': 2.4,
  'gemini-3.1-pro-preview': 10.5,
};

// ─── Provider clients ─────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── System-prompt builder ────────────────────────────────
function buildSystemPrompt(brief: ContentBrief): string {
  const voiceguideBlock = [
    `Voice: ${VOICE_DESCRIPTION}`,
    `Words we use: ${WORDS_WE_USE.join(', ')}`,
    `Words we avoid: ${WORDS_WE_AVOID.join(', ')}`,
    `Anti-patterns (never write): ${ANTI_PATTERNS.join(', ')}`,
    `Writing samples — match THIS voice-fingerprint exactly: ${WRITING_SAMPLES.map((s, i) => `[${i + 1}] "${s}"`).join(' ')}`,
  ].join('. ');

  return [
    '## BRAND VOICE DIRECTIVE — NON-NEGOTIABLE',
    '**Language**: Write ALL content in Nederlands.',
    '',
    '**VOICE FINGERPRINT — MUST MATCH BEFORE OUTPUT**:',
    voiceguideBlock,
    '',
    `**Brand name**: Use "${BRAND_NAME}".`,
    '',
    '## Brief',
    brief.brief,
    '',
    '## Format',
    brief.format,
    '',
    '## SELF-CHECK',
    '1. Komt ritme + openingsstijl overeen met Writing sample [1]?',
    '2. Verschijnen tenminste 2 termen uit "Words we use" per alinea/sectie?',
    '3. Geen termen uit "Words we avoid" of "Anti-patterns"?',
    `4. Komt "${BRAND_NAME}" expliciet voor?`,
    '5. Geen AI-clichés?',
    '',
    'Als check zou falen, herschrijf VOORDAT je antwoordt.',
  ].join('\n');
}

const USER_INSTRUCTION_BY_CONTENT_TYPE: Record<string, string> = {
  'blog-post': 'Schrijf nu de body section van de blog-post. Alleen de body. Output alleen de tekst.',
  'linkedin-post': 'Schrijf nu de LinkedIn-post. Output alleen de post-tekst.',
  'search-ad': 'Schrijf nu de search-ad copy in het opgegeven format. Output alleen de regels (H1/H2/H3/D1/D2).',
  'newsletter': 'Schrijf nu de newsletter-sectie. Output alleen de body-tekst.',
  'landing-page': 'Schrijf nu de hero-sectie in het opgegeven format. Output alleen de regels (H1/SUB/bullets/CTA).',
  'explainer-video': 'Schrijf nu het script in het opgegeven format met scene-markers. Output alleen het script.',
  'press-release': 'Schrijf nu het persbericht in het opgegeven format. Output alleen de regels.',
  'one-pager': 'Schrijf nu de one-pager in het opgegeven format. Output alleen de regels.',
};

// ─── Cost calculator ──────────────────────────────────────
function estimateCost(model: string, inTokens: number, outTokens: number): number {
  const inCost = (inTokens / 1_000_000) * (COST_PER_M_INPUT[model] ?? 0);
  const outCost = (outTokens / 1_000_000) * (COST_PER_M_OUTPUT[model] ?? 0);
  return inCost + outCost;
}

// ─── Per-model callers ────────────────────────────────────
async function callAnthropic(
  model: string,
  withThinking: boolean,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; in: number; out: number }> {
  const isOpus47Plus = /opus-4-7|opus-4-8|opus-5/.test(model);
  let params: unknown;
  if (withThinking && isOpus47Plus) {
    params = {
      model,
      max_tokens: 4096 + 4000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    };
  } else if (withThinking) {
    params = {
      model,
      max_tokens: 4096 + 4000,
      thinking: { type: 'enabled', budget_tokens: 4000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    };
  } else {
    params = {
      model,
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    };
  }
  const res = await anthropic.messages.create(params as Anthropic.Messages.MessageCreateParamsNonStreaming);
  const textBlock = res.content.find((b) => b.type === 'text');
  const text = textBlock && 'text' in textBlock ? textBlock.text : '';
  return { text, in: res.usage.input_tokens, out: res.usage.output_tokens };
}

async function callOpenAI(model: string, systemPrompt: string, userPrompt: string): Promise<{ text: string; in: number; out: number }> {
  const res = await openai.chat.completions.create({
    model,
    max_completion_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  return {
    text: res.choices[0]?.message?.content ?? '',
    in: res.usage?.prompt_tokens ?? 0,
    out: res.usage?.completion_tokens ?? 0,
  };
}

async function callGemini(model: string, systemPrompt: string, userPrompt: string): Promise<{ text: string; in: number; out: number }> {
  const res = await gemini.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 8000,
      thinkingConfig: { thinkingBudget: 4000 },
    },
  });
  return {
    text: res.text ?? '',
    in: res.usageMetadata?.promptTokenCount ?? 0,
    out: res.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

async function runModelForContentType(
  modelCfg: ModelConfig,
  brief: ContentBrief,
): Promise<{ modelId: string; contentTypeId: string; output: string; latencyMs: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number; error?: string }> {
  const systemPrompt = buildSystemPrompt(brief);
  const userPrompt = USER_INSTRUCTION_BY_CONTENT_TYPE[brief.id] ?? 'Output alleen de tekst.';

  const t0 = Date.now();
  try {
    let res: { text: string; in: number; out: number };
    if (modelCfg.provider === 'anthropic') {
      res = await callAnthropic(modelCfg.model, modelCfg.withThinking ?? false, systemPrompt, userPrompt);
    } else if (modelCfg.provider === 'openai') {
      res = await callOpenAI(modelCfg.model, systemPrompt, userPrompt);
    } else {
      res = await callGemini(modelCfg.model, systemPrompt, userPrompt);
    }
    const latency = Date.now() - t0;
    const cost = estimateCost(modelCfg.model, res.in, res.out);
    return {
      modelId: modelCfg.id,
      contentTypeId: brief.id,
      output: res.text.trim(),
      latencyMs: latency,
      inputTokens: res.in,
      outputTokens: res.out,
      estimatedCostUsd: cost,
    };
  } catch (err) {
    return {
      modelId: modelCfg.id,
      contentTypeId: brief.id,
      output: '',
      latencyMs: Date.now() - t0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Batch judge per content-type ─────────────────────────
interface JudgeScore {
  modelId: string;
  styleFit: number;
  brandEssence: number;
  rulesCompliance: number;
  formatFit: number;
  composite: number;
  reasoning: string;
}

async function judgeContentType(
  brief: ContentBrief,
  results: Array<{ modelId: string; output: string }>,
): Promise<JudgeScore[]> {
  const valid = results.filter((r) => r.output);
  if (valid.length === 0) return [];

  const judgeSystem = `Je bent een F-VAL judge voor brand-voice fidelity + format-fit. Evalueer elke versie tegen de Voice Fingerprint én de format-eisen.

# Voice fingerprint (target)
${VOICE_DESCRIPTION}

Words we use: ${WORDS_WE_USE.join(', ')}
Words we avoid: ${WORDS_WE_AVOID.join(', ')}
Anti-patterns (never write): ${ANTI_PATTERNS.join(', ')}

Sample stijl: "${WRITING_SAMPLES[0].slice(0, 200)}..."

# Content-type: ${brief.label} (${brief.category})
${brief.judgeCriteria}

## Format-eis
${brief.format}

# Scoring (0-100 per dimensie)
1. **styleFit** — woordkeuze + ritme + opening match Writing sample? Words we use frequentie?
2. **brandEssence** — key-message clarity? Brand-frame consistency? Concrete vs abstract?
3. **rulesCompliance** — geen Words we avoid? Geen Anti-patterns? Brand-naam aanwezig?
4. **formatFit** — voldoet het aan de format-eis (lengte, structuur, sections)?

Wees streng. Range 30-95 gebruiken.`;

  const judgeUser = valid
    .map((r, i) => `## Versie ID="${r.modelId}" (#${i + 1})\n${r.output.slice(0, 2500)}`)
    .join('\n\n---\n\n') +
    '\n\nReturn ONE JSON object: { "scores": [ { "modelId": "...", "styleFit": N, "brandEssence": N, "rulesCompliance": N, "formatFit": N, "reasoning": "1-zin" }, ... ] }';

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    temperature: 0.2,
    system: judgeSystem,
    messages: [{ role: 'user', content: judgeUser }],
  });
  const text = (res.content.find((b) => b.type === 'text') as Anthropic.TextBlock | undefined)?.text ?? '';
  const m = text.match(/\{[\s\S]+\}/);
  if (!m) return [];
  try {
    const parsed = JSON.parse(m[0]) as { scores: Array<{ modelId: string; styleFit: number; brandEssence: number; rulesCompliance: number; formatFit: number; reasoning: string }> };
    return parsed.scores.map((s) => ({
      modelId: s.modelId,
      styleFit: s.styleFit,
      brandEssence: s.brandEssence,
      rulesCompliance: s.rulesCompliance,
      formatFit: s.formatFit,
      // 4-dim composite: style 30 / essence 35 / rules 15 / format 20
      composite: Math.round(s.styleFit * 0.3 + s.brandEssence * 0.35 + s.rulesCompliance * 0.15 + s.formatFit * 0.2),
      reasoning: s.reasoning,
    }));
  } catch (err) {
    console.warn('Judge parse failed:', err);
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  console.log('=== Per-content-type model comparison ===');
  console.log(`Content-types: ${CONTENT_TYPES.length}`);
  console.log(`Models: ${MODELS.length}`);
  console.log(`Total conditions: ${CONTENT_TYPES.length * MODELS.length}\n`);

  // Run all conditions: parallelize per content-type, sequential per model
  // (to keep rate-limits manageable). Could parallelize fully but ~2× faster.
  type Result = Awaited<ReturnType<typeof runModelForContentType>>;
  const allResults: Result[] = [];
  const judgesByContentType: Record<string, JudgeScore[]> = {};

  for (const brief of CONTENT_TYPES) {
    console.log(`\n--- Content-type: ${brief.id} (${brief.category}) ---`);
    const modelResults: Result[] = [];
    for (const m of MODELS) {
      process.stdout.write(`  ${m.id}... `);
      const r = await runModelForContentType(m, brief);
      modelResults.push(r);
      allResults.push(r);
      if (r.error) {
        process.stdout.write(`ERROR (${r.error.slice(0, 60)})\n`);
      } else {
        process.stdout.write(`ok (${(r.latencyMs / 1000).toFixed(1)}s, $${r.estimatedCostUsd.toFixed(4)})\n`);
      }
    }
    // Judge this content-type
    console.log(`  [judge]`);
    const scores = await judgeContentType(brief, modelResults.map((r) => ({ modelId: r.modelId, output: r.output })));
    judgesByContentType[brief.id] = scores;
    for (const s of scores) {
      console.log(`    ${s.modelId}: composite ${s.composite} (style ${s.styleFit} / essence ${s.brandEssence} / rules ${s.rulesCompliance} / format ${s.formatFit})`);
    }
  }

  // Save raw + write report
  const outDir = resolve(process.cwd(), 'docs/experiments');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, '2026-05-13-per-content-type-raw.json'),
    JSON.stringify({ results: allResults, judges: judgesByContentType }, null, 2),
  );

  // Build report
  const lines: string[] = [];
  lines.push('# Per-content-type model comparison — 2026-05-13');
  lines.push('');
  lines.push('Autonoom experiment om per content-type categorie het beste model te identificeren. 8 representanten (1 per categorie) × 6 modellen = 48 condities.');
  lines.push('');
  lines.push('## Setup');
  lines.push(`- **Brand**: ${BRAND_NAME} (real fingerprint uit DB)`);
  lines.push(`- **Modellen**: ${MODELS.map((m) => m.label).join(', ')}`);
  lines.push(`- **Judge**: Claude Sonnet 4.6 met 4-dim scoring (style 30 / essence 35 / rules 15 / format 20)`);
  lines.push('');
  lines.push('## Per-content-type winnaars');
  lines.push('');
  lines.push('| Content-type | Categorie | Winnaar | Composite | Cost | Latency |');
  lines.push('|---|---|---|---:|---:|---:|');

  type Recommendation = { contentTypeId: string; category: string; winner: string; composite: number; cost: number; latency: number; runnerUp: string; runnerUpScore: number };
  const recommendations: Recommendation[] = [];

  for (const brief of CONTENT_TYPES) {
    const scores = judgesByContentType[brief.id] ?? [];
    if (scores.length === 0) continue;
    const sorted = [...scores].sort((a, b) => b.composite - a.composite);
    const winner = sorted[0];
    const runnerUp = sorted[1];
    const winnerResult = allResults.find((r) => r.contentTypeId === brief.id && r.modelId === winner.modelId);
    const winnerModel = MODELS.find((m) => m.id === winner.modelId);
    recommendations.push({
      contentTypeId: brief.id,
      category: brief.category,
      winner: winnerModel?.label ?? winner.modelId,
      composite: winner.composite,
      cost: winnerResult?.estimatedCostUsd ?? 0,
      latency: winnerResult?.latencyMs ?? 0,
      runnerUp: MODELS.find((m) => m.id === runnerUp?.modelId)?.label ?? runnerUp?.modelId ?? '—',
      runnerUpScore: runnerUp?.composite ?? 0,
    });
    lines.push(
      `| ${brief.id} | ${brief.category} | **${winnerModel?.label ?? winner.modelId}** | ${winner.composite} | $${(winnerResult?.estimatedCostUsd ?? 0).toFixed(4)} | ${((winnerResult?.latencyMs ?? 0) / 1000).toFixed(1)}s |`,
    );
  }

  lines.push('');
  lines.push('## Per-content-type details');
  lines.push('');
  for (const brief of CONTENT_TYPES) {
    const scores = judgesByContentType[brief.id] ?? [];
    if (scores.length === 0) continue;
    lines.push(`### ${brief.id} — ${brief.label} (${brief.category})`);
    lines.push('');
    lines.push('| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
    const sorted = [...scores].sort((a, b) => b.composite - a.composite);
    for (const s of sorted) {
      const r = allResults.find((x) => x.contentTypeId === brief.id && x.modelId === s.modelId);
      const modelLabel = MODELS.find((m) => m.id === s.modelId)?.label ?? s.modelId;
      lines.push(
        `| ${modelLabel} | **${s.composite}** | ${s.styleFit} | ${s.brandEssence} | ${s.rulesCompliance} | ${s.formatFit} | $${(r?.estimatedCostUsd ?? 0).toFixed(4)} | ${((r?.latencyMs ?? 0) / 1000).toFixed(1)}s |`,
      );
    }
    lines.push('');
  }

  writeFileSync(resolve(outDir, '2026-05-13-per-content-type-report.md'), lines.join('\n'));
  console.log(`\nReport written: docs/experiments/2026-05-13-per-content-type-report.md`);
  console.log('\n=== Aanbeveling per content-type ===');
  for (const r of recommendations) {
    console.log(`  ${r.contentTypeId.padEnd(20)} ${r.winner.padEnd(35)} composite=${r.composite}  cost=$${r.cost.toFixed(4)}  (runner-up: ${r.runnerUp} ${r.runnerUpScore})`);
  }
}

main().catch((err) => {
  console.error('Experiment failed:', err);
  process.exit(1);
});
