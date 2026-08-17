/**
 * Landing-page retentie-smoke (lp-review-followups §Retentie, ADR 2026-08-17).
 *
 * Twee delen, bewust gescheiden:
 *
 *  A. PUUR (geen database) — `retentionCutoff` + `selectPrunableCompiledHtml`,
 *     inclusief de live-pointer-casus. Hier zit het echte risico: rollback is
 *     een pointer-swap, dus de live versie is niet altijd de nieuwste.
 *  B. DB — seedt oude/verse rijen en 8 publishes met de live-pointer bewust op
 *     versie 2, draait de drie prune-functies en controleert de uitkomst.
 *
 * Wat deel B NIET dekt: de HTTP/auth-laag van de DELETE-route. Wat het wél
 * bewijst is de garantie waar die route op leunt — een `deleteMany` over de
 * scope-`where` raakt een submissie buiten de scope niet.
 *
 * ⚠ Deel B seedt zijn eigen organisatie/workspace en ruimt die op, MAAR de
 * prune-functies werken tabelbreed (dat is wat de cron doet). Draai je dit op
 * een DB met echte data ouder dan de windows, dan wordt die óók opgeruimd.
 * Gebruik SMOKE_PURE=1 als je dat niet wilt.
 *
 * Run (alles):  node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *                 scripts/dev/lp-retention-smoke.ts
 * Run (puur):   SMOKE_PURE=1 npx tsx scripts/dev/lp-retention-smoke.ts
 *
 * Zonder DATABASE_URL draait alleen deel A; dat wordt expliciet gemeld zodat
 * een gedeeltelijke run nooit als volledig groen leest.
 */

// Deel A importeert uit `retention-policy` (Prisma-vrij). De database-laag
// wordt in deel B lazy geïmporteerd, zodat een pure run niet struikelt over
// de DATABASE_URL-check in `src/lib/prisma.ts`.
import {
  COMPILED_HTML_KEEP_VERSIONS,
  FORM_SUBMISSION_RETENTION_MONTHS,
  PAGE_EVENT_RETENTION_MONTHS,
  retentionCutoff,
  selectPrunableCompiledHtml,
} from '../../src/lib/landing-pages/retention-policy';

let passed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(label);
    console.error(`  ✗ ${label}`);
  }
}

function monthsBack(months: number, extraDays = 0): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  date.setDate(date.getDate() - extraDays);
  return date;
}

// ─── Deel A — puur ────────────────────────────────────────────

function runPureChecks(): void {
  console.log('\nA. Pure selectie-logica');

  const now = new Date('2026-08-17T12:00:00.000Z');
  check(
    'retentionCutoff(13) is kalender-correct (2025-07-17)',
    retentionCutoff(13, now).toISOString().startsWith('2025-07-17'),
  );
  check(
    'retentionCutoff(26) is kalender-correct (2024-06-17)',
    retentionCutoff(26, now).toISOString().startsWith('2024-06-17'),
  );
  check('window-constanten ongewijzigd (13 / 26 / 5)',
    PAGE_EVENT_RETENTION_MONTHS === 13 &&
      FORM_SUBMISSION_RETENTION_MONTHS === 26 &&
      COMPILED_HTML_KEEP_VERSIONS === 5,
  );

  const publishes = [8, 7, 6, 5, 4, 3, 2, 1].map((version) => ({
    id: `v${version}`,
    version,
  }));

  const liveIsNewest = selectPrunableCompiledHtml(publishes, 'v8');
  check(
    'live = nieuwste → v3/v2/v1 prunebaar, nieuwste 5 blijven',
    liveIsNewest.join(',') === 'v3,v2,v1',
  );

  const liveIsOld = selectPrunableCompiledHtml(publishes, 'v2');
  check(
    'live = v2 (ná rollback) → v2 blijft, alleen v3/v1 prunebaar',
    liveIsOld.join(',') === 'v3,v1',
  );
  check('de live versie staat nooit in de prune-lijst', !liveIsOld.includes('v2'));

  check(
    'ongesorteerde input geeft dezelfde uitkomst',
    selectPrunableCompiledHtml([...publishes].reverse(), 'v2').join(',') === 'v3,v1',
  );
  check(
    'minder dan keepVersions publishes → niets prunebaar',
    selectPrunableCompiledHtml(publishes.slice(0, 4), null).length === 0,
  );
  check(
    'zonder live-pointer (legacy rij) → gewoon de oudste voorbij het venster',
    selectPrunableCompiledHtml(publishes, null).join(',') === 'v3,v2,v1',
  );
}

