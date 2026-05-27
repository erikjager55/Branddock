/**
 * Smoke-test voor C3 — hard render-constraints per archetype.
 */
import {
  getRenderConstraints,
  RENDER_CONSTRAINTS_BY_ARCHETYPE,
  DEFAULT_RENDER_CONSTRAINTS,
  buildCopyConstraintsFragment,
} from "../../src/lib/landing-pages/render-constraints";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

group("C3 — RULER strict premium");
{
  const c = RENDER_CONSTRAINTS_BY_ARCHETYPE.RULER;
  assert("RULER no gradients", c.allowGradients === false);
  assert("RULER no shadow", c.allowShadow === "none");
  assert("RULER no emoji", c.allowEmoji === false);
  assert("RULER no exclamation", c.allowExclamationMarks === false);
  assert("RULER 0 accent colors", c.maxAccentColors === 0);
  assert("RULER respects scraped radius (no cap)", c.maxRadiusPx === 9999);
  assert("RULER sentence case", c.capitalisation === "sentence");
  assert("RULER dark-cinematic scrim (was solid-brand)", c.scrimStyle === "dark-cinematic");
  assert("RULER force flat cards", c.forceFlatCards === true);
}

group("C3 — JESTER lenient playful");
{
  const c = RENDER_CONSTRAINTS_BY_ARCHETYPE.JESTER;
  assert("JESTER gradients ok", c.allowGradients === true);
  assert("JESTER emoji ok", c.allowEmoji === true);
  assert("JESTER exclamation ok", c.allowExclamationMarks === true);
  assert("JESTER 3 accent colors", c.maxAccentColors === 3);
  assert("JESTER max radius 24", c.maxRadiusPx === 24);
}

group("C3 — alle 12 archetypes hebben volledige config");
{
  const archetypes = [
    "RULER","SAGE","MAGICIAN","CREATOR","LOVER","EXPLORER",
    "HERO","OUTLAW","INNOCENT","JESTER","REGULAR_GUY","CARETAKER",
  ] as const;
  for (const a of archetypes) {
    const c = RENDER_CONSTRAINTS_BY_ARCHETYPE[a];
    assert(`${a} sectionBlueprint non-empty`, c.sectionBlueprint.length >= 4);
    assert(`${a} targetSectionCount > 0`, c.targetSectionCount > 0);
    assert(`${a} maxContentWidth >= 1200`, c.maxContentWidth >= 1200);
  }
}

group("C3 — getRenderConstraints null archetype → defaults");
{
  const c = getRenderConstraints(null, null);
  assert("uses defaults", c === DEFAULT_RENDER_CONSTRAINTS || c.allowGradients === DEFAULT_RENDER_CONSTRAINTS.allowGradients);
}

group("C11 — getRenderConstraints MINIMAL forceert flat-cards ook bij JESTER");
{
  const c = getRenderConstraints("JESTER", "MINIMAL");
  assert("flat-cards forced for MINIMAL", c.forceFlatCards === true);
  // Andere props van JESTER blijven
  assert("emoji still ok (uit JESTER base)", c.allowEmoji === true);
}

group("C11 — EDITORIAL ook flat-cards force");
{
  const c = getRenderConstraints("HERO", "EDITORIAL");
  assert("EDITORIAL flat-cards forced", c.forceFlatCards === true);
}

group("C11 — COMMERCIAL behoudt archetype-default");
{
  const c = getRenderConstraints("JESTER", "COMMERCIAL");
  assert("COMMERCIAL JESTER flat-cards UNCHANGED", c.forceFlatCards === false);
}

group("C3 — buildCopyConstraintsFragment RULER");
{
  const fragment = buildCopyConstraintsFragment(RENDER_CONSTRAINTS_BY_ARCHETYPE.RULER);
  assert("contains 'Geen emoji'", fragment.includes("Geen emoji"));
  assert("contains 'Geen uitroeptekens'", fragment.includes("Geen uitroeptekens"));
  assert("contains 'sentence case'", fragment.includes("sentence case"));
}

group("C3 — buildCopyConstraintsFragment JESTER");
{
  const fragment = buildCopyConstraintsFragment(RENDER_CONSTRAINTS_BY_ARCHETYPE.JESTER);
  assert("JESTER no emoji-ban", !fragment.includes("Geen emoji"));
  assert("JESTER no exclamation-ban", !fragment.includes("Geen uitroeptekens"));
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
