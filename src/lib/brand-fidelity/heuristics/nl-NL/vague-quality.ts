// nl-NL vague-quality — Δ-2 sub-cluster B seed
//
// Vage kwaliteitsclaims. context-flag — OK wanneer concrete substantiatie
// (cijfer / specifiek-substantief / klantnaam) in zelfde paragraaf. Pijler 3
// evaluator doet substantiation-check vóór flagging.

import type { HeuristicEntry } from '../types';

export const NL_NL_VAGUE_QUALITY: HeuristicEntry[] = [
  { term: 'duurzaam', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag', contextFlag: 'requires-substantiation' },
  { term: 'maatwerk', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-substantiation' },
  { term: 'op maat', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-substantiation' },
  { term: 'persoonlijk', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-substantiation' },
  { term: 'persoonlijke aandacht', citationKey: 'frankwatching_cliches', severity: 'context-flag' },
  { term: 'korte lijnen', citationKey: 'frankwatching_cliches', severity: 'always-flag' },
  { term: 'mensgericht', citationKey: 'frankwatching_cliches', severity: 'always-flag' },
  { term: 'oprecht', citationKey: 'frankwatching_cliches', severity: 'always-flag', annotation: 'Zelfbeschrijving als kwaliteit' },
  { term: 'authentiek', citationKey: 'frankwatching_cliches', severity: 'always-flag' },
  { term: 'eerlijk', citationKey: 'frankwatching_cliches', severity: 'context-flag' },
  { term: 'deskundig', citationKey: 'cliche_schatkamer', severity: 'context-flag' },
  { term: 'vakkundig', citationKey: 'cliche_schatkamer', severity: 'context-flag' },
  { term: 'jarenlange ervaring', citationKey: 'frankwatching_cliches', severity: 'context-flag', contextFlag: 'requires-substantiation', annotation: 'Substantiatie: aantal jaren + specifiek vakgebied' },
  { term: 'brede ervaring', citationKey: 'frankwatching_cliches', severity: 'always-flag' },
  { term: 'scherpe prijs', citationKey: 'cliche_schatkamer', severity: 'always-flag' },
  { term: 'eerlijke prijs', citationKey: 'cliche_schatkamer', severity: 'always-flag' },
  { term: 'marktconform', citationKey: 'zigzag_hr_be', severity: 'always-flag', annotation: 'BE-flag, ook in NL relevant' },
  { term: 'snelle service', citationKey: 'frankwatching_cliches', severity: 'context-flag', contextFlag: 'requires-substantiation' },
  { term: 'flexibel', citationKey: 'frankwatching_cliches', severity: 'context-flag' },
  { term: 'wendbaar', citationKey: 'cliche_schatkamer', severity: 'always-flag' },
  { term: 'slagvaardig', citationKey: 'cliche_schatkamer', severity: 'always-flag' },
  { term: 'gepassioneerd', citationKey: 'frankwatching_cliches', severity: 'always-flag' },
  { term: 'passie', citationKey: 'frankwatching_cliches', severity: 'always-flag', annotation: 'Stam-variant van gepassioneerd; nietszeggend buzzword zonder substantiatie' },
  { term: 'gedreven', citationKey: 'frankwatching_cliches', severity: 'always-flag' },
  { term: 'gecommitteerd', citationKey: 'frankwatching_cliches', severity: 'always-flag' },
  { term: 'klantgericht', citationKey: 'frankwatching_cliches', severity: 'always-flag' },
  { term: 'kwaliteit', citationKey: 'cliche_schatkamer', severity: 'context-flag', contextFlag: 'requires-substantiation', annotation: 'Vage claim zonder substantiatie (cijfer/concrete spec/garantie); concretiseer via materiaal/proces' },
];
