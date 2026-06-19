/**
 * Smoke-test — GEO/SEO Fase 2 structured-data payoff: buildBlogPostingJsonLd +
 * de geoArticle-dispatch in buildPageJsonLd. Verifieert dat een gepubliceerd
 * GEO-artikel een @graph met BlogPosting (+ geneste FAQPage uit de Q&A +
 * DefinedTermSet uit de definities) emit zodat AI-engines het kunnen citeren.
 *
 * Run: npx tsx scripts/smoke-tests/geo-blogposting-jsonld.ts
 */
import { buildBlogPostingJsonLd, buildPageJsonLd } from '../../src/lib/landing-pages/page-json-ld';
import type { PageVariantContent } from '../../src/lib/landing-pages/page-type-schemas';

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

const geo = {
  geoArticle: true as const,
  hero: { headline: 'Wat is GEO?', subline: 'Generative Engine Optimization uitgelegd.' },
  answerFirstIntro: 'GEO optimaliseert content zodat AI-engines die citeren.',
  tldr: ['GEO = citeerbaarheid voor AI', 'Vult SEO aan'],
  sections: [
    { heading: 'Inleiding', body: 'Uitleg over GEO.' },
    { heading: 'Hoe werkt het', body: 'Meer uitleg.' },
  ],
  qa: [
    { question: 'Wat is GEO?', answer: 'Generative Engine Optimization.' },
    { question: 'Anders dan SEO?', answer: 'Ja.' },
  ],
  citeableStats: [{ label: 'AI-zoekgroei', value: '+40%', source: 'Gartner 2026' }],
  definitions: [{ term: 'GEO', definition: 'Generative Engine Optimization' }],
  finalCta: { heading: 'Aan de slag', ctaLabel: 'Start' },
};

type Node = { '@type': string; [k: string]: unknown };

console.log('── BlogPosting @graph ──');
const out = buildBlogPostingJsonLd(geo, {
  brandName: 'Acme',
  datePublished: '2026-06-19T10:00:00.000Z',
  dateModified: '2026-06-19T12:00:00.000Z',
  imageUrl: 'https://acme.example/hero.jpg',
  inLanguage: 'nl',
  author: { name: 'Jane Doe', jobTitle: 'Head of Content', sameAs: ['https://linkedin.com/in/janedoe'] },
});
const graph = (out['@graph'] as Node[]) ?? [];
const blog = graph.find((n) => n['@type'] === 'BlogPosting');
assert('@context schema.org', out['@context'] === 'https://schema.org');
assert('graph bevat BlogPosting', !!blog);
assert('headline gezet', blog?.headline === 'Wat is GEO?');
assert('articleBody bevat sectie-content', String(blog?.articleBody).includes('Inleiding') && String(blog?.articleBody).includes('Meer uitleg.'));
assert('abstract uit tldr', String(blog?.abstract).includes('citeerbaarheid voor AI'));
assert('publisher Organization', (blog?.publisher as Node)?.['@type'] === 'Organization' && (blog?.publisher as { name?: string })?.name === 'Acme');
assert('datePublished gezet', blog?.datePublished === '2026-06-19T10:00:00.000Z');
assert('dateModified gezet', blog?.dateModified === '2026-06-19T12:00:00.000Z');
assert('image = ImageObject (geen kale URL)', (blog?.image as Node)?.['@type'] === 'ImageObject' && (blog?.image as { url?: string })?.url === 'https://acme.example/hero.jpg');

console.log('\n── Fase 3 entity-laag (author / inLanguage / keywords / about / mentions) ──');
assert('inLanguage gezet', blog?.inLanguage === 'nl');
const author = blog?.author as Node | undefined;
assert('author = Person', author?.['@type'] === 'Person' && (author as { name?: string })?.name === 'Jane Doe');
assert('author jobTitle', (author as { jobTitle?: string })?.jobTitle === 'Head of Content');
assert('author sameAs', Array.isArray((author as { sameAs?: unknown })?.sameAs) && ((author as { sameAs?: string[] }).sameAs ?? [])[0] === 'https://linkedin.com/in/janedoe');
assert('keywords uit definities', Array.isArray(blog?.keywords) && (blog?.keywords as string[]).includes('GEO'));
assert('about = Thing (eerste definitie)', (blog?.about as Node)?.['@type'] === 'Thing' && (blog?.about as { name?: string })?.name === 'GEO');
assert('mentions = Thing[]', Array.isArray(blog?.mentions) && (blog?.mentions as Node[])[0]?.['@type'] === 'Thing');

console.log('\n── author weggelaten zonder verifieerbare identiteit ──');
const noAuthor = buildBlogPostingJsonLd(geo, { brandName: 'Acme' });
const noAuthorBlog = (noAuthor['@graph'] as Node[]).find((n) => n['@type'] === 'BlogPosting');
assert('geen author zonder ctx.author', !('author' in (noAuthorBlog ?? {})));
assert('geen image zonder imageUrl', !('image' in (noAuthorBlog ?? {})));

console.log('\n── geneste FAQPage + DefinedTermSet ──');
const faqNode = graph.find((n) => n['@type'] === 'FAQPage');
assert('graph bevat FAQPage (uit qa)', !!faqNode);
assert('FAQPage mainEntity = 2 Questions', ((faqNode?.mainEntity as unknown[]) ?? []).length === 2);
const defSet = graph.find((n) => n['@type'] === 'DefinedTermSet');
assert('graph bevat DefinedTermSet (uit definities)', !!defSet);
assert('DefinedTerm naam = GEO', ((defSet?.hasDefinedTerm as Node[]) ?? [])[0]?.name === 'GEO');

console.log('\n── optionele blokken weggelaten ──');
const minimal = buildBlogPostingJsonLd({ ...geo, definitions: undefined, qa: [geo.qa[0], geo.qa[1]] });
assert('zonder definities → geen DefinedTermSet', !((minimal['@graph'] as Node[]).some((n) => n['@type'] === 'DefinedTermSet')));

console.log('\n── dispatch via buildPageJsonLd ──');
const dispatched = buildPageJsonLd(geo as unknown as PageVariantContent, { brandName: 'Acme' });
assert('geoArticle → BlogPosting (niet langer null)', !!dispatched && Array.isArray((dispatched as { '@graph'?: unknown })['@graph']));
assert(
  'dispatch @graph[0] = BlogPosting',
  ((dispatched?.['@graph'] as Node[]) ?? [])[0]?.['@type'] === 'BlogPosting',
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
