// de-DE package — Δ-2 sub-cluster B-4
//
// Aggregate-export voor de Pijler 3 evaluator. Hard-switch principe per ADR-3:
// dit pakket wordt als bevroren unit consumed; geen union/merge bij read-time.
// Denglisch wordt geconcat met corporate-fluff (Anglicism-overuse is een
// specifieke vorm van corporate-fluff in DE business writing).

import type { HeuristicPackage } from '../types';
import { DE_DE_CORPORATE_FLUFF } from './corporate-fluff';
import { DE_DE_SUPERLATIVES } from './superlatives';
import { DE_DE_FILLERS } from './fillers';
import { DE_DE_VAGUE_QUALITY } from './vague-quality';
import { DE_DE_RISKY_COMPARATIVES } from './risky-comparatives';
import { DE_DE_DENGLISCH } from './denglisch';

export const DE_DE_PACKAGE: HeuristicPackage = Object.freeze({
  locale: 'de-DE',
  categories: {
    'corporate-fluff': [...DE_DE_CORPORATE_FLUFF, ...DE_DE_DENGLISCH],
    superlatives: DE_DE_SUPERLATIVES,
    fillers: DE_DE_FILLERS,
    'vague-quality': DE_DE_VAGUE_QUALITY,
    'risky-comparatives': DE_DE_RISKY_COMPARATIVES,
  },
});
