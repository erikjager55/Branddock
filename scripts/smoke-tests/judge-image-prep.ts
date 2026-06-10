// Smoke — lp-feature-image-followups: judge-image downscaling (§9).
//
// Run: npx tsx scripts/smoke-tests/judge-image-prep.ts
import sharp from "sharp";
import { prepareJudgeImage } from "../../src/lib/brand-fidelity/judge-image";

let pass = 0;
let fail = 0;
function assert(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  PASS ${label}`); }
  else { fail++; console.error(`  FAIL ${label}`); }
}

async function main() {
  // klein beeld → ongewijzigd png-pad
  const small = await sharp({ create: { width: 320, height: 240, channels: 3, background: { r: 200, g: 220, b: 240 } } }).png().toBuffer();
  const smallOut = await prepareJudgeImage(small);
  assert("klein beeld passthrough (png)", smallOut.mediaType === "image/png" && smallOut.buffer.equals(small));

  // groot beeld (>4MB ruis-png) → jpeg ≤1024px en fors kleiner
  // Echte random-ruis: een deterministisch patroon comprimeert PNG naar <1MB
  // en mist dan de 4MB-drempel.
  const noise = Buffer.alloc(2600 * 2000 * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = Math.floor(Math.random() * 256);
  const big = await sharp(noise, { raw: { width: 2600, height: 2000, channels: 3 } }).png().toBuffer();
  assert(`fixture is echt groot (${(big.length / 1e6).toFixed(1)}MB > 4MB)`, big.length > 4_000_000);
  const bigOut = await prepareJudgeImage(big);
  const meta = await sharp(bigOut.buffer).metadata();
  assert("groot beeld → jpeg", bigOut.mediaType === "image/jpeg");
  assert(`gedownscaled (≤1024px, was 2600): ${meta.width}x${meta.height}`, (meta.width ?? 9999) <= 1024 && (meta.height ?? 9999) <= 1024);
  assert("ruim onder Anthropic-limiet", bigOut.buffer.length < 4_000_000);

  console.log(`\n${pass} PASS, ${fail} FAIL`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
