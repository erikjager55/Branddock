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

/** Dev/env-gate voor hidden (test-only) agents — gedeeld met run-agent. */
export function isTestAgentAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.AGENTS_ENABLE_TEST_AGENT === "1";
}

/**
 * Lookup die hidden agents alleen in dev/test-modus teruggeeft — gebruik
 * dit op user-facing ingangen (chat-scoping, catalogus-achtige lookups)
 * zodat een hidden agent in productie nooit persona-injecteerbaar is.
 */
export function getVisibleAgentDefinition(id: string): AgentDefinition | undefined {
  const def = agents.get(id);
  if (def?.hidden && !isTestAgentAllowed()) return undefined;
  return def;
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
// Curated agents + hun tool-sets registreren bij module-load (idempotent;
// zelfde side-effect-conventie als de brandclaw-tools). De echo-test-agent
// is dev-only: hidden + env-gated — nooit registreerbaar in productie
// zonder expliciete flag.

import { echoTestAgent } from "./agents/echo-test";
import { registerMemoryTools } from "./memory-tools";
import { registerClawToolsForAgent } from "./tool-bridge";
import {
  registerResearchAnalystTools,
  researchAnalystAgent,
} from "./definitions/research-analyst";
import { brandGuardianAgent, registerBrandGuardianTools } from "./definitions/brand-guardian";
import { registerStrategistTools, strategistAgent } from "./definitions/strategist";
import { contentCreatorAgent, registerContentCreatorTools } from "./definitions/content-creator";
import { marketAnalystAgent, registerMarketAnalystTools } from "./definitions/market-analyst";
import { dataAnalystAgent, registerDataAnalystTools } from "./definitions/data-analyst";
import { reporterAgent, registerReporterTools } from "./definitions/reporter";

registerAgent(researchAnalystAgent);
registerResearchAnalystTools();
registerAgent(brandGuardianAgent);
registerBrandGuardianTools();
registerAgent(strategistAgent);
registerStrategistTools();
registerAgent(contentCreatorAgent);
registerContentCreatorTools();
registerAgent(marketAnalystAgent);
registerMarketAnalystTools();
registerAgent(dataAnalystAgent);
registerDataAnalystTools();
registerAgent(reporterAgent);
registerReporterTools();

// Per-agent geheugen (Fase 2, slice 4): elke persona-agent krijgt recall
// (vrije read) + remember (propose-only Claw-tool → confirm-pad) op zijn
// eigen namespace. Echo-test bewust niet: die is per contract tool-loos
// (single text-turn smoke-instrument).
for (const def of [
  researchAnalystAgent,
  brandGuardianAgent,
  strategistAgent,
  contentCreatorAgent,
  marketAnalystAgent,
  dataAnalystAgent,
  reporterAgent,
]) {
  registerMemoryTools(def.toolNamespace);
  registerClawToolsForAgent(def.toolNamespace, ["remember_agent_memory"]);
}

if (process.env.NODE_ENV !== "production" || process.env.AGENTS_ENABLE_TEST_AGENT === "1") {
  registerAgent(echoTestAgent);
}
