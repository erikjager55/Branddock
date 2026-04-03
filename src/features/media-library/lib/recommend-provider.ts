import type { ImageProvider } from '@/features/media-library/types/media.types';

// ─── Question Definitions ──────────────────────────────────

export type ImageKind = 'photo' | 'illustration' | 'product' | 'banner';
export type ImagePurpose = 'social' | 'website' | 'print' | 'presentation';
export type ImageStyle = 'minimal' | 'vibrant' | 'editorial' | 'playful';

export interface QuestionOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

export const IMAGE_KIND_OPTIONS: QuestionOption<ImageKind>[] = [
  { value: 'photo', label: 'Photo-realistic', description: 'Realistic photograph look' },
  { value: 'illustration', label: 'Illustration', description: 'Drawn, graphic, or vector style' },
  { value: 'product', label: 'Product shot', description: 'Product photography or rendering' },
  { value: 'banner', label: 'Banner / Ad', description: 'Image with prominent text' },
];

export const IMAGE_PURPOSE_OPTIONS: QuestionOption<ImagePurpose>[] = [
  { value: 'social', label: 'Social media', description: 'Instagram, LinkedIn, etc.' },
  { value: 'website', label: 'Website', description: 'Landing page, hero image' },
  { value: 'print', label: 'Print ad', description: 'Magazine, billboard, flyer' },
  { value: 'presentation', label: 'Presentation', description: 'Slides, pitch deck' },
];

export const IMAGE_STYLE_OPTIONS: QuestionOption<ImageStyle>[] = [
  { value: 'minimal', label: 'Clean / Minimal', description: 'Simple, lots of whitespace' },
  { value: 'vibrant', label: 'Bold / Vibrant', description: 'Saturated colors, high contrast' },
  { value: 'editorial', label: 'Editorial / Premium', description: 'Magazine-quality, refined' },
  { value: 'playful', label: 'Playful / Creative', description: 'Fun, expressive, artistic' },
];

// ─── Provider Registry ─────────────────────────────────────

/** All generation providers (excl. TRAINED_MODEL which is a separate flow). */
export type GenerationProvider = 'IMAGEN' | 'DALLE' | 'FLUX_PRO' | 'RECRAFT' | 'IDEOGRAM';

export interface ProviderInfo {
  id: GenerationProvider;
  label: string;
  subtitle: string;
  color: string;
  bg: string;
  border: string;
}

export const PROVIDER_REGISTRY: Record<GenerationProvider, ProviderInfo> = {
  FLUX_PRO: {
    id: 'FLUX_PRO',
    label: 'Flux Pro',
    subtitle: 'Best photo-realism, sharp details',
    color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-500',
  },
  IMAGEN: {
    id: 'IMAGEN',
    label: 'Imagen 4',
    subtitle: 'Google\'s latest, clean aesthetic',
    color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500',
  },
  DALLE: {
    id: 'DALLE',
    label: 'DALL-E 3',
    subtitle: 'Creative concepts, HD quality',
    color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-500',
  },
  RECRAFT: {
    id: 'RECRAFT',
    label: 'Recraft V3',
    subtitle: 'Brand assets, marketing materials, vector-ready',
    color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-500',
  },
  IDEOGRAM: {
    id: 'IDEOGRAM',
    label: 'Ideogram V2',
    subtitle: 'Best text-in-image rendering for ads & banners',
    color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-500',
  },
};

// ─── Score Matrix ──────────────────────────────────────────

// Order: [IMAGEN, DALLE, FLUX_PRO, RECRAFT, IDEOGRAM]
const KIND_SCORES: Record<ImageKind, [number, number, number, number, number]> = {
  photo:        [3, 2, 3, 1, 1],
  illustration: [1, 3, 1, 3, 1],
  product:      [2, 1, 3, 2, 1],
  banner:       [1, 2, 1, 2, 3],
};

const PURPOSE_SCORES: Record<ImagePurpose, [number, number, number, number, number]> = {
  social:       [2, 2, 2, 2, 2],
  website:      [2, 2, 3, 2, 1],
  print:        [2, 2, 3, 2, 2],
  presentation: [2, 2, 2, 2, 1],
};

