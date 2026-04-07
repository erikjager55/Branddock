// =============================================================
// Reference Prompt Builder
//
// Constructs brand-aware prompts for AI-generating reference
// images per ConsistentModel type. Uses brand tags selected by
// the user and type-specific config fields.
// =============================================================

import type { ModelBrandContext } from '@/features/consistent-models/types/consistent-model.types';
import type { ConsistentModelType } from '@prisma/client';
import type { IllustrationStyleProfile } from './style-profile.types';

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
    if (key === 'avoid' || key === 'dos') continue; // handled separately
    const label = key.replace(/([A-Z])/g, ' $1').trim();
    parts.push(`${label}: ${value.trim()}`);
  }
  return parts.join('. ');
}

function dosClause(typeConfig: Record<string, string>): string {
  const dos = typeConfig.dos?.trim();
  return dos ? `MUST include: ${dos}.` : '';
}

function avoidClause(typeConfig: Record<string, string>): string {
  const avoid = typeConfig.avoid?.trim();
  return avoid ? `Do NOT include: ${avoid}.` : '';
}

// ─── Per-Type Prompt Builders ───────────────────────────────

function buildPersonPrompts(brand: string, tc: Record<string, string>): string[] {
  const dos = dosClause(tc);
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
    `Professional headshot portrait of ${subject}. Clean studio lighting, solid neutral background. Face and upper body sharp and well-lit. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Close-up portrait of ${subject}. Soft directional light, shallow depth of field, blurred simple background. Eye-level, natural confident expression. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Three-quarter view portrait of ${subject}. Warm soft lighting from the side. Head and shoulders framing, clean out-of-focus backdrop. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Portrait photo of ${subject} with a slight smile. Natural window light, simple white or light gray background. Tight crop on face and chest. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Professional portrait of ${subject}. Rembrandt lighting, face clearly visible with catchlights in eyes. Minimal plain background. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Upper body portrait of ${subject} looking slightly off-camera. Soft studio lighting, neutral gradient background. Relaxed and approachable. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Portrait of ${subject} with dramatic side lighting. One side gently shadowed. Solid dark background, face and features clearly illuminated. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Warm-toned headshot of ${subject}. Golden hour-style warm light, creamy bokeh background. Genuine relaxed expression. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `High-key portrait of ${subject}. Bright even lighting, white background, clean and fresh look. Face sharp and well-exposed. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Editorial portrait of ${subject}. Medium close-up, cinematic color grading, shallow depth of field. Minimal simple background. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Natural light portrait of ${subject}. Soft diffused daylight, head tilted slightly, warm skin tones. Blurred plain background. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Black and white portrait of ${subject}. High contrast, dramatic shadows on face, sharp focus on eyes. Clean minimal background. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Environmental portrait of ${subject} in a modern office space. Blurred professional background, natural daylight from windows. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Low-angle portrait of ${subject}. Looking slightly upward, conveying authority and confidence. Solid background. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Candid-style portrait of ${subject} mid-conversation. Authentic expression, shallow depth of field, natural daylight. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Split lighting portrait of ${subject}. Half face lit, half in shadow. Moody and artistic, solid dark background. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Outdoor portrait of ${subject} with soft overcast light. Muted background, gentle even illumination on face. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Wide aperture portrait of ${subject}. f/1.4 bokeh effect, creamy background circles, face tack-sharp. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Corporate editorial portrait of ${subject}. Symmetrical composition, formal but approachable, clean backdrop. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Backlit silhouette-edge portrait of ${subject}. Rim light outlining features, face gently illuminated. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
    `Close-up beauty portrait of ${subject}. Focus on skin texture and eyes, diffused soft box lighting. ${personFocus} ${noText} ${brand} ${dos} ${avoid}`.trim(),
  ];
}

