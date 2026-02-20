/**
 * Parse markdown content to generate a Table of Contents.
 * Extracts ## (h2) and ### (h3) headers.
 */

export interface TocEntry {
  id: string;
  title: string;
  level: number;
}

/**
 * Generates a slug-style ID from a heading title.
 * - Lowercases
 * - Strips non-alphanumeric chars (except spaces and hyphens)
 * - Replaces spaces with hyphens
 */
function headingToId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Parse markdown string and extract h2/h3 headings as TOC entries.
 */
export function generateToc(markdown: string): TocEntry[] {
  const lines = markdown.split("\n");
  const toc: TocEntry[] = [];

  for (const line of lines) {
    // Match ## or ### at start of line (not inside code blocks)
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length; // 2 or 3
      const title = match[2].trim();
      const id = headingToId(title);

      if (id) {
        toc.push({ id, title, level });
      }
    }
  }

  return toc;
}

/**
 * Check if a TOC has any entries.
 */
export function hasToc(toc: TocEntry[]): boolean {
  return toc.length > 0;
}
