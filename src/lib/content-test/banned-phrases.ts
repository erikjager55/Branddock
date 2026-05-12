// =============================================================
// Banned phrases — corporate jargon + AI-tells per taal.
// Layer 1 generic property-eval check #4 (banned-phrase).
//
// Severity: warn (geen block). Pilot-feedback tunet false-positives weg.
// Uitbreidingen: NL/EN-only pre-launch; DE wanneer Goed-Bouw vraag triggert.
// =============================================================

/**
 * Corporate-jargon woorden die marketingese verraden + AI-tells die generic
 * LLM-output kenmerken. Lijst is bewust conservatief — alleen woorden die in
 * de meeste contexten écht "off" zijn. Brand-specifieke uitbreidingen lopen
 * via Brand Voiceguide.wordsWeAvoid (apart mechanisme).
 */
export interface BannedPhraseEntry {
  /** Het exacte (lowercase) woord/fraze. Regex-match is word-boundary. */
  phrase: string;
  /** Korte uitleg voor UI-tooltip + finding-rationale. */
  reason: string;
  /** Category voor filtering / grouping in UI. */
  category: 'corporate-jargon' | 'ai-tell' | 'marketingese' | 'hyperbole';
}

export const BANNED_PHRASES_NL: BannedPhraseEntry[] = [
  // Corporate jargon
  { phrase: 'synergie', reason: 'corporate buzzword; vervang door concreet effect', category: 'corporate-jargon' },
  { phrase: 'leverage', reason: 'Engelse leenwoord; zeg "gebruik" of "benut"', category: 'corporate-jargon' },
  { phrase: 'best-of-breed', reason: 'B2B-cliché; benoem concreet welke', category: 'corporate-jargon' },
  { phrase: 'win-win', reason: 'leeg gunst-woord; expliciteer voor wie wat', category: 'corporate-jargon' },
  { phrase: 'next-level', reason: 'vaag; zeg waarom het beter is', category: 'corporate-jargon' },
  { phrase: 'end-to-end', reason: 'corporate-fluff; benoem stappen', category: 'corporate-jargon' },
  { phrase: 'state-of-the-art', reason: 'lege superlatief; specificeer technologie', category: 'corporate-jargon' },
  { phrase: 'value proposition', reason: 'B2B-jargon; herschrijf in klant-taal', category: 'corporate-jargon' },

  // AI-tells (typische LLM-output-patronen die "automatisch geschreven" voelen)
  { phrase: 'kortom', reason: 'AI-tell — zelden door menselijke schrijvers gebruikt', category: 'ai-tell' },
  { phrase: 'tot slot', reason: 'AI-tell — overgebruikt in LLM-conclusies', category: 'ai-tell' },
  { phrase: 'concluderend', reason: 'AI-tell — formeel + vermijden voor warm copy', category: 'ai-tell' },
  { phrase: 'samenvattend', reason: 'AI-tell — vermijden, eindig met inhoudelijke punt', category: 'ai-tell' },
  { phrase: 'het is belangrijk om', reason: 'AI-tell — overgebruikt opening, herschrijf', category: 'ai-tell' },
  { phrase: 'in de wereld van', reason: 'AI-tell — generieke contextzin', category: 'ai-tell' },
  { phrase: 'door dit te doen', reason: 'AI-tell — overgangsfraze, te formeel', category: 'ai-tell' },

  // Marketingese
  { phrase: 'revolutionair', reason: 'overdrijving zonder substantie', category: 'marketingese' },
  { phrase: 'innovatief', reason: 'leeg woord — beschrijf de innovatie', category: 'marketingese' },
  { phrase: 'baanbrekend', reason: 'overdrijving; meet de impact', category: 'marketingese' },
  { phrase: 'cutting-edge', reason: 'Engelse cliché; gebruik feitelijke beschrijving', category: 'marketingese' },
  { phrase: 'world-class', reason: 'lege superlatief', category: 'marketingese' },
  { phrase: 'one-stop-shop', reason: 'salesy cliché', category: 'marketingese' },
  { phrase: 'naadloos', reason: 'overgebruikt; concretiseer wat naadloos is', category: 'marketingese' },
  { phrase: 'first-class', reason: 'Engelse marketingese', category: 'marketingese' },

  // Hyperbole
  { phrase: 'ongeëvenaard', reason: 'absolute claim — vereist substantiatie', category: 'hyperbole' },
  { phrase: 'allerbeste', reason: 'superlatief; benoem ranking-criterium', category: 'hyperbole' },
  { phrase: 'ultieme', reason: 'absoluut; meten of weghalen', category: 'hyperbole' },
  { phrase: 'gegarandeerd succes', reason: 'belofte zonder onderbouwing', category: 'hyperbole' },
];

