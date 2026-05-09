// nl-BE corporate-fluff EXTRA entries — Δ-2 sub-cluster B-3
//
// BE-specific cliché's die nl-NL niet kent. Worden bij nl-BE-package-build
// toegevoegd aan de inherited nl-NL corporate-fluff lijst. Bron-research
// 2026-05-08 — vacature-corpus + zakelijke-copy onderzoek.

import type { HeuristicEntry } from '../types';

export const NL_BE_CORPORATE_FLUFF_EXTRA: HeuristicEntry[] = [
  { term: 'familiale sfeer', citationKey: 'werf_jeukwoorden', severity: 'always-flag', annotation: 'BE-vacature-cliché; vraag bewijs.' },
  { term: 'marktconform salaris', citationKey: 'werf_jeukwoorden', severity: 'always-flag', annotation: 'BE-recruitment-fluff; weinigzeggend.' },
  { term: 'stressbestendig', citationKey: 'werf_jeukwoorden', severity: 'always-flag', annotation: 'BE-vacature: wat betekent het concreet?' },
  { term: 'no-nonsense aanpak', citationKey: 'werf_jeukwoorden', severity: 'always-flag' },
  { term: 'aangenaam werkkader', citationKey: 'werf_jeukwoorden', severity: 'always-flag' },
];
