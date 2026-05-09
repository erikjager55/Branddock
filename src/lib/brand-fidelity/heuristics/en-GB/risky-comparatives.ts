// en-GB risky-comparatives — Δ-2 sub-cluster B-2
//
// always-flag bare comparative form. The shared/risky-comparatives-detector
// (planned) does the 2-step: detect → check sentence/paragraph for comparand
// (vs X / than Y) or numeric anchor. This list seeds the detect-step.

import type { HeuristicEntry } from '../types';

export const EN_GB_RISKY_COMPARATIVES: HeuristicEntry[] = [
  { term: 'better', citationKey: 'plain_english_a_z', severity: 'always-flag', annotation: 'Better than what? Add comparand.' },
  { term: 'faster', citationKey: 'plain_english_a_z', severity: 'always-flag', annotation: 'Faster than what? Add anchor.' },
  { term: 'smarter', citationKey: 'plain_english_a_z', severity: 'always-flag' },
  { term: 'cheaper', citationKey: 'plain_english_a_z', severity: 'always-flag' },
  { term: 'easier', citationKey: 'plain_english_a_z', severity: 'always-flag' },
  { term: 'simpler', citationKey: 'plain_english_a_z', severity: 'always-flag' },
  { term: 'stronger', citationKey: 'plain_english_a_z', severity: 'always-flag' },
  { term: 'safer', citationKey: 'plain_english_a_z', severity: 'always-flag', annotation: 'Especially in regulated copy: substantiate.' },
  { term: 'more efficient', citationKey: 'plain_english_a_z', severity: 'always-flag' },
  { term: 'more effective', citationKey: 'plain_english_a_z', severity: 'always-flag' },
  { term: 'more reliable', citationKey: 'plain_english_a_z', severity: 'always-flag' },
  { term: 'more powerful', citationKey: 'plain_english_a_z', severity: 'always-flag' },
  { term: 'higher quality', citationKey: 'plain_english_a_z', severity: 'always-flag' },
  { term: 'lower cost', citationKey: 'plain_english_a_z', severity: 'always-flag', annotation: 'Lower than what? Add comparand.' },
];
