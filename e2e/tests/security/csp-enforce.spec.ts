import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * CSP enforce-sweep (ADR 2026-08-18).
 *
 * Bewaakt de enforce-flip op twee niveaus: de policy zelf (header-vorm,
 * scope-indeling) en het effect ervan in een echte browser (violations).
 * Draait tegen `next start` — zie `e2e/playwright.csp.config.ts`.
 */

const PUBLIC_ROUTES = ['/marketing', '/marketing/pricing', '/brandmd', '/brandmd/use', '/'];

/**
 * Routes voor de nonce-integriteitguard — bewust een EIGEN lijst.
 *
 * `/p/<ws>/<slug>` wordt er ACTIEF uit gefilterd, niet met een comment verboden:
 * die scope draait op snippet-HASHES (`LANDING_PAGE_SCRIPT_HASHES`) en heeft
 * daarom inline scripts zónder nonce, plus de scripts ín het bevroren
 * `compiledHtml`-artifact. De telling hieronder zou daar per definitie falen, en
 * dat leest als een CSP-defect terwijl het een testaanname is. Het openstaande
 * restwerk "`/p` aan de sweep toevoegen" (task-file) betekent uitbreiden van
 * `PUBLIC_ROUTES`; dankzij het filter belandt die route dan wél in de
 * violation-sweep en niet in deze guard.
 */
const NONCE_GUARD_ROUTES = PUBLIC_ROUTES.filter((r) => !r.startsWith('/p/'));

/** Verzamelt `securitypolicyviolation`-events die de pagina afvuurt. */
async function withViolationCollector(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    (window as unknown as { __cspViolations: string[] }).__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __cspViolations: string[] }).__cspViolations.push(
        `${e.effectiveDirective}|${e.blockedURI}|${(e.sample ?? '').slice(0, 60)}`,
      );
    });
  });
  return () =>
    page.evaluate(
      () => (window as unknown as { __cspViolations: string[] }).__cspViolations ?? [],
    );
}

function scriptSrcOf(csp: string): string {
  return csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src')) ?? '';
}

test.describe('CSP enforce-policy', () => {
  test('script-src is nonce-based en vrij van unsafe-*', async ({ request }) => {
    const resp = await request.get('/marketing');
    const csp = resp.headers()['content-security-policy'] ?? '';
    const scriptSrc = scriptSrcOf(csp);

    expect(scriptSrc, 'script-src ontbreekt in de enforce-policy').toContain('script-src');
    expect(scriptSrc).toMatch(/'nonce-[^']+'/);
    expect(scriptSrc).toContain("'strict-dynamic'");
    // De kern van de flip: geen van beide escapes mag terugkomen.
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(scriptSrc).not.toContain('unsafe-eval');
    // Enforce zonder rapportage faalt stil — report-uri hoort te blijven.
    expect(csp).toContain('report-uri /api/security/csp-report');
  });

  test('er is precies één enforce-CSP en geen Report-Only meer', async ({ request }) => {
    const resp = await request.get('/marketing');
    const headers = resp.headersArray().map((h) => h.name.toLowerCase());
    expect(headers.filter((h) => h === 'content-security-policy')).toHaveLength(1);
    expect(headers).not.toContain('content-security-policy-report-only');
  });

  test('de nonce verschilt per request', async ({ request }) => {
    const nonces = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const csp = (await request.get('/marketing')).headers()['content-security-policy'] ?? '';
      nonces.add(scriptSrcOf(csp).match(/'nonce-([^']+)'/)?.[1] ?? '');
    }
    expect(nonces.size, 'nonce wordt hergebruikt over requests').toBe(3);
  });

  test('landingspagina-scope draagt de snippet-hashes, de app-scope niet', async ({ request }) => {
    // Werkt zonder gepubliceerde pagina: de middleware classificeert op pad,
    // dus ook een 404 onder /p/ krijgt de landing-page-scope.
    const lp = scriptSrcOf(
      (await request.get('/p/geen-workspace/geen-pagina')).headers()['content-security-policy'] ?? '',
    );
    const app = scriptSrcOf(
      (await request.get('/marketing')).headers()['content-security-policy'] ?? '',
    );

    expect(lp, 'landingspagina mist de artifact-hashes').toMatch(/'sha256-[^']+'/);
    expect(app, 'app-scope zou geen artifact-hashes moeten dragen').not.toMatch(/'sha256-[^']+'/);
  });
});

