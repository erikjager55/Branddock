// =============================================================
// Tailwind Theme Emitter
//
// Produceert een object dat direct gedropt kan worden in
// `tailwind.config.ts`'s `theme.extend` sectie. Consumenten:
// v0 (Vercel), Claude Design artifacts, Bolt, shadcn CLI.
//
// Structure:
// {
//   colors: { primary: "#...", "on-primary": "#..." },
//   fontFamily: { headline: ["Poppins", "sans-serif"] },
//   fontSize: { "headline-display": ["48px", { lineHeight: "1.1", ... }] },
//   borderRadius: { sm: "4px", md: "8px" },
//   spacing: { xs: "4px", sm: "8px" },
//   boxShadow: { "elevation-1": "...", ... }
// }
// =============================================================

import type { DesignSystemModel, TypographyToken } from '../canonical';
import { roundedScaleKeys, spacingScaleKeys, elevationLevelKeys } from '../canonical';

export interface TailwindTheme {
  colors: Record<string, string>;
  fontFamily: Record<string, string[]>;
  fontSize: Record<string, [string, { lineHeight?: string; fontWeight?: string; letterSpacing?: string }]>;
  borderRadius: Record<string, string>;
  spacing: Record<string, string>;
  boxShadow: Record<string, string>;
}

export function emitTailwindTheme(model: DesignSystemModel): TailwindTheme {
  return {
    colors: buildColors(model),
    fontFamily: buildFontFamily(model),
    fontSize: buildFontSize(model),
    borderRadius: buildBorderRadius(model),
    spacing: buildSpacing(model),
    boxShadow: buildBoxShadow(model),
  };
}

function buildColors(model: DesignSystemModel): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [role, tok] of Object.entries(model.colors)) {
    if (!tok) continue;
    out[role] = tok.value;
  }
  return out;
}

function buildFontFamily(model: DesignSystemModel): Record<string, string[]> {
  const families = new Set<string>();
  for (const tok of Object.values(model.typography)) {
    if (tok) families.add(tok.fontFamily);
  }
  const out: Record<string, string[]> = {};
  const familyArr = [...families];
  if (familyArr.length > 0) {
    out.sans = [familyArr[0], 'system-ui', 'sans-serif'];
  }
  if (familyArr.length > 1) {
    out.display = [familyArr[1], ...familyArr.slice(2), 'system-ui', 'sans-serif'];
  }
  return out;
}

function buildFontSize(
  model: DesignSystemModel,
): Record<string, [string, { lineHeight?: string; fontWeight?: string; letterSpacing?: string }]> {
  const out: Record<string, [string, { lineHeight?: string; fontWeight?: string; letterSpacing?: string }]> = {};
  for (const [role, tok] of Object.entries(model.typography)) {
    if (!tok) continue;
    out[role] = tailwindFontSizeTuple(tok);
  }
  return out;
}

function tailwindFontSizeTuple(
  tok: TypographyToken,
): [string, { lineHeight?: string; fontWeight?: string; letterSpacing?: string }] {
  const extras: { lineHeight?: string; fontWeight?: string; letterSpacing?: string } = {
    lineHeight: tok.lineHeight,
    fontWeight: String(tok.fontWeight),
  };
  if (tok.letterSpacing) extras.letterSpacing = tok.letterSpacing;
  return [tok.fontSize, extras];
}

function buildBorderRadius(model: DesignSystemModel): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of roundedScaleKeys()) {
    const tok = model.rounded[key];
    if (!tok) continue;
    out[key] = key === 'full' || tok.value >= 9999 ? '9999px' : `${tok.value}px`;
  }
  return out;
}

function buildSpacing(model: DesignSystemModel): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of spacingScaleKeys()) {
    const tok = model.spacing[key];
    if (!tok) continue;
    out[key] = `${tok.value}px`;
  }
  return out;
}

function buildBoxShadow(model: DesignSystemModel): Record<string, string> {
  const out: Record<string, string> = {};
  for (const level of elevationLevelKeys()) {
    const tok = model.elevation[level];
    if (!tok) continue;
    out[`elevation-${level}`] = tok.value;
  }
  return out;
}
