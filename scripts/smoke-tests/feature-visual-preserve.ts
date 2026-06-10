// Smoke — lp-feature-image-diversity Fase 5: feature-visual clobber-guard (R9).
//
// Run: npx tsx scripts/smoke-tests/feature-visual-preserve.ts
import {
  preserveFeatureVisuals,
  preserveFeatureVisualsOnSettings,
} from "../../src/features/campaigns/lib/feature-visual-preserve";

let pass = 0;
let fail = 0;
function assert(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  PASS ${label}`); }
  else { fail++; console.error(`  FAIL ${label}`); }
}
function group(title: string) { console.log(`\n── ${title}`); }

const tree = (urls: Array<string | null>, titles = ["A", "B", "C", "D"]) => ({
  content: [
    { type: "BrandHero", props: { headline: "H" } },
    {
      type: "FeatureSplit",
      props: { features: urls.map((u, i) => ({ title: titles[i], description: `d${i}`, imageUrl: u })) },
    },
  ],
});

group("puckData — non-leeg → leeg wordt beschermd");
{
  const current = tree(["/uploads/a.png", "/uploads/b.png", null, "/uploads/d.png"]);
  const incoming = tree([null, "", null, "/uploads/nieuw.png"]);
  const out = preserveFeatureVisuals(incoming, current);
  const feats = (out.content[1].props as { features: Array<{ imageUrl: string | null }> }).features;
  assert("geleegde slot 0 hersteld", feats[0].imageUrl === "/uploads/a.png");
  assert("geleegde slot 1 hersteld", feats[1].imageUrl === "/uploads/b.png");
  assert("slot 2 (was al leeg) blijft leeg", !feats[2].imageUrl);
  assert("nieuwe URL slot 3 passeert", feats[3].imageUrl === "/uploads/nieuw.png");
}

group("puckData — titel-mismatch (reorder) wordt NIET overgeplakt");
{
  const current = tree(["/uploads/a.png", null, null, null], ["A", "B", "C", "D"]);
  const incoming = tree([null, null, null, null], ["B", "A", "C", "D"]);
  const out = preserveFeatureVisuals(incoming, current);
  const feats = (out.content[1].props as { features: Array<{ imageUrl: string | null }> }).features;
  assert("geen cross-feature contaminatie bij reorder", feats.every((f) => !f.imageUrl));
}

group("puckData — incoming zonder features-array / ander component-type");
{
  const current = tree(["/uploads/a.png", null, null, null]);
  const incoming = { content: [{ type: "RichText", props: { content: "x" } }] };
  const out = preserveFeatureVisuals(incoming, current);
  assert("structuur-mismatch → incoming ongemoeid", out === incoming);
}

group("settings-chokepoint — puckData + structuredVariant");
{
  const existing = {
    puckData: tree(["/uploads/a.png", null, null, null]),
    structuredVariant: {
      hero: { headline: "H" },
      features: { items: [
        { heading: "A", body: "b", imageUrl: "/uploads/a.png" },
        { heading: "B", body: "b", imageUrl: null },
      ] },
    },
  };
  const incoming = {
    puckData: tree([null, null, null, null]),
    structuredVariant: {
      hero: { headline: "H" },
      features: { items: [
        { heading: "A", body: "b", imageUrl: null },
        { heading: "B", body: "b", imageUrl: "/uploads/nieuw-b.png" },
      ] },
    },
  };
  const out = preserveFeatureVisualsOnSettings(existing, incoming);
  const pd = out.puckData as ReturnType<typeof tree>;
  const feats = (pd.content[1].props as { features: Array<{ imageUrl: string | null }> }).features;
  assert("puckData slot 0 hersteld via chokepoint", feats[0].imageUrl === "/uploads/a.png");
  const sv = out.structuredVariant as { features: { items: Array<{ imageUrl: string | null }> } };
  assert("structuredVariant item 0 hersteld", sv.features.items[0].imageUrl === "/uploads/a.png");
  assert("structuredVariant nieuwe URL passeert", sv.features.items[1].imageUrl === "/uploads/nieuw-b.png");
}

group("settings-chokepoint — bewuste clear (existing leeg) passeert");
{
  const existing = { puckData: tree([null, null, null, null]) };
  const incoming = { puckData: tree([null, null, null, null]) };
  const out = preserveFeatureVisualsOnSettings(existing, incoming);
  assert("niets te beschermen → incoming-shape ongewijzigd", out.puckData === incoming.puckData);
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
