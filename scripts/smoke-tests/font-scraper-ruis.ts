/**
 * Bewaakt dat de fontscraper geen niet-merkfonts als merkfont registreert.
 *
 * ELKE ASSERTIE HIERONDER IS EEN GEMETEN PRODUCTIE-VINDPLAATS (2026-08-20,
 * `StyleguideFont` op `branddock-prod`), geen bedacht geval. Dat is bewust: een
 * filterlijst die op verzonnen voorbeelden rust, dekt de gevallen die echt
 * voorkomen niet.
 *
 * De aanleiding: van de 18 fonts die op productie als `COMMERCIAL` (= "moet
 * geüpload worden") stonden, waren er hooguit drie een echte merkfont. De rest
 * was systeemfont, plugin-icoonfont of een build-hash. Erik stond op het punt
 * achttien fontbestanden te gaan zoeken waarvan er vijftien niet bestaan.
 *
 * ⚠️ Dit was géén verouderde data: Zwarthout (06-06), Nobox (21-07), sulejman
 * (16-07) en Branddock (17-08) zijn allemaal ná de filterronde van 2026-06-05
 * gescrapet en bevatten dezelfde ruis. De filters waren onvolledig, niet oud.
 *
 * Puur: geen database, geen netwerk, geen sleutels.
 */
import { extractFontsFromCss } from '../../src/lib/brandstyle/url-scraper';

let ok = 0;
const fouten: string[] = [];
function check(label: string, geslaagd: boolean, detail?: string): void {
  if (geslaagd) { ok++; console.log(`  ✓ ${label}`); }
  else { fouten.push(label); console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); }
}

/** Bouwt CSS zoals een echte pagina hem emit. */
const css = (family: string, selector = '.x') => `${selector}{font-family:${family};}`;

