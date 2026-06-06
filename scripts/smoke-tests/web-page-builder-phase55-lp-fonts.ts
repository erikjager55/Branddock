/**
 * Smoke-test — LP-render typografie load (Track 3, 2026-06-06). De canvas-
 * fontloader (a) sloeg 'Roboto' over als "system" → zwarthout's body laadde
 * niet (Roboto staat alleen op Android) en (b) vroeg een weight-suffix-naam
 * "Sen Bold" op die geen Google-family is → kop viel terug op system-ui. Fix:
 * 'roboto' uit de system-set + weight-strip in de loader; `stripFontWeightSuffix`
 * in de brand-tokens font-stack.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase55-lp-fonts.ts
 */
import { extractFontName } from '../../src/features/campaigns/components/canvas/medium/useBrandFontLoader';
import { stripFontWeightSuffix } from '../../src/lib/brandstyle/google-fonts-catalog';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

console.log('── loader: weight-suffix + Roboto ──');
{
  // zwarthout DISPLAY "Sen Bold" → de loader vraagt de echte family "Sen".
  assert('"Sen Bold", ui-sans-serif → "Sen"', extractFontName('"Sen Bold", ui-sans-serif, system-ui') === 'Sen', `${extractFontName('"Sen Bold", ui-sans-serif')}`);
  // zwarthout BODY Roboto → wordt nu WEL geladen (niet meer als system geskipt).
  assert('"Roboto", sans-serif → "Roboto" (wordt geladen)', extractFontName('Roboto, ui-sans-serif, sans-serif') === 'Roboto', `${extractFontName('Roboto, sans-serif')}`);
  // Echte OS/generic fonts blijven uitgesloten (geen Google-request).
  assert('system-ui → null', extractFontName('system-ui, -apple-system, sans-serif') === null);
  assert('Arial → null', extractFontName('Arial, sans-serif') === null);
  assert('"Segoe UI" → null', extractFontName('"Segoe UI", Roboto, sans-serif') === null);
  // Numerieke weight + style-woord.
  assert('"Sen 700" → "Sen"', extractFontName('"Sen 700"') === 'Sen');
  assert('"Inter Italic" → "Inter"', extractFontName('Inter Italic, sans-serif') === 'Inter');
  // Een legitieme meerwoordige family zonder weight blijft heel.
  assert('"PT Sans" → "PT Sans" (geen weight)', extractFontName('"PT Sans", sans-serif') === 'PT Sans');
}

console.log('\n── brand-tokens stack-strip (Track 3a, gedeelde helper) ──');
{
  assert('stripFontWeightSuffix("Sen Bold") → "Sen"', stripFontWeightSuffix('Sen Bold') === 'Sen');
  assert('stripFontWeightSuffix("Roboto") → "Roboto"', stripFontWeightSuffix('Roboto') === 'Roboto');
  assert('stripFontWeightSuffix("PT Sans") → "PT Sans"', stripFontWeightSuffix('PT Sans') === 'PT Sans');
}

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
