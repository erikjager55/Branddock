/**
 * Abort-registry smoke (lp-review-followups §Robuustheid — SSE-disconnect).
 *
 * Dekt de laag die zonder AI-key én zonder browser te verifiëren is: wie breekt
 * welke generatie af, en overleeft een lopende run een stapwissel in de
 * accordion? Dat laatste is de regressie die deze registry bestaat om te
 * voorkomen — de eerste opzet hing de AbortController in het generatieblok, dat
 * bij elke tabwissel unmount.
 *
 * Run: npx tsx scripts/dev/lp-generation-abort-smoke.ts
 */

import {
  abortGeneration,
  beginGeneration,
  cancelScheduledAbort,
  endGeneration,
  hasActiveGeneration,
  scheduleAbort,
} from '../../src/features/campaigns/lib/generation-abort-registry';

let passed = 0;
const failures: string[] = [];

function check(label: string, ok: boolean): void {
  if (ok) { passed++; console.log(`  ✓ ${label}`); }
  else { failures.push(label); console.error(`  ✗ ${label}`); }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  console.log('\nAbort-registry');

  // 1. Twee generaties voor hetzelfde deliverable: de eerste moet wijken.
  const a1 = beginGeneration('deliv-a');
  const a2 = beginGeneration('deliv-a');
  check('tweede generatie breekt de eerste af (nooit twee tegelijk betalen)', a1.signal.aborted);
  check('de nieuwe generatie loopt gewoon', !a2.signal.aborted);

  // 2. Deliverables zijn onafhankelijk.
  const b1 = beginGeneration('deliv-b');
  beginGeneration('deliv-a');
  check('een generatie op een ánder deliverable blijft ongemoeid', !b1.signal.aborted);

  // 3. endGeneration mag alleen de eigen run afmelden.
  const c1 = beginGeneration('deliv-c');
  const c2 = beginGeneration('deliv-c');
  endGeneration('deliv-c', c1); // oude run meldt zich af — mag c2 niet wissen
  abortGeneration('deliv-c');
  check('afmelden van een oude run laat de actieve staan', c2.signal.aborted);

  // 4. De auto-trigger-guard. Dit is de vraag die het generatieblok bij elke
  //    mount stelt; stond hij in component-state, dan vuurde een stapwissel-en-
  //    terug een tweede betaalde generatie en brak die de eerste af.
  const d1 = beginGeneration('deliv-d');
  check('tijdens een run meldt de registry "er loopt iets"', hasActiveGeneration('deliv-d'));
  // Stapwissel: het blok unmount, maar plant géén abort (alleen CanvasPage doet
  // dat). De run moet blijven leven én zichtbaar blijven voor de auto-trigger.
  await wait(20);
  check('stapwissel breekt de generatie NIET af', !d1.signal.aborted);
  check('en de auto-trigger ziet dat er nog iets loopt (koopt niets bij)',
    hasActiveGeneration('deliv-d'));
  abortGeneration('deliv-d');
  check('na afbreken meldt de registry niets lopends meer', !hasActiveGeneration('deliv-d'));

  // 5. StrictMode: cleanup plant een abort, de directe re-mount trekt 'm in.
  const e1 = beginGeneration('deliv-e');
  scheduleAbort('deliv-e');
  cancelScheduledAbort('deliv-e');
  await wait(20);
  check('StrictMode cleanup→setup laat de generatie leven', !e1.signal.aborted);

  // 6. Echt weglopen: geplande abort, geen re-mount → afgebroken.
  //    De abort moet UITGESTELD zijn (anders overleeft StrictMode het niet) maar
  //    wél op de eerstvolgende tik vallen (anders doodt hij een echte terugkeer).
  const f1 = beginGeneration('deliv-f');
  scheduleAbort('deliv-f');
  check('de abort is uitgesteld, niet synchroon', !f1.signal.aborted);
  await wait(20);
  check('op de eerstvolgende tik is de generatie afgebroken', f1.signal.aborted);

  // 7. Identiteit: is er ná het plannen een níeuwe run gestart, dan mag de oude
  //    tik die niet meenemen.
  const g1 = beginGeneration('deliv-g');
  scheduleAbort('deliv-g');
  const g2 = beginGeneration('deliv-g');
  await wait(20);
  check('oude geplande abort raakt g1 (die is al vervangen)', g1.signal.aborted);
  check('maar laat de nieuwe run met rust', !g2.signal.aborted);

  const total = passed + failures.length;
  console.log(`\n${failures.length === 0 ? '✅' : '❌'} ${passed}/${total} checks geslaagd`);
  if (failures.length > 0) { failures.forEach((f) => console.error(`   - ${f}`)); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
