// =============================================================
// Consistent Model Constants
// =============================================================

import type { ConsistentModelType, ConsistentModelStatus } from "../types/consistent-model.types";

// ─── Type Config ────────────────────────────────────────────

export interface ModelTypeConfig {
  label: string;
  description: string;
  triggerWord: string;
  color: string;
  bgColor: string;
  borderColor: string;
  colorHex: string;
  bgHex: string;
  borderHex: string;
}

export const TYPE_CONFIG: Record<ConsistentModelType, ModelTypeConfig> = {
  PERSON: {
    label: "Model",
    description: "Train on faces and people for consistent portrait generation",
    triggerWord: "TOK person",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    colorHex: "#1d4ed8",
    bgHex: "#eff6ff",
    borderHex: "#bfdbfe",
  },
  PRODUCT: {
    label: "Product",
    description: "Train on product photos for consistent product imagery",
    triggerWord: "TOK product",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    colorHex: "#047857",
    bgHex: "#ecfdf5",
    borderHex: "#a7f3d0",
  },
  STYLE: {
    label: "Style",
    description: "Train on a visual style for consistent brand aesthetics",
    triggerWord: "TOK style",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    colorHex: "#6d28d9",
    bgHex: "#f5f3ff",
    borderHex: "#ddd6fe",
  },
  OBJECT: {
    label: "Object",
    description: "Train on specific objects for consistent representation",
    triggerWord: "TOK object",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    colorHex: "#b45309",
    bgHex: "#fffbeb",
    borderHex: "#fde68a",
  },
  BRAND_STYLE: {
    label: "Brand Style",
    description: "Train on brand style references for consistent brand imagery",
    triggerWord: "TOK brand_style",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    colorHex: "#be123c",
    bgHex: "#fff1f2",
    borderHex: "#fecdd3",
  },
  PHOTOGRAPHY: {
    label: "Photography",
    description: "Train on photography styles for consistent photo aesthetics",
    triggerWord: "TOK photography",
    color: "text-cyan-700",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    colorHex: "#0e7490",
    bgHex: "#ecfeff",
    borderHex: "#a5f3fc",
  },
  ILLUSTRATION: {
    label: "Illustration",
    description: "Train on illustration styles for consistent visual language",
    triggerWord: "TOK illustration",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    colorHex: "#c2410c",
    bgHex: "#fff7ed",
    borderHex: "#fed7aa",
  },
  VOICE: {
    label: "Voice",
    description: "Define brand voice profiles for audio generation",
    triggerWord: "",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    colorHex: "#4338ca",
    bgHex: "#eef2ff",
    borderHex: "#c7d2fe",
  },
  SOUND_EFFECT: {
    label: "Sound Effect",
    description: "Define sound effect presets for audio production",
    triggerWord: "",
    color: "text-pink-700",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    colorHex: "#be185d",
    bgHex: "#fdf2f8",
    borderHex: "#fbcfe8",
  },
};

// ─── Status Config ──────────────────────────────────────────

export interface ModelStatusConfig {
  label: string;
  variant: "default" | "success" | "warning" | "danger" | "info";
  dotColor: string;
}

export const STATUS_CONFIG: Record<ConsistentModelStatus, ModelStatusConfig> = {
  DRAFT: {
    label: "Draft",
    variant: "default",
    dotColor: "bg-gray-400",
  },
  UPLOADING: {
    label: "Uploading",
    variant: "info",
    dotColor: "bg-blue-400",
  },
  TRAINING: {
    label: "Training",
    variant: "warning",
    dotColor: "bg-amber-400",
  },
  TRAINING_FAILED: {
    label: "Failed",
    variant: "danger",
    dotColor: "bg-red-400",
  },
  READY: {
    label: "Ready",
    variant: "success",
    dotColor: "bg-emerald-400",
  },
  ARCHIVED: {
    label: "Archived",
    variant: "default",
    dotColor: "bg-gray-300",
  },
};

