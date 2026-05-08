// nl-NL risky-comparatives — Δ-2 sub-cluster B seed
//
// Comparatieven die om bewijs of comparand vragen ("sneller dan wat?",
// "betrouwbaarder dan wie?"). Pijler 3 evaluator past 2-step rule toe:
// detect comparative form → check zin/paragraaf voor "dan X" of numeriek
// anker; flag indien afwezig.

import type { HeuristicEntry } from '../types';

export const NL_NL_RISKY_COMPARATIVES: HeuristicEntry[] = [
  { term: 'sneller', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-comparand' },
  { term: 'beter', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-comparand' },
  { term: 'slimmer', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-comparand' },
  { term: 'efficiënter', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-comparand' },
  { term: 'voordeliger', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-comparand' },
  { term: 'krachtiger', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-comparand' },
  { term: 'robuuster', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-comparand' },
  { term: 'completer', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-comparand' },
  { term: 'persoonlijker', citationKey: 'frankwatching_cliches', severity: 'context-flag', contextFlag: 'requires-comparand' },
  { term: 'duurzamer', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag', contextFlag: 'requires-comparand' },
  { term: 'gebruiksvriendelijker', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-comparand' },
  { term: 'transparanter', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-comparand' },
  { term: 'betrouwbaarder', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-comparand' },
];