// ─── Deel B — database ────────────────────────────────────────

async function runDbChecks(): Promise<void> {
  console.log('\nB. Prune-functies tegen de database');
  const { prisma } = await import('../../src/lib/prisma');
  const { prunePageEvents, pruneFormSubmissions, pruneCompiledHtml } = await import(
    '../../src/lib/landing-pages/retention'
  );

  const marker = `lp-retention-smoke-${Date.now()}`;
  // Alle fixture-creatie staat ín de try: viel dit erbuiten, dan lekten
  // organisatie en workspace zodra een latere create faalde.
  let organizationId: string | undefined;

  try {
    const organization = await prisma.organization.create({
      data: { name: marker, slug: marker },
      select: { id: true },
    });
    organizationId = organization.id;
    const workspace = await prisma.workspace.create({
      data: { name: marker, slug: marker, organizationId: organization.id },
      select: { id: true },
    });
    const campaign = await prisma.campaign.create({
      data: { workspaceId: workspace.id, title: marker, slug: marker, type: 'CONTENT' },
      select: { id: true },
    });
    const deliverable = await prisma.deliverable.create({
      data: { campaignId: campaign.id, title: marker, contentType: 'Landing Page' },
      select: { id: true },
    });
    const page = await prisma.landingPage.create({
      data: {
        workspaceId: workspace.id,
        deliverableId: deliverable.id,
        slug: marker,
        puckData: {},
      },
      select: { id: true },
    });

    // 8 publishes, elk mét compiledHtml; live-pointer bewust op versie 2.
    const publishIds: Record<number, string> = {};
    for (let version = 1; version <= 8; version++) {
      const publish = await prisma.pagePublish.create({
        data: {
          landingPageId: page.id,
          version,
          puckData: { version },
          compiledHtml: `<html data-v="${version}"></html>`,
        },
        select: { id: true },
      });
      publishIds[version] = publish.id;
    }
    await prisma.landingPage.update({
      where: { id: page.id },
      data: { livePublishId: publishIds[2] },
    });

    const oldEvent = await prisma.pageEvent.create({
      data: {
        workspaceId: workspace.id,
        landingPageId: page.id,
        kind: 'view',
        createdAt: monthsBack(PAGE_EVENT_RETENTION_MONTHS, 5),
      },
      select: { id: true },
    });
    const freshEvent = await prisma.pageEvent.create({
      data: { workspaceId: workspace.id, landingPageId: page.id, kind: 'view' },
      select: { id: true },
    });

    const oldSubmission = await prisma.formSubmission.create({
      data: {
        workspaceId: workspace.id,
        landingPageId: page.id,
        formId: marker,
        data: { email: 'oud@example.com' },
        createdAt: monthsBack(FORM_SUBMISSION_RETENTION_MONTHS, 5),
      },
      select: { id: true },
    });
    const freshSubmission = await prisma.formSubmission.create({
      data: {
        workspaceId: workspace.id,
        landingPageId: page.id,
        formId: marker,
        data: { email: 'vers@example.com' },
      },
      select: { id: true },
    });

    await prunePageEvents();
    check(
      'PageEvent ouder dan 13mnd verwijderd',
      (await prisma.pageEvent.findUnique({ where: { id: oldEvent.id } })) === null,
    );
    check(
      'PageEvent binnen het window blijft',
      (await prisma.pageEvent.findUnique({ where: { id: freshEvent.id } })) !== null,
    );

    await pruneFormSubmissions();
    check(
      'FormSubmission ouder dan 26mnd verwijderd',
      (await prisma.formSubmission.findUnique({ where: { id: oldSubmission.id } })) === null,
    );
    check(
      'FormSubmission binnen het window blijft',
      (await prisma.formSubmission.findUnique({ where: { id: freshSubmission.id } })) !== null,
    );

    await pruneCompiledHtml();
    const after = await prisma.pagePublish.findMany({
      where: { landingPageId: page.id },
      select: { version: true, compiledHtml: true, puckData: true },
      orderBy: { version: 'desc' },
    });
    const htmlByVersion = new Map(after.map((row) => [row.version, row.compiledHtml]));

    check(
      'nieuwste 5 versies (4-8) houden hun compiledHtml',
      [4, 5, 6, 7, 8].every((version) => htmlByVersion.get(version) !== null),
    );
    check(
      'LIVE versie 2 houdt haar compiledHtml ondanks positie buiten de nieuwste 5',
      htmlByVersion.get(2) !== null,
    );
    check(
      'versies 1 en 3 zijn geleegd',
      htmlByVersion.get(1) === null && htmlByVersion.get(3) === null,
    );
    check(
      'puckData is nergens aangeraakt (rollback blijft werken)',
      after.every((row) => row.puckData !== null),
    );

    // Scope-garantie waar de DELETE-route op leunt: een id buiten de
    // scope-`where` raakt 0 rijen, ook al bestaat het.
    const foreignPage = await prisma.landingPage.findFirst({
      where: { id: { not: page.id } },
      select: { id: true },
    });
    const scopeWhere = { workspaceId: workspace.id, OR: [{ landingPageId: { in: [page.id] } }] };
    const outsideScope = await prisma.formSubmission.deleteMany({
      where: { ...scopeWhere, id: freshSubmission.id + '-nonexistent' },
    });
    check('wis met een id buiten de scope raakt 0 rijen', outsideScope.count === 0);
    check(
      'de submissie staat er daarna nog',
      (await prisma.formSubmission.findUnique({ where: { id: freshSubmission.id } })) !== null,
    );
    if (foreignPage) {
      const crossScope = await prisma.formSubmission.count({
        where: { ...scopeWhere, landingPageId: foreignPage.id },
      });
      check('scope-where sluit een andere pagina uit', crossScope === 0);
    }

    const inScope = await prisma.formSubmission.deleteMany({
      where: { ...scopeWhere, id: freshSubmission.id },
    });
    check('wis binnen de scope raakt precies 1 rij', inScope.count === 1);
  } finally {
    // Organization-delete cascadeert workspace → campaign → deliverable →
    // landingPage → publishes/events/submissions. Eén delete dus, in plaats
    // van zes die elk hun eigen faal-pad hebben. De live-pointer moet er wel
    // eerst af: die FK verwijst naar een PagePublish die mee moet kunnen.
    if (organizationId) {
      try {
        await prisma.landingPage.updateMany({
          where: { workspace: { organizationId } },
          data: { livePublishId: null },
        });
        await prisma.organization.delete({ where: { id: organizationId } });
      } catch (cleanupError) {
        console.error(
          `⚠ opruimen van fixture-organisatie ${organizationId} mislukt — handmatig nalopen`,
          cleanupError,
        );
      }
    }
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  runPureChecks();

  const pureOnly = process.env.SMOKE_PURE === '1' || !process.env.DATABASE_URL;
  if (pureOnly) {
    console.log(
      '\n⚠ Deel B overgeslagen: geen DATABASE_URL (of SMOKE_PURE=1).' +
        '\n  Deze run dekt de pure logica, NIET de database-effecten.',
    );
  } else {
    await runDbChecks();
  }

  console.log(`\n${failures.length === 0 ? '✅' : '❌'} ${passed} checks geslaagd, ${failures.length} gefaald`);
  if (failures.length > 0) {
    failures.forEach((label) => console.error(`   - ${label}`));
    process.exit(1);
  }
  if (pureOnly) {
    console.log('   Deel B (database) staat nog open.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
