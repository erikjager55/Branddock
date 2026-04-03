// =============================================================
// Reference Prompt Builder
//
// Constructs brand-aware prompts for AI-generating reference
// images per ConsistentModel type. Uses brand tags selected by
// the user and type-specific config fields.
// =============================================================

import type { ModelBrandContext } from '@/features/consistent-models/types/consistent-model.types';
import type { ConsistentModelType } from '@prisma/client';

// ─── Types ──────────────────────────────────────────────────

export interface ReferencePromptResult {
  prompts: string[];
}

// ─── Brand Tag Extraction ───────────────────────────────────

/**
 * Extract deduplicated brand keywords from a ModelBrandContext snapshot.
 * Returns 10-30 tags drawn from personality, tone, mood, colors,
 * design language, and imagery style fields.
 */
export function extractBrandTags(ctx: ModelBrandContext | null): string[] {
  if (!ctx) return [];

  const raw: string[] = [];

  // brandPersonality — comma/newline separated phrases
  if (ctx.brandPersonality) {
    raw.push(...splitField(ctx.brandPersonality));
  }

  // toneOfVoice — comma/newline separated
  if (ctx.toneOfVoice) {
    raw.push(...splitField(ctx.toneOfVoice));
  }

  // moodKeywords — already an array
  if (ctx.moodKeywords?.length) {
    raw.push(...ctx.moodKeywords);
  }

  // brandColors — map to descriptive labels
  if (ctx.brandColors?.length) {
    for (const c of ctx.brandColors) {
      if (c.name) raw.push(c.name);
    }
  }

  // brandDesignLanguage — comma/newline separated
  if (ctx.brandDesignLanguage) {
    raw.push(...splitField(ctx.brandDesignLanguage));
  }

  // brandImageryStyle — comma/newline separated
  if (ctx.brandImageryStyle) {
    raw.push(...splitField(ctx.brandImageryStyle));
  }

  // Deduplicate (case-insensitive), trim, filter empties, sort
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of raw) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    result.push(trimmed);
  }

  return result.sort((a, b) => a.localeCompare(b));
}

function splitField(value: string): string[] {
  return value.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
}

// ─── Prompt Building ────────────────────────────────────────

/**
 * Build brand-aware prompts for AI reference image generation.
 *
 * @param brandTags - User-selected brand keywords (from extractBrandTags + user edits)
 * @param typeConfig - Type-specific field values (e.g. subjectDescription, setting, avoid)
 * @param modelType - The ConsistentModel type
 * @returns 10+ diverse prompts
 */
export function buildReferencePrompts(
  brandTags: string[],
  typeConfig: Record<string, string>,
  modelType: ConsistentModelType,
): ReferencePromptResult {
  const brandEssence = brandTags.length > 0
    ? `Brand essence: ${brandTags.join(', ')}.`
    : '';

  const builder = PROMPT_BUILDERS[modelType];
  if (!builder) {
    return {
      prompts: [
        `Professional reference image for a ${modelType.toLowerCase().replace(/_/g, ' ')} model. High quality, clean composition. ${brandEssence}`.trim(),
      ],
    };
  }

  return { prompts: builder(brandEssence, typeConfig) };
}

// ─── Helpers ────────────────────────────────────────────────

function configContext(typeConfig: Record<string, string>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(typeConfig)) {
    if (!value?.trim()) continue;
    if (key === 'avoid') continue; // handled separately
    const label = key.replace(/([A-Z])/g, ' $1').trim();
    parts.push(`${label}: ${value.trim()}`);
  }
  return parts.join('. ');
}

function avoidClause(typeConfig: Record<string, string>): string {
  const avoid = typeConfig.avoid?.trim();
  return avoid ? `Do NOT include: ${avoid}.` : '';
}

// ─── Per-Type Prompt Builders ───────────────────────────────

