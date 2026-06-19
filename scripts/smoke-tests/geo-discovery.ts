/**
 * Smoke-test — GEO/SEO Fase 1a discovery-laag: host-parsing (workspaceSlugFromHost),
 * de /p/-rewrite-exempties voor sitemap/robots/llms, en de pure sitemap/robots/llms-
 * builders. Verifieert het per-workspace multi-tenant model zonder echte subdomeinen.
 *
 * Run: npx tsx scripts/smoke-tests/geo-discovery.ts
 */
import { workspaceSlugFromHost, decideHostRoute } from '../../src/lib/landing-pages/host-router';
import {
  buildSitemapXml,
  buildRobotsTxt,
  buildLlmsTxt,
  requestOrigin,
} from '../../src/lib/landing-pages/sitemap-host';

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

console.log('── workspaceSlugFromHost ──');
assert('subdomein → workspace', workspaceSlugFromHost('acme.branddock.app') === 'acme');
assert('lvh.me-subdomein → workspace', workspaceSlugFromHost('acme.lvh.me') === 'acme');
assert('poort wordt gestript', workspaceSlugFromHost('acme.branddock.app:3000') === 'acme');
assert('apex → null', workspaceSlugFromHost('branddock.app') === null);
assert('www → null', workspaceSlugFromHost('www.branddock.app') === null);
assert('localhost → null', workspaceSlugFromHost('localhost') === null);
assert('geneste subdomein → null', workspaceSlugFromHost('a.b.branddock.app') === null);

console.log('\n── decideHostRoute exempties ──');
assert('/sitemap.xml passthrough op subdomein', decideHostRoute('acme.branddock.app', '/sitemap.xml').passthrough === true);
assert('/robots.txt passthrough op subdomein', decideHostRoute('acme.branddock.app', '/robots.txt').passthrough === true);
assert('/llms.txt passthrough op subdomein', decideHostRoute('acme.branddock.app', '/llms.txt').passthrough === true);
assert(
  'gewone slug wordt nog steeds herschreven',
  decideHostRoute('acme.branddock.app', '/pricing').rewriteTo === '/p/pricing?workspace=acme',
);

console.log('\n── requestOrigin ──');
assert('proto+host', requestOrigin('https', 'acme.branddock.app') === 'https://acme.branddock.app');
assert('geen proto → https', requestOrigin(null, 'x.branddock.app') === 'https://x.branddock.app');
assert('forwarded-lijst → eerste', requestOrigin('https,http', 'a.branddock.app,b') === 'https://a.branddock.app');
assert('geen host → apex-default', requestOrigin('https', '') === 'https://branddock.app');

console.log('\n── buildSitemapXml ──');
const xml = buildSitemapXml('https://acme.branddock.app/', [
  { slug: 'pricing', lastModified: new Date('2026-06-17T10:00:00Z') },
  { slug: 'about', lastModified: null },
]);
assert('bevat loc met origin+slug', xml.includes('<loc>https://acme.branddock.app/pricing</loc>'));
assert('trailing slash op origin genormaliseerd', !xml.includes('app//pricing'));
assert('lastmod ISO bij datum', xml.includes('<lastmod>2026-06-17T10:00:00.000Z</lastmod>'));
assert('geen lastmod bij null', xml.includes('<loc>https://acme.branddock.app/about</loc>') && (xml.match(/<lastmod>/g)?.length ?? 0) === 1);
assert('valide urlset-wrapper', xml.includes('<urlset') && xml.trim().endsWith('</urlset>'));
const emptyXml = buildSitemapXml('https://acme.branddock.app', []);
assert('lege sitemap is valide urlset', emptyXml.includes('<urlset') && emptyXml.includes('</urlset>') && !emptyXml.includes('<url>'));

console.log('\n── buildRobotsTxt ──');
const robotsWs = buildRobotsTxt({ sitemapUrl: 'https://acme.branddock.app/sitemap.xml' });
assert('robots verwijst naar sitemap', robotsWs.includes('Sitemap: https://acme.branddock.app/sitemap.xml'));
assert('robots disallowt /api/', robotsWs.includes('Disallow: /api/'));
assert('robots zonder sitemap → geen Sitemap-regel', !buildRobotsTxt({ sitemapUrl: null }).includes('Sitemap:'));

console.log('\n── buildLlmsTxt ──');
const llms = buildLlmsTxt({
  workspaceName: 'acme',
  origin: 'https://acme.branddock.app',
  entries: [{ slug: 'crm', title: 'Beste CRM' }, { slug: 'about' }],
});
assert('llms link met titel', llms.includes('[Beste CRM](https://acme.branddock.app/crm)'));
assert('llms link valt terug op slug', llms.includes('[about](https://acme.branddock.app/about)'));
assert('llms heading = workspace', llms.startsWith('# acme'));
assert('lege llms → placeholder', buildLlmsTxt({ origin: 'https://x.branddock.app', entries: [] }).includes('Nog geen gepubliceerde'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
