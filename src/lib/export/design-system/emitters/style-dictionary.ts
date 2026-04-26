// =============================================================
// Style Dictionary Source Emitter
//
// Produceert een Amazon Style Dictionary source JSON met `.value`
// nesting. Consumenten: Amazon Style Dictionary transformer (→ CSS,
// iOS, Android, Flutter, ...).
//
// Style Dictionary shape:
//   {
//     "color": {
//       "primary": { "value": "#0D9488", "attributes": {"category": "color"} }
//     },
//     "size": {
//       "spacing": { "md": { "value": "16px" } }
//     }
//   }
// =============================================================

import type { DesignSystemModel } from '../canonical';
import { roundedScaleKeys, spacingScaleKeys, elevationLevelKeys } from '../canonical';

interface SdToken { value: string; comment?: string; attributes?: Record<string, string> }
type SdGroup = { [key: string]: SdToken | SdGroup };

export function emitStyleDictionary(model: DesignSystemModel): Record<string, unknown> {
  return {
    color: buildColorGroup(model),
    size: {
      rounded: buildRoundedGroup(model),
      spacing: buildSpacingGroup(model),
    },
    font: buildFontGroup(model),
    shadow: buildShadowGroup(model),
  };
}

function buildColorGroup(model: DesignSystemModel): SdGroup {
  const group: SdGroup = {};
  for (const [role, tok] of Object.entries(model.colors)) {
    if (!tok) continue;
    group[role] = {
      value: tok.value,
      comment: tok.source,
      attributes: { category: 'color' },
    };
  }
  return group;
}

function buildRoundedGroup(model: DesignSystemModel): SdGroup {
  const group: SdGroup = {};
  for (const k of roundedScaleKeys()) {
    const tok = model.rounded[k];
    if (!tok) continue;
    group[k] = { value: `${tok.value}px`, attributes: { category: 'size', type: 'border-radius' } };
  }
  return group;
}

function buildSpacingGroup(model: DesignSystemModel): SdGroup {
  const group: SdGroup = {};
  for (const k of spacingScaleKeys()) {
    const tok = model.spacing[k];
    if (!tok) continue;
    group[k] = { value: `${tok.value}px`, attributes: { category: 'size', type: 'spacing' } };
  }
  return group;
}

function buildFontGroup(model: DesignSystemModel): SdGroup {
  const families = new Set<string>();
  for (const tok of Object.values(model.typography)) {
    if (tok) families.add(tok.fontFamily);
  }
  const out: SdGroup = {
    family: {} as SdGroup,
    size: {} as SdGroup,
    weight: {} as SdGroup,
  };
  let idx = 0;
  for (const family of families) {
    (out.family as SdGroup)[idx === 0 ? 'sans' : 'display'] = {
      value: family,
      attributes: { category: 'font', type: 'family' },
    };
    idx++;
  }
  for (const [role, tok] of Object.entries(model.typography)) {
    if (!tok) continue;
    (out.size as SdGroup)[role] = {
      value: tok.fontSize,
      attributes: { category: 'font', type: 'size' },
    };
    (out.weight as SdGroup)[role] = {
      value: String(tok.fontWeight),
      attributes: { category: 'font', type: 'weight' },
    };
  }
  return out;
}

function buildShadowGroup(model: DesignSystemModel): SdGroup {
  const group: SdGroup = {};
  for (const level of elevationLevelKeys()) {
    const tok = model.elevation[level];
    if (!tok) continue;
    group[`elevation-${level}`] = {
      value: tok.value,
      attributes: { category: 'shadow' },
    };
  }
  return group;
}
