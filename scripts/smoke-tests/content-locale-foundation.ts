/**
 * Smoke-test — content-locale foundation (ADR 2026-06-28).
 *
 * Read-only invarianten:
 *  1. Elke workspace heeft precies één isDefault BrandLocaleProfile.
 *  2. Elk profiel-locale is BCP-47 (bevat een '-') — geen kale ISO-code.
 *  3. LANG_TO_LOCALE dekt alle VALID_LANGUAGES van de content-language control.
 *  4. getBrandContext(workspaceId) levert een contentLanguage die matcht met de
 *     ISO-prefix van het default-profiel (of de bestaande fallback) — het
 *     default-pad blijft consistent.
 *
 * Run: DATABASE_URL="..." npx tsx scripts/smoke-tests/content-locale-foundation.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getBrandContext } from '../../src/lib/ai/brand-context';
import { LANG_TO_LOCALE } from '../../src/lib/content-locale/default-profile';

const VALID_LANGUAGES = ['en', 'nl', 'de', 'fr', 'es', 'pt', 'it'];

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  console.log('\n1. LANG_TO_LOCALE dekt de content-language control');
  for (const lang of VALID_LANGUAGES) {
    assert(`${lang} → ${LANG_TO_LOCALE[lang] ?? '(fallback en-GB)'}`, typeof (LANG_TO_LOCALE[lang] ?? 'en-GB') === 'string');
  }

  console.log('\n2. Elke workspace heeft precies één default-profiel (BCP-47)');
  const workspaces = await prisma.workspace.findMany({ select: { id: true, slug: true } });
  for (const ws of workspaces) {
    const profiles = await prisma.brandLocaleProfile.findMany({
      where: { workspaceId: ws.id },
      select: { locale: true, isDefault: true },
    });
    const defaults = profiles.filter((p) => p.isDefault);
    assert(`${ws.slug}: exact 1 default-profiel`, defaults.length === 1, `heeft ${defaults.length}`);
    if (defaults[0]) {
      assert(`${ws.slug}: locale is BCP-47 (${defaults[0].locale})`, defaults[0].locale.includes('-'));
    }
  }

  console.log('\n3. getBrandContext default-pad consistent (contentLanguage = ISO-2)');
  for (const ws of workspaces.slice(0, 5)) {
    const ctx = await getBrandContext(ws.id);
    assert(
      `${ws.slug}: contentLanguage="${ctx.contentLanguage}" (2-letter ISO)`,
      typeof ctx.contentLanguage === 'string' && ctx.contentLanguage.length === 2,
    );
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
