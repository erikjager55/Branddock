// =============================================================
// Persona Prompt Builder
//
// Template engine that replaces {{variables}} in the system
// prompt template with actual persona data. Also handles
// the {{#if knowledgeContext}} conditional block.
// =============================================================

import type { Prisma } from '@prisma/client';

// ─── Types ─────────────────────────────────────────────────

/** Persona data used for prompt variable replacement */
export interface PersonaPromptData {
  name: string;
  tagline: string | null;
  age: string | null;
  gender: string | null;
  occupation: string | null;
  location: string | null;
  education: string | null;
  income: string | null;
  familyStatus: string | null;
  personalityType: string | null;
  coreValues: string[];
  interests: string[];
  goals: string[];
  motivations: string[];
  frustrations: string[];
  behaviors: string[];
}

/** Knowledge context item to inject into prompt */
export interface KnowledgeContextItem {
  sourceName: string;
  sourceType: string;
  contextData: Prisma.JsonValue;
}

// ─── Variable Map ──────────────────────────────────────────

function buildVariableMap(persona: PersonaPromptData): Record<string, string> {
  return {
    name: persona.name,
    description: persona.tagline || `A person named ${persona.name}`,
    ageRange: persona.age || 'Not specified',
    occupation: persona.occupation || 'Not specified',
    location: persona.location || 'Not specified',
    education: persona.education || 'Not specified',
    income: persona.income || 'Not specified',
    familyStatus: persona.familyStatus || 'Not specified',
    personalityType: persona.personalityType || 'Not specified',
    coreValues: formatList(persona.coreValues),
    interests: formatList(persona.interests),
    goals: formatList(persona.goals),
    motivations: formatList(persona.motivations),
    frustrations: formatList(persona.frustrations),
    behaviors: formatList(persona.behaviors),
  };
}

function formatList(items: string[]): string {
  if (items.length === 0) return 'Not specified';
  return items.join(', ');
}

// ─── Template Engine ───────────────────────────────────────

/**
 * Replace all {{variable}} placeholders in a template string
 * with values from the variable map.
 */
function replaceVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match; // keep original if no match
  });
}

/**
 * Handle {{#if knowledgeContext}} ... {{/if}} conditional blocks.
 * If knowledgeContext is provided and non-empty, replace the block
 * with its contents (with {{knowledgeContext}} replaced).
 * Otherwise, remove the entire block.
 */
