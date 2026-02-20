import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE } from '../../fixtures/test-data';

test.describe('Personas — AI Analysis', () => {
  let personaId: string;

  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });

    // Get the first persona from the list
    const listResponse = await page.request.get('/api/personas');
    const listData = await listResponse.json();
    personaId = listData.personas[0].id;
  });

  test('start AI analysis session', async ({ page }) => {
    const response = await page.request.post(`/api/personas/${personaId}/ai-analysis`);
    // POST /api/personas/:id/ai-analysis returns 200 (default NextResponse status)
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.sessionId).toBeDefined();
  });

  test('get analysis session data', async ({ page }) => {
    // Start a session
    const startResponse = await page.request.post(`/api/personas/${personaId}/ai-analysis`);
    expect(startResponse.status()).toBe(200);
    const session = await startResponse.json();
    const sessionId = session.sessionId;

    // Get the session data
    const getResponse = await page.request.get(
      `/api/personas/${personaId}/ai-analysis/${sessionId}`,
    );
    expect(getResponse.status()).toBe(200);

    const data = await getResponse.json();
    expect(data.messages).toBeDefined();
    expect(Array.isArray(data.messages)).toBe(true);
    expect(typeof data.progress).toBe('number');
  });

  test('answer analysis question', async ({ page }) => {
    // Start a session
    const startResponse = await page.request.post(`/api/personas/${personaId}/ai-analysis`);
    expect(startResponse.status()).toBe(200);
    const session = await startResponse.json();
    const sessionId = session.sessionId;

    // Answer the first question
    const answerResponse = await page.request.post(
      `/api/personas/${personaId}/ai-analysis/${sessionId}/answer`,
      {
        data: { content: 'This persona focuses on technology startups and values innovation.' },
      },
    );
    expect(answerResponse.status()).toBe(200);

    const data = await answerResponse.json();
    expect(typeof data.progress).toBe('number');
  });

  test('complete analysis', async ({ page }) => {
    // Start a session
    const startResponse = await page.request.post(`/api/personas/${personaId}/ai-analysis`);
    expect(startResponse.status()).toBe(200);
    const session = await startResponse.json();
    const sessionId = session.sessionId;

    // Answer questions until progress is sufficient, then complete
    let progress = 0;
    let attempts = 0;
    const maxAttempts = 10;

    while (progress < 100 && attempts < maxAttempts) {
      const answerResponse = await page.request.post(
        `/api/personas/${personaId}/ai-analysis/${sessionId}/answer`,
        {
          data: { content: `Analysis answer ${attempts + 1}: The persona demonstrates strong brand affinity.` },
        },
      );
      const answerData = await answerResponse.json();
      progress = answerData.progress ?? 0;
      attempts++;
    }

    // Complete the session
    const completeResponse = await page.request.post(
      `/api/personas/${personaId}/ai-analysis/${sessionId}/complete`,
    );
    expect(completeResponse.status()).toBe(200);
  });

  test('analysis on non-existent persona returns 404', async ({ page }) => {
    const response = await page.request.post(
      '/api/personas/non-existent-id-12345/ai-analysis',
    );
    expect(response.status()).toBe(404);
  });
});
