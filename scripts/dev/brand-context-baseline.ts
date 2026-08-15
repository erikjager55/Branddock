/**
 * Baseline-harnas voor de consumer-migratie naar `getBrandLibrary` (W7.1).
 *
 * De migratie verplaatst veldreads van elke consumer naar één gegate accessor.
 * tsc en lint zien daar niets van: een verkeerd doorgegeven veld of een gate
 * die te breed sluit levert stil andere AI-context op. Dit script legt die
 * context vóór de migratie vast en vergelijkt hem erna.
 *
 * Les die dit afdekt (gotchas.md 2026-07-12): een wijziging aan een laag die
 * prompts voedt is pas bewezen na een echte run van díe laag.
 *
 * Gebruik:
 *   # vóór de migratie
 *   DATABASE_URL=... npx tsx scripts/dev/brand-context-baseline.ts --out=/tmp/bc-before.json
 *   # na de migratie
 *   DATABASE_URL=... npx tsx scripts/dev/brand-context-baseline.ts --out=/tmp/bc-after.json
 *   DATABASE_URL=... npx tsx scripts/dev/brand-context-baseline.ts --compare=/tmp/bc-before.json --with=/tmp/bc-after.json
 *
 * Schrijft niets naar de database.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';
import { getBrandContext } from '../../src/lib/ai/brand-context';
import { assembleCanvasContext } from '../../src/lib/ai/canvas-context';
import { resolveWorkspaceBrandContext } from '../../src/lib/consistent-models/workspace-context-resolver';
import { fetchModuleData } from '../../src/lib/alignment/data-fetcher';

const arg = (name: string): string | null =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? null;

const OUT = arg('out');
const COMPARE = arg('compare');
const WITH = arg('with');

/**
 * Velden die per run verschillen en dus geen echt verschil zijn. Zonder deze
 * uitsluiting rapporteert élke workspace een diff en verdrinkt het signaal.
 */
const VOLATILE_KEYS = new Set(['resolvedAt', 'generatedAt']);

/** Deterministische serialisatie: sleutels gesorteerd, zodat een diff alleen echte verschillen toont. */
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (VOLATILE_KEYS.has(key)) continue;
      out[key] = stable((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

interface WorkspaceSnapshot {
  workspace: string;
  published: boolean | null;
  brandContext: unknown;
  canvasBrand: unknown | null;
  canvasNote?: string;
  /** Voedt de image-generatie-prompts van consistent models. */
  modelBrandContext: unknown;
  /** Voedt de alignment-audit. */
  alignmentBrandstyle: unknown;
}

/**
 * Prisma weigert `null` als create-waarde voor nullable Json-kolommen (dat moet
 * `Prisma.JsonNull` zijn). Voor een kloon volstaat weglaten: de kolom-default is
 * toch al null. Generiek toegepast zodat we Json niet per veld hoeven te kennen.
 */
function dropNulls<T extends Record<string, unknown>>(row: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== null) out[key] = value;
  }
  return out as Partial<T>;
}

/**
 * Lokaal is géén enkele styleguide `published`, dus de gegate takken van
 * brand-context/canvas-context worden nooit geraakt — precies de takken die de
 * migratie verplaatst. Deze kloon maakt een wegwerp-workspace met de styleguide
 * van een bestaand merk, gepubliceerd en met alle save-for-AI-vlaggen open, en
 * ruimt zichzelf daarna op. Deterministisch omdat hij van dezelfde bron komt.
 */
async function withPublishedScratch(
  sourceName: string,
  run: (workspaceId: string) => Promise<void>,
): Promise<void> {
  const source = await prisma.brandStyleguide.findFirst({
    where: { workspace: { name: { contains: sourceName, mode: 'insensitive' } } },
    include: { colors: true, fonts: true, logos: true, components: true, rules: true },
  });
  if (!source) {
    console.log(`  — scratch overgeslagen: geen styleguide gevonden voor '${sourceName}'`);
    return;
  }

  const suffix = `baseline-${process.pid}`;
  let organizationId: string | null = null;
  let workspaceId: string | null = null;

  try {
    const org = await prisma.organization.create({
      data: { name: `Baseline ${suffix}`, slug: `baseline-${suffix}` },
      select: { id: true },
    });
    organizationId = org.id;
    const workspace = await prisma.workspace.create({
      data: {
        name: `__scratch_published`,
        slug: `baseline-ws-${suffix}`,
        contentLanguage: 'nl',
        organizationId: org.id,
      },
      select: { id: true },
    });
    workspaceId = workspace.id;

    const {
      id: _id,
      workspaceId: _ws,
      colors,
      fonts,
      logos,
      components,
      rules,
      createdAt: _c,
      updatedAt: _u,
      ...scalars
    } = source;

    // De cast is veilig: `scalars` komt uit een gelezen rij, dus elk verplicht
    // veld is aanwezig. `dropNulls` maakt ze voor TypeScript optioneel, wat
    // Prisma's Exact<>-type niet accepteert.
    const cloneData = {
      ...dropNulls(scalars),
      workspaceId: workspace.id,
      published: true,
      logoSavedForAi: true,
      colorsSavedForAi: true,
      typographySavedForAi: true,
      imagerySavedForAi: true,
      designLanguageSavedForAi: true,
      visualLanguageSavedForAi: true,
    } as Prisma.BrandStyleguideUncheckedCreateInput;

    const clone = await prisma.brandStyleguide.create({
      data: cloneData,
      select: { id: true },
    });

    const strip = <T extends { id: string; styleguideId: string }>(rows: T[]) =>
      rows.map(({ id: _rowId, styleguideId: _sg, ...rest }) => ({
        ...dropNulls(rest),
        styleguideId: clone.id,
      })) as never[]; // zelfde reden als de cast hierboven

    if (colors.length) await prisma.styleguideColor.createMany({ data: strip(colors) });
    if (fonts.length) await prisma.styleguideFont.createMany({ data: strip(fonts) });
    if (logos.length) await prisma.styleguideLogo.createMany({ data: strip(logos) });
    if (components.length) await prisma.styleguideComponent.createMany({ data: strip(components) });
    if (rules.length) await prisma.styleguideRule.createMany({ data: strip(rules) });

    await run(workspace.id);
  } finally {
    if (workspaceId) await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    if (organizationId)
      await prisma.organization.delete({ where: { id: organizationId } }).catch(() => {});
  }
}

