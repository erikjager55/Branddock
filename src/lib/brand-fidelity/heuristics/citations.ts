// ============================================================
// Citation-register — Δ-2 provenance
//
// Elke HeuristicEntry tagged met een citation-key uit deze register.
// Maakt review-output traceable ("waarom is 'leverage' geflagd?" → bron-URL +
// naam zichtbaar in bevindingen-tabel + gotchas-doc).
//
// Bronnen geverzameld via online-research deze sessie 2026-05-08 (subagent
// output verspreid over 4 talen). Bibliografisch gegrond — wanneer URL ooit
// offline gaat blijft de bron-naam herkenbaar.
// ============================================================

export interface Citation {
  /** Bron-naam (boek, organisatie, publicatie). */
  name: string;
  /** Officiële URL waar mogelijk. Lege string betekent boekreferentie zonder online-version. */
  url: string;
  /** Taal/regio van de bron — handig voor coverage-validatie per locale. */
  language: 'nl' | 'be' | 'en' | 'de' | 'multi';
  /** Eén-zin samenvatting wat deze bron levert (voor bevindingen-tabel hover/expand). */
  summary: string;
}

export const CITATIONS: Record<string, Citation> = {
  // ─── Nederlandse bronnen ──────────────────────
  onze_taal: {
    name: 'Genootschap Onze Taal',
    url: 'https://onzetaal.nl/taalloket/modern-taalgebruik',
    language: 'nl',
    summary: 'Modern taalgebruik tabel — autoritaire registershift-referentie.',
  },
  schrijfvis_schrap: {
    name: 'Schrijfvis — 21 schrap-woorden',
    url: 'https://www.schrijfvis.nl/schrappen/',
    language: 'nl',
    summary: 'Standaard vulwoorden-lijst die altijd geschrapt kan worden.',
  },
  schrijfvis_jeukwoorden: {
    name: 'Schrijfvis — kantoortaal & jeukwoorden',
    url: 'https://www.schrijfvis.nl/jeukwoorden/',
    language: 'nl',
    summary: 'Top-22 vacaturetekst-jeukwoorden + Japke-d. Bouma corpus.',
  },
  werf_jeukwoorden: {
    name: 'Werf& — top-10 ergste jeukwoorden recruitmentvak',
    url: 'https://www.werf-en.nl/dit-zijn-de-10-ergste-jeukwoorden-van-het-recruitmentvak-en-zo-kom-je-er-vanaf/',
    language: 'nl',
    summary: 'Vacature-cliché ranking 2023.',
  },
  frankwatching_cliches: {
    name: 'Frankwatching — vacature-jeukwoorden infographic',
    url: 'https://www.frankwatching.com/archive/2023/10/07/vacatureteksten-jeukwoorden-cliches/',
    language: 'nl',
    summary: 'Visual ranking van overgebruikte vacature-termen.',
  },
  cliche_schatkamer: {
    name: 'Clichéschatkamer (managementjargon corpus)',
    url: 'https://clicheschatkamer.wordpress.com/',
    language: 'nl',
    summary: 'Ouder maar nog actuele managementjargon-database.',
  },

  // ─── Belgisch-Nederlandse bronnen ─────────────
  wikipedia_nl_be_diff: {
    name: 'Wikipedia — Lijst van verschillen NL/BE/Suriname',
    url: 'https://nl.wikipedia.org/wiki/Lijst_van_verschillen_tussen_het_Nederlands_in_Belgi%C3%AB,_Nederland_en_Suriname',
    language: 'be',
    summary: 'Canonical lijst van NL ↔ BE woordverschillen (job/onthaal/verlof/etc.).',
  },
  zigzag_hr_be: {
    name: 'ZigZag HR — jeukwoorden vacaturetekst BE',
    url: 'https://zigzaghr.be/deze-jeukwoorden-vermijd-je-best-in-je-vacaturetekst/',
    language: 'be',
    summary: 'BE-specifieke vacature-clichés (familiale sfeer, marktconform salaris, etc.).',
  },
  robert_walters_be: {
    name: 'Robert Walters BE — clichés vermijden in vacaturetekst',
    url: 'https://www.robertwalters.be/nl/insights/rekruteringsadvies/blog/Cliches-vermijden-in-een-vacaturetekst.html',
    language: 'be',
    summary: 'BE recruitment-clichés vanuit professional services.',
  },
  dutchpp_fu_berlin: {
    name: 'Dutch++ FU Berlin — aanspreekvormen werkvloer',
    url: 'https://userblogs.fu-berlin.de/dutch/taalgebruik/taalgebruik-op-de-werkvloer/informatie-aanspreekvormen/',
    language: 'be',
    summary: 'Academische bron voor u/je-default verschillen NL ↔ BE.',
  },

  // ─── Engelse bronnen ─────────────────────────
  pec_az: {
    name: 'Plain English Campaign — A to Z of alternative words',
    url: 'https://www.plainenglish.co.uk/the-a-z-of-alternative-words.html',
    language: 'en',
    summary: 'Sinds 1979 gehanteerde plain-English alternatives lijst.',
  },
  wp_ai_signs: {
    name: 'Wikipedia — Signs of AI writing',
    url: 'https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing',
    language: 'en',
    summary: 'Community-curated AI-generated content telltales (lexical + structural).',
  },
  the_decoder_ai_words: {
    name: 'The Decoder — Reddit AI-words list',
    url: 'https://the-decoder.com/reddit-users-compile-list-of-words-and-phrases-that-unmask-chatgpts-writing-style/',
    language: 'en',
    summary: 'Crowdsourced corpus van AI-detection lexical signals.',
  },
  inbound_2025_buzzwords: {
    name: 'Inbound — buzzwords goodbye 2025',
    url: 'https://www.inbound.com/blog/the-top-buzzwords-were-saying-goodbye-to-in-2025',
    language: 'en',
    summary: 'Recente corporate-fluff inventaris uit B2B marketing.',
  },
  cfo_overhyped: {
    name: 'CFO.com — 8 most overhyped corporate buzzwords 2025',
    url: 'https://www.cfo.com/news/8-most-overhyped-corporate-buzzwords-of-2025/742027/',
    language: 'en',
    summary: 'Executive-perspective op verspilde-betekenis-termen.',
  },
  prsa_jargon: {
    name: 'PRSA — corporate jargon (touching base annoyances)',
    url: 'https://www.prsa.org/article/touching-base-on-annoying-corporate-jargon-ST-Feb25',
    language: 'en',
    summary: 'PR-industry-perspective op corporate-jargon te vermijden.',
  },
  strunk_white_omit: {
    name: 'Strunk & White — Elements of Style §III "Omit needless words"',
    url: '',
    language: 'en',
    summary: 'Klassieker filler-words referentie (very, rather, little, pretty).',
  },

  // ─── Duitse bronnen ──────────────────────────
  hix_hohenheim: {
    name: 'Klartext-Initiative Uni Hohenheim — HIX (Hohenheimer Verständlichkeitsindex)',
    url: 'https://klartext.uni-hohenheim.de/hix',
    language: 'de',
    summary: 'Academische schaal 0-20 voor Verständlichkeit (anchor voor DE plain-language).',
  },
  karrierebibel_floskel: {
    name: 'Karrierebibel — Floskeln 40 Beispiele',
    url: 'https://karrierebibel.de/floskel/',
    language: 'de',
    summary: 'Curated DE corporate-fluff lijst.',
  },
  caesar_business_bullshit: {
    name: 'Caesar Caesar — Business-Bullshit / Wirtschaftssprache',
    url: 'https://www.cc-stuttgart.de/blog-cc/kommunikationsberatung/wirtschaftssprache-bitte-kein-business-bullshit/',
    language: 'de',
    summary: 'Communicatie-consultancy DE on overused buzzwords.',
  },
  cobalt_business_deutsch: {
    name: 'Cobalt Recruitment — Business-Deutsch über Büro-Phrasen',
    url: 'https://cobaltrecruitment.de/blog/business-deutsch-ueber-buero-phrasen-und-wie-man-sie-vermeidet-2',
    language: 'de',
    summary: 'Recruitment-perspectief op DE office-phrases.',
  },
  sternenvogel_fuellwoerter: {
    name: 'Sternenvogelreisen — Füllwörter-Liste',
    url: 'https://sternenvogelreisen.de/fuellwoerter-liste-worte/',
    language: 'de',
    summary: 'Standaard DE filler-words lijst.',
  },
  wikipedia_denglisch: {
    name: 'Wikipedia — Denglisch',
    url: 'https://en.wikipedia.org/wiki/Denglisch',
    language: 'de',
    summary: 'Anglicisms in Duitse zakelijke taal.',
  },
} as const;

export type CitationKey = keyof typeof CITATIONS;

/** Type-safe lookup wanneer citation-key uit DB komt of dynamic. */
export function getCitation(key: string): Citation | undefined {
  return (CITATIONS as Record<string, Citation>)[key];
}
