// deliverable.generated-emit smoke — bewijst dat het webpage-pad (headless
// service) na deze wijziging een metadata-only webhook aflevert. De video-
// en SEO-sites zijn dezelfde one-liner na hun bewezen succes-punt (fal-kosten
// resp. 5+ min pipeline — bewust niet in deze smoke).
// Draaien vanuit de worktree-root:
//   node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/dev/deliverable-generated-emit-smoke.ts

import { createServer } from 'node:http';
import { prisma } from '../../src/lib/prisma';
import { generateWebPage } from '../../src/lib/content/headless-webpage';

const WS = process.env.SMOKE_WS ?? 'cmnomsobx009q44msn0gpw7vb'; // Better Brands dev
const PORT = 4571;

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass += 1; console.log(`  PASS ${name}`); }
  else { fail += 1; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

async function main() {
  console.log('# deliverable.generated-emit smoke (webpage-pad)\n');

  // Lokale ontvanger. NB: de dispatcher-SSRF-guard blokkeert loopback-URLs bij
  // AANMAAK via de route; direct in de DB zetten (zelfde truc als webhooks-smoke)
  // is hier legitiem — we testen de emit, niet de URL-validatie.
  const received: { event: string; body: Record<string, unknown> }[] = [];
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      received.push({ event: String(req.headers['x-branddock-event']), body: JSON.parse(raw) as Record<string, unknown> });
      res.writeHead(200).end('ok');
    });
  });
  await new Promise<void>((resolve) => server.listen(PORT, '127.0.0.1', resolve));

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      workspaceId: WS,
      url: `http://127.0.0.1:${PORT}/hook`,
      secret: 'whsec_smoke_emit',
      events: ['deliverable.generated'],
    },
  });

  let deliverableId: string | null = null;
  try {
    const result = await generateWebPage({
      workspaceId: WS,
      prompt: 'Korte landingspagina over merkconsistentie voor MKB-marketeers (emit-smoke).',
    });
    check('generateWebPage slaagt', result.ok, result.ok ? '' : `${result.code}: ${result.error}`);
    if (result.ok) deliverableId = result.deliverableId;

    // Fire-and-forget dispatch even tijd geven.
    await new Promise((r) => setTimeout(r, 3000));

    const hit = received.find((r) => r.event === 'deliverable.generated');
    check('webhook deliverable.generated ontvangen', Boolean(hit), `${received.length} ontvangen`);
    if (hit && result.ok) {
      const data = (hit.body.data ?? {}) as Record<string, unknown>;
      check('payload bevat juiste deliverableId', data.deliverableId === result.deliverableId, String(data.deliverableId));
      check('payload is metadata-only (geen content/puckData)', !('puckData' in data) && !('content' in data) && !('text' in data));
      check('payload bevat contentType', typeof data.contentType === 'string', String(data.contentType));
    }
  } finally {
    await prisma.webhookEndpoint.delete({ where: { id: endpoint.id } }).catch(() => undefined);
    if (deliverableId) await prisma.deliverable.delete({ where: { id: deliverableId } }).catch(() => undefined);
    server.close();
  }

  console.log(`\n== ${pass} PASS / ${fail} FAIL ==`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
