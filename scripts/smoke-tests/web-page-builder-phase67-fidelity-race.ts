/**
 * [DET] Phase 67 — P4: race-guard voor per-variant fidelity-scores.
 *
 * Test de pure guard `shouldApplyFidelityWrite` + een sequentie-simulatie van
 * het store-gedrag (token-map): een tragere/oudere fetch voor dezelfde index
 * mag de score van een nieuwere fetch NIET overschrijven, en een write na reset
 * (geen token meer) wordt gedropt. Tokenloze callers (orchestrator) blijven
 * ongegate.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase67-fidelity-race.ts
 */
import { shouldApplyFidelityWrite } from "../../src/features/campaigns/stores/fidelity-token-guard";

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}

console.log("\nshouldApplyFidelityWrite — kernregels");
assert("actuele token === request → apply", shouldApplyFidelityWrite(1, 1) === true);
assert("oudere fetch (current 2, request 1) → drop", shouldApplyFidelityWrite(2, 1) === false);
assert("na reset (current undefined, request 1) → drop", shouldApplyFidelityWrite(undefined, 1) === false);
assert("tokenloze caller (request undefined) → altijd apply", shouldApplyFidelityWrite(1, undefined) === true);
assert("tokenloze + lege map (beide undefined) → apply", shouldApplyFidelityWrite(undefined, undefined) === true);

// Sequentie-simulatie: model de store-guard met een token-map + score-map.
console.log("\nsequentie — twee fetches voor index 0, oudste landt later");
{
  const tokenMap = new Map<number, number>();
  const scoreMap = new Map<number, string>();
  const bump = (i: number) => { const t = (tokenMap.get(i) ?? 0) + 1; tokenMap.set(i, t); return t; };
  const write = (i: number, payload: string, token: number) => {
    if (!shouldApplyFidelityWrite(tokenMap.get(i), token)) return; // stale → drop
    scoreMap.set(i, payload);
  };

  const t1 = bump(0); // fetch A start
  const t2 = bump(0); // fetch B start (vervangt/her-scoort dezelfde index)
  write(0, "score-A", t1); // A komt later terug → moet gedropt worden
  write(0, "score-B", t2); // B is de actuele
  assert("alleen de nieuwste (B) landt", scoreMap.get(0) === "score-B", `kreeg ${scoreMap.get(0)}`);
  assert("token-map staat op t2", tokenMap.get(0) === t2 && t2 === 2);
  assert("oude token t1 is verouderd", t1 === 1 && t1 !== tokenMap.get(0));
}

console.log("\nsequentie — write na reset wordt gedropt");
{
  const tokenMap = new Map<number, number>();
  const scoreMap = new Map<number, string>();
  const bump = (i: number) => { const t = (tokenMap.get(i) ?? 0) + 1; tokenMap.set(i, t); return t; };
  const write = (i: number, payload: string, token: number) => {
    if (!shouldApplyFidelityWrite(tokenMap.get(i), token)) return;
    scoreMap.set(i, payload);
  };

  const t1 = bump(0);            // fetch start
  tokenMap.clear();              // resetFidelityScore() leegt de token-map
  write(0, "stale", t1);         // late terugkomst van de oude fetch
  assert("stale write na reset landt niet", scoreMap.get(0) === undefined);
}

console.log("\nsequentie — verschillende indices interfereren niet");
{
  const tokenMap = new Map<number, number>();
  const scoreMap = new Map<number, string>();
  const bump = (i: number) => { const t = (tokenMap.get(i) ?? 0) + 1; tokenMap.set(i, t); return t; };
  const write = (i: number, payload: string, token: number) => {
    if (!shouldApplyFidelityWrite(tokenMap.get(i), token)) return;
    scoreMap.set(i, payload);
  };
  const a = bump(0), b = bump(1);
  write(1, "B", b); write(0, "A", a);
  assert("index 0 → A", scoreMap.get(0) === "A");
  assert("index 1 → B", scoreMap.get(1) === "B");
}

// Regressie (review-bevinding #2): met een PER-INDEX teller die op reset terug
// naar 0 sprong, kreeg generatie N+1 dezelfde token (1) als de nog-in-flight
// generatie N → de stale score landde. Een GLOBALE monotone seq die de reset
// overleeft voorkomt dat. Hier gemodelleerd zoals de store het doet.
console.log("\nglobale monotone token — geen collisie tussen generaties na reset");
{
  let seq = 0; // overleeft reset (zoals fidelityTokenSeq)
  const tokenMap = new Map<number, number>();
  const scoreMap = new Map<number, string>();
  const bump = (i: number) => { seq += 1; tokenMap.set(i, seq); return seq; };
  const reset = () => { tokenMap.clear(); /* seq blijft bewust staan */ };
  const write = (i: number, payload: string, token: number) => {
    if (!shouldApplyFidelityWrite(tokenMap.get(i), token)) return;
    scoreMap.set(i, payload);
  };

  const t1 = bump(0);   // generatie 1 op index 0 (fetch traag)
  reset();              // user regenereert → map leeg, seq blijft
  const t2 = bump(0);   // generatie 2 op index 0
  assert("token niet hergebruikt na reset (t2 > t1)", t2 > t1 && t2 !== t1, `t1=${t1} t2=${t2}`);
  write(0, "gen1-stale", t1); // trage fetch uit gen 1 komt nu pas terug
  write(0, "gen2-fresh", t2);
  assert("stale gen-1 score landt NIET op gen-2 variant", scoreMap.get(0) === "gen2-fresh", `kreeg ${scoreMap.get(0)}`);
}

// Twee snel-opeenvolgende bumps op dezelfde index → unieke, oplopende tokens
// (geen collisie). Borgt de invariant die de race-guard nodig heeft.
console.log("\ntwee bumps zelfde index → unieke oplopende tokens");
{
  let seq = 0;
  const tokenMap = new Map<number, number>();
  const bump = (i: number) => { seq += 1; tokenMap.set(i, seq); return seq; };
  const a = bump(0);
  const b = bump(0);
  assert("opeenvolgende bumps zijn uniek + oplopend", b === a + 1 && a !== b);
  assert("map houdt de laatste token", tokenMap.get(0) === b);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
