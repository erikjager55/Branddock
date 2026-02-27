import { getBrandContext } from '@/lib/ai/brand-context';

// ─── Template Variables ────────────────────────────────────

interface TemplateVars {
  itemName?: string;
  itemDescription?: string;
  itemType?: string;
  brandName?: string;
  brandContext?: string;
  customKnowledge?: string;
  dimensionTitle?: string;
  questionAsked?: string;
  userAnswer?: string;
  allAnswers?: string;
  [key: string]: string | undefined;
}

/**
 * Replace {{variable}} placeholders in a template string
 */
export function resolveTemplate(template: string, vars: TemplateVars): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value ?? '');
  }
  return result;
}

/**
 * Build brand context string for prompts
 */
export async function buildBrandContextString(workspaceId: string): Promise<string> {
  try {
    const ctx = await getBrandContext(workspaceId);
    const parts: string[] = [];
    if (ctx.brandName) parts.push(`Brand: ${ctx.brandName}`);
    if (ctx.brandMission) parts.push(`Mission: ${ctx.brandMission}`);
    if (ctx.brandVision) parts.push(`Vision: ${ctx.brandVision}`);
    if (ctx.brandValues) parts.push(`Values: ${(ctx.brandValues as string[]).join(', ')}`);
    if (ctx.targetAudience) parts.push(`Target Audience: ${ctx.targetAudience}`);
    if (ctx.productsOverview) parts.push(`Products: ${ctx.productsOverview}`);
    return parts.length > 0 ? `## Brand Context\n${parts.join('\n')}` : '';
  } catch {
    return '';
  }
}

/**
 * Format all Q&A pairs for the report prompt
 */
export function formatAllAnswers(
  messages: Array<{ type: string; content: string; metadata: Record<string, unknown> | null }>,
): string {
  const pairs: string[] = [];
  let currentQuestion = '';
  let currentDimension = '';

  for (const msg of messages) {
    if (msg.type === 'AI_QUESTION') {
      currentQuestion = msg.content;
      currentDimension = (msg.metadata?.dimensionTitle as string) ?? '';
    }
    if (msg.type === 'USER_ANSWER' && currentQuestion) {
      pairs.push(`### ${currentDimension}\n**Q:** ${currentQuestion}\n**A:** ${msg.content}`);
      currentQuestion = '';
    }
  }

  return pairs.join('\n\n');
}
