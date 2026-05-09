// nl-NL package — Δ-2 sub-cluster B
//
// Aggregate-export voor de Pijler 3 evaluator. Hard-switch principe per ADR-3:
// dit pakket wordt als bevroren unit consumed; geen union/merge bij read-time.

import type { HeuristicPackage } from '../types';
import { NL_NL_CORPORATE_FLUFF } from './corporate-fluff';
import { NL_NL_SUPERLATIVES } from './superlatives';
import { NL_NL_FILLERS } from './fillers';
import { NL_NL_VAGUE_QUALITY } from './vague-quality';
import { NL_NL_RISKY_COMPARATIVES } from './risky-comparatives';

export const NL_NL_PACKAGE: HeuristicPackage = Object.freeze({
  locale: 'nl-NL',
  categories: {
    'corporate-fluff': NL_NL_CORPORATE_FLUFF,
    superlatives: NL_NL_SUPERLATIVES,
    fillers: NL_NL_FILLERS,
    'vague-quality': NL_NL_VAGUE_QUALITY,
    'risky-comparatives': NL_NL_RISKY_COMPARATIVES,
  },
});
