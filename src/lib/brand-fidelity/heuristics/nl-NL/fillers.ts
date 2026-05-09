// nl-NL fillers — Δ-2 sub-cluster B seed
//
// Schrijfvis "21 woorden die je altijd kunt schrappen" + Onze Taal-extensies +
// scriptie-stopwoorden corpus. Allemaal soft-flag — single-pass review-suggestion,
// geen blocking.

import type { HeuristicEntry } from '../types';

export const NL_NL_FILLERS: HeuristicEntry[] = [
  { term: 'fundamenteel', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'essentieel', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'daadwerkelijk', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'eigenlijk', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'gewoon', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'gewoonweg', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'simpelweg', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'in feite', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'eerlijk gezegd', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'nu eenmaal', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'kortom', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'overigens', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'met name', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'in principe', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'in zekere zin', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'enigszins', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'redelijk', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'tamelijk', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'vrijwel', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'nagenoeg', citationKey: 'schrijfvis_schrap', severity: 'soft-flag' },
  { term: 'een aantal', citationKey: 'schrijfvis_schrap', severity: 'soft-flag', annotation: 'Specifieker: "drie", "tien"' },
];
