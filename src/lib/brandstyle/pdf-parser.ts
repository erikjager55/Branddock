// =============================================================
// PDF Parser — Extract text and brand data from PDF files
// Uses unpdf (server-safe, no worker needed)
//
// Enhanced: higher text limit (12000), RGB/RGBA/HSL/CMYK color
// extraction, better font detection patterns.
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
 * - Full text content (up to 12000 chars)
 * - Color codes found in text (hex, RGB, RGBA, HSL, CMYK)
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

  const hexColors = extractColorsFromText(fullText);
  const fontMentions = extractFontMentionsFromText(fullText);

  return {
    fileName,
    text: fullText.slice(0, 12000), // Increased from 8000 for better AI context
    pageCount: totalPages,
    hexColors,
    fontMentions,
    metadata,
  };
}

/**
 * Extract color codes from text content in multiple notations.
 * Brand guidelines mention colors as "#1FD1B2", "RGB(31, 209, 178)",
 * "CMYK(85, 0, 15, 18)", or "HSL(166, 74%, 47%)".
 * All are normalized to hex for consistency.
 */
function extractColorsFromText(text: string): string[] {
  const colorSet = new Set<string>();

  // Hex colors: #RGB or #RRGGBB
  const hexPattern = /#([0-9A-Fa-f]{3}){1,2}\b/g;
  let match;
  while ((match = hexPattern.exec(text)) !== null) {
    const hex = normalizeHex(match[0]);
    if (hex) {
      colorSet.add(hex.toUpperCase());
    }
  }

  // RGB/RGBA: rgb(255, 0, 0) or rgba(255, 0, 0, 0.5)
  // Also matches without "rgb" prefix: (255, 0, 0) preceded by "RGB" text
  const rgbPattern = /rgba?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi;
  while ((match = rgbPattern.exec(text)) !== null) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    if (r <= 255 && g <= 255 && b <= 255) {
      const hex = rgbToHex(r, g, b).toUpperCase();
      colorSet.add(hex);
    }
  }

  // Standalone RGB values: "R: 31 G: 209 B: 178" or "R 31 / G 209 / B 178"
  const rgbSeparatePattern = /R\s*[:=]?\s*(\d{1,3})\s*[,/]?\s*G\s*[:=]?\s*(\d{1,3})\s*[,/]?\s*B\s*[:=]?\s*(\d{1,3})/gi;
  while ((match = rgbSeparatePattern.exec(text)) !== null) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    if (r <= 255 && g <= 255 && b <= 255) {
      const hex = rgbToHex(r, g, b).toUpperCase();
      colorSet.add(hex);
    }
  }

  // HSL: hsl(166, 74%, 47%) — convert to hex
  const hslPattern = /hsla?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%/gi;
  while ((match = hslPattern.exec(text)) !== null) {
    const h = parseInt(match[1]);
    const s = parseInt(match[2]);
    const l = parseInt(match[3]);
    if (h <= 360 && s <= 100 && l <= 100) {
      const hex = hslToHex(h, s, l);
      if (hex) colorSet.add(hex.toUpperCase());
    }
  }

  // CMYK: cmyk(85, 0, 15, 18) or "C: 85 M: 0 Y: 15 K: 18"
  const cmykPattern = /cmyk\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi;
  while ((match = cmykPattern.exec(text)) !== null) {
    const c = parseInt(match[1]);
    const m = parseInt(match[2]);
    const y = parseInt(match[3]);
    const k = parseInt(match[4]);
    if (c <= 100 && m <= 100 && y <= 100 && k <= 100) {
      const hex = cmykToHex(c, m, y, k);
      if (hex) colorSet.add(hex.toUpperCase());
    }
  }

  // Standalone CMYK: "C: 85 M: 0 Y: 15 K: 18"
  const cmykSeparatePattern = /C\s*[:=]?\s*(\d{1,3})\s*[%,/]?\s*M\s*[:=]?\s*(\d{1,3})\s*[%,/]?\s*Y\s*[:=]?\s*(\d{1,3})\s*[%,/]?\s*K\s*[:=]?\s*(\d{1,3})/gi;
  while ((match = cmykSeparatePattern.exec(text)) !== null) {
    const c = parseInt(match[1]);
    const m = parseInt(match[2]);
    const y = parseInt(match[3]);
    const k = parseInt(match[4]);
    if (c <= 100 && m <= 100 && y <= 100 && k <= 100) {
      const hex = cmykToHex(c, m, y, k);
      if (hex) colorSet.add(hex.toUpperCase());
    }
  }

  return Array.from(colorSet);
}

/**
 * Extract font name mentions from text.
 * Enhanced: additional patterns for "typeface", "heading font", "body font",
 * font sizes ("12pt", "16px", "1.5rem").
 */
function extractFontMentionsFromText(text: string): string[] {
  const fontSet = new Set<string>();

  const patterns = [
    // Contextual patterns: "primary font: Inter", "heading typeface: Roboto"
    /(?:primary|secondary|heading|body|display|main|brand|accent)\s*(?:font|typeface|typography|font family)\s*[:=]\s*["']?([A-Za-z][A-Za-z\s]{1,30}?)["']?\s*[\n,.;(]/gi,
    // font-family declarations
    /font[-\s]?family\s*[:=]\s*["']?([A-Za-z][A-Za-z\s]{1,30}?)["']?\s*[\n,.;)]/gi,
    // Typeface-specific patterns
    /typeface\s*[:=]\s*["']?([A-Za-z][A-Za-z\s]{1,30}?)["']?\s*[\n,.;]/gi,
    // "heading font" / "body font" patterns
    /(?:heading|body|display|caption)\s+font\s*[:=]?\s*["']?([A-Za-z][A-Za-z\s]{1,30}?)["']?\s*[\n,.;]/gi,
    // Known font families (expanded list)
    /\b(Inter|Roboto|Open Sans|Montserrat|Lato|Poppins|Raleway|Nunito|Playfair Display|Merriweather|Source Sans|Source Sans Pro|Source Serif|Helvetica Neue|Helvetica|Arial|Futura|Avenir|Proxima Nova|DM Sans|Work Sans|IBM Plex|IBM Plex Sans|IBM Plex Mono|Manrope|Space Grotesk|Outfit|Sora|Plus Jakarta Sans|Noto Sans|Noto Serif|Fira Sans|Fira Code|JetBrains Mono|Geist|Geist Mono|Cal Sans|Satoshi|General Sans|Cabinet Grotesk|Clash Display|Switzer|Epilogue|Red Hat Display|Red Hat Text|Atkinson Hyperlegible)\b/gi,
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

// ─── Color conversion helpers ─────────────────────────

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

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Convert HSL to hex */
function hslToHex(h: number, s: number, l: number): string | null {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return rgbToHex(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  );
}

/** Convert CMYK (0-100) to hex */
function cmykToHex(c: number, m: number, y: number, k: number): string | null {
  const r = Math.round(255 * (1 - c / 100) * (1 - k / 100));
  const g = Math.round(255 * (1 - m / 100) * (1 - k / 100));
  const b = Math.round(255 * (1 - y / 100) * (1 - k / 100));
  return rgbToHex(r, g, b);
}
