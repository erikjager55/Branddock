import { test as authTest } from './auth.fixture';
import type { Page } from '@playwright/test';
import { TEST_WORKSPACE } from './test-data';

type WorkspaceFixtures = {
  workspacePage: Page;
};

export const test = authTest.extend<WorkspaceFixtures>({
  workspacePage: async ({ authenticatedPage }, use) => {
    // Switch to the demo workspace via API
    await authenticatedPage.request.post('/api/workspace/switch', {
      data: { workspaceId: TEST_WORKSPACE.id },
    });

    // Reload to pick up new workspace cookie
    await authenticatedPage.reload();
    await authenticatedPage.waitForSelector('[data-testid="dashboard"]', {
      timeout: 15_000,
    });

    await use(authenticatedPage);
  },
});

export { expect } from '@playwright/test';
