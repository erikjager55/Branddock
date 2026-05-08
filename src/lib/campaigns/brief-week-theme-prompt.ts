/**
 * On-render Anthropic-prompt voor sectie 5 (content-kalender) van de
 * campaign-brief. Genereert per-week-thema's afgeleid uit campagne-strategie,
 * persona's en asset-distributie. Geen persistentie: één AI-call per render.
 *
 * Hard timeout van 6 seconden via `timeoutMs` in `anthropicClient`. Bij
 * timeout/fail retourneert deze functie een `error`-string i.p.v. te throwen,
 * zodat de renderer een fallback-melding kan tonen en de overige 9 secties
 * gewoon kunnen renderen.
 */

import { z } from 'zod';
import { anthropicClient } from '@/lib/ai/anthropic-client';
import type { WeekTheme, BriefViewModel } from '@/lib/campaigns/brief-types';

// 10s geeft ruimte boven de gemiddelde Anthropic-latency van 3-5s zonder de
// hele render te blokkeren bij een trage API-dag. Bij timeout/fail toont
// sectie 5 een fallback met retry-knop — geen harde fout naar de user.
const WEEK_THEME_TIMEOUT_MS = 10_000;

const WeekThemeSchema = z.object({
  weekNumber: z.number().int().min(1).max(104), // hard cap: 2 jaar — voorkomt absurde waardes
  theme: z.string().min(1).max(200),
  rationale: z.string().min(1).max(500),
});

const ResponseSchema = z.object({
  weeks: z.array(WeekThemeSchema).min(1).max(104),
});

export interface GenerateWeekThemesInput {
  viewModel: BriefViewModel;
  /** Optionele extra context uit `getBrandContext(workspaceId)`. Compacte
   *  string i.p.v. het volledige object om token-budget binnen 2K te houden. */
  brandContextSummary?: string;
}

export interface GenerateWeekThemesResult {
  weekThemes?: WeekTheme[];
  /** Indien gevuld: de renderer toont de fallback-melding voor sectie 5. */
  error?: string;
  durationMs: number;
}

/**
 * Genereert WeekTheme[] voor de duur van de campagne. Faalt safe — bij
 * timeout, parse-error of API-fout retourneert het object een `error`-string.
 */
export async function generateWeekThemes(
  input: GenerateWeekThemesInput,
): Promise<GenerateWeekThemesResult> {
  const start = Date.now();
  const { viewModel, brandContextSummary } = input;

  const weeks = viewModel.meta.durationWeeks ?? null;
  if (!weeks || weeks < 1) {
    return {
      durationMs: Date.now() - start,
      error: 'Duration unknown — cannot derive week themes without a defined duration',
    };
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(viewModel, weeks, brandContextSummary);

  try {
    const result = await anthropicClient.createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { useCase: 'STRUCTURED', timeoutMs: WEEK_THEME_TIMEOUT_MS, maxTokens: 1500 },
    );

    const parsed = parseWeekThemesResponse(result.content);
    if ('error' in parsed) {
      return { durationMs: Date.now() - start, error: parsed.error };
    }

    // Filter weekNumbers buiten het verwachte bereik. AI kan extreme waardes
    // emit'en zelfs binnen de Zod-cap; renderer rekent op weekNumber ≤ duration.
    const filtered = parsed.weeks.filter((w) => w.weekNumber <= weeks);
    return { weekThemes: filtered, durationMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      durationMs: Date.now() - start,
      error: shortenErrorMessage(message),
    };
  }
}

// ─── Prompt building ──────────────────────────────────────────

function buildSystemPrompt(): string {
  return [
    'You are an experienced campaign strategist who picks a weekly theme for each',
    'week of a campaign, aligned with the funnel phase and the audience pain points.',
    'Your output is always valid JSON in the following schema:',
    '',
    '{',
    '  "weeks": [',
    '    { "weekNumber": 1, "theme": "...", "rationale": "..." },',
    '    ...',
    '  ]',
    '}',
    '',
    'Rules:',
    '- Provide exactly one theme per week',
    '- "theme" is a short title (max 6 words)',
    '- "rationale" is one sentence (max 25 words) that ties the theme to the funnel',
    '  phase and a persona pain point or motivation',
    '- Build a narrative arc: week 1 introduction/manifesto, middle weeks pain + proof,',
    '  final week conversion/CTA',
    '- Match the language of the input content (campaign theme, persona pain points,',
    '  key message). If the input is in Dutch, output Dutch; if English, output English; etc.',
    '- No marketing jargon. No emoji.',
  ].join('\n');
}

