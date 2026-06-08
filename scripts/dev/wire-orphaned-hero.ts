/**
 * Fix A — wire een reeds-gegenereerd (orphaned) hero-beeld in de puckData van
 * een deliverable waar de generatie→persist-wiring niet landde. Mirrort de
 * server-side hero-wiring uit generate-visual/route.ts (BrandHero.heroVisualUrl
 * + structuredVariant.hero.heroVisualUrl). Idempotent. Read-modify-write.
 *
 * Run: DATABASE_URL=... npx tsx scripts/dev/wire-orphaned-hero.ts <deliverableId> <heroUrl>
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://erikjager:@localhost:5432/branddock';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function run() {
  const [deliverableId, heroUrl] = process.argv.slice(2);
  if (!deliverableId || !heroUrl) {
    console.error('Usage: wire-orphaned-hero.ts <deliverableId> <heroUrl>');
    process.exit(1);
  }

  const fresh = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    select: { settings: true },
  });
  if (!fresh) { console.error('Deliverable niet gevonden'); process.exit(1); }

  const settings = (fresh.settings ?? {}) as Record<string, unknown>;
  const pd = settings.puckData as
    | { content?: Array<{ type?: string; props?: Record<string, unknown> }> }
    | undefined;

  let patchedPuck = false;
  let before = '(none)';
  if (Array.isArray(pd?.content)) {
    for (const c of pd!.content!) {
      if (c.type === 'BrandHero' && c.props) {
        before = String(c.props.heroVisualUrl ?? '(none)');
        c.props.heroVisualUrl = heroUrl;
        patchedPuck = true;
      }
    }
  }

  const sv = settings.structuredVariant as { hero?: Record<string, unknown> } | undefined;
  let patchedSv = false;
  if (sv?.hero) { sv.hero.heroVisualUrl = heroUrl; patchedSv = true; }

  if (!patchedPuck && !patchedSv) {
    console.error('Geen BrandHero-block of structuredVariant.hero gevonden — niets gewijzigd.');
    process.exit(1);
  }

  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: { settings: settings as never },
  });

  console.log(`✓ hero gewired voor ${deliverableId}`);
  console.log(`  puckData.BrandHero.heroVisualUrl: ${before} → ${heroUrl} (patched=${patchedPuck})`);
  console.log(`  structuredVariant.hero.heroVisualUrl → ${heroUrl} (patched=${patchedSv})`);
  await prisma.$disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
