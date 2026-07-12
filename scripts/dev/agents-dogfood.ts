/**
 * Agents dogfood-sweep — draait de 6 persona-agents op de pilot-workspace
 * (Better Brands) met realistische use-cases en verzamelt de twee guardrail-
 * datapunten die Fase 2/3 eisen:
 *   - kosten per run (totalCostUsd + tokens)   → guardrail #2
 *   - F-VAL-score van agent-content            → guardrail #1 (brand-guardian
 *     levert een echte score; content-agents F-VAL'en pas op het confirm-pad)
 *
 * Roept `runAgent` direct aan (zelfde pad als de smoke-tests) → echte
 * Anthropic/Gemini-calls, persistente AgentRun + AgentArtifact. Geen HTTP/auth.
 *
 * Sequentieel (rate-limit-vriendelijk). Schrijft per run een regel naar een
 * JSONL zodat een hang de al-verzamelde data niet verliest, en aan het eind
 * een markdown-rapport onder docs/reports/.
 *
 * Run: node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *      scripts/dev/agents-dogfood.ts
 *
 * Env: DOGFOOD_RUN_DATE=<label>  → bestandsnamen-suffix (default: vandaag)
 *      DOGFOOD_ONLY=<id[,id]>    → gerichte retry. LET OP: geef dan ook een
 *      eigen DOGFOOD_RUN_DATE mee (bv. "2026-07-12-strategist-retry"), anders
 *      overschrijft de retry het JSONL/rapport van de volle sweep van vandaag.
 */

import { appendFileSync, writeFileSync } from "node:fs";
import { runAgent } from "../../src/lib/agents/registry/run-agent";
import { prisma } from "../../src/lib/prisma";

const WORKSPACE_ID = "cmnomsobx009q44msn0gpw7vb"; // Better brands
const USER_ID = "demo-user-erik-001"; // owner erik@branddock.com
// Overridebaar zodat een herhaalronde niet het rapport van een eerdere ronde overschrijft.
const RUN_DATE = process.env.DOGFOOD_RUN_DATE ?? new Date().toISOString().slice(0, 10);
const JSONL = `docs/reports/agents-dogfood-${RUN_DATE}.jsonl`;
const REPORT = `docs/reports/agents-dogfood-${RUN_DATE}.md`;

/** Een realistische Better-Brands-tekst voor de brand-guardian review (guardrail #1 = echte F-VAL). */
const REVIEW_SAMPLE = `Bij Better Brands geloven we dat een sterk merk begint bij een scherpe strategie.
We helpen ambitieuze bedrijven om hun merk-DNA vast te leggen en consistent uit te dragen over elk
kanaal. Geen losse campagnes, maar een samenhangend verhaal dat blijft hangen. Klaar om jouw merk
naar het volgende niveau te tillen? Neem vandaag nog contact op.`;

interface Spec {
  agentId: string;
  useCaseId: string;
  message: string;
}

const SPECS: Spec[] = [
  {
    agentId: "research-analyst",
    useCaseId: "market-question",
    message: "Wat zijn de belangrijkste trends en kansen in onze markt voor het komende kwartaal?",
  },
  {
    agentId: "brand-guardian",
    useCaseId: "review-content",
    message: REVIEW_SAMPLE,
  },
  {
    agentId: "content-creator",
    useCaseId: "create-content",
    message: "Maak een LinkedIn-post over waarom merkconsistentie de ROI van marketing verhoogt.",
  },
  {
    agentId: "market-analyst",
    useCaseId: "competitive-analysis",
    message: "Analyseer onze concurrentiepositie en waar we ons kunnen onderscheiden.",
  },
  {
    agentId: "strategist",
    useCaseId: "strategy-foundation",
    message: "Geef een strategische fundering voor onze merkpositionering.",
  },
  {
    agentId: "data-analyst",
    useCaseId: "content-production",
    message: "",
  },
];

interface RowResult {
  agentId: string;
  useCaseId: string;
  status: string;
  latencyMs: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  truncated: boolean;
  artifacts: { type: string; title: string; fidelityScore: number | null }[];
  error: string | null;
}

