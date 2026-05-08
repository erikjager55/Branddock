// nl-NL corporate-fluff — Δ-2 sub-cluster B seed
//
// Bronnen verzameld via online-research 2026-05-08:
// Onze Taal modern-taalgebruik, Schrijfvis kantoortaal, Werf& jeukwoorden,
// Frankwatching cliché-corpus, Clichéschatkamer.
//
// always-flag voor managementjargon dat zelden waarde toevoegt; context-flag
// voor termen die in technische context (agile als methodologie, ecosysteem
// in platform-context) wel acceptabel zijn.

import type { HeuristicEntry } from '../types';

export const NL_NL_CORPORATE_FLUFF: HeuristicEntry[] = [
  // Klassieke corporate-fluff
  { term: 'partner', citationKey: 'cliche_schatkamer', severity: 'context-flag', annotation: 'Generiek; vermijd tenzij specifieke partnership context' },
  { term: 'synergie', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'leverage', citationKey: 'onze_taal', severity: 'always-flag', annotation: 'Anglicisme zonder NL-vertaling' },
  { term: 'ontzorgen', citationKey: 'schrijfvis_jeukwoorden', severity: 'always-flag' },
  { term: 'faciliteren', citationKey: 'cliche_schatkamer', severity: 'always-flag' },
  { term: 'optimaliseren', citationKey: 'cliche_schatkamer', severity: 'context-flag', annotation: 'OK met concreet doel' },
  { term: 'stakeholder', citationKey: 'cliche_schatkamer', severity: 'always-flag', annotation: 'Anglicisme, alt: betrokkenen' },
  { term: 'holistisch', citationKey: 'cliche_schatkamer', severity: 'always-flag' },
  { term: 'integraal', citationKey: 'cliche_schatkamer', severity: 'context-flag' },
  { term: 'transparant', citationKey: 'onze_taal', severity: 'context-flag', annotation: 'Vague als zelfbeschrijving' },
  { term: 'kernwaarden', citationKey: 'onze_taal', severity: 'context-flag' },
  { term: 'expertise', citationKey: 'cliche_schatkamer', severity: 'context-flag' },
  { term: 'transformatie', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'journey', citationKey: 'frankwatching_cliches', severity: 'always-flag' },
  { term: 'klantreis', citationKey: 'frankwatching_cliches', severity: 'context-flag' },
  { term: 'co-creatie', citationKey: 'onze_taal', severity: 'always-flag' },
  { term: 'borgen', citationKey: 'cliche_schatkamer', severity: 'always-flag', annotation: 'Managementtaal voor "vastleggen"' },
  { term: 'verbinden', citationKey: 'frankwatching_cliches', severity: 'context-flag', annotation: 'Politiek-zakelijk cliché 2020+' },
  { term: 'meedenken', citationKey: 'werf_jeukwoorden', severity: 'always-flag' },
  { term: 'commitment', citationKey: 'onze_taal', severity: 'always-flag', annotation: 'Anglicisme, alt: toezegging, inzet' },
  { term: 'kruisbestuiving', citationKey: 'cliche_schatkamer', severity: 'always-flag' },
  { term: 'breed gedragen', citationKey: 'cliche_schatkamer', severity: 'always-flag' },
  { term: 'draagvlak creëren', citationKey: 'cliche_schatkamer', severity: 'always-flag' },

  // Vacature-/recruitment-jeukwoorden (Werf& + Schrijfvis)
  { term: 'proactief', citationKey: 'werf_jeukwoorden', severity: 'always-flag' },
  { term: 'innovatief', citationKey: 'werf_jeukwoorden', severity: 'always-flag', annotation: 'Eis bewijs (19% van vacatures — Werf& 2023)' },
  { term: 'dynamisch', citationKey: 'werf_jeukwoorden', severity: 'always-flag' },
  { term: 'resultaatgericht', citationKey: 'werf_jeukwoorden', severity: 'always-flag' },
  { term: 'oplossingsgericht', citationKey: 'werf_jeukwoorden', severity: 'always-flag' },
  { term: 'no-nonsense', citationKey: 'werf_jeukwoorden', severity: 'always-flag' },
  { term: 'hands-on mentaliteit', citationKey: 'werf_jeukwoorden', severity: 'always-flag' },
  { term: 'het verschil maken', citationKey: 'frankwatching_cliches', severity: 'always-flag' },
  { term: 'een stapje extra', citationKey: 'frankwatching_cliches', severity: 'always-flag' },
  { term: 'teamplayer', citationKey: 'werf_jeukwoorden', severity: 'always-flag' },

  // Newer (2024-2026) cliché-additions
  { term: 'toekomstbestendig', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag', annotation: 'Jargon voor "toekomstgericht" zonder substantie' },
  { term: 'schaalbaar', citationKey: 'inbound_2025_buzzwords', severity: 'context-flag', annotation: 'OK met cijfers/concrete metric' },
  { term: 'state-of-the-art', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
  { term: 'next-level', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag' },
  { term: 'disruptief', citationKey: 'inbound_2025_buzzwords', severity: 'always-flag', annotation: 'Top-3 verwarrendste term — Werf&' },
  { term: 'agile', citationKey: 'cliche_schatkamer', severity: 'context-flag', annotation: 'OK als methode-aanduiding met context' },
  { term: 'ecosysteem', citationKey: 'cliche_schatkamer', severity: 'context-flag', annotation: 'OK in biologie/platform-context' },
  { term: 'impactvol', citationKey: 'frankwatching_cliches', severity: 'always-flag' },
  { term: 'purpose-driven', citationKey: 'frankwatching_cliches', severity: 'always-flag' },
];
