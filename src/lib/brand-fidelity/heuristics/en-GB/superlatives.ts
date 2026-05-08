// en-GB superlatives — Δ-2 sub-cluster B-2
//
// always-flag for unsubstantiated category claims; context-flag where
// substantiation in same paragraph (number, certifying body, named source)
// makes the claim verifiable.

import type { HeuristicEntry } from '../types';

export const EN_GB_SUPERLATIVES: HeuristicEntry[] = [
  { term: 'world-class', citationKey: 'cfo_overhyped', severity: 'always-flag', annotation: 'Show evidence.' },
  { term: 'world class', citationKey: 'cfo_overhyped', severity: 'always-flag' },
  { term: 'best-in-class', citationKey: 'cfo_overhyped', severity: 'always-flag' },
  { term: 'industry-leading', citationKey: 'cfo_overhyped', severity: 'context-flag', annotation: 'OK with analyst-quadrant or market-share number.' },
  { term: 'industry leading', citationKey: 'cfo_overhyped', severity: 'context-flag' },
  { term: 'revolutionary', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
  { term: 'game-changing', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
  { term: 'game changer', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
  { term: 'next-generation', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
  { term: 'next generation', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
  { term: 'cutting-edge', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
  { term: 'cutting edge', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
  { term: 'state-of-the-art', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
  { term: 'state of the art', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
  { term: 'unparalleled', citationKey: 'cfo_overhyped', severity: 'always-flag' },
  { term: 'unmatched', citationKey: 'cfo_overhyped', severity: 'always-flag' },
  { term: 'unrivalled', citationKey: 'cfo_overhyped', severity: 'always-flag' },
  { term: 'unrivaled', citationKey: 'cfo_overhyped', severity: 'always-flag' },
  { term: 'best of breed', citationKey: 'cfo_overhyped', severity: 'always-flag' },
  { term: 'one-of-a-kind', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
  { term: 'pioneering', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag', annotation: 'OK with first-to-market evidence.' },
  { term: 'breakthrough', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
  { term: 'second to none', citationKey: 'cfo_overhyped', severity: 'always-flag' },
];
