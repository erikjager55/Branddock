/**
 * Nazorg ná een merk-DNA-import: zet de contenttaal van de doel-workspace en
 * publiceer de styleguide. Beide migreren bewust NIET mee in de bundle — de
 * `Workspace`-rij is de doel-workspace zelf (contentLanguage), en de lokale
 * styleguide stond vaak nog op `published=false` (voedt `getBrandContext` niet).
 * Idempotent: alleen kolom-updates, geen wipes/cascades.
 *
 *   DATABASE_URL="<prod-DIRECT-url>" npx tsx scripts/migrate-brand-dna/nazorg.ts \
 *     (--slug <ws> | --workspace-id <id>) [--lang nl] [--publish]
 *
 * Wordt aangeroepen door import-all-<datum>.sh, maar is ook los bruikbaar.
 * Zie tasks/workspaces-online-migratie.md.
 */
import './load-env';
import { prisma } from '../../src/lib/prisma';

interface Flags {
  slug?: string;
  workspaceId?: string;
  lang?: string;
  publish?: boolean;
}

function parseFlags(argv: string[]): Flags {
  const f: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--slug') f.slug = argv[++i];
    else if (a === '--workspace-id') f.workspaceId = argv[++i];
    else if (a === '--lang') f.lang = argv[++i];
    else if (a === '--publish') f.publish = true;
  }
  return f;
}

async function resolveWorkspaceId(flags: Flags): Promise<string> {
  if (flags.workspaceId) return flags.workspaceId;
  if (flags.slug) {
    const matches = await prisma.workspace.findMany({
      where: { slug: flags.slug },
      select: { id: true },
    });
    if (matches.length === 0) throw new Error(`slug '${flags.slug}' niet gevonden op deze DB.`);
    if (matches.length > 1) {
      throw new Error(`slug '${flags.slug}' matcht ${matches.length} workspaces — geef --workspace-id.`);
    }
    return matches[0].id;
  }
  throw new Error('Geef --slug <workspace-slug> of --workspace-id <id>.');
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const workspaceId = await resolveWorkspaceId(flags);

  if (flags.lang) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { contentLanguage: flags.lang },
    });
    console.log(`[nazorg] contentLanguage → ${flags.lang}`);
  }

  if (flags.publish) {
    const result = await prisma.brandStyleguide.updateMany({
      where: { workspaceId, published: false },
      data: { published: true, publishedAt: new Date() },
    });
    console.log(`[nazorg] styleguide gepubliceerd (${result.count} rij bijgewerkt)`);
  }

  if (!flags.lang && !flags.publish) {
    console.log('[nazorg] niets te doen (geen --lang / --publish opgegeven)');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[nazorg] FOUT:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