function buildUserPrompt(vm: BriefViewModel, weeks: number, brandContext?: string): string {
  const lines: string[] = [];
  lines.push(`Generate week themes for a ${weeks}-week campaign.`);
  lines.push('');
  lines.push(`**Campaign**: ${vm.meta.campaignTitle}`);
  if (vm.overview.campaignTheme) lines.push(`**Overarching theme**: ${vm.overview.campaignTheme}`);
  if (vm.overview.positioningStatement) lines.push(`**Positioning**: ${vm.overview.positioningStatement}`);
  if (vm.messaging.coreMessage) lines.push(`**Key message**: ${vm.messaging.coreMessage}`);
  if (vm.overview.goalType) lines.push(`**Goal type**: ${vm.overview.goalType}`);

  if (vm.audience.primary[0]) {
    const p = vm.audience.primary[0];
    lines.push('');
    lines.push(`**Primary persona**: ${p.name}`);
    if (p.painPoints.length > 0) lines.push(`- Pain points: ${p.painPoints.slice(0, 5).join(' · ')}`);
    if (p.motivations.length > 0) lines.push(`- Motivations: ${p.motivations.slice(0, 5).join(' · ')}`);
  }

  if (vm.channels.selected.length > 0) {
    lines.push('');
    lines.push(`**Channels**: ${vm.channels.selected.map((c) => `${c.name} (${c.role})`).join(', ')}`);
  }

  const allAssets = [
    ...vm.assets.mustHave,
    ...vm.assets.shouldHave,
    ...vm.assets.niceToHave,
  ];
  if (allAssets.length > 0) {
    lines.push('');
    lines.push('**Asset distribution per phase**:');
    const byPhase = groupBy(allAssets, (a) => a.phase || 'unknown');
    for (const [phase, assets] of Object.entries(byPhase)) {
      lines.push(`- ${phase}: ${assets.map((a) => a.title).join('; ')}`);
    }
  }

  if (brandContext) {
    lines.push('');
    lines.push('**Brand context (compact)**:');
    lines.push(brandContext);
  }

  lines.push('');
  lines.push(`Now return exactly ${weeks} themes in the JSON schema. Match the language of the input content above.`);
  return lines.join('\n');
}

// ─── Response parsing ─────────────────────────────────────────

interface ParseError {
  error: string;
}

interface ParsedResponse {
  weeks: WeekTheme[];
}

function parseWeekThemesResponse(raw: string): ParsedResponse | ParseError {
  const json = extractJson(raw);
  if (!json) {
    return { error: 'AI response did not contain readable JSON' };
  }

  const result = ResponseSchema.safeParse(json);
  if (!result.success) {
    return { error: `AI response had wrong structure: ${result.error.issues[0]?.message ?? 'unknown'}` };
  }

  // Sort by weekNumber zodat duplicate-cleanup en weergave consistent zijn.
  const seen = new Set<number>();
  const weeks: WeekTheme[] = [];
  for (const w of result.data.weeks) {
    if (seen.has(w.weekNumber)) continue;
    seen.add(w.weekNumber);
    weeks.push(w);
  }
  weeks.sort((a, b) => a.weekNumber - b.weekNumber);
  return { weeks };
}

/**
 * Extract de eerste valide JSON-object uit de AI-response. Anthropic kan
 * markdown-fences om de JSON heen zetten — die strippen we hier. Als er
 * meerdere fenced blocks zijn (model emit voorbeeld + werkelijke output),
 * pakken we de laatste — die is doorgaans het echte resultaat.
 */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenceMatches = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/g));
  if (fenceMatches.length > 0) {
    const lastBlock = fenceMatches[fenceMatches.length - 1][1];
    try {
      return JSON.parse(lastBlock);
    } catch {
      // Probeer de eerste als de laatste niet parse-baar is.
      try {
        return JSON.parse(fenceMatches[0][1]);
      } catch {
        // Val terug op trimmed-as-is hieronder.
      }
    }
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function shortenErrorMessage(msg: string): string {
  if (msg.length <= 120) return msg;
  return `${msg.slice(0, 117)}...`;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!out[key]) out[key] = [];
    out[key].push(item);
  }
  return out;
}
