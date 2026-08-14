/**
 * Zet de schrijfrichtlijnen van een merk om in afdwingbare tekst-regels.
 *
 * `BrandVoiceguide.writingGuidelines` + `contentGuidelines` bevatten de regels
 * die over de tékst gaan ("gemiddeld 15-20 woorden per zin", "derde persoon,
 * niet 'Wij organiseren'"). Die stuurden alleen de generatie; F-VAL's
 * rules-pijler zag er niets van. Dit script laat ze classificeren
 * (src/lib/brandstyle/rule-structurer.ts) en schrijft het resultaat weg als
 * StyleguideRule in de sectie `voice`.
 *
 * Idempotent: bestaande regels met sectie `voice` én source `derived`/
 * `recommended` worden vervangen. `source: 'user'` blijft altijd staan
 * (override is heilig).
 *
 * Dry-run by default — draai met `--apply` om te schrijven. Kost AI-tokens:
 * één call per workspace.
 *
 * Run:
 *   DATABASE_URL=... ANTHROPIC_API_KEY=... npx tsx scripts/structure-styleguide-rules.ts
 *   ... npx tsx scripts/structure-styleguide-rules.ts --workspace="DTS" --apply
 */
import { prisma } from '../src/lib/prisma';
import { syncStructuredVoiceRules } from '../src/lib/brandstyle/rule-structurer';

const APPLY = process.argv.includes('--apply');
const workspaceArg = process.argv.find((a) => a.startsWith('--workspace='));
const WORKSPACE_FILTER = workspaceArg ? workspaceArg.split('=')[1] : null;

const STATUS_LABEL: Record<string, string> = {
  'no-styleguide': 'geen styleguide',
  'no-voiceguide': 'geen voiceguide',
  gated: 'guidelines staan uit voor AI',
  'no-guidelines': 'geen schrijfrichtlijnen',
  'unsupported-language': 'taal niet ondersteund voor perspectief-regels',
};

async function main(): Promise<void> {
  const workspaces = await prisma.workspace.findMany({
    where: WORKSPACE_FILTER ? { name: { contains: WORKSPACE_FILTER, mode: 'insensitive' } } : {},
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  console.log(`${APPLY ? 'APPLY' : 'DRY-RUN'} — ${workspaces.length} workspace(s)\n`);

  let totalProposed = 0;
  let totalWritten = 0;
  const failed: string[] = [];

  for (const ws of workspaces) {
    // Fail-soft per workspace: een AI-fout op één merk mag de batch niet
    // afbreken — bij --apply zou je anders halverwege stoppen.
    let result: Awaited<ReturnType<typeof syncStructuredVoiceRules>>;
    try {
      result = await syncStructuredVoiceRules(ws.id, { dryRun: !APPLY });
    } catch (err) {
      failed.push(ws.name);
      console.error(`✗ ${ws.name}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    if (result.status !== 'ok') {
      const extra = result.localeSource ? ` (${result.localeSource})` : '';
      console.log(`— ${ws.name}: ${STATUS_LABEL[result.status] ?? result.status}${extra}`);
      continue;
    }

    totalProposed += result.proposals.length;
    totalWritten += result.written;

    // De gekozen taal expliciet tonen: die komt uit contentLocale/
    // contentLanguage en is bij meerdere workspaces mis-geconfigureerd
    // (gotcha 2026-05-10 — LINFI stond op 'en' terwijl het merk Nederlands
    // schrijft). Een verkeerde taal levert een perspectief-regel met de
    // verkeerde woordtabel.
    console.log(
      `\n${ws.name} — ${result.proposals.length} regel(s) ` +
        `[taal ${result.language} via ${result.localeSource}]`,
    );
    for (const p of result.proposals) {
      console.log(`   • [${p.provenance}] ${p.title}`);
      console.log(`     ${JSON.stringify(p.constraint)}`);
      console.log(`     ← "${p.guideline.slice(0, 100)}"`);
    }
    if (APPLY && result.written > 0) {
      console.log(`   → ${result.replaced} vervangen, ${result.written} geschreven`);
    }
  }

  console.log(
    APPLY
      ? `\nKlaar — ${totalWritten} regel(s) geschreven.`
      : `\nDry-run: ${totalProposed} regel(s) voorgesteld. Draai met --apply om te schrijven.`,
  );
  if (failed.length > 0) {
    console.log(`⚠️  ${failed.length} workspace(s) mislukt: ${failed.join(', ')}`);
  }
}

void main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
