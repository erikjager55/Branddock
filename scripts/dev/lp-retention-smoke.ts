/**
 * Landing-page retentie-smoke (lp-review-followups §Retentie, ADR 2026-08-17).
 *
 * Twee delen:
 *
 *  A. PUUR (geen database) — retentie-windows, de afkapdatum (incl. maandeinde
 *     en schrikkeljaar) en de prune-selectie mét de live-pointer-casus. Hier zit
 *     het echte risico: rollback is een pointer-swap, dus de live versie is niet
 *     altijd de nieuwste. Plus de scope-regel van de wis-route.
 *  B. DATABASE — seedt twee workspaces en draait de drie prune-functies.
 *
 * ⚠ Deel B is DESTRUCTIEF en daarom opt-in. De prune-functies werken tabelbreed
 * (dat is wat de cron doet), dus op een DB met echte data ruimen ze die óók op —
 * inclusief lead-PII en bevroren publish-artifacts die niet bit-voor-bit terug
 * te maken zijn. Vereist daarom `SMOKE_DB=1`, én een localhost-DATABASE_URL
 * tenzij je expliciet `SMOKE_ALLOW_REMOTE_DB=1` zet.
 *
 * Run (puur, veilig):  npx tsx scripts/dev/lp-retention-smoke.ts
 * Run (incl. DB):      SMOKE_DB=1 npm run smoke:lp-retention
 */

// Deel A importeert uit de Prisma-vrije modules. De database-laag wordt in deel
// B lazy geïmporteerd, zodat een pure run niet struikelt over de
// DATABASE_URL-check in `src/lib/prisma.ts`.
import {
  COMPILED_HTML_KEEP_VERSIONS,
  FORM_SUBMISSION_RETENTION_MONTHS,
  PAGE_EVENT_RETENTION_MONTHS,
  retentionCutoff,
  selectPrunableCompiledHtml,
} from '../../src/lib/landing-pages/retention-policy';
import { buildSubmissionScope } from '../../src/lib/landing-pages/submission-scope';

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

/**
 * Datum `days` dagen terug. Bewust dag-gebaseerd en NIET via `setMonth`:
 * deelden fixture en productie dezelfde maand-rekenkunde, dan zou een fout in
 * `retentionCutoff` zichzelf wegstrepen en door deze smoke heen glippen.
 */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ─── Deel A — puur ────────────────────────────────────────────

function runPureChecks(): void {
  console.log('\nA. Beleid, afkapdatum en selectie-logica');

  check(
    'window-constanten ongewijzigd (13 / 26 / 5)',
    PAGE_EVENT_RETENTION_MONTHS === 13 &&
      FORM_SUBMISSION_RETENTION_MONTHS === 26 &&
      COMPILED_HTML_KEEP_VERSIONS === 5,
  );

  const cutoffCases: [string, number, string][] = [
    ['2026-08-17T12:00:00Z', 13, '2025-07-17'],
    // Maandeinden: een kale setMonth() rolt hier vóóruit (31-03 → 03-03) en
    // wist daarmee tot 3 dagen te veel. Moet clampen op de laatste dag.
    ['2026-03-31T12:00:00Z', 13, '2025-02-28'],
    ['2026-08-31T12:00:00Z', 26, '2024-06-30'],
    ['2026-05-31T12:00:00Z', 13, '2025-04-30'],
    ['2026-01-31T12:00:00Z', 13, '2024-12-31'],
    ['2028-02-29T12:00:00Z', 12, '2027-02-28'],
  ];
  for (const [iso, months, expected] of cutoffCases) {
    const got = retentionCutoff(months, new Date(iso)).toISOString().slice(0, 10);
    check(`cutoff ${iso.slice(0, 10)} −${months}mnd → ${expected}`, got === expected);
  }
  check(
    'cutoff ligt altijd vóór now (nooit data uit de toekomst wissen)',
    retentionCutoff(13, new Date('2026-03-31T12:00:00Z')) <
      new Date('2026-03-31T12:00:00Z'),
  );

  const publishes = [8, 7, 6, 5, 4, 3, 2, 1].map((version) => ({
    id: `v${version}`,
    version,
  }));

  check(
    'live = nieuwste → v3/v2/v1 prunebaar, nieuwste 5 blijven',
    selectPrunableCompiledHtml(publishes, 'v8').join(',') === 'v3,v2,v1',
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
    'zonder live-pointer (legacy rij) → de oudste voorbij het venster',
    selectPrunableCompiledHtml(publishes, null).join(',') === 'v3,v2,v1',
  );

  console.log('\n   Scope-regel van de wis-route');
  const scope = buildSubmissionScope({
    workspaceId: 'ws-a',
    formIds: ['ws-a:form-1'],
    pageIds: ['page-a'],
  });
  check(
    'lees-scope matcht formId óf pagina (beide takken)',
    scope.where?.OR.length === 2 &&
      JSON.stringify(scope.where?.OR[0]) === JSON.stringify({ formId: { in: ['ws-a:form-1'] } }),
  );
  check(
    'wis-scope bindt de formId-tak aan landingPageId: null',
    JSON.stringify(scope.deleteWhere?.OR[0]) ===
      JSON.stringify({ formId: { in: ['ws-a:form-1'] }, landingPageId: null }),
  );
  check(
    'beide scopes dragen altijd workspaceId (tenant-isolatie)',
    scope.where?.workspaceId === 'ws-a' && scope.deleteWhere?.workspaceId === 'ws-a',
  );
  check(
    'geen formulier én geen pagina → null (geen match-alles)',
    buildSubmissionScope({ workspaceId: 'ws-a', formIds: [], pageIds: [] }).deleteWhere ===
      null,
  );
}

