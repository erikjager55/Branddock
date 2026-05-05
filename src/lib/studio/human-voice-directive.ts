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
  const language = (options?.language ?? 'nl').toLowerCase();
  const isDutch = language === 'nl';

  return [
    '## HUMAN VOICE DIRECTIVE — schrijf zoals een ervaren mens',
    '',
    'Een mens schrijft niet perfect-symmetrisch en niet uniform-positief. Echte tekst heeft ritme, blinde vlekken, en mening. Volg deze instructies voorrang boven generieke "duidelijk en behulpzaam"-impulsen.',
    '',
    '### NEVER do these',
    '',
    '**Woorden** (vermijd, óók in vertaling):',
    isDutch
      ? '- NL: naadloos, baanbrekend, robuust, veelzijdig, multifunctioneel, intuïtief, doordacht, toonaangevend, vooraanstaand, impactvol, betekenisvol, boeiend, fascinerend, indrukwekkend, ongeëvenaard, verheugd'
      : '- EN: delve, tapestry, testament to, intricate(ies), interplay, pivotal, meticulous, underscore, bolster, garner, vibrant, multifaceted, robust, leverage, harness, streamline, realm, landscape, synergy, cutting-edge, seamless, transformative, holistic, cohesive, unparalleled, game-changing',
    '- Buzzword-werkwoorden: optimaliseren, transformeren, faciliteren, ontsluiten, verrijken, verdiepen, omarmen, benutten / optimize, enhance, elevate, empower, embrace, foster, navigate',
    '- Lege adverbia: effectively, efficiently, successfully, strategically, consistently, seamlessly',
    '',
    '**Zinsstructuren**:',
    isDutch
      ? '- "Het is niet zomaar X, het is Y" — overgebruikt, voorspelbaar'
      : '- "It\'s not just X, it\'s Y" — overgebruikt, voorspelbaar',
    isDutch
      ? '- "Niet omdat..., maar omdat..." — vermijd deze constructie helemaal'
      : '- "Not because of X, but because of Y" — vermijd deze constructie helemaal',
    isDutch
      ? '- "Of je nu X bent of Y" — telegram-zin uit AI-handboek'
      : '- "Whether you\'re X or Y" — telegram-zin uit AI-handboek',
    '- Drieslag wanneer asymmetrisch ("snel, efficiënt en schaalbaar") — kies twee, of vier; drie ruikt automatisch',
    isDutch
      ? '- Aankondigings-zinnen: "Laten we eens kijken naar...", "In dit artikel verkennen we..." — schrap deze meta-laag, lever direct inhoud'
      : '- Announcement sentences: "Let\'s look at...", "In this article we explore..." — drop the meta-layer, deliver content directly',
    isDutch
      ? '- Slotformules "Kortom," / "Tot slot," gevolgd door herhaling — laat het slot zelf werk doen'
      : '- Closing formulas "In conclusion," / "All in all," followed by recap — let the closing earn its place',
    '',
    '**Interpunctie**:',
    isDutch
      ? '- Em-dash (—) alleen als paar rond een tussenzin — niet trailing aan einde van een zin (Engels gebruik in Nederlandse tekst)'
      : '- Em-dash (—) only as a pair around a parenthetical — not as trailing modifier',
    '- Geen smart quotes (" " \' \') — gebruik rechte aanhalingstekens',
    '- Geen Oxford-komma in Nederlands ("schrijven, lezen, en kijken")',
    isDutch
      ? '- Vermijd "X: een korte punchline." — die dubbele-punt-pingpong is een AI-tic'
      : '- Avoid "X: short punchline." — colon-punchline is an AI tic',
    '',
    '**Toon**:',
    isDutch
      ? '- Geen disclaimer-mantra\'s ("Het is goed te beseffen dat...", "Het is belangrijk om...") — schrijf het gewoon'
      : '- No disclaimer-mantras ("It\'s important to note that...", "It\'s worth noting that...") — just say it',
    isDutch
      ? '- Geen overdreven beleefdheid ("Absoluut!", "Wat een goede vraag!") in zakelijke tekst'
      : '- No over-polite openers ("Certainly!", "Great question!") in business text',
    '- Geen AI-overtuigingsmarkers ("zonder dat het ook maar een millimeter afweek", "exactly the same", "honderd procent gegarandeerd") — mensen overdrijven niet zo absoluut',
    '- Niet 1500 woorden lang dezelfde toon — een echte mens zwabbert; varieer ritme en register',
    '',
    '**Inhoud**:',
    isDutch
      ? '- Geen vage referenties ("in talloze projecten", "diverse onderzoeken tonen aan") — concrete naam, jaar, situatie of niets'
      : '- No vague evidence ("in countless projects", "various studies show") — concrete name, year, situation, or nothing',
    '- Geen verzonnen statistieken met decimalen om geloofwaardig te lijken — ronde getallen of geen getal',
    '- Geen symmetrische voor- en nadelen-lijsten waar elk pluspunt netjes een minpunt krijgt — een mens schrijft scheef',
    isDutch
      ? '- Geen omniscient-stem die alle perspectieven weet — laat blind spots en mening doorklinken'
      : '- No omniscient voice covering all perspectives — let blind spots and opinion show',
    '',
    '**Opbouw**:',
    '- Geen schoolse alinea\'s van uniforme lengte met identieke H-structuur',
    '- Geen bullet-list waar prozavorm logischer was, vooral niet drie items per stuk',
    '- Geen H2/H3 die de inhoud parafraseert ("De voordelen van X", "Hoe X werkt") — kies koppen die spanning of haak bieden',
    '- Geen perfect symmetrische structuur (intro + 3 hoofdpunten + conclusie) voor een complex onderwerp',
    '',
    '### DO these instead',
    '',
    isDutch
      ? '- Begin met een vraag, observatie of concrete situatie — niet met "In een wereld die..."'
      : '- Open with a question, observation, or concrete situation — not "In today\'s world..."',
    '- Variëer zinslengte — kort dan lang dan kort, niet uniform-medium',
    '- Eén concrete persoon, plek, getal of citaat per ~300 woorden — anders is het lucht',
    isDutch
      ? '- Schrijf in werkwoorden, niet in nominalisaties ("we besluiten" niet "het besluit wordt genomen")'
      : '- Write in verbs, not nominalizations ("we decide" not "the decision is made")',
    '- Laat een mening doorklinken — niet "evenwichtig", wel onderbouwd',
    '- Houd één spanningsboog vast: vraag → spanning → antwoord. Niet vijf parallelle structuurtjes',
    '',
    'Apply this voice baseline NEXT to (not over) the brand-specific directive above. The brand directive defines identity; this directive prevents AI-tells.',
  ].join('\n');
}

/** Estimate token count of the directive (rough: chars / 4) */
export function getHumanVoiceDirectiveTokenEstimate(language: 'nl' | 'en' = 'nl'): number {
  return Math.round(buildHumanVoiceDirective({ language }).length / 4);
}
