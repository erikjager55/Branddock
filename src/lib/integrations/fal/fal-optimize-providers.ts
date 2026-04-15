// =============================================================
// fal.ai Image Optimization Provider Registry
//
// Models that take an existing image and enhance, upscale,
// or transform it. Used by the AI Studio "Optimize Image" flow.
// =============================================================

// ─── Types ───────────────────────────────────────────────────

export interface FalOptimizeProvider {
  id: string;
  /** The fal.ai endpoint passed to `fal.subscribe()`. */
  endpoint: string;
  label: string;
  description: string;
  cost: string;
  /** Category for grouping in the UI */
  category: 'edit' | 'upscale' | 'background' | 'enhance' | 'face';
  /** Category display label */
  categoryLabel: string;
  /** The input field name for the source image */
  imageUrlField: string;
  /** When true, the image URL is sent as an array (e.g. Qwen uses image_urls: [url]) */
  imageUrlIsArray?: boolean;
  /** Additional fixed params to send with every request */
  fixedParams?: Record<string, unknown>;
}

// ─── Registry ────────────────────────────────────────────────

const ALL_OPTIMIZE_PROVIDERS: Record<string, FalOptimizeProvider> = {
  // ── Prompt-based Edit ─────────────────────────────────────
  'kontext-pro': {
    id: 'kontext-pro',
    endpoint: 'fal-ai/flux-pro/kontext',
    label: 'FLUX Kontext Pro',
    description: 'Instruction-based editing. Describe what to change — background, colors, objects, style — and it applies it.',
    cost: '$0.04/img',
    category: 'edit',
    categoryLabel: 'Edit with Prompt',
    imageUrlField: 'image_url',
  },
  'kontext-max': {
    id: 'kontext-max',
    endpoint: 'fal-ai/flux-pro/kontext/max',
    label: 'FLUX Kontext Max',
    description: 'Premium instruction editing with better prompt adherence and typography support.',
    cost: '$0.08/img',
    category: 'edit',
    categoryLabel: 'Edit with Prompt',
    imageUrlField: 'image_url',
  },
  'qwen-edit': {
    id: 'qwen-edit',
    endpoint: 'fal-ai/qwen-image-2/edit',
    label: 'Qwen Image Edit',
    description: 'Natural language edits — backgrounds, objects, style, text, color and lighting adjustments.',
    cost: '$0.035/img',
    category: 'edit',
    categoryLabel: 'Edit with Prompt',
    imageUrlField: 'image_urls',
    imageUrlIsArray: true,
  },
  'style-transfer': {
    id: 'style-transfer',
    endpoint: 'fal-ai/image-apps-v2/style-transfer',
    label: 'Style Transfer',
    description: 'Apply artistic styles to your image — anime, impressionism, pixel art, vaporwave, and more.',
    cost: '$0.04/img',
    category: 'edit',
    categoryLabel: 'Edit with Prompt',
    imageUrlField: 'image_url',
  },
  // ── Upscale ───────────────────────────────────────────────
  'topaz-upscale': {
    id: 'topaz-upscale',
    endpoint: 'fal-ai/topaz/upscale/image',
    label: 'Topaz Upscale',
    description: 'All-in-one: upscale + sharpen + denoise + face enhance. Best overall quality.',
    cost: '$0.08/img',
    category: 'upscale',
    categoryLabel: 'Upscale',
    imageUrlField: 'image_url',
    fixedParams: { upscale_factor: 2, model: 'Standard V2', face_enhancement: true },
  },
  'esrgan': {
    id: 'esrgan',
    endpoint: 'fal-ai/esrgan',
    label: 'ESRGAN 4x',
    description: 'Fast and cheap upscaling without AI hallucination. Safe for product photos.',
    cost: '$0.001/img',
    category: 'upscale',
    categoryLabel: 'Upscale',
    imageUrlField: 'image_url',
    fixedParams: { scale: 4 },
  },
  'creative-upscaler': {
    id: 'creative-upscaler',
    endpoint: 'fal-ai/creative-upscaler',
    label: 'Creative Upscaler',
    description: 'AI-enhanced upscaling that reimagines detail. Ideal for low-resolution source images.',
    cost: '$0.04/img',
    category: 'upscale',
    categoryLabel: 'Upscale',
    imageUrlField: 'image_url',
    fixedParams: { scale: 4 },
  },
  // ── Background ────────────────────────────────────────────
  'birefnet': {
    id: 'birefnet',
    endpoint: 'fal-ai/birefnet/v2',
    label: 'BiRefNet v2',
    description: 'Best quality background removal with multiple model variants. Pixel-perfect edges.',
    cost: '$0.01/img',
    category: 'background',
    categoryLabel: 'Background',
    imageUrlField: 'image_url',
    fixedParams: { model: 'General Use (Light)', operating_resolution: '2048x2048' },
  },
  'bria-rmbg': {
    id: 'bria-rmbg',
    endpoint: 'fal-ai/bria/background/remove',
    label: 'Bria RMBG 2.0',
    description: 'Simple one-click background removal. Trained on licensed data (commercially safe).',
    cost: '$0.02/img',
    category: 'background',
    categoryLabel: 'Background',
    imageUrlField: 'image_url',
  },
  // ── Enhance ───────────────────────────────────────────────
  'clarity-upscaler': {
    id: 'clarity-upscaler',
    endpoint: 'fal-ai/clarity-upscaler',
    label: 'Clarity Upscaler',
    description: 'Diffusion-based enhancement. Improves sharpness, lighting, and detail while upscaling.',
    cost: '$0.03/MP',
    category: 'enhance',
    categoryLabel: 'Enhance',
    imageUrlField: 'image_url',
    fixedParams: { upscale_factor: 2, creativity: 0.35, resemblance: 0.6 },
  },
  'photo-restoration': {
    id: 'photo-restoration',
    endpoint: 'fal-ai/image-apps-v2/photo-restoration',
    label: 'Photo Restoration',
    description: 'Restore old or damaged photos. Fixes colors, scratches, and resolution.',
    cost: '$0.02/img',
    category: 'enhance',
    categoryLabel: 'Enhance',
    imageUrlField: 'image_url',
    fixedParams: { enhance_resolution: true, fix_colors: true, remove_scratches: true },
  },
  // ── Face ──────────────────────────────────────────────────
  'codeformer': {
    id: 'codeformer',
    endpoint: 'fal-ai/codeformer',
    label: 'CodeFormer',
    description: 'Transformer-based face restoration with 2x upscaling. Best for blurry or damaged faces.',
    cost: '$0.002/MP',
    category: 'face',
    categoryLabel: 'Face',
    imageUrlField: 'image_url',
    fixedParams: { fidelity: 0.5, upscale_factor: 2, face_upscale: true },
  },
  'retoucher': {
    id: 'retoucher',
    endpoint: 'fal-ai/retoucher',
    label: 'Face Retoucher',
    description: 'Automatic skin smoothing and blemish removal. Natural professional retouching.',
    cost: '$0.01/img',
    category: 'face',
    categoryLabel: 'Face',
    imageUrlField: 'image_url',
  },
};

// ─── Category config for UI ──────────────────────────────────

export const OPTIMIZE_CATEGORIES = [
  { key: 'edit', label: 'Edit with Prompt', description: 'Describe what to change — AI applies it' },
  { key: 'upscale', label: 'Upscale', description: 'Increase resolution up to 4x' },
  { key: 'background', label: 'Background', description: 'Remove or replace backgrounds' },
  { key: 'enhance', label: 'Enhance', description: 'Improve quality and sharpness' },
  { key: 'face', label: 'Face', description: 'Restore and enhance faces' },
] as const;

// ─── Public API ──────────────────────────────────────────────

export const FAL_OPTIMIZE_PROVIDERS: FalOptimizeProvider[] = Object.values(ALL_OPTIMIZE_PROVIDERS);

export function getFalOptimizeProviderById(id: string): FalOptimizeProvider | null {
  return ALL_OPTIMIZE_PROVIDERS[id] ?? null;
}

export function getFalOptimizeProvidersByCategory(category: string): FalOptimizeProvider[] {
  return FAL_OPTIMIZE_PROVIDERS.filter((p) => p.category === category);
}

export const DEFAULT_OPTIMIZE_PROVIDER = 'kontext-pro';