async function runOne(spec: Spec): Promise<RowResult> {
  const t0 = Date.now();
  try {
    const res = await runAgent({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      agentId: spec.agentId,
      useCaseId: spec.useCaseId,
      input: spec.message ? { message: spec.message } : {},
      triggerType: "manual",
    });
    const run = await prisma.agentRun.findUnique({
      where: { id: res.runId },
      select: {
        inputTokens: true,
        outputTokens: true,
        artifacts: { select: { type: true, title: true, fidelityScore: true } },
      },
    });
    return {
      agentId: spec.agentId,
      useCaseId: spec.useCaseId,
      status: res.status,
      latencyMs: res.latencyMs,
      costUsd: res.totalCostUsd,
      inputTokens: run?.inputTokens ?? 0,
      outputTokens: run?.outputTokens ?? 0,
      truncated: res.truncated,
      artifacts: run?.artifacts ?? [],
      error: res.error,
    };
  } catch (e) {
    return {
      agentId: spec.agentId,
      useCaseId: spec.useCaseId,
      status: "THREW",
      latencyMs: Date.now() - t0,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      truncated: false,
      artifacts: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function fmtArtifacts(a: RowResult["artifacts"]): string {
  if (a.length === 0) return "—";
  return a.map((x) => `${x.type}${x.fidelityScore !== null ? `(F-VAL ${x.fidelityScore})` : ""}`).join(", ");
}

async function main() {
  // DOGFOOD_ONLY=strategist[,data-analyst] → gerichte retry zonder volle sweep.
  const only = (process.env.DOGFOOD_ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const specs = only.length ? SPECS.filter((s) => only.includes(s.agentId)) : SPECS;
  if (only.length && specs.length === 0) {
    // Typo-guard: anders wist de writeFileSync hieronder het JSONL van vandaag
    // en deelt het rapport door 0 runs (NaN) — zonder foutmelding.
    console.error(`DOGFOOD_ONLY matcht geen enkele agent (${only.join(",")}) — bekende ids: ${SPECS.map((s) => s.agentId).join(", ")}`);
    process.exit(1);
  }
  console.log(`\n=== Agents dogfood-sweep · Better Brands · ${RUN_DATE}${only.length ? ` · only: ${only.join(",")}` : ""} ===\n`);
  writeFileSync(JSONL, "");
  const rows: RowResult[] = [];

  for (const spec of specs) {
    process.stdout.write(`→ ${spec.agentId} / ${spec.useCaseId} ... `);
    const r = await runOne(spec);
    rows.push(r);
    appendFileSync(JSONL, JSON.stringify(r) + "\n");
    console.log(
      `${r.status} | $${r.costUsd.toFixed(4)} | ${(r.latencyMs / 1000).toFixed(1)}s | in:${r.inputTokens} out:${r.outputTokens} | ${fmtArtifacts(r.artifacts)}${r.error ? ` | ERR: ${r.error}` : ""}`,
    );
  }

  const totalCost = rows.reduce((s, r) => s + r.costUsd, 0);
  const ok = rows.filter((r) => r.status === "COMPLETED" || r.status === "AWAITING_CONFIRMATION").length;

  // ── Markdown-rapport ──
  const lines: string[] = [];
  lines.push(`# Agents dogfood-sweep — Better Brands (${RUN_DATE})`);
  lines.push("");
  lines.push(`> Automatisch gegenereerd door \`scripts/dev/agents-dogfood.ts\`. ${ok}/${rows.length} runs geslaagd · totale kosten $${totalCost.toFixed(4)}.`);
  lines.push("");
  lines.push("## Guardrail-data per run");
  lines.push("");
  lines.push("| Agent | Use-case | Status | $ kosten | Latency | In/Out tokens | Artefacten (F-VAL) |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const r of rows) {
    lines.push(
      `| ${r.agentId} | ${r.useCaseId} | ${r.status} | $${r.costUsd.toFixed(4)} | ${(r.latencyMs / 1000).toFixed(1)}s | ${r.inputTokens}/${r.outputTokens} | ${fmtArtifacts(r.artifacts)} |`,
    );
  }
  lines.push("");
  lines.push(`**Totale sweep-kosten**: $${totalCost.toFixed(4)} · **gemiddeld/run**: $${(totalCost / rows.length).toFixed(4)}`);
  lines.push("");
  const errs = rows.filter((r) => r.error);
  if (errs.length) {
    lines.push("## Fouten");
    lines.push("");
    for (const r of errs) lines.push(`- **${r.agentId}/${r.useCaseId}** (${r.status}): ${r.error}`);
    lines.push("");
  }
  writeFileSync(REPORT, lines.join("\n"));
  console.log(`\nRapport: ${REPORT}\nRuwe data: ${JSONL}`);
  console.log(`Totaal: $${totalCost.toFixed(4)} · ${ok}/${rows.length} geslaagd\n`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("FATAL", e instanceof Error ? e.stack : String(e));
  await prisma.$disconnect();
  process.exit(1);
});
