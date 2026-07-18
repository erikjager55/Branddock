// =============================================================
// Unit-tests voor het MCP-client-laagje (src/mcp.ts, gebundeld naar
// .test-build/mcp.mjs door build.mjs): JSON-RPC-request-vorm, parsing van
// text-content-JSON, tool-errors, 401-afhandeling en de getypeerde
// tool-wrappers. Alle fetches zijn gemockt — geen echte netwerk-calls.
// =============================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  callTool,
  initializeMcp,
  parseSseJson,
  listBrands,
  rewriteOnBrandTool,
  scoreAgainstBrandTool,
  BranddockApiError,
  SESSION_EXPIRED_MESSAGE,
} from '../.test-build/mcp.mjs';

const config = { baseUrl: 'https://app.example.com/', bearer: 'token-1' };

function rpcResponse(result, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function toolResponse(payload, isError = false) {
  return rpcResponse({
    isError,
    content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload) }],
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

// ─── Request-vorm + result-parsing ───────────────────────────

test('callTool: JSON-RPC-request met Bearer en dubbele Accept-header', async () => {
  const fetchFn = mockFetch(toolResponse({ ok: true }));
  const result = await callTool(config, 'list_brands', {}, fetchFn);

  assert.equal(fetchFn.calls.length, 1);
  const { url, init } = fetchFn.calls[0];
  assert.equal(url, 'https://app.example.com/api/mcp');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers.Authorization, 'Bearer token-1');
  // De streamable-HTTP-transport van de server eist beide content-types.
  assert.equal(init.headers.Accept, 'application/json, text/event-stream');
  const body = JSON.parse(init.body);
  assert.equal(body.jsonrpc, '2.0');
  assert.equal(body.method, 'tools/call');
  assert.deepEqual(body.params, { name: 'list_brands', arguments: {} });
  assert.deepEqual(result, { ok: true });
});

test('callTool: tool-error (isError) → BranddockApiError met server-tekst', async () => {
  const fetchFn = mockFetch(toolResponse('BRAND_NOT_FOUND: no access to that brand', true));
  await assert.rejects(callTool(config, 'rewrite_on_brand', {}, fetchFn), (error) => {
    assert.ok(error instanceof BranddockApiError);
    assert.match(error.message, /BRAND_NOT_FOUND/);
    return true;
  });
});

test('callTool: INSUFFICIENT_CREDITS wordt een NL-credits-melding', async () => {
  const fetchFn = mockFetch(toolResponse('INSUFFICIENT_CREDITS: balance 0', true));
  await assert.rejects(callTool(config, 'rewrite_on_brand', {}, fetchFn), /Onvoldoende credits/);
});

