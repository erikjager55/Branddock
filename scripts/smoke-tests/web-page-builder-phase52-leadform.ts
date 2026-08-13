/**
 * Phase 52 — LeadForm-sectie + leads-pijplijn artefacten (P3 lp-forms-leads,
 * P4 lp-page-analytics). Pure tests, geen DB/netwerk.
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase52-leadform.ts
 */
import { createElement } from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageRender } from '../../src/lib/landing-pages/page-render';
import { compilePageArtifact, buildPageRuntimeScript } from '../../src/lib/landing-pages/static-compile';
import { buildSpikePuckConfig } from '../../src/features/campaigns/components/canvas/medium/puck-config';
import { SECTION_TYPE_IDS, validatePageDataShape } from '../../src/lib/landing-pages/page-data';
import {
  buildLeadFormId,
  parseLeadFormId,
  sanitizeFormKey,
  leadFormSuccessAnchorId,
  leadFormFieldName,
  findLeadFormSection,
  listLeadFormSectionIds,
} from '../../src/lib/landing-pages/lead-form';
import { DEFAULT_BRAND_TOKENS } from '../../src/lib/landing-pages/brand-tokens';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

const WS = 'cmws123abc';
const SECTION_ID = 'LeadForm-a1b2c3';

const leadFormTree = {
  root: { props: {} },
  content: [
    {
      type: 'LeadForm',
      props: {
        id: SECTION_ID,
        heading: 'Praat met ons',
        sub: 'We reageren binnen één werkdag.',
        buttonLabel: 'Verstuur',
        successMessage: 'Dank je wel — we nemen contact op.',
        fields: [
          { label: 'Naam', fieldType: 'text', required: false },
          { label: 'E-mailadres', fieldType: 'email', required: true },
          { label: 'Bericht', fieldType: 'textarea', required: false },
        ],
        webhookUrl: '',
        notifyEmail: '',
      },
    },
  ],
};

const plainTree = {
  root: { props: {} },
  content: [
    { type: 'RichText', props: { id: 'RichText-1', content: 'Alleen tekst.' } },
  ],
};

