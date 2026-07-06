// =============================================================
// Agents registry — curated agent-map (ADR 2026-07-05, D4).
//
// Agents registreren zich hier via expliciete registerAgent-calls
// (bootstrap onderaan dit bestand — geen side-effect-imports vanuit de
// agent-files zelf, dat zou een cycle geven). De map start leeg;
// getAgentDefinition → undefined laat de run-route 400 antwoorden.
// =============================================================

import type { AgentDefinition } from "./types";

const agents = new Map<string, AgentDefinition>();

/**
 * Register an agent definition. Last-wins on duplicate ids (test-mocking
 * pattern, same trade-off as the orchestrator tool-registry).
 */
export function registerAgent(def: AgentDefinition): void {
  agents.set(def.id, def);
}

/** Lookup by (unvalidated) id — undefined for unknown agents. */
export function getAgentDefinition(id: string): AgentDefinition | undefined {
  return agents.get(id);
}

/** Catalog listing — hidden (test-only) agents are never included. */
export function listAgents(): AgentDefinition[] {
  return Array.from(agents.values()).filter((def) => !def.hidden);
}

/** Test-only: reset registry state. */
export function resetAgentRegistryForTests(): void {
  agents.clear();
}

// ─── Bootstrap ───────────────────────────────────────────────
// Curated agents registreren hier (agents-motor-wiring voegt de 6
// productie-agents toe). De echo-test-agent is dev-only: hidden +
// env-gated — nooit registreerbaar in productie zonder expliciete flag.

import { echoTestAgent } from "./agents/echo-test";

if (process.env.NODE_ENV !== "production" || process.env.AGENTS_ENABLE_TEST_AGENT === "1") {
  registerAgent(echoTestAgent);
}
