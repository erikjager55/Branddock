/**
 * Empirisch bewijs: reconstrueert de exacte brand-context-string die in
 * content-item-prompts wordt geïnjecteerd, per published workspace.
 * Read-only. Run: DATABASE_URL=... npx tsx scripts/dev/inspect-brand-context.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getBrandContext } from '../../src/lib/ai/brand-context';
import { formatBrandContext } from '../../src/lib/ai/prompt-templates';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://erikjager:@localhost:5432/branddock';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const POLLUTION_SIGNALS = [
  '#1FD1B2', '#F59E0B', 'Minty Green', // Branddock eigen huisstijl
  'Roboto', '#FFD64F', '#FC5778', '#11B76B', // oude Material/framework-leak
  'var(--', 'Bootstrap', '#7A00DF', // raw var / framework defaults
  'undefined', '[object Object]', // shape-mismatch symptomen
];

async function run() {
  const targets = ['Linfi', 'Nobox', 'Better brands'];
  for (const name of targets) {
    const ws = await prisma.workspace.findFirst({ where: { name }, select: { id: true, name: true } });
    if (!ws) { console.log(`\n### ${name}: workspace niet gevonden\n`); continue; }

    const ctx = await getBrandContext(ws.id);
    const str = formatBrandContext(ctx);

    console.log('\n' + '='.repeat(80));
    console.log(`### ${ws.name} (${ws.id})`);
    console.log('='.repeat(80));
    console.log(`Brand-context lengte: ${str.length} chars`);
    const hits = POLLUTION_SIGNALS.filter((s) => str.includes(s));
    console.log(`Vervuilingssignalen aangetroffen: ${hits.length ? hits.join(', ') : 'GEEN ✅'}`);
    console.log('--- VOLLEDIGE GEÏNJECTEERDE STRING ---');
    console.log(str);
  }
  await prisma.$disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
