/**
 * Diagnostische test (geen app-wijziging): reproduceert de hero-image-generatie
 * van de LP-flow in isolatie, getimed. Test of het 16:9-heromodel werkt én of
 * het binnen de 75s client-timeout (LandingPageGenerateBlock.tsx:435) valt.
 *
 * Run: DATABASE_URL=... npx tsx scripts/dev/test-hero-image-gen.ts
 */
import 'dotenv/config';
import { selectModelForStyle } from '../../src/lib/ai/visual-brief-prompts';
import { generateFalImage } from '../../src/lib/integrations/fal/fal-client';

const HERO_PROMPT =
  'Professional editorial hero photograph for a restaurant textile-management service landing page. ' +
  'Warm, inviting commercial kitchen with clean folded linens and staff in the background, natural light, ' +
  '16:9 wide composition with clear negative space on the left for a headline. Photorealistic, brand-premium.';

async function run() {
  console.log('=== Hero image-gen diagnostische test ===\n');

  // Zelfde resolutie als de hero-route bij ontbrekende visualBrief.generate.model
  const modelId = selectModelForStyle(null, { contentTypeId: 'landing-page', hasTrainedLora: false });
  console.log(`Model (selectModelForStyle 'landing-page'): ${modelId}`);
  console.log(`FAL_KEY aanwezig: ${process.env.FAL_KEY ? 'ja' : 'NEE — gen zal falen'}`);
  console.log(`Aspect: 16:9 (imageSize landscape_16_9)\n`);
  console.log('Genereren... (client-timeout in de app is 75s × 2 retries)\n');

  const start = Date.now();
  try {
    const result = await generateFalImage(modelId, HERO_PROMPT, { imageSize: 'landscape_16_9' });
    const elapsed = Date.now() - start;
    const keys = Object.keys(result ?? {});
    // FalGenerationResult shape defensief uitlezen
    const r = result as unknown as { images?: Array<{ url?: string }>; imageUrl?: string; url?: string };
    const url = r.images?.[0]?.url ?? r.imageUrl ?? r.url ?? '(geen url-veld gevonden)';
    console.log(`✅ SUCCES in ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`   result keys: ${keys.join(', ')}`);
    console.log(`   url: ${url}`);
    console.log(`\n   >75s? ${elapsed > 75_000 ? 'JA — zou de client-timeout overschrijden (root-cause-kandidaat)' : 'nee — binnen budget'}`);
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`❌ FOUT na ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`   ${err instanceof Error ? err.message : String(err)}`);
    if (err instanceof Error && err.stack) console.log(`\n${err.stack.split('\n').slice(0, 4).join('\n')}`);
  }
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
