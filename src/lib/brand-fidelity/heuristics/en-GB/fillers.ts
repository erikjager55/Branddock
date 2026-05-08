// en-GB fillers — Δ-2 sub-cluster B-2
//
// soft-flag (LOW severity, single-pass review-suggestion). Strunk & White
// "Omit needless words" tradition + modern editor consensus.

import type { HeuristicEntry } from '../types';

export const EN_GB_FILLERS: HeuristicEntry[] = [
  { term: 'very', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'really', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'rather', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'quite', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'pretty', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'just', citationKey: 'strunk_white_omit', severity: 'soft-flag', annotation: 'Often hedge; verify intent.' },
  { term: 'basically', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'literally', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'simply', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'absolutely', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'totally', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'somewhat', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'kind of', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'sort of', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'in fact', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'as a matter of fact', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'needless to say', citationKey: 'strunk_white_omit', severity: 'soft-flag' },
  { term: 'it is important to note', citationKey: 'plain_english_a_z', severity: 'soft-flag' },
  { term: 'it should be noted', citationKey: 'plain_english_a_z', severity: 'soft-flag' },
];
