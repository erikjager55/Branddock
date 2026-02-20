import { type Page, type APIRequestContext } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-data';

/**
 * Login via the Better Auth API and return the response.
 */
export async function apiLogin(
  request: APIRequestContext,
  email = TEST_USERS.owner.email,
  password = TEST_USERS.owner.password,
) {
  const response = await request.post('/api/auth/sign-in/email', {
    data: { email, password },
  });
  return response;
}

/**
 * Create an entity via API (generic helper).
 */
export async function apiCreateEntity(
  request: APIRequestContext,
  endpoint: string,
  data: Record<string, unknown>,
) {
  const response = await request.post(endpoint, { data });
  return response;
}

/**
 * Delete an entity via API (generic helper).
 */
export async function apiDeleteEntity(
  request: APIRequestContext,
  endpoint: string,
) {
  const response = await request.delete(endpoint);
  return response;
}

/**
 * Cleanup entities created during a test by deleting them via API.
 */
export async function apiCleanup(
  request: APIRequestContext,
  endpoints: string[],
) {
  for (const endpoint of endpoints) {
    await request.delete(endpoint).catch(() => {
      // Ignore cleanup failures
    });
  }
}

/**
 * Authenticated fetch helper — logs in, then makes a request.
 */
export async function apiAuthFetch(
  page: Page,
  method: 'get' | 'post' | 'patch' | 'delete',
  endpoint: string,
  data?: Record<string, unknown>,
) {
  const response = await page.request[method](endpoint, data ? { data } : undefined);
  return response;
}
