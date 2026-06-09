/**
 * [DET] Phase 68 — image-source-follow-up: hero-URL-wiring transform.
 *
 * `applyHeroUrlToSettings` is het hart van de gedeelde `patchHeroVisualUrl`-helper
 * die generate-visual / -compose / -trained gebruiken om een geüploade image als
 * landing-page-hero te wiren (puckData.BrandHero + structuredVariant.hero). Vóór
 * deze fix misten compose/trained dit → orphaned image. Hier puur getest (geen DB).
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase68-hero-url-wiring.ts
 */
import { applyHeroUrlToSettings } from "../../src/lib/deliverable/patch-hero-visual";

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}

const URL = "https://cdn.example.com/canvas-visual-compose-abc-123-0.png";

console.log("\nbeide doelen aanwezig → beide gezet, patched=true");
{
  const settings: Record<string, unknown> = {
    puckData: { content: [{ type: "BrandHero", props: { headline: "x" } }, { type: "FeatureSplit", props: {} }] },
    structuredVariant: { hero: { headline: "x" } },
  };
  const { patched } = applyHeroUrlToSettings(settings, URL);
  const pd = settings.puckData as { content: Array<{ type: string; props: Record<string, unknown> }> };
  const sv = settings.structuredVariant as { hero: Record<string, unknown> };
  assert("patched=true", patched === true);
  assert("BrandHero.props.heroVisualUrl gezet", pd.content[0].props.heroVisualUrl === URL);
  assert("FeatureSplit ONgewijzigd", pd.content[1].props.heroVisualUrl === undefined);
  assert("structuredVariant.hero.heroVisualUrl gezet", sv.hero.heroVisualUrl === URL);
}

console.log("\nmeerdere BrandHero-blocks → allemaal gezet");
{
  const settings: Record<string, unknown> = {
    puckData: { content: [{ type: "BrandHero", props: {} }, { type: "BrandHero", props: {} }] },
  };
  const { patched } = applyHeroUrlToSettings(settings, URL);
  const pd = settings.puckData as { content: Array<{ props: Record<string, unknown> }> };
  assert("patched=true", patched === true);
  assert("beide BrandHero-blocks gezet", pd.content[0].props.heroVisualUrl === URL && pd.content[1].props.heroVisualUrl === URL);
}

console.log("\nalleen structuredVariant.hero → patched via sv-tak");
{
  const settings: Record<string, unknown> = { structuredVariant: { hero: {} } };
  const { patched } = applyHeroUrlToSettings(settings, URL);
  const sv = settings.structuredVariant as { hero: Record<string, unknown> };
  assert("patched=true", patched === true);
  assert("sv.hero.heroVisualUrl gezet", sv.hero.heroVisualUrl === URL);
}

console.log("\ngeen BrandHero + geen structuredVariant → patched=false (geen write)");
{
  const settings: Record<string, unknown> = { puckData: { content: [{ type: "FeatureSplit", props: {} }] } };
  const { patched } = applyHeroUrlToSettings(settings, URL);
  assert("patched=false", patched === false);
}

console.log("\nlege/ontbrekende settings → patched=false, geen throw");
{
  assert("settings {} → false", applyHeroUrlToSettings({}, URL).patched === false);
  assert("puckData zonder content → false", applyHeroUrlToSettings({ puckData: {} }, URL).patched === false);
  assert("structuredVariant zonder hero → false", applyHeroUrlToSettings({ structuredVariant: {} }, URL).patched === false);
  assert("BrandHero zonder props → false (geen crash)", applyHeroUrlToSettings({ puckData: { content: [{ type: "BrandHero" }] } }, URL).patched === false);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
