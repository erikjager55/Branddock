// =============================================================
// PDF Parser — Extract text and brand data from PDF files
// Uses pdf-parse v5+ (PDFParse class API)
// =============================================================

import { PDFParse } from 'pdf-parse';

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
  const parser = new PDFParse({ data: buffer });

  // getText() internally calls load() which is private
  const textResult = await parser.getText();
  const text = textResult.text || '';

  // Get metadata
  let metadata: { title: string | null; author: string | null; creator: string | null } = {
    title: null,
    author: null,
    creator: null,
  };
  try {
    const info = await parser.getInfo();
    metadata = {
      title: info.info?.Title || null,
      author: info.info?.Author || null,
      creator: info.info?.Creator || null,
    };
  } catch {
    // Metadata extraction can fail on some PDFs — not critical
  }

  const pageCount = textResult.pages?.length || 0;
  const hexColors = extractHexFromText(text);
  const fontMentions = extractFontMentionsFromText(text);

  // Clean up
  await parser.destroy();

  return {
    fileName,
    text: text.slice(0, 8000), // Limit for AI prompt
    pageCount,
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

  // Common patterns in brand guidelines
  const patterns = [
    // "Primary font: Inter" or "Font: Helvetica Neue"
    /(?:primary|secondary|heading|body|display)\s*(?:font|typeface|typography)\s*[:=]\s*["']?([A-Za-z][A-Za-z\s]{1,30}?)["']?\s*[\n,.;(]/gi,
    // "Font family: Inter" or "Font-family: Open Sans"
    /font[-\s]?family\s*[:=]\s*["']?([A-Za-z][A-Za-z\s]{1,30}?)["']?\s*[\n,.;)]/gi,
    // Well-known font names directly mentioned
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
