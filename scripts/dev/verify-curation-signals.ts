/**
 * Verificatie-harnas: draait de curatie-aggregatie over de ÉCHTE findings in de
 * database en print per workspace wat er in het kalibratie-paneel zou komen.
 *
 * Waarom dit naast de pure smoke bestaat: die test de drempel- en sleutellogica
 * in isolatie met verzonnen rijen. Wat hij niet aantoont is of er op echte data
 * überhaupt iets zinnigs uit komt — de faalmodus "feature werkt, maar er staat
 * nooit iets in" is bij dit soort aggregaties de waarschijnlijkste.
 *
 * Read-only. Verandert niets.
 *
 * Run: DATABASE_URL=... npx tsx scripts/dev/verify-curation-signals.ts
 */
import { prisma } from '../../src/lib/prisma';
import { expandStemVariants } from '../../src/lib/brand-fidelity/brand-rule-sync';
import {
  aggregateViolations,
  selectCurationSignals,
  type LiveRule,
  type ViolationRow,
} from '../../src/lib/brandstyle/rule-violation-stats';

/** Zelfde venster als de route: de laatste N generaties, niet N dagen. */
const WINDOW_GENERATIONS = 200;

async function main(): Promise<void> {
  const workspaces = await prisma.workspace.findMany({
    where: { contentFidelityScores: { some: {} } },
    select: { id: true, name: true },
  });

  if (workspaces.length === 0) {
    console.log('Geen workspace met fidelity-scores — niets te aggregeren.');
    return;
  }

  let totalSignals = 0;

  for (const ws of workspaces) {
    const window = await prisma.contentFidelityScore.findMany({
      where: { workspaceId: ws.id },
      select: { id: true },
      orderBy: { scoredAt: 'desc' },
      take: WINDOW_GENERATIONS,
    });
    const generationsTotal = window.length;
    const windowIds = window.map((s) => s.id);

    const [findings, brandRules] = await Promise.all([
      windowIds.length === 0
        ? Promise.resolve([])
        : prisma.brandReviewFinding.findMany({
            where: { workspaceId: ws.id, fidelityScoreId: { in: windowIds } },
            select: { fidelityScoreId: true, evidence: true },
          }),
      prisma.brandRule.findMany({
        where: { workspaceId: ws.id, isActive: true },
        select: { id: true, ruleType: true, pattern: true, severity: true, source: true },
      }),
    ]);

    const rows: ViolationRow[] = [];
    for (const f of findings) {
      const e = (f.evidence ?? null) as Record<string, unknown> | null;
      if (!e || typeof e.ruleId !== 'string') continue;
      rows.push({
        generationId: f.fidelityScoreId as string,
        ruleId: e.ruleId,
        ruleType: typeof e.ruleType === 'string' ? e.ruleType : null,
        pattern: typeof e.pattern === 'string' ? e.pattern : null,
      });
    }

    // Zelfde reverse-index als de route: pattern → bron-term. De sync
    // expandeert stem-varianten, dus zonder deze stap wijst de correctie naar
    // een woord dat niet in de voiceguide staat en faalt de knop gegarandeerd.
    const vg = await prisma.brandVoiceguide.findUnique({
      where: { workspaceId: ws.id },
      select: { wordsWeAvoid: true, vocabularyDont: true, antiPatterns: true },
    });
    const sourceTerms = new Map<string, string>();
    for (const field of ['wordsWeAvoid', 'vocabularyDont', 'antiPatterns'] as const) {
      for (const term of vg?.[field] ?? []) {
        for (const variant of expandStemVariants(term)) {
          if (!sourceTerms.has(variant)) sourceTerms.set(variant, term);
        }
      }
    }

    const liveRules: LiveRule[] = brandRules.map((r) => ({
      id: r.id,
      ruleType: r.ruleType,
      pattern: r.pattern,
      severity: r.severity,
      kind: r.source.startsWith('auto:') ? 'voiceguide-synced' : 'brand-rule-manual',
      sourceTerm: r.source.startsWith('auto:voiceguide.')
        ? sourceTerms.get(r.pattern.toLowerCase())
        : undefined,
    }));

    const all = aggregateViolations(rows, generationsTotal, liveRules);
    const signals = selectCurationSignals(all);
    totalSignals += signals.length;

    console.log(
      `\n${ws.name}  ·  ${generationsTotal} generaties · ${findings.length} findings · ${brandRules.length} levende regels`,
    );
    if (all.length === 0) {
      console.log('  (geen enkele overtreding van een nog bestaande regel)');
      continue;
    }
    for (const s of all.slice(0, 5)) {
      const surfaced = signals.includes(s);
      // Toon expliciet of er een wérkende correctie bij hoort. Een regel
      // waarvan het pattern een stem-variant is (`exclusieve` ← `exclusief`)
      // heeft géén bron-term en zou anders een knop krijgen die altijd faalt.
      const term = s.rule.sourceTerm;
      const action =
        s.rule.kind !== 'voiceguide-synced'
          ? 'eigen CRUD'
          : term
            ? term === s.rule.pattern
              ? 'term ok'
              : `term → "${term}"`
            : 'GEEN ACTIE (bron-term onvindbaar)';
      console.log(
        `  ${surfaced ? '→' : ' '} ${s.rule.pattern.padEnd(18)} ` +
          `${String(Math.round(s.rate * 100)).padStart(3)}%  ` +
          `(${s.generationsHit}/${s.generationsTotal})  ${action}` +
          `${surfaced ? '   ← komt in het paneel' : ''}`,
      );
    }
  }

  console.log(
    totalSignals > 0
      ? `\n✓ ${totalSignals} curatie-suggestie(s) over ${workspaces.length} workspace(s).`
      : '\n✗ Nul suggesties — controleer of de drempel niet te hoog staat voor deze data.',
  );
}

void main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
