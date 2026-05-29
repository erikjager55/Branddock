/**
 * One-off: classify archetype voor LINFI workspace + persist.
 * Run: DATABASE_URL=... npx tsx scripts/classify-linfi-archetype.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { prisma } from "../src/lib/prisma";
import { ensureBrandArchetype } from "../src/lib/landing-pages/ensure-archetype";
import { assembleCanvasContext } from "../src/lib/ai/canvas-context";

const WORKSPACE_ID = "cmnixs78z002g44msjvlyhiqb";
const DELIVERABLE_ID = "cmpn3ojl6002i7tc9ptimsr7d";

async function main() {
  const ctx = await assembleCanvasContext(DELIVERABLE_ID, WORKSPACE_ID);
  console.log(`[classify] current archetype: ${ctx.brandTokens.archetype ?? "(null)"}`);
  console.log(`[classify] brand fields: name=${ctx.brand.brandName} purpose=${!!ctx.brand.brandPurpose} essence=${!!ctx.brand.brandEssence} personality=${!!ctx.brand.brandPersonality}`);

  const result = await ensureBrandArchetype(
    WORKSPACE_ID,
    ctx.brandTokens.archetype ?? null,
    ctx.brand,
  );
  console.log(`[classify] archetype=${result.archetype} classified=${result.classified} confidence=${result.confidence ?? "n/a"}`);

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
