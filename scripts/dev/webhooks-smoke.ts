// Smoke voor P3.3 outbound webhooks (tasks/public-brand-api.md).
// GEEN AI-calls en GEEN externe netwerk-calls — de ontvanger is een lokale
// http-server; alle "netwerk"-verkeer blijft op 127.0.0.1.
//
// Dekt:
//   1. SSRF-guard-unit-checks op validateWebhookUrl (https-plicht + denylist)
//   2. dispatch → ontvangst + geldige HMAC + metadata-only payload
//   3. event-type-filtering (endpoint met ander event-type ontvangt niets)
//   4. inactive endpoint ontvangt niets
//   5. failureCount++ (+ lastDeliveryStatus 0) bij onbereikbare URL
//   6. auto-deactivatie bij het bereiken van 25 opeenvolgende failures
//
// NB: de test-endpoints wijzen naar http://127.0.0.1:<poort> — de beheer-route
// (/api/workspace/webhooks) weigert zulke URLs terecht via de SSRF-guard, dus
// de test-rijen worden hier bewust direct via Prisma aangemaakt (eigen
// wegwerp-organization+workspace; alles wordt aan het eind opgeruimd).
//
// Run: node --env-file-if-exists=.env.local node_modules/.bin/tsx \
//        scripts/dev/webhooks-smoke.ts

import { createHmac } from 'crypto';
import { createServer, type Server } from 'http';

import { prisma } from '../../src/lib/prisma';
import { dispatchWebhookEvent, validateWebhookUrl } from '../../src/lib/api/public/webhooks';

let pass = 0;
let fail = 0;

