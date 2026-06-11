// =============================================================
// Component-template fallback registry
//
// MediumEnrichment seeds only the most-used platform/format combos
// (linkedin/organic-post, linkedin/ad, instagram/feed-post, ...). For
// content-types whose medium row is missing or has an empty
// componentTemplate, the orchestrator would otherwise emit ZERO group
// instructions to the model — the prompt then literally demands a
// components array with "exactly 0 entries" while the system prompt
// demands a complete document, so the LLM invents its own structure
// or returns nothing.
//
// This registry is the in-memory fallback: when a deliverable's medium
// row has no componentTemplate, look up the contentType here. For
// video-script types (VIDEO_ADJACENT_TYPES) we ALWAYS prefer this
// fallback so the orchestrator emits the hook / body / cta groups the
// Scene Breakdown and per-scene Visual block depend on. The same
// always-prefer rule applies to FALLBACK_FIRST_TYPES (exported below):
// types whose seeded medium row carries a contract that is too generic
// for the deliverable (newsletter row for multi-email sequences,
// landing-page row for faq/comparison/microsite).
//
// 2026-05-19 — added to unblock end-to-end scene-visual-split for
// linkedin-video-ad. The deliverable was outputting a single `script`
// group, which collapsed the Scene Breakdown to just Hook.
// 2026-06-11 — prompt-audit Fase 2 (C3/C4/C5): full coverage for all
// sales / pr-hr / video / email-sequence / website types that resolved
// to 0 groups. Group names derive from the prompt-template structure
// skeletons (sales.ts / pr-hr.ts / video-audio.ts) + the deliverable-
// type registry's `constraints.requiredSections`.
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

/**
 * Content types for which the in-memory fallback template must ALWAYS
 * win over a MediumEnrichment componentTemplate row. These types map to
 * a seeded medium row that exists for layout-context/specs but carries
 * a component contract that is wrong for the deliverable:
 *
 * - `tiktok-script` — the tiktok/video row lacks `isScriptedScene`, so
 *   the medium row silently breaks the scene-split video pipeline.
 * - `welcome-sequence` / `nurture-sequence` / `re-engagement-email` —
 *   the email/newsletter row forces 5-7 emails into one single body
 *   field (audit C4); the fallback defines per-email groups.
 * - `faq-page` / `comparison-page` / `microsite` — the web/landing-page
 *   row has no slot for Q&A pairs, comparison matrices or multi-page
 *   sections (audit C5); the fallback defines type-specific groups.
 *
 * The orchestrator (resolveComponentTemplate) consults this set; the
 * existing VIDEO_ADJACENT preference is unaffected.
 */
export const FALLBACK_FIRST_TYPES: Set<string> = new Set([
  'tiktok-script',
  'faq-page',
  'comparison-page',
  'microsite',
  'welcome-sequence',
  'nurture-sequence',
  're-engagement-email',
]);

