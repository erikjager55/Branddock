/**
 * Shared mapping from Visual Brief style chips to concrete prompt-side
 * instructions. Used by:
 *
 *   1. canvas-orchestrator.ts — to inject image-side composition rules into
 *      the imagePrompt builder when text-gen runs (legacy path, currently
 *      unused server-side but kept wired).
 *
 *   2. /api/studio/[id]/generate-visual — to build the actual image prompts
 *      that go to Imagen / DALL-E / fal.ai when the user clicks the
 *      "Generate visual" button on Canvas Step 2.
 *
 * Both call sites need the same chip → instruction translation; centralising
 * it here keeps them in sync without bouncing through canvas-orchestrator's
 * internals.
 */

import type { VisualBrief, VisualStyleDirection } from './canvas-context';
import type { BrandContextBlock } from './prompt-templates';

export const VISUAL_STYLE_IMAGE_INSTRUCTIONS: Record<VisualStyleDirection, string> = {
  lifestyle:
    'Lifestyle photography: real people in authentic situations using the product/service. Natural lighting, candid composition, environmental context. Avoid posed studio shots.',
  'product-shot':
    'Clean product photography: isolated subject on simple background, controlled studio lighting, hero composition. Focus is the product itself with crisp details.',
  'quote-text':
    'Typography-led design: large quote / phrase as the focal point. Brand colors for accent. Minimal supporting imagery. Geometric or solid background.',
  'behind-the-scenes':
    'Documentary photography: candid team / workspace / process shots. Available light, slight grain, real moments. Not glossy or staged.',
  ugc: 'User-generated style: handheld phone composition, natural light, slight imperfection. Authentic and unpolished. Avoid professional studio polish.',
  infographic:
    'Information graphic: data viz, icons, structured layout. Clear visual hierarchy. Brand colors for accent on data points. Minimal decoration.',
  illustration:
    'Illustrated artwork: drawn or vector style. Confident lines, on-brand color palette. Can be conceptual / metaphorical. Not photorealistic.',
  'data-driven':
    'Editorial chart-led layout: prominent data viz (chart/graph) as the hero. Headline number large. Minimal accompanying decoration. Magazine-quality.',
};

/**
 * Compact brand-visual identity stub for prompt injection. Pulls only the
 * fields that affect image composition (colors, photography style, design
 * language). Returns an empty string when nothing is set.
 */
export function formatBrandVisualIdentity(brand: BrandContextBlock): string {
  const parts = [
    brand.brandColors ? `Brand colors: ${brand.brandColors}` : '',
    brand.brandImageryStyle ? `Imagery style: ${brand.brandImageryStyle}` : '',
    brand.brandVisualSystem
      ? `Visual system: ${brand.brandVisualSystem}`
      : brand.brandDesignLanguage
        ? `Design language: ${brand.brandDesignLanguage}`
        : '',
  ].filter(Boolean);
  return parts.join('. ');
}

/**
 * Build N distinct image prompts from a Visual Brief + brand context +
 * subject hints. Used when the user explicitly triggers "Generate visual"
 * on Step 2 — produces 2 variations the user can pick between.
 *
 * The variation is structural rather than stylistic: prompt A is a
 * close-up / direct take on the subject, prompt B is a wider /
 * environmental composition. Both inherit the same chip mapping +
 * brand identity so they stay on-brand but feel distinct.
 */
export function buildVisualBriefImagePrompts(
  brief: VisualBrief,
  brand: BrandContextBlock,
  subject: { keyMessage: string | null; objective: string | null },
  count = 2,
): string[] {
  const chip = brief.styleDirection;
  const styleInstruction = chip ? VISUAL_STYLE_IMAGE_INSTRUCTIONS[chip] : '';
  const freeText = brief.styleDirectionFreeText?.trim() ?? '';
  const visualIdentity = formatBrandVisualIdentity(brand);

  // Subject seed — what the image should depict. Falls back to brand name
  // when neither key message nor objective is set, since Imagen/DALL-E
  // need *something* concrete.
  const subjectSeed = subject.keyMessage?.trim()
    ?? subject.objective?.trim()
    ?? `Brand visual for ${brand.brandName}`;

  // Two compositional angles per chip — "close" focuses on the subject;
  // "wide" pulls back for environmental context. Both same chip, same
  // brand, different framing.
  const angles = [
    'Close composition: subject prominent, fills most of the frame.',
    'Wider composition: subject in environmental context with negative space.',
    'Detail-focused: tight crop on the most expressive element.',
  ];

  const promptCount = Math.max(1, Math.min(count, angles.length));
  const prompts: string[] = [];
  for (let i = 0; i < promptCount; i++) {
    const parts = [
      styleInstruction,
      `Subject: ${subjectSeed}.`,
      angles[i],
      freeText,
      visualIdentity,
    ].filter(Boolean);
    prompts.push(parts.join(' '));
  }
  return prompts;
}
