// de-DE superlatives — Δ-2 sub-cluster B-4
//
// always-flag voor onsubstantiated category-claims; context-flag waar
// substantiatie in zelfde paragraaf (cijfer, certificaat, named source)
// de claim verifiable maakt.

import type { HeuristicEntry } from '../types';

export const DE_DE_SUPERLATIVES: HeuristicEntry[] = [
  { term: 'weltweit führend', citationKey: 'karrierebibel_floskel', severity: 'always-flag', annotation: 'Eis market-share cijfer.' },
  { term: 'Marktführer', citationKey: 'karrierebibel_floskel', severity: 'context-flag', annotation: 'OK met segment + analyst-bron.' },
  { term: 'Branchenführer', citationKey: 'karrierebibel_floskel', severity: 'context-flag' },
  { term: 'einzigartig', citationKey: 'caesar_business_bullshit', severity: 'always-flag' },
  { term: 'revolutionär', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'bahnbrechend', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'preisgekrönt', citationKey: 'karrierebibel_floskel', severity: 'context-flag', annotation: 'OK met named award + jaar.' },
  { term: 'unschlagbar', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'erstklassig', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'hochmodern', citationKey: 'caesar_business_bullshit', severity: 'always-flag' },
  { term: 'topmodern', citationKey: 'caesar_business_bullshit', severity: 'always-flag' },
  { term: 'modernste', citationKey: 'caesar_business_bullshit', severity: 'always-flag' },
  { term: 'innovativ', citationKey: 'cobalt_business_deutsch', severity: 'always-flag', annotation: 'Eis bewijs, niet zelf-claim.' },
  { term: 'innovativste', citationKey: 'cobalt_business_deutsch', severity: 'always-flag' },
  { term: 'zukunftsweisend', citationKey: 'caesar_business_bullshit', severity: 'always-flag' },
  { term: 'revolutionierend', citationKey: 'caesar_business_bullshit', severity: 'always-flag' },
  { term: 'Spitzenklasse', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'Premiumqualität', citationKey: 'karrierebibel_floskel', severity: 'context-flag', annotation: 'OK met spec / certificaat.' },
];
