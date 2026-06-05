/**
 * Smoke voor C1 (vocabulary-rails) + C2 (voice few-shot) in variant-generator prompt.
 */
import { buildLandingPageVariantPrompt } from "../../src/lib/landing-pages/variant-generator";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

const baseParams = {
  brand: { brandName: "LINFI" },
  userPrompt: "Maak een LP over vloerluiken op maat",
  archetype: "RULER" as const,
  layoutStyle: "MINIMAL" as const,
};

group("C1 — vocabulary in system-prompt wanneer beide arrays gevuld");
{
  const result = buildLandingPageVariantPrompt({
    ...baseParams,
    vocabularyDo: ["op maat", "millimeter nauwkeurig", "vakmanschap"],
    vocabularyDont: ["revolutionary", "game-changing", "premium experience"],
  });
  assert("system bevat VOCABULAIRE-block", result.system.includes("VOCABULAIRE-DISCIPLINE"));
  assert("do-words aanwezig", result.system.includes('"op maat"'));
  assert("dont-words aanwezig", result.system.includes('"revolutionary"'));
}

group("C1 — geen vocab-block wanneer arrays leeg");
{
  const result = buildLandingPageVariantPrompt(baseParams);
  assert("geen VOCABULAIRE-block", !result.system.includes("VOCABULAIRE-DISCIPLINE"));
}

// DTS C1 verfijnd (variant-generator r.178-182): vocab-rails activeren nu bij
// ≥1 item en renderen per zijde alleen wat gevuld is — de oude ≥3-in-BEIDE-
// drempel liet sparse-vocab merken de rails missen + lager scoren op Merkstijl.
group("C1 — vocab-block ook bij alleen Do-lijst (render per zijde)");
{
  const result = buildLandingPageVariantPrompt({
    ...baseParams,
    vocabularyDo: ["op maat", "vakmanschap", "millimeter"],
    vocabularyDont: [],
  });
  assert("alleen Do → vocab-block aanwezig", result.system.includes("VOCABULAIRE-DISCIPLINE"));
  assert("alleen Do → Do-regel aanwezig", result.system.includes('"op maat"'));
  assert("alleen Do → geen Vermijd-regel", !result.system.includes("Vermijd deze"));
}

group("C1 — vocab-block ook bij korte lijsten (≥1 item per zijde)");
{
  const result = buildLandingPageVariantPrompt({
    ...baseParams,
    vocabularyDo: ["op maat"],
    vocabularyDont: ["premium"],
  });
  assert("1+1 items → vocab-block aanwezig", result.system.includes("VOCABULAIRE-DISCIPLINE"));
  assert("1+1 items → Do + Vermijd beide aanwezig",
    result.system.includes('"op maat"') && result.system.includes('"premium"'));
}

group("C2 — voice-sample in system-prompt");
{
  const sample =
    "Welkom bij LINFI, waar vakmanschap en techniek samen komen. Onze vloerluiken worden op maat gemaakt — millimeter nauwkeurig — voor architecten en woningeigenaren die geen genoegen nemen met standaard.";
  const result = buildLandingPageVariantPrompt({
    ...baseParams,
    voiceSample: sample,
  });
  assert("system bevat VOICE-VOORBEELD", result.system.includes("VOICE-VOORBEELD"));
  assert("sample-tekst aanwezig", result.system.includes("Welkom bij LINFI"));
  assert("sample-tekst eindigt", result.system.includes("genoegen nemen met standaard"));
}

group("C2 — geen voice-block wanneer sample te kort");
{
  const result = buildLandingPageVariantPrompt({
    ...baseParams,
    voiceSample: "Te kort.",
  });
  assert("te kort → geen voice-block", !result.system.includes("VOICE-VOORBEELD"));
}

group("C2 — geen voice-block wanneer null");
{
  const result = buildLandingPageVariantPrompt({
    ...baseParams,
    voiceSample: null,
  });
  assert("null → geen voice-block", !result.system.includes("VOICE-VOORBEELD"));
}

group("C1+C2 combined LINFI scenario");
{
  const result = buildLandingPageVariantPrompt({
    ...baseParams,
    vocabularyDo: ["op maat", "vakmanschap", "millimeter nauwkeurig", "veiligheid"],
    vocabularyDont: ["revolutionary", "innovative", "premium experience", "best-in-class"],
    voiceSample:
      "LINFI bouwt al meer dan twintig jaar vloerluiken op maat. Onze klanten zijn architecten en bouwbedrijven die geen genoegen nemen met standaard maten. Elk vloerluik wordt millimeter-nauwkeurig afgewerkt — passend bij de afmetingen van het project.",
  });
  assert("vocab + voice beide aanwezig",
    result.system.includes("VOCABULAIRE-DISCIPLINE") && result.system.includes("VOICE-VOORBEELD"));
  assert("brand-archetype RULER ook nog", result.system.includes("RULER"));
  assert("layoutStyle MINIMAL ook nog", result.system.includes("MINIMAL"));
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
