// =============================================================
// F-VAL judge-kalibratie — modellen-refresh fase 2 (2026-07-21)
//
// Meet de score-shift van pijler 2 (G-Eval rubric-judge) bij de swap:
//   - openai-judge:    gpt-5             → gpt-5.6
//   - anthropic-judge: claude-sonnet-4-6 → claude-sonnet-5
//
// Aanpak: gepaarde meting — identieke rubric-context (zelfde teksten,
// zelfde brand-voice-baseline uit de dev-DB, zelfde detector-output)
// door oude én nieuwe judge. Corpus van 10 vaste teksten die het
// kwaliteitsspectrum dekken (on-brand NL → generieke AI-slop → hype).
//
// Besliskader (rapport docs/reports/model-review-2026-07-21.md):
//   |Δ composite-bijdrage| = 0.45 × |Δ pijler-2|
//   ≤ 2 punten composite-effect → swap zonder drempelwijziging
//   > 2 punten → drempels (75/65) herijken met de gemeten shift
//
// Draaien vanuit de worktree-root:
//   node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/experiments/judge-calibration-2026-07.ts
// =============================================================

import { prisma } from "../../src/lib/prisma";
import { runRubricJudge } from "../../src/lib/brand-fidelity/judge-dispatcher";
import { detectAiTells } from "../../src/lib/brand-fidelity/ai-tell-detector";
import {
  deriveVoiceBaseline1Pager,
  formatVoiceBaseline1Pager,
} from "../../src/lib/brand-fidelity/voice-baseline-1pager";

interface CorpusItem {
  id: string;
  label: string;
  targetWordCount: number;
  text: string;
}

// 10 vaste teksten — spectrum van bewust on-brand tot bewust off-brand.
const CORPUS: CorpusItem[] = [
  {
    id: "onbrand-1",
    label: "on-brand NL (voice-sample-stijl)",
    targetWordCount: 80,
    text: "Generieke AI kent je merk niet. Branddock legt je volledige merk-DNA onder elke uiting en geeft elk resultaat een meetbare merk-check: de F-VAL-score. Negen agents bereiden het werk voor — onderzoek, content, bewaking — en jij keurt goed. In een eerlijke pilotmeting scoorde content via Branddock gemiddeld +7 punten on-brand ten opzichte van vanilla-AI. Geen magie, wel bewijs.",
  },
  {
    id: "onbrand-2",
    label: "on-brand NL (nieuwsbrief-alinea)",
    targetWordCount: 90,
    text: "Deze week ging de merk-check live voor alle pilotklanten. Elke uiting die je genereert krijgt nu direct een score van 0 tot 100, met concrete bevindingen: wat klopt aan je merkstem, en wat niet. Je hoeft niet meer te gokken of een tekst on-brand is — je ziet het. De eerste week leverde een gemiddelde van 78 op over 43 uitingen. Wil je weten waar jouw merk staat? Open het weekrapport in je dashboard en kijk mee.",
  },
  {
    id: "onbrand-3",
    label: "on-brand NL (LinkedIn-post)",
    targetWordCount: 70,
    text: "Marketingteams vragen ons vaak: kan AI onze content schrijven zonder dat alles hetzelfde gaat klinken? Ons antwoord: alleen als je merk het fundament is. Daarom bouwden we geen schrijftool, maar een merk-geheugen. Het verschil meet je per uiting. Gemiddeld +7 punten on-brand in onze pilot — bescheiden, eerlijk, meetbaar. Zo hoort AI-marketing te werken.",
  },
  {
    id: "middel-1",
    label: "competent maar generiek NL",
    targetWordCount: 80,
    text: "AI-tools worden steeds belangrijker voor marketingteams. Met de juiste software kun je sneller content maken en meer kanalen bedienen. Het is daarbij wel belangrijk om op kwaliteit te letten, want niet alle gegenereerde content past bij je organisatie. Kies daarom een oplossing die aansluit bij je werkwijze en zorg voor een goed reviewproces. Zo haal je het maximale uit AI zonder concessies te doen aan je merkidentiteit.",
  },
  {
    id: "middel-2",
    label: "servicetekst neutraal NL",
    targetWordCount: 60,
    text: "U kunt uw abonnement op elk moment aanpassen via de instellingenpagina. Ga naar Instellingen en kies Facturering. Daar ziet u uw huidige bundel, het verbruik van deze maand en de beschikbare upgrades. Wijzigingen gaan direct in. Heeft u vragen over uw factuur? Ons supportteam reageert binnen één werkdag.",
  },
  {
    id: "middel-3",
    label: "Engels competent generiek",
    targetWordCount: 75,
    text: "Consistency is one of the biggest challenges for growing marketing teams. As output scales across channels, keeping every piece aligned with your brand becomes harder. A shared foundation of guidelines, tone rules, and approved vocabulary helps teams move faster without losing identity. The best systems make this foundation available where work actually happens, so writers do not have to guess what is on-brand.",
  },
  {
    id: "slop-1",
    label: "AI-slop met tells NL",
    targetWordCount: 80,
    text: "In het huidige digitale landschap is het van cruciaal belang om je merk naar een hoger niveau te tillen. Ontgrendel het volledige potentieel van jouw content met onze baanbrekende oplossing! Of je nu een doorgewinterde professional bent of net begint: onze naadloze integratie zorgt voor een revolutionaire transformatie van je workflow. Kortom, dit is dé game-changer waar je op hebt gewacht. Mis deze kans niet en begin vandaag nog aan jouw reis naar succes!",
  },
  {
    id: "slop-2",
    label: "AI-slop Engels met tells",
    targetWordCount: 80,
    text: "In today's fast-paced digital landscape, it's more important than ever to unlock the full potential of your brand. Our cutting-edge, AI-powered platform seamlessly integrates with your workflow, empowering you to take your content to the next level. Whether you're a seasoned marketer or just starting your journey, our game-changing solution delivers unparalleled results. Don't miss out — dive in today and revolutionize the way you create content forever!",
  },
  {
    id: "offbrand-1",
    label: "hype/anti-patroon (verboden claims)",
    targetWordCount: 60,
    text: "REVOLUTIONAIR! Zet je marketing op autopilot en kijk NOOIT meer om!!! Onze magische AI 10x't je output gegarandeerd — moeiteloos, zonder na te denken. Vergeet reviews, vergeet controle: de machine regelt alles. Dit is disruptie zoals je nog nooit hebt gezien. Koop NU en word morgen marktleider!",
  },
  {
    id: "offbrand-2",
    label: "verkeerde toon (angst-verkoop)",
    targetWordCount: 70,
    text: "Je merk gaat kapot zonder ons. Elke dag dat je wacht, verwatert je identiteit verder en lachen je concurrenten harder. Straks herkent niemand je bedrijf nog en is het te laat. Wees niet naïef: zonder onze bescherming is je merk binnen een jaar waardeloos. Teken vandaag nog, voordat de schade onomkeerbaar wordt.",
  },
];