// ─── Deel B — database ────────────────────────────────────────

async function runDbChecks(): Promise<void> {
  console.log('\nB. Prune-functies en wis-scope tegen de database');
  const { prisma } = await import('../../src/lib/prisma');
  const { prunePageEvents, pruneFormSubmissions, pruneCompiledHtml } = await import(
    '../../src/lib/landing-pages/retention'
  );

  const marker = `lp-retention-smoke-${Date.now()}`;
  const createdOrgIds: string[] = [];

  /** Workspace met campagne, deliverable en pagina. */
  async function seedWorkspace(suffix: string) {
    const slug = `${marker}-${suffix}`;
    const org = await prisma.organization.create({
      data: { name: slug, slug },
      select: { id: true },
    });
    createdOrgIds.push(org.id);
    const ws = await prisma.workspace.create({
      data: { name: slug, slug, organizationId: org.id },
      select: { id: true },
    });
    const campaign = await prisma.campaign.create({
      data: { workspaceId: ws.id, title: slug, slug, type: 'CONTENT' },
      select: { id: true },
    });
    const deliverable = await prisma.deliverable.create({
      data: { campaignId: campaign.id, title: slug, contentType: 'Landing Page' },
      select: { id: true },
    });
    const page = await prisma.landingPage.create({
      data: { workspaceId: ws.id, deliverableId: deliverable.id, slug, puckData: {} },
      select: { id: true },
    });
    return { workspaceId: ws.id, deliverableId: deliverable.id, pageId: page.id };
  }

  try {
    const own = await seedWorkspace('own');
    const foreign = await seedWorkspace('foreign');
    const sharedFormId = `${own.workspaceId}:lead-form-1`;

    // 8 publishes, live-pointer bewust op versie 2 — de casus die een naïeve
    // "bewaar de nieuwste 5" laat vallen.
    const publishIds: Record<number, string> = {};
    for (let version = 1; version <= 8; version++) {
      const publish = await prisma.pagePublish.create({
        data: {
          landingPageId: own.pageId,
          version,
          puckData: { version },
          compiledHtml: `<html data-v="${version}"></html>`,
        },
        select: { id: true },
      });
      publishIds[version] = publish.id;
    }
    await prisma.landingPage.update({
      where: { id: own.pageId },
      data: { livePublishId: publishIds[2] },
    });

    // 13mnd = ~395 dagen; 26mnd = ~790. Ruime marge aan beide kanten.
    const oldEvent = await prisma.pageEvent.create({
      data: {
        workspaceId: own.workspaceId,
        landingPageId: own.pageId,
        kind: 'view',
        createdAt: daysAgo(430),
      },
      select: { id: true },
    });
    const freshEvent = await prisma.pageEvent.create({
      data: { workspaceId: own.workspaceId, landingPageId: own.pageId, kind: 'view' },
      select: { id: true },
    });
    const oldSubmission = await prisma.formSubmission.create({
      data: {
        workspaceId: own.workspaceId,
        landingPageId: own.pageId,
        formId: sharedFormId,
        data: { email: 'oud@example.com' },
        createdAt: daysAgo(830),
      },
      select: { id: true },
    });
    const freshSubmission = await prisma.formSubmission.create({
      data: {
        workspaceId: own.workspaceId,
        landingPageId: own.pageId,
        formId: sharedFormId,
        data: { email: 'vers@example.com' },
      },
      select: { id: true },
    });
    // Rijen ín de band tussen de twee windows (13mnd < x < 26mnd). Zonder deze
    // zou het verwisselen van de twee constanten — één token, en het halveert
    // de bewaartermijn van lead-PII — volledig onzichtbaar zijn: alle andere
    // fixtures vallen onder béide windows hetzelfde uit.
    const bandSubmission = await prisma.formSubmission.create({
      data: {
        workspaceId: own.workspaceId,
        landingPageId: own.pageId,
        formId: sharedFormId,
        data: { email: 'band@example.com' },
        createdAt: daysAgo(500),
      },
      select: { id: true },
    });
    const bandEvent = await prisma.pageEvent.create({
      data: {
        workspaceId: own.workspaceId,
        landingPageId: own.pageId,
        kind: 'view',
        createdAt: daysAgo(200),
      },
      select: { id: true },
    });
    // Echte submissie in een ANDERE workspace — de cross-tenant-testcase.
    const foreignSubmission = await prisma.formSubmission.create({
      data: {
        workspaceId: foreign.workspaceId,
        landingPageId: foreign.pageId,
        formId: `${foreign.workspaceId}:lead-form-1`,
        data: { email: 'vreemd@example.com' },
      },
      select: { id: true },
    });

    const events = await prunePageEvents();
    check('prunePageEvents meldt truncated: false', events.truncated === false);
    check(
      'PageEvent ouder dan 13mnd verwijderd',
      (await prisma.pageEvent.findUnique({ where: { id: oldEvent.id } })) === null,
    );
    check(
      'PageEvent binnen het window bestaat nog',
      (await prisma.pageEvent.findUnique({ where: { id: freshEvent.id } })) !== null,
    );
    check(
      'PageEvent van 200 dagen oud blijft (window is 13mnd, niet korter)',
      (await prisma.pageEvent.findUnique({ where: { id: bandEvent.id } })) !== null,
    );

    const submissions = await pruneFormSubmissions();
    check('pruneFormSubmissions meldt truncated: false', submissions.truncated === false);
    check(
      'FormSubmission ouder dan 26mnd verwijderd',
      (await prisma.formSubmission.findUnique({ where: { id: oldSubmission.id } })) === null,
    );
    check(
      'FormSubmission binnen het window bestaat nog',
      (await prisma.formSubmission.findUnique({ where: { id: freshSubmission.id } })) !== null,
    );
    check(
      'lead van 500 dagen oud OVERLEEFT — window is 26mnd, niet 13mnd',
      (await prisma.formSubmission.findUnique({ where: { id: bandSubmission.id } })) !== null,
    );

    const html = await pruneCompiledHtml();
    check('pruneCompiledHtml meldt truncated: false', html.truncated === false);
    const after = await prisma.pagePublish.findMany({
      where: { landingPageId: own.pageId },
      select: { version: true, compiledHtml: true, puckData: true },
    });
    // Alle 8 rijen moeten er nog zijn: pruning leegt een kolom, het verwijdert
    // geen publishes. Zonder deze check zou "rij weg" als "html null" passeren.
    check('alle 8 publishes bestaan nog (kolom geleegd, rij niet verwijderd)', after.length === 8);
    const htmlByVersion = new Map(after.map((row) => [row.version, row.compiledHtml]));
    const hasHtml = (version: number): boolean =>
      typeof htmlByVersion.get(version) === 'string';
    check(
      'nieuwste 5 versies (4-8) houden hun compiledHtml',
      [4, 5, 6, 7, 8].every(hasHtml),
    );
    check(
      'LIVE versie 2 houdt haar compiledHtml ondanks positie buiten de nieuwste 5',
      hasHtml(2),
    );
    check(
      'versies 1 en 3 zijn geleegd',
      htmlByVersion.get(1) === null && htmlByVersion.get(3) === null,
    );
    // Niet alleen "niet null": een regressie die `puckData: {}` schrijft naast
    // `compiledHtml: null` zou dan passeren en élke teruggerolde versie leeg
    // maken. De fixture zet `{ version: n }`, dus dat is wat er moet staan.
    check(
      'puckData is inhoudelijk intact (rollback blijft werken)',
      after.length === 8 &&
        after.every(
          (row) =>
            (row.puckData as { version?: number } | null)?.version === row.version,
        ),
    );
    // Idempotent: een tweede run mag niets meer doen.
    const second = await pruneCompiledHtml();
    check('tweede pruneCompiledHtml-run leegt 0 extra rijen', second.count === 0);

    // Starvation-regressie: een pagina met precies 6 HTML-dragende publishes
    // waarvan de live-pointer de OUDSTE is, blijft eeuwig kandidaat (6 > 5)
    // terwijl er niets te prunen valt. Zo'n pagina mag een pagina die er ná
    // haar komt in id-ordening niet blokkeren.
    const blocker = await seedWorkspace('blocker');
    const blockerPublishes: Record<number, string> = {};
    for (let version = 1; version <= 6; version++) {
      const publish = await prisma.pagePublish.create({
        data: {
          landingPageId: blocker.pageId,
          version,
          puckData: { version },
          compiledHtml: `<html data-blocker="${version}"></html>`,
        },
        select: { id: true },
      });
      blockerPublishes[version] = publish.id;
    }
    await prisma.landingPage.update({
      where: { id: blocker.pageId },
      data: { livePublishId: blockerPublishes[1] },
    });

    const worker = await seedWorkspace('worker');
    for (let version = 1; version <= 8; version++) {
      await prisma.pagePublish.create({
        data: {
          landingPageId: worker.pageId,
          version,
          puckData: { version },
          compiledHtml: `<html data-worker="${version}"></html>`,
        },
      });
    }

    // Batch van 1 dwingt meerdere lus-iteraties, zodat het lus-gedrag echt
    // doorlopen wordt in plaats van in één statement afgehandeld.
    await pruneCompiledHtml({ batchSize: 1 });
    const blockerRows = await prisma.pagePublish.findMany({
      where: { landingPageId: blocker.pageId },
      select: { compiledHtml: true },
    });
    check(
      'de blokkerende pagina houdt al haar 6 artifacts (live = oudste)',
      blockerRows.length === 6 && blockerRows.every((r) => typeof r.compiledHtml === 'string'),
    );
    const workerNulls = await prisma.pagePublish.count({
      where: { landingPageId: worker.pageId, compiledHtml: null },
    });
    check(
      'een pagina zónder werk verhongert de pagina ernaast niet (3 geleegd)',
      workerNulls === 3,
    );
    const workerLeft = await prisma.pagePublish.count({
      where: { landingPageId: worker.pageId, compiledHtml: { not: null } },
    });
    check('de werker houdt haar nieuwste 5', workerLeft === 5);

    console.log('\n   Wis-scope tegen echte rijen');
    // Exact de scope die de DELETE-route gebruikt, uit dezelfde functie.
    const ownScope = buildSubmissionScope({
      workspaceId: own.workspaceId,
      formIds: [sharedFormId],
      pageIds: [own.pageId],
    });
    if (!ownScope.deleteWhere) {
      failures.push('deleteWhere onverwacht null');
      return;
    }

    const crossTenant = await prisma.formSubmission.deleteMany({
      where: { ...ownScope.deleteWhere, id: foreignSubmission.id },
    });
    check('wis van een ECHTE submissie uit een andere workspace raakt 0 rijen',
      crossTenant.count === 0);
    check(
      'die vreemde submissie bestaat daarna nog',
      (await prisma.formSubmission.findUnique({ where: { id: foreignSubmission.id } })) !==
        null,
    );

    // Duplicaat-casus: een kopie-deliverable erft dezelfde formId's, maar mag
    // niet de pagina-gebonden leads van het origineel wissen.
    const duplicateScope = buildSubmissionScope({
      workspaceId: own.workspaceId,
      formIds: [sharedFormId],
      pageIds: ['page-van-de-kopie'],
    });
    const viaDuplicate = await prisma.formSubmission.deleteMany({
      where: { ...duplicateScope.deleteWhere!, id: freshSubmission.id },
    });
    check(
      'een kopie-deliverable met dezelfde formId wist de leads van het origineel NIET',
      viaDuplicate.count === 0,
    );
    check(
      'de lead van het origineel bestaat daarna nog',
      (await prisma.formSubmission.findUnique({ where: { id: freshSubmission.id } })) !== null,
    );

    const inScope = await prisma.formSubmission.deleteMany({
      where: { ...ownScope.deleteWhere, id: freshSubmission.id },
    });
    check('wis binnen de eigen scope raakt precies 1 rij', inScope.count === 1);
  } finally {
    // Organization-delete cascadeert workspace → campaign → deliverable →
    // landingPage → publishes/events/submissions. De live-pointer moet er eerst
    // af: die FK verwijst naar een PagePublish die mee moet kunnen.
    for (const organizationId of createdOrgIds) {
      try {
        await prisma.landingPage.updateMany({
          where: { workspace: { organizationId } },
          data: { livePublishId: null },
        });
        await prisma.organization.delete({ where: { id: organizationId } });
      } catch (cleanupError) {
        // Als faling geregistreerd, niet alleen gelogd: blijft er een
        // fixture-organisatie mét geseede lead-PII staan, dan mag de run niet
        // groen aflopen.
        failures.push(
          `opruimen van fixture-organisatie ${organizationId} mislukt — handmatig nalopen`,
        );
        console.error(cleanupError);
      }
    }
    await prisma.$disconnect();
  }
}