async function main(): Promise<void> {
  console.log('\n1. formId-formaat: build/parse round-trip');
  const formId = buildLeadFormId(WS, SECTION_ID);
  assert('formId = "<ws>:<key>"', formId === `${WS}:${SECTION_ID}`);
  const parsed = parseLeadFormId(formId);
  assert('parse geeft workspaceId terug', parsed?.workspaceId === WS);
  assert('parse geeft formKey terug', parsed?.formKey === SECTION_ID);
  assert('rauwe id wordt gesaneerd in build', buildLeadFormId(WS, 'a:b c/d') === `${WS}:a-b-c-d`);
  assert('sanitize is idempotent', sanitizeFormKey(sanitizeFormKey('x:y')) === sanitizeFormKey('x:y'));
  assert('ongeldig formaat → null (geen scheider)', parseLeadFormId('geenscheider') === null);
  assert('ongeldig formaat → null (lege delen)', parseLeadFormId(':key') === null && parseLeadFormId('ws:') === null);
  assert('ongeldig formaat → null (rare tekens in ws)', parseLeadFormId('ws/../x:key') === null);
  assert('success-anchor is CSS-safe', leadFormSuccessAnchorId('a b:c') === 'lp-form-ok-a-b-c');
  assert('veldnaam-slug uit label', leadFormFieldName('E-mailadres', 0) === 'e-mailadres');
  assert('leeg label → positioneel', leadFormFieldName('', 2) === 'field-3');

  console.log('\n2. sectie-scan helpers (server-side notify-config-resolutie)');
  const found = findLeadFormSection(leadFormTree, SECTION_ID);
  assert('findLeadFormSection vindt de sectie', found !== null && found.props.heading === 'Praat met ons');
  assert('findLeadFormSection mist onbekende key', findLeadFormSection(leadFormTree, 'onbekend') === null);
  assert('listLeadFormSectionIds', listLeadFormSectionIds(leadFormTree).join(',') === SECTION_ID);
  assert('scan is fail-soft op rommel', findLeadFormSection('geen-object', 'x') === null && listLeadFormSectionIds(null).length === 0);

  console.log('\n3. LeadForm-render (live: workspaceId gezet)');
  const liveConfig = buildSpikePuckConfig(null, { workspaceId: WS });
  const liveHtml = renderToStaticMarkup(
    createElement(PageRender as never, { config: liveConfig, data: leadFormTree, withSectionMarkers: false } as never),
  );
  assert('form action → /api/f/<formId>', liveHtml.includes(`action="/api/f/${WS}:${SECTION_ID}"`));
  assert('method POST (no-JS-first)', liveHtml.includes('method="POST"'));
  assert('honeypot _hp aanwezig', liveHtml.includes('name="_hp"'));
  assert('timestamp _ts aanwezig', liveHtml.includes('name="_ts"'));
  assert('bron-URL _src aanwezig', liveHtml.includes('name="_src"'));
  assert('native email-validatie', liveHtml.includes('type="email"') && liveHtml.includes('required'));
  assert('textarea rendert', liveHtml.includes('<textarea'));
  assert('submit-knop met label', liveHtml.includes('type="submit"') && liveHtml.includes('Verstuur'));
  const successId = leadFormSuccessAnchorId(SECTION_ID);
  assert('success-blok met anchor-id', liveHtml.includes(`id="${successId}"`) && liveHtml.includes('Dank je wel'));
  assert(':target-styleregel (no-JS success)', liveHtml.includes(`#${successId}:target{display:block}`));
  assert('data-lp-form + data-lp-success markers', liveHtml.includes('data-lp-form="1"') && liveHtml.includes(`data-lp-success="${successId}"`));
  assert('copy uit props (klantcontent, geen i18n)', liveHtml.includes('Praat met ons') && liveHtml.includes('E-mailadres'));

  console.log('\n4. LeadForm-render (editor: geen workspaceId → inert)');
  const editorConfig = buildSpikePuckConfig(null);
  const editorHtml = renderToStaticMarkup(
    createElement(PageRender as never, { config: editorConfig, data: leadFormTree, withSectionMarkers: false } as never),
  );
  assert('editor-action is "#"', editorHtml.includes('action="#"'));
  assert('editor-knop is type=button (geen echte submits)', editorHtml.includes('type="button"') && !editorHtml.includes('type="submit"'));

  console.log('\n5. registry-synchronisatie + RSC-veiligheid');
  const registered = Object.keys(liveConfig.components);
  assert('LeadForm in SECTION_TYPE_IDS', (SECTION_TYPE_IDS as readonly string[]).includes('LeadForm'));
  const missingInConfig = (SECTION_TYPE_IDS as readonly string[]).filter((id) => !registered.includes(id));
  const missingInIds = registered.filter((id) => !(SECTION_TYPE_IDS as readonly string[]).includes(id));
  assert('SECTION_TYPE_IDS ⊆ config.components', missingInConfig.length === 0, missingInConfig.join(','));
  assert('config.components ⊆ SECTION_TYPE_IDS', missingInIds.length === 0, missingInIds.join(','));
  const shape = validatePageDataShape(leadFormTree);
  assert('validatePageDataShape kent LeadForm', shape.ok && shape.unknownTypes.length === 0);
  const configSource = readFileSync(
    join(__dirname, '../../src/features/campaigns/components/canvas/medium/puck-config.tsx'),
    'utf8',
  );
  assert("geen 'use client' in puck-config", !/^\s*['"]use client['"]/m.test(configSource));

  console.log('\n6. artifact-enhancement (compilePageArtifact)');
  const withForm = await compilePageArtifact({
    puckData: leadFormTree,
    config: liveConfig,
    brandTokens: DEFAULT_BRAND_TOKENS,
  });
  assert('artifact bevat view-beacon', withForm.html.includes('sendBeacon') && withForm.html.includes('/api/t'));
  assert('artifact met LeadForm bevat form-enhancement', withForm.html.includes("querySelectorAll('form[data-lp-form]')"));
  // De LeadForm-render bevat een render-timestamp (_ts) — normaliseer die
  // vóór de vergelijking (twee renders op verschillende ms verschillen erin).
  const normalizeTs = (html: string): string => html.replace(/name="_ts" value="\d+"/g, 'name="_ts" value="TS"');
  const liveBody = renderToStaticMarkup(
    createElement(PageRender as never, { config: liveConfig, data: leadFormTree, withSectionMarkers: false } as never),
  );
  assert('artifact eindigt op de render-body (phase51-invariant)', normalizeTs(withForm.html).endsWith(normalizeTs(liveBody)));

  const withoutForm = await compilePageArtifact({
    puckData: plainTree,
    config: liveConfig,
    brandTokens: DEFAULT_BRAND_TOKENS,
  });
  assert('artifact zonder LeadForm bevat de beacon', withoutForm.html.includes('sendBeacon'));
  assert('artifact zonder LeadForm bevat GEEN form-enhancement', !withoutForm.html.includes('form[data-lp-form]'));
  const plainBody = renderToStaticMarkup(
    createElement(PageRender as never, { config: liveConfig, data: plainTree, withSectionMarkers: false } as never),
  );
  assert('form-vrij artifact eindigt exact op de render-body', withoutForm.html.endsWith(plainBody));

  console.log('\n7. runtime-script-eigenschappen');
  const fullScript = buildPageRuntimeScript({ withForms: true });
  const beaconOnly = buildPageRuntimeScript({ withForms: false });
  assert('script < 2KB', Buffer.byteLength(fullScript, 'utf8') < 2048, `${Buffer.byteLength(fullScript, 'utf8')}B`);
  assert('geen externe hosts in script (CSP)', !/https?:\/\//.test(fullScript));
  assert('geen </script>-breakout in script-body', !fullScript.slice(8, -9).includes('</script>'));
  assert('beacon-only variant is kleiner', beaconOnly.length < fullScript.length);
  assert('form-script ververst _ts (bevroren artifact-timestamp)', fullScript.includes('_ts') && fullScript.includes('Date.now()'));
  assert('form-script vult _src met echte URL', fullScript.includes('_src') && fullScript.includes('L.href'));
  assert('geen client-side form_submit-beacon (server telt — geen dubbeltelling)', !fullScript.includes("'form_submit'"));

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

void main();
