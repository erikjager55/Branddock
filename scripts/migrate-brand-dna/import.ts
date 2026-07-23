/**
 * Merk-DNA IMPORT — schrijft een geëxporteerde bundle naar een VERS
 * prod-account (owner meldt zich eerst normaal aan → auto-provisioning maakt
 * org+workspace+owner). Re-parent de merk-DNA naar die workspace.
 *
 * Run (tegen de DIRECTE/unpooled prod DATABASE_URL — niet de PgBouncer-pooler):
 *   npx tsx scripts/migrate-brand-dna/import.ts brand-dna-<slug>.json (--workspace-id <id> | --slug <ws> | --email <owner>) --confirm-host <db-host> [--dry-run] [--force]
 *
 * Veiligheid: (1) draait in één transactie (wipe + insert atomisch); (2) weigert een
 * workspace die al merk-DNA/content bevat (campaigns/media/personas/producten/
 * concurrenten/strategie/voice/style of >12 assets) tenzij --force; (3) een echte
 * (niet-dry-run) schrijfactie eist --confirm-host gelijk aan de DB-host, zodat je
 * niet per ongeluk de verkeerde database wipet. Zie scripts/migrate-brand-dna/README.md.
 */
import './load-env';
import { Prisma } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';
import { CANONICAL_BRAND_ASSETS } from '../../src/lib/constants/canonical-brand-assets';
import { BRAND_DNA_MODELS, BrandDnaModel, USER_REF_FIELDS, delegateFor } from './models';
import { BrandDnaBundle, loadBundle } from './bundle';

/** Minimale tx-interface voor raw SQL — vermijdt het extended-client-type. */
interface RawTx {
  $executeRaw(query: Prisma.Sql): Promise<number>;
}

interface Target {
  workspaceId: string;
  workspaceName: string;
  ownerUserId: string;
}

interface Flags {
  bundlePath: string;
  email?: string;
  slug?: string;
  workspaceId?: string;
  confirmHost?: string;
  dryRun: boolean;
  force: boolean;
}

function parseArgs(argv: string[]): Flags {
  const flags: Flags = { bundlePath: '', dryRun: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--email') flags.email = argv[++i];
    else if (a === '--slug') flags.slug = argv[++i];
    else if (a === '--workspace-id') flags.workspaceId = argv[++i];
    else if (a === '--confirm-host') flags.confirmHost = argv[++i];
    else if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--force') flags.force = true;
    else if (!a.startsWith('--') && !flags.bundlePath) flags.bundlePath = a;
  }
  return flags;
}

/** Doel + org-owner voor een gevonden workspace. */
async function targetForWorkspace(
  ws: { id: string; name: string; organizationId: string },
): Promise<Target> {
  const owner = await prisma.organizationMember.findFirst({
    where: { organizationId: ws.organizationId, role: 'owner' },
    select: { userId: true },
  });
  if (!owner) throw new Error(`Geen owner voor org ${ws.organizationId}.`);
  return { workspaceId: ws.id, workspaceName: ws.name, ownerUserId: owner.userId };
}

/**
 * Waarschuw als de doel-workspace een andere contenttaal heeft dan de bron.
 * De `Workspace`-rij migreert bewust niet mee (het is de doel-workspace zelf),
 * dus zonder deze check landt bv. Nederlands merk-DNA stil in een Engelse
 * workspace: de settings-UI toont dan een andere taal dan de generatie gebruikt.
 * Gebeurde bij Better Brands (#411) en opnieuw bij Adullam (2026-07-22).
 */
async function warnOnLanguageMismatch(bundle: BrandDnaBundle, target: Target): Promise<void> {
  const source = bundle.meta.sourceContentLanguage;
  if (!source) return; // bundle van vóór dit meta-veld
  const ws = await prisma.workspace.findUnique({
    where: { id: target.workspaceId },
    select: { contentLanguage: true },
  });
  if (!ws || ws.contentLanguage === source) return;
  console.warn(
    `[import] LET OP: contenttaal verschilt — bron '${source}', doel '${ws.contentLanguage}'. ` +
      `Workspace.contentLanguage migreert NIET mee; zet de contenttaal na de import in de app op '${source}', ` +
      'anders toont de UI een andere taal dan de generatie gebruikt.',
  );
}