// ─── Training Defaults ──────────────────────────────────────

export const TRAINING_DEFAULTS = {
  steps: 500,
  minSteps: 100,
  maxSteps: 1500,
  defaultResolution: 1024,
  minReferenceImages: 10,
  maxReferenceImages: 20,
  supportedResolutions: [512, 768, 1024],
};

/** Per-type training step defaults — fewer steps for style/illustration, more for faces */
export const TRAINING_STEPS_BY_TYPE: Record<ConsistentModelType, number> = {
  PERSON:       800,
  PRODUCT:      600,
  OBJECT:       500,
  STYLE:        400,
  BRAND_STYLE:  400,
  PHOTOGRAPHY:  500,
  ILLUSTRATION: 400,
  VOICE:        0,
  SOUND_EFFECT: 0,
};

// ─── Trigger Words (single source of truth) ─────────────────

export const TRIGGER_WORDS: Record<ConsistentModelType, string> = {
  PERSON: "TOK person",
  PRODUCT: "TOK product",
  STYLE: "TOK style",
  OBJECT: "TOK object",
  BRAND_STYLE: "TOK brand_style",
  PHOTOGRAPHY: "TOK photography",
  ILLUSTRATION: "TOK illustration",
  VOICE: "",
  SOUND_EFFECT: "",
};

// ─── Min Reference Images per Type ──────────────────────────
// Based on fal.ai docs: portrait-trainer recommends 10, flux-2-trainer recommends 10 (9-50 for style).

export const MIN_IMAGES_BY_TYPE: Record<ConsistentModelType, number> = {
  PERSON: 10,
  PRODUCT: 10,
  STYLE: 10,
  OBJECT: 10,
  BRAND_STYLE: 10,
  PHOTOGRAPHY: 10,
  ILLUSTRATION: 10,
  VOICE: 0,
  SOUND_EFFECT: 0,
};

// ─── Generation Defaults ────────────────────────────────────

export const GENERATION_PRESETS = {
  square: { width: 1024, height: 1024, label: "Square (1:1)" },
  portrait: { width: 768, height: 1024, label: "Portrait (3:4)" },
  landscape: { width: 1024, height: 768, label: "Landscape (4:3)" },
  wide: { width: 1536, height: 1024, label: "Wide (3:2)" },
} as const;

export type GenerationPreset = keyof typeof GENERATION_PRESETS;

// ─── Model Type Options (for dropdowns) ─────────────────────

/** Types that can no longer be created — their functionality moved to Brandstyle */
const HIDDEN_CREATE_TYPES = new Set<ConsistentModelType>(["BRAND_STYLE", "STYLE"]);

export const MODEL_TYPE_OPTIONS = (
  Object.entries(TYPE_CONFIG) as [ConsistentModelType, ModelTypeConfig][]
)
  .filter(([value]) => !HIDDEN_CREATE_TYPES.has(value))
  .map(([value, config]) => ({
    value,
    label: config.label,
  }));

// ─── Status Filter Options ──────────────────────────────────

export const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "TRAINING", label: "Training" },
  { value: "READY", label: "Ready" },
  { value: "ARCHIVED", label: "Archived" },
];

// ─── Trainable Types (require fal.ai training) ─────────────

/** Types that support AI training + generation. Non-trainable types are style guides only. */
export const TRAINABLE_TYPES = new Set<ConsistentModelType>(['PERSON', 'PRODUCT', 'STYLE', 'OBJECT', 'BRAND_STYLE', 'PHOTOGRAPHY', 'ILLUSTRATION']);

// ─── LoRA Generation Quality Config per Type ────────────────