test('callTool: HTTP 401 → sessie-verlopen-melding met status 401', async () => {
  const fetchFn = mockFetch(
    new Response(
      JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Unauthorized' }, id: null }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    ),
  );
  await assert.rejects(callTool(config, 'list_brands', {}, fetchFn), (error) => {
    assert.ok(error instanceof BranddockApiError);
    assert.equal(error.status, 401);
    assert.equal(error.message, SESSION_EXPIRED_MESSAGE);
    return true;
  });
});

test('callTool: JSON-RPC-error-object → MCP-foutmelding', async () => {
  const fetchFn = mockFetch(
    new Response(
      JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'Invalid params' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  );
  await assert.rejects(callTool(config, 'list_brands', {}, fetchFn), /MCP-fout: Invalid params/);
});

test('callTool: niet-JSON-text-content → nette parse-fout', async () => {
  const fetchFn = mockFetch(toolResponse('dit is geen json'));
  await assert.rejects(callTool(config, 'list_brands', {}, fetchFn), /geen leesbaar JSON/);
});

test('callTool: netwerkfout → status 0 met bereikbaarheids-melding', async () => {
  const fetchFn = async () => {
    throw new TypeError('fetch failed');
  };
  await assert.rejects(callTool(config, 'list_brands', {}, fetchFn), (error) => {
    assert.ok(error instanceof BranddockApiError);
    assert.equal(error.status, 0);
    assert.match(error.message, /niet bereiken/);
    return true;
  });
});

test('SSE-fallback: text/event-stream-respons wordt geparsed', async () => {
  const payload = { jsonrpc: '2.0', id: 1, result: { isError: false, content: [{ type: 'text', text: '{"a":1}' }] } };
  const body = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;
  const fetchFn = mockFetch(
    new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
  );
  const result = await callTool(config, 'list_brands', {}, fetchFn);
  assert.deepEqual(result, { a: 1 });
});

test('parseSseJson: pakt de laatste data-regel, lege body → fout', () => {
  const parsed = parseSseJson('data: {"id":1}\n\ndata: {"id":2}\n');
  assert.equal(parsed.id, 2);
  assert.throws(() => parseSseJson('event: message\n\n'), /Leeg antwoord/);
});

// ─── initialize ──────────────────────────────────────────────

test('initializeMcp: handshake stuurt protocolversie + clientInfo', async () => {
  const fetchFn = mockFetch(
    rpcResponse({ protocolVersion: '2025-06-18', serverInfo: { name: 'branddock', version: '1.0.0' } }),
  );
  const serverInfo = await initializeMcp(config, fetchFn);

  const body = JSON.parse(fetchFn.calls[0].init.body);
  assert.equal(body.method, 'initialize');
  assert.equal(typeof body.params.protocolVersion, 'string');
  assert.equal(body.params.clientInfo.name, 'branddock-everywhere-extension');
  assert.equal(serverInfo.name, 'branddock');
});

// ─── Getypeerde tool-wrappers ────────────────────────────────

test('listBrands: parseert het brands-array uit het text-content-JSON', async () => {
  const brands = [
    { workspaceId: 'ws_1', name: 'Better Brands', organizationName: 'BB BV', role: 'owner', isDefault: true },
    { workspaceId: 'ws_2', name: 'Acme', organizationName: 'Acme Corp', role: 'member', isDefault: false },
  ];
  const fetchFn = mockFetch(toolResponse({ count: 2, brands }));
  const result = await listBrands(config, fetchFn);

  const body = JSON.parse(fetchFn.calls[0].init.body);
  assert.equal(body.params.name, 'list_brands');
  assert.deepEqual(result, brands);
});

test('rewriteOnBrandTool: stuurt brand-param mee wanneer gekozen', async () => {
  const fetchFn = mockFetch(toolResponse({ text: 'Herschreven.', model: 'claude-sonnet' }));
  const result = await rewriteOnBrandTool(
    config,
    { content: 'Tekst om te herschrijven.', intent: 'reply', instruction: 'korter', brand: 'ws_2' },
    fetchFn,
  );

  const body = JSON.parse(fetchFn.calls[0].init.body);
  assert.equal(body.params.name, 'rewrite_on_brand');
  assert.deepEqual(body.params.arguments, {
    content: 'Tekst om te herschrijven.',
    intent: 'reply',
    instruction: 'korter',
    brand: 'ws_2',
  });
  assert.deepEqual(result, { text: 'Herschreven.', model: 'claude-sonnet' });
});

test('rewriteOnBrandTool: zonder merk-keuze géén brand-param ("Volg Branddock")', async () => {
  const fetchFn = mockFetch(toolResponse({ text: 'Herschreven.', model: 'claude-sonnet' }));
  await rewriteOnBrandTool(config, { content: 'Tekst om te herschrijven.' }, fetchFn);

  const body = JSON.parse(fetchFn.calls[0].init.body);
  assert.deepEqual(body.params.arguments, { content: 'Tekst om te herschrijven.' });
});

test('scoreAgainstBrandTool: brand-param + score-shape', async () => {
  const payload = {
    compositeScore: 78.4,
    thresholdMet: true,
    findingsCount: 3,
    result: { compositeScore: 78.4, thresholdMet: true, compositeThreshold: 70, wordCount: 245 },
  };
  const fetchFn = mockFetch(toolResponse(payload));
  const response = await scoreAgainstBrandTool(config, 'Een lange tekst om te scoren.', 'ws_2', fetchFn);

  const body = JSON.parse(fetchFn.calls[0].init.body);
  assert.equal(body.params.name, 'score_against_brand');
  assert.deepEqual(body.params.arguments, { content: 'Een lange tekst om te scoren.', brand: 'ws_2' });
  assert.equal(response.findingsCount, 3);
  assert.equal(response.result.compositeThreshold, 70);
});
