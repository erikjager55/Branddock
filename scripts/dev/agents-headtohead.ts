/**
 * Agents head-to-head — guardrail #1: is de F-VAL-score van agent-content
 * ≥ die van de normale Canvas-flow?
 *
 * Beide zijden worden door DEZELFDE scorer gehaald
 * (`runFidelityForExternalContent`) zodat scorer-verschillen wegvallen en
 * puur content-kwaliteit tegen elkaar staat:
 *   - Agent-zijde   : het REPORT-concept van de content-creator-agent (Milo),
 *                     zoals de sweep dat op Better Brands produceerde.
 *   - Canvas-zijde  : een échte, eerder via de Canvas-pipeline gegenereerde
 *                     tekst uit Better Brands (`DeliverableComponent.generatedContent`).
 *
 * Caveat: verschillende topics (F-VAL meet merk-fideliteit — stijl/voice/rules
 * — niet topic-match, dus vergelijkbaar). Voor een same-brief-variant zou de
 * content-creator-PROPOSAL bevestigd moeten worden (canvas-materialisatie).
 *
 * Run: node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *      scripts/dev/agents-headtohead.ts
 */

import { runFidelityForExternalContent } from "../../src/lib/brand-fidelity/external-content-runner";
import { prisma } from "../../src/lib/prisma";

const BB = "cmnomsobx009q44msn0gpw7vb";
const USER_ID = "demo-user-erik-001";

/** Haal een F-VAL-score voor willekeurige tekst tegen het Better-Brands-merk-DNA. */
async function fval(text: string): Promise<{ score: number; met: boolean; findings: number }> {
  const { result, findingsCount } = await runFidelityForExternalContent({
    workspaceId: BB,
    contentText: text,
    sourceType: "paste",
    userId: USER_ID,
    runJudge: true,
  });
  return { score: result.compositeScore, met: result.thresholdMet, findings: findingsCount };
}

async function main() {
  console.log("\n=== Agents head-to-head · guardrail #1 (F-VAL) ===\n");

  // ── Agent-zijde: laatste content-creator REPORT-concept ──
  const agentArtifact = await prisma.agentArtifact.findFirst({
    where: { workspaceId: BB, type: "REPORT", run: { agentId: "content-creator" } },
    orderBy: { createdAt: "desc" },
    select: { content: true, title: true },
  });
  const agentContent = agentArtifact?.content as { markdown?: string } | null;
  const agentText = agentContent?.markdown?.trim() ?? "";
  if (!agentText) {
    console.error("Geen content-creator REPORT-concept gevonden. Draai eerst de sweep.");
    await prisma.$disconnect();
    process.exit(1);
  }

  // ── Canvas-zijde: échte gegenereerde BB-prozacomponent, LENGTE-GEMATCHT
  // op de agent-draft (eerlijke 1-op-1: geen 16k landing-page vs 1k post). ──
  const PROSE = new Set(["introduction", "conclusion", "body", "body-sections", "paragraph", "section"]);
  const comps = await prisma.deliverableComponent.findMany({
    where: {
      deliverable: { campaign: { workspaceId: BB } },
      generatedContent: { not: null },
      componentType: { not: "image" },
    },
    select: { componentType: true, generatedContent: true, deliverable: { select: { contentType: true, title: true } } },
    take: 80,
  });
  const canvasPick = comps
    .map((c) => ({ text: (c.generatedContent ?? "").trim(), comp: c.componentType, meta: c.deliverable }))
    .filter((c) => c.text.length > 300 && PROSE.has(c.comp))
    .sort((a, b) => Math.abs(a.text.length - agentText.length) - Math.abs(b.text.length - agentText.length))[0];
  if (!canvasPick) {
    console.error("Geen bruikbare Canvas-component gevonden in Better Brands.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`Agent-tekst: ${agentText.length} chars (REPORT "${agentArtifact?.title}")`);
  console.log(`Canvas-tekst: ${canvasPick.text.length} chars (${canvasPick.meta.contentType}/${canvasPick.comp} · "${canvasPick.meta.title.slice(0, 40)}")\n`);

  console.log("F-VAL agent-zijde ...");
  const agent = await fval(agentText);
  console.log(`  → composite ${agent.score} · threshold ${agent.met ? "gehaald" : "niet"} · ${agent.findings} findings`);

  console.log("F-VAL canvas-zijde ...");
  const canvas = await fval(canvasPick.text);
  console.log(`  → composite ${canvas.score} · threshold ${canvas.met ? "gehaald" : "niet"} · ${canvas.findings} findings`);

  const delta = agent.score - canvas.score;
  const verdict = delta >= 0 ? "agent >= canvas (guardrail gehaald)" : "agent < canvas (guardrail NIET gehaald)";
  console.log(`\nΔ = ${delta >= 0 ? "+" : ""}${delta} → ${verdict}`);
  console.log(
    `\nJSON ${JSON.stringify({ agentChars: agentText.length, agentScore: agent.score, agentMet: agent.met, agentFindings: agent.findings, canvasType: `${canvasPick.meta.contentType}/${canvasPick.comp}`, canvasChars: canvasPick.text.length, canvasScore: canvas.score, canvasMet: canvas.met, canvasFindings: canvas.findings, delta })}`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("FATAL", e instanceof Error ? e.stack : String(e));
  await prisma.$disconnect();
  process.exit(1);
});
