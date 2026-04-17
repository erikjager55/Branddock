// =============================================================
// Video Prompt Builder
//
// Converts a content script (e.g. TikTok script) into a concise
// visual prompt suitable for fal.ai text-to-video models.
// Uses Claude to extract visual directions from the script text,
// enriched with brand visual language.
// =============================================================

import { createStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import type { BrandContextBlock } from '@/lib/ai/prompt-templates';

interface VideoPromptResult {
  videoPrompt: string;
  sceneDescription: string;
}

const SYSTEM_PROMPT = `You are an expert video director who translates written scripts into concise visual prompts for AI video generation models.

Your job: read a content script and produce a SINGLE visual prompt (300-500 characters) that describes what the video should LOOK like.

Rules:
- Focus on VISUAL elements: setting, lighting, camera movement, subject, action, mood, color palette
- Do NOT include dialogue, voiceover text, or written words
- Do NOT include text overlays, titles, or captions in the visual description
- Use present tense, descriptive language
- Be specific about camera angles (close-up, wide shot, tracking shot, etc.)
- Include lighting direction (soft natural light, dramatic shadows, neon glow, etc.)
- Mention color grading/mood (warm tones, cool blues, high contrast, etc.)
- Keep it to ONE continuous scene or a clear sequence of 2-3 shots
- The prompt must work for a 5-15 second video clip

Respond with valid JSON only.`;

function buildUserPrompt(
  scriptText: string,
  brandContext: BrandContextBlock | null,
  contentType: string,
  sceneType: SceneType = 'full',
): string {
  const parts: string[] = [];

  parts.push(`## Script\n${scriptText}`);

  if (brandContext) {
    const visualParts: string[] = [];
    if (brandContext.brandColors) {
      visualParts.push(`Brand colors: ${brandContext.brandColors}`);
    }
    if (brandContext.brandImageryStyle) {
      visualParts.push(`Imagery style: ${brandContext.brandImageryStyle}`);
    }
    if (brandContext.brandVisualLanguage) {
      visualParts.push(`Visual language: ${brandContext.brandVisualLanguage}`);
    }
    if (visualParts.length > 0) {
      parts.push(`## Brand Visual Direction\n${visualParts.join('\n')}`);
    }
  }

  const platformHints: Record<string, string> = {
    'tiktok-script': 'Vertical 9:16 framing. Fast-paced, trending TikTok aesthetic. Hook in first 2 seconds. Dynamic camera movement.',
    'video-script': 'Cinematic framing. Professional production quality. Smooth transitions.',
    'explainer-video-script': 'Clean, well-lit setting. Focus on clarity and simplicity. Moderate pacing.',
    'brand-video-script': 'Premium, brand-forward aesthetic. Aspirational mood. Polished cinematography.',
    'radio-script': 'Abstract visual representation. Atmospheric, mood-driven imagery.',
    'podcast-ad-script': 'Warm, conversational setting. Lifestyle imagery. Authentic feel.',
  };

  const hint = platformHints[contentType];
  if (hint) {
    parts.push(`## Platform Direction\n${hint}`);
  }

  parts.push(`## Scene Direction\n${SCENE_INSTRUCTIONS[sceneType]}`);

  parts.push('Generate the video prompt now. Respond as JSON: { "videoPrompt": "...", "sceneDescription": "..." }');

  return parts.join('\n\n');
}

/**
 * Converts a script text into a visual video prompt using Claude.
 * The prompt is optimized for fal.ai text-to-video models (300-500 chars).
 */
export type SceneType = 'hook' | 'body' | 'cta' | 'full';

const SCENE_INSTRUCTIONS: Record<SceneType, string> = {
  hook: 'This is the HOOK scene (first 2-3 seconds). Create an immediate visual pattern interrupt that stops scrolling. Fast motion, bold color, unexpected angle.',
  body: 'This is the BODY scene (main message). Show the product/brand in action. Moderate pacing, clear focus, lifestyle context.',
  cta: 'This is the CTA scene (call to action). Create a decisive closing moment. Product hero shot, clean composition, slight zoom or push-in.',
  full: 'This is a complete video scene covering the full script.',
};

export async function buildVideoPromptFromScript(
  scriptText: string,
  brandContext: BrandContextBlock | null,
  contentType: string,
  workspaceId: string,
  sceneType: SceneType = 'full',
): Promise<string> {
  const { provider, model } = await resolveFeatureModel(workspaceId, 'content-generate');

  const result = await createStructuredCompletion<VideoPromptResult>(
    provider,
    model,
    SYSTEM_PROMPT,
    buildUserPrompt(scriptText, brandContext, contentType, sceneType),
    { temperature: 0.7, maxTokens: 1024 },
  );

  return result.videoPrompt || result.sceneDescription || scriptText.slice(0, 400);
}
