/**
 * Smoke-test voor BrandVoiceguide locale-picker API:
 *   1. GET /api/i18n/detect-suggested-locale — returnt detection-payload
 *   2. PATCH /api/brandvoiceguide — accepteert valid contentLocale
 *   3. PATCH /api/brandvoiceguide — wijst invalid locale af (whitelist)
 *
 * Vereist een lokaal-draaiende dev-server + sessie-cookie. Skip HTTP-tests
 * via FLAG_SKIP_HTTP=1 voor pure DB-laag validatie.
 *
 * Run: SMOKE_BASE_URL=... SMOKE_SESSION_COOKIE=... npx tsx scripts/smoke-tests/locale-picker-api.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

let pass = 0;
let fail = 0;
let skipped = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // ── DB-laag verificatie ──
  console.log('\n=== 1. Schema accepteert contentLocale field ===\n');
  const linfi = await prisma.brandVoiceguide.findUnique({
    where: { workspaceId: (await prisma.workspace.findFirst({ where: { slug: 'linfi' }, select: { id: true } }))!.id },
    select: { id: true, contentLocale: true },
  });
  assert(
    'LINFI voiceguide heeft contentLocale veld',
    linfi !== null && 'contentLocale' in linfi,
  );
  assert(
    'LINFI contentLocale = nl-NL na backfill',
    linfi?.contentLocale === 'nl-NL',
    `got ${linfi?.contentLocale}`,
  );

  console.log('\n=== 2. SUPPORTED_LOCALE_VALUES schema-whitelist ===\n');
  // Pure-schema test: alleen 4 BCP-47 locales accepted, rest rejected door
  // route's Zod validation. Hier checken we de constant niet zelf (dat doet
  // de route + UI dropdown), maar verifieer dat current DB-waardes binnen
  // de whitelist vallen.
  const allLocales = await prisma.brandVoiceguide.findMany({
    select: { contentLocale: true },
  });
  const validValues = new Set(['nl-NL', 'nl-BE', 'en-GB', 'de-DE', null]);
  const invalidRows = allLocales.filter((r) => !validValues.has(r.contentLocale));
  assert(
    'alle contentLocale waarden in DB zijn binnen whitelist',
    invalidRows.length === 0,
    `${invalidRows.length} rows met onverwachte locale`,
  );

  // ── HTTP-laag verificatie ──
  if (process.env.FLAG_SKIP_HTTP === '1') {
    console.log('\n=== 3. HTTP-tests overgeslagen via FLAG_SKIP_HTTP=1 ===');
    skipped += 3;
  } else {
    const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
    const sessionCookie = process.env.SMOKE_SESSION_COOKIE;
    if (!sessionCookie) {
      console.log(
        '\n=== 3. HTTP-tests overgeslagen — zet SMOKE_SESSION_COOKIE (kopieer uit browser devtools)',
      );
      skipped += 3;
    } else {
      console.log('\n=== 3. GET /api/i18n/detect-suggested-locale ===\n');
      try {
        const res = await fetch(`${baseUrl}/api/i18n/detect-suggested-locale`, {
          headers: { Cookie: sessionCookie },
        });
        assert('GET status 200', res.status === 200, `got ${res.status}`);
        if (res.ok) {
          const body = (await res.json()) as {
            locale: string | null;
            confidence: string;
            sourceCount: number;
          };
          assert(
            'LINFI suggested locale = nl-NL',
            body.locale === 'nl-NL',
            `got ${body.locale}`,
          );
          assert('confidence = high', body.confidence === 'high', `got ${body.confidence}`);
          assert('sourceCount > 0', body.sourceCount > 0, `got ${body.sourceCount}`);
        }
      } catch (err) {
        fail++;
        console.error('  ✗ GET failed:', err instanceof Error ? err.message : String(err));
      }

      console.log('\n=== 4. PATCH /api/brandvoiceguide met valid locale ===\n');
      try {
        const res = await fetch(`${baseUrl}/api/brandvoiceguide`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: sessionCookie,
          },
          body: JSON.stringify({ contentLocale: 'nl-NL' }),
        });
        assert('PATCH valid locale: status 200', res.status === 200, `got ${res.status}`);
      } catch (err) {
        fail++;
        console.error('  ✗ PATCH valid failed:', err instanceof Error ? err.message : String(err));
      }

      console.log('\n=== 5. PATCH met invalid locale (whitelist-rejection) ===\n');
      try {
        const res = await fetch(`${baseUrl}/api/brandvoiceguide`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: sessionCookie,
          },
          body: JSON.stringify({ contentLocale: 'fr-FR' }),
        });
        assert(
          'PATCH invalid locale: status 400 (Zod-rejection)',
          res.status === 400,
          `got ${res.status}`,
        );
      } catch (err) {
        fail++;
        console.error('  ✗ PATCH invalid failed:', err instanceof Error ? err.message : String(err));
      }
    }
  }

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail, ${skipped} skipped ===\n`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
