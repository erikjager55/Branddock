/**
 * Deterministische constraint-afleiding over bestaande StyleguideRule-records.
 *
 * De geïmporteerde `*Donts`-regels hebben geen `constraint` en zijn daarmee
 * ongeclassificeerd: niet afdwingbaar én ze reizen mee naar kanalen waar ze
 * niet nageleefd kunnen worden. Dit script zet er de constraint op die zonder
 * AI met zekerheid vaststaat (zie src/lib/brandstyle/derive-rule-constraint.ts).
 *
 * Eerlijke verwachting: de tekst-opbrengst is klein — vrijwel alle bestaande
 * regels zitten in visuele secties. De winst is dat ze daarna als *visueel
 * gemarkeerd* zijn in plaats van onbekend.
 *
 * Raakt nooit een regel die al een constraint heeft, en nooit `source: 'user'`
 * (override is heilig).
 *
 * Dry-run by default — draai met `--apply` om te schrijven.
 *
 * Run:
 *   DATABASE_URL=... npx tsx scripts/derive-rule-constraints.ts
 *   DATABASE_URL=... npx tsx scripts/derive-rule-constraints.ts --apply
 *   DATABASE_URL=... npx tsx scripts/derive-rule-constraints.ts --workspace="DTS" --verbose
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { deriveRuleConstraint } from '../src/lib/brandstyle/derive-rule-constraint';
import { clearStyleguideRuleCache } from '../src/lib/brand-fidelity/styleguide-rule-compiler';

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');
const workspaceArg = process.argv.find((a) => a.startsWith('--workspace='));
const WORKSPACE_FILTER = workspaceArg ? workspaceArg.split('=')[1] : null;

async function main(): Promise<void> {
  const rules = await prisma.styleguideRule.findMany({
    where: {
      constraint: { equals: Prisma.DbNull },
      source: { not: 'user' },
      ...(WORKSPACE_FILTER
        ? {
            styleguide: {
              workspace: { name: { contains: WORKSPACE_FILTER, mode: 'insensitive' } },
            },
          }
        : {}),
    },
    select: {
      id: true,
      section: true,
      title: true,
      description: true,
      styleguideId: true,
      styleguide: { select: { workspaceId: true, workspace: { select: { name: true } } } },
    },
  });

  console.log(`${APPLY ? 'APPLY' : 'DRY-RUN'} — ${rules.length} regel(s) zonder constraint\n`);

  const byOutcome = { text: 0, visual: 0, unclassified: 0 };
  const perWorkspace = new Map<string, { text: number; visual: number; unclassified: number }>();
  const touchedWorkspaces = new Set<string>();

  for (const rule of rules) {
    const derived = deriveRuleConstraint(rule);
    const wsName = rule.styleguide.workspace.name;
    const bucket = perWorkspace.get(wsName) ?? { text: 0, visual: 0, unclassified: 0 };

    if (!derived) {
      byOutcome.unclassified++;
      bucket.unclassified++;
      perWorkspace.set(wsName, bucket);
      if (VERBOSE) console.log(`  —  [${rule.section}] ${rule.title.slice(0, 90)}`);
      continue;
    }

    if (derived.modality === 'text') {
      byOutcome.text++;
      bucket.text++;
      console.log(`  T  [${rule.section}] ${derived.check} ← ${rule.title.slice(0, 80)}`);
    } else {
      byOutcome.visual++;
      bucket.visual++;
      if (VERBOSE) {
        console.log(`  V  [${rule.section}] ${derived.property} ← ${rule.title.slice(0, 80)}`);
      }
    }
    perWorkspace.set(wsName, bucket);

    if (APPLY) {
      await prisma.styleguideRule.update({
        where: { id: rule.id },
        data: { constraint: derived },
      });
      touchedWorkspaces.add(rule.styleguide.workspaceId);
    }
  }

  console.log('\nPer workspace:');
  for (const [name, counts] of [...perWorkspace.entries()].sort()) {
    console.log(
      `  ${name.slice(0, 28).padEnd(29)} tekst ${String(counts.text).padStart(3)} · ` +
        `visueel ${String(counts.visual).padStart(3)} · ` +
        `onbepaald ${String(counts.unclassified).padStart(3)}`,
    );
  }

  console.log(
    `\nTotaal: ${byOutcome.text} tekst-checkbaar · ${byOutcome.visual} visueel · ` +
      `${byOutcome.unclassified} onbepaald (werk voor de AI-structurer).`,
  );

  if (APPLY) {
    for (const workspaceId of touchedWorkspaces) clearStyleguideRuleCache(workspaceId);
    console.log(`Geschreven naar ${byOutcome.text + byOutcome.visual} regel(s).`);
  } else {
    console.log('Dry-run — draai met --apply om te schrijven.');
  }
}

void main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
