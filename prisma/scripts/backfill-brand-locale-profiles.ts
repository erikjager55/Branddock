/**
 * Content-locale foundation backfill — Brand + default BrandLocaleProfile per workspace.
 *
 * Default: report-only. Toont per workspace welk default-profiel gemaakt zou
 * worden (locale = huidige resolutie) + hoeveel Deliverable/Persona/LandingPage
 * rijen het default-`localeProfileId` zouden krijgen.
 * Met --apply: schrijft 1 Brand + 1 isDefault BrandLocaleProfile per workspace
 * en zet `localeProfileId` (+ LandingPage.locale) op bestaande rijen. Idempotent —
 * herhaalde runs zijn no-op zodra alles gezet is.
 *
 * De default-profiel-locale wordt geseed uit exact de HUIDIGE resolutie
 * (voiceguide.contentLocale → DEFAULT_LOCALE_BY_LANG[contentLanguage] → en-GB),
 * zodat het locale-aware default-pad in Fase B byte-identiek reproduceert.
 *
 * Veiligheid:
 *   - Productie-guard: refuse als NODE_ENV=production tenzij --i-know-what-im-doing.
 *   - --workspace-slug=... om één workspace te targeten.
 *
 * Run:
 *   npx tsx prisma/scripts/backfill-brand-locale-profiles.ts             # report-only
 *   npx tsx prisma/scripts/backfill-brand-locale-profiles.ts --apply     # writes
 *   npx tsx prisma/scripts/backfill-brand-locale-profiles.ts --apply --workspace-slug=linfi
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Inline gehouden (i.p.v. import uit locale-resolver.ts) zodat dit script niet de
// app-prisma-singleton binnentrekt. MOET in sync blijven met SUPPORTED_LOCALES /
// DEFAULT_LOCALE_BY_LANG / ULTIMATE_FALLBACK in
// src/lib/brand-fidelity/heuristics/locale-resolver.ts.
const SUPPORTED_LOCALES = ['nl-NL', 'nl-BE', 'en-GB', 'de-DE'];
const DEFAULT_LOCALE_BY_LANG: Record<string, string> = { en: 'en-GB', nl: 'nl-NL', de: 'de-DE' };
const ULTIMATE_FALLBACK = 'en-GB';

/** Mirror van resolveLocaleForBrand's 3-laags fallback — puur, zonder prisma. */
function resolveLocale(voiceguideLocale: string | null | undefined, contentLanguage: string): string {
  if (voiceguideLocale && SUPPORTED_LOCALES.includes(voiceguideLocale)) return voiceguideLocale;
  const byLang = DEFAULT_LOCALE_BY_LANG[contentLanguage];
  if (byLang) return byLang;
  return ULTIMATE_FALLBACK;
}

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--i-know-what-im-doing')) {
    console.error('Refusing in production. Pass --i-know-what-im-doing to override.');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const apply = process.argv.includes('--apply');
  const slugFlag = process.argv.find((a) => a.startsWith('--workspace-slug='));
  const targetSlug = slugFlag ? slugFlag.split('=')[1] : null;

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const workspaces = await prisma.workspace.findMany({
    where: targetSlug ? { slug: targetSlug } : undefined,
    select: {
      id: true,
      slug: true,
      contentLanguage: true,
      brandVoiceguide: { select: { contentLocale: true } },
      brand: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (workspaces.length === 0) {
    console.log('No workspaces matched.');
    await prisma.$disconnect();
    return;
  }

  console.log(`${apply ? 'APPLY' : 'REPORT-ONLY'} — ${workspaces.length} workspace(s)\n`);
  let created = 0;
  let alreadyOk = 0;

  for (const ws of workspaces) {
    const locale = resolveLocale(ws.brandVoiceguide?.contentLocale, ws.contentLanguage);

    // Counts van rijen die het default-profiel nog missen.
    const campaigns = await prisma.campaign.findMany({ where: { workspaceId: ws.id }, select: { id: true } });
    const campaignIds = campaigns.map((c) => c.id);
    const [deliverablesToSet, personasToSet, landingToSet] = await Promise.all([
      campaignIds.length
        ? prisma.deliverable.count({ where: { campaignId: { in: campaignIds }, localeProfileId: null } })
        : Promise.resolve(0),
      prisma.persona.count({ where: { workspaceId: ws.id, localeProfileId: null } }),
      prisma.landingPage.count({ where: { workspaceId: ws.id, localeProfileId: null } }),
    ]);

    const existingProfile = await prisma.brandLocaleProfile.findFirst({
      where: { workspaceId: ws.id, isDefault: true },
      select: { id: true, locale: true },
    });

    if (existingProfile && deliverablesToSet === 0 && personasToSet === 0 && landingToSet === 0) {
      alreadyOk++;
      console.log(`  ✓ ${ws.slug} — default-profiel ${existingProfile.locale} aanwezig, rijen gezet (no-op)`);
      continue;
    }

    console.log(
      `  ${apply ? '→' : '·'} ${ws.slug} — locale=${locale}` +
        ` | brand:${ws.brand ? 'bestaat' : 'nieuw'}` +
        ` | profiel:${existingProfile ? 'bestaat' : 'nieuw'}` +
        ` | set localeProfileId → deliverables:${deliverablesToSet} personas:${personasToSet} landingpages:${landingToSet}`,
    );

    if (!apply) continue;

    await prisma.$transaction(async (tx) => {
      const brand = await tx.brand.upsert({
        where: { workspaceId: ws.id },
        create: { workspaceId: ws.id },
        update: {},
        select: { id: true },
      });
      const profile =
        existingProfile ??
        (await tx.brandLocaleProfile.create({
          data: { brandId: brand.id, workspaceId: ws.id, locale, isDefault: true },
          select: { id: true, locale: true },
        }));

      if (campaignIds.length) {
        await tx.deliverable.updateMany({
          where: { campaignId: { in: campaignIds }, localeProfileId: null },
          data: { localeProfileId: profile.id },
        });
      }
      await tx.persona.updateMany({
        where: { workspaceId: ws.id, localeProfileId: null },
        data: { localeProfileId: profile.id },
      });
      await tx.landingPage.updateMany({
        where: { workspaceId: ws.id },
        data: { localeProfileId: profile.id, locale: profile.locale },
      });
    });
    created++;
  }

  console.log(`\nDone. ${apply ? `${created} workspace(s) gebackfilled, ${alreadyOk} al ok.` : 'Report-only — run met --apply om te schrijven.'}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