/** Resolve doel-workspace + owner-user via workspace-id, -slug of owner-email. */
async function resolveTarget(flags: Flags): Promise<Target> {
  // Workspace-id is de enige eenduidige sleutel: namen mogen dubbel voorkomen
  // (lokaal én prod een "Adullam") en slugs zijn niet org-gescoped. Gebruik dit
  // wanneer de doel-workspace al bestaat en je 'm exact kent (bv. uit list_brands).
  if (flags.workspaceId) {
    const ws = await prisma.workspace.findUnique({
      where: { id: flags.workspaceId },
      select: { id: true, name: true, organizationId: true },
    });
    if (!ws) throw new Error(`Workspace-id '${flags.workspaceId}' niet gevonden op deze DB.`);
    return targetForWorkspace(ws);
  }
  if (flags.slug) {
    const matches = await prisma.workspace.findMany({
      where: { slug: flags.slug },
      select: { id: true, name: true, organizationId: true },
    });
    if (matches.length === 0) throw new Error(`Workspace-slug '${flags.slug}' niet gevonden op deze DB.`);
    if (matches.length > 1) {
      throw new Error(
        `Slug '${flags.slug}' matcht ${matches.length} workspaces (${matches.map((m) => m.id).join(', ')}) — kies er één met --workspace-id.`,
      );
    }
    return targetForWorkspace(matches[0]);
  }
  if (flags.email) {
    // Álle owner-memberships (een e-mail kan owner van meerdere orgs zijn).
    const memberships = await prisma.organizationMember.findMany({
      where: { role: 'owner', user: { email: { equals: flags.email, mode: 'insensitive' } } },
      select: {
        userId: true,
        organization: {
          select: { workspaces: { orderBy: { createdAt: 'asc' }, select: { id: true, name: true } } },
        },
      },
    });
    const workspaces = memberships.flatMap((m) => m.organization?.workspaces ?? []);
    if (memberships.length === 0 || workspaces.length === 0) {
      throw new Error(`Geen owner-workspace voor e-mail '${flags.email}'.`);
    }
    if (workspaces.length > 1) {
      throw new Error(`Owner '${flags.email}' heeft ${workspaces.length} workspaces (over ${memberships.length} org(s)) — kies er één met --slug <workspace-slug>.`);
    }
    return { workspaceId: workspaces[0].id, workspaceName: workspaces[0].name, ownerUserId: memberships[0].userId };
  }
  throw new Error('Geef --workspace-id <id>, --slug <workspace-slug> of --email <owner>.');
}

/**
 * Weiger een workspace die al gebruikt is (clobber-bescherming). Een vers-
 * geprovisionde workspace heeft exact de canonieke brand assets (auth.
 * provisionNewUser) en verder niets; élk ander signaal (of meer assets) betekent
 * dat de owner al werk heeft dat de wipe stil zou vernietigen (incl. cascades
 * naar niet-gemigreerde data). --force overschrijft dit bewust.
 */
const NONFRESH_MODELS = [
  'campaign', 'mediaAsset', 'persona', 'product', 'competitor', 'businessStrategy',
  'brandVoiceguide', 'brandStyleguide', 'brandVoice', 'brandRule', 'fidelityConfig',
  'trend', 'workshop', 'interview',
];

async function assertFresh(workspaceId: string, force: boolean): Promise<void> {
  const assets = await prisma.brandAsset.count({ where: { workspaceId } });
  const counts = await Promise.all(
    NONFRESH_MODELS.map((m) => delegateFor(prisma, m).count({ where: { workspaceId } })),
  );
  const nonFresh = counts.reduce((sum, n) => sum + n, 0);
  const summary = NONFRESH_MODELS.map((m, i) => `${m}=${counts[i]}`).join(' ');
  console.log(`[import] doel-staat: brandAssets=${assets} ${summary}`);
  if ((assets > CANONICAL_BRAND_ASSETS.length || nonFresh > 0) && !force) {
    throw new Error(
      'Doel-workspace lijkt al in gebruik (merk-DNA of content aanwezig). Gebruik --force om bewust te overschrijven.',
    );
  }
}

/** Remap workspace/user-FK's; strip auto-managed updatedAt. */
function transformRow(
  raw: Record<string, unknown>,
  workspaceId: string,
  ownerUserId: string,
): Record<string, unknown> {
  const data: Record<string, unknown> = { ...raw };
  delete data.updatedAt;
  // Remap op aanwezigheid (niet op scope): sommige parent-scoped modellen
  // (research-methods) hebben óók een workspaceId-kolom die geremapt moet.
  if ('workspaceId' in data) data.workspaceId = workspaceId;
  for (const field of USER_REF_FIELDS) {
    if (data[field] != null) data[field] = ownerUserId;
  }
  return data;
}

/**
 * Los cross-workspace-botsingen op globaal-unieke velden op door de waarde te
 * suffixen met een workspace-token. Voorkomt dat één collision de hele
 * atomische import laat terugrollen.
 */
async function resolveGlobalUniques(
  tx: unknown,
  model: BrandDnaModel,
  data: Record<string, unknown>,
  workspaceId: string,
): Promise<void> {
  for (const field of model.globallyUniqueFields ?? []) {
    const value = data[field];
    if (value == null) continue;
    let candidate = String(value);
    let n = 0;
    // Blijf suffixen tot de kandidaat écht vrij is (ook de suffix zelf gecheckt).
    while (await delegateFor(tx, model.accessor).findFirst({ where: { [field]: candidate, NOT: { workspaceId } } })) {
      n++;
      candidate = `${String(value)}-${workspaceId.slice(-6)}${n > 1 ? `-${n}` : ''}`;
    }
    if (candidate !== String(value)) {
      data[field] = candidate;
      console.log(`[import] ${model.label}.${field} botsing → ${candidate}`);
    }
  }
}

