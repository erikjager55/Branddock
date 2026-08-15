/**
 * Verificatie van de Stap-0-spike-bevinding, tegen echte DTS Ede-data.
 *
 * De spike (docs/specs/spike-stap0-brand-manifest-dts-ede.md §4) mat dat
 * conditie-A-output 4+ merkboek-regels overtrad en tóch 80+ scoorde, omdat
 * `rulesEvaluated: 0` was. Dit script toont dat die overtredingen nu wél
 * gevangen worden — met regels die uit DTS Ede's *eigen* schrijfrichtlijnen
 * zijn afgeleid, niet met handmatig overgetypte merkboek-regels.
 *
 * Leest alleen; schrijft niets. De styleguide van DTS Ede hoeft niet
 * gepubliceerd te zijn — de compilatie draait hier op de pure laag.
 *
 * Run: DATABASE_URL=... ANTHROPIC_API_KEY=... npx tsx scripts/verify-spike-rules-dts.ts
 */
import { prisma } from '../src/lib/prisma';
import { syncStructuredVoiceRules } from '../src/lib/brandstyle/rule-structurer';
import {
  compileStyleguideRules,
  evaluateCompiledStyleguideRules,
  type StyleguideRuleInput,
} from '../src/lib/brand-fidelity/styleguide-rule-checks';

const workspaceArg = process.argv.find((a) => a.startsWith('--workspace='));
const WORKSPACE = workspaceArg ? workspaceArg.split('=')[1] : 'DTS Ede';

/** De twee conditie-A-outputs uit spike §4 die overtredingen bevatten. */
const SAMPLES: Array<{ label: string; text: string }> = [
  {
    label: 'A1 — LP-hero (superlatief-frame + wij-vorm)',
    text:
      'Word onderdeel van dé voetbalfamilie van Ede. Bij DTS Ede zijn wij al sinds 1935 ' +
      'de meest verbonden club van Nederland, waar iedereen erbij hoort. Onze leden weten ' +
      'het al: samen bereiken we meer dan alleen. Sluit je vandaag nog aan bij ons en ' +
      'ontdek waarom wij de warmste vereniging van de regio zijn.',
  },
  {
    label: 'A2 — social wedstrijdverslag (emoji + wij-vorm)',
    text:
      'Wat een wedstrijd 💪⚽ Samen zijn we DTS, dé voetbalfamilie van Ede! Wij spelen al ' +
      'sinds 1935 op Sportpark Peppelensteeg en ons eerste elftal liet gisteren zien waar ' +
      'we voor staan. Onze spelers gaven alles.',
  },
  {
    label: 'B — manifest-conditie (schoon)',
    text:
      'DTS Ede won gisteren met 2-1 van DOS Kampen. De ploeg kwam voor rust op voorsprong ' +
      'via een kopbal uit een hoekschop. Na de pauze maakte de bezoeker gelijk. In de ' +
      'slotfase viel de beslissende treffer. De zegereeks staat nu op vier wedstrijden.',
  },
];

async function main(): Promise<void> {
  const workspace = await prisma.workspace.findFirst({
    where: { name: { contains: WORKSPACE, mode: 'insensitive' } },
    select: { id: true, name: true, contentLanguage: true },
  });
  if (!workspace) {
    console.error(`Workspace met '${WORKSPACE}' in de naam niet gevonden.`);
    process.exit(1);
  }

  const styleguide = await prisma.brandStyleguide.findUnique({
    where: { workspaceId: workspace.id },
    select: { published: true },
  });

  console.log(`Workspace: ${workspace.name} (published=${styleguide?.published ?? 'geen styleguide'})\n`);

  const sync = await syncStructuredVoiceRules(workspace.id, { dryRun: true });
  if (sync.status !== 'ok') {
    console.error(`Kan geen regels afleiden: ${sync.status}`);
    process.exit(1);
  }

  console.log(
    `${sync.proposals.length} regel(s) afgeleid uit de eigen schrijfrichtlijnen ` +
      `[taal ${sync.language} via ${sync.localeSource}]:`,
  );
  for (const p of sync.proposals) {
    console.log(`  • ${p.title} — ${JSON.stringify(p.constraint)}`);
  }

  // Met --language=nl toon je wat dezelfde regels doen als de taal wél klopt.
  // Nuttig bij een workspace waarvan contentLanguage niet overeenkomt met de
  // taal waarin het merk daadwerkelijk schrijft.
  const languageOverride = process.argv
    .find((a) => a.startsWith('--language='))
    ?.split('=')[1];
  if (languageOverride) {
    console.log(`\n(taal-override actief: ${languageOverride})`);
  }

  const rules: StyleguideRuleInput[] = sync.proposals.map((p, i) => ({
    id: `derived-${i}`,
    section: 'voice',
    kind: 'HARD_RULE',
    severity: 'ADVISORY',
    title: p.title,
    description: null,
    constraint:
      languageOverride && p.constraint.check === 'forbidden-pronouns'
        ? { ...p.constraint, language: languageOverride }
        : p.constraint,
  }));
  const compiled = compileStyleguideRules(rules);
  console.log(`\n${compiled.compiled.length} regel(s) compileren tot een tekst-check.\n`);

  for (const sample of SAMPLES) {
    const violations = evaluateCompiledStyleguideRules(sample.text, compiled.compiled);
    console.log(`${sample.label}: ${violations.length} overtreding(en)`);
    const perRule = new Map<string, string[]>();
    for (const v of violations) {
      const list = perRule.get(v.message) ?? [];
      list.push(v.snippet || '(document)');
      perRule.set(v.message, list);
    }
    for (const [message, snippets] of perRule) {
      console.log(`   - ${message}: ${snippets.slice(0, 8).join(', ')}`);
    }
    console.log('');
  }

  if (styleguide && !styleguide.published) {
    console.log(
      '⚠️  Deze styleguide is niet gepubliceerd — in de echte scoring tellen de regels ' +
        'pas mee na finalize. Bovenstaande draait op de pure compile-laag.',
    );
  }
}

void main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