function buildProductPrompts(brand: string, tc: Record<string, string>): string[] {
  const ctx = configContext(tc);
  const dos = dosClause(tc);
  const avoid = avoidClause(tc);
  const product = tc.productDescription?.trim() || 'a branded product';

  return [
    `Clean product photography of ${product} on a minimal white background. Professional studio lighting, sharp focus. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Product lifestyle shot of ${product} in a real-world context. Warm natural lighting, styled environment. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Hero product image of ${product} with dramatic lighting and a premium feel. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Product flat lay photography of ${product}. Top-down view, styled arrangement, clean composition. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Close-up detail shot of ${product}. Macro perspective emphasizing texture and materials, soft background. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${product} shown at a 45-degree angle on a colored background. Bold shadows, high-end e-commerce aesthetic. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${product} in use by a person. Hands-on interaction, natural setting, lifestyle context. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Minimalist packaging shot of ${product}. Clean lines, negative space, premium unboxing feel. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${product} arranged with complementary props and brand elements. Styled set, editorial product photography. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Multiple angles of ${product} in a single composition. Grid arrangement, consistent lighting, catalog style. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${product} with dramatic rim lighting on a dark background. Luxurious, high-contrast, moody atmosphere. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Outdoor lifestyle shot of ${product} in a natural environment. Golden hour light, warm colors, aspirational mood. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${product} on a reflective surface. Mirror-like reflection, premium studio feel, high-end advertising aesthetic. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Aerial top-down shot of ${product} with geometric props. Color-coordinated, flat lay, modern art direction. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${product} floating with dynamic splash or particles. Action shot, energy, eye-catching advertising visual. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Before-and-after style composition featuring ${product}. Split frame, transformation narrative. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${product} in a monochromatic scene. Single brand color accent, striking simplicity, editorial ad feel. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Group shot of ${product} variants. Color family, organized arrangement, catalog overview. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${product} macro detail with shallow depth of field. Extreme close-up on signature feature or texture. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Seasonal campaign shot of ${product}. Contextual styling, holiday or seasonal props, aspirational atmosphere. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${product} in hand against a blurred urban backdrop. Scale reference, street-style context, relatable. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
  ];
}

function buildStylePrompts(brand: string, tc: Record<string, string>): string[] {
  const ctx = configContext(tc);
  const dos = dosClause(tc);
  const avoid = avoidClause(tc);
  const style = tc.styleDescription?.trim() || '';

  return [
    `Abstract visual style reference. ${style} ${brand} A cohesive visual language that captures the brand essence. ${ctx} ${avoid}`.trim(),
    `Brand mood board style image. ${style} Textured, layered composition showing the brand's visual identity. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Graphic design style reference. ${style} Typography-inspired layout, bold composition. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Visual identity reference. Patterns, textures, and color relationships that define the brand's aesthetic. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Atmospheric brand imagery. ${style} Evocative, editorial quality. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Color palette exploration. ${style} Gradient washes, paint strokes, and organic color blending that capture the brand's tonal range. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Geometric pattern design. ${style} Repeating shapes, clean lines, modular grid compositions. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Texture and material study. ${style} Close-up surfaces, tactile quality, material-inspired brand aesthetic. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Mixed media collage style. ${style} Layered photography, illustration, and typography elements. Contemporary and dynamic. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Minimalist brand aesthetic. ${style} Vast negative space, single focal element, restrained color palette. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Retro-modern style fusion. ${style} Vintage textures combined with contemporary design elements. Nostalgic yet forward-looking. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Abstract data visualization style. ${style} Flowing lines, connected nodes, organic data-inspired patterns. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Gradient mesh style reference. ${style} Smooth color transitions, ambient glow, contemporary digital art feel. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Architectural brand aesthetic. ${style} Clean lines, geometric shapes, spatial depth. Modern and structured. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Nature-inspired brand visual. ${style} Organic forms, natural textures, earthy and authentic. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Kinetic typography reference. ${style} Movement, rhythm, dynamic letterforms in space. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brutalist design reference. ${style} Raw materials, bold typography, grid-based, unapologetic. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Paper craft and cut-out style. ${style} Layered paper, shadows, tactile depth, handmade quality. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Neon and glow style. ${style} Dark background, luminous accents, electric atmosphere. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Watercolor wash reference. ${style} Soft bleeds, translucent overlays, artistic imperfection. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Duotone brand aesthetic. ${style} Two-color palette, high contrast, bold and modern. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
  ];
}

