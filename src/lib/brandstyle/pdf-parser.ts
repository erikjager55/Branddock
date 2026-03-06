// =============================================================
// PDF Parser — Extract text and brand data from PDF files
// Uses unpdf (server-safe, no worker needed)
// =============================================================

import { extractText, getMeta } from 'unpdf';

export interface ParsedPdfData {
  fileName: string;
  text: string;
  pageCount: number;
  hexColors: string[];
  fontMentions: string[];
  metadata: {
    title: string | null;
    author: string | null;
    creator: string | null;
  };
}

/**
 * Parse a PDF buffer and extract brand-relevant data:
 * - Full text content
 * - Hex color codes found in text
 * - Font name mentions in text
 * - PDF metadata
 */
export async function parsePdf(
  buffer: Buffer,
  fileName: string
): Promise<ParsedPdfData> {
  const { text: fullText, totalPages } = await extractText(buffer, { mergePages: true });

  let metadata: ParsedPdfData['metadata'] = { title: null, author: null, creator: null };
  try {
    const meta = await getMeta(buffer);
    const info = meta?.info as Record<string, unknown> | undefined;
    metadata = {
      title: (info?.Title as string) || null,
      author: (info?.Author as string) || null,
      creator: (info?.Creator as string) || null,
    };
  } catch {
    // Metadata extraction can fail on some PDFs — not critical
  }

  const hexColors = extractHexFromText(fullText);
  const fontMentions = extractFontMentionsFromText(fullText);

  return {
    fileName,
    text: fullText.slice(0, 8000), // Limit for AI prompt
    pageCount: totalPages,
    hexColors,
    fontMentions,
    metadata,
  };
}

/**
 * Extract hex color codes from text content
 * Brand guidelines often mention colors as "#1FD1B2" or "hex: #333333"
 */
function extractHexFromText(text: string): string[] {
  const colorSet = new Set<string>();
  const hexPattern = /#([0-9A-Fa-f]{3}){1,2}\b/g;
  let match;

  while ((match = hexPattern.exec(text)) !== null) {
    const hex = normalizeHex(match[0]);
    if (hex) {
      colorSet.add(hex.toUpperCase());
    }
  }

  return Array.from(colorSet);
}

/**
 * Extract font name mentions from text
 * Brand guidelines mention fonts like "Helvetica Neue", "Inter", "Open Sans"
 */
function extractFontMentionsFromText(text: string): string[] {
  const fontSet = new Set<string>();

  const patterns = [
    /(?:primary|secondary|heading|body|display)\s*(?:font|typeface|typography)\s*[:=]\s*["']?([A-Za-z][A-Za-z\s]{1,30}?)["']?\s*[\n,.;(]/gi,
    /font[-\s]?family\s*[:=]\s*["']?([A-Za-z][A-Za-z\s]{1,30}?)["']?\s*[\n,.;)]/gi,
    /\b(Inter|Roboto|Open Sans|Montserrat|Lato|Poppins|Raleway|Nunito|Playfair Display|Merriweather|Source Sans|Helvetica Neue|Helvetica|Arial|Futura|Avenir|Proxima Nova|DM Sans|Work Sans|IBM Plex|Manrope|Space Grotesk|Outfit|Sora|Plus Jakarta Sans)\b/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const font = match[1].trim();
      if (font.length >= 3 && font.length <= 30) {
        fontSet.add(font);
      }
    }
  }

  return Array.from(fontSet);
}

function normalizeHex(hex: string): string | null {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
  }
  if (clean.length === 6) {
    return `#${clean}`;
  }
  return null;
}
