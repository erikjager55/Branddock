/**
 * Storage-URL-vervalsmoke (deferred-browser-smokes-unblocked).
 *
 * Waarom dit bestaat: de gotcha van 2026-07-21 ("AI-trainer negeerde
 * referentiestijl stil") is een KLASSE, geen incident. Elke route die een uit
 * de DB gelezen storage-URL aan een externe fetcher geeft — fal, Gemini, een
 * vision-API — breekt zodra die rij een *signed* R2-endpoint-URL bevat, want
 * die vervalt na een uur. Prod heeft zulke rijen (geschreven vóór
 * `R2_PUBLIC_URL` bestond); lokaal bestaan ze niet, dus lokaal is de bug
 * onzichtbaar. Precies de reden dat hij drie keer terugkwam.
 *
 * Deze smoke maakt de klasse reproduceerbaar zónder prod-toegang: deel B
 * ondertekent een écht R2-object met een TTL van 1 seconde en laat die
 * daadwerkelijk verlopen. Geen mock, geen gefingeerde 403 — de echte
 * faalconditie.
 *
 * Drie delen:
 *
 *  A. PUUR (geen netwerk, geen creds) — de normalisatie-contracten van
 *     `resolveStorageUrl`: beide endpoint-vormen (path-style én virtual-host),
 *     bare keys, en de passthrough-gevallen die hij met rust moet laten.
 *  B. ECHT R2 (opt-in) — upload een klein object, onderteken het met 1s TTL,
 *     wacht tot het verlopen is, en bewijs: rauwe URL faalt, geresolvede URL
 *     werkt. Ruimt zichzelf op.
 *  C. CALL-SITES — elke producent van externe beeld-URL's gaat door de
 *     resolver. Bron-niveau, bewust: "één gefixte route bewijst niets over de
 *     andere" is letterlijk de les van 21-07, en dat is een eigenschap van de
 *     verzameling call-sites, niet van één functie.
 *
 * Run (puur + call-sites, veilig):
 *   npx tsx scripts/smoke-tests/storage-url-expiry-resolution.ts
 * Run (incl. echte R2-round-trip):
 *   SMOKE_R2=1 npm run smoke:storage-url-expiry
 */

import { readFileSync } from 'fs';
import { join } from 'path';

let passed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(label);
    console.error(`  ✗ ${label}`);
  }
}

const REPO_ROOT = join(__dirname, '..', '..');

// ─── Deel A — puur ────────────────────────────────────────────

/**
 * Zet de R2-env deterministisch vóór de import van de resolver. De module
 * leest `process.env` per aanroep, maar de waarden uit `.env.local` zouden de
 * verwachtingen hieronder anders per machine laten verschillen.
 */
const PUBLIC_URL = 'https://pub-test.r2.dev';
const BUCKET = 'branddock-media';
const ACCOUNT = 'acc123';

