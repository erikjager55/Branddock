// en-GB package — Δ-2 sub-cluster B-2
//
// Aggregate-export voor de Pijler 3 evaluator. Hard-switch principe per ADR-3:
// dit pakket wordt als bevroren unit consumed; geen union/merge bij read-time.
// EN-only categorie `ai-tells` is hier wel aanwezig (anders dan in NL/DE).

import type { HeuristicPackage } from '../types';
import { EN_GB_CORPORATE_FLUFF } from './corporate-fluff';
import { EN_GB_SUPERLATIVES } from './superlatives';
import { EN_GB_FILLERS } from './fillers';
import { EN_GB_VAGUE_QUALITY } from './vague-quality';
import { EN_GB_RISKY_COMPARATIVES } from './risky-comparatives';
import { EN_GB_AI_TELLS } from './ai-tells';

export const EN_GB_PACKAGE: HeuristicPackage = Object.freeze({
  locale: 'en-GB',
  categories: {
    'corporate-fluff': EN_GB_CORPORATE_FLUFF,
    superlatives: EN_GB_SUPERLATIVES,
    fillers: EN_GB_FILLERS,
    'vague-quality': EN_GB_VAGUE_QUALITY,
    'risky-comparatives': EN_GB_RISKY_COMPARATIVES,
    'ai-tells': EN_GB_AI_TELLS,
  },
});
