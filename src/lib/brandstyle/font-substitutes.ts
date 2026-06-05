// =============================================================
// Font Substitutes — metric-compatible Google Fonts alternatives
//
// Commercial webfonts (Effra, Sohne, Circular, …) aren't gratis and
// can only be previewed via the user's own Adobe Fonts kit or an
// uploaded .woff2. For users who haven't set either up, we render
// previews using a metric-compatible Google Font so the visual
// approximation is close enough to judge brand rhythm.
//
// The mapping prioritises metrics (cap-height, x-height, proportions)
// over exact character shapes — substitutes feel right at a glance
// even though a designer would spot the differences.
// =============================================================

export interface FontSubstitute {
  /** Google Fonts family name, used verbatim in CSS and the CDN URL. */
  googleFont: string;
  /** Short explanation shown to the user so they know it's a stand-in. */
  note: string;
}

const SUBSTITUTES: Record<string, FontSubstitute> = {
  // Dalton Maag / commercial sans workhorses → Inter (closest geometry)
  effra: { googleFont: "Inter", note: "Inter is a close metric match for Effra." },
  sohne: { googleFont: "Inter", note: "Inter is close to Söhne's grotesk geometry." },
  söhne: { googleFont: "Inter", note: "Inter is close to Söhne's grotesk geometry." },
  // Circular / geometric sans → Nunito Sans (similar roundness)
  circular: { googleFont: "Nunito Sans", note: "Nunito Sans matches Circular's round geometric feel." },
  "circular-std": { googleFont: "Nunito Sans", note: "Nunito Sans matches Circular's round geometric feel." },
  // Haas / Helvetica clones → Inter (cap-height matches very well)
  "neue-haas-grotesk": { googleFont: "Inter", note: "Inter shares Neue Haas Grotesk proportions." },
  "helvetica-now": { googleFont: "Inter", note: "Inter approximates Helvetica's neutrality." },
  helvetica: { googleFont: "Inter", note: "Inter approximates Helvetica's neutrality." },
  "helvetica-neue": { googleFont: "Inter", note: "Inter approximates Helvetica's neutrality." },
  // Proxima Nova → Montserrat (same tall x-height, similar terminals)
  "proxima-nova": { googleFont: "Montserrat", note: "Montserrat echoes Proxima Nova's proportions." },
  proxima: { googleFont: "Montserrat", note: "Montserrat echoes Proxima Nova's proportions." },
  // GT America → DM Sans
  "gt-america": { googleFont: "DM Sans", note: "DM Sans matches GT America's modern grotesk feel." },
  // Graphik / Brown — modern grotesks → Inter
  graphik: { googleFont: "Inter", note: "Inter approximates Graphik's modern grotesk." },
  brown: { googleFont: "Inter", note: "Inter approximates Brown's workhorse sans." },
  // Gotham → Montserrat (closest OSS geometric sans)
  gotham: { googleFont: "Montserrat", note: "Montserrat is the closest OSS match to Gotham." },
  // Futura → Jost
  futura: { googleFont: "Jost", note: "Jost is a modern revival of Futura's geometry." },
  // FF Mark → Inter
  "ff-mark": { googleFont: "Inter", note: "Inter stands in for FF Mark's geometric sans." },
  mark: { googleFont: "Inter", note: "Inter stands in for FF Mark's geometric sans." },
  // Avenir → Nunito Sans / Jost
  avenir: { googleFont: "Nunito Sans", note: "Nunito Sans approximates Avenir's humanist sans." },
  "avenir-next": { googleFont: "Nunito Sans", note: "Nunito Sans approximates Avenir's humanist sans." },
  // Neutraface → Josefin Sans (display-level match)
  neutraface: { googleFont: "Josefin Sans", note: "Josefin Sans captures Neutraface's display proportions." },
  // Monospace commercial → JetBrains Mono
  "berkeley-mono": { googleFont: "JetBrains Mono", note: "JetBrains Mono substitutes for Berkeley Mono." },
  "operator-mono": { googleFont: "JetBrains Mono", note: "JetBrains Mono substitutes for Operator Mono." },
  // Display serif commercial → Playfair Display / EB Garamond
  tiempos: { googleFont: "Lora", note: "Lora stands in for Tiempos' modern serif." },
  "tiempos-text": { googleFont: "Lora", note: "Lora stands in for Tiempos' modern serif." },
  caslon: { googleFont: "EB Garamond", note: "EB Garamond echoes Caslon's classical serif feel." },
};

/** Look up a substitute. Returns null if none known. Matching is
 *  case-insensitive and hyphen-insensitive (spaces also collapse to
 *  hyphens) so "Effra Regular" → "effra-regular" → "effra". */
export function findFontSubstitute(name: string): FontSubstitute | null {
  if (!name) return null;
  const normalised = name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-regular$|-bold$|-light$|-medium$/, "");
  // Exact match first
  if (SUBSTITUTES[normalised]) return SUBSTITUTES[normalised];
  // Fuzzy: try stripping common suffixes / prefixes
  for (const key of Object.keys(SUBSTITUTES)) {
    if (normalised.startsWith(key) || normalised.includes(key)) {
      return SUBSTITUTES[key];
    }
  }
  return null;
}

/** Build the Google Fonts CDN URL for a substitute family.
 *  Conservative wght set (400/700) — most substitutes ship those
 *  unconditionally and we don't need more for preview purposes. */
export function buildSubstituteCssUrl(family: string): string {
  return `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, "+")}:wght@400;700&display=swap`;
}
