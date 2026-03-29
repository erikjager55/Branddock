import { defineConfig } from '@playwright/test';

const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgresql://localhost:5432/branddock_test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 2,
  workers: 4,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3001',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  webServer: {
    command: `DATABASE_URL="${E2E_DATABASE_URL}" BETTER_AUTH_SECRET="e2e-test-secret" BETTER_AUTH_URL="http://localhost:3001" npm run dev -- --port 3001`,
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
