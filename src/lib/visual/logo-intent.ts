// =============================================================
// Logo-intent parser
//
// Detects when a scene's [VISUAL: …] direction asks for the brand
// logo to appear in the image (e.g. "Logo Linfi rechtsonder",
// "Brand mark top-left", "logo lockup centered"). Returns the
// resolved corner-position so the post-generation overlay knows
// where to place the real asset.
//
// Why parse this client-of-image-gen instead of letting the model
// render the logo: image-gen models hallucinate logos — wrong
// colour, distorted typography, garbled mark. We strip the logo
// mention from the prompt so the model leaves the corner clean,
// then composite the actual brand asset on top.
// =============================================================

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface LogoIntent {
  wantLogo: boolean;
  position: LogoPosition;
  /** When true the scene asks for the logo to appear IN the scene (on a
   *  display, wall, sign, etc.) rather than as a corner watermark. The
   *  corner-composite can't place a logo on an in-scene surface, so the
   *  route logs and skips the overlay — but we still strip the mention
   *  from the prompt so the image-model doesn't hallucinate a fake mark. */
  isInScenePlacement: boolean;
}

// Position cues — Dutch + English. Match the most specific corner
// phrase first; fall back to single-direction words.
const POSITION_PATTERNS: Array<{ regex: RegExp; position: LogoPosition }> = [
  { regex: /\b(rechts[\s-]?onder|bottom[\s-]?right|onder[\s-]?rechts)\b/i, position: 'bottom-right' },
  { regex: /\b(links[\s-]?onder|bottom[\s-]?left|onder[\s-]?links)\b/i, position: 'bottom-left' },
  { regex: /\b(rechts[\s-]?boven|top[\s-]?right|boven[\s-]?rechts)\b/i, position: 'top-right' },
  { regex: /\b(links[\s-]?boven|top[\s-]?left|boven[\s-]?links)\b/i, position: 'top-left' },
];

const LOGO_KEYWORD = /\b(logo|beeldmerk|brand[\s-]?mark|wordmark|logo[\s-]?lockup|brand[\s-]?logo)\b/i;

// In-scene placement cues — phrases that put the logo ON an object IN
// the frame (a screen, a wall, a sign, a card) rather than as a corner
// watermark. Corner-compositing can't do that; the route skips overlay
// for these and image-gen would hallucinate the logo anyway.
const IN_SCENE_PATTERNS = [
  /\b(op|in)\s+(het\s+)?(scherm|display|monitor|screen|tv)\b/i,
  /\b(op|in)\s+(de\s+|een\s+)?(muur|wall|poster|achtergrond|sign|bord)\b/i,
  /\b(achtergrondscherm|background[\s-]?screen)\b/i,
  /\bin\s+beeld\b/i,
  /\b(on|in)\s+the\s+(screen|wall|background|sign|poster|monitor)\b/i,
];

/**
 * Parse a scene visual-prompt for logo intent. Returns
 * `{ wantLogo: false, … }` when no logo keyword found. Default
 * corner when logo mentioned without a position cue: bottom-right
 * (LinkedIn paid-video convention for end-frame logo placement).
 */
export function parseLogoIntent(prompt: string): LogoIntent {
  if (!prompt || !LOGO_KEYWORD.test(prompt)) {
    return { wantLogo: false, position: 'bottom-right', isInScenePlacement: false };
  }
  const isInScenePlacement = IN_SCENE_PATTERNS.some((p) => p.test(prompt));
  for (const { regex, position } of POSITION_PATTERNS) {
    if (regex.test(prompt)) return { wantLogo: true, position, isInScenePlacement };
  }
  return { wantLogo: true, position: 'bottom-right', isInScenePlacement };
}

/**
 * Remove logo mentions from the image-gen prompt so the model leaves
 * no chance to hallucinate a fake mark. Logo phrases inside a scene
 * description tend to be one clause in a longer comma-list ("speaker
 * confident, Linfi-logo rechtsonder, branded CTA-card in foreground");
 * dropping the whole SENTENCE is too aggressive, so we split on
 * comma + sentence-boundary punctuation and drop only the clauses
 * containing the logo keyword.
 *
 * Also handles the also-stripped position-cue residue ("Linfi-" or
 * trailing "rechtsonder"/"op scherm" left over after logo word
 * removal) so the prompt stays grammatical.
 */
export function stripLogoMentions(prompt: string): string {
  if (!prompt) return prompt;
  // Split on commas, semicolons, periods, line breaks — anything that
  // separates clauses. Keep the original separators by reconstructing
  // with `, ` so the prompt reads naturally.
  const clauses = prompt.split(/[,;\n]|\.\s+/);
  const kept = clauses
    .map((c) => c.trim())
    .filter((c) => c.length > 0 && !LOGO_KEYWORD.test(c));
  if (kept.length === 0) {
    // Whole prompt was logo direction — fall back to a tight regex
    // strip so we don't return an empty string (model needs something).
    return prompt
      .replace(LOGO_KEYWORD, '')
      .replace(/\b(rechts[\s-]?onder|links[\s-]?onder|rechts[\s-]?boven|links[\s-]?boven|bottom[\s-]?right|bottom[\s-]?left|top[\s-]?right|top[\s-]?left)\b/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*[-]\s*/g, ' ')
      .trim();
  }
  return kept.join(', ').replace(/\s+/g, ' ').trim();
}
