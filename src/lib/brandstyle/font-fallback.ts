/**
 * Font-fallback beslislogica (verbeterplan Fase 4, audit 2026-06-05).
 *
 * Symptoom: de fonts-tabel bleef leeg ("fonts lopen niet lekker"). Twee
 * oorzaken die hier worden geadresseerd met pure, deterministisch testbare
 * helpers (de daadwerkelijke scrape/headless-render zit in analysis-engine):
 *
 *   1. De headless computed-style-fallback (`scrapeUrlViaHeadless`) triggerde
 *      alléén op een zwak kléúrpalet — een site met goede kleuren maar nul
 *      gedetecteerde merk-fonts haalde 'm nooit. `hasNoBrandFonts` +
 *      `planHeadlessMerge` laten de fallback óók op lege fonts vuren, en
 *      mergen veilig (nooit een goed statisch palet/fontset overschrijven).
 *
 *   2. De StyleguideFont-rijen erfden de AI-fallback (`primaryFontName`),
 *      waardoor een AI-gok als "gedetecteerde" merk-font werd gepresenteerd.
 *      `selectDetectedFontNames` levert uitsluitend de écht gescrapte fonts.
 */

/** True wanneer er geen enkele niet-lege merk-fontnaam is gedetecteerd. */
export function hasNoBrandFonts(fonts: readonly (string | null | undefined)[]): boolean {
  return fonts.filter((f) => typeof f === 'string' && f.trim().length > 0).length === 0;
}

/**
 * Bepaalt welke headless-bronnen geadopteerd mogen worden, gegeven welke
 * statische bronnen tekortschoten. Kleuren en fonts zijn onafhankelijk:
 * adopteer alléén waar de statische scrape deficiënt was, zodat een goed
 * statisch resultaat nooit door de (duurdere, grovere) headless-render wordt
 * overschreven. Fonts worden alleen overgenomen als de headless-render er
 * daadwerkelijk vond.
 */
export function planHeadlessMerge(opts: {
  weakPalette: boolean;
  fontsEmpty: boolean;
  headlessFontCount: number;
}): { adoptColors: boolean; adoptFonts: boolean } {
  return {
    adoptColors: opts.weakPalette,
    adoptFonts: opts.fontsEmpty && opts.headlessFontCount > 0,
  };
}

/** True wanneer de headless-fallback überhaupt geprobeerd moet worden. */
export function shouldTryHeadless(opts: { weakPalette: boolean; fontsEmpty: boolean }): boolean {
  return opts.weakPalette || opts.fontsEmpty;
}

/**
 * Fontnamen voor de StyleguideFont-rijen: uitsluitend de écht gedetecteerde
 * fonts (max 6), NOOIT de AI-fallback. Leeg → geen rijen → eerlijke
 * "geen merk-font gedetecteerd"-empty-state in de UI i.p.v. een AI-gok die
 * als detectie wordt gepresenteerd.
 */
export function selectDetectedFontNames(detectedFonts: readonly (string | null | undefined)[]): string[] {
  return detectedFonts
    .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
    .slice(0, 6);
}
