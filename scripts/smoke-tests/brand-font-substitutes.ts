/**
 * Smoke voor het substituut-signaal in de data-quality-badge
 * (`brand-fonts-ontbreken-op-prod`, spoor B).
 *
 * Bewijst het enige dat telt: een font die de gebruiker in zijn styleguide ziet
 * staan maar die als iets anders rendert, telt mee in de merk-gereedheid.
 *
 * ⚠ De belangrijkste check is de MUTATIETEST onderaan. Een test die "29 fonts
 * gevlagd" bevestigt is waardeloos als hij dat ook zou zeggen met de guard
 * eruit — dan telt hij gewoon alle fonts. Daarom draait dezelfde
 * productie-verdeling twee keer: één keer via de echte functie en één keer met
 * een naïeve teller die op `fileUrl` kijkt (de aanname waar de oorspronkelijke
 * taak op gebaseerd was). Die twee MOETEN verschillen — 29 tegen 44.
 *
 * Puur, geen database nodig. Run: npx tsx scripts/smoke-tests/brand-font-substitutes.ts
 */

import { computeDataQuality } from '../../src/features/brandstyle/utils/data-quality';
import type { BrandStyleguide, StyleguideFontData } from '../../src/features/brandstyle/types/brandstyle.types';

let passed = 0;
const failures: string[] = [];

function check(label: string, ok: boolean, detail?: string): void {
  if (ok) { passed++; console.log(`  ✓ ${label}`); }
  else { failures.push(label); console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); }
}

/**
 * `StyleguideFontData.availability` is in het type niet-nullable, maar de
 * runtime-data kan het wél zijn (pure AI-inferentie zonder rij-match) en
 * `resolveFontRender` behandelt dat geval expliciet. De smoke moet dat geval
 * dus kunnen opvoeren; vandaar de bewuste verbreding hier.
 */
type Availability = StyleguideFontData['availability'] | null;

function font(name: string, availability: Availability, fileUrl: string | null = null): StyleguideFontData {
  return {
    id: `f-${name}`, name, role: 'UI', source: 'DETECTED', availability,
    fileUrl, fileName: null, fileType: null, fileSize: null,
    fontFamily: null, weight: null, style: null, sortOrder: 0,
    uploadedById: null, adobeFontsKitId: null,
    createdAt: '', updatedAt: '',
  } as StyleguideFontData;
}

function guide(fonts: StyleguideFontData[], workspaceKit: string | null = null): BrandStyleguide {
  return { fonts, colors: [], workspaceAdobeFontsKitId: workspaceKit } as unknown as BrandStyleguide;
}

/** Alleen de font-items, niet de zes kleur/typografie-paden. */
function flaggedFonts(g: BrandStyleguide): string[] {
  return computeDataQuality(g).needsAttention
    .filter((i) => i.path.startsWith('font:'))
    .map((i) => i.label);
}

function main(): void {
  console.log('\n── A. Per soort ───────────────────────────────────────────');

  check('COMMERCIAL zonder bestand wordt gevlagd',
    flaggedFonts(guide([font('Neue Haas Grotesk', 'COMMERCIAL')])).length === 1);

  check('GOOGLE_FONTS wordt NIET gevlagd (laadt bij Google, heeft nooit een bestand nodig)',
    flaggedFonts(guide([font('Inter', 'GOOGLE_FONTS')])).length === 0);

  check('ADOBE_FONTS zonder workspace-kit wordt gevlagd',
    flaggedFonts(guide([font('Proxima Nova', 'ADOBE_FONTS')])).length === 1);

  check('ADOBE_FONTS MET workspace-kit wordt niet gevlagd',
    flaggedFonts(guide([font('Proxima Nova', 'ADOBE_FONTS')], 'abc1234')).length === 0);

  check('UPLOADED wordt niet gevlagd',
    flaggedFonts(guide([font('Eigen Font', 'UPLOADED', 'https://r2/x.woff2')])).length === 0);

  check('availability null wordt niet gevlagd (valt terug op de échte Google Font)',
    flaggedFonts(guide([font('Markazi Text', null)])).length === 0);

  console.log('\n── B. Vorm van het signaal ────────────────────────────────');

  const one = computeDataQuality(guide([font('Neue Haas Grotesk', 'COMMERCIAL')]))
    .needsAttention.find((i) => i.path.startsWith('font:'));
  check('het item draagt de fontnaam als label', one?.label === 'Neue Haas Grotesk');
  check('het item hangt onder de typography-tab', one?.tab === 'typography');
  check('het item draagt leesbaar bewijs voor de wizard',
    !!one?.origin.evidence && one.origin.evidence.length > 10, one?.origin.evidence);

  check('dezelfde font twee keer telt één keer',
    flaggedFonts(guide([font('Neue Haas', 'COMMERCIAL'), font('neue haas', 'COMMERCIAL')])).length === 1);

  console.log('\n── C. De echte productie-verdeling ────────────────────────');

  // Gemeten op branddock-prod, 2026-08-18: 18 COMMERCIAL + 15 GOOGLE_FONTS +
  // 11 ADOBE_FONTS, geen enkele workspace met een adobeFontsKitId.
  const prod = guide([
    ...Array.from({ length: 18 }, (_, i) => font(`Commercial ${i}`, 'COMMERCIAL')),
    ...Array.from({ length: 15 }, (_, i) => font(`Google ${i}`, 'GOOGLE_FONTS')),
    ...Array.from({ length: 11 }, (_, i) => font(`Adobe ${i}`, 'ADOBE_FONTS')),
  ]);
  const flagged = flaggedFonts(prod).length;
  check('29 van de 44 fonts renderen als substituut (niet 44)', flagged === 29, `gevlagd: ${flagged}`);

  console.log('\n── D. Mutatietest ────────────────────────────────────────');

  // De aanname waar de oorspronkelijke taak op gebaseerd was: "fileUrl leeg =
  // kapot". Als die hetzelfde getal geeft als de echte functie, meet deze smoke
  // niets — dan is het onderscheid dat we net gebouwd hebben betekenisloos.
  const naief = (prod.fonts ?? []).filter((f) => !f.fileUrl).length;
  check('MUTATIETEST — de naïeve fileUrl-telling geeft een ÁNDER getal (anders meet deze smoke niets)',
    naief !== flagged, `naïef ${naief} vs echt ${flagged}`);
  check('en dat andere getal is precies de 44 uit de oorspronkelijke taak', naief === 44, `naïef: ${naief}`);

  console.log(`\n${failures.length === 0 ? '✅' : '❌'} ${passed}/${passed + failures.length} checks geslaagd`);
  if (failures.length) { failures.forEach((f) => console.error(`   - ${f}`)); process.exit(1); }
}

main();
