// =============================================================
// Adobe Fonts / Typekit Detection
//
// Detects whether the site under analysis loads its webfonts via
// Adobe Fonts (Typekit) and, if so, extracts the kit ID. That kit
// ID lets us:
//   - Classify detected fonts as ADOBE_FONTS instead of COMMERCIAL,
//     which is more accurate ("it's not gratis, but it's not
//     locked behind a $400 per-weight purchase either").
//   - Offer the user a live preview of the real font in the
//     styleguide by loading `https://use.typekit.net/{kitId}.css`.
//
// Typekit URL shapes we match:
//   - <link href="https://use.typekit.net/abc1def.css">     (classic)
//   - <script src="https://use.typekit.net/abc1def.js">     (legacy)
//   - <link href="https://use.typekit.net/af/.../k.css">    (newer)
//
// The kit ID is the 7+-char slug between `use.typekit.net/` and
// the file extension (or `/af/` for the newer URL shape — in that
// case we fall back to detecting presence only).
// =============================================================

export interface AdobeFontsDetection {
  detected: boolean;
  kitId: string | null;
}

const CLASSIC_KIT_PATTERN = /use\.typekit\.net\/([a-z0-9]{5,20})(?:\.(?:css|js))/i;
const NEWER_KIT_PATTERN = /use\.typekit\.net\/af\/[a-f0-9]+\//i;
const ANY_TYPEKIT_HIT = /use\.typekit\.net/i;

/**
 * Scan the raw HTML (pre-parse) and any CSS text for Adobe
 * Fonts / Typekit references. Returns `{ detected, kitId }`.
 * Callers should treat `kitId: null` + `detected: true` as
 * "yes it's Adobe Fonts but we can't extract the kit — ask
 * the user to paste it".
 */
export function detectAdobeFonts(
  html: string,
  css: string,
): AdobeFontsDetection {
  const haystack = `${html}\n${css}`;
  if (!ANY_TYPEKIT_HIT.test(haystack)) {
    return { detected: false, kitId: null };
  }

  const classicMatch = haystack.match(CLASSIC_KIT_PATTERN);
  if (classicMatch && classicMatch[1]) {
    return { detected: true, kitId: classicMatch[1] };
  }

  if (NEWER_KIT_PATTERN.test(haystack)) {
    // The `/af/.../k.css` URL shape doesn't expose the short kit
    // id we need for programmatic loading. We still report
    // detection so the UI can show an informed label.
    return { detected: true, kitId: null };
  }

  // Typekit hostname seen but URL shape didn't match our patterns.
  // Still report detection as true — the font IS served by Adobe.
  return { detected: true, kitId: null };
}
