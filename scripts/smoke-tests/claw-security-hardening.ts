/**
 * [DET] Claw security-hardening regressie-smoke.
 *
 * (1) Scope-guard: de SYSTEM_IDENTITY-prompt moet de tenant-scope-boundary
 *     bevatten zodat de assistant geen merken buiten de workspace uit zijn
 *     trainingskennis bespreekt.
 * (2) IDOR statisch: élke write-tool die per-id muteert moet de mutatie
 *     workspace-scopen (updateMany met workspaceId) of voorafgaand throwen —
 *     geen bare `prisma.X.update({ where: { id } })` zonder voorafgaande guard.
 *
 * De volledige cross-workspace DB-weigering is eenmalig end-to-end geverifieerd
 * via een integratierun tegen de echte DB (12/12) — niet CI-safe (DB-afhankelijk),
 * daarom hier de statische variant als regressie-net.
 *
 * Run: npx tsx scripts/smoke-tests/claw-security-hardening.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';

// Bron-based (geen module-import) zodat de smoke CI-safe is: context-assembler
// trekt via getBrandContext prisma in, wat DATABASE_URL zou vereisen.
const SYSTEM_IDENTITY = readFileSync(
  join(__dirname, '../../src/lib/claw/context-assembler.ts'),
  'utf8',
);

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

// ─── 1. Scope-guard in de system-prompt ──────────────────────────────────────
group('1 — SYSTEM_IDENTITY bevat de tenant-scope-boundary');
{
  assert('heeft "Scope boundary"-sectie', /Scope boundary/i.test(SYSTEM_IDENTITY));
  assert('benoemt "THIS workspace"', /THIS workspace/i.test(SYSTEM_IDENTITY));
  assert('verbiedt antwoorden uit general/training knowledge', /general\/training knowledge/i.test(SYSTEM_IDENTITY));
  assert('staat eigen competitor-records expliciet toe', /competitor.*in-scope|in-scope.*competitor/i.test(SYSTEM_IDENTITY));
  assert('verbiedt fabricage over andere tenants', /Never fabricate|other tenants/i.test(SYSTEM_IDENTITY));
}

// ─── 2. Geen ongescopede per-id mutaties in write-tools ───────────────────────
group('2 — write-tools.ts: elke per-id mutatie is workspace-gescoped of geguard');
{
  const src = readFileSync(join(__dirname, '../../src/lib/claw/tools/write-tools.ts'), 'utf8');
  // Whitespace platslaan zodat multi-line `prisma.X.update({\n where: {\n id...`
  // net zo goed gevonden wordt als single-line (de vorige regex miste die — de
  // belangrijkste blind spot uit de review).
  const flat = src.replace(/\s+/g, ' ');

  const GUARDED_MODELS = 'brandAsset|persona|product|competitor|businessStrategy|interview|deliverable';

  // 2a — single-record .update({ where: { ... } }) op een tenant-model: ofwel de
  // where-clause bevat zelf workspaceId, ofwel er staat een guard in het venster
  // ervóór (findFirst met workspaceId, campaign.workspaceId-check, of de
  // not-found-throw/return).
  const updateRe = new RegExp(`prisma\\.(${GUARDED_MODELS})\\.update\\(\\s*\\{\\s*where:\\s*\\{([^}]*)\\}`, 'g');
  let unguarded = 0;
  for (let m = updateRe.exec(flat); m !== null; m = updateRe.exec(flat)) {
    const whereBody = m[2];
    if (/workspaceId/.test(whereBody)) continue; // inline gescoped
    const window = flat.slice(Math.max(0, m.index - 1800), m.index);
    const hasGuard =
      /workspaceId:\s*ctx\.workspaceId/.test(window) ||
      /campaign\.workspaceId\s*!==\s*ctx\.workspaceId/.test(window) ||
      /not found in this workspace/.test(window);
    if (!hasGuard) {
      console.error(`    ongescopede per-id update zonder guard: …${flat.slice(m.index, m.index + 80)}…`);
      unguarded++;
    }
  }
  assert('elke per-id .update() is gescoped of voorafgegaan door een workspace-guard', unguarded === 0, `${unguarded} ongeguard`);

  // 2b — destructieve per-id mutaties (delete/deleteMany/upsert) op tenant-modellen
  // moeten óók een workspace-guard hebben. Vandaag: alleen een gegueerde upsert.
  const destructiveRe = new RegExp(`prisma\\.(${GUARDED_MODELS})\\.(delete|deleteMany|upsert)\\(`, 'g');
  let unguardedDestructive = 0;
  for (let m = destructiveRe.exec(flat); m !== null; m = destructiveRe.exec(flat)) {
    const window = flat.slice(Math.max(0, m.index - 1800), m.index);
    if (!/workspaceId:\s*ctx\.workspaceId/.test(window) && !/not found in this workspace/.test(window)) {
      console.error(`    ongescopede destructieve mutatie: …${flat.slice(m.index, m.index + 80)}…`);
      unguardedDestructive++;
    }
  }
  assert('elke delete/upsert op een tenant-model heeft een workspace-guard', unguardedDestructive === 0, `${unguardedDestructive} ongeguard`);

  // 2c — positieve indicator: de bare-update-tools zijn omgezet naar
  // updateMany-met-workspaceId (≥6 surfaces: asset_content/persona/product/
  // competitor/strategy + de 3 lock_entity-cases).
  const scopedCount = (flat.match(/updateMany\(\s*\{\s*where:\s*\{\s*id:[^}]*workspaceId:\s*ctx\.workspaceId/g) ?? []).length;
  assert('≥6 updateMany-met-workspaceId aanwezig (hardening toegepast)', scopedCount >= 6, `gevonden: ${scopedCount}`);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
