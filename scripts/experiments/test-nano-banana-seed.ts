/**
 * Empirische pre-check Fase 3 (lp-feature-image-diversity): honoreert
 * fal-ai/nano-banana-pro de seed-param en num_images>1?
 *
 * Test: A (seed 12345) vs B (seed 12345) vs C (seed 99999), zelfde prompt.
 * Seed gehonoreerd => A en B (vrijwel) identiek, C wijkt af. Plus één call
 * met numImages=2 => 2 images terug of niet. Kosten: ~4 x $0.13.
 *
 * Run: npx tsx scripts/experiments/test-nano-banana-seed.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"] });

import { createHash } from "node:crypto";

const PROMPT =
  "Editorial photograph of a stack of freshly pressed white restaurant napkins on a stainless steel counter, soft natural side light, shallow depth of field.";

async function fetchHash(url: string): Promise<{ hash: string; bytes: number }> {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  return { hash: createHash("sha256").update(buf).digest("hex").slice(0, 16), bytes: buf.length };
}

async function main() {
  const { generateFalImage } = await import("../../src/lib/integrations/fal/fal-client");
  const model = "fal-ai/nano-banana-pro";

  console.log("Call A (seed 12345)…");
  const a = await generateFalImage(model, PROMPT, { imageSize: "landscape_4_3", numImages: 1, seed: 12345 });
  console.log("Call B (seed 12345)…");
  const b = await generateFalImage(model, PROMPT, { imageSize: "landscape_4_3", numImages: 1, seed: 12345 });
  console.log("Call C (seed 99999)…");
  const c = await generateFalImage(model, PROMPT, { imageSize: "landscape_4_3", numImages: 1, seed: 99999 });
  console.log("Call D (numImages: 2, geen seed)…");
  const d = await generateFalImage(model, PROMPT, { imageSize: "landscape_4_3", numImages: 2 });

  const [ha, hb, hc] = await Promise.all([
    fetchHash(a.images[0]!.url),
    fetchHash(b.images[0]!.url),
    fetchHash(c.images[0]!.url),
  ]);

  console.log(`\nA seed-echo: ${a.seed} | hash ${ha.hash} (${ha.bytes}b)`);
  console.log(`B seed-echo: ${b.seed} | hash ${hb.hash} (${hb.bytes}b)`);
  console.log(`C seed-echo: ${c.seed} | hash ${hc.hash} (${hc.bytes}b)`);
  console.log(`D images teruggekregen: ${d.images.length} (gevraagd: 2)`);
  console.log(`\nA==B (zelfde seed, zelfde hash): ${ha.hash === hb.hash}`);
  console.log(`A==C (andere seed, zelfde hash): ${ha.hash === hc.hash}`);
  console.log(`Byte-groottes A/B/C: ${ha.bytes}/${hb.bytes}/${hc.bytes}`);
  console.log("\nVoor visuele check: ");
  console.log("A:", a.images[0]!.url);
  console.log("B:", b.images[0]!.url);
  console.log("C:", c.images[0]!.url);
}

main().catch((err) => {
  console.error("Experiment faalde:", err instanceof Error ? err.message : err);
  process.exit(1);
});
