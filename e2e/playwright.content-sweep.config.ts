import { defineConfig } from '@playwright/test';

/**
 * Aparte config voor de content-type-sweep. Bewust GEEN `globalSetup`:
 * `e2e/global-setup.ts` draait `prisma db seed`, en die seed is destructief
 * (deleteMany over tientallen tabellen). Dat zou de ge-importeerde
 * Napking-workspace (`e2e-ws-napking-001`) bij élke run wissen.
 *
 * Voorwaarde vooraf (eenmalig, buiten Playwright om):
 *   1. `DATABASE_URL=<test-db> npx prisma db push`
 *   2. merk-DNA-import van Napking naar `e2e-ws-napking-001`
 *   3. een Campaign in die workspace
 *
 * De reguliere suite (`npm run test:e2e`) blijft ongewijzigd draaien op
 * `e2e/playwright.config.ts`.
 */
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgresql://erikjager:@localhost:5432/branddock_test';

export default defineConfig({
  testDir: './tests/content-sweep',

  // Eén generatie is een meerstaps AI-keten (plan-and-solve → angles → 3
  // varianten → property-evals → F-VAL per variant → STRICT-rewrite). De
  // 30s uit de hoofdconfig is per definitie onhaalbaar.
  timeout: 15 * 60_000,

  // retries: 0 — een retry betekent een tweede volledige generatie, dus
  // dubbele AI-kosten voor precies dezelfde informatie.
  retries: 0,

  // workers: 1 — parallelle generaties lopen tegen provider-rate-limits en
  // maken de kosten onvoorspelbaar. Sequentieel is hier een feature.
  workers: 1,

  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report-content-sweep' }],
    ['json', { outputFile: 'content-sweep-results.json' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:3001',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 30_000,
  },

  webServer: {
    // AUTH_RATE_LIMIT_MAX: gestapelde auth-limiters maken specs met veel
    // logins mid-suite rood (gotcha 2026-07-17).
    // NEXT_PUBLIC_BILLING_ENABLED=false: shell-env wint van .env.local; met
    // billing aan legt enforceOrgPlanLimit FREE-limieten op de org.
    // CRON_SECRET: VERPLICHT hier. Long-form/website-types nemen in de
    // canvas-orchestrator de SEO-pipeline-tak; die zet een SEO_GENERATE-job op
    // de queue en keert terug. `kickWorker` (jobs/dispatch.ts:101) doet zonder
    // CRON_SECRET + BETTER_AUTH_URL een stille early-return, waardoor de job
    // eeuwig PENDING blijft en er nooit varianten verschijnen. Zelfde valkuil
    // als de dev-gotcha bij changelog #456.
    // De AI-keys komen uit .env.local — die zijn hier juist wél nodig.
    command: `DATABASE_URL="${E2E_DATABASE_URL}" BETTER_AUTH_SECRET="e2e-test-secret" BETTER_AUTH_URL="http://localhost:3001" CRON_SECRET="e2e-content-sweep-cron" AUTH_RATE_LIMIT_MAX="1000" NEXT_PUBLIC_BILLING_ENABLED="false" npm run dev -- --port 3001`,
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
