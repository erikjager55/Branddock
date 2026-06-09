/**
 * Verificatie tegen ECHTE data: simuleert de clobber-write (autosave met lege
 * hero) op de werkelijke deliverable-settings en bevestigt dat de server-side
 * guard (preserveHeroOnSettings) de bestaande hero-URL behoudt. Read-only.
 *
 * Run: DATABASE_URL=... npx tsx scripts/dev/verify-hero-preserve-realdata.ts <deliverableId>
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { preserveHeroOnSettings } from '../../src/features/campaigns/components/canvas/medium/hero-visual-preserve';

const connectionString = process.env.DATABASE_URL || 'postgresql://erikjager:@localhost:5432/branddock';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function heroOf(pd: unknown): string | undefined {
  const content = (pd as { content?: Array<{ type?: string; props?: { heroVisualUrl?: string } }> })?.content;
  return content?.find((c) => c?.type === 'BrandHero')?.props?.heroVisualUrl;
}

async function run() {
  const id = process.argv[2] || 'cmq48xfjx00000ymscq5ro7eh';
  const d = await prisma.deliverable.findUnique({ where: { id }, select: { settings: true } });
  const existing = (d?.settings ?? {}) as Record<string, unknown>;
  const existingUrl = heroOf(existing.puckData);
  console.log(`Bestaande hero-URL: ${existingUrl ?? '(LEEG — wire eerst)'}`);
  if (!existingUrl) { console.log('Geen bestaande hero om te beschermen — test n.v.t.'); await prisma.$disconnect(); return; }

  // Simuleer de clobbering autosave: identieke puckData maar hero leeg.
  const incomingPuck = JSON.parse(JSON.stringify(existing.puckData)) as { content?: Array<{ type?: string; props?: Record<string, unknown> }> };
  for (const c of incomingPuck.content ?? []) if (c.type === 'BrandHero' && c.props) c.props.heroVisualUrl = '';
  const incomingSv = existing.structuredVariant
    ? { ...(existing.structuredVariant as { hero?: Record<string, unknown> }), hero: { ...((existing.structuredVariant as { hero?: Record<string, unknown> }).hero ?? {}), heroVisualUrl: null } }
    : undefined;
  const incoming: Record<string, unknown> = { puckData: incomingPuck, ...(incomingSv ? { structuredVariant: incomingSv } : {}) };

  console.log(`Simulatie inkomende autosave hero-URL: ${heroOf(incoming.puckData) || '(leeg)'}`);

  // Pas de route-merge mét guard toe.
  const preserved = preserveHeroOnSettings(existing, incoming);
  const merged = { ...existing, ...preserved };
  const resultUrl = heroOf(merged.puckData);
  const svUrl = (merged.structuredVariant as { hero?: { heroVisualUrl?: string | null } } | undefined)?.hero?.heroVisualUrl;

  console.log(`\nNa guard — puckData.hero: ${resultUrl ?? '(LEEG)'}`);
  console.log(`Na guard — structuredVariant.hero: ${svUrl ?? '(LEEG)'}`);
  const ok = resultUrl === existingUrl && svUrl === existingUrl;
  console.log(`\n${ok ? '✅ GUARD WERKT — hero behouden ondanks lege autosave' : '❌ GUARD FAALT — hero geclobberd'}`);
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
