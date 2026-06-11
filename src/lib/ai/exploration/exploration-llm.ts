// ─── AI Exploration LLM Client ──────────────────────────────
// Multi-provider support: Anthropic (Claude) + Google (Gemini)
// Provider/model selection via function parameters.
// ─────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { buildLocaleInstruction } from '@/lib/ai/locale-instruction';
import { isTempDeprecatedModel } from '@/lib/ai/anthropic-client';
import { DEFAULT_REPORT_PROMPT } from './config-resolver';
import { EXPLORATION_AI_MODELS } from './config.types';
import { resolveTemplate } from './prompt-engine';

// ─── Provider Types ─────────────────────────────────────────

export type ExplorationProvider = 'anthropic' | 'google';

export interface ExplorationModelConfig {
  provider: ExplorationProvider;
  model: string;
}

// ─── Available Models ───────────────────────────────────────

export const EXPLORATION_MODELS: {
  id: string;
  name: string;
  provider: ExplorationProvider;
  model: string;
  description: string;
}[] = [
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    description: 'Anthropic — Best for nuanced brand strategy',
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    description: 'Anthropic — Proven, reliable',
  },
  {
    id: 'gemini-3-1-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'google',
    model: 'gemini-3.1-pro-preview',
    description: 'Google — Advanced reasoning, cost-effective',
  },
];

export const DEFAULT_EXPLORATION_MODEL = EXPLORATION_MODELS[0]; // Claude Sonnet 4.6

// ─── Singleton Clients ──────────────────────────────────────

const globalForAnthropic = globalThis as unknown as {
  explorationAnthropicClient: Anthropic | undefined;
};

const globalForGoogle = globalThis as unknown as {
  explorationGoogleClient: InstanceType<typeof GoogleGenAI> | undefined;
};

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  if (!globalForAnthropic.explorationAnthropicClient) {
    globalForAnthropic.explorationAnthropicClient = new Anthropic({ apiKey });
  }
  return globalForAnthropic.explorationAnthropicClient;
}

function getGoogleClient(): InstanceType<typeof GoogleGenAI> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  if (!globalForGoogle.explorationGoogleClient) {
    globalForGoogle.explorationGoogleClient = new GoogleGenAI({ apiKey });
  }
  return globalForGoogle.explorationGoogleClient;
}

// ─── Types ──────────────────────────────────────────────────

interface QAPair {
  question: string;
  answer: string;
  dimensionKey: string;
}

interface DimensionDef {
  key: string;
  title: string;
  icon: string;
  question: string;
}

// ─── Core LLM Call (provider-agnostic) ──────────────────────