function buildPersonPrompts(brand: string, tc: Record<string, string>): string[] {
  const avoid = avoidClause(tc);

  // Build physical description from structured fields
  const parts: string[] = [];
  if (tc.gender?.trim()) parts.push(tc.gender.trim());
  if (tc.ethnicity?.trim()) parts.push(tc.ethnicity.trim());
  if (tc.age?.trim()) parts.push(`in their ${tc.age.trim()}`);
  if (tc.build?.trim()) parts.push(`${tc.build.trim()} build`);
  if (tc.hairColor?.trim() && tc.hairColor !== 'bald') parts.push(`${tc.hairColor.trim()} hair`);
  if (tc.hairColor === 'bald') parts.push('bald/shaved head');
  if (tc.hairStyle?.trim() && tc.hairColor !== 'bald') parts.push(`${tc.hairStyle.trim()} hairstyle`);
  const clothing = tc.clothing?.trim() || '';
  const clothingClause = clothing ? `, wearing ${clothing}` : '';

  const subject = parts.length > 0
    ? `a ${parts.join(', ')} person${clothingClause}`
    : `a professional person${clothingClause}`;

  // Global negative: no text, no watermarks, no logos, person must be the clear subject
  const noText = 'Absolutely no text, no words, no letters, no watermarks, no logos anywhere in the image.';
  const personFocus = 'The person must be the clear focal point, filling most of the frame. Minimal background distractions.';

  return [
    `Professional headshot portrait of ${subject}. Clean studio lighting, solid neutral background. Face and upper body sharp and well-lit. ${personFocus} ${noText} ${brand} ${avoid}`.trim(),
    `Close-up portrait of ${subject}. Soft directional light, shallow depth of field, blurred simple background. Eye-level, natural confident expression. ${personFocus} ${noText} ${brand} ${avoid}`.trim(),
    `Three-quarter view portrait of ${subject}. Warm soft lighting from the side. Head and shoulders framing, clean out-of-focus backdrop. ${personFocus} ${noText} ${brand} ${avoid}`.trim(),
    `Portrait photo of ${subject} with a slight smile. Natural window light, simple white or light gray background. Tight crop on face and chest. ${personFocus} ${noText} ${brand} ${avoid}`.trim(),
    `Professional portrait of ${subject}. Rembrandt lighting, face clearly visible with catchlights in eyes. Minimal plain background. ${personFocus} ${noText} ${brand} ${avoid}`.trim(),
    `Upper body portrait of ${subject} looking slightly off-camera. Soft studio lighting, neutral gradient background. Relaxed and approachable. ${personFocus} ${noText} ${brand} ${avoid}`.trim(),
    `Portrait of ${subject} with dramatic side lighting. One side gently shadowed. Solid dark background, face and features clearly illuminated. ${personFocus} ${noText} ${brand} ${avoid}`.trim(),
    `Warm-toned headshot of ${subject}. Golden hour-style warm light, creamy bokeh background. Genuine relaxed expression. ${personFocus} ${noText} ${brand} ${avoid}`.trim(),
    `High-key portrait of ${subject}. Bright even lighting, white background, clean and fresh look. Face sharp and well-exposed. ${personFocus} ${noText} ${brand} ${avoid}`.trim(),
    `Editorial portrait of ${subject}. Medium close-up, cinematic color grading, shallow depth of field. Minimal simple background. ${personFocus} ${noText} ${brand} ${avoid}`.trim(),
    `Natural light portrait of ${subject}. Soft diffused daylight, head tilted slightly, warm skin tones. Blurred plain background. ${personFocus} ${noText} ${brand} ${avoid}`.trim(),
    `Black and white portrait of ${subject}. High contrast, dramatic shadows on face, sharp focus on eyes. Clean minimal background. ${personFocus} ${noText} ${brand} ${avoid}`.trim(),
  ];
}

