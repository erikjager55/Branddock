/**
 * publish-empty-guard-smoke — bewijst dat kanaal-publicatie nooit een lege payload
 * extern verstuurt.
 *
 * Aanleiding: `publish-to-channel` bouwt zijn payload uitsluitend uit de component-keten.
 * De structured/PUCK-types (landing-page/faq-page/product-page/microsite + de long-form
 * GEO-types) bewaren hun copy in `settings.structuredVariant` en hebben een STRUCTUREEL
 * lege component-keten — `orchestrate/route.ts` gate't ze weg vóór de enige plek die
 * tekst-componenten aanmaakt, en `generate-structured-variant` maakt er nul. Zonder guard
 * publiceert een pillar-page dus een leeg artikel op de WordPress van de klant en een lege
 * LinkedIn-post. De bestaande QA-gate vangt dit niet (die oordeelt op een F-VAL-score uit
 * de ándere keten, en is bewust failsafe-open).
 *
 * Draaien: node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/dev/publish-empty-guard-smoke.ts
 */

import {
  buildChannelPayload,
  isPublishable,
  outboundTextFor,
  type ChannelPayloadComponent,
} from '../../src/lib/studio/channel-payload';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const PROVIDERS = ['linkedin-direct', 'resend', 'wordpress-rest'] as const;

console.log('\n1. De exacte vorm van een structured/PUCK-deliverable (pillar-page)');
{
  // 1-op-1 de prod-rij van de pilot-tester: één image-component zonder inhoud, verder niets.
  // Zijn 23,5KB copy zit in settings.structuredVariant — onbereikbaar voor deze keten.
  const components: ChannelPayloadComponent[] = [
    { variantGroup: 'hero-image', generatedContent: null, imageUrl: 'https://cdn.example/hero.png' },
  ];
  const payload = buildChannelPayload(components, 'pillar-page');
  check('payload-body is leeg', payload.bodyText === '');
  check('hero-image wordt wél herkend', payload.heroImageUrl === 'https://cdn.example/hero.png');
  for (const p of PROVIDERS) {
    check(`${p} → GEBLOKKEERD`, !isPublishable(payload, p),
      `zou "${outboundTextFor(payload, p)}" versturen`);
  }
}

console.log('\n2. Bewust géén beeld-uitzondering');
{
  // Een long-form-deliverable HEEFT een hero-image. "Leeg mag als er een beeld is" zou de
  // guard dus uitschakelen voor precies het geval dat 'm motiveert.
  const payload = buildChannelPayload(
    [{ variantGroup: 'hero-image', generatedContent: null, imageUrl: 'https://cdn.example/hero.png' }],
    'pillar-page',
  );
  check('beeld zonder tekst blijft geblokkeerd', !isPublishable(payload, 'linkedin-direct'));
}

console.log('\n3. Geen regressie: een echte social-post publiceert gewoon');
{
  const components: ChannelPayloadComponent[] = [
    { variantGroup: 'title', generatedContent: 'Vijf lessen uit ons eerste jaar' },
    { variantGroup: 'body', generatedContent: 'Dit is de body van de post.' },
    { variantGroup: 'hashtags', generatedContent: '#brand #marketing' },
    { variantGroup: 'hero-image', generatedContent: null, imageUrl: 'https://cdn.example/x.png' },
  ];
  const payload = buildChannelPayload(components, 'fallback');
  check('title uit de component, niet de fallback', payload.title === 'Vijf lessen uit ons eerste jaar');
  check('body correct', payload.bodyText === 'Dit is de body van de post.');
  check('fullText = body + hashtags', payload.fullText === 'Dit is de body van de post.\n\n#brand #marketing');
  for (const p of PROVIDERS) check(`${p} → publiceert`, isPublishable(payload, p));
}

console.log('\n4. Provider-mapping spiegelt de route-switch');
{
  // De provider heet 'linkedin-direct', niet 'linkedin' (die tweede bestaat elders als
  // OAuth-id). Op de verkeerde string matchen zou LinkedIn op bodyText valideren en een
  // hashtags-only post onterecht blokkeren.
  const hashtagsOnly = buildChannelPayload(
    [{ variantGroup: 'hashtags', generatedContent: '#launch' }],
    'post',
  );
  check('linkedin-direct → fullText (hashtags tellen mee)', outboundTextFor(hashtagsOnly, 'linkedin-direct') === '#launch');
  check('linkedin-direct → hashtags-only mag', isPublishable(hashtagsOnly, 'linkedin-direct'));
  check('resend → body-only (hashtags tellen NIET)', outboundTextFor(hashtagsOnly, 'resend') === '');
  check('resend → hashtags-only geblokkeerd', !isPublishable(hashtagsOnly, 'resend'));
  check('onbekende provider → strengste lezing', outboundTextFor(hashtagsOnly, 'iets-nieuws') === '');
}

console.log('\n5. Whitespace-only telt als leeg');
{
  const ws = buildChannelPayload([{ variantGroup: 'body', generatedContent: '   \n\t  ' }], 'x');
  for (const p of PROVIDERS) check(`${p} → whitespace geblokkeerd`, !isPublishable(ws, p));
}

