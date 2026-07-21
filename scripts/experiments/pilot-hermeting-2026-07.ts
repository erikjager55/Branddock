// =============================================================
// Pilot-claim hermeting — 2026-07-21 (go Erik: "doe de hermeting")
//
// Meet de Branddock-vs-vanilla on-brand-gap opnieuw met de gemoderniseerde
// stack: Branddock-kant op claude-opus-4-8 (canvas-default) mét
// brand-voice-directive; vanilla-kant op gpt-5.6 (nieuwe baseline) én
// gpt-4o (oude baseline, ter referentie — isoleert hoeveel van de
// gap-verschuiving door het betere vanilla-model komt).
//
// Methodologie (spiegelt de originele pilotmeting):
//  - Workspace: Better brands op dev (rijk merk-DNA + voiceguide-centroid)
//  - 3 content-types × 2 briefing-condities (rijk / mager)
//  - Identieke user-prompt per cel voor alle kanten; alleen de system-prompt
//    verschilt (BVD vs. vanilla "just write good content")
//  - Symmetrische scoring via computeFidelityScore (F-VAL composite, nieuwe
//    judges, cross-family per generator-familie), targetWordCount = werkelijke
//    lengte per output (length-control geneutraliseerd)
//
// Draaien vanuit de worktree-root:
//   node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/experiments/pilot-hermeting-2026-07.ts
// =============================================================

import { prisma } from "../../src/lib/prisma";
import { generateVanillaBaseline } from "../../src/lib/brand-fidelity/vanilla-baseline";
import { computeFidelityScore } from "../../src/lib/brand-fidelity/composition-engine";
import { fetchVoiceguideCentroid } from "../../src/lib/brand-fidelity/voice-similarity";
import {
  deriveVoiceBaseline1Pager,
  formatVoiceBaseline1Pager,
} from "../../src/lib/brand-fidelity/voice-baseline-1pager";
import { buildBrandVoiceDirective } from "../../src/lib/studio/brand-voice-directive";

const WORKSPACE_ID = "cmnomsobx009q44msn0gpw7vb"; // Better brands (dev)
const BRAND_NAME = "Better brands";
const BRANDDOCK_MODEL = "claude-opus-4-8"; // canvas-text-generate default

interface Cell {
  contentTypeId: string;
  briefing: "rijk" | "mager";
  objective: string;
  keyMessage?: string;
  toneDirection?: string;
  callToAction?: string;
  contentOutline?: string[];
}

const CELLS: Cell[] = [
  {
    contentTypeId: "newsletter",
    briefing: "rijk",
    objective:
      "Bestaande relaties van Better Brands informeren over hoe je purpose operationeel maakt met meetbare cases, en hen activeren om een strategiegesprek te plannen.",
    keyMessage: "Purpose zonder bewijs is greenwashing. Better Brands maakt merkstrategie operationeel met meetbare resultaten.",
    toneDirection: "Strategisch maar menselijk. Confident zonder arrogant.",
    callToAction: "Plan een gesprek over hoe wij jouw merkstrategie operationeel maken.",
    contentOutline: ["Waarom purpose-claims sneuvelen", "Onze 3-laags bewijsmethode", "Mini-case", "Uitnodiging"],
  },
  {
    contentTypeId: "newsletter",
    briefing: "mager",
    objective: "Schrijf een nieuwsbrief over het operationeel maken van merkstrategie.",
  },
  {
    contentTypeId: "linkedin-post",
    briefing: "rijk",
    objective:
      "Brand managers laten inzien dat purpose-statements zonder operationeel bewijs hun merk beschadigen, en Better Brands positioneren als de partij die dit meetbaar maakt.",
    keyMessage: "Purpose is pas waardevol als hij meetbaar in de operatie zit.",
    toneDirection: "Prikkelend maar onderbouwd, geen hype.",
    callToAction: "Reageer met jouw ervaring of stuur een DM.",
  },
  {
    contentTypeId: "linkedin-post",
    briefing: "mager",
    objective: "Schrijf een LinkedIn-post over purpose-washing.",
  },
  {
    contentTypeId: "blog-post",
    briefing: "rijk",
    objective:
      "Differentiëren van purpose-washers via operationeel bewijs; brand managers overtuigen dat purpose alleen werkt met meetbare cases en data.",
    keyMessage: "Purpose zonder bewijs is greenwashing. Better Brands helpt merken hun strategie operationeel te maken met merkbare resultaten.",
    toneDirection: "Strategisch maar menselijk. Confident zonder arrogant. Visionair maar niet onpraktisch.",
    callToAction: "Plan een gesprek over hoe Better Brands jouw merkstrategie operationeel maakt.",
    contentOutline: [
      "Probleem: purpose statements zonder bewijs",
      "Onze methode: 3-laags operationeel bewijs",
      "Case: hoe één klant doorbrak",
      "Wat dit betekent voor jouw merk",
    ],
  },
  {
    contentTypeId: "blog-post",
    briefing: "mager",
    objective: "Schrijf een blogartikel over waarom purpose-statements vaak niet werken.",
  },
];

