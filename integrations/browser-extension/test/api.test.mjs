// =============================================================
// Unit-tests voor de kern-API-wrapper (src/api.ts, gebundeld naar
// .test-build/api.mjs door build.mjs). Alle fetches zijn gemockt —
// geen echte netwerk-calls.
// =============================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rewrite,
  score,
  testConnection,
  buildInstruction,
  normalizeBaseUrl,
  BranddockApiError,
  MAX_INSTRUCTION_CHARS,
} from '../.test-build/api.mjs';

const config = {
  baseUrl: 'https://app.example.com/',
  apiKey: `bd_live_${'a'.repeat(48)}`,
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockFetch(response) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return typeof response === 'function' ? response(url, init) : response;
  };
  fn.calls = calls;
  return fn;
}

test('normalizeBaseUrl: trimt en verwijdert trailing slashes', () => {
  assert.equal(normalizeBaseUrl('https://app.example.com/'), 'https://app.example.com');
  assert.equal(normalizeBaseUrl('  https://app.example.com//  '), 'https://app.example.com');
  assert.equal(normalizeBaseUrl('http://localhost:3000'), 'http://localhost:3000');
});

test('buildInstruction: combineert doelgroep-notitie en extra instructie', () => {
  assert.equal(buildInstruction('', ''), undefined);
  assert.equal(buildInstruction('  ', '  '), undefined);
  assert.equal(buildInstruction('facilitair managers', ''), 'Doelgroep: facilitair managers');
  assert.equal(buildInstruction('', 'korter'), 'korter');
  assert.equal(
    buildInstruction('facilitair managers', 'korter'),
    'Doelgroep: facilitair managers\nkorter',
  );
  const long = buildInstruction('x'.repeat(600), '');
  assert.equal(long.length, MAX_INSTRUCTION_CHARS);
});

test('rewrite: stuurt correct request en parseert de respons', async () => {
  const fetchFn = mockFetch(
    jsonResponse({ workspaceId: 'ws_1', text: 'Herschreven tekst.', model: 'claude-sonnet' }),
  );
  const result = await rewrite(
    config,
    {
      content: 'Dit is een testtekst van ruim voldoende lengte.',
      intent: 'reply',
      instruction: 'korter',
    },
    fetchFn,
  );

  assert.equal(fetchFn.calls.length, 1);
  const { url, init } = fetchFn.calls[0];
  assert.equal(url, 'https://app.example.com/api/v1/rewrite');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers.Authorization, `Bearer ${config.apiKey}`);
  assert.equal(init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(init.body), {
    content: 'Dit is een testtekst van ruim voldoende lengte.',
    intent: 'reply',
    instruction: 'korter',
  });
  assert.equal(result.text, 'Herschreven tekst.');
  assert.equal(result.model, 'claude-sonnet');
});

test('rewrite: 401 wordt een BranddockApiError met status en NL-melding', async () => {
  const fetchFn = mockFetch(jsonResponse({ error: 'Invalid or missing API key' }, 401));
  await assert.rejects(
    rewrite(config, { content: 'Nog een testtekst van voldoende lengte.' }, fetchFn),
    (error) => {
      assert.ok(error instanceof BranddockApiError);
      assert.equal(error.status, 401);
      assert.match(error.message, /API-key/);
      return true;
    },
  );
});

test('rewrite: server-fout met code komt door in de error', async () => {
  const fetchFn = mockFetch(
    jsonResponse({ error: 'Content generation failed', code: 'GENERATION_FAILED' }, 502),
  );
  await assert.rejects(
    rewrite(config, { content: 'Nog een testtekst van voldoende lengte.' }, fetchFn),
    (error) => {
      assert.ok(error instanceof BranddockApiError);
      assert.equal(error.status, 502);
      assert.equal(error.code, 'GENERATION_FAILED');
      assert.equal(error.message, 'Content generation failed');
      return true;
    },
  );
});

test('score: stuurt content en parseert compositeScore/findingsCount', async () => {
  const fetchFn = mockFetch(
    jsonResponse({
      workspaceId: 'ws_1',
      reviewLogId: 'log_1',
      findingsCount: 3,
      result: { compositeScore: 78.4, thresholdMet: true, compositeThreshold: 70, wordCount: 245 },
    }),
  );
  const content = 'Een stuk tekst dat lang genoeg is om betekenisvol te scoren tegen het merk.';
  const response = await score(config, content, fetchFn);

  const { url, init } = fetchFn.calls[0];
  assert.equal(url, 'https://app.example.com/api/v1/score');
  assert.deepEqual(JSON.parse(init.body), { content });
  assert.equal(response.findingsCount, 3);
  assert.equal(response.result.compositeScore, 78.4);
  assert.equal(response.result.thresholdMet, true);
});

test('testConnection: 200 op brand-context betekent geldige key', async () => {
  const fetchFn = mockFetch(jsonResponse({ workspaceId: 'ws_1', context: {} }));
  const result = await testConnection(config, fetchFn);

  const { url, init } = fetchFn.calls[0];
  assert.equal(url, 'https://app.example.com/api/v1/brand-context');
  assert.equal(init.method, 'GET');
  assert.equal(init.headers.Authorization, `Bearer ${config.apiKey}`);
  assert.deepEqual(result, { ok: true, workspaceId: 'ws_1' });
});

test('testConnection: 401 → key-melding, 404 → base-url-melding', async () => {
  const unauthorized = await testConnection(config, mockFetch(jsonResponse({ error: 'nope' }, 401)));
  assert.equal(unauthorized.ok, false);
  assert.equal(unauthorized.status, 401);
  assert.match(unauthorized.message, /API-key/);

  const notFound = await testConnection(config, mockFetch(jsonResponse({ error: 'Not found' }, 404)));
  assert.equal(notFound.ok, false);
  assert.equal(notFound.status, 404);
  assert.match(notFound.message, /Base URL/);
});

test('testConnection: netwerkfout → status 0 met bereikbaarheids-melding', async () => {
  const fetchFn = async () => {
    throw new TypeError('fetch failed');
  };
  const result = await testConnection(config, fetchFn);
  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.match(result.message, /niet bereiken/);
});

test('foutrespons zonder JSON-body valt terug op status-mapping', async () => {
  const fetchFn = mockFetch(new Response('<html>Bad gateway</html>', { status: 502 }));
  await assert.rejects(
    rewrite(config, { content: 'Nog een testtekst van voldoende lengte.' }, fetchFn),
    (error) => {
      assert.ok(error instanceof BranddockApiError);
      assert.equal(error.status, 502);
      assert.match(error.message, /HTTP 502/);
      return true;
    },
  );
});
