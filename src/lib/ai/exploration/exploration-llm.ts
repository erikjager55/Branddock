// ─── AI Exploration LLM Client ──────────────────────────────
// Multi-provider support: Anthropic (Claude) + Google (Gemini)
// Provider/model selection via function parameters.
// ─────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

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

    const response = await client.messages.create({
      model: modelConfig.model,
      system: systemPrompt,
      messages: anthropicMessages,
      temperature,
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

// ─── System Prompt Builder ──────────────────────────────────

function buildExplorationSystemPrompt(
  itemType: string,
  itemName: string,
  itemContext: string,
  dimensions: DimensionDef[],
): string {
  const dimensionList = dimensions
    .map((d, i) => `${i + 1}. ${d.title} (key: ${d.key})`)
    .join('\n');

  return `You are a senior brand strategist conducting an AI-guided exploration session for a ${itemType} called "${itemName}".

## Item Context
${itemContext}

## Exploration Dimensions
${dimensionList}

## Rules
- Ask ONE clear, open-ended question at a time
- Build on previous answers — reference what the user said
- Be warm but professional, like a trusted advisor
- Keep questions concise (1-2 sentences max)
- Focus on actionable insights for brand strategy
- Questions should be in English`;
}

// ─── Generate Next Question ─────────────────────────────────

export async function generateNextQuestion(params: {
  itemType: string;
  itemName: string;
  itemContext: string;
  dimensions: DimensionDef[];
  currentDimension: DimensionDef;
  previousQA: QAPair[];
  modelConfig?: ExplorationModelConfig;
}): Promise<string> {
  const {
    itemType, itemName, itemContext, dimensions,
    currentDimension, previousQA,
    modelConfig = DEFAULT_EXPLORATION_MODEL,
  } = params;

  const systemPrompt = buildExplorationSystemPrompt(itemType, itemName, itemContext, dimensions);

  const messages: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const qa of previousQA) {
    messages.push({ role: 'assistant', content: qa.question });
    messages.push({ role: 'user', content: qa.answer });
  }
  messages.push({
    role: 'user',
    content: `Now ask a question about the "${currentDimension.title}" dimension. Focus on understanding this aspect of ${itemName}. Ask only ONE question.`,
  });

  try {
    const text = await callLLM({ modelConfig, systemPrompt, messages, temperature: 0.7, maxTokens: 300 });
    return text || currentDimension.question;
  } catch (error) {
    console.error('[exploration-llm] generateNextQuestion failed:', error);
    return currentDimension.question;
  }
}

// ─── Generate Feedback ──────────────────────────────────────

export async function generateFeedback(params: {
  itemType: string;
  itemName: string;
  dimensionTitle: string;
  question: string;
  answer: string;
  modelConfig?: ExplorationModelConfig;
}): Promise<string> {
  const {
    itemType, itemName, dimensionTitle, question, answer,
    modelConfig = DEFAULT_EXPLORATION_MODEL,
  } = params;

  const systemPrompt = `You are a senior brand strategist. Give brief, encouraging feedback (1-2 sentences) on the user's answer about the "${dimensionTitle}" dimension of a ${itemType} called "${itemName}". Acknowledge what they said and highlight what's useful for brand strategy. Be warm and specific — reference their actual answer. Respond in English.`;

  try {
    const text = await callLLM({
      modelConfig,
      systemPrompt,
      messages: [
        { role: 'assistant', content: question },
        { role: 'user', content: answer },
        { role: 'user', content: 'Give brief feedback on my answer above.' },
      ],
      temperature: 0.7,
      maxTokens: 200,
    });
    return text || 'Great insight! This helps build a clearer picture.';
  } catch (error) {
    console.error('[exploration-llm] generateFeedback failed:', error);
    return 'Thank you for sharing that perspective. This is valuable input for the analysis.';
  }
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

// ─── Generate Report ────────────────────────────────────────

export async function generateReport(params: {
  itemType: string;
  itemName: string;
  itemContext: string;
  dimensions: DimensionDef[];
  allQA: QAPair[];
  fieldMapping: { field: string; label: string; type: string }[];
  currentFieldValues: Record<string, unknown>;
  modelConfig?: ExplorationModelConfig;
}): Promise<GeneratedReport> {
  const {
    itemType, itemName, itemContext, dimensions, allQA,
    fieldMapping, currentFieldValues,
    modelConfig = DEFAULT_EXPLORATION_MODEL,
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
      return `- ${f.label} (field: ${f.field}, type: ${f.type}): current value = "${display}"`;
    })
    .join('\n');

  const systemPrompt = `You are a senior brand strategist producing an analysis report for a ${itemType} called "${itemName}".

## Item Context
${itemContext}

## Exploration Dimensions
${dimensionList}

## Updatable Fields
${fieldList}

## Rules
- Write in English
- Be specific and actionable — reference actual answers from the conversation
- Executive summary: 2-3 sentences synthesizing the key takeaway
- Dimension summaries: 1-2 sentences each, highlighting the most important insight from that dimension
- Findings: 5 key findings with title + description (1-2 sentences each)
- Recommendations: 5 strategic recommendations (1 sentence each)
- Field suggestions: suggest updates ONLY for fields that are empty or could be meaningfully improved based on the conversation. Include the field key, label, suggested value, and a brief reason.
- For string[] fields, provide an array of strings as suggestedValue
- For string fields, provide a single string as suggestedValue
- Respond ONLY with valid JSON, no markdown code blocks, no extra text`;

  const userMessage = `Here is the full exploration conversation:\n\n${qaText}\n\nGenerate a comprehensive analysis report as JSON with this exact structure:
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

  console.log('[exploration-llm] generateReport: allQA pairs:', allQA.length, '| model:', modelConfig.model);

  try {
    const text = await callLLM({
      modelConfig,
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.4,
      maxTokens: 4000,
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
          suggestedValue: (Array.isArray(s.suggestedValue) ? s.suggestedValue.map(String) : String(s.suggestedValue ?? '')),
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

// ─── Resolve Model Config ───────────────────────────────────

/** Look up full model config from a model ID string (e.g. 'claude-sonnet-4-6') */
export function resolveModelConfig(modelId: string | null | undefined): ExplorationModelConfig {
  if (!modelId) return DEFAULT_EXPLORATION_MODEL;
  const found = EXPLORATION_MODELS.find((m) => m.id === modelId);
  return found ?? DEFAULT_EXPLORATION_MODEL;
}
