// =============================================================
// Figma Variables Emitter
//
// Produceert een JSON-structuur die door Figma-plugins (zoals
// Tokens Studio, Figma Tokens, variables2css) geconsumeerd kan
// worden als Variables Collection.
//
// Shape gebaseerd op Figma Variables REST API + Tokens Studio sync:
// {
//   "collections": [
//     {
//       "name": "Brand",
//       "modes": [{"name": "Default", ...}],
//       "variables": [
//         { "name": "primary", "resolvedType": "COLOR", "valuesByMode": { "Default": { "r":..., "g":..., "b":..., "a":1 } } }
//       ]
//     }
//   ]
// }
// =============================================================

import type { DesignSystemModel } from '../canonical';
import { roundedScaleKeys, spacingScaleKeys } from '../canonical';

interface FigmaColorValue { r: number; g: number; b: number; a: number }
interface FigmaFloatValue { value: number }
interface FigmaStringValue { value: string }

interface FigmaVariable {
  name: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING';
  valuesByMode: Record<string, FigmaColorValue | FigmaFloatValue | FigmaStringValue>;
  description?: string;
}

interface FigmaCollection {
  name: string;
  modes: Array<{ name: string }>;
  variables: FigmaVariable[];
}

export function emitFigmaVariables(model: DesignSystemModel): {
  $schema: string;
  meta: { generatedAt: string; source: string };
  collections: FigmaCollection[];
} {
  const mode = 'Default';

  return {
    $schema: 'https://www.figma.com/developers/api/variables/v1',
    meta: {
      generatedAt: model.meta.generatedAt,
      source: `Branddock export for ${model.meta.name}`,
    },
    collections: [
      {
        name: 'Colors',
        modes: [{ name: mode }],
        variables: Object.entries(model.colors)
          .filter(([, tok]) => tok)
          .map(([role, tok]) => ({
            name: role,
            resolvedType: 'COLOR' as const,
            valuesByMode: { [mode]: hexToFigmaColor(tok!.value) },
            description: tok!.source,
          })),
      },
      {
        name: 'Rounded',
        modes: [{ name: mode }],
        variables: roundedScaleKeys()
          .filter((k) => model.rounded[k])
          .map((k) => ({
            name: k,
            resolvedType: 'FLOAT' as const,
            valuesByMode: { [mode]: { value: model.rounded[k]!.value } },
          })),
      },
      {
        name: 'Spacing',
        modes: [{ name: mode }],
        variables: spacingScaleKeys()
          .filter((k) => model.spacing[k])
          .map((k) => ({
            name: k,
            resolvedType: 'FLOAT' as const,
            valuesByMode: { [mode]: { value: model.spacing[k]!.value } },
          })),
      },
    ],
  };
}

function hexToFigmaColor(hex: string): FigmaColorValue {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return { r: 0, g: 0, b: 0, a: 1 };
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
    a: 1,
  };
}
