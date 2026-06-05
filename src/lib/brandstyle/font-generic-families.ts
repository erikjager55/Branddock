/**
 * Generieke / niet-merk CSS font-family-namen.
 *
 * Dit zijn waarden die in een `font-family`-declaratie voorkomen maar NOOIT de
 * intentionele merk-font zijn: CSS generic families (`sans-serif`), system-stack
 * keywords (`system-ui`, `-apple-system`), CSS globals (`inherit`, `initial`) en
 * placeholder-ruis die sommige thema's unquoted emitten (`font`, `body`).
 *
 * Gedeelde bron-of-truth zodat zowel de scraper (`url-scraper.ts`) als de
 * canonicalisatie-helpers (`font-fallback.ts`) dezelfde lijst gebruiken. Deze
 * module heeft BEWUST geen dependencies (geen cheerio/import-keten) zodat de
 * pure helpers dependency-vrij blijven en in smoke-tests importeerbaar zijn.
 */
export const GENERIC_FONT_FAMILY_NAMES = [
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded',
  'inherit', 'initial', 'unset', 'revert', 'normal', 'auto', 'none',
  // CSS placeholder / shorthand that some themes emit unquoted (seen on
  // linfi.nl: `font-family: Font;` resolved to literal "Font"). Always noise.
  'font', 'webfont', 'webfonts', 'text', 'body',
  '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'apple color emoji',
  'segoe ui emoji', 'segoe ui symbol', 'noto color emoji',
] as const;