function main(): void {
  console.log('\n── A. Systeemfonts die als merkfont op prod stonden ──────');
  for (const [naam, waar] of [
    ['SFMono-Regular', 'Branddock, Zwarthout, better brands, sulejman'],
    ['Geneva', 'DTS Ede'],
    ['Droid Sans', 'DTS Ede'],
    ['Bitstream Charter', 'DTS Ede'],
    ['HelveticaNeue-Light', 'DTS Ede'],
  ] as const) {
    const uit = extractFontsFromCss(css(naam));
    check(`${naam} telt niet als merkfont (${waar})`, uit.length === 0, `kreeg: ${JSON.stringify(uit)}`);
  }

  console.log('\n── B. Plugin-icoonfonts ──────────────────────────────────');
  for (const [naam, waar] of [
    ['ETmodules', 'Nobox — Divi'],
    ['slick', 'Zwarthout — slick-carousel'],
    ['star', 'Zwarthout — slick-carousel'],
    ['DSEG7Classic', 'PartnerSelect — 7-segment-widget'],
  ] as const) {
    const uit = extractFontsFromCss(css(naam));
    check(`${naam} telt niet als merkfont (${waar})`, uit.length === 0, `kreeg: ${JSON.stringify(uit)}`);
  }

  console.log('\n── C. Build-hashes ───────────────────────────────────────');
  for (const h of ['2cca21a49f7dad1daa612d73d50357644671964a', '43d730c59dee2754d29e0d946ba8cb8339656979']) {
    const uit = extractFontsFromCss(css(h));
    check(`hash ${h.slice(0, 10)}… telt niet als merkfont (PartnerSelect)`, uit.length === 0,
      `kreeg: ${JSON.stringify(uit)}`);
  }

  console.log('\n── D. Echte merkfonts blijven staan ──────────────────────');
  // De tegenproef. Zonder deze sectie zou een filter dat ALLES weggooit ook
  // groen zijn — en dat is de makkelijkste manier om deze bewaker te slopen.
  for (const naam of ['Apercu', 'Oranienbaum', 'Montserrat', 'halyard-display', 'mrs-eaves-xl-serif', 'effra']) {
    const uit = extractFontsFromCss(css(naam));
    check(`${naam} blijft wél staan`, uit.length === 1, `kreeg: ${JSON.stringify(uit)}`);
  }
  // Merknamen die tóch hex-letters bevatten mogen niet als hash sneuvelen.
  for (const naam of ['Decade', 'Facade', 'Abcdef']) {
    const uit = extractFontsFromCss(css(naam));
    check(`"${naam}" is geen build-hash`, uit.length === 1, `kreeg: ${JSON.stringify(uit)}`);
  }
  // `slick` en `star` worden EXACT gematcht, niet als fragment — anders
  // sneuvelen echte merknamen die het woord bevatten.
  for (const naam of ['Star Grotesk', 'Slick Display', 'Northstar']) {
    const uit = extractFontsFromCss(css(naam));
    check(`"${naam}" overleeft de exacte icoonfont-match`, uit.length === 1, `kreeg: ${JSON.stringify(uit)}`);
  }

  console.log('\n── D2. Gequote fontnamen (de bug van 2026-03-05) ─────────');
  // `font-family:"Open Sans"` gaf tot 2026-08-20 een LEGE capture: de regex
  // sloot het dubbele-quote-teken uit. Vijf maanden lang werd daarmee de meest
  // gangbare schrijfwijze in gecompileerde CSS volledig gemist — terwijl enkele
  // quotes en ongequote waarden wél werkten. Dat maskeerde de bug: de scraper
  // vond de ongequote systeemfonts uit de fallback-stack, maar niet de gequote
  // merkfont die ervoor stond.
  for (const [css, verwacht] of [
    ['.a{font-family:"Montserrat";}', 'Montserrat'],
    ['.b{font-family:"Montserrat", Arial;}', 'Montserrat'],
    ['.c{font-family:"Hanken Grotesk", sans-serif;}', 'Hanken Grotesk'],
    ['.d{font-family: "Open Sans", Arial;}', 'Open Sans'],
  ] as const) {
    const uit = extractFontsFromCss(css);
    check(`dubbele quotes: ${verwacht}`, uit.length === 1 && uit[0] === verwacht, `kreeg: ${JSON.stringify(uit)}`);
  }
  for (const [css, verwacht] of [
    [".e{font-family:'Montserrat';}", 'Montserrat'],
    ['.f{font-family:Hanken Grotesk, sans-serif;}', 'Hanken Grotesk'],
  ] as const) {
    const uit = extractFontsFromCss(css);
    check(`regressie enkel/ongequote: ${verwacht}`, uit.length === 1 && uit[0] === verwacht, `kreeg: ${JSON.stringify(uit)}`);
  }
  // De quote-fix mag de filters niet omzeilen.
  for (const naam of ['SFMono-Regular', 'slick']) {
    const uit = extractFontsFromCss(`.g{font-family:"${naam}";}`);
    check(`gequote ruis "${naam}" blijft gefilterd`, uit.length === 0, `kreeg: ${JSON.stringify(uit)}`);
  }

  console.log('\n── D3. Echte Tailwind-stacks (regressie van de quote-fix) ─');
  // ⚠️ Deze sectie bestaat omdat mijn eigen quote-fix een regressie opleverde
  // die pas op PRODUCTIE zichtbaar werd. Ik had de fix getoetst met simpele CSS
  // (`.a{font-family:"X";}`) en niet met de vorm die echte sites emitten. Toen
  // de `"` uit de regex verdween, liep de match door tot de `;` en pikte de
  // sluithaak van Tailwinds preflight mee: `…,"Noto Color Emoji")`. Die rij
  // stond na de re-analyse letterlijk met `")` in Branddocks styleguide — en
  // matchte daardoor NIET meer met de generieke-namenlijst waar
  // `noto color emoji` gewoon in staat. Eén teken maakte een bestaand filter blind.
  const TAILWIND_SANS = '.a{font-family:ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji");}';
  const TAILWIND_MONO = '.b{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;}';
  check('Tailwind sans-stack levert nul merkfonts', extractFontsFromCss(TAILWIND_SANS).length === 0,
    `kreeg: ${JSON.stringify(extractFontsFromCss(TAILWIND_SANS))}`);
  check('Tailwind mono-stack levert nul merkfonts', extractFontsFromCss(TAILWIND_MONO).length === 0,
    `kreeg: ${JSON.stringify(extractFontsFromCss(TAILWIND_MONO))}`);
  // Geen enkele uitkomst mag nog een haakje of quote dragen.
  const alles = extractFontsFromCss(`${TAILWIND_SANS}${TAILWIND_MONO}.c{font-family:var(--f, "Hanken Grotesk", sans-serif);}`);
  check('geen enkele fontnaam draagt een quote of haakje',
    alles.every((f) => !/["'()]/.test(f)), `kreeg: ${JSON.stringify(alles)}`);
  check('de merkfont uit een var()-fallback wordt wél gevonden',
    alles.includes('Hanken Grotesk'), `kreeg: ${JSON.stringify(alles)}`);

  // ⚠️ Deze twee staan er omdat ik ze zelf gesloopt heb. De eerste versie van de
  // haakjes-strip deed `/[)\s]+$/` en haalde daarmee de sluithaak van een
  // `var(…)` weg — de var()-regex eist `\)$`, dus de resolutie viel terug op
  // null en het merkfont verdween. Gevangen door `smoke:wpb-result-audit`
  // (58 → 57 pass), níet door mijn eigen toetsen: die gebruikten geen var()-stack.
  // Sindsdien balanceert de strip de haakjes in plaats van blind te knippen.
  const VAR_STACK = '.v{font-family:var(--brand-font, "Brandon Grotesque", system-ui, sans-serif);}';
  check('var()-stack met merkfont resolvet naar de merkfont',
    extractFontsFromCss(VAR_STACK).includes('Brandon Grotesque'),
    `kreeg: ${JSON.stringify(extractFontsFromCss(VAR_STACK))}`);
  const VAR_SYSTEEM = '.w{font-family:var(--ui-font, system-ui, -apple-system, sans-serif);}';
  check('var()-stack zónder merkfont levert niets op',
    extractFontsFromCss(VAR_SYSTEEM).length === 0,
    `kreeg: ${JSON.stringify(extractFontsFromCss(VAR_SYSTEEM))}`);

  console.log('\n── E. Mutatietest ────────────────────────────────────────');
  // Discrimineert de functie, of zegt hij overal hetzelfde? Zonder deze check
  // zou "alles nul" én "alles één" beide door secties A-D kunnen glippen als
  // er ooit één van beide wordt weggehaald.
  const ruis = extractFontsFromCss(css('SFMono-Regular'));
  const merk = extractFontsFromCss(css('Apercu'));
  check('MUTATIETEST — ruis en merkfont geven een VERSCHILLEND antwoord',
    ruis.length !== merk.length, `ruis=${ruis.length} merk=${merk.length}`);

  console.log(`\n${fouten.length === 0 ? '✅' : '❌'} ${ok}/${ok + fouten.length} checks geslaagd`);
  if (fouten.length) { fouten.forEach((f) => console.error(`   - ${f}`)); process.exit(1); }
}

main();
