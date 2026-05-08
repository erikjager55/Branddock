// en-GB ai-tells — Δ-2 sub-cluster B-2 (EN-only category)
//
// AI-generated content telltales: Wikipedia "Signs of AI writing" lexical
// list + The Decoder Reddit corpus. always-flag voor classic AI-tells like
// "delve" / "tapestry" / "navigate the complexities". Soft-flag voor
// structurele patterns (Not just X but Y) — die laat de evaluator als
// LOW severity zien zonder te blocken.

import type { HeuristicEntry } from '../types';

export const EN_GB_AI_TELLS: HeuristicEntry[] = [
  // Wikipedia "Signs of AI writing" — lexical
  { term: 'delve', citationKey: 'wikipedia_ai_writing', severity: 'always-flag', annotation: 'Top AI-tell — replace with "explore", "look at", "study".' },
  { term: 'delves', citationKey: 'wikipedia_ai_writing', severity: 'always-flag' },
  { term: 'delving', citationKey: 'wikipedia_ai_writing', severity: 'always-flag' },
  { term: 'tapestry', citationKey: 'wikipedia_ai_writing', severity: 'always-flag', annotation: 'Frequent ChatGPT metaphor.' },
  { term: 'rich tapestry', citationKey: 'wikipedia_ai_writing', severity: 'always-flag' },
  { term: 'navigate the complexities', citationKey: 'wikipedia_ai_writing', severity: 'always-flag' },
  { term: 'navigating the complexities', citationKey: 'wikipedia_ai_writing', severity: 'always-flag' },
  { term: 'intricate', citationKey: 'wikipedia_ai_writing', severity: 'always-flag', annotation: 'AI prefers over "complex".' },
  { term: 'intricacies', citationKey: 'wikipedia_ai_writing', severity: 'always-flag' },
  { term: 'foster', citationKey: 'wikipedia_ai_writing', severity: 'always-flag', annotation: 'AI overuses; prefer specific verb.' },
  { term: 'fostering', citationKey: 'wikipedia_ai_writing', severity: 'always-flag' },
  { term: 'underscore', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'underscores', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'underscoring', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'plethora', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'myriad', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'realm', citationKey: 'the_decoder_ai_words', severity: 'always-flag', annotation: 'AI prefers over "field" / "area".' },
  { term: 'realms', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'in the realm of', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'embark on a journey', citationKey: 'wikipedia_ai_writing', severity: 'always-flag' },
  { term: 'embark upon', citationKey: 'wikipedia_ai_writing', severity: 'always-flag' },
  { term: 'in conclusion', citationKey: 'wikipedia_ai_writing', severity: 'context-flag', annotation: 'OK in academic; AI-tell in marketing copy.' },
  { term: 'in summary', citationKey: 'wikipedia_ai_writing', severity: 'context-flag' },
  { term: 'pivotal', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'pivotal role', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'crucial', citationKey: 'the_decoder_ai_words', severity: 'context-flag' },
  { term: 'imperative', citationKey: 'the_decoder_ai_words', severity: 'context-flag' },
  { term: 'paramount', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'meticulous', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'meticulously', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'unprecedented', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'multifaceted', citationKey: 'wikipedia_ai_writing', severity: 'always-flag' },
  { term: 'nuanced', citationKey: 'wikipedia_ai_writing', severity: 'context-flag' },
  { term: 'transformative', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'leverage the power', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'harness the power', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'unlock the potential', citationKey: 'the_decoder_ai_words', severity: 'always-flag' },
  { term: 'in today\'s fast-paced world', citationKey: 'wikipedia_ai_writing', severity: 'always-flag' },
  { term: 'in today\'s digital age', citationKey: 'wikipedia_ai_writing', severity: 'always-flag' },
  { term: 'in today\'s rapidly evolving', citationKey: 'wikipedia_ai_writing', severity: 'always-flag' },

  // Structural patterns — soft-flag (LOW severity)
  { term: 'not just', citationKey: 'wikipedia_ai_writing', severity: 'soft-flag', annotation: '"Not just X but Y" — common AI rhythm.' },
  { term: 'whether you\'re', citationKey: 'wikipedia_ai_writing', severity: 'soft-flag', annotation: 'AI hedge for inclusive opener.' },
];