// Zelfde user-prompt-vorm als vanilla-baseline.buildVanillaUserPrompt — lokaal
// gespiegeld zodat de Branddock-kant exact dezelfde briefing krijgt.
function buildUserPrompt(cell: Cell): string {
  const typeLabel = cell.contentTypeId.replace(/-/g, " ");
  const lines: string[] = [`Write a ${typeLabel}.`, ``, `**Goal:** ${cell.objective}`];
  if (cell.keyMessage) lines.push(`**Key message:** ${cell.keyMessage}`);
  if (cell.toneDirection) lines.push(`**Tone:** ${cell.toneDirection}`);
  if (cell.callToAction) lines.push(`**Call to action:** ${cell.callToAction}`);
  if (cell.contentOutline?.length) {
    lines.push("", "**Outline:**");
    for (const p of cell.contentOutline) lines.push(`- ${p}`);
  }
  lines.push("", "Write the full piece now.");
  return lines.join("\n");
}

const WRITER_INSTRUCTIONS = `Write the piece as instructed in the user message. Use markdown headings (##, ###) for structure. Output the content directly without preamble or commentary.`;

async function generateBranddockSide(cell: Cell, bvd: string): Promise<{ text: string; wordCount: number }> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: BRANDDOCK_MODEL,
    max_tokens: 4096,
    temperature: 1.0,
    system: `${bvd}\n\n${WRITER_INSTRUCTIONS}`,
    messages: [{ role: "user", content: buildUserPrompt(cell) }],
  });
  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  if (!text) throw new Error("Branddock-side returned empty content");
  return { text, wordCount: text.split(/\s+/).filter(Boolean).length };
}