function buildObjectPrompts(brand: string, tc: Record<string, string>): string[] {
  const ctx = configContext(tc);
  const dos = dosClause(tc);
  const avoid = avoidClause(tc);
  const object = tc.objectDescription?.trim() || 'a branded object';

  return [
    `Studio photography of ${object}. Clean background, professional lighting, detailed texture. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Object photography of ${object} with multiple angles. Sharp focus, neutral background. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Close-up detail shot of ${object}. Macro perspective, emphasizing materials and craftsmanship. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${object} in context. Lifestyle setting, natural lighting, showing scale and use. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Overhead flat lay of ${object} with complementary items. Styled arrangement, clean negative space. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${object} on a textured surface. Wood, marble, or fabric backdrop, warm ambient light. Tactile and inviting. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Dramatic side-lit shot of ${object}. Strong shadows, high contrast, sculptural quality. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${object} held in hands. Human interaction, sense of scale, warm natural tones. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Deconstructed view of ${object}. Components or parts arranged neatly, showcasing engineering and design. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${object} in a grid with color-coordinated backgrounds. Pop art inspired, vibrant and playful. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Silhouette of ${object} against a gradient background. Minimalist, shape-focused, iconic feel. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${object} photographed through glass or with reflections. Abstract, artistic, layered depth. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${object} on a rotating turntable. Motion blur on background, sharp subject, dynamic product spin feel. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${object} in a miniature scene. Tilt-shift effect, playful scale, creative diorama. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Extreme macro of ${object} surface. Microscopic detail, abstract pattern, material science aesthetic. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${object} submerged in liquid. Water, oil, or paint. Dramatic texture interaction, high-speed capture feel. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${object} on a pedestal with museum-style spotlighting. Dramatic, reverent, gallery quality. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${object} levitating with subtle shadow below. Clean background, impossible floating effect, premium. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${object} wrapped or partially revealed. Teaser aesthetic, mystery, unwrapping anticipation. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `${object} lit with a single strip light from above. Dramatic vertical highlight, moody atmosphere. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Two of ${object} facing each other. Symmetrical composition, mirror effect, comparison or pairing. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
  ];
}

