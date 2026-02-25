// ─── AI Exploration LLM Client ──────────────────────────────
// Handles Claude calls for:
//  - generateNextQuestion: context-aware follow-up question
//  - generateFeedback: reaction to user's answer
// Uses Anthropic Claude Sonnet 4 as primary, no fallback needed.
// ────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';

// ─── Singleton ─────────────────────────────────────────────

const globalForAnthropic = globalThis as unknown as {
  explorationAnthropicClient: Anthropic | undefined;
};

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  if (!globalForAnthropic.explorationAnthropicClient) {
    globalForAnthropic.explorationAnthropicClient = new Anthropic({ apiKey });
  }
  return globalForAnthropic.explorationAnthropicClient;
}

const MODEL = 'claude-sonnet-4-20250514';

// ─── Types ─────────────────────────────────────────────────

interface QAPair {
  question: string;
  answer: string;
  dimensionKey: string;
}

interface DimensionDef {
  key: string;
  title: string;
  icon: string;
  question: string; // Fallback/seed question
}

// ─── System Prompt ─────────────────────────────────────────

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

// ─── Generate Next Question ────────────────────────────────

export async function generateNextQuestion(params: {
  itemType: string;
  itemName: string;
  itemContext: string;
  dimensions: DimensionDef[];
  currentDimension: DimensionDef;
  previousQA: QAPair[];
}): Promise<string> {
  const { itemType, itemName, itemContext, dimensions, currentDimension, previousQA } = params;

  const systemPrompt = buildExplorationSystemPrompt(itemType, itemName, itemContext, dimensions);

  // Build conversation history
  const messages: Anthropic.MessageParam[] = [];

  for (const qa of previousQA) {
    messages.push({ role: 'assistant', content: qa.question });
    messages.push({ role: 'user', content: qa.answer });
  }

  // Ask for next question
  messages.push({
    role: 'user',
    content: `Now ask a question about the "${currentDimension.title}" dimension. Focus on understanding this aspect of ${itemName}. Ask only ONE question.`,
  });

  try {
    const client = getClient();
    const response = await client.messages.create({
      model: MODEL,
      system: systemPrompt,
      messages,
      temperature: 0.7,
      max_tokens: 300,
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return text.trim() || currentDimension.question; // Fallback to seed question
  } catch (error) {
    console.error('[exploration-llm] generateNextQuestion failed:', error);
    return currentDimension.question; // Graceful fallback
  }
}

// ─── Generate Feedback ─────────────────────────────────────

export async function generateFeedback(params: {
  itemType: string;
  itemName: string;
  dimensionTitle: string;
  question: string;
  answer: string;
}): Promise<string> {
  const { itemType, itemName, dimensionTitle, question, answer } = params;

  try {
    const client = getClient();
    const response = await client.messages.create({
      model: MODEL,
      system: `You are a senior brand strategist. Give brief, encouraging feedback (1-2 sentences) on the user's answer about the "${dimensionTitle}" dimension of a ${itemType} called "${itemName}". Acknowledge what they said and highlight what's useful for brand strategy. Be warm and specific — reference their actual answer. Respond in English.`,
      messages: [
        { role: 'assistant', content: question },
        { role: 'user', content: answer },
        { role: 'user', content: 'Give brief feedback on my answer above.' },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return text.trim() || 'Great insight! This helps build a clearer picture.';
  } catch (error) {
    console.error('[exploration-llm] generateFeedback failed:', error);
    return 'Thank you for sharing that perspective. This is valuable input for the analysis.';
  }
}
