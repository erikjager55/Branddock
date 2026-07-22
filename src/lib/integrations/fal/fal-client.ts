/**
 * fal.ai API client for image generation (incl. multi-ref stijlreferenties).
 * Singleton pattern matching other integration clients (elevenlabs, openai).
 *
 * Trainer-ombouw 2026-07-21: de LoRA-train/generate-primitieven zijn
 * verwijderd — stijl komt uit referentiebeelden via image_urls.
 * Env var: FAL_KEY (auto-detected by the SDK).
 */

import { fal } from '@fal-ai/client';
import { getFalProviderById, getFalEndpoint } from './fal-providers';
import { formatNegativeAsPromptDirective, NEGATIVE_PROMPT_DEFAULTS } from '@/lib/ai/image-quality/negative-prompts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FalGenerationImage {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
}

export interface FalGenerationResult {
  images: FalGenerationImage[];
  seed?: number;
  prompt?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

let falConfigured = false;

function ensureConfigured(): void {
  if (falConfigured) return;

  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    throw new Error(
      'FAL_KEY environment variable is not set. fal.ai integration is not available.'
    );
  }

  fal.config({ credentials: apiKey });
  falConfigured = true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether fal.ai is configured (FAL_KEY env var present).
 */
export function isFalConfigured(): boolean {
  return !!process.env.FAL_KEY;
}

// ---------------------------------------------------------------------------
// Standalone Image Generation (for reference image generation)
// ---------------------------------------------------------------------------

export interface FalStandaloneGenerationOptions {
  imageSize?: string;
  seed?: number;
  numImages?: number;
  /**
   * F40 (audit 2026-05-13): brand-style anchor reference URLs.
   * Wordt doorgegeven als image_urls naar modellen die multi-ref
   * ondersteunen (Nano Banana, Recraft, FLUX 2). Cap per model is
   * via maxAnchorsForModel; caller is verantwoordelijk voor slicing.
   */
  referenceImageUrls?: string[];
  /**
   * Output-resolutie voor aspect-ratio-modellen (Nano Banana Pro / Phota).
   * Default '1K'; stijlreferentie-flows (AI Trainer) gebruiken '4K'.
   * Let op: fal rekent per output-resolutie — 4K is duurder dan 1K.
   */
  resolution?: '1K' | '2K' | '4K';
  /**
   * F42d (audit 2026-05-14): Recraft-specific style param. Recraft V3
   * heeft een structured `style` veld dat OUTPUT-aard bepaalt: 'any' |
   * 'digital_illustration' | 'vector_illustration' | 'realistic_image' |
   * 'icon'. Zonder dit produceert Recraft default photoreal, óók als de
   * prompt om illustration vraagt. Caller (generate-visual route)
   * mapped styleDirection-chip → Recraft style value.
   */
  recraftStyle?: 'any' | 'digital_illustration' | 'vector_illustration' | 'realistic_image' | 'icon';
  /**
   * Pattern A image-quality-chain: negative prompt — defaults + workspace
   * imageryDonts. FAL Flux Pro Kontext + FLUX 2 Pro accepteren dit als
   * native parameter. Andere endpoints negeren het (fal valideert input
   * per endpoint).
   */
  negativePrompt?: string;
}

/** Models that use aspect_ratio + resolution instead of image_size */
const ASPECT_RATIO_MODELS = new Set([
  'fal-ai/nano-banana-pro',
  'fal-ai/phota',
]);

/**
 * Per-model max prompt-length. Bewezen via empirische test (zie
 * scripts/experiments/test-recraft-v3.ts):
 *  - Recraft V3: 1000 chars hard cap (422 "String should have at most 1000 characters")
 *  - Seedream V4: ~1000 chars (zelfde fal-stack)
 *  - Ideogram V3: ~800 chars
 *  - FLUX 2 Pro / Nano Banana / Phota: geen harde cap geobserveerd; safe ~3000
 * Truncate beleefd, niet hard cuttend: split bij laatste punt/spatie binnen cap.
 */
const MAX_PROMPT_LENGTH_BY_MODEL: Record<string, number> = {
  'fal-ai/recraft-v3': 1000,
  'fal-ai/seedream-v4-5': 1000,
  'fal-ai/ideogram-v3': 800,
};
const DEFAULT_MAX_PROMPT_LENGTH = 3000;

/**
 * Word-safe truncation of a prompt to the per-model character cap (3000
 * default). Exported so routes that call fal.subscribe directly apply the
 * same prompt-cap guard as generateFalImage (prompt-audit 2026-06-11, T7).
 */
export function truncatePromptForModel(prompt: string, modelId: string): string {
  const cap = MAX_PROMPT_LENGTH_BY_MODEL[modelId] ?? DEFAULT_MAX_PROMPT_LENGTH;
  if (prompt.length <= cap) return prompt;
  // Snijd af op laatste punt/spatie binnen cap zodat we niet midden in een
  // woord stoppen.
  const sliced = prompt.slice(0, cap);
  const lastSentence = sliced.lastIndexOf('. ');
  const lastSpace = sliced.lastIndexOf(' ');
  const cutoff = lastSentence > cap * 0.7 ? lastSentence + 1 : lastSpace > cap * 0.8 ? lastSpace : cap;
  return sliced.slice(0, cutoff).trim();
}

/**
 * Word-safe cap op de negative-directive zodat een lange donts-lijst de
 * prompt-adherence van het model niet verwatert (R6, audit 2026-06-10).
 * Ruim genoeg voor defaults (~310) + gecureerde donts + brief-avoid.
 */
const NEGATIVE_DIRECTIVE_MAX_CHARS = 1200;

const NEGATIVE_DEFAULTS_SET = new Set(NEGATIVE_PROMPT_DEFAULTS);

/**
 * Bepaal de negative-prompt-strategie voor een model (geëxporteerd voor
 * smoke-tests, pure functie). Modellen zonder native `negative_prompt`-param
 * (Gemini-familie: nano-banana — fal negeert de param fail-soft, waardoor
 * negatives daar vóór deze fix een no-op waren) krijgen de negative als
 * prompt-text-directive in de positive prompt gevouwen; overige modellen
 * houden de native param.
 *
 * Review-fixes 2026-06-10: (a) de directive wordt SPECIFIEK-EERST herordend
 * (donts/userNegations vóór de defaults) zodat een eventuele cap nooit eerst
 * de meest specifieke negaties wegknipt; (b) de positive prompt wordt vooraf
 * op (model-cap − directive-lengte) getrimd zodat truncatePromptForModel de
 * directive nooit stil van de staart kapt.
 */
export function applyNegativePromptStrategy(
  modelId: string,
  prompt: string,
  negativePrompt: string | undefined,
): { prompt: string; nativeNegative: string | undefined } {
  if (!negativePrompt?.trim()) return { prompt, nativeNegative: undefined };
  const provider = getFalProviderById(modelId);
  if (provider?.supportsNegativePrompt !== false) {
    return { prompt, nativeNegative: negativePrompt };
  }
  return { prompt: foldNegativeIntoPrompt(modelId, prompt, negativePrompt), nativeNegative: undefined };
}

/**
 * Fold a negative prompt into the positive prompt as a capped,
 * specificity-first "Avoid: ..." directive. For endpoints WITHOUT a native
 * `negative_prompt` input — the Gemini family (nano-banana) and the LoRA
 * generators (fal-ai/flux-2/lora, fal-ai/flux-lora). fal drops unknown input
 * fields silently, so sending a native param to those endpoints is a dead
 * no-op (prompt-audit 2026-06-11, gap-fal-image-paths).
 *
 * Returns the prompt unchanged when there is nothing to fold.
 */
export function foldNegativeIntoPrompt(
  modelId: string,
  prompt: string,
  negativePrompt: string | undefined,
): string {
  if (!negativePrompt?.trim()) return prompt;
  // Specificity-first: buildNegativePrompt orders defaults→donts→negations;
  // for the directive path we reverse that (exact match against the defaults
  // set; segments containing a comma split harmlessly and stay custom) so a
  // cap never cuts the most specific negations first.
  const segments = negativePrompt.split(', ');
  const custom = segments.filter((s) => !NEGATIVE_DEFAULTS_SET.has(s));
  const defaults = segments.filter((s) => NEGATIVE_DEFAULTS_SET.has(s));
  let directive = formatNegativeAsPromptDirective([...custom, ...defaults].join(', '));
  if (directive.length > NEGATIVE_DIRECTIVE_MAX_CHARS) {
    const sliced = directive.slice(0, NEGATIVE_DIRECTIVE_MAX_CHARS);
    const lastComma = sliced.lastIndexOf(', ');
    directive = (lastComma > NEGATIVE_DIRECTIVE_MAX_CHARS * 0.6 ? sliced.slice(0, lastComma) : sliced).trimEnd();
    if (!directive.endsWith('.')) directive += '.';
  }
  // Reserve budget: otherwise truncatePromptForModel (tail truncation) cuts
  // exactly the directive off again for long prompts.
  const cap = MAX_PROMPT_LENGTH_BY_MODEL[modelId] ?? DEFAULT_MAX_PROMPT_LENGTH;
  const budget = Math.max(cap - directive.length, Math.floor(cap * 0.5));
  const trimmedPrompt = prompt.length > budget ? truncateWordSafe(prompt, budget) : prompt;
  return trimmedPrompt + directive;
}

function truncateWordSafe(text: string, budget: number): string {
  const sliced = text.slice(0, budget);
  const lastSentence = sliced.lastIndexOf('. ');
  const lastSpace = sliced.lastIndexOf(' ');
  const cutoff = lastSentence > budget * 0.7 ? lastSentence + 1 : lastSpace > budget * 0.8 ? lastSpace : budget;
  return sliced.slice(0, cutoff).trim();
}

/** Map image_size preset to aspect_ratio string */
function toAspectRatio(imageSize: string): string {
  const map: Record<string, string> = {
    'square_hd': '1:1',
    'landscape_16_9': '16:9',
    'portrait_16_9': '9:16',
    'landscape_4_3': '4:3',
    'portrait_4_3': '3:4',
  };
  return map[imageSize] ?? '1:1';
}

/**
 * Generate images using any fal.ai model (not LoRA-based).
 * Automatically adapts input format per model (image_size vs aspect_ratio).
 */
export async function generateFalImage(
  modelId: string,
  prompt: string,
  options?: FalStandaloneGenerationOptions
): Promise<FalGenerationResult> {
  ensureConfigured();

  const useAspectRatio = ASPECT_RATIO_MODELS.has(modelId);
  const imageSize = options?.imageSize ?? 'square_hd';

  // F40: brand-style anchor reference URLs als image_urls voor multi-ref
  // modellen. LET OP: fal dropt onbekende input-velden STIL per endpoint —
  // Nano Banana t2i negeert image_urls en heeft de /edit-variant nodig
  // (endpoint-switch hieronder); Recraft/FLUX 2 accepteren het veld direct.
  const refUrls = options?.referenceImageUrls ?? [];
  const hasRefs = refUrls.length > 0;

  // R6 (audit 2026-06-10): modellen zonder native negative_prompt-param krijgen
  // de negative als prompt-text-directive — vóór de truncatie zodat de cap blijft
  // gelden voor het geheel.
  const negStrategy = applyNegativePromptStrategy(modelId, prompt, options?.negativePrompt);

  // F42c (audit 2026-05-14): truncate prompt naar model-specific cap.
  // Recraft V3 / Seedream / Ideogram weigeren prompts > N chars met 422.
  const truncatedPrompt = truncatePromptForModel(negStrategy.prompt, modelId);
  if (truncatedPrompt.length < negStrategy.prompt.length) {
    console.log(
      `[fal-client] prompt truncated from ${negStrategy.prompt.length} → ${truncatedPrompt.length} chars for ${modelId}`,
    );
  }

  const input: Record<string, unknown> = {
    prompt: truncatedPrompt,
    num_images: options?.numImages ?? 1,
    output_format: 'png',
    ...(options?.seed != null ? { seed: options.seed } : {}),
    ...(useAspectRatio
      ? { aspect_ratio: toAspectRatio(imageSize), resolution: options?.resolution ?? '1K' }
      : { image_size: imageSize }),
    ...(hasRefs ? { image_urls: refUrls } : {}),
    // F42d: Recraft V3 structured style param (alleen meesturen voor Recraft;
    // andere endpoints negeren of falen op onbekend veld).
    ...(modelId === 'fal-ai/recraft-v3' && options?.recraftStyle
      ? { style: options.recraftStyle }
      : {}),
    // Pattern A image-quality-chain: native negative-prompt parameter.
    // FAL Flux Pro Kontext + FLUX 2 Pro consumeren dit. Modellen met
    // supportsNegativePrompt=false kregen 'm hierboven al als prompt-directive.
    ...(negStrategy.nativeNegative
      ? { negative_prompt: negStrategy.nativeNegative }
      : {}),
  };

  // F42 (audit 2026-05-13): resolve provider endpoint via registry —
  // sommige modellen (Recraft V3 → fal-ai/recraft/v3/text-to-image,
  // Seedream → fal-ai/bytedance/seedream/v4/text-to-image, Ideogram →
  // fal-ai/ideogram/v3) hebben een nested-path endpoint die afwijkt
  // van hun registry-id. Voorheen passed we modelId direct → "Model
  // not found" 404 voor deze providers. Static import (was dynamic;
  // dynamic import had cache-issues bij HMR).
  const provider = getFalProviderById(modelId);
  let endpoint = provider ? getFalEndpoint(provider) : modelId;
  // Nano Banana's text-to-image-endpoint NEGEERT image_urls volledig (fal
  // dropt onbekende input-velden stil); multi-ref werkt alleen op de
  // /edit-variant. Empirisch bewezen 2026-07-21: t2i + 3 illustratie-refs →
  // foto; /edit + dezelfde refs → illustratie in referentiestijl.
  if (hasRefs && endpoint.includes('nano-banana') && !endpoint.endsWith('/edit')) {
    endpoint = `${endpoint}/edit`;
  }
  console.log(`[fal-client] dispatching ${modelId} → endpoint ${endpoint}`);

   
  const result = await fal.subscribe(endpoint, {
    input: input as any,
    timeout: 180_000, // 3 minutes — GPU queue can be slow
  });

  const data = result.data as Record<string, unknown>;
  const images = (data?.images as FalGenerationImage[]) ?? [];

  return {
    images,
    seed: data?.seed as number | undefined,
    prompt: data?.prompt as string | undefined,
  };
}

/**
 * F39 (audit 2026-05-13): Nano Banana image-edit via natural language.
 *
 * Takes existing image + instruction ("blur background", "remove the cup",
 * "make the lighting warmer") and returns edited image. Uses Nano Banana
 * Pro's targeted-edit capability — Gemini 2.5/3 Flash Image accepts both
 * image_url and prompt for local edits. Other models (FLUX 2 Pro etc)
 * lack this feature.
 *
 * The `/edit` endpoint accepts an `image_urls` array (1-14 images) alongside
 * `prompt` — the base text-to-image endpoint silently DROPS that field
 * (proven 2026-07-21), so edits must go to the /edit variant.
 */
export async function editFalImageWithInstruction(
  imageUrl: string,
  instruction: string,
  options?: { seed?: number; aspectRatio?: string },
): Promise<FalGenerationResult> {
  ensureConfigured();

  const editModelId = 'fal-ai/nano-banana-pro/edit';
  const input: Record<string, unknown> = {
    prompt: instruction,
    image_urls: [imageUrl],
    num_images: 1,
    output_format: 'png',
    aspect_ratio: options?.aspectRatio ?? '1:1',
    resolution: '1K',
    ...(options?.seed != null ? { seed: options.seed } : {}),
  };

  // fal SDK heeft typed input voor nano-banana-pro; cast naar `any` voor
  // edit-flow met image_urls (fal accepteert het runtime maar type is op
  // generate-only flow gemodelleerd).
   
  const result = await fal.subscribe(editModelId, {
    input: input as any,
    timeout: 180_000,
  });

  const data = result.data as Record<string, unknown>;
  const images = (data?.images as FalGenerationImage[]) ?? [];

  return {
    images,
    seed: data?.seed as number | undefined,
    prompt: instruction,
  };
}