function buildBrandStylePrompts(brand: string, tc: Record<string, string>): string[] {
  const ctx = configContext(tc);
  const dos = dosClause(tc);
  const avoid = avoidClause(tc);
  const direction = tc.styleDirection?.trim() || '';

  return [
    `Brand visual identity reference. ${direction} ${brand} A comprehensive visual style that reflects the brand's positioning. ${ctx} ${avoid}`.trim(),
    `Brand collateral style reference. ${direction} Showing consistent use of brand elements across touchpoints. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand aesthetic reference. Color palette, typography style, and design language in harmony. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Editorial brand imagery. ${direction} Premium quality, cohesive brand expression. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand pattern and texture reference. Abstract visual elements for brand materials. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Social media visual style reference. ${direction} Consistent post aesthetic, grid harmony, digital-first brand expression. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand packaging design reference. ${direction} Material quality, unboxing experience, shelf presence. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Environmental brand design. ${direction} Signage, wayfinding, and spatial branding that reflects the brand's character. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand typography in context. ${direction} Headline treatments, pull quotes, text layouts showcasing typographic hierarchy. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Digital interface brand style. ${direction} UI elements, button styles, card layouts, screen-first brand language. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand iconography and illustration style. ${direction} Custom icon set, line weights, illustration approach that extends the brand. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand stationery and print collateral. ${direction} Business cards, letterheads, envelopes with consistent brand application. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand merchandise and swag. ${direction} T-shirts, tote bags, mugs with cohesive brand identity applied. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand event design. ${direction} Stage backdrop, pop-up booth, experiential brand presence. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand motion design still. ${direction} Key frame from animated brand content, kinetic energy, transition moment. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand data visualization. ${direction} Charts, graphs, infographics using brand colors and typography. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand email template design. ${direction} Newsletter layout, header banner, CTA buttons in brand style. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand presentation slide. ${direction} Title slide design, section divider, clean data layout. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand texture swatch. ${direction} Close-up of brand-aligned material or finish, tactile quality reference. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand vehicle wrap design. ${direction} Car, van, or delivery vehicle with full brand livery application. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand retail display. ${direction} In-store point-of-sale, shelf talker, retail brand expression. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
  ];
}

function buildPhotographyPrompts(brand: string, tc: Record<string, string>): string[] {
  const ctx = configContext(tc);
  const dos = dosClause(tc);
  const avoid = avoidClause(tc);
  const subject = tc.subject?.trim() || '';

  return [
    `Photography style reference. ${subject} Consistent lighting, color grading, and composition that defines the brand's photographic language. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Lifestyle photography. ${subject} Authentic moments, natural lighting, brand-aligned color palette. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Editorial brand photography. ${subject} Cinematic quality, intentional framing and post-processing. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Environmental photography. ${subject} Capturing the brand's world through consistent visual treatment. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Close-up detail photography. ${subject} Macro textures, shallow depth of field, intimate perspective. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Golden hour photography. ${subject} Warm backlighting, lens flare, dreamy atmosphere. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Aerial or overhead photography. ${subject} Bird's eye perspective, geometric patterns, unique vantage point. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Black and white photography. ${subject} High contrast, dramatic tones, timeless and classic feel. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Street photography style. ${subject} Candid compositions, urban environment, raw authenticity. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Studio photography with colored gels. ${subject} Bold color washes, creative lighting, contemporary fashion aesthetic. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Documentary-style photography. ${subject} Behind-the-scenes, process-driven, storytelling through images. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Minimalist photography. ${subject} Single subject, vast negative space, muted tones, contemplative mood. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Double exposure photography. ${subject} Layered imagery, two scenes blended, dreamlike narrative. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Motion blur photography. ${subject} Intentional movement, dynamic energy, long exposure effect. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Tilt-shift photography. ${subject} Miniature effect, selective focus, playful perspective distortion. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `High-speed photography. ${subject} Frozen action, water splashes, breaking objects, split-second capture. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Cinemagraph-style still. ${subject} One element suggests motion in an otherwise still scene. Cinematic quality. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Infrared photography style. ${subject} False color, surreal vegetation, otherworldly atmosphere. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Bokeh-heavy photography. ${subject} Out-of-focus light points, atmospheric depth, shallow focus foreground. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Silhouette photography. ${subject} Strong backlight, dark subject outline against bright sky or background. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Composite panoramic photography. ${subject} Wide-format, sweeping vista, stitched composition, epic scale. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
  ];
}

