/**
 * Smoke-test — content-locale Fase 2 (per-generatie target-locale).
 *
 *  1. isShippedContentLanguage guard.
 *  2. resolveTargetProfile(ws, 'it') → find-or-create it-IT niet-default profiel;
 *     idempotent (2e call = zelfde id); nooit een 2e isDefault.
 *  3. getBrandContext(ws, targetProfileId).contentLanguage === 'it' (target wint).
 *  4. getBrandContext(ws) (default) blijft 2-letter ISO (default-pad ongewijzigd).
 *  Ruimt het aangemaakte throwaway-profiel daarna op.
 *
 * Run: DATABASE_URL="..." npx tsx scripts/smoke-tests/content-locale-target-picker.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { resolveTargetProfile } from '../../src/lib/content-locale/default-profile';
import { isShippedContentLanguage } from '../../src/lib/content-locale/shipped-languages';
import { getBrandContext, invalidateBrandContext } from '../../src/lib/ai/brand-context';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); fail++; }
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  console.log('\n1. isShippedContentLanguage');
  assert("'nl' shipped", isShippedContentLanguage('nl'));
  assert("'xx' niet shipped", !isShippedContentLanguage('xx'));

  const ws = await prisma.workspace.findFirst({ select: { id: true, slug: true } });
  if (!ws) { console.log('geen workspace'); process.exit(0); }

  console.log(`\n2. resolveTargetProfile (ws=${ws.slug}, 'it' = throwaway)`);
  const p1 = await resolveTargetProfile(ws.id, 'it');
  assert('levert profiel', !!p1);
  assert('locale = it-IT', p1?.locale === 'it-IT', p1?.locale);
  const p2 = await resolveTargetProfile(ws.id, 'it');
  assert('idempotent (zelfde id)', !!p1 && p1.id === p2?.id);
  const defaults = await prisma.brandLocaleProfile.count({ where: { workspaceId: ws.id, isDefault: true } });
  assert('nog steeds precies 1 default', defaults === 1, `heeft ${defaults}`);

  console.log('\n3. getBrandContext met expliciet target-profiel');
  invalidateBrandContext(ws.id);
  const ctxTarget = await getBrandContext(ws.id, p1!.id);
  assert('target contentLanguage = it', ctxTarget.contentLanguage === 'it', ctxTarget.contentLanguage);

  console.log('\n4. default-pad ongewijzigd');
  const ctxDefault = await getBrandContext(ws.id);
  assert('default contentLanguage 2-letter ISO', typeof ctxDefault.contentLanguage === 'string' && ctxDefault.contentLanguage.length === 2, ctxDefault.contentLanguage);

  // Cleanup — verwijder het throwaway it-IT niet-default profiel.
  await prisma.brandLocaleProfile.deleteMany({ where: { workspaceId: ws.id, locale: 'it-IT', isDefault: false } });

  console.log(`\n${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