async function runPureChecks(): Promise<void> {
  console.log('\nA. Normalisatie-contracten van resolveStorageUrl (puur)');

  process.env.R2_PUBLIC_URL = PUBLIC_URL;
  process.env.R2_BUCKET_NAME = BUCKET;

  const { resolveStorageUrl, resolveStorageUrls } = await import(
    '../../src/lib/storage/resolve-storage-url'
  );

  const KEY = 'ws_abc123/media/photo.jpg';

  // De twee endpoint-vormen die daadwerkelijk in opgeslagen data voorkomen.
  // Blind het eerste padsegment strippen corrumpeert de virtual-host-vorm —
  // dat was de valstrik bij het fixen op 21-07.
  const pathStyle = `https://${ACCOUNT}.r2.cloudflarestorage.com/${BUCKET}/${KEY}`;
  const virtualHost = `https://${BUCKET}.${ACCOUNT}.r2.cloudflarestorage.com/${KEY}`;

  check(
    'path-style endpoint → publieke URL, bucket-segment gestript',
    (await resolveStorageUrl(pathStyle)) === `${PUBLIC_URL}/${KEY}`,
  );
  check(
    'virtual-host endpoint → publieke URL, key intact',
    (await resolveStorageUrl(virtualHost)) === `${PUBLIC_URL}/${KEY}`,
  );

  // Een *signed* URL is dezelfde host plus query-parameters. De resolver moet
  // die query weggooien, niet meenemen — anders draag je de vervaltijd mee.
  const signed = `${pathStyle}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600&X-Amz-Signature=deadbeef`;
  check(
    'signed endpoint-URL → publieke URL zonder vervalquery',
    (await resolveStorageUrl(signed)) === `${PUBLIC_URL}/${KEY}`,
  );

  check('bare key → publieke URL', (await resolveStorageUrl(KEY)) === `${PUBLIC_URL}/${KEY}`);

  // Passthrough-gevallen: hier mag hij níets doen.
  check(
    'lokaal dev-pad blijft ongemoeid',
    (await resolveStorageUrl('/uploads/media/x.png')) === '/uploads/media/x.png',
  );
  check(
    'reeds-publieke CDN-URL blijft ongemoeid',
    (await resolveStorageUrl(`${PUBLIC_URL}/${KEY}`)) === `${PUBLIC_URL}/${KEY}`,
  );
  check(
    'externe host (pexels) blijft ongemoeid',
    (await resolveStorageUrl('https://images.pexels.com/photos/1.jpg')) ===
      'https://images.pexels.com/photos/1.jpg',
  );
  check('lege waarde blijft leeg', (await resolveStorageUrl('')) === '');

  // Bucket-naam-false-match: een key die toevallig met de bucketnaam begint mag
  // niet gehalveerd worden. Onze keys beginnen met ws_…, dus dit is de guard
  // die dat borgt in plaats van een aanname.
  const trickyKey = `${BUCKET}/media/x.jpg`;
  check(
    'key die met de bucketnaam begint wordt niet dubbel gestript',
    (await resolveStorageUrl(`https://${ACCOUNT}.r2.cloudflarestorage.com/${BUCKET}/${trickyKey}`)) ===
      `${PUBLIC_URL}/${trickyKey}`,
  );

  // De batch-variant moet volgorde én lengte behouden: de compose-route matcht
  // de uitkomst op index tegen de MediaAsset-rijen.
  const batch = await resolveStorageUrls([pathStyle, '/uploads/a.png', virtualHost]);
  check(
    'resolveStorageUrls behoudt volgorde en lengte',
    batch.length === 3 &&
      batch[0] === `${PUBLIC_URL}/${KEY}` &&
      batch[1] === '/uploads/a.png' &&
      batch[2] === `${PUBLIC_URL}/${KEY}`,
  );
}

// ─── Deel B — echte R2-round-trip ─────────────────────────────

/**
 * Het bewijs dat er toe doet: een signed URL die ECHT verlopen is.
 *
 * We tekenen met `expiresIn: 1` en wachten die seconde uit. Wat we daarna
 * meten is geen simulatie — het is exact wat prod-rijen van vóór
 * `R2_PUBLIC_URL` doen zodra hun uur om is.
 */
