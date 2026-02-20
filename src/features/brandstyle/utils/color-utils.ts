// =============================================================
// Color conversion utilities
// =============================================================

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.replace("#", "").match(/^([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

export function hexToRgbString(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "";
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hexToHslString(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return "";
  return `${hsl.h}, ${hsl.s}%, ${hsl.l}%`;
}

export function hexToCmyk(hex: string): { c: number; m: number; y: number; k: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };

  return {
    c: Math.round(((1 - r - k) / (1 - k)) * 100),
    m: Math.round(((1 - g - k) / (1 - k)) * 100),
    y: Math.round(((1 - b - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

export function hexToCmykString(hex: string): string {
  const cmyk = hexToCmyk(hex);
  if (!cmyk) return "";
  return `${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%`;
}

/**
 * Calculate relative luminance per WCAG 2.0
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate WCAG contrast ratio between two colors
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 0;

  const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get WCAG compliance level
 */
export function wcagLevel(ratio: number): "AAA" | "AA" | "Fail" {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  return "Fail";
}

export function contrastWithWhite(hex: string): string {
  return wcagLevel(contrastRatio(hex, "#FFFFFF"));
}

export function contrastWithBlack(hex: string): string {
  return wcagLevel(contrastRatio(hex, "#000000"));
}
