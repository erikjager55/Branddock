import { defineConfig } from '@playwright/test';

/**
 * Aparte config voor de CSP-sweep.
 *
 * Waarom niet in de hoofdsuite: die draait `npm run dev`, en de CSP is
 * prod-only (`isProduction` in `src/proxy.ts` — dev krijgt bewust geen
 * script-src, anders sneuvelt HMR). Een CSP-test onder de hoofdconfig zou dus
 * een policy meten die er niet is en altijd groen staan.
 *
 * Voorwaarde vooraf (eenmalig per wijziging):
 *   1. `npm run build`  — de sweep draait tegen de échte productie-output
 *   2. `DATABASE_URL=<test-db> npx prisma db push && npx tsx prisma/seed.ts`
 *
 * Draaien: `npm run test:csp`
 */
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgresql://erikjager:@localhost:5432/branddock_test';

// Bewust een andere poort dan de hoofdsuite (3001): beide configs kunnen zo
// naast elkaar draaien zonder om dezelfde webServer te vechten.
const PORT = 3002;

export default defineConfig({
  testDir: './tests/security',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],

  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: 'only-on-failure',
  },

  webServer: {
    // `next start` (niet `next dev`): NODE_ENV=production, dus de volledige
    // enforce-CSP. BETTER_AUTH_URL moet de poort volgen, anders geeft Better
    // Auth 403 INVALID_ORIGIN op sign-in (gotcha 2026-07-22).
    // Via `npm start` en niet `npx next start`: Playwright draait de webServer
    // met de config-map (`e2e/`) als cwd, waardoor next.config.ts niet
    // gevonden wordt; npm lost scripts wél vanaf de package-root op.
    command: `DATABASE_URL="${E2E_DATABASE_URL}" BETTER_AUTH_SECRET="e2e-test-secret" BETTER_AUTH_URL="http://localhost:${PORT}" AUTH_RATE_LIMIT_MAX="1000" npm start -- -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
