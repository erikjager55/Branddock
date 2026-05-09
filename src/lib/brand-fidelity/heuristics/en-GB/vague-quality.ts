// en-GB vague-quality — Δ-2 sub-cluster B-2
//
// context-flag: claim is OK only when substantiated in same paragraph
// (number, certifying body, named comparison). Pijler 3 evaluator runs
// substantiation-check before flagging.

import type { HeuristicEntry } from '../types';

export const EN_GB_VAGUE_QUALITY: HeuristicEntry[] = [
  { term: 'high quality', citationKey: 'plain_english_a_z', severity: 'context-flag', annotation: 'Substantiate with cert / spec / metric.' },
  { term: 'high-quality', citationKey: 'plain_english_a_z', severity: 'context-flag' },
  { term: 'premium', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag', annotation: 'Substantiate with price / spec.' },
  { term: 'innovative', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag', annotation: 'Substantiate with concrete invention.' },
  { term: 'robust', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag', annotation: 'Substantiate with uptime / SLA / load test.' },
  { term: 'comprehensive', citationKey: 'plain_english_a_z', severity: 'context-flag' },
  { term: 'sustainable', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag', annotation: 'Substantiate with cert / framework.' },
  { term: 'eco-friendly', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag', annotation: 'Substantiate or risk greenwashing.' },
  { term: 'enterprise-grade', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag' },
  { term: 'enterprise grade', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag' },
  { term: 'best practice', citationKey: 'cfo_overhyped', severity: 'context-flag', annotation: 'Cite source or framework.' },
  { term: 'best practices', citationKey: 'cfo_overhyped', severity: 'context-flag' },
  { term: 'top-tier', citationKey: 'cfo_overhyped', severity: 'context-flag' },
  { term: 'top tier', citationKey: 'cfo_overhyped', severity: 'context-flag' },
  { term: 'mission-driven', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag' },
  { term: 'data-driven', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag', annotation: 'OK with metric or methodology cited.' },
  { term: 'human-centric', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag' },
  { term: 'human-centred', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag' },
  { term: 'human-centered', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag' },
  { term: 'customer-centric', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag' },
  { term: 'customer centric', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag' },
];
