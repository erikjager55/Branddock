/**
 * Merk-DNA BEELD-UPLOAD (optioneel) — uploadt de lokale /uploads/-beelden uit
 * een bundle naar R2 en herschrijft de URLs in de bundle in-place, zodat de
 * beelden op productie resolven. Draai NA export, VÓÓR import.
 *
 * Vereist R2-creds in .env.local (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID /
 * R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_PUBLIC_URL).
 *
 * Run:
 *   npx tsx scripts/migrate-brand-dna/upload-images.ts brand-dna-<slug>.json
 */
import './load-env';
import * as fs from 'fs';
import * as path from 'path';
import { isR2Configured, uploadToR2 } from '../../src/lib/storage';
import { BrandDnaBundle, loadBundle, saveBundle } from './bundle';

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Vervang alle refs in één pass (langste eerst), zodat een reeds-ingevoegde
 * R2-URL — die het originele pad bevat — niet opnieuw gematcht/geknipt wordt.
 */
function rewriteAll(serialized: string, map: Map<string, string>): string {
  const refs = [...map.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
  if (refs.length === 0) return serialized;
  const re = new RegExp(refs.join('|'), 'g');
  return serialized.replace(re, (m) => map.get(m) ?? m);
}

async function main(): Promise<void> {
  const bundlePath = process.argv[2];
  if (!bundlePath) {
    console.error('Usage: upload-images.ts <bundle.json>');
    process.exit(1);
  }
  if (!isR2Configured()) {
    console.error('R2 niet geconfigureerd — zet R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME in .env.local.');
    process.exit(1);
  }
  if (!process.env.R2_PUBLIC_URL) {
    console.error('R2_PUBLIC_URL vereist — zonder publieke CDN-URL geeft R2 een signed-URL die na ~1 uur verloopt; die zou permanent in prod belanden.');
    process.exit(1);
  }

  const bundle = loadBundle(bundlePath);
  // Langste refs eerst, zodat een kortere prefix een langere niet half vervangt.
  const refs = [...bundle.localImageRefs].sort((a, b) => b.length - a.length);
  if (refs.length === 0) {
    console.log('[upload] Geen lokale beeld-referenties in de bundle — niets te doen.');
    return;
  }

  const rewriteMap = new Map<string, string>();
  const missing: string[] = [];
  for (const ref of refs) {
    const rel = ref.replace(/^\//, ''); // "uploads/media/..."
    const disk = path.join(process.cwd(), 'public', rel);
    if (!fs.existsSync(disk)) {
      console.warn(`[upload] ONTBREEKT op schijf: ${ref}`);
      missing.push(ref);
      continue;
    }
    const { url } = await uploadToR2(rel, fs.readFileSync(disk), contentTypeFor(disk));
    rewriteMap.set(ref, url);
    console.log(`[upload] ${ref} → ${url}`);
  }

  const rewritten = JSON.parse(rewriteAll(JSON.stringify(bundle), rewriteMap)) as BrandDnaBundle;
  // Alleen niet-geüploade (ontbrekende) refs blijven staan, zodat import.ts er nog voor waarschuwt.
  rewritten.localImageRefs = missing;
  saveBundle(bundlePath, rewritten);

  console.log(`\n[upload] ${rewriteMap.size} beelden geüpload + bundle herschreven${missing.length ? ` (${missing.length} ontbraken op schijf → blijven als waarschuwing in de bundle)` : ''}.`);
}

main().catch((err) => {
  console.error('[upload] Crashed:', err);
  process.exit(1);
});