const FALLBACK_BY_CONTENT_TYPE: Record<string, ComponentTemplateItem[]> = {
  // ── Video-script types (scene-split pipeline) ───────────────
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
  // Exact mirror of the seeded tiktok/video medium row, which wins
  // whenever present — this entry only fires in unseeded workspaces and
  // must hand out the same contract (no isScriptedScene: the seed row
  // never carries it, so a divergent fallback would run a different
  // pipeline than every seeded workspace). The seed's `timing` metadata
  // is dropped — ComponentTemplateItem has no such field. Same approach
  // as native-ad/retargeting-ad below.
  'video-ad': [
    { type: 'hook', required: true, maxLength: 50 },
    { type: 'body-script', required: true },
    { type: 'cta', required: true, maxLength: 50 },
    { type: 'on-screen-text', required: false },
    { type: 'caption', required: true, maxLength: 2200 },
    // Seed row carries no cap; 200 matches the sibling hashtags entries
    // and only applies in unseeded workspaces (seeded row wins).
    { type: 'hashtags', required: false, maxLength: 200 },
    { type: 'sound', required: false },
  ],

  // ── Social widgets / threads ────────────────────────────────
  // 2026-05-19 — LinkedIn poll has a distinct widget structure (question +
  // 2-4 option bars + vote counter). Without these structured groups the
  // model bundles everything into a `body` blob, and the preview can't
  // render the poll widget. Options 3 + 4 are optional per platform spec.
  'linkedin-poll': [
    { type: 'context', required: true, maxLength: 350 },
    { type: 'question', required: true, maxLength: 140 },
    { type: 'option-1', required: true, maxLength: 30 },
    { type: 'option-2', required: true, maxLength: 30 },
    { type: 'option-3', required: false, maxLength: 30 },
    { type: 'option-4', required: false, maxLength: 30 },
    { type: 'follow-up-comment', required: true, maxLength: 400 },
    { type: 'hashtags', required: false, maxLength: 200 },
  ],
  // 2026-05-20 — X thread: hook + tweet-2..6 body slots + cta-tweet + hashtags.
  // Hook required (tweet 1 = ~90% impressions), body slots optional so model
  // can choose 5-7 sweet-spot length. Each tweet maxLength 280 chars.
  'twitter-thread': [
    { type: 'hook', required: true, maxLength: 280 },
    { type: 'tweet-2', required: false, maxLength: 280 },
    { type: 'tweet-3', required: false, maxLength: 280 },
    { type: 'tweet-4', required: false, maxLength: 280 },
    { type: 'tweet-5', required: false, maxLength: 280 },
    { type: 'tweet-6', required: false, maxLength: 280 },
    { type: 'cta-tweet', required: false, maxLength: 280 },
    { type: 'hashtags', required: false, maxLength: 200 },
  ],
  // LinkedIn carousel — no linkedin/carousel MediumEnrichment row is
  // seeded, so without this entry the type resolved to 0 groups. The
  // content-slides group holds "Slide N:" markdown blocks (one block per
  // carousel card); cover and CTA cards get their own slots.
  'linkedin-carousel': [
    { type: 'cover-slide', required: true, maxLength: 200 },
    { type: 'content-slides', required: true, maxLength: 3500 },
    { type: 'cta-slide', required: true, maxLength: 250 },
    { type: 'caption', required: true, maxLength: 600 },
    { type: 'hashtags', required: false, maxLength: 200 },
  ],

  // ── Display/native ads (mirror of the seeded medium rows) ───
  // native/sponsored-article and meta/retargeting ARE seeded; these
  // entries mirror the seed so unseeded workspaces get the same contract.
  'native-ad': [
    { type: 'headline', required: true, maxLength: 90 },
    { type: 'subheadline', required: false, maxLength: 140 },
    { type: 'opening-paragraph', required: true, maxLength: 500 },
    { type: 'body', required: true, maxLength: 2500 },
    { type: 'brand-integration', required: true, maxLength: 600 },
    { type: 'closing', required: true, maxLength: 300 },
    { type: 'disclosure-position', required: true, maxLength: 120 },
    { type: 'image', required: true },
  ],
  'retargeting-ad': [
    { type: 'cart-abandoner-primary-text', required: true, maxLength: 300 },
    { type: 'cart-abandoner-headline', required: true, maxLength: 40 },
    { type: 'cart-abandoner-cta', required: true, maxLength: 20 },
    { type: 'cart-abandoner-creative-direction', required: true, maxLength: 250 },
    { type: 'cart-abandoner-offer-strategy', required: true, maxLength: 200 },
    { type: 'cart-abandoner-frequency-cap', required: true, maxLength: 150 },
    { type: 'page-visitor-primary-text', required: true, maxLength: 300 },
    { type: 'page-visitor-headline', required: true, maxLength: 40 },
    { type: 'page-visitor-cta', required: true, maxLength: 20 },
    { type: 'page-visitor-creative-direction', required: true, maxLength: 250 },
    { type: 'page-visitor-offer-strategy', required: true, maxLength: 200 },
    { type: 'page-visitor-frequency-cap', required: true, maxLength: 150 },
    { type: 'past-customer-primary-text', required: true, maxLength: 300 },
    { type: 'past-customer-headline', required: true, maxLength: 40 },
    { type: 'past-customer-cta', required: true, maxLength: 20 },
    { type: 'past-customer-creative-direction', required: true, maxLength: 250 },
    { type: 'past-customer-offer-strategy', required: true, maxLength: 200 },
    { type: 'past-customer-frequency-cap', required: true, maxLength: 150 },
    { type: 'image', required: true },
  ],

  // ── Email sequences (audit C4) ──────────────────────────────
  // Per-email subject/body groups instead of one 5000-char body blob.
  // Emails 1-3 required, the rest optional so the model can pick the
  // sequence length that fits the journey.
  'welcome-sequence': [
    { type: 'email-1-subject', required: true, maxLength: 60 },
    { type: 'email-1-body', required: true, maxLength: 2500 },
    { type: 'email-2-subject', required: true, maxLength: 60 },
    { type: 'email-2-body', required: true, maxLength: 2500 },
    { type: 'email-3-subject', required: true, maxLength: 60 },
    { type: 'email-3-body', required: true, maxLength: 2500 },
    { type: 'email-4-subject', required: false, maxLength: 60 },
    { type: 'email-4-body', required: false, maxLength: 2500 },
    { type: 'email-5-subject', required: false, maxLength: 60 },
    { type: 'email-5-body', required: false, maxLength: 2500 },
  ],
  'nurture-sequence': [
    { type: 'email-1-subject', required: true, maxLength: 60 },
    { type: 'email-1-body', required: true, maxLength: 2500 },
    { type: 'email-2-subject', required: true, maxLength: 60 },
    { type: 'email-2-body', required: true, maxLength: 2500 },
    { type: 'email-3-subject', required: true, maxLength: 60 },
    { type: 'email-3-body', required: true, maxLength: 2500 },
    { type: 'email-4-subject', required: false, maxLength: 60 },
    { type: 'email-4-body', required: false, maxLength: 2500 },
    { type: 'email-5-subject', required: false, maxLength: 60 },
    { type: 'email-5-body', required: false, maxLength: 2500 },
    { type: 'email-6-subject', required: false, maxLength: 60 },
    { type: 'email-6-body', required: false, maxLength: 2500 },
    { type: 'email-7-subject', required: false, maxLength: 60 },
    { type: 'email-7-body', required: false, maxLength: 2500 },
  ],
  're-engagement-email': [
    { type: 'subject', required: true, maxLength: 60 },
    { type: 'preview-text', required: true, maxLength: 110 },
    { type: 'body', required: true, maxLength: 2500 },
    { type: 'cta', required: true, maxLength: 48 },
  ],

  // ── Website types (audit C5) ────────────────────────────────
  // Q&A pairs 1-4 required, 5-6 optional. Questions are short one-liners;
  // answers are markdown-capable.
  'faq-page': [
    { type: 'intro', required: true, maxLength: 600 },
    { type: 'question-1', required: true, maxLength: 120 },
    { type: 'answer-1', required: true, maxLength: 900 },
    { type: 'question-2', required: true, maxLength: 120 },
    { type: 'answer-2', required: true, maxLength: 900 },
    { type: 'question-3', required: true, maxLength: 120 },
    { type: 'answer-3', required: true, maxLength: 900 },
    { type: 'question-4', required: true, maxLength: 120 },
    { type: 'answer-4', required: true, maxLength: 900 },
    { type: 'question-5', required: false, maxLength: 120 },
    { type: 'answer-5', required: false, maxLength: 900 },
    { type: 'question-6', required: false, maxLength: 120 },
    { type: 'answer-6', required: false, maxLength: 900 },
    // `closing-cta` (not `cta`) — this is a 200-char closing paragraph;
    // the bare `cta` name triggers the global 48-char button-text
    // formatting rule + exact-match storage clamp, while the `-cta`
    // suffix keeps markdown-strip without a length clamp.
    { type: 'closing-cta', required: true, maxLength: 200 },
  ],
  // comparison-matrix holds a markdown table (us vs alternatives).
  'comparison-page': [
    { type: 'intro', required: true, maxLength: 600 },
    { type: 'comparison-matrix', required: true, maxLength: 2500 },
    { type: 'differentiator-1', required: true, maxLength: 500 },
    { type: 'differentiator-2', required: false, maxLength: 500 },
    { type: 'differentiator-3', required: false, maxLength: 500 },
    { type: 'switching-guide', required: true, maxLength: 800 },
    { type: 'summary', required: true, maxLength: 500 },
    // `closing-cta` — see faq-page note above.
    { type: 'closing-cta', required: true, maxLength: 200 },
  ],
  // Each page-N group is a complete page section in markdown (heading +
  // body + CTA), pages 1-3 required, 4-5 optional.
  'microsite': [
    { type: 'page-1', required: true, maxLength: 2500 },
    { type: 'page-2', required: true, maxLength: 2500 },
    { type: 'page-3', required: true, maxLength: 2500 },
    { type: 'page-4', required: false, maxLength: 2500 },
    { type: 'page-5', required: false, maxLength: 2500 },
  ],

  // ── Sales enablement (audit C3 — no sales/* rows seeded) ────
  // Beats follow the Challenger-deck skeleton in sales.ts: teach/problem
  // → tailor/solution → proof+objections → next steps.
  'sales-deck': [
    { type: 'title', required: true, maxLength: 120 },
    { type: 'problem', required: true, maxLength: 2500 },
    { type: 'solution', required: true, maxLength: 2500 },
    { type: 'proof', required: true, maxLength: 1500 },
    { type: 'next-steps', required: true, maxLength: 800 },
  ],
  // Glance-scan-read battle card (one-pager skeleton in sales.ts).
  'one-pager': [
    { type: 'headline', required: true, maxLength: 120 },
    { type: 'value-prop', required: true, maxLength: 200 },
    { type: 'challenge', required: true, maxLength: 600 },
    { type: 'solution', required: true, maxLength: 800 },
    { type: 'key-metrics', required: true, maxLength: 400 },
    { type: 'differentiators', required: true, maxLength: 600 },
    { type: 'ideal-customer', required: false, maxLength: 200 },
    { type: 'cta', required: true, maxLength: 48 },
  ],
  'proposal-template': [
    { type: 'executive-summary', required: true, maxLength: 1500 },
    { type: 'scope', required: true, maxLength: 1200 },
    { type: 'approach', required: true, maxLength: 2500 },
    { type: 'timeline', required: true, maxLength: 800 },
    { type: 'team', required: false, maxLength: 800 },
    { type: 'pricing', required: true, maxLength: 1000 },
    { type: 'why-us', required: false, maxLength: 800 },
    { type: 'risk-mitigation', required: false, maxLength: 800 },
    { type: 'next-steps', required: true, maxLength: 400 },
  ],
  'product-description': [
    { type: 'headline', required: true, maxLength: 100 },
    { type: 'tagline', required: true, maxLength: 80 },
    { type: 'short-description', required: true, maxLength: 300 },
    { type: 'long-description', required: true, maxLength: 1500 },
    { type: 'key-features', required: true, maxLength: 800 },
    { type: 'specifications', required: false, maxLength: 800 },
    { type: 'seo-meta-title', required: false, maxLength: 60 },
    { type: 'seo-meta-description', required: false, maxLength: 160 },
    { type: 'seo-keywords', required: false, maxLength: 200 },
  ],

  // ── PR, HR & comms (audit C3 — no pr/* rows seeded) ─────────
  'press-release': [
    { type: 'headline', required: true, maxLength: 120 },
    // 140 matches the storage-layer subheadline clamp — a higher cap
    // here would just get truncated after generation.
    { type: 'subheadline', required: true, maxLength: 140 },
    { type: 'dateline-lead', required: true, maxLength: 400 },
    { type: 'body', required: true, maxLength: 3000 },
    { type: 'quote-1', required: true, maxLength: 300 },
    { type: 'quote-2', required: false, maxLength: 300 },
    { type: 'boilerplate', required: true, maxLength: 500 },
    { type: 'media-contact', required: true, maxLength: 300 },
  ],
  // `ask` (not `cta`) — the journalist ask is a full sentence, which the
  // global cta-as-button-text rule + 48-char storage clamp would mangle.
  'media-pitch': [
    { type: 'subject', required: true, maxLength: 60 },
    { type: 'hook', required: true, maxLength: 300 },
    { type: 'pitch', required: true, maxLength: 800 },
    { type: 'proof', required: false, maxLength: 400 },
    { type: 'ask', required: true, maxLength: 300 },
  ],
  'internal-comms': [
    { type: 'subject', required: true, maxLength: 78 },
    { type: 'tldr', required: true, maxLength: 300 },
    { type: 'context', required: true, maxLength: 800 },
    { type: 'whats-changing', required: true, maxLength: 1200 },
    { type: 'impact', required: true, maxLength: 800 },
    { type: 'action-items', required: true, maxLength: 600 },
    { type: 'timeline', required: false, maxLength: 400 },
    { type: 'faq', required: false, maxLength: 1200 },
    { type: 'contact', required: false, maxLength: 200 },
  ],
  'career-page': [
    { type: 'hero', required: true, maxLength: 300 },
    { type: 'why-work-here', required: true, maxLength: 1200 },
    { type: 'culture', required: true, maxLength: 900 },
    { type: 'benefits', required: true, maxLength: 1200 },
    { type: 'team-voices', required: false, maxLength: 900 },
    { type: 'dei-commitment', required: false, maxLength: 600 },
    { type: 'application-process', required: true, maxLength: 600 },
    { type: 'cta', required: true, maxLength: 48 },
  ],
  'job-ad-copy': [
    { type: 'title', required: true, maxLength: 100 },
    { type: 'hook', required: true, maxLength: 400 },
    { type: 'about-role', required: true, maxLength: 600 },
    { type: 'responsibilities', required: true, maxLength: 900 },
    { type: 'requirements', required: true, maxLength: 900 },
    { type: 'benefits', required: true, maxLength: 800 },
    { type: 'about-us', required: false, maxLength: 400 },
    { type: 'how-to-apply', required: true, maxLength: 300 },
    { type: 'equal-opportunity', required: false, maxLength: 300 },
  ],
  'employee-story': [
    { type: 'headline', required: true, maxLength: 120 },
    { type: 'introduction', required: true, maxLength: 400 },
    { type: 'career-path', required: true, maxLength: 700 },
    { type: 'day-in-the-life', required: true, maxLength: 700 },
    { type: 'growth-moment', required: true, maxLength: 900 },
    { type: 'team-culture', required: true, maxLength: 600 },
    { type: 'advice', required: true, maxLength: 300 },
    { type: 'pull-quote', required: true, maxLength: 200 },
    { type: 'photo-direction', required: false, maxLength: 300 },
  ],
  'impact-report': [
    { type: 'title', required: true, maxLength: 120 },
    { type: 'executive-summary', required: true, maxLength: 1500 },
    { type: 'leadership-letter', required: false, maxLength: 2000 },
    { type: 'impact-metrics', required: true, maxLength: 1500 },
    { type: 'environmental', required: false, maxLength: 1500 },
    { type: 'social', required: false, maxLength: 1500 },
    { type: 'governance', required: false, maxLength: 1000 },
    { type: 'stakeholder-stories', required: true, maxLength: 1500 },
    { type: 'goals-commitments', required: true, maxLength: 1000 },
    { type: 'methodology', required: false, maxLength: 600 },
  ],
  // Employer-brand video lives in pr-hr.ts (90s culture video skeleton).
  // Production outline, not the scene-split ad pipeline — no isScriptedScene.
  'employer-brand-video': [
    { type: 'hook', required: true, maxLength: 300 },
    { type: 'culture-montage', required: true, maxLength: 500 },
    { type: 'employee-interviews', required: true, maxLength: 1200 },
    { type: 'differentiator', required: true, maxLength: 400 },
    { type: 'closing', required: true, maxLength: 300 },
    { type: 'music-direction', required: false, maxLength: 300 },
  ],

  // ── Video & audio outlines (audit C3) ───────────────────────
  // Production scripts/outlines with [VISUAL]/(VOICEOVER) markup inside
  // markdown groups. Deliberately NOT isScriptedScene: that flag emits
  // the 8-15s paid-ad scene-beat instructions, which are wrong for
  // 60s+ explainers, webinars and podcast episodes.
  'explainer-video': [
    { type: 'title', required: true, maxLength: 100 },
    { type: 'hook', required: true, maxLength: 400 },
    { type: 'problem', required: true, maxLength: 600 },
    { type: 'solution', required: true, maxLength: 600 },
    { type: 'how-it-works', required: false, maxLength: 900 },
    { type: 'benefits', required: true, maxLength: 900 },
    { type: 'social-proof', required: false, maxLength: 400 },
    { type: 'closing', required: true, maxLength: 400 },
  ],
  'testimonial-video': [
    { type: 'production-brief', required: true, maxLength: 600 },
    { type: 'interview-questions', required: true, maxLength: 1800 },
    { type: 'b-roll-plan', required: false, maxLength: 600 },
    { type: 'edit-structure', required: false, maxLength: 900 },
    { type: 'closing', required: true, maxLength: 300 },
  ],
  'promo-video': [
    { type: 'title', required: true, maxLength: 100 },
    { type: 'hook', required: true, maxLength: 400 },
    { type: 'body', required: true, maxLength: 900 },
    { type: 'closing', required: true, maxLength: 400 },
    { type: 'music-direction', required: false, maxLength: 300 },
  ],
  'webinar-outline': [
    { type: 'title', required: true, maxLength: 120 },
    { type: 'hook', required: true, maxLength: 400 },
    { type: 'agenda', required: true, maxLength: 600 },
    { type: 'section-1', required: true, maxLength: 1200 },
    { type: 'section-2', required: true, maxLength: 1200 },
    { type: 'section-3', required: true, maxLength: 1200 },
    { type: 'qa-prep', required: false, maxLength: 800 },
    { type: 'closing', required: true, maxLength: 400 },
  ],
  'podcast-outline': [
    { type: 'title', required: true, maxLength: 120 },
    { type: 'cold-open', required: true, maxLength: 400 },
    { type: 'intro', required: true, maxLength: 500 },
    { type: 'segment-1', required: true, maxLength: 1200 },
    { type: 'segment-2', required: true, maxLength: 1200 },
    { type: 'segment-3', required: true, maxLength: 1200 },
    { type: 'outro', required: true, maxLength: 400 },
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
