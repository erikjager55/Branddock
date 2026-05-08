// de-DE vague-quality — Δ-2 sub-cluster B-4
//
// context-flag: claim is OK alleen wanneer substantiated in zelfde paragraaf
// (cijfer, certificaat, named comparison). Pijler 3 evaluator runt
// substantiation-check vóór flagging.

import type { HeuristicEntry } from '../types';

export const DE_DE_VAGUE_QUALITY: HeuristicEntry[] = [
  { term: 'qualitativ hochwertig', citationKey: 'karrierebibel_floskel', severity: 'context-flag', annotation: 'Substantieer met cert / spec.' },
  { term: 'hochwertig', citationKey: 'karrierebibel_floskel', severity: 'context-flag' },
  { term: 'erstklassige Qualität', citationKey: 'karrierebibel_floskel', severity: 'context-flag' },
  { term: 'umfassend', citationKey: 'caesar_business_bullshit', severity: 'context-flag' },
  { term: 'umfangreich', citationKey: 'caesar_business_bullshit', severity: 'context-flag' },
  { term: 'maßgeschneidert', citationKey: 'karrierebibel_floskel', severity: 'context-flag', annotation: 'Substantieer met process / customization-mechanic.' },
  { term: 'kundenorientiert', citationKey: 'cobalt_business_deutsch', severity: 'context-flag' },
  { term: 'datenbasiert', citationKey: 'cobalt_business_deutsch', severity: 'context-flag', annotation: 'OK met methodology citation.' },
  { term: 'datengetrieben', citationKey: 'cobalt_business_deutsch', severity: 'context-flag' },
  { term: 'menschenzentriert', citationKey: 'caesar_business_bullshit', severity: 'context-flag' },
  { term: 'individuelle Lösung', citationKey: 'cobalt_business_deutsch', severity: 'context-flag', annotation: 'Substantieer met process.' },
  { term: 'individuelle Lösungen', citationKey: 'cobalt_business_deutsch', severity: 'context-flag' },
  { term: 'maßgeschneiderte Lösungen', citationKey: 'cobalt_business_deutsch', severity: 'context-flag' },
  { term: 'professionell', citationKey: 'karrierebibel_floskel', severity: 'context-flag' },
  { term: 'zukunftsorientiert', citationKey: 'caesar_business_bullshit', severity: 'always-flag' },
  { term: 'zukunftsfähig', citationKey: 'caesar_business_bullshit', severity: 'always-flag' },
];
