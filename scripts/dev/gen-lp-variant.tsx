/**
 * Dev-tool — draait de ECHTE variant-generator (Anthropic) voor een brand-
 * context en schrijft de gevalideerde variant naar /tmp/variant-<slug>.json,
 * zodat render-lp-screenshot.tsx 'm kan renderen met ECHTE AI-copy (verificatie
 * van de copy-laag P1/P4/P11). Print een copy-samenvatting.
 *
 * Run: ANTHROPIC_API_KEY=... npx tsx scripts/dev/gen-lp-variant.tsx
 */
import fs from "fs";
import { generateLandingPageVariant } from "../../src/lib/landing-pages/variant-generator";

async function main() {
  const res = await generateLandingPageVariant({
    brand: {
      brandName: "Zwarthout",
      brandPromise: "Verkoolde gevelbekleding (Shou Sugi Ban) die een leven lang zwart blijft — onderhoudsvrij, weerbestendig, brandvertragend.",
      brandToneOfVoice: "Ingetogen, ambachtelijk, architectonisch. Geen verkooptaal; rust en vakmanschap.",
      brandColors: "Diep charcoal #212529, burnt orange #E06000 accent, off-white #F8F9FA",
      targetAudience: "Architecten en eigenaren die een premium, onderhoudsvrije houten gevel zoeken",
      industry: "Gevelbekleding / bouwmaterialen / architectuur",
    },
    persona: {
      name: "Architect Daan",
      role: "Architect bij een middelgroot bureau",
      painPoints: [
        "Standaard gevelhout vraagt om de 3-5 jaar onderhoud",
        "Onregelmatige vergrijzing verstoort het ontwerp",
        "Brandeisen voor hoogbouw zijn lastig te halen met hout",
      ],
      goals: [
        "Een gevel die decennialang strak zwart blijft zonder onderhoud",
        "Materiaal dat aan brandklasse-eisen voldoet",
        "Een duurzame, circulaire keuze richting opdrachtgever kunnen verantwoorden",
      ],
    },
    userPrompt:
      "Genereer een premium landingspagina voor Zwarthout's verkoolde gevelbekleding, gericht op architecten die een onderhoudsvrije, brandveilige en circulaire zwarte houten gevel zoeken. Laagdrempelige eerste actie: houtstalen aanvragen.",
    locale: "nl-NL",
    includeProblem: true,
    includePricing: false,
    archetype: "CREATOR",
    layoutStyle: "EXPERIENTIAL",
  });

  const v = res.variant;
  fs.writeFileSync("/tmp/variant-zwart.json", JSON.stringify(v, null, 2));
  console.log("=== HERO ===");
  console.log("eyebrow :", v.hero.eyebrow ?? "(geen)");
  console.log("headline:", v.hero.headline, `(${v.hero.headline.length} tekens)`);
  console.log("subhead :", v.hero.subhead);
  console.log("CTA     :", v.hero.primaryCta);
  console.log("\n=== PROBLEM ===");
  console.log(v.problem?.heading);
  (v.problem?.painBullets ?? []).forEach((b) => console.log(" -", b));
  console.log("\n=== FEATURES (moeten hero-pilaren bewijzen) ===");
  v.features.items.forEach((f) => console.log(` • ${f.heading} — ${f.body}`));
  console.log("\n=== SOCIAL PROOF ===");
  const t = v.socialProof.testimonials[0];
  console.log(`"${t.quote}" — ${t.authorName}, ${t.authorRole} @ ${t.authorCompany}${t.outcome ? ` (${t.outcome})` : ""}`);
  console.log("\n=== FINAL CTA ===");
  console.log(v.finalCta.heading, "|", v.finalCta.primaryCta, "|", v.finalCta.riskReducer);
  console.log("\nWROTE /tmp/variant-zwart.json");
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); });