/**
 * Nonce-integriteit — de guard tegen stil hergebruik van HTML.
 *
 * `script-src` is nonce-based met `'strict-dynamic'`: alleen scripts met de
 * nonce uit DEZE respons draaien. Twee manieren waarop dat stil breekt, allebei
 * gemeten op 2026-08-18 (tasks/static-rendering-regressie.md §5):
 *
 *  - **statisch geprerenderd** → de HTML draagt géén nonce-attributen, terwijl
 *    de header er wel een zendt. Alle ~38 Next-scripts worden geblokkeerd.
 *  - **ISR/CDN-gecached** → de bewaarde HTML draagt de nonce van het EERSTE
 *    request; elke cache-HIT levert een mismatch met de verse header.
 *
 * De violation-tests hieronder vangen dit ook, maar pas ná een browserrun en
 * met een foutmelding die naar de scripts wijst in plaats van naar de oorzaak.
 * Deze test benoemt de oorzaak en draait zonder browser.
 */
test.describe('nonce-integriteit (rendermodus-guard)', () => {
  /** Haalt één respons op en ontleedt de nonce-situatie. */
  async function probe(request: APIRequestContext, route: string) {
    const resp = await request.get(route);
    const headerNonce = scriptSrcOf(
      resp.headers()['content-security-policy'] ?? '',
    ).match(/'nonce-([^']+)'/)?.[1];
    const body = await resp.text();
    // Alleen nonces ÓP een script-tag tellen: een genonced <style> zou anders
    // een ongestempeld script kunnen maskeren in de telling hieronder.
    const nonceAttrs = [...body.matchAll(/<script\b[^>]*\snonce="([^"]*)"/g)].map((m) => m[1]);
    // JSON-LD is dáta, geen code: de browser voert het niet uit en Next stempelt
    // er dus terecht geen nonce op. Meetellen zou een correcte build afkeuren.
    const executableScripts = [...body.matchAll(/<script\b[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => !/type="application\/ld\+json"/.test(tag)).length;
    return { headerNonce, nonceAttrs, distinct: new Set(nonceAttrs), executableScripts };
  }

  for (const route of NONCE_GUARD_ROUTES) {
    test(`de nonce in de HTML matcht de header op ${route}`, async ({ request }) => {
      // TWEE opeenvolgende requests. Eén request is niet genoeg: bij een koude
      // ISR-route is de eerste hit een MISS die vers rendert mét de nonce van
      // dát request — die matcht dus altijd, terwijl elke vólgende bezoeker de
      // bewaarde HTML met een verouderde nonce krijgt.
      const probes = [await probe(request, route), await probe(request, route)];

      probes.forEach((p, i) => {
        const nth = `respons ${i + 1}`;
        expect(p.headerNonce, `${nth} draagt geen nonce-CSP`).toBeTruthy();
        expect(
          p.distinct.size,
          `${nth}: HTML draagt geen enkel nonce-attribuut — de route rendert ` +
            'statisch, dus strict-dynamic blokkeert élk script',
        ).toBeGreaterThan(0);
        expect(
          [...p.distinct],
          `${nth}: nonce in de HTML wijkt af van de header — respons komt uit een cache`,
        ).toEqual([p.headerNonce]);
        expect(
          p.nonceAttrs.length,
          `${nth}: ${p.executableScripts} uitvoerbare script-tags maar ` +
            `${p.nonceAttrs.length} nonce-attributen — een deel wordt geblokkeerd`,
        ).toBeGreaterThanOrEqual(p.executableScripts);
      });

      // NB: de header-nonces vergelijken heeft geen zin — `src/proxy.ts` maakt
      // er per request een verse, óók wanneer Next bewaarde HTML serveert. De
      // cache-detectie zit in de body-vs-header-vergelijking hierboven, die bij
      // een tweede hit op bewaarde HTML de oude nonce terugvindt.
    });
  }
});

test.describe('CSP in de browser', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`geen violations op ${route}`, async ({ page }) => {
      const read = await withViolationCollector(page);
      await page.goto(route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      expect(await read()).toEqual([]);
    });
  }

  test('ingelogde app-shell draait zonder violations', async ({ page, baseURL }) => {
    const read = await withViolationCollector(page);
    const signIn = await page.request.post('/api/auth/sign-in/email', {
      data: { email: 'erik@branddock.com', password: 'Password123!' },
      headers: { Origin: baseURL ?? '' },
    });
    expect(signIn.ok(), 'sign-in faalde — is de test-DB geseed?').toBeTruthy();

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    expect(await read()).toEqual([]);
  });
});