const JUDGE_PAIRS = [
  { family: "openai", old: { provider: "openai" as const, model: "gpt-5" }, nieuw: { provider: "openai" as const, model: "gpt-5.6" } },
  { family: "anthropic", old: { provider: "anthropic" as const, model: "claude-sonnet-4-6" }, nieuw: { provider: "anthropic" as const, model: "claude-sonnet-5" } },
];

async function main() {
  console.log("# F-VAL judge-kalibratie — oud vs nieuw\n");

  const ws = await prisma.workspace.findFirst({ where: { slug: "branddock-hq" } });
  if (!ws) throw new Error("branddock-hq workspace ontbreekt op dev — draai seed-branddock-brand.ts eerst");
  const voiceguide = await prisma.brandVoiceguide.findUnique({ where: { workspaceId: ws.id } });
  if (!voiceguide) throw new Error("voiceguide ontbreekt");

  const voiceBaseline1Pager = formatVoiceBaseline1Pager(deriveVoiceBaseline1Pager(voiceguide));
  const brandVoiceSummary = (voiceguide.voiceDescription ?? "").slice(0, 300);

  const rows: Array<{ text: string; family: string; oldScore: number; newScore: number }> = [];

  for (const pair of JUDGE_PAIRS) {
    for (const item of CORPUS) {
      const detectorResult = detectAiTells(item.text);
      const ctx = {
        contentText: item.text,
        brandName: "Branddock",
        brandVoiceSummary,
        voiceBaseline1Pager,
        detectorResult,
      };
      // generatorProvider is willekeurig — judgeOverride bepaalt de judge.
      const [oldRes, newRes] = await Promise.all([
        runRubricJudge(ctx, { generatorProvider: "google", judgeOverride: pair.old, targetWordCount: item.targetWordCount }),
        runRubricJudge(ctx, { generatorProvider: "google", judgeOverride: pair.nieuw, targetWordCount: item.targetWordCount }),
      ]);
      rows.push({ text: item.id, family: pair.family, oldScore: oldRes.finalComposite, newScore: newRes.finalComposite });
      console.log(
        `${pair.family.padEnd(9)} ${item.id.padEnd(11)} oud=${String(oldRes.finalComposite).padStart(3)} nieuw=${String(newRes.finalComposite).padStart(3)} Δ=${(newRes.finalComposite - oldRes.finalComposite).toFixed(0).padStart(4)}  (${item.label})`,
      );
    }
  }

  console.log("\n## Samenvatting per judge-familie");
  for (const fam of ["openai", "anthropic"]) {
    const sel = rows.filter((r) => r.family === fam);
    const deltas = sel.map((r) => r.newScore - r.oldScore);
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const absMax = Math.max(...deltas.map(Math.abs));
    const oldMean = sel.reduce((a, r) => a + r.oldScore, 0) / sel.length;
    const newMean = sel.reduce((a, r) => a + r.newScore, 0) / sel.length;
    console.log(
      `${fam.padEnd(9)} gem-oud=${oldMean.toFixed(1)} gem-nieuw=${newMean.toFixed(1)} Δgem=${mean.toFixed(1)} |Δ|max=${absMax.toFixed(0)} → composite-effect=${(0.45 * mean).toFixed(1)} punten`,
    );
  }
  console.log("\nBesliskader: |composite-effect| ≤ 2 → swap zonder drempelwijziging.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
