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

export const MODEL_TYPE_OPTIONS = (
  Object.entries(TYPE_CONFIG) as [ConsistentModelType, ModelTypeConfig][]
).map(([value, config]) => ({
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

export const WIZARD_STEPS_OWN_IMAGES = ["Upload", "Training", "Showcase"] as const;
export const WIZARD_STEPS_SYNTHETIC = ["Generate References", "Training", "Showcase"] as const;
export const WIZARD_STEPS_NON_TRAINABLE = ["Style Guide", "Reference Images", "Overview"] as const;
export const WIZARD_STEPS_ILLUSTRATION = ["Illustration Style", "Reference Images", "Overview"] as const;

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

export interface FalProvider {
  id: string;
  label: string;
  description: string;
  cost: string;
  /** Preview image path (relative to /images/fal-providers/) */
  preview: string;
}

/** All available generation providers (superset) */
const ALL_FAL_PROVIDERS: Record<string, FalProvider> = {
  "fal-ai/flux-2-pro":       { id: "fal-ai/flux-2-pro",       label: "FLUX.2 Pro",      description: "Highest fidelity — state-of-the-art photorealism and detail",     cost: "$0.03/MP",  preview: "flux-2-pro.svg" },
  "fal-ai/recraft-v3":       { id: "fal-ai/recraft-v3",       label: "Recraft V3",      description: "Brand-grade design — best for logos, icons and illustrations",    cost: "$0.04/img", preview: "recraft-v3.svg" },
  "fal-ai/seedream-v4-5":    { id: "fal-ai/seedream-v4-5",    label: "Seedream V4.5",   description: "Text rendering — embeds readable text into images",              cost: "$0.04/img", preview: "seedream-v4-5.svg" },
  "fal-ai/flux-2":           { id: "fal-ai/flux-2",           label: "FLUX.2 Dev",      description: "Fast & accurate — strong prompt adherence at lower cost",        cost: "$0.025/MP", preview: "flux-2-dev.svg" },
  "fal-ai/ideogram-v3":      { id: "fal-ai/ideogram-v3",      label: "Ideogram V3",     description: "Creative versatility — excels at typography and mixed styles",    cost: "$0.04/img", preview: "ideogram-v3.svg" },
  "fal-ai/nanobanana-pro":   { id: "fal-ai/nanobanana-pro",   label: "Nanobanana Pro",  description: "Ultra-fast portraits — optimized for face detail and lighting",   cost: "$0.02/img", preview: "nanobanana-pro.svg" },
  "fal-ai/phota":            { id: "fal-ai/phota",            label: "Phota",           description: "Photographic realism — natural skin tones and studio lighting",   cost: "$0.03/img", preview: "phota.svg" },
};

/** Provider IDs per model type — only shows relevant models */
const FAL_PROVIDERS_BY_TYPE: Record<ConsistentModelType, string[]> = {
  PERSON:       ["fal-ai/flux-2-pro", "fal-ai/nanobanana-pro", "fal-ai/phota"],
  PRODUCT:      ["fal-ai/flux-2-pro", "fal-ai/flux-2", "fal-ai/seedream-v4-5"],
  OBJECT:       ["fal-ai/flux-2-pro", "fal-ai/flux-2", "fal-ai/seedream-v4-5"],
  STYLE:        ["fal-ai/flux-2-pro", "fal-ai/recraft-v3", "fal-ai/ideogram-v3", "fal-ai/flux-2"],
  BRAND_STYLE:  ["fal-ai/recraft-v3", "fal-ai/ideogram-v3", "fal-ai/flux-2-pro", "fal-ai/seedream-v4-5"],
  PHOTOGRAPHY:  ["fal-ai/flux-2-pro", "fal-ai/flux-2"],
  ILLUSTRATION: ["fal-ai/recraft-v3", "fal-ai/ideogram-v3", "fal-ai/flux-2-pro", "fal-ai/flux-2"],
  VOICE:        [],
  SOUND_EFFECT: [],
};

/** Get the relevant providers for a model type (ordered by relevance) */
export function getFalProvidersForType(type: ConsistentModelType): FalProvider[] {
  const ids = FAL_PROVIDERS_BY_TYPE[type] ?? Object.keys(ALL_FAL_PROVIDERS);
  return ids.map((id) => ALL_FAL_PROVIDERS[id]).filter(Boolean);
}

/** Flat list of all providers (for API validation) */
export const FAL_PROVIDERS = Object.values(ALL_FAL_PROVIDERS);

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
    { key: "avoid", label: "Don'ts", type: "textarea", placeholder: "What should not be shown (e.g. tattoos, glasses, piercings)" },
  ],
  PRODUCT: [
    { key: "productDescription", label: "Product Description", type: "textarea", placeholder: "Describe the product (shape, material, color)" },
    { key: "setting", label: "Setting", type: "select", placeholder: "Select a setting", options: [
      { value: "white-background", label: "White Background" }, { value: "lifestyle", label: "Lifestyle" }, { value: "in-use", label: "In Use" }, { value: "flatlay", label: "Flatlay" },
    ] },
    { key: "angles", label: "Angles", type: "select", placeholder: "Select an angle", options: [
      { value: "front", label: "Front View" }, { value: "45-degree", label: "45°" }, { value: "top-down", label: "Top Down" }, { value: "detail-closeup", label: "Detail Close-up" },
    ] },
    { key: "avoid", label: "Don'ts", type: "textarea", placeholder: "What should not be visible" },
  ],
  STYLE: [
    { key: "styleDescription", label: "Style Description", type: "textarea", placeholder: "Describe the desired style (e.g. minimalist, retro, industrial)" },
    { key: "medium", label: "Medium", type: "select", placeholder: "Select a medium", options: [
      { value: "photography", label: "Photography" }, { value: "illustration", label: "Illustration" }, { value: "3d-render", label: "3D Render" }, { value: "mixed-media", label: "Mixed Media" },
    ] },
    { key: "colorPalette", label: "Color Palette", type: "text", placeholder: "Dominant colors or color mood" },
    { key: "avoid", label: "Don'ts", type: "textarea", placeholder: "Unwanted style elements" },
  ],
  OBJECT: [
    { key: "objectDescription", label: "Object Description", type: "textarea", placeholder: "Describe the object (shape, material, size)" },
    { key: "setting", label: "Setting", type: "select", placeholder: "Select a setting", options: [
      { value: "white-background", label: "White Background" }, { value: "in-context", label: "In Context" }, { value: "isolated", label: "Isolated" }, { value: "scale-reference", label: "Scale Reference" },
    ] },
    { key: "lighting", label: "Lighting", type: "select", placeholder: "Select lighting", options: [
      { value: "studio", label: "Studio" }, { value: "natural", label: "Natural" }, { value: "dramatic", label: "Dramatic" }, { value: "soft", label: "Soft" },
    ] },
    { key: "avoid", label: "Don'ts", type: "textarea", placeholder: "What should not be shown" },
  ],
  BRAND_STYLE: [
    { key: "styleDirection", label: "Style Direction", type: "textarea", placeholder: "Describe the visual direction of the brand" },
    { key: "medium", label: "Medium", type: "select", placeholder: "Select a medium", options: [
      { value: "logo-style", label: "Logo Style" }, { value: "print", label: "Print" }, { value: "digital", label: "Digital" }, { value: "packaging", label: "Packaging" }, { value: "social-media", label: "Social Media" },
    ] },
    { key: "colorPalette", label: "Color Palette", type: "text", placeholder: "Primary and secondary colors" },
    { key: "avoid", label: "Don'ts", type: "textarea", placeholder: "Unwanted visual elements" },
  ],
  PHOTOGRAPHY: [
    { key: "subject", label: "Subject", type: "textarea", placeholder: "Subject of the photos" },
    { key: "photoStyle", label: "Photo Style", type: "select", placeholder: "Select a style", options: [
      { value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }, { value: "macro", label: "Macro" }, { value: "street", label: "Street" }, { value: "product", label: "Product Photography" },
    ] },
    { key: "lighting", label: "Lighting", type: "select", placeholder: "Select lighting", options: [
      { value: "natural", label: "Natural" }, { value: "studio", label: "Studio" }, { value: "golden-hour", label: "Golden Hour" }, { value: "high-key", label: "High-key" }, { value: "low-key", label: "Low-key" },
    ] },
    { key: "avoid", label: "Don'ts", type: "textarea", placeholder: "What to avoid" },
  ],
  ILLUSTRATION: [
    { key: "illustrationStyle", label: "Illustration Style", type: "select", placeholder: "Select a style", options: ILLUSTRATION_STYLE_OPTIONS.illustrationStyle },
    { key: "colorApproach", label: "Color Approach", type: "select", placeholder: "Select a color approach", options: ILLUSTRATION_STYLE_OPTIONS.colorApproach },
    { key: "lineQuality", label: "Line Quality", type: "select", placeholder: "Select line quality", options: ILLUSTRATION_STYLE_OPTIONS.lineQuality },
    { key: "detailLevel", label: "Detail Level", type: "select", placeholder: "Select detail level", options: ILLUSTRATION_STYLE_OPTIONS.detailLevel },
    { key: "mood", label: "Mood", type: "text", placeholder: "Overall mood or feeling" },
    { key: "avoid", label: "Don'ts", type: "textarea", placeholder: "Unwanted elements" },
  ],
};
