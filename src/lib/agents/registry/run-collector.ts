// =============================================================
// Agents registry — per-run collector (agents-motor-wiring).
//
// Twee soorten deterministische, server-owned output die NIET via de
// model-final-message mag lopen:
//   1. Mutation-proposals: write-tools draaien in agent-context nooit
//      (ADR D6-verfijning); de tool-bridge registreert het proposal hier
//      en de artifact-contract-finalize persisteert het als PROPOSAL-
//      artefact + zet de run op AWAITING_CONFIRMATION.
//   2. Grote/exacte artefacten (bv. het volledige deep-research-rapport):
//      pipeline-tools registreren die hier zodat de content niet door de
//      model-context hoeft (token-kosten + truncatie-risico) en byte-
//      exact persisteert.
//
// Keyed op runId; de finalize draint (leest + wist). Een run die vóór
// finalize crasht laat hooguit een entry achter die bij een volgende
// run met dezelfde runId (bestaat niet — randomUUID) nooit opduikt;
// clearRunCollector in de catch van run-agent ruimt netjes op.
// =============================================================

import type { MutationProposal } from "@/lib/claw/claw.types";
import type { AgentArtifactDraft } from "./types";

const proposalsByRun = new Map<string, MutationProposal[]>();
const artifactsByRun = new Map<string, AgentArtifactDraft[]>();

export function recordProposal(runId: string, proposal: MutationProposal): void {
  const list = proposalsByRun.get(runId) ?? [];
  list.push(proposal);
  proposalsByRun.set(runId, list);
}

export function recordArtifact(runId: string, draft: AgentArtifactDraft): void {
  const list = artifactsByRun.get(runId) ?? [];
  list.push(draft);
  artifactsByRun.set(runId, list);
}

/** Leest én verwijdert alle geregistreerde proposals voor een run. */
export function drainProposals(runId: string): MutationProposal[] {
  const list = proposalsByRun.get(runId) ?? [];
  proposalsByRun.delete(runId);
  return list;
}

/** Leest én verwijdert alle geregistreerde artefact-drafts voor een run. */
export function drainArtifacts(runId: string): AgentArtifactDraft[] {
  const list = artifactsByRun.get(runId) ?? [];
  artifactsByRun.delete(runId);
  return list;
}

/** Opruimen bij run-failure (catch-pad run-agent) — voorkomt lekkende entries. */
const toolAttempts = new Map<string, Map<string, number>>();

/**
 * Telt per run hoe vaak een (dure) tool al draaide — server-afgedwongen
 * once-per-run-limieten kunnen niet op prompt-naleving leunen (bewezen:
 * het model retryde run_deep_research na een deadline-fout, 2x480s).
 */
export function countToolAttempt(runId: string, toolName: string): number {
  let perRun = toolAttempts.get(runId);
  if (!perRun) {
    perRun = new Map();
    toolAttempts.set(runId, perRun);
  }
  const next = (perRun.get(toolName) ?? 0) + 1;
  perRun.set(toolName, next);
  return next;
}

export function clearRunCollector(runId: string): void {
  toolAttempts.delete(runId);
  proposalsByRun.delete(runId);
  artifactsByRun.delete(runId);
}
