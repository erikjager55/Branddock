/**
 * content-locale-anchor-smoke — bewijst dat elk workspace-creatiepad een
 * content-locale-anker achterlaat, en dat de repair bestaande drift dicht.
 *
 * Aanleiding (ADR 2026-07-16): `provisionNewUser` (sign-up) maakte geen Brand +
 * isDefault-profiel; alleen POST /api/workspaces deed dat. 3 van de 4 prod-workspaces
 * stonden zonder anker → `resolveTargetProfile` gaf `null`. Daarnaast liepen
 * Workspace.contentLanguage en het profiel uiteen (pilotklant: en vs nl-NL), waardoor
 * de settings-UI iets anders toonde dan de generatie deed.
 *
 * Draaien:
 *   node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/dev/content-locale-anchor-smoke.ts
 *   REPAIR=1 ... → draait de repair ook echt tegen de lokale DB (muteert!)
 */

import { prisma } from '../../src/lib/prisma';
import {
  ensureBrandWithDefaultProfile,
  resolveInitialLocale,
  localeForLanguage,
  languageForLocale,
} from '../../src/lib/content-locale/default-profile';
import { SUPPORTED_LOCALES } from '../../src/lib/brand-fidelity/heuristics/locale-resolver';
import { diagnoseAnchors, repairAnchors } from '../../src/lib/content-locale/repair-anchors';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

async function main() {
  console.log('\n1. Aanmaak-precedentie (voiceguide → contentLanguage → en-GB)');
  check('voiceguide wint', resolveInitialLocale('nl-NL', 'en') === 'nl-NL');
  check('geen voiceguide → contentLanguage', resolveInitialLocale(null, 'nl') === 'nl-NL');
  check('niets → en-GB', resolveInitialLocale(null, null) === 'en-GB');
  check('onbekende voiceguide-locale genegeerd', resolveInitialLocale('zz-ZZ', 'nl') === 'nl-NL');
  check('localeForLanguage-fallback', localeForLanguage('klingon') === 'en-GB');
  // nl-BE is VALIDE invoer (SUPPORTED_LOCALES + een echte picker-optie "Nederlands
  // (België)"), maar zit niet in LANG_TO_LOCALE. Valideren op die values gooide 'm weg →
  // een Vlaams merk met contentLanguage='en' (de @default) kreeg een en-GB-anker en
  // flipte stil naar Engels. De oude smoke testte alleen ONZIN-invoer ('zz-ZZ') en zag
  // dit dus niet: de whitelist werkte daar juist correct.
  check('nl-BE (valide, buiten LANG_TO_LOCALE) overleeft',
    resolveInitialLocale('nl-BE', 'en') === 'nl-BE',
    `kreeg ${resolveInitialLocale('nl-BE', 'en')} — Vlaams merk zou naar Engels flippen`);
  check('elke SUPPORTED_LOCALE overleeft',
    SUPPORTED_LOCALES.every((l) => resolveInitialLocale(l, 'en') === l),
    SUPPORTED_LOCALES.filter((l) => resolveInitialLocale(l, 'en') !== l).join(', '));

  console.log('\n1b. locale → contentLanguage (voor de reconcile)');
  check('nl-NL → nl', languageForLocale('nl-NL') === 'nl');
  // Via base-subtag, niet via een omgekeerde LANG_TO_LOCALE-map: die gaf nl-BE →
  // undefined, waardoor de reconcile 'm stil oversloeg en de settings-UI bleef liegen.
  check('nl-BE → nl (niet undefined)', languageForLocale('nl-BE') === 'nl');
  check('en-GB → en', languageForLocale('en-GB') === 'en');
  check('onbekende locale → null', languageForLocale('zz-ZZ') === null);

  console.log('\n2. Diagnose van de lokale DB (read-only)');
  const before = await diagnoseAnchors();
  console.log(`  → ${before.workspaces} workspaces | anker: ${before.withAnchor} | zonder: ${before.missingAnchor} | divergent: ${before.diverged.length}`);
  for (const d of before.diverged) {
    console.log(`     divergent: ${d.name} — contentLanguage=${d.contentLanguage} vs profiel=${d.profileLocale}`);
  }
  check('diagnose muteert niets', (await diagnoseAnchors()).missingAnchor === before.missingAnchor);

  console.log('\n3. Helper is idempotent + niet-clobberend (echte DB-writes)');
  const ws = await prisma.workspace.findFirst({
    where: { localeProfiles: { some: { isDefault: true } } },
    select: { id: true, name: true, localeProfiles: { where: { isDefault: true }, select: { locale: true } } },
  });
  if (!ws) {
    check('testworkspace met anker gevonden', false, 'geen enkele workspace heeft een profiel');
  } else {
    const originalLocale = ws.localeProfiles[0]!.locale;
    // Een bestaand profiel mag NOOIT stil overschreven worden — dat is de pilotklant-flip.
    await ensureBrandWithDefaultProfile(prisma, ws.id, 'de-DE');
    const after = await prisma.brandLocaleProfile.findFirst({
      where: { workspaceId: ws.id, isDefault: true },
      select: { locale: true },
    });
    check('bestaand profiel blijft ongemoeid', after?.locale === originalLocale,
      `${originalLocale} → ${after?.locale} (clobber!)`);
    const count = await prisma.brandLocaleProfile.count({ where: { workspaceId: ws.id, isDefault: true } });
    check('geen tweede isDefault-profiel', count === 1, `${count} default-profielen`);
  }

  if (process.env.REPAIR === '1') {
    console.log('\n4. Repair tegen de lokale DB');
    const result = await repairAnchors();
    console.log(`  → ankers aangemaakt: ${result.anchorsCreated} | talen bijgetrokken: ${result.languagesReconciled}`);
    for (const d of result.details) console.log(`     ${d}`);

    const after = await diagnoseAnchors();
    check('geen enkele workspace zonder anker', after.missingAnchor === 0, `${after.missingAnchor} over`);
    check('geen divergentie meer', after.diverged.length === 0, `${after.diverged.length} over`);

    const second = await repairAnchors();
    check('idempotent (2e run doet niets)', second.anchorsCreated === 0 && second.languagesReconciled === 0,
      `created=${second.anchorsCreated} reconciled=${second.languagesReconciled}`);
  } else {
    console.log('\n4. Repair overgeslagen (zet REPAIR=1 — muteert de lokale DB)');
  }

  console.log(`\n${pass}/${pass + fail} checks groen${fail ? ` — ${fail} FAIL` : ''}\n`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
}

void main();