function buildProductPrompts(brand: string, tc: Record<string, string>): string[] {
  const ctx = configContext(tc);
  const avoid = avoidClause(tc);
  const product = tc.productDescription?.trim() || 'a branded product';

  return [
    `Clean product photography of ${product} on a minimal white background. Professional studio lighting, sharp focus. ${brand} ${ctx} ${avoid}`.trim(),
    `Product lifestyle shot of ${product} in a real-world context. Warm natural lighting, styled environment. ${brand} ${ctx} ${avoid}`.trim(),
    `Hero product image of ${product} with dramatic lighting and a premium feel. ${brand} ${ctx} ${avoid}`.trim(),
    `Product flat lay photography of ${product}. Top-down view, styled arrangement, clean composition. ${brand} ${ctx} ${avoid}`.trim(),
    `Close-up detail shot of ${product}. Macro perspective emphasizing texture and materials, soft background. ${brand} ${ctx} ${avoid}`.trim(),
    `${product} shown at a 45-degree angle on a colored background. Bold shadows, high-end e-commerce aesthetic. ${brand} ${ctx} ${avoid}`.trim(),
    `${product} in use by a person. Hands-on interaction, natural setting, lifestyle context. ${brand} ${ctx} ${avoid}`.trim(),
    `Minimalist packaging shot of ${product}. Clean lines, negative space, premium unboxing feel. ${brand} ${ctx} ${avoid}`.trim(),
    `${product} arranged with complementary props and brand elements. Styled set, editorial product photography. ${brand} ${ctx} ${avoid}`.trim(),
    `Multiple angles of ${product} in a single composition. Grid arrangement, consistent lighting, catalog style. ${brand} ${ctx} ${avoid}`.trim(),
    `${product} with dramatic rim lighting on a dark background. Luxurious, high-contrast, moody atmosphere. ${brand} ${ctx} ${avoid}`.trim(),
    `Outdoor lifestyle shot of ${product} in a natural environment. Golden hour light, warm colors, aspirational mood. ${brand} ${ctx} ${avoid}`.trim(),
  ];
}

function buildStylePrompts(brand: string, tc: Record<string, string>): string[] {
  const ctx = configContext(tc);
  const avoid = avoidClause(tc);
  const style = tc.styleDescription?.trim() || '';

  return [
    `Abstract visual style reference. ${style} ${brand} A cohesive visual language that captures the brand essence. ${ctx} ${avoid}`.trim(),
    `Brand mood board style image. ${style} Textured, layered composition showing the brand's visual identity. ${brand} ${ctx} ${avoid}`.trim(),
    `Graphic design style reference. ${style} Typography-inspired layout, bold composition. ${brand} ${ctx} ${avoid}`.trim(),
    `Visual identity reference. Patterns, textures, and color relationships that define the brand's aesthetic. ${brand} ${ctx} ${avoid}`.trim(),
    `Atmospheric brand imagery. ${style} Evocative, editorial quality. ${brand} ${ctx} ${avoid}`.trim(),
    `Color palette exploration. ${style} Gradient washes, paint strokes, and organic color blending that capture the brand's tonal range. ${brand} ${ctx} ${avoid}`.trim(),
    `Geometric pattern design. ${style} Repeating shapes, clean lines, modular grid compositions. ${brand} ${ctx} ${avoid}`.trim(),
    `Texture and material study. ${style} Close-up surfaces, tactile quality, material-inspired brand aesthetic. ${brand} ${ctx} ${avoid}`.trim(),
    `Mixed media collage style. ${style} Layered photography, illustration, and typography elements. Contemporary and dynamic. ${brand} ${ctx} ${avoid}`.trim(),
    `Minimalist brand aesthetic. ${style} Vast negative space, single focal element, restrained color palette. ${brand} ${ctx} ${avoid}`.trim(),
    `Retro-modern style fusion. ${style} Vintage textures combined with contemporary design elements. Nostalgic yet forward-looking. ${brand} ${ctx} ${avoid}`.trim(),
    `Abstract data visualization style. ${style} Flowing lines, connected nodes, organic data-inspired patterns. ${brand} ${ctx} ${avoid}`.trim(),
  ];
}

