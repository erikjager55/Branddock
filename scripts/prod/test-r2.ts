/**
 * R2 connectivity-smoke via de échte app-code (src/lib/storage/r2-storage.ts):
 * upload een test-object → fetch de publieke URL → ruim op. Verifieert
 * creds + bucket-write + public-read in één keer.
 *
 *   node --env-file=<pad/.env.local> node_modules/.bin/tsx scripts/prod/test-r2.ts
 */
import { isR2Configured, uploadToR2, deleteFromR2 } from '@/lib/storage/r2-storage';

async function main(): Promise<void> {
  if (!isR2Configured()) {
    console.error(
      'FOUT: R2 niet geconfigureerd — R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY ontbreken in de env.',
    );
    process.exit(1);
  }

  const key = `_healthcheck/test-${Date.now()}.txt`;
  const body = Buffer.from(`branddock r2 test ${new Date().toISOString()}`);

  console.log('-> upload naar bucket ...');
  const { url } = await uploadToR2(key, body, 'text/plain');
  console.log('OK   geuploaded:', url);

  console.log('-> publieke URL ophalen ...');
  const res = await fetch(url);
  console.log(`${res.ok ? 'OK  ' : 'FOUT'} public fetch: HTTP ${res.status}`);
  const match = res.ok ? (await res.text()) === body.toString() : false;
  if (res.ok) console.log(`${match ? 'OK  ' : 'WAARSCHUWING'} inhoud-match: ${match}`);

  console.log('-> opruimen ...');
  await deleteFromR2(key);
  console.log('OK   test-object verwijderd.');

  if (res.ok && match) {
    console.log('\nR2 werkt end-to-end: write + public-read + delete. ✅');
  } else if (res.ok) {
    console.log('\nUpload + fetch werken, maar de inhoud-match faalde — check de public-URL-config.');
    process.exit(1);
  } else {
    console.log(
      `\nUpload werkt, maar de publieke URL is niet leesbaar (HTTP ${res.status}). ` +
        'Check "Public access" op de bucket + of R2_PUBLIC_URL de dev-URL is.',
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('FOUT:', e instanceof Error ? e.message : e);
  process.exit(1);
});