async function runR2Checks(): Promise<void> {
  console.log('\nB. Echte R2-round-trip met een verlopen signed URL');

  if (process.env.SMOKE_R2 !== '1') {
    console.log('  ⏭  overgeslagen (zet SMOKE_R2=1 om deel B te draaien)');
    return;
  }

  // Deel A heeft de env-waarden overschreven met testwaarden; herstel de echte
  // config uit .env.local voordat we het netwerk op gaan.
  delete process.env.R2_PUBLIC_URL;
  delete process.env.R2_BUCKET_NAME;
  loadEnvLocal();

  const { isR2Configured, uploadToR2, getR2SignedUrl, deleteFromR2 } = await import(
    '../../src/lib/storage/r2-storage'
  );
  const { resolveStorageUrl } = await import('../../src/lib/storage/resolve-storage-url');

  if (!isR2Configured()) {
    failures.push('deel B gevraagd maar R2 is niet geconfigureerd (R2_ACCOUNT_ID/KEY/SECRET)');
    console.error('  ✗ R2 niet geconfigureerd — kan deel B niet draaien');
    return;
  }

  // 1×1 PNG. Klein genoeg om verwaarloosbaar te zijn, echt genoeg om als
  // image/png geserveerd te worden.
  const PNG_1X1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  const key = `smoke/storage-url-expiry/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

  let uploaded = false;
  try {
    await uploadToR2(key, PNG_1X1, 'image/png');
    uploaded = true;
    console.log(`  · testobject geüpload: ${key}`);

    // Onderteken met de kortst mogelijke TTL en laat die daadwerkelijk verlopen.
    const shortLived = await getR2SignedUrl(key, 1);
    await new Promise((r) => setTimeout(r, 2500));

    const rawRes = await fetch(shortLived);
    check(
      `rauwe verlopen signed URL is onbereikbaar (${rawRes.status})`,
      !rawRes.ok,
    );

    // Dit is de kern: dezelfde verlopen URL, door de resolver, moet weer
    // bereikbaar zijn. Slaagt deze niet, dan repareert de fix niets.
    const resolved = await resolveStorageUrl(shortLived);
    check('resolver geeft een andere URL terug dan de verlopen input', resolved !== shortLived);

    const resolvedRes = await fetch(resolved);
    check(`geresolvede URL is wél bereikbaar (${resolvedRes.status})`, resolvedRes.ok);

    const contentType = resolvedRes.headers.get('content-type') ?? '';
    check(`geresolvede URL levert image-content-type (${contentType})`, contentType.startsWith('image/'));

    // composeFromImages verwerpt niet-image-content-types én lege bodies; de
    // byte-vergelijking sluit uit dat we een errorpagina met 200 binnenhalen.
    const bytes = Buffer.from(await resolvedRes.arrayBuffer());
    check('geresolvede URL levert exact het geüploade object', bytes.equals(PNG_1X1));
  } catch (err) {
    failures.push(`deel B wierp een fout: ${(err as Error).message}`);
    console.error(`  ✗ onverwachte fout: ${(err as Error).message}`);
  } finally {
    if (uploaded) {
      try {
        await deleteFromR2(key);
        console.log('  · testobject opgeruimd');
      } catch {
        console.warn(`  ⚠ opruimen van ${key} faalde — verwijder handmatig`);
      }
    }
  }
}

/** Minimale .env.local-loader; deel B draait ook via `npx tsx` zonder --env-file. */
function loadEnvLocal(): void {
  try {
    const raw = readFileSync(join(REPO_ROOT, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const [, k, v] = m;
      if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, '');
    }
  } catch {
    // Geen .env.local — dan moet de env al gezet zijn.
  }
}

// ─── Deel C — call-sites ──────────────────────────────────────

/**
 * Elke route die een opgeslagen URL aan een externe fetcher geeft, staat hier.
 *
 * Bewust bron-niveau en bewust een expliciete lijst: de faalmodus van 21-07 was
 * niet "de resolver werkt niet" maar "twee van de drie routes gebruiken hem".
 * Dat is alleen te vangen door de verzameling producenten uit te schrijven.
 * Komt er een nieuwe sink bij, dan hoort hij hier — een grep die zichzelf
 * uitbreidt zou juist de vergeten route missen.
 */
const EXTERNAL_URL_SINKS: Array<{ file: string; why: string }> = [
  {
    file: 'src/app/api/studio/[deliverableId]/generate-visual-compose/route.ts',
    why: 'MediaAsset.fileUrl → composeFromImages (Gemini downloadt server-side)',
  },
  {
    file: 'src/app/api/studio/[deliverableId]/components/[componentId]/refine-visual/route.ts',
    why: 'component.imageUrl → composeFromImages',
  },
  {
    file: 'src/app/api/studio/[deliverableId]/generate-visual-trained/route.ts',
    why: 'referentiebeelden → fal image_urls',
  },
  {
    file: 'src/app/api/consistent-models/[id]/generate/route.ts',
    why: 'referentiebeelden → fal image_urls',
  },
  {
    file: 'src/app/api/media/ai-images/generate/route.ts',
    why: 'referentiebeelden → fal image_urls (de route achter "Beeld genereren")',
  },
  {
    file: 'src/lib/ai/brand-style-anchors.ts',
    why: 'brand-style-anchors — de gedeelde bron voor generate-visual + feature-visuals + refine',
  },
];

function runCallSiteChecks(): void {
  console.log('\nC. Elke producent van externe beeld-URL\'s gaat door de resolver');

  for (const { file, why } of EXTERNAL_URL_SINKS) {
    let src: string;
    try {
      src = readFileSync(join(REPO_ROOT, file), 'utf8');
    } catch {
      check(`${file} bestaat (${why})`, false);
      continue;
    }
    check(
      `${file.split('/').slice(-2).join('/')} resolveert — ${why}`,
      /resolveStorageUrls?\s*\(|resolveImageRowUrls\s*\(/.test(src),
    );
  }
}

// ─── Runner ───────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Storage-URL-vervalsmoke — resolveStorageUrl + call-sites');

  await runPureChecks();
  runCallSiteChecks();
  await runR2Checks();

  console.log(`\n${'─'.repeat(60)}`);
  if (failures.length > 0) {
    console.error(`✗ ${failures.length} gefaald, ${passed} geslaagd\n`);
    for (const f of failures) console.error(`   · ${f}`);
    process.exit(1);
  }
  console.log(`✓ alle ${passed} checks geslaagd`);
  if (process.env.SMOKE_R2 !== '1') {
    console.log('  (deel B overgeslagen — SMOKE_R2=1 voor de echte R2-round-trip)');
  }
}

void main();
