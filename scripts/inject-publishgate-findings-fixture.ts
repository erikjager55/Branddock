/**
 * One-shot dev-helper voor Δ-1 Surface E visual smoke.
 *
 * Plakt een synthetische sub-threshold ContentFidelityScore + 5 findings op
 * de meest-recente ContentVersion van de meest-recente Deliverable in LINFI
 * zodat PublishGate's findings-block in de Canvas-Step4Timeline rendert
 * zonder dat je eerst echte content hoeft te genereren + F-VAL te runnen.
 *
 * Print het deliverable-id (en pad) zodat je daar in de browser naartoe
 * kunt navigeren. Reload → 10s staleTime op useContentReadiness, dan zie
 * je het amber findings-block onder de Override-button.
 *
 * Cleanup: verwijdert de geïnjecteerde score + findings via cascade door
 * deze functie nog een keer aan te roepen met `--cleanup` flag, of door
 * de zojuist gemaakte score-id zelf te deleten.
 *
 * Run: DATABASE_URL=... npx tsx scripts/inject-publishgate-findings-fixture.ts
 *      [--cleanup]                    # verwijder eerder geïnjecteerde fixtures
 *      [--workspace-slug=...]         # default: linfi
 *      [--deliverable-id=...]         # target specifieke deliverable; maakt
 *                                       synthetische ContentVersion aan als
 *                                       die nog niet bestaat
 */
import { PrismaClient, Prisma, BrandReviewSeverity, FindingCategory } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const FIXTURE_JUDGE_ID = 'smoke-fixture-surface-e';

