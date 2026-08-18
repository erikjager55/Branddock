import { test, expect, type Page } from '@playwright/test';

/**
 * CSP enforce-sweep (ADR 2026-08-18).
 *
 * Bewaakt de enforce-flip op twee niveaus: de policy zelf (header-vorm,
 * scope-indeling) en het effect ervan in een echte browser (violations).
 * Draait tegen `next start` — zie `e2e/playwright.csp.config.ts`.
 */

const PUBLIC_ROUTES = ['/marketing', '/marketing/pricing', '/brandmd', '/brandmd/use', '/'];

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
