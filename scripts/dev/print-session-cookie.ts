/**
 * Print een geldige gesigneerde sessie-cookie voor de workspace van een
 * deliverable — voor Playwright-reproducties tegen de live dev-server.
 * Zelfde signing-aanpak als run-compose-render.ts.
 *
 * Run: npx tsx --env-file=.env.local scripts/dev/print-session-cookie.ts <deliverableId>
 */
import { prisma } from '../../src/lib/prisma';
import { makeSignature } from 'better-auth/crypto';

async function main(): Promise<void> {
  const deliverableId = process.argv[2];
  if (!deliverableId) throw new Error('Usage: print-session-cookie.ts <deliverableId>');
  // De output ÍS een werkende credential (gesigneerde sessie-cookie van een
  // org-member) — alleen tegen een lokale dev-stack minten, nooit productie.
  // Geparste hostname i.p.v. regex op de raw string (userinfo-trucs als
  // http://localhost:x@evil.com passeren een prefix-regex). Ook DATABASE_URL
  // moet lokaal zijn: de cookie ontleent z'n geldigheid aan DB + secret.
  const isLocalHost = (raw: string | undefined): boolean => {
    if (!raw) return false;
    try {
      const host = new URL(raw).hostname.toLowerCase();
      return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1' || host.endsWith('.localhost');
    } catch {
      return false;
    }
  };
  const dbHostLocal = (() => {
    try {
      const host = new URL(process.env.DATABASE_URL ?? '').hostname.toLowerCase();
      return host === 'localhost' || host === '127.0.0.1' || host === '';
    } catch {
      return false;
    }
  })();
  if (process.env.NODE_ENV === 'production' || !isLocalHost(process.env.BETTER_AUTH_URL) || !dbHostLocal) {
    throw new Error('Geweigerd: BETTER_AUTH_URL en DATABASE_URL moeten beide localhost zijn — dit script mint werkende sessie-cookies en is dev-only.');
  }
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET ontbreekt — draai met --env-file=.env.local');

  const dRow = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    select: {
      campaign: {
        select: { id: true, workspaceId: true, workspace: { select: { organizationId: true } } },
      },
    },
  });
  if (!dRow) throw new Error(`Deliverable ${deliverableId} niet gevonden`);
  const orgId = dRow.campaign.workspace.organizationId;
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    select: { userId: true },
  });
  const sess = await prisma.session.findFirst({
    where: { userId: { in: members.map((m) => m.userId) }, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'desc' },
    select: { token: true },
  });
  if (!sess) throw new Error(`Geen geldige sessie voor een member van org ${orgId}`);
  const signed = `${sess.token}.${await makeSignature(sess.token, secret)}`;
  console.log(
    JSON.stringify({
      sessionCookie: signed,
      workspaceId: dRow.campaign.workspaceId,
      campaignId: dRow.campaign.id,
      deliverableId,
    }),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit());
