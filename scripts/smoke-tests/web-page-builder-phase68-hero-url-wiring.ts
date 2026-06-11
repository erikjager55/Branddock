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

console.log("\nonlyIfEmpty (self-heal fill-only) — bestaande URL niet overschrijven");
{
  const settings: Record<string, unknown> = {
    puckData: { content: [{ type: "BrandHero", props: { heroVisualUrl: "https://cdn.example.com/user-keuze.png" } }] },
    structuredVariant: { hero: { heroVisualUrl: "https://cdn.example.com/user-keuze.png" } },
  };
  const { patched } = applyHeroUrlToSettings(settings, URL, { onlyIfEmpty: true });
  const pd = settings.puckData as { content: Array<{ type: string; props: Record<string, unknown> }> };
  const sv = settings.structuredVariant as { hero: Record<string, unknown> };
  assert("patched=false bij gevulde hero", patched === false);
  assert("puckData-hero behoudt user-keuze", pd.content[0].props.heroVisualUrl === "https://cdn.example.com/user-keuze.png");
  assert("structuredVariant behoudt user-keuze", sv.hero.heroVisualUrl === "https://cdn.example.com/user-keuze.png");
}

console.log("\nonlyIfEmpty — lege hero wordt wél gevuld");
{
  const settings: Record<string, unknown> = {
    puckData: { content: [{ type: "BrandHero", props: { heroVisualUrl: "" } }] },
    structuredVariant: { hero: {} },
  };
  const { patched } = applyHeroUrlToSettings(settings, URL, { onlyIfEmpty: true });
  const pd = settings.puckData as { content: Array<{ type: string; props: Record<string, unknown> }> };
  const sv = settings.structuredVariant as { hero: Record<string, unknown> };
  assert("patched=true bij lege hero", patched === true);
  assert("lege puckData-hero gevuld", pd.content[0].props.heroVisualUrl === URL);
  assert("lege structuredVariant-hero gevuld", sv.hero.heroVisualUrl === URL);
}

console.log("\nonlyIfEmpty — gemengd: gevulde BrandHero blijft, lege wordt gevuld");
{
  const settings: Record<string, unknown> = {
    puckData: { content: [
      { type: "BrandHero", props: { heroVisualUrl: "https://cdn.example.com/user-keuze.png" } },
      { type: "BrandHero", props: {} },
    ] },
  };
  const { patched } = applyHeroUrlToSettings(settings, URL, { onlyIfEmpty: true });
  const pd = settings.puckData as { content: Array<{ type: string; props: Record<string, unknown> }> };
  assert("patched=true (één van twee gevuld)", patched === true);
  assert("gevulde hero ongemoeid", pd.content[0].props.heroVisualUrl === "https://cdn.example.com/user-keuze.png");
  assert("lege hero gevuld", pd.content[1].props.heroVisualUrl === URL);
}

console.log("\ndefault (geen opts) — overwrite-gedrag ongewijzigd");
{
  const settings: Record<string, unknown> = {
    puckData: { content: [{ type: "BrandHero", props: { heroVisualUrl: "https://cdn.example.com/oud.png" } }] },
  };
  const { patched } = applyHeroUrlToSettings(settings, URL);
  const pd = settings.puckData as { content: Array<{ type: string; props: Record<string, unknown> }> };
  assert("patched=true", patched === true);
  assert("overwrite zonder opts", pd.content[0].props.heroVisualUrl === URL);
}

console.log("\npuckPatched-discriminator — rij-write gate (review 2026-06-11)");
{
  // puckPatched gate't de hero-image-rij-upsert in patchHeroVisualUrl: de rij
  // spiegelt de GERENDERDE hero en mag dus alleen geschreven worden wanneer de
  // BrandHero in puckData daadwerkelijk deze URL kreeg.
  const both: Record<string, unknown> = {
    puckData: { content: [{ type: "BrandHero", props: {} }] },
    structuredVariant: { hero: {} },
  };
  const rBoth = applyHeroUrlToSettings(both, URL);
  assert("beide doelen → puckPatched=true", rBoth.patched === true && rBoth.puckPatched === true);

  const svOnly: Record<string, unknown> = { structuredVariant: { hero: {} } };
  const rSv = applyHeroUrlToSettings(svOnly, URL);
  assert("alleen sv-tak → patched=true / puckPatched=false", rSv.patched === true && rSv.puckPatched === false);

  // Het load-bearing asymmetrische geval: fill-only heal terwijl puckData een
  // handmatige keuze vasthoudt en alleen sv leeg is. patched=true (sv gevuld)
  // maar puckPatched=false → de rij van de handmatige keuze blijft onaangetast.
  const manualPick: Record<string, unknown> = {
    puckData: { content: [{ type: "BrandHero", props: { heroVisualUrl: "https://cdn.example.com/user-keuze.png" } }] },
    structuredVariant: { hero: {} },
  };
  const rManual = applyHeroUrlToSettings(manualPick, URL, { onlyIfEmpty: true });
  const mpd = manualPick.puckData as { content: Array<{ props: Record<string, unknown> }> };
  assert("fill-only + gevulde puck-hero → patched=true / puckPatched=false", rManual.patched === true && rManual.puckPatched === false);
  assert("handmatige puck-keuze ongemoeid", mpd.content[0].props.heroVisualUrl === "https://cdn.example.com/user-keuze.png");

  const bothEmpty: Record<string, unknown> = {
    puckData: { content: [{ type: "BrandHero", props: {} }] },
    structuredVariant: { hero: {} },
  };
  const rEmpty = applyHeroUrlToSettings(bothEmpty, URL, { onlyIfEmpty: true });
  assert("fill-only + beide leeg → puckPatched=true", rEmpty.patched === true && rEmpty.puckPatched === true);

  const rNone = applyHeroUrlToSettings({}, URL);
  assert("geen doelen → puckPatched=false", rNone.patched === false && rNone.puckPatched === false);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