/** Of deel B mag draaien, en zo niet: waarom niet. */
function dbGate(): { run: boolean; reason?: string } {
  if (process.env.SMOKE_DB !== '1') {
    return { run: false, reason: 'SMOKE_DB=1 niet gezet (deel B is destructief)' };
  }
  const url = process.env.DATABASE_URL;
  if (!url) return { run: false, reason: 'geen DATABASE_URL' };
  // Alleen de hóstnaam telt. Een substring-match op de hele URL zou een remote
  // Neon-URL doorlaten die "localhost" in de databasenaam of een parameter heeft.
  let isLocal = false;
  try {
    const parsed = new URL(url);
    const socketHost = parsed.searchParams.get('host') ?? '';
    isLocal =
      ['localhost', '127.0.0.1', '::1', ''].includes(parsed.hostname) ||
      socketHost.startsWith('/');
  } catch {
    return { run: false, reason: 'DATABASE_URL is niet te parsen' };
  }
  if (!isLocal && process.env.SMOKE_ALLOW_REMOTE_DB !== '1') {
    return {
      run: false,
      reason:
        'DATABASE_URL lijkt niet lokaal — zet SMOKE_ALLOW_REMOTE_DB=1 als je ' +
        'écht tabelbreed wilt prunen op deze database',
    };
  }
  return { run: true };
}

async function main(): Promise<void> {
  runPureChecks();

  const gate = dbGate();
  if (gate.run) {
    console.warn(
      '\n⚠ Deel B draait TABELBREEDE prunes op deze database — leads, events en\n' +
        '  bevroren publish-artifacts ouder dan de windows worden verwijderd.',
    );
    await runDbChecks();
  }

  const total = passed + failures.length;
  console.log(
    `\n${failures.length === 0 ? '✅' : '❌'} ${passed}/${total} checks geslaagd, ${failures.length} gefaald`,
  );
  if (failures.length > 0) {
    failures.forEach((label) => console.error(`   - ${label}`));
    process.exit(1);
  }
  if (!gate.run) {
    // Bewust exit 1: een run die de helft van de dekking oversloeg mag in CI of
    // in een script niet als volledig groen doorgaan.
    console.log(`\n⚠ Deel B (database) NIET gedraaid: ${gate.reason}`);
    console.log('   Alleen de pure logica is gedekt. Run met SMOKE_DB=1 voor volledig bewijs.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
