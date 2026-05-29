/**
 * Smoke-test voor Fase A4 — motion-signature extractie.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase28-motion-profile.ts
 */
import { extractMotionProfile } from "../../src/lib/brandstyle/motion-extractor";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

// ─── Duration parsing + categorisatie ─────────────────────

group("A4 — duration categorisatie");
{
  const css = `
    .a { transition: all 50ms linear; }
    .b { transition: opacity 150ms ease-out; }
    .c { transition: background 300ms ease-in-out; }
    .d { transition: transform 600ms ease; }
  `;
  const result = extractMotionProfile(css);
  assert("vier samples", result.samples.length === 4);
  const categories = result.samples.map((s) => s.category);
  assert("instant gevonden (50ms)", categories.includes("instant"));
  assert("quick gevonden (150ms)", categories.includes("quick"));
  assert("comfortable gevonden (300ms)", categories.includes("comfortable"));
  assert("slow gevonden (600ms)", categories.includes("slow"));
}

// ─── Seconds vs ms ────────────────────────────────────────

group("A4 — seconds + ms-parsing");
{
  const css = `
    .a { transition: opacity 0.2s ease; }
    .b { transition: color 200ms ease; }
  `;
  const result = extractMotionProfile(css);
  assert("2 samples", result.samples.length === 2);
  assert("0.2s = 200ms", result.samples[0].durationMs === 200);
  assert("200ms = 200ms", result.samples[1].durationMs === 200);
  assert("beide quick", result.samples.every((s) => s.category === "quick"));
}

// ─── Multi-property transition ────────────────────────────

group("A4 — multi-property transition met komma's");
{
  const css = `
    .btn {
      transition: background 200ms ease, color 100ms linear, transform 300ms cubic-bezier(0.4,0,0.2,1);
    }
  `;
  const result = extractMotionProfile(css);
  assert("drie samples uit één transition", result.samples.length === 3);
  const ms = result.samples.map((s) => s.durationMs).sort();
  assert("durations 100/200/300", ms[0] === 100 && ms[1] === 200 && ms[2] === 300);
}

// ─── Easing detection ─────────────────────────────────────

group("A4 — easing detection");
{
  const css = `
    .a { transition: opacity 200ms linear; }
    .b { transition: opacity 200ms ease-out; }
    .c { transition: opacity 200ms cubic-bezier(0.4,0,0.2,1); }
  `;
  const result = extractMotionProfile(css);
  const easings = result.samples.map((s) => s.easing);
  assert("linear gevonden", easings.includes("linear"));
  assert("ease-out gevonden", easings.includes("ease-out"));
  assert(
    "cubic-bezier behouden",
    easings.some((e) => e?.includes("cubic-bezier")),
  );
}

// ─── Transition-duration + timing-function los ────────────

group("A4 — transition-duration + transition-timing-function los");
{
  const css = `
    .btn {
      transition-duration: 250ms;
      transition-timing-function: ease-in-out;
    }
  `;
  const result = extractMotionProfile(css);
  assert("1 sample", result.samples.length === 1);
  assert("250ms", result.samples[0].durationMs === 250);
  assert("easing=ease-in-out", result.samples[0].easing === "ease-in-out");
}

// ─── Animation-duration ───────────────────────────────────

group("A4 — animation-duration");
{
  const css = `
    .fade { animation-duration: 800ms; }
  `;
  const result = extractMotionProfile(css);
  assert("1 sample (animation)", result.samples.length === 1);
  assert("category=slow (800ms)", result.samples[0].category === "slow");
}

// ─── Dominant categorie ──────────────────────────────────

group("A4 — dominant categorie");
{
  const css = `
    .a { transition: all 200ms ease; }
    .b { transition: all 200ms ease; }
    .c { transition: all 200ms ease; }
    .d { transition: all 600ms ease; }
  `;
  const result = extractMotionProfile(css);
  assert("dominant=quick (3 van 4)", result.dominantCategory === "quick");
  assert("average tussen 200 en 600", (result.averageDurationMs ?? 0) > 200 && (result.averageDurationMs ?? 0) < 600);
}

// ─── Dominant easing ──────────────────────────────────────

group("A4 — dominant easing = meest-voorkomend");
{
  const css = `
    .a { transition: all 200ms ease; }
    .b { transition: all 200ms ease; }
    .c { transition: all 200ms linear; }
  `;
  const result = extractMotionProfile(css);
  assert(
    "dominantEasing=ease",
    result.dominantEasing === "ease",
    `got ${result.dominantEasing}`,
  );
}

// ─── Empty CSS ────────────────────────────────────────────

group("A4 — empty CSS → defaults");
{
  const css = `body { color: black; }`;
  const result = extractMotionProfile(css);
  assert("0 samples", result.samples.length === 0);
  assert("dominant=comfortable (default)", result.dominantCategory === "comfortable");
  assert("average=null", result.averageDurationMs === null);
  assert("dominantEasing=null", result.dominantEasing === null);
}

// ─── LINFI scenario ───────────────────────────────────────

group("A4 — LINFI premium luxury (subtle motion)");
{
  const css = `
    .btn { transition: background 200ms ease, color 200ms ease; }
    a { transition: color 150ms ease-out; }
  `;
  const result = extractMotionProfile(css);
  // Quick or comfortable — premium voelt rustig
  assert(
    "dominant quick of comfortable",
    result.dominantCategory === "quick" || result.dominantCategory === "comfortable",
  );
  assert("dominantEasing aanwezig", result.dominantEasing !== null);
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