function buildIllustrationPrompts(brand: string, tc: Record<string, string>): string[] {
  const ctx = configContext(tc);
  const dos = dosClause(tc);
  const avoid = avoidClause(tc);
  const style = tc.illustrationStyle?.trim() || '';
  const mood = tc.mood?.trim() || '';

  return [
    `Illustration style reference. ${style} ${brand} A distinctive illustration style that captures the brand's personality. ${mood} ${ctx} ${dos} ${avoid}`.trim(),
    `Brand illustration of abstract concepts. ${style} Cohesive visual language, unique artistic approach. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Character illustration in brand style. ${style} Friendly, approachable, consistent style. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Iconographic illustration. ${style} Simple, recognizable forms. ${brand} ${mood} ${ctx} ${dos} ${avoid}`.trim(),
    `Scene illustration. ${style} Narrative quality, brand-aligned palette. ${brand} ${mood} ${ctx} ${dos} ${avoid}`.trim(),
    `Hero illustration for a landing page. ${style} Wide composition, layered elements, eye-catching focal point. ${brand} ${mood} ${ctx} ${dos} ${avoid}`.trim(),
    `Spot illustration for editorial use. ${style} Small, focused, decorative element that supports text content. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Isometric illustration. ${style} 3D perspective, technical precision, informative and visually engaging. ${brand} ${mood} ${ctx} ${dos} ${avoid}`.trim(),
    `Pattern or textile illustration. ${style} Repeating motifs, seamless tiling, decorative brand surface. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Hand-drawn sketch style illustration. ${style} Organic lines, imperfect charm, authentic human touch. ${brand} ${mood} ${ctx} ${dos} ${avoid}`.trim(),
    `Infographic illustration. ${style} Data-driven visuals, clear hierarchy, informative yet beautiful. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Whimsical fantasy illustration. ${style} Imaginative world-building, rich details, storytelling depth. ${brand} ${mood} ${ctx} ${dos} ${avoid}`.trim(),
    `Line art illustration. ${style} Clean outlines, no fill or minimal fill, precision and elegance. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Collage-style illustration. ${style} Cut-out elements, layered paper textures, analog mixed-media feel. ${brand} ${mood} ${ctx} ${dos} ${avoid}`.trim(),
    `Pixel art illustration. ${style} Retro grid-based, nostalgic 8-bit aesthetic, limited color palette. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Risograph print style illustration. ${style} Halftone textures, overprint effects, limited spot colors. ${brand} ${mood} ${ctx} ${dos} ${avoid}`.trim(),
    `Woodcut or linocut illustration. ${style} Bold carved lines, high contrast, printmaking texture. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `3D rendered illustration. ${style} Soft materials, rounded forms, clay or plastic feel, playful depth. ${brand} ${mood} ${ctx} ${dos} ${avoid}`.trim(),
    `Watercolor illustration. ${style} Soft washes, transparent layers, organic edges, artistic spontaneity. ${brand} ${mood} ${ctx} ${dos} ${avoid}`.trim(),
    `Technical blueprint illustration. ${style} Schematic quality, white-on-blue, precise measurements and annotations. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
    `Decorative border illustration. ${style} Frame or ornamental element, repeated motifs, versatile for layouts. ${brand} ${ctx} ${dos} ${avoid}`.trim(),
  ];
}

// ─── Profile-Aware Illustration Prompts ────────────────────

/**
 * Build illustration prompts informed by the AI style profile.
 * Uses exact colors, line weights, shading types, and shape language
 * from the analyzed profile for much higher style fidelity.
 */
function buildIllustrationPromptsFromProfile(
  brand: string,
  tc: Record<string, string>,
  profile: IllustrationStyleProfile,
): string[] {
  const dos = dosClause(tc);
  const avoid = avoidClause(tc);
  const sp = profile.generatedPrompts.stylePrompt;
  const neg = profile.generatedPrompts.negativePrompt;

  // Build a compact color reference from the profile
  const topColors = profile.color.palette
    .slice(0, 5)
    .map((c) => c.hex)
    .join(', ');
  const colorRef = topColors ? `Color palette: ${topColors}.` : '';

  // Build line reference
  const lineRef = profile.line.hasOutlines
    ? `${profile.line.weight} ${profile.line.consistency} outlines in ${profile.line.strokeColor}.`
    : 'No outlines.';

  // Core style descriptor (compact, used in every prompt)
  const coreStyle = `${sp}. ${colorRef} ${lineRef}`.trim();

  // Negative prompt addition
  const negSuffix = neg ? `Do NOT include: ${neg}.` : '';

  // Scene prompts tailored to the detected style category
  const scenes = getScenesByStyle(profile.classification.primaryStyle);

  return scenes.map((scene) =>
    `${scene.prefix}. ${coreStyle} ${brand} ${scene.detail} ${dos} ${avoid} ${negSuffix}`.trim(),
  );
}

