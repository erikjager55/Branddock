/**
 * Smoke voor de settings-schrijflaag (`lp-review-followups` §Robuustheid).
 *
 * Bewijst het enige dat telt: twee gelijktijdige schrijvers op dezelfde
 * deliverable verliezen elkaars sleutels niet meer.
 *
 * ⚠ De belangrijkste test is de MUTATIETEST. Een test die "beide sleutels staan
 * er" bevestigt is waardeloos als hij dat óók zonder de fix zou zeggen — een
 * race is nu eenmaal timing-gevoelig. Daarom draait dezelfde scène twee keer:
 * één keer met `SELECT … FOR UPDATE` (de fix) en één keer met een kale
 * `findUnique` (de oude code). Verliest de kale variant géén sleutel, dan meet
 * de opstelling niet wat ze beweert en faalt de smoke expliciet.
 *
 * Vereist een echte Postgres: `SMOKE_DB=1`, en een localhost-DATABASE_URL
 * tenzij je expliciet `SMOKE_ALLOW_REMOTE_DB=1` zet. De smoke maakt een eigen
 * organisatie aan en gooit die aan het eind weg — hij raakt geen bestaande rijen.
 *
 * Run: SMOKE_DB=1 npm run smoke:settings-write
 */

let passed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(label);
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  if (process.env.SMOKE_DB !== '1') {
    // Exit 1, niet 0: met exit 0 meldt deze smoke zich GROEN terwijl hij niets
    // toetst — precies wat je in CI niet merkt. Gemeten 2026-08-19: van de
    // vijftien db-bewakers was dit de enige die dat deed.
    console.error('SMOKE_DB=1 niet gezet — deze smoke heeft een echte database nodig.');
    console.error('Run: SMOKE_DB=1 npm run smoke:settings-write');
    process.exit(1);
  }
  const url = process.env.DATABASE_URL ?? '';
  const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
  if (!isLocal && process.env.SMOKE_ALLOW_REMOTE_DB !== '1') {
    console.error('DATABASE_URL wijst niet naar localhost. Zet SMOKE_ALLOW_REMOTE_DB=1 als je dit echt wilt.');
    process.exit(1);
  }

  const { prisma } = await import('../../src/lib/prisma');
  const { updateDeliverableSettings, lockDeliverableSettings } = await import(
    '../../src/lib/content/update-deliverable-settings'
  );
  const { patchHeroVisualUrl } = await import('../../src/lib/deliverable/patch-hero-visual');
  const { MIN_PERSISTABLE_PARTIAL, partialWouldShrink } = await import(
    '../../src/lib/landing-pages/partial-variant-persist'
  );

  const marker = `settings-write-smoke-${Date.now()}`;
  const createdOrgIds: string[] = [];

  async function seedDeliverable(suffix: string): Promise<string> {
    const slug = `${marker}-${suffix}`;
    const org = await prisma.organization.create({ data: { name: slug, slug }, select: { id: true } });
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
      data: { campaignId: campaign.id, title: slug, contentType: 'Landing Page', settings: {} },
      select: { id: true },
    });
    return deliverable.id;
  }

  async function readSettings(id: string): Promise<Record<string, unknown>> {
    const row = await prisma.deliverable.findUnique({ where: { id }, select: { settings: true } });
    return (row?.settings ?? {}) as Record<string, unknown>;
  }

  /**
   * Twee schrijvers die elkaars venster raken. `locked` bepaalt of de read de
   * rij vergrendelt — precies het verschil tussen de fix en de oude code.
   *
   * Tijdlijn: A leest op t=0 en schrijft op t=300; B start op t=50. Zonder lock
   * leest B de blob van vóór A en wist diens sleutel. Mét lock blokkeert B's
   * SELECT tot A commit en leest hij de nieuwe waarde.
   */
  async function racePair(deliverableId: string, locked: boolean): Promise<Record<string, unknown>> {
    async function writer(key: string, startDelay: number): Promise<void> {
      await sleep(startDelay);
      await prisma.$transaction(
        async (tx) => {
          const current = locked
            ? ((await lockDeliverableSettings(tx, deliverableId)) as Record<string, unknown>)
            : (((
                await tx.deliverable.findUnique({ where: { id: deliverableId }, select: { settings: true } })
              )?.settings ?? {}) as Record<string, unknown>);
          await sleep(300);
          await tx.deliverable.update({
            where: { id: deliverableId },
            data: { settings: { ...current, [key]: key } },
          });
        },
        { timeout: 15_000, maxWait: 15_000 },
      );
    }
    await Promise.all([writer('alpha', 0), writer('beta', 50)]);
    return readSettings(deliverableId);
  }

  try {
    console.log('\n── A. De race zelf ────────────────────────────────────────');

    const lockedId = await seedDeliverable('locked');
    const lockedResult = await racePair(lockedId, true);
    check(
      'mét rijlock: beide schrijvers overleven',
      lockedResult.alpha === 'alpha' && lockedResult.beta === 'beta',
      JSON.stringify(lockedResult),
    );

    const unlockedId = await seedDeliverable('unlocked');
    const unlockedResult = await racePair(unlockedId, false);
    check(
      'MUTATIETEST — zonder rijlock verdwijnt er een sleutel (anders meet deze smoke niets)',
      !(unlockedResult.alpha === 'alpha' && unlockedResult.beta === 'beta'),
      JSON.stringify(unlockedResult),
    );

    console.log('\n── B. De publieke helper ──────────────────────────────────');

    const parallelId = await seedDeliverable('parallel');
    await Promise.all(
      ['k1', 'k2', 'k3', 'k4', 'k5'].map((k) =>
        updateDeliverableSettings(parallelId, (current) => ({ ...current, [k]: true })),
      ),
    );
    const parallelResult = await readSettings(parallelId);
    check(
      'vijf parallelle helper-calls: alle vijf de sleutels staan er',
      ['k1', 'k2', 'k3', 'k4', 'k5'].every((k) => parallelResult[k] === true),
      JSON.stringify(parallelResult),
    );

    const nullId = await seedDeliverable('null');
    await updateDeliverableSettings(nullId, (current) => ({ ...current, blijft: 1 }));
    const nullWrite = await updateDeliverableSettings(nullId, () => null);
    const nullResult = await readSettings(nullId);
    check('mutate → null schrijft niets', nullWrite === null && nullResult.blijft === 1);

    const extraId = await seedDeliverable('extra');
    await updateDeliverableSettings(extraId, (current) => ({ ...current, x: 1 }), { title: 'hernoemd' });
    const extraRow = await prisma.deliverable.findUnique({
      where: { id: extraId },
      select: { title: true, settings: true },
    });
    check(
      'extraData landt in dezelfde update als settings',
      extraRow?.title === 'hernoemd' && (extraRow?.settings as Record<string, unknown>).x === 1,
    );

    let threw = false;
    try {
      await updateDeliverableSettings('bestaat-niet', (current) => ({ ...current }));
    } catch {
      threw = true;
    }
    check('onbestaande deliverable gooit i.p.v. stil niets te doen', threw);

    console.log('\n── C. Beloftes van de call-sites ──────────────────────────');

    const heroResult = await patchHeroVisualUrl('bestaat-niet', 'https://example.com/x.png');
    check(
      'patchHeroVisualUrl gooit nooit — ook niet nu de helper dat wél doet',
      heroResult.patched === false,
    );

    const heroId = await seedDeliverable('hero');
    await updateDeliverableSettings(heroId, (current) => ({
      ...current,
      puckData: { content: [{ type: 'BrandHero', props: { id: 'hero-1' } }], root: {} },
    }));
    const heroPatch = await patchHeroVisualUrl(heroId, 'https://example.com/hero.png');
    const heroSettings = await readSettings(heroId);
    check(
      'patchHeroVisualUrl schrijft nog steeds door de helper heen',
      heroPatch.patched === true && JSON.stringify(heroSettings).includes('hero.png'),
      JSON.stringify(heroPatch),
    );

    console.log('\n── D. Deel-resultaat na een afgebroken run ────────────────');

    // De regel zelf, zonder database.
    check('drempel staat op 2', MIN_PERSISTABLE_PARTIAL === 2);
    check('4 bestaand vs 1 inkomend = krimp', partialWouldShrink({ structuredVariantOptions: [1, 2, 3, 4] }, 1));
    check('2 bestaand vs 2 inkomend = geen krimp', !partialWouldShrink({ structuredVariantOptions: [1, 2] }, 2));
    check('geen bestaande set = geen krimp', !partialWouldShrink({}, 1));
    check('niet-array wordt genegeerd i.p.v. te gooien', !partialWouldShrink({ structuredVariantOptions: 'kapot' }, 1));

    /**
     * De regel zoals hij echt draait: binnen de mutate-callback van de helper,
     * op de verse waarde onder rijlock. `guard: false` zet precies de guard-tak
     * uit — dat is de mutatie waarmee we bewijzen dat deze scene discrimineert.
     */
    async function persistPartial(id: string, incoming: number[], guard: boolean): Promise<boolean> {
      const written = await updateDeliverableSettings(id, (current) => {
        if (guard && partialWouldShrink(current, incoming.length)) return null;
        return { ...current, structuredVariantOptions: incoming };
      });
      return written !== null;
    }

    const partialId = await seedDeliverable('partial');
    await updateDeliverableSettings(partialId, (current) => ({
      ...current,
      structuredVariantOptions: [1, 2, 3, 4],
      puckData: { content: [], root: { title: 'niet aankomen' } },
    }));

    const blocked = await persistPartial(partialId, [9], true);
    const afterBlocked = await readSettings(partialId);
    check('deel-resultaat (1) vervangt een bestaande set (4) NIET', blocked === false);
    check(
      'de vier varianten staan er nog',
      (afterBlocked.structuredVariantOptions as unknown[]).length === 4,
    );
    check(
      'puckData is ongemoeid gebleven',
      JSON.stringify(afterBlocked.puckData ?? {}).includes('niet aankomen'),
    );

    const equal = await persistPartial(partialId, [1, 2, 3, 4], true);
    check('deel-resultaat dat niet krimpt mag wel schrijven', equal === true);

    // Een VOLTOOIDE run mag wel krimpen — de gebruiker vroeg dan om minder.
    const shrankOnPurpose = await updateDeliverableSettings(partialId, (current) => ({
      ...current,
      structuredVariantOptions: [7, 8],
    }));
    check('een voltooide run mag de set wel verkleinen', shrankOnPurpose !== null);

    // MUTATIETEST — zonder guard MOET de vollere set sneuvelen. Blijft hij
    // staan, dan bewijst de scene hierboven niets.
    const mutId = await seedDeliverable('partial-mut');
    await updateDeliverableSettings(mutId, (current) => ({
      ...current,
      structuredVariantOptions: [1, 2, 3, 4],
    }));
    await persistPartial(mutId, [9], false);
    const afterMutation = await readSettings(mutId);
    check(
      'MUTATIETEST — zonder guard wordt de vollere set wel gewist (anders meet deze smoke niets)',
      (afterMutation.structuredVariantOptions as unknown[]).length === 1,
      `lengte na mutatie: ${(afterMutation.structuredVariantOptions as unknown[]).length}`,
    );

  } finally {
    for (const organizationId of createdOrgIds) {
      try {
        await prisma.organization.delete({ where: { id: organizationId } });
      } catch (cleanupError) {
        failures.push(`opruimen van organisatie ${organizationId} faalde`);
        console.error('  ✗ cleanup:', cleanupError instanceof Error ? cleanupError.message : cleanupError);
      }
    }
    await prisma.$disconnect();
  }

  console.log(`\n${passed}/${passed + failures.length} checks geslaagd`);
  if (failures.length > 0) {
    console.error('\nGefaald:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('smoke crashte:', err);
  process.exit(1);
});

// Dynamische imports maken dit bestand nog geen module; zonder deze regel
// botst `main` met de andere scripts in hetzelfde tsc-project.
export {};