function buildObjectPrompts(brand: string, tc: Record<string, string>): string[] {
  const ctx = configContext(tc);
  const avoid = avoidClause(tc);
  const object = tc.objectDescription?.trim() || 'a branded object';

  return [
    `Studio photography of ${object}. Clean background, professional lighting, detailed texture. ${brand} ${ctx} ${avoid}`.trim(),
    `Object photography of ${object} with multiple angles. Sharp focus, neutral background. ${brand} ${ctx} ${avoid}`.trim(),
    `Close-up detail shot of ${object}. Macro perspective, emphasizing materials and craftsmanship. ${brand} ${ctx} ${avoid}`.trim(),
    `${object} in context. Lifestyle setting, natural lighting, showing scale and use. ${brand} ${ctx} ${avoid}`.trim(),
    `Overhead flat lay of ${object} with complementary items. Styled arrangement, clean negative space. ${brand} ${ctx} ${avoid}`.trim(),
    `${object} on a textured surface. Wood, marble, or fabric backdrop, warm ambient light. Tactile and inviting. ${brand} ${ctx} ${avoid}`.trim(),
    `Dramatic side-lit shot of ${object}. Strong shadows, high contrast, sculptural quality. ${brand} ${ctx} ${avoid}`.trim(),
    `${object} held in hands. Human interaction, sense of scale, warm natural tones. ${brand} ${ctx} ${avoid}`.trim(),
    `Deconstructed view of ${object}. Components or parts arranged neatly, showcasing engineering and design. ${brand} ${ctx} ${avoid}`.trim(),
    `${object} in a grid with color-coordinated backgrounds. Pop art inspired, vibrant and playful. ${brand} ${ctx} ${avoid}`.trim(),
    `Silhouette of ${object} against a gradient background. Minimalist, shape-focused, iconic feel. ${brand} ${ctx} ${avoid}`.trim(),
    `${object} photographed through glass or with reflections. Abstract, artistic, layered depth. ${brand} ${ctx} ${avoid}`.trim(),
  ];
}

function buildBrandStylePrompts(brand: string, tc: Record<string, string>): string[] {
  const ctx = configContext(tc);
  const avoid = avoidClause(tc);
  const direction = tc.styleDirection?.trim() || '';

  return [
    `Brand visual identity reference. ${direction} ${brand} A comprehensive visual style that reflects the brand's positioning. ${ctx} ${avoid}`.trim(),
    `Brand collateral style reference. ${direction} Showing consistent use of brand elements across touchpoints. ${brand} ${ctx} ${avoid}`.trim(),
    `Brand aesthetic reference. Color palette, typography style, and design language in harmony. ${brand} ${ctx} ${avoid}`.trim(),
    `Editorial brand imagery. ${direction} Premium quality, cohesive brand expression. ${brand} ${ctx} ${avoid}`.trim(),
    `Brand pattern and texture reference. Abstract visual elements for brand materials. ${brand} ${ctx} ${avoid}`.trim(),
    `Social media visual style reference. ${direction} Consistent post aesthetic, grid harmony, digital-first brand expression. ${brand} ${ctx} ${avoid}`.trim(),
    `Brand packaging design reference. ${direction} Material quality, unboxing experience, shelf presence. ${brand} ${ctx} ${avoid}`.trim(),
    `Environmental brand design. ${direction} Signage, wayfinding, and spatial branding that reflects the brand's character. ${brand} ${ctx} ${avoid}`.trim(),
    `Brand typography in context. ${direction} Headline treatments, pull quotes, text layouts showcasing typographic hierarchy. ${brand} ${ctx} ${avoid}`.trim(),
    `Digital interface brand style. ${direction} UI elements, button styles, card layouts, screen-first brand language. ${brand} ${ctx} ${avoid}`.trim(),
    `Brand iconography and illustration style. ${direction} Custom icon set, line weights, illustration approach that extends the brand. ${brand} ${ctx} ${avoid}`.trim(),
    `Brand stationery and print collateral. ${direction} Business cards, letterheads, envelopes with consistent brand application. ${brand} ${ctx} ${avoid}`.trim(),
  ];
}

