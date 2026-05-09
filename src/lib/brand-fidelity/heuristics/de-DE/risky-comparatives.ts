// de-DE risky-comparatives — Δ-2 sub-cluster B-4
//
// always-flag bare comparative form. De shared/risky-comparatives-detector
// (planned) doet de 2-step: detect → check zin/paragraaf voor comparand
// (im Vergleich zu / als X) of numeriek anker. Deze lijst seedt detect-step.

import type { HeuristicEntry } from '../types';

export const DE_DE_RISKY_COMPARATIVES: HeuristicEntry[] = [
  { term: 'besser', citationKey: 'karrierebibel_floskel', severity: 'always-flag', annotation: 'Besser als wat? Voeg comparand toe.' },
  { term: 'schneller', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'effizienter', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'effektiver', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'günstiger', citationKey: 'karrierebibel_floskel', severity: 'always-flag', annotation: 'Günstiger als wat? Voeg referentie toe.' },
  { term: 'einfacher', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'sicherer', citationKey: 'karrierebibel_floskel', severity: 'always-flag', annotation: 'Vooral in regulated copy: substantieer.' },
  { term: 'stabiler', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'leistungsfähiger', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'zuverlässiger', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'höhere Qualität', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'geringere Kosten', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
];
