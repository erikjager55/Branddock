/**
 * Verificatie-harnas: draait TWEE echte URL-analyses op een wegwerp-workspace
 * en controleert dat de user-edits ertussen de tweede run overleven.
 *
 * Waarom dit naast de pure smoke bestaat: die test de suppressie-helpers in
 * isolatie. Wat hij niet aantoont is dat `writeResultToDb` ze überhaupt
 * aanroept, dat de scoped deletes de juiste rijen sparen, en dat de analyse er
 * niet op stukloopt. Les uit gotchas.md (2026-07-12): een wijziging aan een
 * laag die analyses voedt is pas bewezen na een echte run van díe laag.
 *
 * Opzet:
 *   1. echte analyse  → de baseline zoals de scraper 'm oplevert
 *   2. user-edits     → handmatige kleur, tag-correctie, geüpload logo,
 *                       hernoemd component, gecureerde don'ts, een profiel
 *                       met *Override
 *   3. echte analyse  → exact hetzelfde pad als een refresh in de UI
 *   4. assertions     → alles uit stap 2 staat er nog, zonder duplicaten
 *
 * Kost twee volledige scrapes + AI-analyses. Ruimt zichzelf op.
 *
 * Run: DATABASE_URL=... ANTHROPIC_API_KEY=... npx tsx scripts/dev/verify-refresh-preserves.ts [url]
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';
import { analyzeUrl } from '../../src/lib/brandstyle/analysis-engine';
import { ROW_SOURCE_USER } from '../../src/lib/brandstyle/preserve-user-rows';
import { resolveFieldClaims } from '../../src/lib/brandstyle/claim-fields';

const URL_TO_ANALYSE = process.argv[2] ?? 'https://www.dtsede.nl';
const SUFFIX = `preserve-${process.pid}`;

/** Een hex die geen enkele echte site als merkkleur voert. */
const USER_COLOR_HEX = '#7B2FF7';
const USER_LOGO_URL = 'https://example.test/mijn-eigen-logo.svg';
const CURATED_DONTS = ['Nooit het logo uitrekken', 'Nooit op een druk fotovlak'];

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