async function callLLM(params: {
  modelConfig: ExplorationModelConfig;
  systemPrompt: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const { modelConfig, systemPrompt, messages, temperature = 0.7, maxTokens = 300 } = params;

  if (modelConfig.provider === 'anthropic') {
    const client = getAnthropicClient();
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const isTempDeprecated = isTempDeprecatedModel(modelConfig.model);

    const response = await client.messages.create({
      model: modelConfig.model,
      system: systemPrompt,
      messages: anthropicMessages,
      ...(isTempDeprecated ? {} : { temperature }),
      max_tokens: maxTokens,
    });

    return response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
  }

  if (modelConfig.provider === 'google') {
    const client = getGoogleClient();

    // Build Gemini contents array: system instruction via config, then messages
    const geminiContents = messages.map((m) => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
    }));

    const response = await client.models.generateContent({
      model: modelConfig.model,
      contents: geminiContents,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    return response.text?.trim() ?? '';
  }

  throw new Error(`Unsupported provider: ${modelConfig.provider}`);
}

// ─── Report Types ───────────────────────────────────────────

interface ReportDimensionInsight {
  key: string;
  title: string;
  icon: string;
  summary: string;
}

interface ReportFinding {
  title: string;
  description: string;
}

interface ReportFieldSuggestion {
  field: string;
  label: string;
  suggestedValue: string | string[];
  reason: string;
}

export interface GeneratedReport {
  executiveSummary: string;
  dimensions: ReportDimensionInsight[];
  findings: ReportFinding[];
  recommendations: string[];
  fieldSuggestions: ReportFieldSuggestion[];
}

// ─── Report Prompt Config ───────────────────────────────────

/**
 * Slice of the resolved exploration config that drives report generation.
 * Structurally compatible with ExplorationConfigData, so builders can pass
 * the resolveExplorationConfig() result directly.
 */
export interface ReportPromptConfig {
  /** Admin-editable instruction template; blank falls back to DEFAULT_REPORT_PROMPT. */
  reportPrompt: string;
  /** Admin-configured model (EXPLORATION_MODELS id or raw model string). */
  model: string;
  temperature: number;
  maxTokens: number;
  customKnowledge: string;
  assetKnowledge: string;
}

/**
 * Resolve the effective report model.
 * Priority: explicit per-session choice → admin-config model → default.
 * Both are validated against the EXPLORATION_MODELS whitelist so a stale or
 * mistyped config value can never route to an unknown provider/model.
 */
function resolveReportModel(
  sessionModelId: string | null | undefined,
  configModel: string | null | undefined,
): ExplorationModelConfig {
  if (sessionModelId) {
    const bySession = EXPLORATION_MODELS.find((m) => m.id === sessionModelId);
    if (bySession) return bySession;
  }
  if (configModel) {
    const byConfig = EXPLORATION_MODELS.find((m) => m.id === configModel || m.model === configModel);
    if (byConfig) return byConfig;
    // The admin UI whitelists against EXPLORATION_AI_MODELS (raw SDK model
    // ids, incl. the seeded default claude-sonnet-4-20250514) — honor the
    // anthropic/google entries here too. OpenAI entries can't be honored:
    // callLLM has no openai path (ExplorationProvider excludes it).
    const adminModel = EXPLORATION_AI_MODELS.find((m) => m.id === configModel);
    if (adminModel && (adminModel.provider === 'anthropic' || adminModel.provider === 'google')) {
      return { provider: adminModel.provider, model: adminModel.id };
    }
    console.warn('[exploration-report] config.model not usable — falling back to default', {
      configModel,
      reason: adminModel ? 'openai not supported by report path' : 'not in any whitelist',
      fallback: DEFAULT_EXPLORATION_MODEL.model,
    });
  }
  return DEFAULT_EXPLORATION_MODEL;
}

// ─── Report Prompt Assembly ─────────────────────────────────

// CONTRACT (C12): the admin-editable config.reportPrompt supplies only the
// INSTRUCTION content of the report prompt (role, focus, framework guidance)
// via {{template}} variables. The JSON output shape ({ executiveSummary,
// dimensions, findings, recommendations, fieldSuggestions }) stays CODE-side
// — REPORT_RULES + REPORT_SHAPE_CONTRACT are appended after the template —
// because parseReportJSON() only understands that canonical shape. Seeded
// framework templates that promise extra keys (purposeScore,
// goldenCircleScore, …) keep working: the parser ignores unknown keys.

const REPORT_RULES = `## Rules
- Keep all JSON keys and identifier values ("key", "icon", "field") exactly as provided above — never translate identifiers
- Be specific and actionable — reference actual answers from the conversation
- Executive summary: 2-3 sentences synthesizing the key takeaway
- Dimension summaries: 1-2 sentences each, highlighting the most important insight from that dimension
- Findings: 5 key findings with title + description (1-2 sentences each)
- Recommendations: 5 strategic recommendations (1 sentence each)
- Field suggestions: suggest a value for EVERY field listed in "Updatable Fields" above. For fields that are empty, provide a value based on the conversation. For fields that already have a value, suggest an improved or refined version if the conversation reveals better content. Include the field key, label, suggested value, and a brief reason for each.
- CRITICAL: For fields with type "array", you MUST provide suggestedValue as a JSON array of strings, e.g. ["item1", "item2", "item3"]. NEVER return a comma-separated string for array fields.
- For fields with type "text" or "string", provide a single string as suggestedValue
- For object fields (like scores or slider positions), provide a JSON object as suggestedValue
- Respond ONLY with valid JSON, no markdown code blocks, no extra text`;

const REPORT_SHAPE_CONTRACT = `Generate a comprehensive analysis report as JSON with this exact structure:
{
  "executiveSummary": "...",
  "dimensions": [
    { "key": "...", "title": "...", "icon": "...", "summary": "..." }
  ],
  "findings": [
    { "title": "...", "description": "..." }
  ],
  "recommendations": ["...", "..."],
  "fieldSuggestions": [
    { "field": "fieldKey", "label": "Field Label", "suggestedValue": "..." or ["..."], "reason": "..." }
  ]
}`;

function buildReportPrompts(params: {
  template: string;
  itemType: string;
  itemName: string;
  itemContext: string;
  qaText: string;
  dimensionList: string;
  fieldList: string;
  brandContext: string;
  customKnowledge: string;
  assetKnowledge: string;
  language?: string;
}): { systemPrompt: string; userMessage: string } {
  const {
    template, itemType, itemName, itemContext, qaText,
    dimensionList, fieldList, brandContext, customKnowledge, assetKnowledge,
    language,
  } = params;
  const templateHas = (variable: string) => template.includes(`{{${variable}}}`);

  const instruction = resolveTemplate(template, {
    itemName,
    itemType,
    itemDescription: itemContext,
    allAnswers: qaText,
    brandContext,
    customKnowledge,
    assetKnowledge,
  });

  // Append code-side sections only when the template did not already consume
  // the equivalent variable — avoids feeding the model the same block twice.
  const itemSection = templateHas('itemDescription') ? '' : `\n## Item Context\n${itemContext}\n`;
  // Dedup per variable: a template consuming only ONE of the two knowledge
  // vars must not silently drop the other source.
  const leftoverKnowledge = [
    templateHas('customKnowledge') ? '' : customKnowledge,
    templateHas('assetKnowledge') ? '' : assetKnowledge,
  ].filter(Boolean).join('\n\n');
  const knowledgeSection = leftoverKnowledge
    ? `\n## Knowledge Sources\n${leftoverKnowledge}\n`
    : '';

  const systemPrompt = `${instruction}

${buildLocaleInstruction(language)}${itemSection}${knowledgeSection}
## Exploration Dimensions
${dimensionList}

## Updatable Fields
${fieldList}

${REPORT_RULES}`;

  // The conversation must reach the model exactly once: inside the template
  // when it consumes {{allAnswers}}, otherwise via the user message.
  const userMessage = templateHas('allAnswers')
    ? `The full exploration conversation is included in your instructions above.\n\n${REPORT_SHAPE_CONTRACT}`
    : `Here is the full exploration conversation:\n\n${qaText}\n\n${REPORT_SHAPE_CONTRACT}`;

  return { systemPrompt, userMessage };
}

// ─── Generate Report ────────────────────────────────────────

/**
 * Generate the exploration analysis report.
 *
 * The instruction content comes from the admin-editable config.reportPrompt
 * (fallback: DEFAULT_REPORT_PROMPT from the config-resolver); the JSON shape
 * contract is appended code-side — see CONTRACT comment above.
 */
export async function generateReport(params: {
  itemType: string;
  itemName: string;
  itemContext: string;
  dimensions: DimensionDef[];
  allQA: QAPair[];
  fieldMapping: { field: string; label: string; type: string; extractionHint?: string }[];
  currentFieldValues: Record<string, unknown>;
  /** Explicit per-session model choice (EXPLORATION_MODELS id); wins over config.model. */
  sessionModelId?: string | null;
  /** Resolved exploration config — supplies the report template + model/sampling settings. */
  config?: ReportPromptConfig;
  /** Pre-formatted brand context for the {{brandContext}} template variable. */
  brandContext?: string;
  /** ISO 639-1 workspace content language for the report output (defaults to English). */
  language?: string;
}): Promise<GeneratedReport> {
  const {
    itemType, itemName, itemContext, dimensions, allQA,
    fieldMapping, currentFieldValues,
    sessionModelId, config, brandContext = '',
    language = 'en',
  } = params;

  const qaText = allQA
    .map((qa, i) => `Q${i + 1} [${qa.dimensionKey}]: ${qa.question}\nA${i + 1}: ${qa.answer}`)
    .join('\n\n');

  const dimensionList = dimensions
    .map((d) => `- ${d.title} (key: ${d.key}, icon: ${d.icon})`)
    .join('\n');

  const fieldList = fieldMapping
    .map((f) => {
      const currentVal = currentFieldValues[f.field];
      const display = Array.isArray(currentVal) ? currentVal.join(', ') : (currentVal as string) ?? '(empty)';
      const hint = f.extractionHint ? ` [hint: ${f.extractionHint}]` : '';
      return `- ${f.label} (field: ${f.field}, type: ${f.type}): current value = "${display}"${hint}`;
    })
    .join('\n');

  const template = config?.reportPrompt.trim() ? config.reportPrompt : DEFAULT_REPORT_PROMPT;
  const modelConfig = resolveReportModel(sessionModelId, config?.model);

  const { systemPrompt, userMessage } = buildReportPrompts({
    template, itemType, itemName, itemContext, qaText,
    dimensionList, fieldList, brandContext,
    customKnowledge: config?.customKnowledge ?? '',
    assetKnowledge: config?.assetKnowledge ?? '',
    language,
  });

  // Reports regularly exceed the seeded 2048-token config default now that
  // truncation throws (F1) — consume the admin value but keep a 16k floor.
  const maxTokens = Math.max(config?.maxTokens ?? 0, 16000);

  console.log('[exploration-llm] generateReport: allQA pairs:', allQA.length, '| model:', modelConfig.model);

  try {
    const text = await callLLM({
      modelConfig,
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: config?.temperature ?? 0.4,
      maxTokens,
    });

    console.log('[exploration-llm] generateReport raw response length:', text.length);
    console.log('[exploration-llm] generateReport raw response (first 300 chars):', text.slice(0, 300));

    return parseReportJSON(text, dimensions);
  } catch (error) {
    console.error('[exploration-llm] generateReport failed:', error instanceof Error ? error.message : error);
    return buildFallbackReport(itemName, dimensions, allQA);
  }
}

// ─── Report JSON Parser ─────────────────────────────────────

/**
 * Serialize a suggestedValue from the LLM into a string or string[].
 * - Arrays of strings → string[] (pass through)
 * - Arrays of objects → JSON string (e.g. personality traits)
 * - Plain objects → JSON string (e.g. dimension scores, slider positions)
 * - Primitives → String()
 */
function serializeSuggestedValue(value: unknown): string | string[] {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    // Array of simple strings → keep as string[]
    if (value.every((v) => typeof v === 'string')) return value as string[];
    // Array of objects (e.g. personalityTraits) → serialize to JSON
    return JSON.stringify(value);
  }
  // Object (e.g. dimensionScores, spectrumSliders) → serialize to JSON
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function parseReportJSON(raw: string, dimensions: DimensionDef[]): GeneratedReport {
  let cleaned = raw.trim();

  // Strip markdown code blocks (```json ... ``` or ``` ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
  }

  cleaned = cleaned.trim();

  // Extract JSON object if there's extra text before/after
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseError) {
    console.error('[parseReportJSON] JSON parse failed:', parseError instanceof Error ? parseError.message : parseError);
    console.error('[parseReportJSON] Raw input (first 500 chars):', cleaned.slice(0, 500));
    throw parseError;
  }

  return {
    executiveSummary: String(parsed.executiveSummary || 'Analysis complete.'),
    dimensions: Array.isArray(parsed.dimensions)
      ? parsed.dimensions.map((d: Record<string, unknown>) => ({
          key: String(d.key || ''),
          title: String(d.title || ''),
          icon: String(d.icon || ''),
          summary: String(d.summary || ''),
        }))
      : dimensions.map((d) => ({ key: d.key, title: d.title, icon: d.icon, summary: 'Analysis complete.' })),
    findings: Array.isArray(parsed.findings)
      ? parsed.findings.slice(0, 5).map((f: Record<string, unknown>) => ({
          title: String(f.title || 'Finding'),
          description: String(f.description || ''),
        }))
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.slice(0, 5).map((r: unknown) => String(r))
      : [],
    fieldSuggestions: Array.isArray(parsed.fieldSuggestions)
      ? parsed.fieldSuggestions.map((s: Record<string, unknown>) => ({
          field: String(s.field || ''),
          label: String(s.label || ''),
          suggestedValue: serializeSuggestedValue(s.suggestedValue),
          reason: String(s.reason || ''),
        }))
      : [],
  };
}

// ─── Fallback Report ────────────────────────────────────────

function buildFallbackReport(
  itemName: string,
  dimensions: DimensionDef[],
  allQA: QAPair[],
): GeneratedReport {
  return {
    executiveSummary: `The AI analysis of ${itemName} has evaluated ${dimensions.length} strategic dimensions. Review the conversation for detailed insights.`,
    dimensions: dimensions.map((d) => ({
      key: d.key,
      title: d.title,
      icon: d.icon,
      summary: `Analysis of the ${d.title.toLowerCase()} dimension has been completed.`,
    })),
    findings: allQA.slice(0, 5).map((qa) => ({
      title: `Insight from ${qa.dimensionKey}`,
      description: qa.answer.slice(0, 200),
    })),
    recommendations: [
      `Review and refine ${itemName} based on the exploration insights`,
      'Validate findings with additional research methods',
      'Use the field suggestions to enrich the data model',
    ],
    fieldSuggestions: [],
  };
}