async function main(): Promise<void> {
  // Productie-guard — dit script schrijft synthetische ContentVersion +
  // ContentFidelityScore + findings naar de DB. Refuse if NODE_ENV is
  // production OR DATABASE_URL niet naar localhost wijst. Voorkomt dat
  // staging/prod credentials in env-files het pad openen voor data-corruptie.
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run in production (NODE_ENV=production).');
    process.exit(1);
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }
  if (!/(localhost|127\.0\.0\.1|::1)/.test(connectionString)) {
    if (process.argv.includes('--i-know-what-im-doing')) {
      console.warn('Override flag detected — proceeding against non-local DATABASE_URL.');
    } else {
      console.error(
        'Refusing to run against non-local DATABASE_URL. ' +
          'Pass --i-know-what-im-doing to override.',
      );
      process.exit(1);
    }
  }

  const slugFlag = process.argv.find((a) => a.startsWith('--workspace-slug='));
  const slug = slugFlag ? slugFlag.split('=')[1] : 'linfi';
  const deliverableIdFlag = process.argv.find((a) => a.startsWith('--deliverable-id='));
  const targetDeliverableId = deliverableIdFlag ? deliverableIdFlag.split('=')[1] : null;
  const cleanup = process.argv.includes('--cleanup');

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const workspace = await prisma.workspace.findFirst({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!workspace) {
    console.error(`Workspace "${slug}" not found`);
    await prisma.$disconnect();
    process.exit(1);
  }

  if (cleanup) {
    const deleted = await prisma.contentFidelityScore.deleteMany({
      where: { workspaceId: workspace.id, judgeIdentifier: FIXTURE_JUDGE_ID },
    });
    console.log(`Removed ${deleted.count} fixture score(s) from "${workspace.name}"`);
    await prisma.$disconnect();
    return;
  }

  // Targeted mode: --deliverable-id=...  Maakt een synthetische ContentVersion
  // aan als de deliverable er nog geen heeft. Zonder de flag pakt het script
  // alle deliverables in de workspace die al een ContentVersion hebben.
  let candidates: Array<{ id: string; title: string; versions: { id: string }[] }>;

  if (targetDeliverableId) {
    const target = await prisma.deliverable.findFirst({
      where: { id: targetDeliverableId, campaign: { workspaceId: workspace.id } },
      select: {
        id: true,
        title: true,
        versions: { orderBy: { versionNumber: 'desc' }, take: 1, select: { id: true } },
      },
    });
    if (!target) {
      console.error(
        `Deliverable ${targetDeliverableId} not found in workspace "${workspace.name}"`,
      );
      await prisma.$disconnect();
      process.exit(1);
    }
    if (target.versions.length === 0) {
      const created = await prisma.contentVersion.create({
        data: {
          deliverableId: target.id,
          versionNumber: 1,
          contentSnapshot: { synthetic: true, source: 'fixture-injector' },
          createdBy: 'AI',
        },
        select: { id: true },
      });
      console.log(`  + Synthetische ContentVersion ${created.id} aangemaakt`);
      target.versions = [{ id: created.id }];
    }
    candidates = [target];
  } else {
    const recentDeliverables = await prisma.deliverable.findMany({
      where: {
        campaign: { workspaceId: workspace.id },
        versions: { some: {} },
      },
      orderBy: { updatedAt: 'desc' },
      take: 15,
      select: {
        id: true,
        title: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    });
    candidates = recentDeliverables.filter((d) => d.versions.length > 0);
    if (candidates.length === 0) {
      console.error(`No deliverables with content-version in workspace "${workspace.name}"`);
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  const createdScores: { id: string; deliverableTitle: string; deliverableId: string }[] = [];

  for (const deliverable of candidates) {
    const versionId = deliverable.versions[0].id;
    const findingsArr = buildFindings(workspace.id);
    const created = await prisma.contentFidelityScore.create({
      data: {
        workspaceId: workspace.id,
        contentVersionId: versionId,
        judgeIdentifier: FIXTURE_JUDGE_ID,
        compositeScore: 42,
        pillarScores: { style: 40, judge: 50, rules: 35 },
        subCriteriaScores: {},
        ruleViolations: [],
        thresholdMet: false,
        scorerVersion: 'fixture-v1',
        // Mirror runner-contract: aggregate-counter pre-rolled bij create
        // zodat dashboards en find-list views consistent zijn met de runtime.
        findingsCount: findingsArr.length,
        findings: {
          create: findingsArr,
        },
      },
      select: { id: true },
    });
    createdScores.push({
      id: created.id,
      deliverableTitle: deliverable.title,
      deliverableId: deliverable.id,
    });
  }

  console.log(`\n  ✓ ${createdScores.length} fixture(s) geplakt op meest-recente deliverables in "${workspace.name}":`);
  for (const s of createdScores) {
    console.log(`    - ${s.deliverableTitle} (deliverableId=${s.deliverableId}, scoreId=${s.id})`);
  }
  console.log(`\n  Score: 42 (drempel ~70 → blocked) · 5 findings (2 HIGH, 2 MEDIUM, 1 LOW)`);
  console.log(`  Open een van bovenstaande deliverables → Step 4 Planner → reload met Cmd+Shift+R\n`);
  console.log(`  Cleanup later: npx tsx scripts/inject-publishgate-findings-fixture.ts --cleanup\n`);

  await prisma.$disconnect();
}

// Helper voor reusable findings-set tussen meerdere fixture-injecties.
function buildFindings(workspaceId: string) {
  return [
    {
      workspaceId,
      location: 'char 12: "innovatief"',
      severity: BrandReviewSeverity.HIGH,
      category: FindingCategory.VOICE,
      description:
        "'Innovatief' staat in jullie anti-pattern lijst. LINFI communiceert sophistication door te laten zien — vakmanschap, precisiewerk — niet door het te benoemen.",
      suggestion: 'Vervang door "vakkundig" of "verfijnd"',
      evidence: { ruleId: 'heuristic:nl:corporate-fluff:innovatief' } as Prisma.InputJsonValue,
    },
    {
      workspaceId,
      location: 'char 87: "passie"',
      severity: BrandReviewSeverity.HIGH,
      category: FindingCategory.VOICE,
      description:
        "'Passie' is een nietszeggend buzzword dat élk bedrijf claimt. LINFI is stil trots — verankerd in concrete vakmatigheid, niet in vage emotie.",
      suggestion: 'Verwijder of vervang door concrete materiaalspecificiteit',
      evidence: { ruleId: 'heuristic:nl:corporate-fluff:passie' } as Prisma.InputJsonValue,
    },
    {
      workspaceId,
      location: 'char 134: "het beste"',
      severity: BrandReviewSeverity.MEDIUM,
      category: FindingCategory.CLAIMS,
      description:
        "'Het beste' is een vage superlatief zonder bewijs. LINFI maakt zekerheden ('gegarandeerd een eeuwigheid mee') gestaafd in materiaalkennis.",
      suggestion: 'Vervang door specifieke garantie of materiaalclaim',
      evidence: { ruleId: 'heuristic:nl:superlatives:het-beste' } as Prisma.InputJsonValue,
    },
    {
      workspaceId,
      location: 'char 198: "kwaliteit"',
      severity: BrandReviewSeverity.MEDIUM,
      category: FindingCategory.CLAIMS,
      description:
        "'Kwaliteit' alleen is geen claim — het is een woord. LINFI substantieert kwaliteit via zichtbaar vakmanschap en concrete specificaties.",
      suggestion: 'Toon kwaliteit via "tot op de millimeter" of "gehard veiligheidsglas"',
      evidence: { ruleId: 'heuristic:nl:vague-quality:kwaliteit' } as Prisma.InputJsonValue,
    },
    {
      workspaceId,
      location: 'document-level',
      severity: BrandReviewSeverity.LOW,
      category: FindingCategory.STYLE,
      description:
        'Tekst mist de geruststellende cadans van LINFI. Herhaling van kernfrasen ("op maat", "stijlvolle manier") creëert het vertrouwen dat past bij precisiewerk.',
      suggestion: 'Voeg één concrete kernfrase toe die tweemaal terugkomt',
      evidence: Prisma.JsonNull,
    },
  ];
}

main().catch(async (err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