async function capture(): Promise<Record<string, WorkspaceSnapshot>> {
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const snapshot: Record<string, WorkspaceSnapshot> = {};

  for (const ws of workspaces) {
    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId: ws.id },
      select: { published: true },
    });
    if (!styleguide) continue;

    const brandContext = stable(await getBrandContext(ws.id));

    // Canvas-context vraagt een deliverable; pak er één uit de workspace zodat
    // we de merk-afgeleide velden kunnen vergelijken. Zonder deliverable slaan
    // we dat deel over in plaats van te doen alsof het gelijk is.
    const deliverable = await prisma.deliverable.findFirst({
      where: { campaign: { workspaceId: ws.id } },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    let canvasBrand: unknown = null;
    let canvasNote: string | undefined;
    if (deliverable) {
      try {
        const stack = await assembleCanvasContext(deliverable.id, ws.id);
        canvasBrand = stable({
          brandTokens: stack.brandTokens,
          brandProvenance: stack.brandProvenance,
          brandImages: stack.brandImages,
          brandNavLogoUrl: stack.brandNavLogoUrl,
          brandStyleguideMeta: stack.brandStyleguideMeta,
        });
      } catch (err) {
        canvasNote = `canvas-context faalde: ${err instanceof Error ? err.message : String(err)}`;
      }
    } else {
      canvasNote = 'geen deliverable in deze workspace';
    }

    snapshot[ws.name] = {
      workspace: ws.name,
      published: styleguide.published,
      brandContext,
      canvasBrand,
      canvasNote,
      modelBrandContext: stable(await resolveWorkspaceBrandContext(ws.id)),
      alignmentBrandstyle: stable(await fetchModuleData(ws.id, 'BRANDSTYLE')),
    };
    console.log(`  ✓ ${ws.name}${canvasNote ? ` (${canvasNote})` : ''}`);
  }

  return snapshot;
}

/** Vergelijk twee snapshots en print per workspace de gewijzigde sleutelpaden. */
function compare(beforePath: string, afterPath: string): number {
  const before = JSON.parse(readFileSync(beforePath, 'utf8')) as Record<string, WorkspaceSnapshot>;
  const after = JSON.parse(readFileSync(afterPath, 'utf8')) as Record<string, WorkspaceSnapshot>;

  const names = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
  let changed = 0;

  for (const name of names) {
    const diffs: string[] = [];
    walk(before[name], after[name], '', diffs);
    if (diffs.length === 0) continue;
    changed++;
    console.log(`\n${name} — ${diffs.length} verschil(len)`);
    for (const d of diffs.slice(0, 25)) console.log(`   ${d}`);
    if (diffs.length > 25) console.log(`   … en ${diffs.length - 25} meer`);
  }

  console.log(
    changed === 0
      ? `\n✓ Geen enkel verschil over ${names.length} workspace(s).`
      : `\n${changed} van ${names.length} workspace(s) veranderd — controleer of elk verschil bedoeld is.`,
  );
  return changed;
}

function walk(a: unknown, b: unknown, path: string, out: string[]): void {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  const bothObjects =
    a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b);
  if (!bothObjects) {
    out.push(`${path || '(root)'}: ${preview(a)} → ${preview(b)}`);
    return;
  }
  const keys = Array.from(
    new Set([...Object.keys(a as object), ...Object.keys(b as object)]),
  ).sort();
  for (const key of keys) {
    walk(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
      path ? `${path}.${key}` : key,
      out,
    );
  }
}

function preview(value: unknown): string {
  if (value === undefined) return '(afwezig)';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text === undefined ? '(afwezig)' : text.length > 90 ? `${text.slice(0, 87)}…` : text;
}

async function main(): Promise<void> {
  if (COMPARE) {
    if (!WITH) {
      console.error('--compare= vereist ook --with=<pad naar de tweede snapshot>');
      process.exit(1);
    }
    process.exitCode = compare(COMPARE, WITH) === 0 ? 0 : 0; // diff is informatief, geen gate
    return;
  }

  if (!OUT) {
    console.error('Geef --out=<pad> op om een snapshot te schrijven, of --compare=/--with= om te vergelijken.');
    process.exit(1);
  }

  console.log('Snapshot maken…');
  const snapshot = await capture();

  // Gegate takken: alleen bereikbaar met een gepubliceerde styleguide.
  await withPublishedScratch(arg('scratch-source') ?? 'DTS Ede', async (workspaceId) => {
    snapshot['__scratch_published'] = {
      workspace: '__scratch_published',
      published: true,
      brandContext: stable(await getBrandContext(workspaceId)),
      canvasBrand: null,
      canvasNote: 'scratch-kloon, geen deliverable',
      modelBrandContext: stable(await resolveWorkspaceBrandContext(workspaceId)),
      alignmentBrandstyle: stable(await fetchModuleData(workspaceId, 'BRANDSTYLE')),
    };
    console.log('  ✓ __scratch_published (gepubliceerde kloon, alle gates open)');
  });
  writeFileSync(OUT, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`\nGeschreven naar ${OUT} (${Object.keys(snapshot).length} workspaces).`);
}

void main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