/** Scene templates adapted per illustration style category */
function getScenesByStyle(primaryStyle: string): { prefix: string; detail: string }[] {
  const base: { prefix: string; detail: string }[] = [
    { prefix: 'Brand illustration of two people collaborating', detail: 'Office or workspace setting, teamwork theme.' },
    { prefix: 'Illustration of a person using a mobile device', detail: 'Modern technology context, focused engagement.' },
    { prefix: 'Abstract concept illustration showing growth', detail: 'Upward movement, plants or charts metaphor.' },
    { prefix: 'Illustration of a customer service interaction', detail: 'Friendly, supportive mood, communication tools.' },
    { prefix: 'Hero illustration for a product launch', detail: 'Wide composition, product at center, celebratory energy.' },
    { prefix: 'Illustration of a person at a desk working', detail: 'Focused, productive, laptop/monitor visible.' },
    { prefix: 'Scene illustration of a team meeting', detail: 'Multiple people, presentation board or screen, discussion.' },
    { prefix: 'Spot illustration of a lightbulb/idea concept', detail: 'Small, iconic, innovation metaphor.' },
    { prefix: 'Illustration of data analytics dashboard', detail: 'Charts, graphs, insights visualization.' },
    { prefix: 'Illustration of a person celebrating achievement', detail: 'Confetti, trophy, or success gesture.' },
    { prefix: 'Brand mascot or character illustration', detail: 'Friendly, approachable, brand personality embodied.' },
    { prefix: 'Illustration of a delivery or shipping process', detail: 'Package, vehicle, movement from A to B.' },
    { prefix: 'Illustration of secure data protection', detail: 'Shield, lock, security metaphor.' },
    { prefix: 'Illustration of global connectivity', detail: 'Globe, network lines, diverse people connected.' },
    { prefix: 'Onboarding illustration welcoming a new user', detail: 'Open door, welcome gesture, first-step metaphor.' },
    { prefix: 'Illustration of brainstorming with sticky notes', detail: 'Colorful notes, whiteboard, creative energy.' },
    { prefix: 'Illustration of a payment or checkout flow', detail: 'Credit card, receipt, confirmation check.' },
    { prefix: 'Illustration of cloud computing infrastructure', detail: 'Cloud shapes, server icons, connected devices.' },
    { prefix: 'Error state illustration (404 or empty state)', detail: 'Lost character, magnifying glass, question mark.' },
    { prefix: 'Illustration of sustainable/eco-friendly practices', detail: 'Leaves, recycling, green energy, nature integration.' },
    { prefix: 'Illustration of a calendar or scheduling tool', detail: 'Calendar grid, time blocks, productivity.' },
  ];

  // For flat-vector or minimal styles, use simpler scene descriptions
  if (primaryStyle.includes('flat') || primaryStyle.includes('minimal') || primaryStyle.includes('vector')) {
    return base.map((s) => ({
      ...s,
      detail: `${s.detail} Clean, minimal composition. Simple shapes, limited elements.`,
    }));
  }

  // For isometric styles, add perspective note
  if (primaryStyle.includes('isometric')) {
    return base.map((s) => ({
      ...s,
      detail: `${s.detail} Isometric 30-degree perspective. Consistent angle throughout.`,
    }));
  }

  return base;
}

/**
 * Build reference prompts using the style profile when available.
 * Falls back to generic prompts when no profile exists.
 */
export function buildReferencePromptsWithProfile(
  brandTags: string[],
  typeConfig: Record<string, string>,
  modelType: ConsistentModelType,
  styleProfile: IllustrationStyleProfile | null,
): ReferencePromptResult {
  if (modelType === 'ILLUSTRATION' && styleProfile) {
    const brandEssence = brandTags.length > 0
      ? `Brand essence: ${brandTags.join(', ')}.`
      : '';
    return {
      prompts: buildIllustrationPromptsFromProfile(brandEssence, typeConfig, styleProfile),
    };
  }

  // Fallback to generic builder for all other types or when no profile
  return buildReferencePrompts(brandTags, typeConfig, modelType);
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