const STYLE_SCORES: Record<ImageStyle, [number, number, number, number, number]> = {
  minimal:   [3, 1, 2, 3, 1],
  vibrant:   [2, 3, 2, 2, 2],
  editorial: [3, 2, 3, 1, 1],
  playful:   [1, 3, 1, 2, 2],
};

// ─── Reason Fragments ──────────────────────────────────────

const KIND_REASONS: Record<ImageKind, Record<GenerationProvider, string>> = {
  photo:        { IMAGEN: 'photo-realistic imagery', DALLE: 'realistic photos', FLUX_PRO: 'sharp photo-realistic imagery', RECRAFT: 'product photography', IDEOGRAM: 'photo content' },
  illustration: { IMAGEN: 'graphic styles', DALLE: 'illustrations and graphics', FLUX_PRO: 'detailed renders', RECRAFT: 'brand illustrations and vector assets', IDEOGRAM: 'illustrated content' },
  product:      { IMAGEN: 'product visuals', DALLE: 'product imagery', FLUX_PRO: 'detailed product shots', RECRAFT: 'marketing product assets', IDEOGRAM: 'product displays' },
  banner:       { IMAGEN: 'ad backgrounds', DALLE: 'creative ad visuals', FLUX_PRO: 'ad imagery', RECRAFT: 'marketing banners', IDEOGRAM: 'text-heavy banners and ads' },
};

const STYLE_REASONS: Record<ImageStyle, Record<GenerationProvider, string>> = {
  minimal:   { IMAGEN: 'clean aesthetics', DALLE: 'simple compositions', FLUX_PRO: 'minimal detail', RECRAFT: 'clean brand design', IDEOGRAM: 'simple layouts' },
  vibrant:   { IMAGEN: 'vibrant output', DALLE: 'bold, vivid colors', FLUX_PRO: 'vibrant detail', RECRAFT: 'colorful brand assets', IDEOGRAM: 'bold ad designs' },
  editorial: { IMAGEN: 'editorial quality', DALLE: 'premium styling', FLUX_PRO: 'editorial-grade detail', RECRAFT: 'refined brand material', IDEOGRAM: 'premium layouts' },
  playful:   { IMAGEN: 'creative visuals', DALLE: 'playful, artistic output', FLUX_PRO: 'creative scenes', RECRAFT: 'expressive brand art', IDEOGRAM: 'fun ad designs' },
};

// ─── Recommendation Logic ──────────────────────────────────

export interface ProviderRecommendation {
  provider: ImageProvider;
  score: number;
  reason: string;
}

export interface QuestionnaireAnswers {
  imageKind: ImageKind;
  purpose: ImagePurpose;
  style: ImageStyle;
}

const PROVIDER_ORDER: GenerationProvider[] = ['IMAGEN', 'DALLE', 'FLUX_PRO', 'RECRAFT', 'IDEOGRAM'];

/** Returns 1-2 ranked provider recommendations based on questionnaire answers. */
export function recommendProviders(
  answers: QuestionnaireAnswers,
): ProviderRecommendation[] {
  const { imageKind, purpose, style } = answers;

  const kindScores = KIND_SCORES[imageKind];
  const purposeScores = PURPOSE_SCORES[purpose];
  const styleScores = STYLE_SCORES[style];

  const scores = PROVIDER_ORDER.map((provider, i) => ({
    provider: provider as ImageProvider,
    score: kindScores[i] + purposeScores[i] + styleScores[i],
  }));

  scores.sort((a, b) => b.score - a.score);

  const buildReason = (provider: GenerationProvider): string => {
    const kindPart = KIND_REASONS[imageKind][provider];
    const stylePart = STYLE_REASONS[style][provider];
    return `Best for ${kindPart} with ${stylePart}`;
  };

  const top = scores[0];
  const results: ProviderRecommendation[] = [
    { provider: top.provider, score: top.score, reason: buildReason(top.provider as GenerationProvider) },
  ];

  // Include second provider if within 2 points of top
  if (scores.length > 1 && top.score - scores[1].score <= 2) {
    const second = scores[1];
    results.push({
      provider: second.provider,
      score: second.score,
      reason: buildReason(second.provider as GenerationProvider),
    });
  }

  return results;
}
