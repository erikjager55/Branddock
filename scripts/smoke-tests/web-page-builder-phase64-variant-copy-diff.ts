/**
 * Smoke-test voor de before/after copy-diff (P2a — auto-iterate-voorstel).
 *
 * diffVariantCopy() vergelijkt twee landing-page-varianten en geeft per gewijzigd
 * tekstveld {label, before, after}. Ongewijzigde velden komen NIET terug.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase64-variant-copy-diff.ts
 */
import { diffVariantCopy } from "../../src/lib/landing-pages/variant-copy-diff";

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}

const base = {
  hero: { headline: "Oud", subhead: "Sub", eyebrow: "", primaryCta: "Start" },
  trust: { items: [{ label: "A" }, { label: "B" }] },
  problem: { heading: "P", bridgingSentence: "brug", painBullets: ["x", "y"] },
  features: { sectionHeading: "F", items: [{ heading: "F1", body: "b1" }, { heading: "F2", body: "b2" }] },
  socialProof: { testimonials: [{ quote: "q1" }] },
  faq: { items: [{ question: "v1", answer: "a1" }] },
  finalCta: { heading: "Klaar?", primaryCta: "Go", riskReducer: "geen risk" },
};

console.log("\nidentiek → geen changes");
assert("0 wijzigingen bij identieke variant", diffVariantCopy(base, JSON.parse(JSON.stringify(base))).length === 0);

console.log("\nheadline + feature-body gewijzigd");
const after = JSON.parse(JSON.stringify(base));
after.hero.headline = "Nieuw";
after.features.items[1].body = "b2-nieuw";
const d = diffVariantCopy(base, after);
assert("2 wijzigingen", d.length === 2, String(d.length));
assert("hero headline gedetecteerd (before/after)", d.some((c) => c.label.includes("Hero — headline") && c.before === "Oud" && c.after === "Nieuw"));
assert("feature 2 tekst gedetecteerd", d.some((c) => c.label === "Feature 2 — tekst" && c.after === "b2-nieuw"));
assert("ongewijzigde subhead NIET in diff", !d.some((c) => c.label.includes("subhead")));

console.log("\narray-lengte-verschil (bullet toegevoegd)");
const after2 = JSON.parse(JSON.stringify(base));
after2.problem.painBullets = ["x", "y", "z"];
const d2 = diffVariantCopy(base, after2);
assert("nieuwe bullet 3 gedetecteerd (before leeg)", d2.some((c) => c.label === "Probleem — bullet 3" && c.before === "" && c.after === "z"));

console.log("\nnull/undefined-velden veilig");
const d3 = diffVariantCopy({ hero: { headline: "A" } }, { hero: { headline: null } } as never);
assert("headline → null telt als wijziging (A→leeg)", d3.some((c) => c.label.includes("headline") && c.before === "A" && c.after === ""));
assert("ontbrekende secties crashen niet", Array.isArray(diffVariantCopy({}, {})));
assert("leeg→leeg geen wijziging", diffVariantCopy({ hero: { eyebrow: "" } }, { hero: { eyebrow: undefined } }).length === 0);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
