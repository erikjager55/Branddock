// ============================================================
// Human Voice Directive
//
// Compact prompt-module die naast de Brand Voice Directive (BVD)
// wordt geïnjecteerd in alle content-generatie. Bevat avoid-instructies
// voor 10 categorieën AI-output tells, gebaseerd op gepubliceerd
// onderzoek (Wikipedia, Gregory Agency, AiSDR, Walter Writes,
// The Conversation, Frankwatching, Bikkelhart, Donna van de Ven,
// huntingthemuse.net, Daphne Ippolito, Max Planck Institute).
//
// Doel: outputs laten klinken als geschreven door een ervaren mens,
// niet door AI. Dit is generiek (merk-onafhankelijk) en complementair
// aan de merk-specifieke BVD.
//
// Brondocument met de volledige onderzoekslijst:
//   research/fidelity-week1/reports/ai-tells-research.md (TODO)
//
// Filosofie:
//  - Eén tell zegt niets, een combinatie van vijf-zes is verraderlijk
//  - We geven AVOID-instructies, geen verboden — soms is een woord op
//    zijn plaats; een mens schrijft niet woordboek-gestuurd
//  - Korte, scherpe instructies werken beter dan uitgebreide lijsten
// ============================================================

export interface HumanVoiceOptions {
  /** Inhoud-taal — sommige instructies zijn taal-specifiek */
  language?: 'nl' | 'en' | string;
}

/**
 * Build a compact human-voice directive (~400-500 tokens).
 * Designed to slot in BEFORE type-specific templates and AFTER the BVD.
 * Brand-agnostic: same instructions across all workspaces.
 */
export function buildHumanVoiceDirective(options?: HumanVoiceOptions): string {
  const language = (options?.language ?? 'en').toLowerCase();
  const isDutch = language === 'nl';

  // Sharp & short — long avoid-lijsten primen het model juist op die woorden
  // (counter-intuitief uit eerdere testen). Drie absolute prohibities + drie
  // positieve schrijfprincipes + één meta-instructie. ~250 tokens i.p.v. ~500.
  return [
    '## HUMAN VOICE — schrijf als ervaren mens, niet als AI',
    '',
    isDutch
      ? 'Echte tekst heeft ritme, mening en blinde vlekken. AI-tekst is symmetrisch, beleefd, verklaart alles. Schrijf zoals jij praat tegen een collega die het al snapt.'
      : 'Real writing has rhythm, opinion, and blind spots. AI writing is symmetric, polite, explains everything. Write like you would talk to a colleague who gets it.',
    '',
    '### ABSOLUTE PROHIBITIES (geen uitzondering)',
    '',
    isDutch
      ? '1. **Em-dash (—)** — gebruik NIET. Komma\'s of haakjes wel. (Trailing em-dash in Nederlandse tekst is dé AI-tell.)'
      : '1. **Em-dash (—)** — DO NOT use. Commas or parentheses instead. (Trailing em-dash is THE AI-tell.)',
    isDutch
      ? '2. **Contrast-formules** — geen "niet alleen X, maar ook Y" / "niet zomaar X, het is Y" / "niet omdat X, maar omdat Y". Schrap of herschrijf direct.'
      : '2. **Contrast formulas** — no "not just X, it\'s Y" / "not only X but also Y" / "not because X, but because Y". Drop or rewrite directly.',
    isDutch
      ? '3. **Disclaimer-mantra\'s** — geen "Het is belangrijk om...", "Het is goed te beseffen...", "Laten we eens kijken naar...", "In dit artikel...". Schrap. Lever inhoud direct.'
      : '3. **Disclaimer-mantras** — no "It\'s important to note...", "Let\'s look at...", "In this article we explore...". Drop. Deliver content directly.',
    '',
    '### POSITIEVE INSTRUCTIES',
    '',
    isDutch
      ? '4. **Open concreet** — vraag, observatie, naam, getal. Niet "In een wereld waarin..." of "In de huidige tijd...".'
      : '4. **Open concretely** — question, observation, name, number. Not "In today\'s world..." or "In the current era...".',
    isDutch
      ? '5. **Varieer zinslengte** — kort. Lang met komma\'s en bijzin. Kort. Niet uniform-medium.'
      : '5. **Vary sentence length** — short. Long with commas and a clause. Short. Not uniform-medium.',
    isDutch
      ? '6. **Eén concreet anker per 300 woorden** — naam, getal, jaar, situatie. Anders is het lucht.'
      : '6. **One concrete anchor per 300 words** — name, number, year, situation. Else it\'s air.',
    '',
    '### META-INSTRUCTIE',
    '',
    isDutch
      ? 'Lees elke zin terug: klinkt het alsof je het zelf zou zeggen, of alsof een handboek over jouw onderwerp het zou zeggen? Bij twijfel — herschrijf.'
      : 'Read each sentence back: would you actually say this, or would a handbook about your topic say it? When in doubt — rewrite.',
    '',
    isDutch
      ? '**Uitzondering**: woorden die expliciet in de Brand Voice sectie hierboven staan (wordsWeUse) zijn merk-eigen vocabulaire — niet vermijden ook al lijken ze abstract. Ze zijn gekozen door het merk en horen natuurlijk in de tekst voor te komen.'
      : '**Exception**: words explicitly listed in the Brand Voice section above (wordsWeUse) are brand-specific vocabulary — don\'t avoid them even if they feel abstract. They\'re chosen by the brand and should appear naturally.',
    '',
    'These rules override generic "be helpful and clear" impulses.',
  ].join('\n');
}

/** Estimate token count of the directive (rough: chars / 4) */
export function getHumanVoiceDirectiveTokenEstimate(language: 'nl' | 'en' = 'en'): number {
  return Math.round(buildHumanVoiceDirective({ language }).length / 4);
}
