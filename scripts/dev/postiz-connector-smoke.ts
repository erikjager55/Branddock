// Smoke voor de Postiz-connector (P3.5) — mock-server-variant.
//
// Run: node --env-file-if-exists=.env.local node_modules/.bin/tsx \
//        scripts/dev/postiz-connector-smoke.ts
//
// Valideert ÓNZE kant van het contract tegen een lokale mock: auth-header
// (rauwe key, geen Bearer), request-shape (type now/schedule, integration-id,
// content), response-parsing (postId/id-varianten) en de foutafhandeling
// (non-2xx → leesbare fout). Einde-tot-einde tegen echt Postiz vereist
// account-credentials (user-held) — gedocumenteerd in tasks/public-brand-api.md.

import { createServer } from 'http';
import type { AddressInfo } from 'net';
import { createPostizPost, listPostizIntegrations } from '../../src/lib/integrations/postiz/postiz-client';

function assert(cond: boolean, label: string): void {
  if (cond) {
    console.log(`  PASS — ${label}`);
  } else {
    console.error(`  FAIL — ${label}`);
    process.exitCode = 1;
  }
}

interface CapturedRequest {
  path: string;
  auth: string | undefined;
  body: unknown;
}

async function main(): Promise<void> {
  const captured: CapturedRequest[] = [];
  let mode: 'ok' | 'error' | 'alt-shape' = 'ok';

  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c: Buffer) => (raw += c.toString()));
    req.on('end', () => {
      captured.push({
        path: req.url ?? '',
        auth: req.headers.authorization,
        body: raw ? JSON.parse(raw) : null,
      });
      if (mode === 'error') {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ message: 'Invalid API key' }));
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      if (req.url?.startsWith('/integrations')) {
        res.end(JSON.stringify([{ id: 'int_1', name: 'LinkedIn — Better Brands', identifier: 'linkedin' }]));
      } else if (mode === 'alt-shape') {
        res.end(JSON.stringify({ id: 'post_alt_9' }));
      } else {
        res.end(JSON.stringify([{ postId: 'post_123' }]));
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const opts = { apiKey: 'pz_test_key', baseUrl: `http://127.0.0.1:${port}` };

  console.log('1. Integrations-lijst');
  const integrations = await listPostizIntegrations(opts);
  assert(integrations.length === 1 && integrations[0].id === 'int_1', 'lijst geparsed');
  assert(captured[0].auth === 'pz_test_key', 'rauwe key in Authorization (geen Bearer)');

  console.log('\n2. Post direct (type now)');
  const now = await createPostizPost(opts, { integrationId: 'int_1', content: 'On-brand testpost' });
  assert(now.externalId === 'post_123', `externalId uit array-shape (${now.externalId})`);
  const nowBody = captured[1].body as { type?: string; posts?: Array<{ integration?: { id?: string }; value?: Array<{ content?: string }> }> };
  assert(nowBody.type === 'now', 'type now zonder scheduledAt');
  assert(nowBody.posts?.[0]?.integration?.id === 'int_1', 'integration-id in payload');
  assert(nowBody.posts?.[0]?.value?.[0]?.content === 'On-brand testpost', 'content in payload');

  console.log('\n3. Post gepland (type schedule) + alternatieve response-shape');
  mode = 'alt-shape';
  const later = await createPostizPost(opts, {
    integrationId: 'int_1',
    content: 'Geplande post',
    scheduledAt: '2026-08-01T09:00:00.000Z',
  });
  const schedBody = captured[2].body as { type?: string; date?: string };
  assert(schedBody.type === 'schedule' && schedBody.date === '2026-08-01T09:00:00.000Z', 'type schedule + datum');
  assert(later.externalId === 'post_alt_9', 'externalId uit object-shape');

  console.log('\n4. Foutafhandeling');
  mode = 'error';
  let threw = false;
  try {
    await createPostizPost(opts, { integrationId: 'int_1', content: 'x' });
  } catch (err) {
    threw = err instanceof Error && err.message.includes('Postiz 401') && err.message.includes('Invalid API key');
  }
  assert(threw, 'non-2xx → leesbare fout met status + body');

  server.close();
  console.log('\nKlaar.');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
