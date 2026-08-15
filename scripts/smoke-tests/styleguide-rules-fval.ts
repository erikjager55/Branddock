/**
 * DB-smoke voor de StyleguideRule → F-VAL doorvoer (end-to-end).
 *
 * Bouwt een volledig eigen scratch-organisatie + workspace + styleguide, zet
 * daar vier regels op (drie tekst-checkbaar, één visueel), en scoort de
 * A2-output uit de Stap-0-spike via dezelfde runner die de MCP-tool
 * `score_against_brand` en `POST /api/v1/score` gebruiken.
 *
 * Bewijst het punt van de spike: dezelfde tekst die zonder regels ~geen
 * aftrek kreeg, zakt mét regels aantoonbaar — en de visuele regel raakt de
 * tekst-pijler niet.
 *
 * Hermetisch: raakt geen bestaande workspace aan en ruimt zichzelf op
 * (ook bij een fout, via finally).
 *
 * Run: DATABASE_URL=postgresql://... npx tsx scripts/smoke-tests/styleguide-rules-fval.ts
 */
import { prisma } from '../../src/lib/prisma';
import {
  clearStyleguideRuleCache,
  evaluateStyleguideRules,
} from '../../src/lib/brand-fidelity/styleguide-rule-compiler';
import { runFidelityForExternalContent } from '../../src/lib/brand-fidelity/external-content-runner';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

/** Conditie-A-output uit spike §4: emoji, wij-vorm en superlatief-frame. */
const DIRTY = [
  'Wat een wedstrijd 💪⚽ Samen zijn we DTS, dé voetbalfamilie van Ede!',
  'Wij spelen al sinds 1935 op Sportpark Peppelensteeg en ons eerste elftal',
  'liet gisteren zien waar we voor staan. Onze spelers gaven alles, en samen',
  'met het publiek maakten we er een onvergetelijke middag van. Kom ook naar',
  'de volgende thuiswedstrijd en beleef dé sfeer van onze club.',
].join(' ');

const SUFFIX = `smoke-${process.pid}`;

