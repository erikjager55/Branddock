// de-DE Denglisch — Δ-2 sub-cluster B-4 (DE-only category, mapped naar
// 'corporate-fluff' bij export — Denglisch-overuse is een specifieke vorm
// van corporate-fluff in Duitse business-context).
//
// always-flag voor klassieke corporate-Anglicisms wanneer DE-equivalent
// bestaat. Bron: Wikipedia Denglisch + Cobalt Recruitment + Caesar Caesar
// observaties op overused Anglicisms in DE business writing.

import type { HeuristicEntry } from '../types';

export const DE_DE_DENGLISCH: HeuristicEntry[] = [
  { term: 'committed', citationKey: 'wikipedia_denglisch', severity: 'always-flag', annotation: 'Use "engagiert" / "verpflichtet".' },
  { term: 'leveragen', citationKey: 'wikipedia_denglisch', severity: 'always-flag', annotation: 'Use "nutzen" / "einsetzen".' },
  { term: 'alignen', citationKey: 'wikipedia_denglisch', severity: 'always-flag', annotation: 'Use "abstimmen" / "ausrichten".' },
  { term: 'briefen', citationKey: 'wikipedia_denglisch', severity: 'always-flag', annotation: 'Use "informieren".' },
  { term: 'deployen', citationKey: 'wikipedia_denglisch', severity: 'context-flag', annotation: 'OK in DevOps; flag in andere context.' },
  { term: 'pushen', citationKey: 'wikipedia_denglisch', severity: 'always-flag' },
  { term: 'pitchen', citationKey: 'wikipedia_denglisch', severity: 'context-flag' },
  { term: 'callen', citationKey: 'wikipedia_denglisch', severity: 'always-flag', annotation: 'Use "anrufen".' },
  { term: 'updaten', citationKey: 'wikipedia_denglisch', severity: 'context-flag' },
  { term: 'Manpower', citationKey: 'wikipedia_denglisch', severity: 'always-flag', annotation: 'Use "Personal" / "Arbeitskräfte".' },
  { term: 'Kickoff', citationKey: 'wikipedia_denglisch', severity: 'always-flag', annotation: 'Use "Auftakt".' },
  { term: 'Kick-off', citationKey: 'wikipedia_denglisch', severity: 'always-flag' },
  { term: 'Mindset', citationKey: 'wikipedia_denglisch', severity: 'always-flag', annotation: 'Use "Denkweise" / "Einstellung".' },
  { term: 'Skill', citationKey: 'wikipedia_denglisch', severity: 'always-flag', annotation: 'Use "Fähigkeit".' },
  { term: 'Skills', citationKey: 'wikipedia_denglisch', severity: 'always-flag' },
  { term: 'Workflow', citationKey: 'wikipedia_denglisch', severity: 'context-flag', annotation: 'OK in tech-context.' },
  { term: 'Stakeholder', citationKey: 'wikipedia_denglisch', severity: 'always-flag', annotation: 'Use "Beteiligte" / "Interessengruppen".' },
  { term: 'Insights', citationKey: 'wikipedia_denglisch', severity: 'always-flag', annotation: 'Use "Erkenntnisse".' },
  { term: 'Touchpoint', citationKey: 'wikipedia_denglisch', severity: 'always-flag', annotation: 'Use "Berührungspunkt".' },
  { term: 'Touchpoints', citationKey: 'wikipedia_denglisch', severity: 'always-flag' },
  { term: 'Customer Journey', citationKey: 'wikipedia_denglisch', severity: 'context-flag', annotation: 'OK in marketing-vakjargon; flag in algemene copy.' },
  { term: 'commiten', citationKey: 'wikipedia_denglisch', severity: 'always-flag' },
  { term: 'committen', citationKey: 'wikipedia_denglisch', severity: 'always-flag' },
];
