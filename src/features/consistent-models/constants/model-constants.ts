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
}

export const TYPE_CONFIG: Record<ConsistentModelType, ModelTypeConfig> = {
  PERSON: {
    label: "Person",
    description: "Train on faces and people for consistent portrait generation",
    triggerWord: "ohwx person",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  PRODUCT: {
    label: "Product",
    description: "Train on product photos for consistent product imagery",
    triggerWord: "ohwx product",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  STYLE: {
    label: "Style",
    description: "Train on a visual style for consistent brand aesthetics",
    triggerWord: "ohwx style",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
  },
  OBJECT: {
    label: "Object",
    description: "Train on specific objects for consistent representation",
    triggerWord: "ohwx object",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  BRAND_STYLE: {
    label: "Brand Style",
    description: "Define visual style references for brand imagery",
    triggerWord: "",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
  },
  PHOTOGRAPHY: {
    label: "Photography",
    description: "Define photography style guides",
    triggerWord: "",
    color: "text-cyan-700",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
  },
  ANIMATION: {
    label: "Animation",
    description: "Define animation style references",
    triggerWord: "",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
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
  PERSON: "ohwx person",
  PRODUCT: "ohwx product",
  STYLE: "ohwx style",
  OBJECT: "ohwx object",
  BRAND_STYLE: "",
  PHOTOGRAPHY: "",
  ANIMATION: "",
};

// ─── Min Reference Images per Type ──────────────────────────

export const MIN_IMAGES_BY_TYPE: Record<ConsistentModelType, number> = {
  PERSON: 5,
  PRODUCT: 5,
  STYLE: 10,
  OBJECT: 5,
  BRAND_STYLE: 0,
  PHOTOGRAPHY: 0,
  ANIMATION: 0,
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

// ─── Trainable Types (require Astria training) ──────────

/** Types that support AI training + generation. Non-trainable types are style guides only. */
export const TRAINABLE_TYPES = new Set<ConsistentModelType>(['PERSON', 'PRODUCT', 'STYLE', 'OBJECT']);
