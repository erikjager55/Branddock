/**
 * Smoke-test voor BrandVoiceguide locale-picker API:
 *   1. DB-laag: schema + whitelist
 *   2. GET /api/i18n/detect-suggested-locale — detection + activeLocale
 *   3. PATCH /api/brandvoiceguide — accepteert valid contentLocale (round-trip)
 *   4. PATCH /api/brandvoiceguide — wijst invalid locale af (whitelist)
 *   5. PATCH /api/brandvoiceguide — null reset → workspace-default fallback
 *
 * Idempotent: bewaart en restoreert LINFI's oorspronkelijke contentLocale.
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
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // ── DB-laag verificatie ──
  console.log('\n=== 1. Schema accepteert contentLocale field ===\n');
  const linfiWs = await prisma.workspace.findFirst({
    where: { slug: 'linfi' },
    select: { id: true },
  });
  if (!linfiWs) {
    console.error('LINFI workspace niet gevonden — abort.');
    process.exit(1);
  }
  const linfi = await prisma.brandVoiceguide.findUnique({
    where: { workspaceId: linfiWs.id },
    select: { id: true, contentLocale: true },
  });
  assert(
    'LINFI voiceguide heeft contentLocale veld',
    linfi !== null && 'contentLocale' in linfi,
  );

  const originalLocale = linfi?.contentLocale ?? null;
  console.log(`  (LINFI contentLocale at start: ${originalLocale})`);

  try {

  console.log('\n=== 2. SUPPORTED_LOCALES whitelist DB-state ===\n');
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
    console.log('\n=== HTTP-tests overgeslagen via FLAG_SKIP_HTTP=1 ===');
    skipped += 5;
  } else {
    const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
    const sessionCookie = process.env.SMOKE_SESSION_COOKIE;
    if (!sessionCookie) {
      console.log(
        '\n=== HTTP-tests overgeslagen — zet SMOKE_SESSION_COOKIE (kopieer uit browser devtools)',
      );
      skipped += 5;
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
            activeLocale: string | null;
            activeSource: string | null;
          };
          assert(
            'detection.locale is nl-NL (LINFI heeft NL content)',
            body.locale === 'nl-NL',
            `got ${body.locale}`,
          );
          assert('detection.confidence = high', body.confidence === 'high', `got ${body.confidence}`);
          assert('detection.sourceCount > 0', body.sourceCount > 0, `got ${body.sourceCount}`);
          assert(
            'activeLocale set (resolver succeeded)',
            body.activeLocale !== null,
            `got ${body.activeLocale}`,
          );
          assert(
            'activeSource set',
            body.activeSource !== null && ['voiceguide', 'workspace-default', 'fallback'].includes(body.activeSource),
            `got ${body.activeSource}`,
          );
        }
      } catch (err) {
        fail++;
        console.error('  FAIL GET error:', err instanceof Error ? err.message : String(err));
      }

      console.log('\n=== 4. PATCH /api/brandvoiceguide met valid locale (round-trip) ===\n');
      try {
        const res = await fetch(`${baseUrl}/api/brandvoiceguide`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: sessionCookie,
          },
          body: JSON.stringify({ contentLocale: 'nl-BE' }),
        });
        assert('PATCH valid locale: status 200', res.status === 200, `got ${res.status}`);
        if (res.ok) {
          const body = (await res.json()) as {
            voiceguide?: { contentLocale: string | null };
          };
          assert(
            'PATCH response bevat de nieuwe locale',
            body.voiceguide?.contentLocale === 'nl-BE',
            `got ${body.voiceguide?.contentLocale}`,
          );
        }
      } catch (err) {
        fail++;
        console.error('  FAIL PATCH valid:', err instanceof Error ? err.message : String(err));
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
        console.error('  FAIL PATCH invalid:', err instanceof Error ? err.message : String(err));
      }

      console.log('\n=== 6. PATCH met null (reset naar workspace-default) ===\n');
      try {
        const res = await fetch(`${baseUrl}/api/brandvoiceguide`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: sessionCookie,
          },
          body: JSON.stringify({ contentLocale: null }),
        });
        assert('PATCH null: status 200', res.status === 200, `got ${res.status}`);
        if (res.ok) {
          const body = (await res.json()) as {
            voiceguide?: { contentLocale: string | null };
          };
          assert(
            'PATCH null: voiceguide.contentLocale = null',
            body.voiceguide?.contentLocale === null,
            `got ${body.voiceguide?.contentLocale}`,
          );
        }
      } catch (err) {
        fail++;
        console.error('  FAIL PATCH null:', err instanceof Error ? err.message : String(err));
      }
    }
  }

  } finally {
    // ── Restore LINFI's originele contentLocale, ook bij crash midden in
    //    de HTTP-tests (e.g. PATCH-step naar nl-BE gevolgd door unexpected
    //    throw). Garandeert idempotency van de smoke-test. ──
    console.log('\n=== Cleanup: restore LINFI contentLocale ===\n');
    try {
      await prisma.brandVoiceguide.update({
        where: { workspaceId: linfiWs.id },
        data: { contentLocale: originalLocale },
      });
      console.log(`  Restored LINFI contentLocale to: ${originalLocale}`);
    } catch (err) {
      console.error('  WARN restore failed:', err instanceof Error ? err.message : String(err));
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
