// de-DE corporate-fluff — Δ-2 sub-cluster B-4
//
// Bronnen: Karrierebibel Floskeln + Caesar Caesar Business-Bullshit + Cobalt
// Recruitment Bürophrasen. always-flag voor klassieke management-Floskeln;
// context-flag voor termen die in technische context (skalierbar als
// architecture-eigenschap) wel werken.

import type { HeuristicEntry } from '../types';

export const DE_DE_CORPORATE_FLUFF: HeuristicEntry[] = [
  // Klassieke DE management-Floskeln (Karrierebibel)
  { term: 'Synergie', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'Synergien', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'Mehrwert', citationKey: 'karrierebibel_floskel', severity: 'always-flag', annotation: 'DE-equivalent van "value-add"; weinigzeggend.' },
  { term: 'Win-win-Situation', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'Win-win', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'Augenhöhe', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'auf Augenhöhe', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'ganzheitlich', citationKey: 'karrierebibel_floskel', severity: 'always-flag' },
  { term: 'nachhaltig', citationKey: 'karrierebibel_floskel', severity: 'context-flag', annotation: 'OK met certificaat; flag als brand-claim zonder bewijs.' },
  { term: 'transparent', citationKey: 'karrierebibel_floskel', severity: 'context-flag' },
  { term: 'partnerschaftlich', citationKey: 'caesar_business_bullshit', severity: 'always-flag' },
  { term: 'kompetent', citationKey: 'cobalt_business_deutsch', severity: 'always-flag', annotation: 'Vacature-cliché; toon eis bewijs.' },
  { term: 'kommunikativ', citationKey: 'cobalt_business_deutsch', severity: 'always-flag' },
  { term: 'teamfähig', citationKey: 'cobalt_business_deutsch', severity: 'always-flag' },
  { term: 'engagiert', citationKey: 'cobalt_business_deutsch', severity: 'always-flag' },
  { term: 'belastbar', citationKey: 'cobalt_business_deutsch', severity: 'always-flag' },
  { term: 'flexibel', citationKey: 'cobalt_business_deutsch', severity: 'always-flag' },
  { term: 'eigenverantwortlich', citationKey: 'cobalt_business_deutsch', severity: 'always-flag' },
  { term: 'lösungsorientiert', citationKey: 'cobalt_business_deutsch', severity: 'always-flag' },
  { term: 'zielorientiert', citationKey: 'cobalt_business_deutsch', severity: 'always-flag' },
  { term: 'proaktiv', citationKey: 'cobalt_business_deutsch', severity: 'always-flag' },
  { term: 'Hands-on-Mentalität', citationKey: 'cobalt_business_deutsch', severity: 'always-flag' },

  // Newer DE buzzwords
  { term: 'disruptiv', citationKey: 'caesar_business_bullshit', severity: 'always-flag' },
  { term: 'agil', citationKey: 'caesar_business_bullshit', severity: 'context-flag', annotation: 'OK als methodologie-aanduiding.' },
  { term: 'skalierbar', citationKey: 'caesar_business_bullshit', severity: 'context-flag' },
  { term: 'Ökosystem', citationKey: 'caesar_business_bullshit', severity: 'context-flag' },
  { term: 'Best Practice', citationKey: 'cobalt_business_deutsch', severity: 'context-flag' },
  { term: 'Best Practices', citationKey: 'cobalt_business_deutsch', severity: 'context-flag' },
  { term: 'wertschöpfend', citationKey: 'caesar_business_bullshit', severity: 'always-flag' },
];