console.log('\n6. Fallbacks op alternatieve variant-groups blijven werken');
{
  for (const [group, label] of [['caption', 'caption'], ['body-sections', 'body-sections'], ['introduction', 'introduction']] as const) {
    const p = buildChannelPayload([{ variantGroup: group, generatedContent: `inhoud via ${label}` }], 'x');
    check(`${label} → publiceerbaar`, isPublishable(p, 'wordpress-rest') && p.bodyText === `inhoud via ${label}`);
  }
}

// ─────────────────────────────────────────────────────────────
// 7-9: sinds content-chain-accessor fase 2 leest de payload-builder BEIDE ketens.
// De guard blijft, maar blokkeert nu alleen nog wat écht leeg is.
// ─────────────────────────────────────────────────────────────

/** Schema-complete FAQ-variant — de eenvoudigste tak van de flatten-dispatch. */
function faqVariant(headline: string) {
  return {
    hero: { headline, subline: 'Alles over onze dienstverlening' },
    popularQuestions: [{ question: 'Wat kost het?', answer: 'Vanaf 39 euro per maand.' }],
    categories: [{ label: 'Facturatie', items: [{ question: 'Opzeggen?', answer: 'Maandelijks.' }] }],
    contactEscape: { heading: 'Niet gevonden?', body: 'Mail ons.', ctaLabel: 'Contact' },
    closingCta: { heading: 'Aan de slag', ctaLabel: 'Start' },
  };
}

console.log('\n7. Een GEVULDE structured-pagina publiceert nu wél (de eigenlijke fix)');
{
  // Exact de rij uit scenario 1 — lege component-keten, hero-image aanwezig — maar nu mét
  // de copy waar hij altijd al stond. Vóór deze fix blokkeerde de guard een pagina die vol
  // stond; dat was terecht (niets te versturen) maar de gebruiker zag een onterecht "leeg".
  const components: ChannelPayloadComponent[] = [
    { variantGroup: 'hero-image', generatedContent: null, imageUrl: 'https://cdn.example/hero.png' },
  ];
  const payload = buildChannelPayload(components, 'pillar-page', {
    contentType: 'faq-page',
    settings: { structuredVariant: faqVariant('Veelgestelde vragen over Napking') },
    components,
  });
  check('body komt uit de structured-keten', payload.bodyText.includes('Veelgestelde vragen'));
  check('titel afgeleid uit de hero-headline', payload.title === 'Veelgestelde vragen over Napking');
  check('hero-image blijft behouden', payload.heroImageUrl === 'https://cdn.example/hero.png');
  for (const p of PROVIDERS) {
    check(`${p} → publiceert nu wél`, isPublishable(payload, p));
  }
}

console.log('\n8. Varianten zonder keuze blijven GEBLOKKEERD');
{
  // Content bestaat, maar de gebruiker koos nog geen variant. Gokken welke hij bedoelde is
  // erger dan niet publiceren — dit gaat naar de LinkedIn/WordPress van een klant.
  const components: ChannelPayloadComponent[] = [
    { variantGroup: 'hero-image', generatedContent: null, imageUrl: 'https://cdn.example/hero.png' },
  ];
  const payload = buildChannelPayload(components, 'pillar-page', {
    contentType: 'faq-page',
    settings: { structuredVariantOptions: [faqVariant('Variant A'), faqVariant('Variant B')] },
    components,
  });
  check('body blijft leeg bij structured-unchosen', payload.bodyText === '');
  for (const p of PROVIDERS) {
    check(`${p} → nog steeds geblokkeerd`, !isPublishable(payload, p));
  }
}

console.log('\n9. Component-keten wint; legacy generatedText is het laatste vangnet');
{
  const withComponents = buildChannelPayload(
    [{ variantGroup: 'body', generatedContent: 'Verse componenttekst.' }],
    'x',
    { generatedText: 'Oude losse tekst.', components: [] },
  );
  check('componenten gaan vóór legacy', withComponents.bodyText === 'Verse componenttekst.');

  const legacyOnly = buildChannelPayload([], 'x', { generatedText: 'Oude losse tekst.', components: [] });
  check('legacy vult de body als laatste redmiddel', legacyOnly.bodyText === 'Oude losse tekst.');
  check('legacy is publiceerbaar', isPublishable(legacyOnly, 'wordpress-rest'));
}

console.log('\n10. Zonder `source` gedraagt de builder zich exact als vóór de fix');
{
  // De guard-smoke van #412 draaide op alleen componenten; die aanroepvorm moet
  // ongewijzigd blijven werken, anders is dit een stille breaking change.
  const payload = buildChannelPayload(
    [{ variantGroup: 'hero-image', generatedContent: null, imageUrl: 'https://cdn.example/hero.png' }],
    'pillar-page',
  );
  check('geen source → body leeg', payload.bodyText === '');
  check('geen source → geblokkeerd', !isPublishable(payload, 'linkedin-direct'));
}

console.log(`\n${pass}/${pass + fail} checks groen${fail ? ` — ${fail} FAIL` : ''}\n`);
process.exit(fail ? 1 : 0);
