// =============================================================
// Reference Prompt Builder
//
// Constructs brand-aware prompts for AI-generating reference
// images per ConsistentModel type. Uses the brand context
// snapshot stored on each model at creation time.
// =============================================================

import type { ModelBrandContext } from '@/features/consistent-models/types/consistent-model.types';
import type { ConsistentModelType } from '@prisma/client';

// ─── Types ──────────────────────────────────────────────────

export type ReferenceProvider = 'imagen' | 'dalle';

export interface ReferencePromptResult {
  prompts: string[];
  provider: ReferenceProvider;
}

// ─── Helpers ────────────────────────────────────────────────

function colorContext(ctx: ModelBrandContext): string {
  if (!ctx.brandColors?.length) return '';
  const colors = ctx.brandColors.map((c) => `${c.name} (${c.hex})`).join(', ');
  return `Brand colors: ${colors}.`;
}

function personalityContext(ctx: ModelBrandContext): string {
  const parts: string[] = [];
  if (ctx.brandPersonality) parts.push(ctx.brandPersonality);
  if (ctx.moodKeywords?.length) parts.push(`Mood: ${ctx.moodKeywords.join(', ')}`);
  return parts.join('. ');
}

function imageryContext(ctx: ModelBrandContext): string {
  const parts: string[] = [];
  if (ctx.brandImageryStyle) parts.push(ctx.brandImageryStyle);
  if (ctx.brandDesignLanguage) parts.push(ctx.brandDesignLanguage);
  return parts.join('. ');
}

function brandPrefix(ctx: ModelBrandContext): string {
  return ctx.brandName ? `for the brand "${ctx.brandName}"` : '';
}

// ─── Per-Type Prompt Builders ───────────────────────────────

function buildPersonPrompts(ctx: ModelBrandContext): string[] {
  const prefix = brandPrefix(ctx);
  const colors = colorContext(ctx);
  const personality = personalityContext(ctx);

  const personas = ctx.targetPersonas?.slice(0, 3) ?? [];
  const personaDescriptions = personas.map(
    (p) => `${p.name}${p.description ? ` (${p.description})` : ''}`
  );

  const prompts: string[] = [
    `Professional portrait photo of a confident business person ${prefix}. Clean studio lighting, neutral background. ${colors} ${personality}`.trim(),
    `Lifestyle portrait of a person in a modern workspace ${prefix}. Natural lighting, warm tones. The person looks approachable and professional. ${colors}`.trim(),
    `Environmental portrait of a person representing the brand ${prefix}. Shot in a contemporary setting. ${personality}`.trim(),
  ];

  if (personaDescriptions.length > 0) {
    prompts.push(
      `Portrait of a person matching the profile: ${personaDescriptions[0]}. Professional photography, brand-aligned setting. ${colors}`.trim()
    );
  }

  if (personas.length > 1) {
    prompts.push(
      `Portrait of a person matching the profile: ${personaDescriptions[1]}. Natural lighting, authentic expression. ${colors}`.trim()
    );
  }

  return prompts;
}

function buildProductPrompts(ctx: ModelBrandContext): string[] {
  const prefix = brandPrefix(ctx);
  const colors = colorContext(ctx);

  const products = ctx.productInfo?.slice(0, 3) ?? [];

  const prompts: string[] = [
    `Clean product photography ${prefix} on a minimal white background. Professional studio lighting, sharp focus. ${colors}`.trim(),
    `Product lifestyle shot ${prefix} showing the product in a real-world context. Warm natural lighting, styled environment. ${colors}`.trim(),
    `Hero product image ${prefix} with dramatic lighting and a premium feel. ${colors}`.trim(),
    `Product flat lay photography ${prefix}. Top-down view, styled arrangement, clean composition. ${colors}`.trim(),
  ];

  for (const product of products) {
    prompts.push(
      `Professional product photography of ${product.name}${product.description ? `: ${product.description}` : ''} ${prefix}. ${colors}`.trim()
    );
  }

  return prompts.slice(0, 6);
}

function buildStylePrompts(ctx: ModelBrandContext): string[] {
  const prefix = brandPrefix(ctx);
  const colors = colorContext(ctx);
  const personality = personalityContext(ctx);
  const imagery = imageryContext(ctx);

  return [
    `Abstract visual style reference ${prefix}. ${colors} ${personality} A cohesive visual language that captures the brand essence.`.trim(),
    `Brand mood board style image ${prefix}. ${imagery} Textured, layered composition showing the brand's visual identity.`.trim(),
    `Graphic design style reference ${prefix}. ${colors} Typography-inspired layout, bold composition. ${personality}`.trim(),
    `Visual identity reference ${prefix}. Patterns, textures, and color relationships that define the brand's aesthetic. ${colors}`.trim(),
    `Atmospheric brand imagery ${prefix}. ${imagery} ${personality} Evocative, editorial quality.`.trim(),
  ];
}

function buildObjectPrompts(ctx: ModelBrandContext): string[] {
  const prefix = brandPrefix(ctx);
  const colors = colorContext(ctx);

  const products = ctx.productInfo?.slice(0, 3) ?? [];

  const prompts: string[] = [
    `Studio product photography of a branded object ${prefix}. Clean background, professional lighting, detailed texture. ${colors}`.trim(),
    `Object photography ${prefix} with multiple angles. Sharp focus, neutral background. ${colors}`.trim(),
    `Close-up detail shot of an object ${prefix}. Macro perspective, emphasizing materials and craftsmanship. ${colors}`.trim(),
    `Object in context ${prefix}. Lifestyle setting, natural lighting, showing scale and use. ${colors}`.trim(),
  ];

  for (const product of products) {
    prompts.push(
      `Detailed object photography of ${product.name} ${prefix}. Studio lighting, white background. ${colors}`.trim()
    );
  }

  return prompts.slice(0, 6);
}

