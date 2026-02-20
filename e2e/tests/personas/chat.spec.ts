import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_WORKSPACE } from '../../fixtures/test-data';

test.describe('Personas — Chat', () => {
  let personaId: string;
  const sessionIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
    });

    // Get the first persona from the list
    const listResponse = await page.request.get('/api/personas');
    const listData = await listResponse.json();
    personaId = listData.personas[0].id;
  });

  test('start chat session', async ({ page }) => {
    const response = await page.request.post(`/api/personas/${personaId}/chat`, {
      data: { mode: 'FREE_CHAT' },
    });
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.sessionId).toBeDefined();
    sessionIds.push(data.sessionId);
  });

  test('send message in chat', async ({ page }) => {
    // Start a session first
    const startResponse = await page.request.post(`/api/personas/${personaId}/chat`, {
      data: { mode: 'FREE_CHAT' },
    });
    expect(startResponse.status()).toBe(201);
    const session = await startResponse.json();
    const sessionId = session.sessionId;
    sessionIds.push(sessionId);

    // Send a message
    const messageResponse = await page.request.post(
      `/api/personas/${personaId}/chat/${sessionId}/message`,
      {
        data: { content: 'Tell me about your daily routine.' },
      },
    );
    expect(messageResponse.status()).toBe(200);

    const messageData = await messageResponse.json();
    expect(messageData.reply).toBeDefined();
    expect(messageData.reply.content).toBeDefined();
    expect(typeof messageData.reply.content).toBe('string');
  });

  test('get chat insights', async ({ page }) => {
    // Start a session
    const startResponse = await page.request.post(`/api/personas/${personaId}/chat`, {
      data: { mode: 'FREE_CHAT' },
    });
    expect(startResponse.status()).toBe(201);
    const session = await startResponse.json();
    const sessionId = session.sessionId;
    sessionIds.push(sessionId);

    // Send a message to potentially generate insights
    await page.request.post(
      `/api/personas/${personaId}/chat/${sessionId}/message`,
      {
        data: { content: 'What are your biggest challenges at work?' },
      },
    );

    // Get insights
    const insightsResponse = await page.request.get(
      `/api/personas/${personaId}/chat/${sessionId}/insights`,
    );
    expect(insightsResponse.status()).toBe(200);
  });

  test('chat with non-existent persona returns 404', async ({ page }) => {
    const response = await page.request.post('/api/personas/non-existent-id-12345/chat', {
      data: { mode: 'FREE_CHAT' },
    });
    expect(response.status()).toBe(404);
  });
});
