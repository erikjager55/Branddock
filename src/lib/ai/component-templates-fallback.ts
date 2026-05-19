// =============================================================
// Component-template fallback registry
//
// MediumEnrichment seeds only the most-used platform/format combos
// (linkedin/organic-post, linkedin/ad, instagram/feed-post, ...). For
// content-types whose medium row is missing or has an empty
// componentTemplate, the orchestrator would otherwise emit ZERO group
// instructions to the model — the LLM then invents its own structure,
// often skipping the scene-split video types need.
//
// This registry is the in-memory fallback: when a deliverable's medium
// row has no componentTemplate, look up the contentType here. For
// video-script types (VIDEO_ADJACENT_TYPES) we ALWAYS prefer this
// fallback so the orchestrator emits the hook / body / cta groups the
// Scene Breakdown and per-scene Visual block depend on.
//
// 2026-05-19 — added to unblock end-to-end scene-visual-split for
// linkedin-video-ad. The deliverable was outputting a single `script`
// group, which collapsed the Scene Breakdown to just Hook.
// =============================================================

export interface ComponentTemplateItem {
  type: string;
  required?: boolean;
  maxLength?: number;
  /** Optional hint that this group is a scripted scene (markdown-rich
   *  prose with [VISUAL] cues + Caption: lines), not button-text. The
   *  orchestrator uses this to override the global "cta = short button
   *  text" formatting rule for video-script content types. */
  isScriptedScene?: boolean;
}

const FALLBACK_BY_CONTENT_TYPE: Record<string, ComponentTemplateItem[]> = {
  // LinkedIn Video Ad (paid) — Hook / Proof / Offer beats as 3 scripted
  // scene groups so each gets its own variantGroup, its own per-scene
  // Visual block in Step 2, and its own video clip in Step 3. The
  // intro-caption is the sponsored-post text shown above the video.
  'linkedin-video-ad': [
    { type: 'intro-caption', required: true, maxLength: 800 },
    { type: 'hook', required: true, isScriptedScene: true },
    { type: 'body', required: true, isScriptedScene: true },
    { type: 'cta', required: true, isScriptedScene: true },
    { type: 'thumbnail', required: true, maxLength: 400 },
    { type: 'captions', required: false, maxLength: 1000 },
  ],
  // Other video-script types — same Hook / Body / CTA split, no
  // intro-caption (these aren't paid-feed ads). Keeps the scene-visual
  // pipeline uniform across content types.
  'video-script': [
    { type: 'title', required: true, maxLength: 100 },
    { type: 'hook', required: true, isScriptedScene: true },
    { type: 'body', required: true, isScriptedScene: true },
    { type: 'cta', required: true, isScriptedScene: true },
  ],
  'tiktok-script': [
    { type: 'hook', required: true, isScriptedScene: true },
    { type: 'body', required: true, isScriptedScene: true },
    { type: 'cta', required: true, isScriptedScene: true },
    { type: 'captions', required: false, maxLength: 600 },
  ],
  'explainer-video-script': [
    { type: 'title', required: true, maxLength: 100 },
    { type: 'hook', required: true, isScriptedScene: true },
    { type: 'body', required: true, isScriptedScene: true },
    { type: 'cta', required: true, isScriptedScene: true },
  ],
  'brand-video-script': [
    { type: 'title', required: true, maxLength: 100 },
    { type: 'hook', required: true, isScriptedScene: true },
    { type: 'body', required: true, isScriptedScene: true },
    { type: 'cta', required: true, isScriptedScene: true },
  ],
};

/** Resolve a fallback component template for a content type. Returns
 *  null when the type has no registry entry (caller keeps the medium
 *  row's template, even if empty). */
export function getComponentTemplateFallback(
  contentType: string | null | undefined,
): ComponentTemplateItem[] | null {
  if (!contentType) return null;
  return FALLBACK_BY_CONTENT_TYPE[contentType] ?? null;
}