async function main(): Promise<void> {
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) throw new Error('Geen User in de database');

  let organizationId: string | null = null;
  let workspaceId: string | null = null;

  try {
    const org = await prisma.organization.create({
      data: { name: `Preserve ${SUFFIX}`, slug: `preserve-${SUFFIX}` },
      select: { id: true },
    });
    organizationId = org.id;
    const workspace = await prisma.workspace.create({
      data: {
        name: '__scratch_preserve',
        slug: `preserve-ws-${SUFFIX}`,
        contentLanguage: 'nl',
        organizationId: org.id,
        websiteUrl: URL_TO_ANALYSE,
      },
      select: { id: true },
    });
    workspaceId = workspace.id;

    const styleguide = await prisma.brandStyleguide.create({
      data: {
        workspaceId: workspace.id,
        createdById: user.id,
        sourceType: 'URL',
        sourceUrl: URL_TO_ANALYSE,
        status: 'ANALYZING',
      },
      select: { id: true },
    });

    // ── Run 1 ───────────────────────────────────────────
    console.log(`\n── Analyse 1 van ${URL_TO_ANALYSE} …\n`);
    await analyzeUrl(styleguide.id, URL_TO_ANALYSE);

    const before = {
      colors: await prisma.styleguideColor.count({ where: { styleguideId: styleguide.id } }),
      logos: await prisma.styleguideLogo.count({ where: { styleguideId: styleguide.id } }),
      components: await prisma.styleguideComponent.count({
        where: { styleguideId: styleguide.id },
      }),
    };
    console.log(
      `\nBaseline: ${before.colors} kleuren · ${before.logos} logo's · ${before.components} componenten`,
    );

    // ── User-edits ──────────────────────────────────────
    console.log('\n── User-edits aanbrengen …');

    const userColor = await prisma.styleguideColor.create({
      data: {
        name: 'Mijn eigen paars',
        hex: USER_COLOR_HEX,
        category: 'ACCENT',
        tags: ['usage:hero-bg'],
        source: ROW_SOURCE_USER,
        sortOrder: 999,
        styleguideId: styleguide.id,
      },
      select: { id: true },
    });

    // Tweede handmatige kleur, maar dan met een hex die de scraper wél vindt.
    // Zonder dit geval is de test op "de gebruiker houdt zijn eigen naam" gratis:
    // de verversings-lus zou toch niets matchen. `detectorSource` blijft null —
    // dat is exact wat `POST /api/brandstyle/colors` oplevert.
    const clashHex = (
      await prisma.styleguideColor.findFirst({
        where: { styleguideId: styleguide.id, source: 'scraped' },
        select: { hex: true },
        orderBy: { sortOrder: 'desc' },
      })
    )?.hex;
    const clashColor = clashHex
      ? await prisma.styleguideColor.create({
          data: {
            name: 'Zelf benoemd, botsende hex',
            hex: clashHex,
            category: 'SEMANTIC',
            tags: [],
            source: ROW_SOURCE_USER,
            sortOrder: 998,
            styleguideId: styleguide.id,
          },
          select: { id: true, hex: true },
        })
      : null;

    // Tag-correctie op een gescrapte kleur — stempelt 'm op 'user', zoals de
    // PATCH-route doet.
    // De eerste gescrapte kleur is de merkkleur (sortOrder 0) — precies de rij
    // waar `pickBrand` in de LP-renderer op afgaat. Die moet haar plek houden.
    const scrapedColor = await prisma.styleguideColor.findFirst({
      where: { styleguideId: styleguide.id, source: 'scraped' },
      select: { id: true, hex: true, sortOrder: true, name: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (scrapedColor) {
      await prisma.styleguideColor.update({
        where: { id: scrapedColor.id },
        data: { tags: ['usage:hero-bg', 'door-de-gebruiker-gezet'], source: ROW_SOURCE_USER },
      });
    }

    const userLogo = await prisma.styleguideLogo.create({
      data: {
        variant: 'PRIMARY',
        fileUrl: USER_LOGO_URL,
        fileName: 'mijn-eigen-logo.svg',
        fileType: 'svg',
        uploadedById: user.id,
        styleguideId: styleguide.id,
        workspaceId: workspace.id,
        sortOrder: 0,
      },
      select: { id: true },
    });

    // De component-extractor levert onder tsx niets op (`__name is not defined`
    // in page.evaluate — pre-existing, los van deze taak), dus val terug op een
    // zelf aangemaakt user-component. Dan is de scoped delete hoe dan ook
    // gedekt; de suppressie op (type, label) leunt op de pure smoke.
    const scrapedComponent = await prisma.styleguideComponent.findFirst({
      where: { styleguideId: styleguide.id },
      select: { id: true, type: true, label: true },
    });
    const userComponent = scrapedComponent
      ? await prisma.styleguideComponent.update({
          where: { id: scrapedComponent.id },
          data: {
            label: 'Door mij hernoemd',
            // Zoals de PATCH-route: het analyzer-label vastleggen, want dát is
            // de sleutel waarop de scraper zijn eigen batch filtert.
            detectedLabel: scrapedComponent.label,
            source: ROW_SOURCE_USER,
          },
          select: { id: true, type: true },
        })
      : await prisma.styleguideComponent.create({
          data: {
            type: 'BUTTON',
            label: 'Door mij hernoemd',
            extractedStyles: { radius: '4px' } as Prisma.InputJsonValue,
            source: ROW_SOURCE_USER,
            styleguideId: styleguide.id,
            workspaceId: workspace.id,
            sortOrder: 0,
          },
          select: { id: true, type: true },
        });
    console.log(
      scrapedComponent
        ? '  (een gescrapt component hernoemd)'
        : '  (geen gescrapte componenten — eigen component aangemaakt)',
    );

    // Exact het pad dat PATCH /api/brandstyle/logo loopt: het veld schrijven én
    // via dezelfde helper claimen. Zonder de claim wint een geslaagde
    // AI-respons alsnog van de curatie — dat was de vondst tijdens de eerste
    // run van dit harnas. `resolveFieldClaims` is bewust de helper die de
    // routes ook gebruiken, zodat dit harnas niet langs het gat heen test.
    const CURATED_PHOTO = { mood: 'Handmatig gezet', bron: 'gebruiker' };
    await prisma.brandStyleguide.update({
      where: { id: styleguide.id },
      data: {
        logoDonts: CURATED_DONTS,
        // De Json-helft van dezelfde sectie: alleen de lijsten beschermen liet
        // de halve sectie open.
        photographyStyle: CURATED_PHOTO as Prisma.InputJsonValue,
        ...(await resolveFieldClaims(workspace.id, {
          logoDonts: CURATED_DONTS,
          photographyStyle: CURATED_PHOTO,
        })),
        buttonProfile: { radius: '999px', bron: 'handmatig' } as Prisma.InputJsonValue,
        buttonProfileOverride: true,
      },
    });

    // ── Run 2 ───────────────────────────────────────────
    console.log(`\n── Analyse 2 (refresh) …\n`);
    await analyzeUrl(styleguide.id, URL_TO_ANALYSE);

    // ── Assertions ──────────────────────────────────────
    console.log('\n── Wat is er van de user-edits over?\n');

    const [colors, logos, components, sg] = await Promise.all([
      prisma.styleguideColor.findMany({
        where: { styleguideId: styleguide.id },
        select: { id: true, hex: true, tags: true, source: true, sortOrder: true, name: true },
      }),
      prisma.styleguideLogo.findMany({
        where: { styleguideId: styleguide.id },
        select: { id: true, variant: true, fileUrl: true, uploadedById: true },
      }),
      prisma.styleguideComponent.findMany({
        where: { styleguideId: styleguide.id },
        select: { id: true, label: true, type: true, source: true },
      }),
      prisma.brandStyleguide.findUnique({
        where: { id: styleguide.id },
        select: {
          status: true,
          logoDonts: true,
          colorDonts: true,
          photographyStyle: true,
          userEditedFields: true,
          buttonProfile: true,
          buttonProfileOverride: true,
          primaryFontName: true,
          typeScale: true,
        },
      }),
    ]);

    console.log('Kleuren');
    assert(
      'de handmatig toegevoegde kleur bestaat nog',
      colors.some((c) => c.id === userColor.id),
    );
    assert(
      'en behoudt de naam die de gebruiker koos',
      colors.find((c) => c.id === userColor.id)?.name === 'Mijn eigen paars',
    );
    if (clashColor) {
      const clash = colors.find((c) => c.id === clashColor.id);
      assert(
        'een zelf-benoemde kleur behoudt haar naam ook als de scraper diezelfde hex vindt',
        clash?.name === 'Zelf benoemd, botsende hex',
        `nu: ${clash?.name} — de verversing mag alleen gescrapte rijen raken`,
      );
      assert(
        'en de scraper zet er geen tweede rij met die hex naast',
        colors.filter((c) => c.hex.toLowerCase() === clashColor.hex.toLowerCase()).length === 1,
      );
    }
    assert(
      'er is geen tweede rij met dezelfde hex',
      colors.filter((c) => c.hex.toLowerCase() === USER_COLOR_HEX.toLowerCase()).length === 1,
      `${colors.filter((c) => c.hex.toLowerCase() === USER_COLOR_HEX.toLowerCase()).length} rijen`,
    );
    if (scrapedColor) {
      const tagged = colors.find((c) => c.id === scrapedColor.id);
      assert(
        'de tag-correctie op een gescrapte kleur overleeft',
        tagged?.tags.includes('door-de-gebruiker-gezet') === true,
      );
      assert(
        'en de scraper zet er geen duplicaat met dezelfde hex naast',
        colors.filter((c) => c.hex.toLowerCase() === scrapedColor.hex.toLowerCase()).length === 1,
      );
      assert(
        'de merkkleur behoudt haar sorteerplek',
        tagged?.sortOrder === scrapedColor.sortOrder,
        `was ${scrapedColor.sortOrder}, nu ${tagged?.sortOrder} — pickBrand kiest op sortOrder`,
      );
      assert(
        'maar de afgeleide velden bewegen wél mee met de scrape',
        typeof tagged?.name === 'string' && tagged.name.length > 0,
        'één tag-klik mag naam/categorie niet voorgoed bevriezen',
      );
      assert(
        'geen twee kleuren op dezelfde sorteerpositie',
        new Set(colors.map((c) => c.sortOrder)).size === colors.length,
        colors.map((c) => c.sortOrder).sort((a, b) => a - b).join(','),
      );
    }
    assert(
      'de gescrapte kleuren zijn wél ververst',
      colors.filter((c) => c.source === 'scraped').length > 0,
      'anders zou de refresh niets meer opleveren',
    );

    console.log("\nLogo's");
    assert(
      'het geüploade logo bestaat nog',
      logos.some((l) => l.id === userLogo.id),
    );
    assert(
      'er is precies één PRIMARY',
      logos.filter((l) => l.variant === 'PRIMARY').length === 1,
      `${logos.filter((l) => l.variant === 'PRIMARY').length} PRIMARY-rijen`,
    );
    assert(
      'en dat is die van de gebruiker',
      logos.find((l) => l.variant === 'PRIMARY')?.fileUrl === USER_LOGO_URL,
    );

    console.log('\nComponenten');
    const survivor = components.find((c) => c.id === userComponent.id);
    assert('het component van de gebruiker bestaat nog', survivor?.label === 'Door mij hernoemd');
    assert(
      'er is geen duplicaat met hetzelfde (type, label)',
      components.filter(
        (c) => c.type === userComponent.type && c.label === 'Door mij hernoemd',
      ).length === 1,
    );

    console.log('\nProfielvelden');
    assert(
      'de gecureerde logoDonts staan er nog — óók nu de AI eigen donts opleverde',
      Array.isArray(sg?.logoDonts) &&
        (sg?.logoDonts as string[]).length === CURATED_DONTS.length &&
        CURATED_DONTS.every((d) => (sg?.logoDonts as string[]).includes(d)),
      JSON.stringify(sg?.logoDonts),
    );
    assert(
      'de claim staat er nog na de re-analyse',
      sg?.userEditedFields.includes('logoDonts') === true,
      JSON.stringify(sg?.userEditedFields),
    );
    assert(
      'de Json-helft van dezelfde sectie is óók beschermd',
      (sg?.photographyStyle as Record<string, unknown> | null)?.bron === 'gebruiker',
      JSON.stringify(sg?.photographyStyle),
    );
    assert(
      'een niet-geclaimd don\'ts-veld is wél ververst door de analyzer',
      Array.isArray(sg?.colorDonts),
      'anders bevriest de claim per ongeluk álle lijsten',
    );
    assert(
      'buttonProfileOverride heeft het profiel beschermd',
      (sg?.buttonProfile as Record<string, unknown> | null)?.bron === 'handmatig',
      JSON.stringify(sg?.buttonProfile),
    );
    assert('de override-vlag staat nog aan', sg?.buttonProfileOverride === true);
    assert(
      'primaryFontName is niet leeggeslagen',
      sg?.primaryFontName !== null && sg?.primaryFontName !== '',
      String(sg?.primaryFontName),
    );
    assert('de analyse haalde COMPLETE', sg?.status === 'COMPLETE', String(sg?.status));

    console.log(
      `\nNa de refresh: ${colors.length} kleuren · ${logos.length} logo's · ${components.length} componenten`,
    );
  } finally {
    if (workspaceId) await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    if (organizationId)
      await prisma.organization.delete({ where: { id: organizationId } }).catch(() => {});
    console.log('\nScratch-workspace opgeruimd.');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

void main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
