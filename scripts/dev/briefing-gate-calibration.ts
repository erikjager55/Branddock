/**
 * briefing-gate-calibration — meet de campagnewizard-briefinggate.
 *
 * Aanleiding (tasks/campagne-wizard-e2e-restscope.md): de e2e-sweep van 15-08 liep
 * vast op de gate met een RIJK ingevulde briefing die 68 scoorde tegen een drempel
 * van 80. De vraag is niet "hoe kom ik langs de poort" maar "klopt de poort".
 *
 * Wat dit meet: `validateBriefing()` — de échte productie-call (Gemini Flash,
 * `buildBriefingValidationPrompt`) — over een reeks briefings van kaal tot zeer rijk,
 * tegen een workspace met volledig merk-DNA. Per run: overallScore, isComplete, en
 * welke gaps de score omlaag trekken.
 *
 * ⚠️ Kost echte AI-calls (~7 × Gemini Flash). Draai bewust.
 *
 * Run:
 *   node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *     scripts/dev/briefing-gate-calibration.ts [workspaceNaamBevat]
 */

import { prisma } from '@/lib/prisma';
import { validateBriefing } from '@/lib/campaigns/strategy-chain';
import type { CampaignBriefing } from '@/lib/campaigns/strategy-blueprint.types';

/** De drempel die `wizard-steps.ts:75` afdwingt. */
const UI_GATE = 80;
/** De drempel die de PROMPT het model meegeeft voor `isComplete`. */
const PROMPT_COMPLETE = 70;

interface Case {
  label: string;
  /** Hoe een mens deze briefing zou omschrijven. */
  human: string;
  briefing: CampaignBriefing;
}

