// ============================================================
// Vanille AI baseline generator
//
// Genereert een "wat zou ChatGPT alleen produceren" output op basis van
// alleen de deliverable brief — geen BVD, geen HVD, geen brand context,
// geen persona's. Gebruikt voor het demo "Vergelijk met vanille AI" panel
// dat het meetbare verschil tussen Branddock en raw GPT-4o laat zien.
//
// Bewust GPT-4o als baseline-model: dat is wat de markt momenteel gebruikt.
// Gemini/Claude zou onfaire vergelijking zijn (ander model = ander artefact).
// ============================================================

import { getDeliverableTypeById } from '@/features/campaigns/lib/deliverable-types';

export interface VanillaBriefInput {
  /** content type ID, e.g. 'blog-post' — drives word-count target en format */
  contentTypeId: string | null;
  /** brief.objective uit deliverable.settings.brief */
  objective: string;
  /** Optional brief fields */
  keyMessage?: string;
  toneDirection?: string;
  callToAction?: string;
  contentOutline?: string[];
}

export interface VanillaBaselineResult {
  text: string;
  wordCount: number;
  model: string;
  generationMs: number;
}

const VANILLA_MODEL = 'gpt-4o';

/**
 * System prompt — het minimum dat een ChatGPT-gebruiker zonder Branddock
 * zou inzetten. Geen merkrichting, geen anti-tell-instructies, geen
 * brand voice. "Just write good content."
 */
const VANILLA_SYSTEM_PROMPT = `You are an experienced content writer producing professional business content.

Write the piece as instructed in the user message. Use markdown headings (##, ###) for structure. Output the content directly without preamble or commentary.`;

function resolveTargetWordRange(contentTypeId: string | null): { min: number; max: number; target: number } {
  if (!contentTypeId) return { min: 400, max: 600, target: 500 };
  const def = getDeliverableTypeById(contentTypeId);
  const min = def?.constraints?.minWords ?? 400;
  const max = def?.constraints?.maxWords ?? 1200;
  const target = Math.round((min + max) / 2);
  return { min, max, target };
}

function buildVanillaUserPrompt(input: VanillaBriefInput): string {
  const { min, max } = resolveTargetWordRange(input.contentTypeId);
  const typeLabel = input.contentTypeId
    ? input.contentTypeId.replace(/-/g, ' ')
    : 'piece of content';

  const lines: string[] = [
    `Write a ${typeLabel}.`,
    ``,
    `**Goal:** ${input.objective}`,
  ];

  if (input.keyMessage) lines.push(`**Key message:** ${input.keyMessage}`);
  if (input.toneDirection) lines.push(`**Tone:** ${input.toneDirection}`);
  if (input.callToAction) lines.push(`**Call to action:** ${input.callToAction}`);

  if (input.contentOutline && input.contentOutline.length > 0) {
    lines.push('', '**Outline:**');
    for (const point of input.contentOutline) lines.push(`- ${point}`);
  }

  lines.push('', `Aim for ${min}-${max} words. Write the full piece now.`);
  return lines.join('\n');
}

// ─── Public API ──────────────────────────────────

/**
 * Generate a vanille GPT-4o output zonder enige Branddock-context.
 * Dezelfde brief, geen BVD/HVD/brand voice — wat een marketeer zonder
 * Branddock zou krijgen. Dit is de "ceiling" waartegen de Branddock-output
 * vergeleken wordt voor de demo claim.
 */
export async function generateVanillaBaseline(
  input: VanillaBriefInput,
): Promise<VanillaBaselineResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured for vanilla baseline');
  }

  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const userPrompt = buildVanillaUserPrompt(input);
  const startedAt = Date.now();

  const response = await client.chat.completions.create({
    model: VANILLA_MODEL,
    max_tokens: 4096,
    temperature: 1.0, // GPT-4o vanille default — niet tunen, dat zou Branddock-effect zijn
    messages: [
      { role: 'system', content: VANILLA_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim() ?? '';
  if (!text) {
    throw new Error(`Vanilla baseline returned empty content (finish_reason=${response.choices[0]?.finish_reason})`);
  }

  return {
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    model: VANILLA_MODEL,
    generationMs: Date.now() - startedAt,
  };
}
