// Smoke: security MEDIUM-cluster — deepSet prototype-pollution guard (M6).
//   npx tsx scripts/smoke-tests/security-medium.ts   (no DB needed — pure util)
import { deepSet } from "@/lib/utils/deep-set";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean) {
  if (cond) pass++; else { fail++; console.log(`  [FAIL] ${label}`); }
}

// M6 — prototype-pollution segments are rejected (throws).
for (const evil of ["__proto__.polluted", "a.constructor.x", "a.prototype.y", "__proto__[0]"]) {
  let threw = false;
  try { deepSet({}, evil, "x"); } catch { threw = true; }
  ok(`deepSet rejects "${evil}"`, threw);
}

// Object.prototype must NOT be polluted by an attempted attack.
try { deepSet({} as Record<string, unknown>, "__proto__.polluted", "yes"); } catch { /* expected */ }
ok("Object.prototype is not polluted", ({} as Record<string, unknown>).polluted === undefined);

// Normal nested + array paths still work.
const o: Record<string, unknown> = {};
deepSet(o, "a.b.c", 1);
ok("normal nested set works", (o.a as { b: { c: number } }).b.c === 1);
deepSet(o, "list[0].name", "x");
ok("array-index set works", ((o.list as { name: string }[])[0]).name === "x");

console.log(`\nsecurity-medium: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