export interface LoraQualityConfig {
  /** LoRA influence strength — higher = more faithful to trained subject (0.8–1.3) */
  loraScale: number;
  /** Prompt adherence — higher = follows prompt more strictly (1–20, Flux default ~3.5) */
  guidanceScale: number;
  /** Denoising steps — higher = finer detail, slower (28–50) */
  inferenceSteps: number;
  /** Negative prompt to prevent common issues */
  negativePrompt: string;
  /** Prompt prefix when auto-injecting trigger word (e.g., "A photo of" / "An illustration in the style of") */
  triggerPrefix: string;
}

const SHARED_NEGATIVE = 'blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, watermark, text, logo, signature, jpeg artifacts';

export const LORA_QUALITY_CONFIG: Record<ConsistentModelType, LoraQualityConfig> = {
  PERSON: {
    loraScale: 1.15,
    guidanceScale: 4.5,
    inferenceSteps: 40,
    negativePrompt: `${SHARED_NEGATIVE}, wrong face, different person, inconsistent identity, mutation, extra fingers`,
    triggerPrefix: 'A photo of',
  },
  PRODUCT: {
    loraScale: 1.1,
    guidanceScale: 5.0,
    inferenceSteps: 40,
    negativePrompt: `${SHARED_NEGATIVE}, wrong product, different shape, inconsistent design`,
    triggerPrefix: 'A product photo of',
  },
  OBJECT: {
    loraScale: 1.1,
    guidanceScale: 4.5,
    inferenceSteps: 35,
    negativePrompt: `${SHARED_NEGATIVE}, wrong object, different shape`,
    triggerPrefix: 'A photo of',
  },
  STYLE: {
    loraScale: 1.0,
    guidanceScale: 4.0,
    inferenceSteps: 35,
    negativePrompt: SHARED_NEGATIVE,
    triggerPrefix: 'An image in the style of',
  },
  BRAND_STYLE: {
    loraScale: 1.0,
    guidanceScale: 4.0,
    inferenceSteps: 35,
    negativePrompt: SHARED_NEGATIVE,
    triggerPrefix: 'A brand visual in the style of',
  },
  PHOTOGRAPHY: {
    loraScale: 1.05,
    guidanceScale: 4.0,
    inferenceSteps: 35,
    negativePrompt: `${SHARED_NEGATIVE}, illustration, cartoon, painting, drawing`,
    triggerPrefix: 'A photograph in the style of',
  },
  ILLUSTRATION: {
    loraScale: 1.05,
    guidanceScale: 4.0,
    inferenceSteps: 35,
    negativePrompt: `${SHARED_NEGATIVE}, photograph, photo, realistic`,
    triggerPrefix: 'An illustration in the style of',
  },
  VOICE: { loraScale: 1.0, guidanceScale: 3.5, inferenceSteps: 28, negativePrompt: '', triggerPrefix: '' },
  SOUND_EFFECT: { loraScale: 1.0, guidanceScale: 3.5, inferenceSteps: 28, negativePrompt: '', triggerPrefix: '' },
};

// ─── fal.ai Trainer + Generator per Model Type ─────────────

export interface FalModelConfig {
  trainer: string;
  generator: string;
  label: string;
}

/** Best trainer + generator per model type.
 * PERSON → portrait-trainer (optimized for face consistency)
 * PRODUCT/OBJECT → flux-2-trainer (best photorealism)
 * STYLE/BRAND_STYLE/PHOTOGRAPHY/ILLUSTRATION → flux-2-trainer (best quality) */