async function main(): Promise<void> {
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) {
    console.error('Geen enkele User in de database — smoke kan geen styleguide aanmaken.');
    process.exit(1);
  }

  let workspaceId: string | null = null;
  let organizationId: string | null = null;

  try {
    const org = await prisma.organization.create({
      data: { name: `Styleguide-rules ${SUFFIX}`, slug: `styleguide-rules-${SUFFIX}` },
      select: { id: true },
    });
    organizationId = org.id;

    const workspace = await prisma.workspace.create({
      data: {
        name: `Styleguide-rules ${SUFFIX}`,
        slug: `styleguide-rules-ws-${SUFFIX}`,
        contentLanguage: 'nl',
        organizationId: org.id,
      },
      select: { id: true },
    });
    workspaceId = workspace.id;

    const styleguide = await prisma.brandStyleguide.create({
      data: {
        workspaceId: workspace.id,
        createdById: user.id,
        sourceType: 'URL',
        published: true,
        colorsSavedForAi: true,
        logoSavedForAi: true,
        imagerySavedForAi: true,
        designLanguageSavedForAi: true,
      },
      select: { id: true },
    });

    console.log('\n1. Zonder regels');

    clearStyleguideRuleCache(workspace.id);
    const before = await evaluateStyleguideRules(workspace.id, DIRTY);
    assert('lege styleguide levert 0 violations', before.violations.length === 0);
    assert('lege styleguide telt 0 evaluated', before.evaluated === 0);

    const baseline = await runFidelityForExternalContent({
      workspaceId: workspace.id,
      contentText: DIRTY,
      sourceType: 'paste',
      runJudge: false,
    });
    const baselineScore = baseline.result.compositeScore;
    const baselineRuleScore = baseline.result.pillars.rules.result.rules.ruleScore;
    console.log(`     baseline: composiet ${baselineScore}, ruleScore ${baselineRuleScore}`);

    console.log('\n2. Met regels');

    await prisma.styleguideRule.createMany({
      data: [
        {
          styleguideId: styleguide.id,
          section: 'voice',
          kind: 'HARD_RULE',
          severity: 'BLOCKING',
          source: 'user',
          title: 'Geen emoji in redactionele copy',
          constraint: { modality: 'text', check: 'no-emoji', derivedBy: 'user' },
        },
        {
          styleguideId: styleguide.id,
          section: 'voice',
          kind: 'HARD_RULE',
          severity: 'ADVISORY',
          source: 'user',
          title: 'Derde persoon — geen wij-vorm in redactionele copy',
          constraint: {
            modality: 'text',
            check: 'forbidden-pattern',
            pattern: '\\b(wij|we|ons|onze)\\b',
            derivedBy: 'user',
          },
        },
        {
          styleguideId: styleguide.id,
          section: 'voice',
          kind: 'HARD_RULE',
          severity: 'ADVISORY',
          source: 'user',
          title: 'Geen superlatieven of marketing-frames',
          constraint: {
            modality: 'text',
            check: 'forbidden-words',
            words: ['dé', 'onvergetelijke', 'revolutionair'],
            derivedBy: 'user',
          },
        },
        {
          styleguideId: styleguide.id,
          section: 'design-language',
          kind: 'DONT',
          severity: 'ADVISORY',
          source: 'scraped',
          title: 'Geen gradients in UI-chrome',
          constraint: { modality: 'visual', property: 'gradient', allowed: false },
        },
      ],
    });

    clearStyleguideRuleCache(workspace.id);
    const after = await evaluateStyleguideRules(workspace.id, DIRTY);
    console.log(
      `     evaluated ${after.evaluated}, violations ${after.violations.length}, ` +
        `visueel overgeslagen ${after.skippedVisual}`,
    );

    assert('drie tekstregels compileren', after.evaluated === 3, `${after.evaluated}`);
    assert('visuele regel wordt overgeslagen', after.skippedVisual === 1);
    assert(
      'visuele regel levert geen tekst-violation',
      after.violations.every((v) => !v.ruleId.includes('design-language')),
    );
    assert('emoji worden gevangen', after.violations.filter((v) => v.snippet === '💪').length === 1);
    assert(
      'wij-vorm wordt gevangen',
      after.violations.some((v) => /^(wij|we|ons|onze)$/i.test(v.snippet)),
    );
    assert(
      'superlatief met diakriet wordt gevangen',
      after.violations.some((v) => v.snippet.toLowerCase() === 'dé'),
    );
    assert(
      'BLOCKING-regel levert severity error',
      after.violations.some((v) => v.severity === 'error'),
    );
    assert(
      'alle violations dragen de styleguide-prefix',
      after.violations.every((v) => v.ruleId.startsWith('styleguide:')),
    );

    console.log('\n3. Effect op de composietscore');

    const scored = await runFidelityForExternalContent({
      workspaceId: workspace.id,
      contentText: DIRTY,
      sourceType: 'paste',
      runJudge: false,
    });
    const scoredRules = scored.result.pillars.rules.result.rules;
    console.log(
      `     met regels: composiet ${scored.result.compositeScore}, ruleScore ${scoredRules.ruleScore}, ` +
        `rulesEvaluated ${scoredRules.rulesEvaluated}`,
    );

    assert(
      'rulesEvaluated telt de styleguide-regels mee',
      scoredRules.rulesEvaluated >= 3,
      `${scoredRules.rulesEvaluated}`,
    );
    assert(
      'ruleScore zakt onder de baseline',
      scoredRules.ruleScore < baselineRuleScore,
      `${scoredRules.ruleScore} vs ${baselineRuleScore}`,
    );
    assert(
      'composietscore zakt',
      scored.result.compositeScore < baselineScore,
      `${scored.result.compositeScore} vs ${baselineScore}`,
    );
    assert(
      'violations landen in de opgeslagen payload',
      scoredRules.violations.some((v) => v.ruleId.startsWith('styleguide:')),
    );
    assert('findings zijn gepersisteerd', scored.findingsCount > 0, `${scored.findingsCount}`);

    console.log('\n4. Cache-invalidatie');

    await prisma.styleguideRule.deleteMany({
      where: { styleguideId: styleguide.id, section: 'voice' },
    });
    const stale = await evaluateStyleguideRules(workspace.id, DIRTY);
    assert(
      'zonder clear blijft de oude compile staan (60s TTL)',
      stale.evaluated === 3,
      `${stale.evaluated}`,
    );
    clearStyleguideRuleCache(workspace.id);
    const fresh = await evaluateStyleguideRules(workspace.id, DIRTY);
    assert('na clear is de regelset leeg', fresh.evaluated === 0 && fresh.violations.length === 0);
  } finally {
    // Cascade ruimt styleguide, regels, review-logs en findings mee op.
    if (workspaceId) await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    if (organizationId)
      await prisma.organization.delete({ where: { id: organizationId } }).catch(() => {});
    clearStyleguideRuleCache();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

void main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
