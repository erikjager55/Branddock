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

  // 4. Stapwissel-simulatie: het generatieblok unmount, de Canvas blijft.
  //    De registry hoort niets te doen — dit is precies de regressie die de
  //    eerste opzet introduceerde.
  const d1 = beginGeneration('deliv-d');
  // (geen scheduleAbort: alleen CanvasPage plant er een, niet het blok)
  await wait(300);
  check('stapwissel in de accordion breekt de generatie NIET af', !d1.signal.aborted);

  // 5. StrictMode-simulatie: cleanup plant een abort, de directe re-mount
  //    trekt 'm in. De generatie moet overleven.
  const e1 = beginGeneration('deliv-e');
  scheduleAbort('deliv-e');
  cancelScheduledAbort('deliv-e');
  await wait(300);
  check('StrictMode cleanup→setup laat de generatie leven', !e1.signal.aborted);

  // 6. Echt weglopen: cleanup zonder re-mount → na de gracieperiode afgebroken.
  const f1 = beginGeneration('deliv-f');
  scheduleAbort('deliv-f');
  check('vlak na weglopen loopt hij nog (gracieperiode)', !f1.signal.aborted);
  await wait(400);
  check('na de gracieperiode is de generatie afgebroken', f1.signal.aborted);

  const total = passed + failures.length;
  console.log(`\n${failures.length === 0 ? '✅' : '❌'} ${passed}/${total} checks geslaagd`);
  if (failures.length > 0) { failures.forEach((f) => console.error(`   - ${f}`)); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
