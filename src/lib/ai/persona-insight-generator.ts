// =============================================================
// Persona Insight Generator
//
// Extracts structured insights from persona chat messages
// using the configured LLM (Anthropic primary, OpenAI fallback).
// Returns a single insight per message as structured JSON.
// =============================================================

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// ─── Types ─────────────────────────────────────────────────

export type InsightType =
  | 'pain_point'
  | 'opportunity'
  | 'preference'
  | 'behavior'
  | 'need'
  | 'objection'
  | 'motivation';

export type InsightSeverity = 'high' | 'medium' | 'low';

export interface ExtractedInsight {
  type: InsightType;
  title: string;
  content: string;
  severity: InsightSeverity;
}

export interface InsightExtractionParams {
  contextMessages: { role: string; content: string }[];
  targetMessage: string;
  provider: string;
  model: string;
}

// ─── Prompt ────────────────────────────────────────────────

function buildInsightPrompt(
  contextMessages: { role: string; content: string }[],
  targetMessage: string,
): string {
  const contextText = contextMessages
    .map((m) => `[${m.role}]: ${m.content}`)
    .join('\n');

  return `Analyze the following conversation exchange between a user and a persona.
Extract ONE key insight from the persona's response.

Context messages:
${contextText}

Persona response to analyze:
${targetMessage}

Respond in JSON format:
{
  "type": "pain_point" | "opportunity" | "preference" | "behavior" | "need" | "objection" | "motivation",
  "title": "Short 5-10 word summary",
  "content": "2-3 sentence detailed description of the insight and its implications for brand strategy",
  "severity": "high" | "medium" | "low"
}

Rules:
- Focus on actionable insights for brand strategy
- Be specific, reference what the persona actually said
- "high" severity = directly impacts purchase decision or brand perception
- "medium" severity = influences preference or consideration
- "low" severity = nice-to-know, minor preference
- Return ONLY the JSON object, no markdown code blocks or extra text`;
}

// ─── LLM Calls ─────────────────────────────────────────────

async function extractWithAnthropic(
  prompt: string,
  model: string,
): Promise<ExtractedInsight> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    system: 'You are a brand strategy analyst. You extract actionable insights from persona conversations. Always respond with valid JSON only.',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 500,
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
  return parseInsightJSON(text);
}

async function extractWithOpenAI(
  prompt: string,
  model: string,
): Promise<ExtractedInsight> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a brand strategy analyst. You extract actionable insights from persona conversations. Always respond with valid JSON only.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const text = response.choices[0]?.message?.content ?? '';
  return parseInsightJSON(text);
}

// ─── JSON Parser ───────────────────────────────────────────

const VALID_TYPES: InsightType[] = [
  'pain_point', 'opportunity', 'preference', 'behavior',
  'need', 'objection', 'motivation',
];

const VALID_SEVERITIES: InsightSeverity[] = ['high', 'medium', 'low'];

function parseInsightJSON(raw: string): ExtractedInsight {
  // Strip markdown code blocks if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(cleaned);

  // Validate and sanitize
  const type = VALID_TYPES.includes(parsed.type) ? parsed.type : 'behavior';
  const severity = VALID_SEVERITIES.includes(parsed.severity) ? parsed.severity : 'medium';

  return {
    type,
    title: String(parsed.title || 'Untitled insight').slice(0, 200),
    content: String(parsed.content || 'No description available.').slice(0, 2000),
    severity,
  };
}

// ─── Public API ────────────────────────────────────────────

/**
 * Extract a structured insight from a persona chat message.
 * Uses Anthropic as primary provider with OpenAI fallback.
 */
export async function generateInsightFromMessage(
  params: InsightExtractionParams,
): Promise<ExtractedInsight> {
  const prompt = buildInsightPrompt(params.contextMessages, params.targetMessage);
  const provider = params.provider || 'anthropic';

  if (provider === 'anthropic') {
    try {
      return await extractWithAnthropic(prompt, params.model);
    } catch (err) {
      // Fallback to OpenAI
      if (process.env.OPENAI_API_KEY) {
        console.warn(
          '[insight-generator] Anthropic failed, falling back to OpenAI:',
          err instanceof Error ? err.message : err,
        );
        return await extractWithOpenAI(prompt, 'gpt-4o');
      }
      throw err;
    }
  }

  return await extractWithOpenAI(prompt, params.model);
}
