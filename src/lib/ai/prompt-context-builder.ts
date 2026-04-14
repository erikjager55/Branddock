// =============================================================
// Prompt Context Builder
//
// Appends brand context tags, Do's, and Don'ts to a user prompt
// for AI image generation. Used by the AI Studio generate route
// so every provider (Imagen, DALL-E, fal.ai, trained LoRAs)
// receives the same brand-aware prompt.
// =============================================================

export interface PromptContextParts {
  /** Raw user prompt */
  prompt: string;
  /** Selected brand context tags (e.g. "teal", "minimal", "confident") */
  brandTags?: string[];
  /** Optional resolved workspace brand summary */
  brandSummary?: string;
  /** "Do's" guideline — what MUST appear in the image */
  dos?: string;
  /** "Don'ts" guideline — what to AVOID */
  donts?: string;
}

/**
 * Build a final prompt by concatenating the user's prompt with
 * brand context and style guidelines. Returns the raw prompt
 * unchanged when no context is provided.
 */
export function buildPromptWithContext(parts: PromptContextParts): string {
  const segments: string[] = [parts.prompt.trim()];

  const tags = parts.brandTags?.map((t) => t.trim()).filter(Boolean) ?? [];
  if (tags.length > 0) {
    segments.push(`Brand essence: ${tags.join(', ')}.`);
  }

  if (parts.brandSummary?.trim()) {
    segments.push(parts.brandSummary.trim());
  }

  const dos = parts.dos?.trim();
  if (dos) {
    segments.push(`MUST include: ${dos}.`);
  }

  const donts = parts.donts?.trim();
  if (donts) {
    segments.push(`AVOID: ${donts}.`);
  }

  return segments.join(' ');
}
