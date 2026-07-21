import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

/**
 * AI analysis of chat feedback.
 *
 * Mirrors `analyze-bug.ts` but framed for UX/product feedback instead of
 * engineering debugging. Given the user's comment + sentiment + tags and
 * the assistant response they reacted to, Claude proposes a product/UX
 * improvement suggestion that the developer can review in the triage tab.
 *
 * Fire-and-forget from the POST handler — aiStatus progresses through
 * pending → analyzing → ready|failed and the triage tab polls for updates.
 */

const globalForFeedbackAnalysis = globalThis as unknown as {
  feedbackAnalysisClient: Anthropic | undefined;
};

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  if (!globalForFeedbackAnalysis.feedbackAnalysisClient) {
    globalForFeedbackAnalysis.feedbackAnalysisClient = new Anthropic({ apiKey });
  }
  return globalForFeedbackAnalysis.feedbackAnalysisClient;
}

const SYSTEM_PROMPT = `You are a senior product manager and UX writer reviewing user feedback on the Branddock Brand Assistant — an AI chat panel embedded in a Next.js SaaS app for brand strategy and content generation.

Given a feedback entry (sentiment, tags, comment) and the AI response the user was reacting to, suggest a concrete product improvement. Structure your response as:

1. **Root Issue** — What is the user actually unhappy (or happy) with? Quote the tell.
2. **Suggested Improvement** — One specific change to make: prompt tweak, UI affordance, scope adjustment, missing guardrail, etc.
3. **Priority & Effort** — Low/Medium/High impact, Low/Medium/High effort estimate.

Keep it concise and actionable. If the feedback is positive, suggest how to reinforce what worked. If negative, be specific about what to change — reference concrete parts of the response that caused the reaction. If the feedback is too vague to act on, say so and suggest the follow-up question the developer should ask the user.`;

export async function analyzeFeedback(feedbackId: string): Promise<void> {
  await prisma.chatFeedback.update({
    where: { id: feedbackId },
    data: { aiStatus: 'analyzing' },
  });

  try {
    const row = await prisma.chatFeedback.findUniqueOrThrow({
      where: { id: feedbackId },
      select: {
        page: true,
        sentiment: true,
        tags: true,
        comment: true,
        messageContent: true,
      },
    });

    const userPrompt = [
      `## Feedback`,
      `- **Sentiment**: ${row.sentiment}`,
      row.tags.length > 0 ? `- **Tags**: ${row.tags.join(', ')}` : null,
      row.page ? `- **Page**: ${row.page}` : null,
      '',
      `### User comment`,
      row.comment,
      '',
      row.messageContent
        ? [
            `### Assistant response they reacted to`,
            '```',
            row.messageContent.slice(0, 4000),
            '```',
          ].join('\n')
        : `### Assistant response\n(No message snapshot — general feedback.)`,
    ]
      .filter(Boolean)
      .join('\n');

    const client = getClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const suggestion = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    await prisma.chatFeedback.update({
      where: { id: feedbackId },
      data: { aiSuggestion: suggestion, aiStatus: 'ready' },
    });
  } catch (err) {
    console.error(`[feedback-analysis] Failed for ${feedbackId}:`, err);
    await prisma.chatFeedback
      .update({
        where: { id: feedbackId },
        data: { aiStatus: 'failed', aiSuggestion: `Analysis failed: ${String(err)}` },
      })
      .catch(() => {
        /* already in a bad state */
      });
  }
}