export const FAL_MODEL_CONFIG: Record<ConsistentModelType, FalModelConfig> = {
  PERSON:       { trainer: 'fal-ai/flux-lora-portrait-trainer', generator: 'fal-ai/flux-lora',   label: 'Flux Portrait Trainer' },
  PRODUCT:      { trainer: 'fal-ai/flux-2-trainer',             generator: 'fal-ai/flux-2/lora',  label: 'Flux 2 Trainer' },
  STYLE:        { trainer: 'fal-ai/flux-2-trainer',             generator: 'fal-ai/flux-2/lora',  label: 'Flux 2 Trainer' },
  OBJECT:       { trainer: 'fal-ai/flux-2-trainer',             generator: 'fal-ai/flux-2/lora',  label: 'Flux 2 Trainer' },
  BRAND_STYLE:  { trainer: 'fal-ai/flux-2-trainer',             generator: 'fal-ai/flux-2/lora',  label: 'Flux 2 Trainer' },
  PHOTOGRAPHY:  { trainer: 'fal-ai/flux-2-trainer',             generator: 'fal-ai/flux-2/lora',  label: 'Flux 2 Trainer' },
  ILLUSTRATION: { trainer: 'fal-ai/flux-2-trainer',             generator: 'fal-ai/flux-2/lora',  label: 'Flux 2 Trainer' },
  VOICE:        { trainer: '',                                   generator: '',                     label: '' },
  SOUND_EFFECT: { trainer: '',                                   generator: '',                     label: '' },
};

// ─── Wizard Steps ───────────────────────────────────────────

export const WIZARD_STEPS_OWN_IMAGES = ["Upload", "Training & Showcase"] as const;
export const WIZARD_STEPS_SYNTHETIC = ["Generate References", "Training & Showcase"] as const;
export const WIZARD_STEPS_NON_TRAINABLE = ["Style Guide", "Reference Images", "Overview"] as const;
export const WIZARD_STEPS_ILLUSTRATION = ["Illustration Style", "Reference Images", "Overview"] as const;
export const WIZARD_STEPS_ILLUSTRATION_TRAINABLE = ["Upload & Curate", "AI Style Analysis", "Training & Showcase"] as const;

export const ILLUSTRATION_STYLE_OPTIONS = {
  illustrationStyle: [
    { value: "flat", label: "Flat / Minimal" },
    { value: "line-art", label: "Line Art" },
    { value: "watercolor", label: "Watercolor" },
    { value: "cartoon", label: "Cartoon" },
    { value: "isometric", label: "Isometric" },
    { value: "sketch", label: "Sketch" },
    { value: "geometric", label: "Geometric" },
    { value: "hand-drawn", label: "Hand-drawn" },
    { value: "vector", label: "Vector" },
    { value: "pixel-art", label: "Pixel Art" },
  ],
  colorApproach: [
    { value: "full-color", label: "Full Color" },
    { value: "limited-palette", label: "Limited Palette" },
    { value: "monochrome", label: "Monochrome" },
    { value: "pastel", label: "Pastel" },
    { value: "vibrant", label: "Vibrant" },
    { value: "earth-tones", label: "Earth Tones" },
  ],
  lineQuality: [
    { value: "thin", label: "Thin" },
    { value: "thick", label: "Thick" },
    { value: "variable-weight", label: "Variable Weight" },
    { value: "none", label: "None (Fills Only)" },
    { value: "sketchy", label: "Sketchy" },
    { value: "clean", label: "Clean" },
  ],
  detailLevel: [
    { value: "minimal", label: "Minimal / Simple" },
    { value: "moderate", label: "Moderate" },
    { value: "highly-detailed", label: "Highly Detailed" },
  ],
} as const;

// ─── fal.ai Provider Options ────────────────────────────────
// Moved to src/lib/integrations/fal/fal-providers.ts — re-exported here for backward compat.

export {
  FAL_PROVIDERS,
  getFalProvidersForType,
  getFalProviderById,
} from '@/lib/integrations/fal/fal-providers';
export type { FalProvider } from '@/lib/integrations/fal/fal-providers';

export type FalProviderId = string;

// ─── Type-Specific Generation Fields ─────────────────────────

export interface TypeGenerationField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder: string;
  options?: readonly { readonly value: string; readonly label: string }[];
}