const CASES: Case[] = [
  {
    label: '1-leeg',
    human: 'niets ingevuld',
    briefing: {},
  },
  {
    label: '2-minimaal',
    human: 'één zin per veld, zoals een gehaaste gebruiker',
    briefing: {
      occasion: 'We willen meer naamsbekendheid.',
      audienceObjective: 'Mensen moeten ons kennen.',
      coreMessage: 'Wij zijn goed in servetten.',
    },
  },
  {
    label: '3-redelijk',
    human: 'alle velden kort maar concreet ingevuld',
    briefing: {
      occasion: 'Het terrasseizoen begint in april; horeca bestelt dan hun textiel voor de zomer.',
      audienceObjective:
        'Horeca-eigenaren moeten begrijpen dat linnen servetten goedkoper uitvallen dan wegwerp, zich professioneel voelen bij de keuze, en een offerte aanvragen.',
      coreMessage: 'Linnen servetten kosten per gedekt couvert minder dan wegwerp — en zien er beter uit.',
      tonePreference: 'Nuchter en feitelijk, geen superlatieven.',
      constraints: 'Geen prijzen noemen; verwijzen naar de offertepagina.',
    },
  },
  {
    label: '4-rijk',
    human: 'wat de e2e-sweep gebruikte: alle velden uitgebreid',
    briefing: {
      occasion:
        'Start van het terrasseizoen (april). Horeca-ondernemers plannen in maart hun textielbudget voor de zomer. Vorig jaar liepen we deze piek mis omdat we pas in mei zichtbaar waren.',
      audienceObjective:
        'THINK: linnen is per couvert goedkoper dan wegwerp én duurzamer. FEEL: professioneel en verantwoord — dit past bij het niveau van mijn zaak. DO: offerte aanvragen via de site, of bellen voor een proefpakket.',
      coreMessage:
        'Linnen servetten kosten per gedekt couvert minder dan wegwerp, gaan 200+ wasbeurten mee, en tillen de tafelpresentatie zichtbaar op.',
      tonePreference:
        'Nuchter, feitelijk, vakmanschap-gedreven. Geen superlatieven, geen uitroeptekens. Cijfers waar mogelijk. Aansluiten op de toon van een leverancier die de horeca kent.',
      constraints:
        'Geen concrete prijzen in de uiting (die verschillen per volume) — altijd doorverwijzen naar de offertepagina. Duurzaamheidsclaims alleen met onderbouwing. Niet vergelijken met concurrenten bij naam.',
    },
  },
  {
    label: '5-rijk+doelgroep',
    human: 'als 4, plus expliciete doelgroep en meetbaar doel',
    briefing: {
      occasion:
        'Start van het terrasseizoen (april). Horeca-ondernemers plannen in maart hun textielbudget. Vorig jaar misten we deze piek doordat we pas in mei zichtbaar waren; dit jaar starten we 6 weken eerder.',
      audienceObjective:
        'Doelgroep: eigenaren van restaurants met 40-120 couverts in de Randstad, die nu wegwerp gebruiken. THINK: linnen is per couvert goedkoper dan wegwerp. FEEL: dit past bij het niveau van mijn zaak. DO: offerte aanvragen of proefpakket bestellen. Meetbaar doel: 40 offerteaanvragen in 8 weken.',
      coreMessage:
        'Linnen servetten kosten per gedekt couvert minder dan wegwerp, gaan 200+ wasbeurten mee, en tillen de tafelpresentatie zichtbaar op.',
      tonePreference:
        'Nuchter, feitelijk, vakmanschap-gedreven. Geen superlatieven of uitroeptekens. Cijfers waar mogelijk. De toon van een leverancier die de horeca van binnenuit kent.',
      constraints:
        'Geen concrete prijzen (verschillen per volume) — doorverwijzen naar de offertepagina. Duurzaamheidsclaims alleen met onderbouwing. Concurrenten niet bij naam noemen. Beeldmateriaal moet echte tafels tonen, geen stockfoto-restaurants.',
    },
  },
  {
    label: '6-zeer-rijk',
    human: 'als 5, plus kanalen, timing, bewijs en wat we NIET doen',
    briefing: {
      occasion:
        'Start terrasseizoen (april); horeca plant textielbudget in maart. Vorig jaar piek gemist door late zichtbaarheid — dit jaar 6 weken eerder starten. Aanvullende trigger: de gemeentelijke wegwerpplastic-regels per 1 juli maken het gesprek urgenter.',
      audienceObjective:
        'Doelgroep: eigenaren van restaurants met 40-120 couverts in de Randstad die nu wegwerp gebruiken, plus hun bedrijfsleiders (mede-beslissers). THINK: linnen is per couvert goedkoper dan wegwerp én ik loop straks tegen regelgeving aan. FEEL: dit past bij het niveau van mijn zaak; ik wil niet de laatste zijn. DO: offerte aanvragen of proefpakket bestellen. Meetbaar: 40 offerteaanvragen in 8 weken, 15% naar proefpakket.',
      coreMessage:
        'Linnen servetten kosten per gedekt couvert minder dan wegwerp, gaan 200+ wasbeurten mee, en tillen de tafelpresentatie zichtbaar op — met de wegwerpregels van juli in het vooruitzicht is het nu het moment.',
      tonePreference:
        'Nuchter, feitelijk, vakmanschap-gedreven. Geen superlatieven of uitroeptekens. Cijfers waar mogelijk. De toon van een leverancier die de horeca van binnenuit kent — collegiaal, niet verkoperig.',
      constraints:
        'Kanalen: LinkedIn (eigenaren), e-mail naar bestaande relaties, één long-form pagina als anker. Timing: start 1 maart, piek half maart. Bewijs dat we mogen gebruiken: 200+ wasbeurten (eigen test), de casus van Restaurant De Lindenhof (6 uur/week bespaard, met toestemming). NIET doen: prijzen noemen (verschillen per volume), concurrenten bij naam, stockfoto-restaurants, duurzaamheidsclaims zonder onderbouwing.',
    },
  },
  {
    label: '7-overcompleet',
    human: 'alles van 6 plus een uitgeschreven achtergrondverhaal — test of "meer" nog helpt',
    briefing: {
      occasion:
        'Start terrasseizoen (april); horeca plant textielbudget in maart. Vorig jaar piek gemist door late zichtbaarheid — dit jaar 6 weken eerder. Extra trigger: gemeentelijke wegwerpplastic-regels per 1 juli. Achtergrond: onze omzet uit horeca daalde 12% in 2025 doordat twee grote afnemers overstapten op wegwerp tijdens de kostenpiek; uit nagesprekken bleek dat zij de kosten per couvert nooit hebben doorgerekend, alleen de inkoopprijs per stuk vergeleken. Die rekenfout is de kern van deze campagne.',
      audienceObjective:
        'Doelgroep: eigenaren van restaurants met 40-120 couverts in de Randstad die nu wegwerp gebruiken, plus bedrijfsleiders als mede-beslissers. THINK: ik heb de verkeerde som gemaakt — per couvert is linnen goedkoper, en de regels van juli komen eraan. FEEL: dit past bij het niveau van mijn zaak; ik wil niet de laatste zijn die overstapt. DO: offerte aanvragen of proefpakket bestellen. Meetbaar: 40 offerteaanvragen in 8 weken, 15% doorstroom naar proefpakket, 6 nieuwe contracten.',
      coreMessage:
        'De meeste zaken vergelijken de inkoopprijs per servet. Reken je per gedekt couvert, dan is linnen goedkoper — en met de wegwerpregels van juli in het vooruitzicht is het nu het moment om die som opnieuw te maken.',
      tonePreference:
        'Nuchter, feitelijk, vakmanschap-gedreven. Geen superlatieven of uitroeptekens. Cijfers waar mogelijk. Collegiaal, niet verkoperig — de toon van een leverancier die de horeca van binnenuit kent. Nederlands, u-vorm.',
      constraints:
        'Kanalen: LinkedIn (eigenaren), e-mail naar bestaande relaties, één long-form pagina als anker, plus een rekenhulp-module. Timing: start 1 maart, piek half maart, uitloop tot eind april. Bewijs: 200+ wasbeurten (eigen test), casus Restaurant De Lindenhof (6 uur/week bespaard, toestemming geregeld), doorrekening per couvert (eigen model, controleerbaar). NIET doen: prijzen noemen (verschillen per volume), concurrenten bij naam, stockfoto-restaurants, duurzaamheidsclaims zonder onderbouwing, geen druk-taal ("laatste kans", "mis dit niet").',
    },
  },
];