function buildPhotographyPrompts(brand: string, tc: Record<string, string>): string[] {
  const ctx = configContext(tc);
  const avoid = avoidClause(tc);
  const subject = tc.subject?.trim() || '';

  return [
    `Photography style reference. ${subject} Consistent lighting, color grading, and composition that defines the brand's photographic language. ${brand} ${ctx} ${avoid}`.trim(),
    `Lifestyle photography. ${subject} Authentic moments, natural lighting, brand-aligned color palette. ${brand} ${ctx} ${avoid}`.trim(),
    `Editorial brand photography. ${subject} Cinematic quality, intentional framing and post-processing. ${brand} ${ctx} ${avoid}`.trim(),
    `Environmental photography. ${subject} Capturing the brand's world through consistent visual treatment. ${brand} ${ctx} ${avoid}`.trim(),
    `Close-up detail photography. ${subject} Macro textures, shallow depth of field, intimate perspective. ${brand} ${ctx} ${avoid}`.trim(),
    `Golden hour photography. ${subject} Warm backlighting, lens flare, dreamy atmosphere. ${brand} ${ctx} ${avoid}`.trim(),
    `Aerial or overhead photography. ${subject} Bird's eye perspective, geometric patterns, unique vantage point. ${brand} ${ctx} ${avoid}`.trim(),
    `Black and white photography. ${subject} High contrast, dramatic tones, timeless and classic feel. ${brand} ${ctx} ${avoid}`.trim(),
    `Street photography style. ${subject} Candid compositions, urban environment, raw authenticity. ${brand} ${ctx} ${avoid}`.trim(),
    `Studio photography with colored gels. ${subject} Bold color washes, creative lighting, contemporary fashion aesthetic. ${brand} ${ctx} ${avoid}`.trim(),
    `Documentary-style photography. ${subject} Behind-the-scenes, process-driven, storytelling through images. ${brand} ${ctx} ${avoid}`.trim(),
    `Minimalist photography. ${subject} Single subject, vast negative space, muted tones, contemplative mood. ${brand} ${ctx} ${avoid}`.trim(),
  ];
}

function buildIllustrationPrompts(brand: string, tc: Record<string, string>): string[] {
  const ctx = configContext(tc);
  const avoid = avoidClause(tc);
  const style = tc.illustrationStyle?.trim() || '';
  const mood = tc.mood?.trim() || '';

  return [
    `Illustration style reference. ${style} ${brand} A distinctive illustration style that captures the brand's personality. ${mood} ${ctx} ${avoid}`.trim(),
    `Brand illustration of abstract concepts. ${style} Cohesive visual language, unique artistic approach. ${brand} ${ctx} ${avoid}`.trim(),
    `Character illustration in brand style. ${style} Friendly, approachable, consistent style. ${brand} ${ctx} ${avoid}`.trim(),
    `Iconographic illustration. ${style} Simple, recognizable forms. ${brand} ${mood} ${ctx} ${avoid}`.trim(),
    `Scene illustration. ${style} Narrative quality, brand-aligned palette. ${brand} ${mood} ${ctx} ${avoid}`.trim(),
    `Hero illustration for a landing page. ${style} Wide composition, layered elements, eye-catching focal point. ${brand} ${mood} ${ctx} ${avoid}`.trim(),
    `Spot illustration for editorial use. ${style} Small, focused, decorative element that supports text content. ${brand} ${ctx} ${avoid}`.trim(),
    `Isometric illustration. ${style} 3D perspective, technical precision, informative and visually engaging. ${brand} ${mood} ${ctx} ${avoid}`.trim(),
    `Pattern or textile illustration. ${style} Repeating motifs, seamless tiling, decorative brand surface. ${brand} ${ctx} ${avoid}`.trim(),
    `Hand-drawn sketch style illustration. ${style} Organic lines, imperfect charm, authentic human touch. ${brand} ${mood} ${ctx} ${avoid}`.trim(),
    `Infographic illustration. ${style} Data-driven visuals, clear hierarchy, informative yet beautiful. ${brand} ${ctx} ${avoid}`.trim(),
    `Whimsical fantasy illustration. ${style} Imaginative world-building, rich details, storytelling depth. ${brand} ${mood} ${ctx} ${avoid}`.trim(),
  ];
}

// ─── Builder Registry ───────────────────────────────────────

const PROMPT_BUILDERS: Record<string, (brand: string, tc: Record<string, string>) => string[]> = {
  PERSON: buildPersonPrompts,
  PRODUCT: buildProductPrompts,
  STYLE: buildStylePrompts,
  OBJECT: buildObjectPrompts,
  BRAND_STYLE: buildBrandStylePrompts,
  PHOTOGRAPHY: buildPhotographyPrompts,
  ILLUSTRATION: buildIllustrationPrompts,
};
