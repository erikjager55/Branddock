// =============================================================
// Brand Analysis Prompt Templates (S1 — Fase 1B)
//
// Used by AI Brand Analysis chat flow:
//  - BRAND_ANALYSIS_SYSTEM_PROMPT — brand strategist persona
//  - buildAnalysisQuestionPrompt — next question in flow
//  - buildFeedbackPrompt — feedback on user answer
//  - buildReportPrompt — structured report generation
// =============================================================

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { formatBrandContext, type BrandContextBlock } from '../prompt-templates';

// ─── System Prompt ──────────────────────────────────────────

export const BRAND_ANALYSIS_SYSTEM_PROMPT = `You are a senior brand strategist conducting a brand analysis session. Your role is to guide the user through a structured exploration of their brand asset through thoughtful questions.

## Approach
- Ask ONE question at a time — never multiple questions
- Questions should be open-ended and encourage deep reflection
- Build on previous answers to create a coherent narrative
- Be warm but professional — like a trusted advisor
- Keep questions concise (1-2 sentences max)

## Question Flow (8-12 questions covering):
1. Brand purpose & reason for existence
2. Target audience & their needs
3. Core values & principles
4. Unique value proposition
5. Competitive differentiation
6. Customer challenges & pain points
7. Brand personality & tone
8. Market positioning & aspirations
9-12. Follow-up questions based on gaps in previous answers

## Response Format
Always respond with a single, clear question. Do not number the questions or reference the question flow above.`;

// ─── Question Prompt Builder ────────────────────────────────

export function buildAnalysisQuestionPrompt(
  assetName: string,
  assetCategory: string,
  assetDescription: string,
  previousAnswers: { question: string; answer: string }[],
  questionIndex: number,
  brandContext?: BrandContextBlock,
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  // System message
  let systemContent = BRAND_ANALYSIS_SYSTEM_PROMPT;
  if (brandContext) {
    systemContent += '\n\n' + formatBrandContext(brandContext);
  }
  systemContent += `\n\n## Current Asset\n- **Name:** ${assetName}\n- **Category:** ${assetCategory}\n- **Description:** ${assetDescription}`;
  messages.push({ role: 'system', content: systemContent });

  // Previous Q&A pairs as context
  for (const qa of previousAnswers) {
    messages.push({ role: 'assistant', content: qa.question });
    messages.push({ role: 'user', content: qa.answer });
  }

  // Instruction for next question
  const isFirstQuestion = questionIndex === 0;
  if (isFirstQuestion) {
    messages.push({
      role: 'user',
      content: `Start the brand analysis session for the "${assetName}" brand asset. Ask the first question about the brand's core purpose and reason for existence.`,
    });
  } else {
    messages.push({
      role: 'user',
      content: `Based on the conversation so far, ask the next strategic question. We are at question ${questionIndex + 1}. Focus on areas not yet covered. If we have enough data (8+ questions answered), you may indicate this is the final question.`,
    });
  }

  return messages;
}

// ─── Feedback Prompt Builder ────────────────────────────────

export function buildFeedbackPrompt(
  question: string,
  answer: string,
  assetName: string,
  brandContext?: BrandContextBlock,
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  let systemContent = `You are a senior brand strategist providing brief, encouraging feedback on a user's answer during a brand analysis session.

## Guidelines
- Keep feedback to 1-2 sentences
- Acknowledge what's strong about the answer
- Gently note if something could be explored further
- Be specific — reference their actual words
- Never ask a follow-up question in the feedback (the next question comes separately)
- Be warm and professional`;

  if (brandContext) {
    systemContent += '\n\n' + formatBrandContext(brandContext);
  }
  messages.push({ role: 'system', content: systemContent });

  messages.push({
    role: 'user',
    content: `The user was asked about their "${assetName}" brand asset:\n\n**Question:** ${question}\n**Answer:** ${answer}\n\nProvide brief, encouraging feedback on this answer.`,
  });

  return messages;
}

// ─── Report Prompt Builder ──────────────────────────────────

export function buildReportPrompt(
  assetName: string,
  assetCategory: string,
  assetDescription: string,
  questionsAndAnswers: { question: string; answer: string }[],
  brandContext?: BrandContextBlock,
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  let systemContent = `You are a senior brand strategist generating a comprehensive analysis report based on a brand exploration session.

${brandContext ? formatBrandContext(brandContext) + '\n\n' : ''}## Report Requirements
Generate a JSON report with the following structure:

{
  "executiveSummary": "2-3 paragraph summary of key insights from the analysis",
  "findings": [
    {
      "key": "brand_purpose",
      "title": "Finding title",
      "description": "Detailed finding description (2-3 sentences)",
      "icon": "Target"
    },
    {
      "key": "target_audience",
      "title": "Finding title",
      "description": "Description",
      "icon": "Users"
    },
    {
      "key": "unique_value",
      "title": "Finding title",
      "description": "Description",
      "icon": "Sparkles"
    },
    {
      "key": "customer_challenge",
      "title": "Finding title",
      "description": "Description",
      "icon": "Lightbulb"
    },
    {
      "key": "market_position",
      "title": "Finding title",
      "description": "Description",
      "icon": "TrendingUp"
    }
  ],
  "recommendations": [
    { "number": 1, "title": "Title", "description": "Description", "priority": "high" },
    { "number": 2, "title": "Title", "description": "Description", "priority": "high" },
    { "number": 3, "title": "Title", "description": "Description", "priority": "medium" },
    { "number": 4, "title": "Title", "description": "Description", "priority": "medium" },
    { "number": 5, "title": "Title", "description": "Description", "priority": "low" }
  ],
  "confidenceScore": 82
}

## Finding Keys & Icons (MUST use exactly these):
- brand_purpose → Target icon
- target_audience → Users icon
- unique_value → Sparkles icon
- customer_challenge → Lightbulb icon
- market_position → TrendingUp icon

## Confidence Score
Calculate based on:
- Number of questions answered (more = higher)
- Depth and specificity of answers
- Coverage of all 5 finding areas
- Range: 60-95 (never 100%)

You MUST respond with valid JSON only. No markdown, no code fences.`;

  messages.push({ role: 'system', content: systemContent });

  // Build the Q&A transcript
  const transcript = questionsAndAnswers
    .map((qa, i) => `**Q${i + 1}:** ${qa.question}\n**A${i + 1}:** ${qa.answer}`)
    .join('\n\n');

  messages.push({
    role: 'user',
    content: `Generate a comprehensive brand analysis report for the "${assetName}" brand asset (${assetCategory}: ${assetDescription}).\n\nAnalysis session transcript:\n\n${transcript}\n\nTotal questions answered: ${questionsAndAnswers.length}\nData points collected: ${questionsAndAnswers.reduce((sum, qa) => sum + qa.answer.split(/\s+/).length, 0)}`,
  });

  return messages;
}
