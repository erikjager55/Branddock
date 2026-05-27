/**
 * Smoke-test voor diff-merge defensive null-guards.
 * Regression: PageDiffPreviewModal crashte met 'Cannot read properties of
 * undefined (reading 'content')' wanneer auto-iterate response een
 * proposedPuckData zonder valid content-array gaf.
 */
import { diffComponentIds } from "../../src/lib/landing-pages/diff-merge";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

const validItem = { type: "BrandHero", props: { id: "h1", headline: "x" } };
const validData = { content: [validItem], root: {} };

group("diff-merge — defensive guards");
assert("null current → []", diffComponentIds(null, validData).length === 0);
assert("null proposed → []", diffComponentIds(validData, null).length === 0);
assert("undefined current → []", diffComponentIds(undefined, validData).length === 0);
assert(
  "current met undefined content → []",
  diffComponentIds({ content: undefined as never, root: {} } as never, validData).length === 0,
);
assert(
  "proposed met undefined content → []",
  diffComponentIds(validData, { content: undefined as never, root: {} } as never).length === 0,
);
assert(
  "items met undefined props → no crash",
  diffComponentIds(
    { content: [{ type: "X" } as never], root: {} },
    { content: [{ type: "X" } as never], root: {} },
  ).length === 0,
);

group("diff-merge — happy path nog werkend");
{
  const proposed = {
    content: [{ type: "BrandHero", props: { id: "h1", headline: "y" } }],
    root: {},
  };
  const diff = diffComponentIds(validData, proposed);
  assert("detecteert wijziging in headline", diff.length === 1 && diff[0] === "h1");

  const sameDiff = diffComponentIds(validData, validData);
  assert("identieke trees → []", sameDiff.length === 0);
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
