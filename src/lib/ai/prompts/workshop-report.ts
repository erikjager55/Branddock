// =============================================================
// Workshop Report Prompt Templates (S2a — Sessie B)
//
// Used by workshop report generation:
//  - WORKSHOP_REPORT_SYSTEM_PROMPT — facilitator/strategist persona
//  - buildWorkshopReportPrompt — generates report from step responses
// =============================================================

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// ─── System Prompt ──────────────────────────────────────────

export const WORKSHOP_REPORT_SYSTEM_PROMPT = `You are a senior brand workshop facilitator and strategist generating a comprehensive workshop report. You analyze the responses captured during a structured Canvas Workshop session to produce actionable insights.

## Report Requirements
Generate a JSON report with the following structure:

{
  "executiveSummary": "2-3 paragraph summary of key workshop outcomes and insights",
  "findings": [
    { "content": "Key finding description (1-2 sentences)" }
  ],
  "recommendations": [
    { "content": "Actionable recommendation (1-2 sentences)", "isCompleted": false }
  ]
}

## Guidelines
- Executive summary should highlight alignment/misalignment between participants' views
- Include exactly 5 findings capturing the most important insights from the workshop
- Include exactly 4 recommendations, ordered by priority (most impactful first)
- Findings should be specific observations backed by the workshop responses
- Recommendations should be concrete, actionable next steps
- Reference specific themes and language from participant responses
- Be professional but warm — this was a collaborative workshop

You MUST respond with valid JSON only. No markdown, no code fences.`;

// ─── Report Prompt Builder ──────────────────────────────────

export function buildWorkshopReportPrompt(
  assetName: string,
  assetCategory: string,
  assetDescription: string,
  steps: { stepNumber: number; title: string; prompt: string | null; response: string | null }[],
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  messages.push({ role: 'system', content: WORKSHOP_REPORT_SYSTEM_PROMPT });

  // Build the step transcript
  const transcript = steps
    .filter((s) => s.response)
    .map(
      (s) =>
        `**Step ${s.stepNumber}: ${s.title}**\nPrompt: ${s.prompt ?? 'N/A'}\nResponse: ${s.response}`,
    )
    .join('\n\n');

  const completedSteps = steps.filter((s) => s.response).length;

  messages.push({
    role: 'user',
    content: `Generate a workshop report for the "${assetName}" brand asset (${assetCategory}: ${assetDescription}).

Workshop session transcript:

${transcript}

Steps completed: ${completedSteps} of ${steps.length}`,
  });

  return messages;
}
