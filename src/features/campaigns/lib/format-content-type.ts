/**
 * Format a content type slug (e.g. "blog-post", "linkedin-post") into a
 * human-readable label with proper capitalization and brand-correct casing.
 */

const SPECIAL_CASES: Record<string, string> = {
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  seo: "SEO",
  pdf: "PDF",
};

export function formatContentType(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      if (SPECIAL_CASES[lower]) return SPECIAL_CASES[lower];
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
