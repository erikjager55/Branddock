// nl-NL superlatives — Δ-2 sub-cluster B seed
//
// Superlatieven die bewijs eisen. always-flag → vereist disclaimer of cijfer/
// award/ranking in zelfde paragraaf om weg te vallen. Bron: Onze Taal +
// CliCheschatkamer + research-derived 2024-2026 toevoegingen.

import type { HeuristicEntry } from '../types';

export const NL_NL_SUPERLATIVES: HeuristicEntry[] = [
  { term: 'beste', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'eerste', citationKey: 'onze_taal', severity: 'always-flag', annotation: 'In claim-zin — "het eerste merk dat..."' },
  { term: 'enige', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'top', citationKey: 'onze_taal', severity: 'always-flag', annotation: 'In adjectiefpositie' },
  { term: 'leider', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'marktleider', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'grootste', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'snelste', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'pionier', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'baanbrekend', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'revolutionair', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'ongeëvenaard', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'toonaangevend', citationKey: 'cliche_schatkamer', severity: 'always-flag', annotation: 'Alt: marktleider met %/ranking' },
  { term: 'wereldwijd erkend', citationKey: 'cliche_schatkamer', severity: 'always-flag' },
  { term: 'ongekend', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'uitmuntend', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'excellent', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'awardwinnend', citationKey: 'cliche_schatkamer', severity: 'context-flag', annotation: 'OK met award-naam + jaar in zelfde zin' },
  { term: 'gerenommeerd', citationKey: 'cliche_schatkamer', severity: 'always-flag' },
  { term: 'autoriteit', citationKey: 'cliche_schatkamer', severity: 'always-flag' },
  { term: 'toekomstvast', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
];
