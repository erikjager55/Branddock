// en-GB corporate-fluff — Δ-2 sub-cluster B-2 seed
//
// Plain English Campaign A-Z + Inbound 2025 buzzwords + CFO overhyped corpus.
// always-flag voor verbose-replacements (utilize/leverage) en empty-corporate
// (synergy, ecosystem); context-flag voor termen die in tech-context wel werken
// (scalable, agile, bandwidth).

import type { HeuristicEntry } from '../types';

export const EN_GB_CORPORATE_FLUFF: HeuristicEntry[] = [
  // Verbose replacements (Plain English Campaign)
  { term: 'utilize', citationKey: 'plain_english_a_z', severity: 'always-flag', annotation: 'Use "use".' },
  { term: 'utilise', citationKey: 'plain_english_a_z', severity: 'always-flag', annotation: 'Use "use".' },
  { term: 'leverage', citationKey: 'plain_english_a_z', severity: 'always-flag', annotation: 'Use "use" or specific verb.' },
  { term: 'commence', citationKey: 'plain_english_a_z', severity: 'always-flag', annotation: 'Use "start".' },
  { term: 'endeavour', citationKey: 'plain_english_a_z', severity: 'always-flag', annotation: 'Use "try".' },
  { term: 'facilitate', citationKey: 'plain_english_a_z', severity: 'always-flag', annotation: 'Use "help" or be specific.' },
  { term: 'in order to', citationKey: 'plain_english_a_z', severity: 'always-flag', annotation: 'Use "to".' },
  { term: 'with regard to', citationKey: 'plain_english_a_z', severity: 'always-flag', annotation: 'Use "about".' },
  { term: 'in the event that', citationKey: 'plain_english_a_z', severity: 'always-flag', annotation: 'Use "if".' },

  // Classic corporate-empties
  { term: 'synergy', citationKey: 'cfo_overhyped', severity: 'always-flag' },
  { term: 'synergies', citationKey: 'cfo_overhyped', severity: 'always-flag' },
  { term: 'stakeholder', citationKey: 'prsa_jargon', severity: 'always-flag', annotation: 'Use "people involved" or specific role.' },
  { term: 'paradigm shift', citationKey: 'cfo_overhyped', severity: 'always-flag' },
  { term: 'circle back', citationKey: 'prsa_jargon', severity: 'always-flag' },
  { term: 'touch base', citationKey: 'prsa_jargon', severity: 'always-flag' },
  { term: 'move the needle', citationKey: 'prsa_jargon', severity: 'always-flag' },
  { term: 'low-hanging fruit', citationKey: 'cfo_overhyped', severity: 'always-flag' },
  { term: 'value-add', citationKey: 'cfo_overhyped', severity: 'always-flag' },
  { term: 'value add', citationKey: 'cfo_overhyped', severity: 'always-flag' },
  { term: 'mission-critical', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
  { term: 'thought leader', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag', annotation: 'OK with substantiation.' },
  { term: 'best-in-class', citationKey: 'cfo_overhyped', severity: 'always-flag', annotation: 'Show evidence; do not claim.' },

  // Context-flag — OK in technical or specific contexts
  { term: 'ecosystem', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag', annotation: 'OK in platform/biology context.' },
  { term: 'scalable', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag', annotation: 'OK with concrete metrics.' },
  { term: 'agile', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag', annotation: 'OK as methodology reference.' },
  { term: 'bandwidth', citationKey: 'prsa_jargon', severity: 'context-flag', annotation: 'OK in technical capacity context.' },
  { term: 'optimize', citationKey: 'cfo_overhyped', severity: 'context-flag' },
  { term: 'optimise', citationKey: 'cfo_overhyped', severity: 'context-flag' },
];