/** Herstel pgvector-kolommen via raw SQL (::vector). */
async function restoreVectors(
  tx: RawTx,
  model: BrandDnaModel,
  columns: Record<string, Record<string, string>>,
): Promise<void> {
  for (const [col, byId] of Object.entries(columns)) {
    for (const [id, literal] of Object.entries(byId)) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE ${Prisma.raw(`"${model.table}"`)}
        SET ${Prisma.raw(`"${col}"`)} = ${literal}::vector
        WHERE "id" = ${id}
      `);
    }
  }
}

async function runDryRun(bundle: BrandDnaBundle, target: Target): Promise<void> {
  console.log('\n[import] DRY-RUN — geen writes.');
  for (const model of BRAND_DNA_MODELS) {
    const insertCount = (bundle.records[model.accessor] ?? []).length;
    let wipeCount = 0;
    if (model.scope.kind === 'workspace') {
      wipeCount = await delegateFor(prisma, model.accessor).count({ where: { workspaceId: target.workspaceId } });
    }
    if (insertCount || wipeCount) {
      console.log(`[import] ${model.label}: wipe ${wipeCount} → insert ${insertCount}`);
    }
  }
  if (bundle.localImageRefs.length > 0) {
    console.log(`\n[import] LET OP: ${bundle.localImageRefs.length} lokale beeld-refs nog niet naar R2 (draai upload-images).`);
  }
}

/** Host uit DATABASE_URL (zonder credentials) — zodat de operator ziet waar hij schrijft. */
function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? '').host || '(onbekend)';
  } catch {
    return '(onbekend)';
  }
}

async function runImport(bundle: BrandDnaBundle, target: Target): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      // Wipe: workspace-scoped modellen in omgekeerde volgorde; children cascaden mee.
      for (const model of [...BRAND_DNA_MODELS].reverse()) {
        if (model.scope.kind !== 'workspace') continue;
        const { count } = await delegateFor(tx, model.accessor).deleteMany({
          where: { workspaceId: target.workspaceId },
        });
        if (count) console.log(`[import] wiped ${model.label}: ${count}`);
      }
      // Insert: in volgorde; FK's naar mee-gemigreerde rijen blijven geldig (IDs behouden).
      for (const model of BRAND_DNA_MODELS) {
        const rows = bundle.records[model.accessor] ?? [];
        for (const raw of rows) {
          const data = transformRow(raw, target.workspaceId, target.ownerUserId);
          if (model.globallyUniqueFields) await resolveGlobalUniques(tx, model, data, target.workspaceId);
          await delegateFor(tx, model.accessor).create({ data });
        }
        if (rows.length) console.log(`[import] inserted ${model.label}: ${rows.length}`);
        const vcols = bundle.vectors[model.accessor];
        if (vcols) await restoreVectors(tx, model, vcols);
      }
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv.slice(2));
  if (!flags.bundlePath) {
    console.error('Usage: import.ts <bundle.json> (--workspace-id <id> | --slug <ws> | --email <owner>) --confirm-host <db-host> [--dry-run] [--force]');
    process.exit(1);
  }
  const bundle = loadBundle(flags.bundlePath);
  const target = await resolveTarget(flags);
  const host = dbHost();
  console.log(`[import] DB-host=${host}`);
  console.log(`[import] bron=${bundle.meta.sourceWorkspaceName} → doel=${target.workspaceName} (${target.workspaceId}), owner=${target.ownerUserId}`);
  await warnOnLanguageMismatch(bundle, target);

  await assertFresh(target.workspaceId, flags.force);

  if (flags.dryRun) {
    await runDryRun(bundle, target);
    return;
  }

  // Verplichte host-bevestiging vóór een destructieve schrijfactie: voorkomt
  // dat je per ongeluk de verkeerde (bv. lokale) database wipet.
  if (flags.confirmHost !== host) {
    console.error(`[import] Veiligheidscheck: draai opnieuw met --confirm-host ${host} om de wipe+import tegen deze DB te bevestigen.`);
    process.exit(1);
  }

  if (bundle.localImageRefs.length > 0) {
    console.warn(`[import] LET OP: ${bundle.localImageRefs.length} beeld-refs wijzen nog naar lokale /uploads/ — die resolven NIET op prod. Draai upload-images eerst als je de beelden wilt.`);
  }

  await runImport(bundle, target);
  console.log('\n[import] KLAAR — merk-DNA gemigreerd.');
}

main()
  .catch((err) => {
    console.error('[import] Crashed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