export const BANNED_PHRASES_EN: BannedPhraseEntry[] = [
  // Corporate jargon
  { phrase: 'synergy', reason: 'corporate buzzword; replace with concrete effect', category: 'corporate-jargon' },
  { phrase: 'leverage', reason: 'corporate jargon; use "use" instead', category: 'corporate-jargon' },
  { phrase: 'best-of-breed', reason: 'B2B cliché; name specifically which', category: 'corporate-jargon' },
  { phrase: 'win-win', reason: 'empty courtesy phrase; specify for whom', category: 'corporate-jargon' },
  { phrase: 'next-level', reason: 'vague; explain why it is better', category: 'corporate-jargon' },
  { phrase: 'end-to-end', reason: 'corporate fluff; list the steps', category: 'corporate-jargon' },
  { phrase: 'state-of-the-art', reason: 'empty superlative; specify the tech', category: 'corporate-jargon' },
  { phrase: 'value proposition', reason: 'B2B jargon; rewrite in customer language', category: 'corporate-jargon' },
  { phrase: 'low-hanging fruit', reason: 'overused cliché', category: 'corporate-jargon' },
  { phrase: 'circle back', reason: 'corporate filler', category: 'corporate-jargon' },

  // AI-tells
  { phrase: 'in conclusion', reason: 'AI-tell — overused; end with substance', category: 'ai-tell' },
  { phrase: 'let me explain', reason: 'AI-tell — typical LLM opener', category: 'ai-tell' },
  { phrase: 'it is important to note', reason: 'AI-tell — overused opener', category: 'ai-tell' },
  { phrase: 'in the world of', reason: 'AI-tell — generic context-setter', category: 'ai-tell' },
  { phrase: "let's dive in", reason: 'AI-tell — overused transition', category: 'ai-tell' },
  { phrase: 'in summary', reason: 'AI-tell — end with substance instead', category: 'ai-tell' },
  { phrase: 'first and foremost', reason: 'AI-tell — typical LLM enumeration', category: 'ai-tell' },
  { phrase: 'navigating the', reason: 'AI-tell — overused metaphor', category: 'ai-tell' },

  // Marketingese
  { phrase: 'revolutionary', reason: 'hype without substance', category: 'marketingese' },
  { phrase: 'innovative', reason: 'empty word — describe the innovation', category: 'marketingese' },
  { phrase: 'cutting-edge', reason: 'cliché; use factual description', category: 'marketingese' },
  { phrase: 'world-class', reason: 'empty superlative', category: 'marketingese' },
  { phrase: 'one-stop-shop', reason: 'salesy cliché', category: 'marketingese' },
  { phrase: 'seamless', reason: 'overused; specify what is seamless', category: 'marketingese' },
  { phrase: 'first-class', reason: 'marketingese superlative', category: 'marketingese' },
  { phrase: 'game-changer', reason: 'overused hype', category: 'marketingese' },

  // Hyperbole
  { phrase: 'unparalleled', reason: 'absolute claim — requires substantiation', category: 'hyperbole' },
  { phrase: 'the best', reason: 'superlative; provide ranking criterion', category: 'hyperbole' },
  { phrase: 'ultimate', reason: 'absolute; measure or remove', category: 'hyperbole' },
  { phrase: 'guaranteed success', reason: 'promise without backing', category: 'hyperbole' },
];

/**
 * Lookup per ISO 639-1 language code. Onbekende languages krijgen lege lijst
 * (no-op check). Uitbreiding via deze map post-pilot.
 */
export const BANNED_PHRASES_BY_LANGUAGE: Record<string, BannedPhraseEntry[]> = {
  nl: BANNED_PHRASES_NL,
  en: BANNED_PHRASES_EN,
};

/**
 * Helper: snelle case-insensitive substring-match met word-boundary.
 * Returns first match position + matched phrase, or null.
 */
export function findBannedPhrase(
  content: string,
  language: string,
): { phrase: BannedPhraseEntry; position: number } | null {
  const phrases = BANNED_PHRASES_BY_LANGUAGE[language] ?? [];
  if (phrases.length === 0) return null;
  const lower = content.toLowerCase();
  for (const entry of phrases) {
    // Word-boundary regex om "innovatief" niet te matchen in "preinnovatief"
    // (theoretisch onwaarschijnlijk maar safety).
    const escaped = entry.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
    const match = pattern.exec(lower);
    if (match) {
      return { phrase: entry, position: match.index };
    }
  }
  return null;
}