export const TYPE_GENERATION_FIELDS: Partial<Record<ConsistentModelType, TypeGenerationField[]>> = {
  PERSON: [
    { key: "gender", label: "Gender", type: "select", placeholder: "Select gender", options: [
      { value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "non-binary", label: "Non-binary" },
    ] },
    { key: "age", label: "Age Range", type: "select", placeholder: "Select age range", options: [
      { value: "20s", label: "20s" }, { value: "30s", label: "30s" }, { value: "40s", label: "40s" }, { value: "50s", label: "50s" }, { value: "60s", label: "60+" },
    ] },
    { key: "ethnicity", label: "Ethnicity", type: "select", placeholder: "Select ethnicity", options: [
      { value: "caucasian", label: "Caucasian" }, { value: "black", label: "Black" }, { value: "asian", label: "Asian" }, { value: "hispanic", label: "Hispanic / Latino" }, { value: "middle-eastern", label: "Middle Eastern" }, { value: "south-asian", label: "South Asian" }, { value: "mixed", label: "Mixed" },
    ] },
    { key: "hairColor", label: "Hair Color", type: "select", placeholder: "Select hair color", options: [
      { value: "black", label: "Black" }, { value: "dark-brown", label: "Dark Brown" }, { value: "light-brown", label: "Light Brown" }, { value: "blonde", label: "Blonde" }, { value: "red", label: "Red / Auburn" }, { value: "gray", label: "Gray / Silver" }, { value: "bald", label: "Bald / Shaved" },
    ] },
    { key: "hairStyle", label: "Hair Style", type: "select", placeholder: "Select hair style", options: [
      { value: "short", label: "Short" }, { value: "medium", label: "Medium length" }, { value: "long", label: "Long" }, { value: "curly", label: "Curly" }, { value: "wavy", label: "Wavy" }, { value: "straight", label: "Straight" }, { value: "buzz-cut", label: "Buzz cut" }, { value: "ponytail", label: "Ponytail / Up" },
    ] },
    { key: "build", label: "Build", type: "select", placeholder: "Select build", options: [
      { value: "slim", label: "Slim" }, { value: "average", label: "Average" }, { value: "athletic", label: "Athletic" }, { value: "stocky", label: "Stocky / Broad" },
    ] },
    { key: "clothing", label: "Clothing Style", type: "text", placeholder: "e.g. business suit, casual shirt, turtleneck" },
    { key: "distinctiveFeatures", label: "Distinctive Features", type: "text", placeholder: "e.g. glasses, beard, freckles, dimples, scar on left cheek" },
    { key: "expression", label: "Default Expression", type: "select", placeholder: "Select expression", options: [
      { value: "neutral", label: "Neutral" }, { value: "friendly-smile", label: "Friendly smile" }, { value: "confident", label: "Confident / Serious" }, { value: "approachable", label: "Approachable / Warm" }, { value: "professional", label: "Professional / Composed" },
    ] },
    { key: "skinDetails", label: "Skin & Complexion", type: "text", placeholder: "e.g. fair skin, warm undertone, light tan, dark complexion" },
    { key: "avoid", label: "Don'ts", type: "textarea", placeholder: "What should not be shown (e.g. tattoos, piercings, hats)" },
  ],
  PRODUCT: [
    { key: "productDescription", label: "Product Description", type: "textarea", placeholder: "Describe the product (shape, material, color, dimensions)" },
    { key: "textAndLabels", label: "Text & Labels on Product", type: "textarea", placeholder: "Exact text, brand name, or labels that must appear on the product (e.g. 'ACME Co' on front, nutrition label on back)" },
    { key: "logoPlacement", label: "Logo Placement", type: "text", placeholder: "Where the logo appears (e.g. centered on front, top-left corner, embossed on lid)" },
    { key: "materialTexture", label: "Material & Texture", type: "text", placeholder: "e.g. matte black aluminum, glossy glass, kraft paper, brushed steel" },
    { key: "colorAccuracy", label: "Critical Colors", type: "text", placeholder: "Exact colors that must be accurate (e.g. Pantone 2925 C blue cap, white body)" },
    { key: "setting", label: "Setting", type: "select", placeholder: "Select a setting", options: [
      { value: "white-background", label: "White Background" }, { value: "lifestyle", label: "Lifestyle" }, { value: "in-use", label: "In Use" }, { value: "flatlay", label: "Flatlay" },
    ] },
    { key: "angles", label: "Angles", type: "select", placeholder: "Select an angle", options: [
      { value: "front", label: "Front View" }, { value: "45-degree", label: "45°" }, { value: "top-down", label: "Top Down" }, { value: "detail-closeup", label: "Detail Close-up" },
    ] },
    { key: "scaleReference", label: "Scale Reference", type: "text", placeholder: "Size context (e.g. fits in one hand, 30cm tall, desktop-sized)" },
    { key: "avoid", label: "Don'ts", type: "textarea", placeholder: "What should not be visible (e.g. no competitor logos, no wrong color variants)" },
  ],
  STYLE: [
    { key: "styleDescription", label: "Style Description", type: "textarea", placeholder: "Describe the desired style (e.g. minimalist, retro, industrial)" },
    { key: "medium", label: "Medium", type: "select", placeholder: "Select a medium", options: [
      { value: "photography", label: "Photography" }, { value: "illustration", label: "Illustration" }, { value: "3d-render", label: "3D Render" }, { value: "mixed-media", label: "Mixed Media" },
    ] },
    { key: "colorPalette", label: "Color Palette", type: "text", placeholder: "Dominant colors or color mood" },
    { key: "textureFinish", label: "Texture & Finish", type: "text", placeholder: "e.g. grainy film, smooth gradient, paper texture, noise overlay" },
    { key: "compositionRules", label: "Composition Rules", type: "text", placeholder: "e.g. rule of thirds, centered, asymmetric, lots of negative space" },
    { key: "referenceArtists", label: "Reference Artists / Brands", type: "text", placeholder: "e.g. inspired by Dieter Rams, Apple aesthetic, Kinfolk magazine" },
    { key: "avoid", label: "Don'ts", type: "textarea", placeholder: "Unwanted style elements" },
  ],
  OBJECT: [
    { key: "objectDescription", label: "Object Description", type: "textarea", placeholder: "Describe the object (shape, material, size, weight)" },
    { key: "surfaceDetails", label: "Surface Details", type: "text", placeholder: "e.g. engraved text, printed logo, embossed pattern, serial number" },
    { key: "materialFinish", label: "Material & Finish", type: "text", placeholder: "e.g. polished chrome, raw wood, matte ceramic, transparent glass" },
    { key: "setting", label: "Setting", type: "select", placeholder: "Select a setting", options: [
      { value: "white-background", label: "White Background" }, { value: "in-context", label: "In Context" }, { value: "isolated", label: "Isolated" }, { value: "scale-reference", label: "Scale Reference" },
    ] },
    { key: "lighting", label: "Lighting", type: "select", placeholder: "Select lighting", options: [
      { value: "studio", label: "Studio" }, { value: "natural", label: "Natural" }, { value: "dramatic", label: "Dramatic" }, { value: "soft", label: "Soft" },
    ] },
    { key: "scaleContext", label: "Scale Context", type: "text", placeholder: "e.g. palm-sized, desktop-sized, person-height, room-filling" },
    { key: "avoid", label: "Don'ts", type: "textarea", placeholder: "What should not be shown" },
  ],
  BRAND_STYLE: [
    { key: "styleDirection", label: "Style Direction", type: "textarea", placeholder: "Describe the visual direction of the brand" },
    { key: "medium", label: "Medium", type: "select", placeholder: "Select a medium", options: [
      { value: "logo-style", label: "Logo Style" }, { value: "print", label: "Print" }, { value: "digital", label: "Digital" }, { value: "packaging", label: "Packaging" }, { value: "social-media", label: "Social Media" },
    ] },
    { key: "colorPalette", label: "Color Palette", type: "text", placeholder: "Primary and secondary colors (e.g. #1FD1B2 teal, #0F172A navy)" },
    { key: "typography", label: "Typography Style", type: "text", placeholder: "e.g. Inter for headings, serif for body, all-caps for CTAs" },
    { key: "logoTreatment", label: "Logo Treatment", type: "text", placeholder: "How should the logo be represented (e.g. full logo, icon only, monochrome)" },
    { key: "graphicElements", label: "Graphic Elements", type: "text", placeholder: "e.g. rounded corners, geometric patterns, gradient overlays, line art accents" },
    { key: "avoid", label: "Don'ts", type: "textarea", placeholder: "Unwanted visual elements (e.g. no drop shadows, no stock-photo feel)" },
  ],
  PHOTOGRAPHY: [
    { key: "subject", label: "Subject", type: "textarea", placeholder: "Subject of the photos" },
    { key: "photoStyle", label: "Photo Style", type: "select", placeholder: "Select a style", options: [
      { value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }, { value: "macro", label: "Macro" }, { value: "street", label: "Street" }, { value: "product", label: "Product Photography" },
    ] },
    { key: "lighting", label: "Lighting", type: "select", placeholder: "Select lighting", options: [
      { value: "natural", label: "Natural" }, { value: "studio", label: "Studio" }, { value: "golden-hour", label: "Golden Hour" }, { value: "high-key", label: "High-key" }, { value: "low-key", label: "Low-key" },
    ] },
    { key: "colorGrading", label: "Color Grading", type: "text", placeholder: "e.g. warm tones, desaturated, high contrast, film emulation (Portra 400)" },
    { key: "postProcessing", label: "Post-Processing Style", type: "text", placeholder: "e.g. grain, vignette, split toning, clean retouching" },
    { key: "depthOfField", label: "Depth of Field", type: "select", placeholder: "Select depth of field", options: [
      { value: "shallow", label: "Shallow (blurred background)" }, { value: "medium", label: "Medium" }, { value: "deep", label: "Deep (everything sharp)" },
    ] },
    { key: "avoid", label: "Don'ts", type: "textarea", placeholder: "What to avoid (e.g. no HDR look, no over-saturated colors)" },
  ],
  ILLUSTRATION: [
    { key: "illustrationStyle", label: "Illustration Style", type: "select", placeholder: "Select a style", options: ILLUSTRATION_STYLE_OPTIONS.illustrationStyle },
    { key: "colorApproach", label: "Color Approach", type: "select", placeholder: "Select a color approach", options: ILLUSTRATION_STYLE_OPTIONS.colorApproach },
    { key: "lineQuality", label: "Line Quality", type: "select", placeholder: "Select line quality", options: ILLUSTRATION_STYLE_OPTIONS.lineQuality },
    { key: "detailLevel", label: "Detail Level", type: "select", placeholder: "Select detail level", options: ILLUSTRATION_STYLE_OPTIONS.detailLevel },
    { key: "mood", label: "Mood", type: "text", placeholder: "Overall mood or feeling" },
    { key: "characterStyle", label: "Character / Subject Style", type: "text", placeholder: "e.g. proportions (realistic, chibi, stylized), face style, limb style" },
    { key: "referenceArtists", label: "Reference Artists", type: "text", placeholder: "e.g. inspired by Malika Favre, Charley Harper, Studio Ghibli" },
    { key: "textIntegration", label: "Text Integration", type: "select", placeholder: "How text appears in illustrations", options: [
      { value: "none", label: "No text" }, { value: "hand-lettered", label: "Hand-lettered" }, { value: "typographic", label: "Typographic / Clean" }, { value: "integrated", label: "Integrated into scene" },
    ] },
    { key: "avoid", label: "Don'ts", type: "textarea", placeholder: "Unwanted elements (e.g. no realistic faces, no 3D effects)" },
  ],
};
