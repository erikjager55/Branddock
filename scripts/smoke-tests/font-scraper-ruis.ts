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
