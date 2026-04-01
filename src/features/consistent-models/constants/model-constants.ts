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
  minReferenceImages: 5,
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

export const MIN_IMAGES_BY_TYPE: Record<ConsistentModelType, number> = {
  PERSON: 5,
  PRODUCT: 5,
  STYLE: 10,
  OBJECT: 5,
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

// ─── Trainable Types (require Replicate training) ──────────

/** Types that support AI training + generation. Non-trainable types are style guides only. */
export const TRAINABLE_TYPES = new Set<ConsistentModelType>(['PERSON', 'PRODUCT', 'STYLE', 'OBJECT', 'BRAND_STYLE', 'PHOTOGRAPHY', 'ILLUSTRATION']);

// ─── Wizard Steps ───────────────────────────────────────────

export const WIZARD_STEPS_TRAINABLE = ["Generate References", "Curate & Upload", "Training", "Generate"] as const;
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