function buildBrandStylePrompts(ctx: ModelBrandContext): string[] {
  const prefix = brandPrefix(ctx);
  const colors = colorContext(ctx);
  const personality = personalityContext(ctx);
  const imagery = imageryContext(ctx);

  const competitors = ctx.competitors?.slice(0, 2) ?? [];
  const competitorContext = competitors.length
    ? `Differentiated from competitors: ${competitors.map((c) => c.name).join(', ')}.`
    : '';

  return [
    `Brand visual identity reference ${prefix}. ${colors} ${personality} A comprehensive visual style that reflects the brand's positioning.`.trim(),
    `Brand collateral style reference ${prefix}. ${imagery} Showing consistent use of brand elements across touchpoints.`.trim(),
    `Brand aesthetic reference ${prefix}. ${colors} Color palette, typography style, and design language in harmony. ${competitorContext}`.trim(),
    `Editorial brand imagery ${prefix}. ${imagery} Premium quality, cohesive brand expression. ${personality}`.trim(),
    `Brand pattern and texture reference ${prefix}. ${colors} Abstract visual elements that can be used across brand materials.`.trim(),
  ];
}

function buildPhotographyPrompts(ctx: ModelBrandContext): string[] {
  const prefix = brandPrefix(ctx);
  const colors = colorContext(ctx);
  const imagery = imageryContext(ctx);
  const personality = personalityContext(ctx);

  const personas = ctx.targetPersonas?.slice(0, 2) ?? [];

  const prompts: string[] = [
    `Photography style reference ${prefix}. ${imagery} Consistent lighting, color grading, and composition that defines the brand's photographic language.`.trim(),
    `Lifestyle photography ${prefix}. ${imagery} Authentic moments, natural lighting, brand-aligned color palette. ${colors}`.trim(),
    `Editorial brand photography ${prefix}. ${personality} Cinematic quality, intentional framing and post-processing. ${colors}`.trim(),
    `Environmental photography ${prefix}. ${imagery} Capturing the brand's world through consistent visual treatment.`.trim(),
  ];

  for (const persona of personas) {
    prompts.push(
      `Photography featuring someone like ${persona.name}${persona.description ? ` (${persona.description})` : ''} ${prefix}. ${imagery} ${colors}`.trim()
    );
  }

  return prompts.slice(0, 6);
}

function buildIllustrationPrompts(ctx: ModelBrandContext): string[] {
  const prefix = brandPrefix(ctx);
  const colors = colorContext(ctx);
  const imagery = imageryContext(ctx);
  const personality = personalityContext(ctx);

  const trends = ctx.trendInsights?.slice(0, 2) ?? [];
  const trendContext = trends.length
    ? `Reflecting trends: ${trends.map((t) => t.title).join(', ')}.`
    : '';

  return [
    `Illustration style reference ${prefix}. ${colors} ${imagery} A distinctive illustration style that captures the brand's personality.`.trim(),
    `Brand illustration of abstract concepts ${prefix}. ${personality} ${colors} Cohesive visual language, unique artistic approach.`.trim(),
    `Character illustration in brand style ${prefix}. ${colors} ${imagery} Friendly, approachable, consistent style.`.trim(),
    `Iconographic illustration ${prefix}. ${colors} Simple, recognizable forms. ${personality}`.trim(),
    `Scene illustration ${prefix}. ${imagery} ${trendContext} Narrative quality, brand-aligned palette. ${colors}`.trim(),
  ];
}

// ─── Main Builder ───────────────────────────────────────────

const PROMPT_BUILDERS: Record<string, (ctx: ModelBrandContext) => string[]> = {
  PERSON: buildPersonPrompts,
  PRODUCT: buildProductPrompts,
  STYLE: buildStylePrompts,
  OBJECT: buildObjectPrompts,
  BRAND_STYLE: buildBrandStylePrompts,
  PHOTOGRAPHY: buildPhotographyPrompts,
  ILLUSTRATION: buildIllustrationPrompts,
};

/**
 * Build brand-aware prompts for AI reference image generation.
 * Returns 3-6 prompts and a preferred provider per model type.
 */
export function buildReferencePrompts(
  brandContext: ModelBrandContext | null,
  modelType: ConsistentModelType,
): ReferencePromptResult {
  const ctx = brandContext ?? {
    type: modelType,
    resolvedAt: new Date().toISOString(),
    contextSummary: '',
  };

  const builder = PROMPT_BUILDERS[modelType];
  if (!builder) {
    return {
      prompts: [
        `Professional reference image for a ${modelType.toLowerCase().replace(/_/g, ' ')} model. High quality, clean composition.`,
      ],
      provider: 'imagen',
    };
  }

  const prompts = builder(ctx);

  // Imagen is preferred — higher quality for brand imagery.
  // DALL-E is better for more creative/artistic styles.
  const provider: ReferenceProvider =
    modelType === 'ILLUSTRATION' ? 'dalle' : 'imagen';

  return { prompts, provider };
}