async function main() {
  console.log("# Pilot-claim hermeting — Branddock vs vanilla (gpt-5.6 én gpt-4o)\n");

  const [voiceguide, centroid, bvd, bp] = await Promise.all([
    prisma.brandVoiceguide.findUnique({ where: { workspaceId: WORKSPACE_ID } }),
    fetchVoiceguideCentroid(WORKSPACE_ID),
    buildBrandVoiceDirective(WORKSPACE_ID),
    prisma.brandAsset.findFirst({
      where: { workspaceId: WORKSPACE_ID, frameworkType: "BRAND_PERSONALITY" },
      select: { frameworkData: true },
    }),
  ]);
  if (!voiceguide) throw new Error("BB voiceguide ontbreekt");
  if (!bvd) throw new Error("BVD leeg — brand context faalt");
  console.log(`BVD: ${bvd.length} chars · centroid: ${centroid ? "aanwezig" : "ONTBREEKT"}\n`);

  const bpData = (bp?.frameworkData ?? null) as Record<string, unknown> | null;
  const personality = bpData
    ? {
        wordsWeUse: Array.isArray(bpData.wordsWeUse)
          ? (bpData.wordsWeUse as unknown[]).filter((w): w is string => typeof w === "string")
          : [],
        personalityTraits: Array.isArray(bpData.personalityTraits)
          ? (bpData.personalityTraits as Array<Record<string, unknown>>).map((t) => ({
              name: typeof t.name === "string" ? t.name : undefined,
              description: typeof t.description === "string" ? t.description : undefined,
            }))
          : [],
      }
    : null;

  const voiceBaseline1Pager = formatVoiceBaseline1Pager(deriveVoiceBaseline1Pager(voiceguide));
  const brandVoiceSummary = (voiceguide.voiceDescription ?? "Brand voice per voiceguide.").slice(0, 300);

  async function score(text: string, wordCount: number, generatorProvider: "anthropic" | "openai") {
    const result = await computeFidelityScore({
      contentText: text,
      workspaceId: WORKSPACE_ID,
      brandName: BRAND_NAME,
      brandVoiceSummary,
      voiceBaseline1Pager,
      voiceguideCentroid: centroid,
      personality,
      generatorProvider,
      targetWordCount: wordCount,
    });
    return result.compositeScore;
  }

  const rows: Array<{ type: string; briefing: string; branddock: number; v56: number; v4o: number }> = [];

  for (const cell of CELLS) {
    process.stdout.write(`→ ${cell.contentTypeId} (${cell.briefing}): genereren… `);
    const [bd, v56, v4o] = await Promise.all([
      generateBranddockSide(cell, bvd),
      generateVanillaBaseline({ contentTypeId: cell.contentTypeId, objective: cell.objective, keyMessage: cell.keyMessage, toneDirection: cell.toneDirection, callToAction: cell.callToAction, contentOutline: cell.contentOutline }),
      generateVanillaBaseline({ contentTypeId: cell.contentTypeId, objective: cell.objective, keyMessage: cell.keyMessage, toneDirection: cell.toneDirection, callToAction: cell.callToAction, contentOutline: cell.contentOutline }, "gpt-4o"),
    ]);
    process.stdout.write(`scoren… `);
    const [sBd, sV56, sV4o] = await Promise.all([
      score(bd.text, bd.wordCount, "anthropic"),
      score(v56.text, v56.wordCount, "openai"),
      score(v4o.text, v4o.wordCount, "openai"),
    ]);
    rows.push({ type: cell.contentTypeId, briefing: cell.briefing, branddock: sBd, v56: sV56, v4o: sV4o });
    console.log(`BD=${sBd} v5.6=${sV56} v4o=${sV4o}  (Δ5.6=${sBd - sV56 >= 0 ? "+" : ""}${sBd - sV56}, Δ4o=${sBd - sV4o >= 0 ? "+" : ""}${sBd - sV4o})`);
  }

  console.log("\n## Resultaat");
  console.log("| Type | Briefing | Branddock | Vanilla gpt-5.6 | Δ (nieuw) | Vanilla gpt-4o | Δ (oud-stijl) |");
  console.log("|---|---|---|---|---|---|---|");
  for (const r of rows) {
    console.log(`| ${r.type} | ${r.briefing} | ${r.branddock} | ${r.v56} | ${r.branddock - r.v56 >= 0 ? "+" : ""}${r.branddock - r.v56} | ${r.v4o} | ${r.branddock - r.v4o >= 0 ? "+" : ""}${r.branddock - r.v4o} |`);
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const d56 = rows.map((r) => r.branddock - r.v56);
  const d4o = rows.map((r) => r.branddock - r.v4o);
  const rijk = rows.filter((r) => r.briefing === "rijk");
  const mager = rows.filter((r) => r.briefing === "mager");
  console.log(`\nGemiddelde gap vs gpt-5.6: ${mean(d56) >= 0 ? "+" : ""}${mean(d56).toFixed(1)} (rijk ${mean(rijk.map((r) => r.branddock - r.v56)).toFixed(1)}, mager ${mean(mager.map((r) => r.branddock - r.v56)).toFixed(1)})`);
  console.log(`Gemiddelde gap vs gpt-4o : ${mean(d4o) >= 0 ? "+" : ""}${mean(d4o).toFixed(1)} (rijk ${mean(rijk.map((r) => r.branddock - r.v4o)).toFixed(1)}, mager ${mean(mager.map((r) => r.branddock - r.v4o)).toFixed(1)})`);
  const nl = rows.filter((r) => r.type === "newsletter");
  console.log(`Newsletter-gap vs gpt-5.6: ${mean(nl.map((r) => r.branddock - r.v56)).toFixed(1)}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
