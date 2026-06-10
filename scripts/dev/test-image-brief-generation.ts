/**
 * Dev-verificatie Fase 2 (lp-feature-image-diversity): produceert de copy-LLM
 * bruikbare, onderling diverse imageBriefs?
 *
 * Roept generateLandingPageVariant 1x live aan (Anthropic STRUCTURED) met een
 * Napking-achtige brand-context en asserteert: brief op hero + elke feature,
 * >= 3 verschillende sceneTypes, geen identieke subjects, max 1 person-scene.
 *
 * Run: npx tsx scripts/dev/test-image-brief-generation.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"] });

async function main() {
  // Dynamic import ná env-load: variant-generator trekt transitief prisma.ts
  // binnen, die DATABASE_URL al bij module-load eist (import-hoisting).
  const { generateLandingPageVariant } = await import(
    "../../src/lib/landing-pages/variant-generator"
  );
  const started = Date.now();
  const result = await generateLandingPageVariant({
    brand: {
      brandName: "Napking",
      brandEssence: "Textielbeheer voor restaurants",
      brandMission:
        "HACCP-compliant reiniging, 24/7 voorraadbeheer en duurzaam textiel in één abonnement voor restaurants in de Randstad.",
    },
    persona: {
      name: "Restauranteigenaar",
      role: "Eigenaar/bedrijfsleider middelgroot restaurant",
      painPoints: [
        "Te veel of te weinig schoon textiel op piekmomenten",
        "Wasserij levert te laat of met vlekken",
        "Geen transparantie over duurzaamheidscertificering",
      ],
    },
    userPrompt:
      "Landing page voor het textiel-abonnement: HACCP-compliant reiniging, automatisch voorraadbeheer, duurzaam (GOTS/Oeko-Tex/Fairtrade) textiel en 100% elektrische levering, ook in weekends.",
    locale: "nl-NL",
    includeProblem: true,
    includePricing: false,
  });

  const v = result.variant;
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\nGeneratie OK in ${secs}s — headline: "${v.hero.headline}"`);

  let pass = 0;
  let fail = 0;
  const assert = (label: string, cond: boolean) => {
    if (cond) { pass++; console.log(`  PASS ${label}`); }
    else { fail++; console.error(`  FAIL ${label}`); }
  };

  const briefs = v.features.items.map((f) => f.imageBrief).filter((b): b is NonNullable<typeof b> => Boolean(b));
  console.log("\nHero-brief:", JSON.stringify(v.hero.imageBrief));
  briefs.forEach((b, i) => console.log(`Feature ${i}:`, JSON.stringify(b)));

  assert("hero heeft imageBrief", Boolean(v.hero.imageBrief));
  assert("elke feature heeft imageBrief", briefs.length === v.features.items.length);
  const sceneTypes = new Set(briefs.map((b) => b.sceneType));
  assert(`>= 3 verschillende sceneTypes (gevonden: ${[...sceneTypes].join(", ")})`, sceneTypes.size >= 3);
  const subjects = briefs.map((b) => b.subject.toLowerCase().trim());
  assert("geen identieke subjects", new Set(subjects).size === subjects.length);
  const personCount = briefs.filter((b) => b.sceneType === "person").length;
  assert(`max 1 person-scene (gevonden: ${personCount})`, personCount <= 1);
  const posed = briefs.some((b) => /gekruiste armen|arms crossed|frontaal poserend/i.test(`${b.subject} ${b.composition}`));
  assert("geen frontale portret-pose in briefs", !posed);

  console.log(`\n${pass} PASS, ${fail} FAIL`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Live generatie faalde:", err instanceof Error ? err.message : err);
  process.exit(1);
});
