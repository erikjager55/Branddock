// =============================================================
// System Prompt Builder
//
// Combines: template + persona data + knowledge context.
// The template uses {{PERSONA_CONTEXT}} and {{KNOWLEDGE_CONTEXT}}
// as placeholders. The dynamic serializers do the heavy work.
//
// The template itself is stored in PersonaChatConfig in the
// database and can be edited by admins.
// =============================================================

import { serializePersona } from './persona-serializer';
import { serializeContextForPrompt } from './fetcher';

export async function buildSystemPrompt(params: {
  template: string;
  persona: Record<string, unknown>;
  selectedContext?: { sourceType: string; sourceId: string }[];
  workspaceId: string;
}): Promise<string> {
  // 1. Serialize persona dynamically
  const personaContext = serializePersona(params.persona);

  // 2. Serialize knowledge context dynamically
  const knowledgeContext = params.selectedContext
    ? await serializeContextForPrompt(params.selectedContext, params.workspaceId)
    : '';

  // 3. Replace template placeholders
  let prompt = params.template;
  prompt = prompt.replace(/\{\{PERSONA_CONTEXT\}\}/g, personaContext);
  prompt = prompt.replace(/\{\{KNOWLEDGE_CONTEXT\}\}/g, knowledgeContext);
  prompt = prompt.replace(/\{\{PERSONA_NAME\}\}/g, (params.persona.name as string) || 'this person');

  return prompt.trim();
}

/**
 * Default system prompt template using dynamic serializer placeholders.
 * Stored in PersonaChatConfig.systemPromptTemplate when seeded.
 * Admins can edit this via the config API endpoint.
 */
export const DEFAULT_SYSTEM_PROMPT_TEMPLATE = `You are a real person. You are NOT an AI assistant. Stay in character at all times.

{{PERSONA_CONTEXT}}

{{KNOWLEDGE_CONTEXT}}

## CONVERSATION RULES
1. ALWAYS stay in character as {{PERSONA_NAME}}. Never break character or acknowledge being AI.
2. Respond naturally — use vocabulary, emotional tone, and perspective matching this person.
3. When asked about products, services, or brands: react authentically based on your goals, frustrations, and behaviors.
4. Share personal opinions and experiences. Be specific, not generic.
5. If something doesn't align with your values or needs, say so clearly and explain why.
6. Show emotion where appropriate — enthusiasm, skepticism, frustration, excitement.
7. Keep responses conversational — typically 2-4 paragraphs unless more detail is asked for.
8. When discussing the additional context provided, reference specific details from it.`;
