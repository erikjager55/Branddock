/**
 * Dev-tool — verifieert de AI-feature-beeld-gen CORE (fal.ai) end-to-end:
 * genereert per feature (cap 4) een materiaal-shot, vult /tmp/variant-zwart.json,
 * zodat render-lp-screenshot.tsx de pagina met ECHTE AI-feature-beelden toont.
 * (Test de gen+model-selectie; de auth-gated route zelf = browser-flow.)
 *
 * Run: export $(grep FAL_KEY .env.local|xargs); npx tsx scripts/dev/gen-feature-visuals-test.tsx
 */
import fs from "fs";
import { generateFalImage } from "../../src/lib/integrations/fal/fal-client";
import { selectModelForStyle } from "../../src/lib/ai/visual-brief-prompts";
import type { LandingPageVariantContent } from "../../src/lib/landing-pages/variant-schema";

const PHOTO = "Dark, moody, atmospheric editorial photography with strong contrast; charred timber (Shou Sugi Ban) material, architectural context; no text, no UI, no logo.";

async function main() {
  const path = "/tmp/variant-zwart.json";
  const v = JSON.parse(fs.readFileSync(path, "utf8")) as LandingPageVariantContent;
  const modelId = selectModelForStyle(null, { contentTypeId: "landing-page", hasTrainedLora: false });
  console.log("model:", modelId);

  const items = v.features.items.slice(0, 4);
  const urls = await Promise.all(
    items.map(async (f, i) => {
      const prompt = `Editorial feature image illustrating "${f.heading}" — ${f.body}. ${PHOTO}`;
      try {
        const r = await generateFalImage(modelId, prompt, { imageSize: "landscape_4_3", numImages: 1 });
        const url = r.images?.[0]?.url ?? null;
        console.log(`feature[${i}] ${f.heading}: ${url ? "OK" : "FAIL"}`);
        return url;
      } catch (e) {
        console.error(`feature[${i}] FAIL:`, e instanceof Error ? e.message : e);
        return null;
      }
    }),
  );

  v.features.items = v.features.items.map((it, i) => (urls[i] ? { ...it, imageUrl: urls[i] as string } : it));
  // hero leeg laten zodat de harness de placeholder-hero injecteert (we testen features).
  fs.writeFileSync(path, JSON.stringify(v, null, 2));
  console.log(`\nWROTE ${path} — ${urls.filter(Boolean).length}/${items.length} feature-beelden`);
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); });