function handleConditionalBlocks(
  template: string,
  knowledgeContextText: string | null,
): string {
  const conditionalRegex = /\{\{#if knowledgeContext\}\}([\s\S]*?)\{\{\/if\}\}/g;

  return template.replace(conditionalRegex, (_match, blockContent: string) => {
    if (knowledgeContextText) {
      return blockContent.replace(/\{\{knowledgeContext\}\}/g, knowledgeContextText);
    }
    return ''; // Remove entire block if no context
  });
}

// ─── Knowledge Context Formatter ───────────────────────────

/**
 * Format knowledge context items into readable text for the prompt.
 */
function formatKnowledgeContext(items: KnowledgeContextItem[]): string | null {
  if (items.length === 0) return null;

  return items
    .map((item) => {
      const typeLabel = formatSourceType(item.sourceType);
      const data = item.contextData as Record<string, unknown>;
      const details = formatContextData(item.sourceType, data);
      return `### ${typeLabel}: ${item.sourceName}\n${details}`;
    })
    .join('\n\n');
}

function formatSourceType(sourceType: string): string {
  const labels: Record<string, string> = {
    brand_asset: 'Brand Asset',
    product: 'Product',
    market_insight: 'Market Insight',
    knowledge_resource: 'Knowledge Resource',
    campaign: 'Campaign',
    deliverable: 'Deliverable',
    brandstyle: 'Brandstyle',
  };
  return labels[sourceType] || sourceType;
}

function formatContextData(sourceType: string, data: Record<string, unknown>): string {
  const lines: string[] = [];

  switch (sourceType) {
    case 'brand_asset':
      if (data.description) lines.push(String(data.description));
      if (data.status) lines.push(`Status: ${data.status}`);
      if (data.category) lines.push(`Category: ${data.category}`);
      break;
    case 'product':
      if (data.description) lines.push(String(data.description));
      if (data.category) lines.push(`Category: ${data.category}`);
      if (data.pricingModel) lines.push(`Pricing: ${data.pricingModel}`);
      if (data.features && Array.isArray(data.features)) {
        lines.push(`Key features: ${(data.features as string[]).join(', ')}`);
      }
      break;
    case 'market_insight':
      if (data.description) lines.push(String(data.description));
      if (data.impactLevel) lines.push(`Impact: ${data.impactLevel}`);
      if (data.scope) lines.push(`Scope: ${data.scope}`);
      break;
    case 'knowledge_resource':
      if (data.description) lines.push(String(data.description));
      if (data.category) lines.push(`Category: ${data.category}`);
      break;
    case 'campaign':
      if (data.description) lines.push(String(data.description));
      if (data.type) lines.push(`Type: ${data.type}`);
      if (data.status) lines.push(`Status: ${data.status}`);
      break;
    case 'deliverable':
      if (data.contentType) lines.push(`Content type: ${data.contentType}`);
      if (data.generatedText) {
        const snippet = String(data.generatedText).slice(0, 500);
        lines.push(`Content: ${snippet}`);
      }
      break;
    case 'brandstyle':
      if (data.toneOfVoice) lines.push(`Tone of voice: ${data.toneOfVoice}`);
      if (data.colors) lines.push(`Brand colors: ${data.colors}`);
      if (data.typography) lines.push(`Typography: ${data.typography}`);
      break;
    default:
      // Generic: dump all string values
      for (const [key, val] of Object.entries(data)) {
        if (typeof val === 'string') lines.push(`${key}: ${val}`);
      }
  }

  return lines.length > 0 ? lines.join('\n') : 'No additional details available.';
}

// ─── Public API ────────────────────────────────────────────

/**
 * Build the complete system prompt by:
 * 1. Replacing {{variables}} with persona data
 * 2. Handling {{#if knowledgeContext}} conditional blocks
 */
export function buildPersonaSystemPrompt(
  template: string,
  persona: PersonaPromptData,
  knowledgeContext?: KnowledgeContextItem[],
): string {
  const variables = buildVariableMap(persona);

  // First handle conditional blocks
  const contextText = knowledgeContext
    ? formatKnowledgeContext(knowledgeContext)
    : null;
  let prompt = handleConditionalBlocks(template, contextText);

  // Then replace remaining variables
  prompt = replaceVariables(prompt, variables);

  return prompt.trim();
}

/**
 * Default system prompt template.
 * Used when no PersonaChatConfig exists in the database.
 */
export const DEFAULT_PERSONA_CHAT_PROMPT = `You are {{name}}, a real person with your own perspective, experiences, and opinions. You are NOT an AI assistant — you are this specific individual.

## WHO YOU ARE

{{description}}

## YOUR DEMOGRAPHICS
- Age: {{ageRange}}
- Occupation: {{occupation}}
- Location: {{location}}
- Education: {{education}}
- Income level: {{income}}
- Family situation: {{familyStatus}}

## YOUR PERSONALITY
- Type: {{personalityType}}
- Core values: {{coreValues}}
- Interests: {{interests}}

## WHAT DRIVES YOU
Goals: {{goals}}
Motivations: {{motivations}}

## WHAT FRUSTRATES YOU
{{frustrations}}

## HOW YOU BEHAVE
{{behaviors}}

{{#if knowledgeContext}}
## ADDITIONAL CONTEXT
The following information has been shared with you for discussion:

{{knowledgeContext}}
{{/if}}

## CONVERSATION RULES
1. ALWAYS stay in character as {{name}}. Never break character or acknowledge being AI.
2. Respond naturally as this person would — use their vocabulary level, emotional tone, and perspective.
3. When asked about products, services, or brands: react authentically based on your goals, frustrations, and behaviors.
4. Share personal opinions and experiences. Be specific, not generic.
5. If something doesn't align with your values or needs, say so clearly and explain why.
6. Use natural conversational language. Avoid corporate jargon unless your occupation calls for it.
7. Show emotion where appropriate — enthusiasm, skepticism, frustration, excitement.
8. If you don't know something specific, respond as this person realistically would.
9. Keep responses conversational — typically 2-4 paragraphs unless more detail is asked for.
10. When discussing the additional context provided, reference specific details from it.`;
