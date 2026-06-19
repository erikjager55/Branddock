/**
 * Smoke-test — GEO/SEO Fase 3: Claw-edit-tool gate. De 4 Claw-sites
 * (read_landing_page_content, update_landing_page_content buildProposal + execute,
 * context-assembler rule 5) gaten nu via isPuckRenderable(contentType,
 * settings.contentTypeInputs) i.p.v. isPuckWebpageType. Deze smoke borgt het
 * gate-contract met exact de settings-extractie die de tools gebruiken: long-form
 * GEO (geo-doel aan) wordt toegelaten, long-form zonder geo geblokkeerd, en de
 * bestaande web-page-types blijven toegelaten (geen regressie).
 *
 * Run: npx tsx scripts/smoke-tests/geo-claw-gate.ts
 */
import { isPuckRenderable } from '../../src/lib/landing-pages/webpage-types';

let pass = 0,
  fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

// Spiegel van de tool-extractie: const contentTypeInputs = (settings.contentTypeInputs ?? null)
const gate = (contentType: string, settings: Record<string, unknown> | null) => {
  const cti = (settings?.contentTypeInputs ?? null) as Record<string, unknown> | null;
  return isPuckRenderable(contentType, cti);
};

console.log('── long-form GEO toegelaten / geblokkeerd ──');
assert('blog-post + geo-doel → bewerkbaar', gate('blog-post', { contentTypeInputs: { optimizationGoals: ['seo', 'geo'] } }) === true);
assert('whitepaper + geo-only → bewerkbaar', gate('whitepaper', { contentTypeInputs: { optimizationGoals: ['geo'] } }) === true);
assert('blog-post zonder geo (seo-only) → geblokkeerd', gate('blog-post', { contentTypeInputs: { optimizationGoals: ['seo'] } }) === false);
assert('blog-post zonder optimizationGoals → geblokkeerd', gate('blog-post', { contentTypeInputs: {} }) === false);
assert('blog-post zonder settings → geblokkeerd (veilige default)', gate('blog-post', null) === false);

console.log('\n── bestaande Puck web-page-types (regressie) ──');
assert('landing-page → bewerkbaar (ongeacht goals)', gate('landing-page', null) === true);
assert('product-page → bewerkbaar', gate('product-page', { contentTypeInputs: {} }) === true);
assert('faq-page → bewerkbaar', gate('faq-page', null) === true);
assert('comparison-page → bewerkbaar', gate('comparison-page', null) === true);
assert('microsite → bewerkbaar', gate('microsite', null) === true);

console.log('\n── niet-Puck content blijft geblokkeerd ──');
assert('linkedin-post → geblokkeerd', gate('linkedin-post', { contentTypeInputs: { optimizationGoals: ['geo'] } }) === false);
assert('email-campaign → geblokkeerd', gate('email-campaign', null) === false);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