function assert(cond: boolean, label: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} — ${label}`);
  if (cond) pass++;
  else {
    fail++;
    process.exitCode = 1;
  }
}

interface ReceivedRequest {
  path: string;
  rawBody: string;
  signature: string;
  eventHeader: string;
}

function startReceiver(received: ReceivedRequest[]): Promise<{ server: Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        received.push({
          path: req.url ?? '',
          rawBody: Buffer.concat(chunks).toString('utf8'),
          signature: String(req.headers['x-branddock-signature'] ?? ''),
          eventHeader: String(req.headers['x-branddock-event'] ?? ''),
        });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{"ok":true}');
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('Receiver kreeg geen poort'));
        return;
      }
      resolve({ server, port: address.port });
    });
  });
}

/**
 * Bootstrap: deze worktree mag geen `prisma db push` draaien (afspraak in de
 * task), dus de smoke maakt de tabel zelf aan — additief en idempotent
 * (CREATE TABLE IF NOT EXISTS, exact de DDL die db push voor het model zou
 * genereren). Bewust géén full-schema-push: die zou drift van andere
 * worktrees mee-pushen. De tabel blijft staan (matcht het schema op deze
 * branch); de test-ríjen worden wél opgeruimd via de org-cascade.
 */
async function ensureWebhookEndpointTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WebhookEndpoint" (
      "id" TEXT NOT NULL,
      "workspaceId" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "secret" TEXT NOT NULL,
      "events" TEXT[],
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastDeliveryAt" TIMESTAMP(3),
      "lastDeliveryStatus" INTEGER,
      "failureCount" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "WebhookEndpoint_workspaceId_fkey" FOREIGN KEY ("workspaceId")
        REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "WebhookEndpoint_workspaceId_idx" ON "WebhookEndpoint"("workspaceId")',
  );
}

async function main(): Promise<void> {
  await ensureWebhookEndpointTable();

  console.log('\n── 1. SSRF-guard-unit-checks (validateWebhookUrl) ──');
  const refused = [
    'http://example.com/hook', // geen https
    'https://localhost/hook',
    'https://127.0.0.1/hook',
    'https://127.9.8.7/hook', // hele 127/8-range
    'https://0.0.0.0/hook',
    'https://10.0.0.5/hook',
    'https://172.16.0.1/hook',
    'https://172.31.255.255/hook',
    'https://192.168.1.10/hook',
    'https://169.254.169.254/hook', // cloud-metadata
    'https://[::1]/hook',
    'not a url',
  ];
  for (const url of refused) {
    assert(!validateWebhookUrl(url).ok, `weigert ${url}`);
  }
  const allowed = [
    'https://example.com/hook',
    'https://hooks.n8n.cloud/webhook/abc',
    'https://172.15.0.1/hook', // nét buiten 172.16/12
    'https://172.32.0.1/hook',
  ];
  for (const url of allowed) {
    assert(validateWebhookUrl(url).ok, `accepteert ${url}`);
  }

  console.log('\n── 2. Setup: wegwerp-workspace + lokale ontvanger ──');
  const stamp = Date.now();
  const org = await prisma.organization.create({
    data: { name: `Webhooks Smoke ${stamp}`, slug: `webhooks-smoke-org-${stamp}` },
    select: { id: true },
  });
  const workspace = await prisma.workspace.create({
    data: { name: 'Webhooks Smoke', slug: `webhooks-smoke-ws-${stamp}`, organizationId: org.id },
    select: { id: true },
  });

  const received: ReceivedRequest[] = [];
  const { server, port } = await startReceiver(received);
  console.log(`  ontvanger draait op 127.0.0.1:${port}, workspace ${workspace.id}`);

  try {
    const secretA = `whsec_smoke_a_${stamp}`;
    const [epA, epB, epC, epD, epE] = await Promise.all([
      // A: geabonneerd op content.published — moet ontvangen.
      prisma.webhookEndpoint.create({
        data: {
          workspaceId: workspace.id,
          url: `http://127.0.0.1:${port}/hook-a`,
          secret: secretA,
          events: ['content.published'],
        },
        select: { id: true },
      }),
      // B: alléén fidelity.scored — mag content.published NIET ontvangen.
      prisma.webhookEndpoint.create({
        data: {
          workspaceId: workspace.id,
          url: `http://127.0.0.1:${port}/hook-b`,
          secret: `whsec_smoke_b_${stamp}`,
          events: ['fidelity.scored'],
        },
        select: { id: true },
      }),
      // C: geabonneerd maar inactive — mag niets ontvangen.
      prisma.webhookEndpoint.create({
        data: {
          workspaceId: workspace.id,
          url: `http://127.0.0.1:${port}/hook-c`,
          secret: `whsec_smoke_c_${stamp}`,
          events: ['content.published'],
          active: false,
        },
        select: { id: true },
      }),
      // D: onbereikbare URL (gesloten poort) — failureCount++ verwacht.
      prisma.webhookEndpoint.create({
        data: {
          workspaceId: workspace.id,
          url: 'http://127.0.0.1:1/hook-d',
          secret: `whsec_smoke_d_${stamp}`,
          events: ['content.published'],
        },
        select: { id: true },
      }),
      // E: onbereikbaar én al 24 failures — moet nu auto-deactiveren.
      prisma.webhookEndpoint.create({
        data: {
          workspaceId: workspace.id,
          url: 'http://127.0.0.1:1/hook-e',
          secret: `whsec_smoke_e_${stamp}`,
          events: ['content.published'],
          failureCount: 24,
        },
        select: { id: true },
      }),
    ]);

    console.log('\n── 3. Dispatch content.published ──');
    const eventData = { entityType: 'Deliverable', entityId: `smoke-deliverable-${stamp}` };
    await dispatchWebhookEvent(workspace.id, 'content.published', eventData);

    const hitsA = received.filter((r) => r.path === '/hook-a');
    assert(hitsA.length === 1, 'geabonneerd+actief endpoint (A) ontving precies 1 delivery');
    assert(
      received.every((r) => r.path === '/hook-a'),
      'endpoint met ander event-type (B) en inactive endpoint (C) ontvingen niets',
    );

    const hitA = hitsA[0];
    if (hitA) {
      const expected = `sha256=${createHmac('sha256', secretA).update(hitA.rawBody).digest('hex')}`;
      assert(hitA.signature === expected, 'x-branddock-signature is een geldige HMAC over de raw body');
      assert(hitA.eventHeader === 'content.published', 'x-branddock-event header klopt');

      const body = JSON.parse(hitA.rawBody) as {
        event: string;
        workspaceId: string;
        timestamp: string;
        data: Record<string, unknown>;
      };
      assert(body.event === 'content.published', 'body.event klopt');
      assert(body.workspaceId === workspace.id, 'body.workspaceId klopt');
      assert(!Number.isNaN(Date.parse(body.timestamp)), 'body.timestamp is een geldige ISO-datum');
      assert(
        JSON.stringify(Object.keys(body.data).sort()) === JSON.stringify(['entityId', 'entityType']),
        'payload is metadata-only (exact entityType + entityId, geen content-velden)',
      );
    }

    console.log('\n── 4. Delivery-telemetrie in de DB ──');
    const [rowA, rowB, rowC, rowD, rowE] = await Promise.all(
      [epA, epB, epC, epD, epE].map((ep) =>
        prisma.webhookEndpoint.findUniqueOrThrow({
          where: { id: ep.id },
          select: { lastDeliveryAt: true, lastDeliveryStatus: true, failureCount: true, active: true },
        }),
      ),
    );
    assert(rowA.lastDeliveryStatus === 200 && rowA.failureCount === 0, 'A: lastDeliveryStatus=200, failureCount=0');
    assert(rowA.lastDeliveryAt !== null, 'A: lastDeliveryAt gezet');
    assert(rowB.lastDeliveryAt === null && rowC.lastDeliveryAt === null, 'B/C: geen delivery-poging geregistreerd');
    assert(
      rowD.failureCount === 1 && rowD.lastDeliveryStatus === 0 && rowD.active,
      'D (onbereikbaar): failureCount=1, lastDeliveryStatus=0, blijft actief',
    );
    assert(
      rowE.failureCount === 25 && rowE.active === false,
      'E (25e opeenvolgende failure): auto-gedeactiveerd',
    );

    console.log('\n── 5. Dispatch fidelity.scored — filtering andersom ──');
    received.length = 0;
    await dispatchWebhookEvent(workspace.id, 'fidelity.scored', {
      entityType: 'ContentFidelityScore',
      entityId: `smoke-score-${stamp}`,
      compositeScore: 61.5,
      thresholdMet: false,
    });
    assert(
      received.length === 1 && received[0]?.path === '/hook-b',
      'alleen het fidelity.scored-endpoint (B) ontving de delivery',
    );
    assert(received[0]?.eventHeader === 'fidelity.scored', 'B: x-branddock-event=fidelity.scored');
  } finally {
    console.log('\n── 6. Opruimen ──');
    server.close();
    // Cascade: organization → workspace → webhook-endpoints.
    await prisma.organization.delete({ where: { id: org.id } }).catch((err) => {
      console.warn('  opruimen faalde (handmatig checken):', err instanceof Error ? err.message : err);
    });
    console.log('  wegwerp-organization (incl. workspace + endpoints) verwijderd');
  }

  console.log(`\nResultaat: ${pass} PASS / ${fail} FAIL\n`);
}

main()
  .catch((err) => {
    console.error('Smoke crashte:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