async function main() {
  const nameFilter = process.argv[2] ?? 'Napking';
  const ws = await prisma.workspace.findFirst({
    where: { name: { contains: nameFilter, mode: 'insensitive' } },
    select: { id: true, name: true, contentLanguage: true },
  });
  if (!ws) {
    console.error(`Geen workspace gevonden die "${nameFilter}" bevat.`);
    process.exit(1);
  }

  console.log(`\nWorkspace: ${ws.name} (${ws.contentLanguage})`);
  console.log(`UI-gate: >= ${UI_GATE}   ·   prompt zegt isComplete vanaf ${PROMPT_COMPLETE}\n`);
  console.log('case                 score  isComplete  gate   gaps (crit/high/med/low)');
  console.log('─'.repeat(78));

  const rows: Array<{ label: string; score: number; complete: boolean; passes: boolean; gaps: string }> = [];

  for (const c of CASES) {
    let score = -1;
    let complete = false;
    let gapSummary = '—';
    try {
      const result = await validateBriefing({
        workspaceId: ws.id,
        wizardContext: {
          campaignName: 'Terrasseizoen 2026',
          campaignDescription: 'Campagne rond de start van het terrasseizoen.',
          campaignGoalType: 'LEAD_GENERATION',
          briefing: c.briefing,
        } as never,
      });
      score = result.overallScore;
      complete = result.isComplete;
      const bySeverity: Record<string, number> = {};
      for (const g of result.gaps ?? []) {
        const sev = String((g as { severity?: string }).severity ?? 'unknown');
        bySeverity[sev] = (bySeverity[sev] ?? 0) + 1;
      }
      gapSummary =
        Object.keys(bySeverity).length > 0
          ? Object.entries(bySeverity).map(([k, v]) => `${k}:${v}`).join(' ')
          : 'geen';
    } catch (err) {
      gapSummary = `FOUT: ${err instanceof Error ? err.message.slice(0, 40) : String(err)}`;
    }

    const passes = score >= UI_GATE;
    rows.push({ label: c.label, score, complete, passes, gaps: gapSummary });
    console.log(
      `${c.label.padEnd(20)} ${String(score).padStart(5)}  ${String(complete).padEnd(10)}  ` +
        `${(passes ? 'DOOR' : 'STOP').padEnd(5)}  ${gapSummary}`,
    );
  }

  // ── Analyse ──────────────────────────────────────────────
  console.log('\n' + '─'.repeat(78));
  const blockedButComplete = rows.filter((r) => r.complete && !r.passes);
  const best = rows.reduce((a, b) => (b.score > a.score ? b : a));

  console.log(`Hoogste score: ${best.score} (${best.label})`);
  console.log(`Haalt iets de UI-gate van ${UI_GATE}? ${rows.some((r) => r.passes) ? 'ja' : 'NEE'}`);
  if (blockedButComplete.length > 0) {
    console.log(
      `\n⚠️  ${blockedButComplete.length} briefing(s) die het MODEL compleet noemt (isComplete=true,` +
        ` dus >= ${PROMPT_COMPLETE}) worden door de UI-gate van ${UI_GATE} alsnog tegengehouden:`,
    );
    for (const r of blockedButComplete) console.log(`     ${r.label} — score ${r.score}`);
    console.log(
      '\n   Dat is geen strenge gate maar een INCONSISTENTE: de rubric in de prompt en de\n' +
        '   drempel in wizard-steps.ts:75 hanteren een ander getal.',
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
