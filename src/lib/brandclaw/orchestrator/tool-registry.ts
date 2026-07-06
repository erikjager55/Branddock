// =============================================================
// Brandclaw orchestrator — per-node tool-registry (ADR 2026-05-08).
//
// Elk node-type (strategy_analyst / campaign_builder / measurement_eval
// / optimization) heeft eigen tool-set. Cross-node tool-sharing kan
// later (Campaign Builder kan `query_strategy_observations` van
// Analyst hergebruiken) maar v1 keeps per-node-isolated zodat namespace-
// collisions onmogelijk zijn.
//
// Tools registreren zich via side-effect import in `src/lib/brandclaw/
// tools/index.ts` — patroon gelijk aan data-source registry.
// =============================================================

import type { BrandclawTool, ToolNamespace } from "./types";

class ToolRegistryImpl {
  /** node-type → tool-name → BrandclawTool. */
  private byNode = new Map<ToolNamespace, Map<string, BrandclawTool>>();

  /**
   * Register een tool voor een specifieke node-type. Tool-name moet uniek
   * binnen het node-type — overschrijft stille bij dubbele registratie
   * (laatste wint, voor test-mocking patronen).
   */
  register(nodeType: ToolNamespace, tool: BrandclawTool): void {
    let nodeMap = this.byNode.get(nodeType);
    if (!nodeMap) {
      nodeMap = new Map();
      this.byNode.set(nodeType, nodeMap);
    }
    nodeMap.set(tool.definition.name, tool);
  }

  /**
   * Alle tools voor een node-type. Lege array wanneer node nog geen
   * tools geregistreerd heeft — agent-loop respecteert dit (geen tool-
   * use, alleen text-response).
   */
  getToolsForNode(nodeType: ToolNamespace): BrandclawTool[] {
    const nodeMap = this.byNode.get(nodeType);
    if (!nodeMap) return [];
    return Array.from(nodeMap.values());
  }

  /**
   * Lookup een specifieke tool. Returns undefined wanneer niet gevonden;
   * agent-loop catched dit naar isError-result message.
   */
  getTool(nodeType: ToolNamespace, toolName: string): BrandclawTool | undefined {
    return this.byNode.get(nodeType)?.get(toolName);
  }

  /** Lijst geregistreerde tool-names per node — diagnostics. */
  listToolNames(nodeType: ToolNamespace): string[] {
    const nodeMap = this.byNode.get(nodeType);
    return nodeMap ? Array.from(nodeMap.keys()) : [];
  }

  /** Reset state — alleen voor tests. */
  reset(): void {
    this.byNode.clear();
  }
}

const registry = new ToolRegistryImpl();

/**
 * Public accessor. Tools moeten via side-effect imports al geregistreerd
 * zijn vóór de eerste lookup — caller (agent-loop) is verantwoordelijk
 * voor de juiste tools-module import.
 */
export function getToolRegistry(): ToolRegistryImpl {
  return registry;
}

/** Test-only direct access. */
export function getRegistryForTests(): ToolRegistryImpl {
  return registry;
}
