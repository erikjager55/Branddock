// =============================================================
// Gedeelde contextSelection-validatie + -sanitizer voor agent-runs.
//
// Uit POST /api/agents/run getrokken (Fase 2, agents-scheduling): de
// AGENT_TASK-job-handler krijgt dezelfde selectie via een untrusted
// job-payload (webhook-trigger-route kan AGENT_TASK enqueuen) en moet
// exact dezelfde filtering draaien — geen tweede waarheid.
// =============================================================

import { z } from "zod";
import { ALL_CONTEXT_MODULES, type ContextModule } from "@/lib/claw/claw.types";
import type { AgentContextSelection } from "./types";

/**
 * Content-sources-selectie: zelfde vorm als de Claw-chat; onbekende module-
 * waarden worden server-side weggefilterd (geen 400 — forward-compatible).
 */
export const contextSelectionSchema = z
  .object({
    modules: z.array(z.string().max(32)).max(24),
    entityIds: z
      .record(z.string().max(32), z.array(z.string().max(64)).max(50))
      .optional()
      .nullable()
      .refine((v) => !v || Object.keys(v).length <= 24, { message: "too many entityIds keys" }),
  })
  .optional();

/** Filtert de selectie op bekende modules; lege selectie → undefined (default-gedrag). */
export function sanitizeContextSelection(
  raw: z.infer<typeof contextSelectionSchema>,
): AgentContextSelection | undefined {
  if (!raw) return undefined;
  const known = new Set<string>(ALL_CONTEXT_MODULES);
  const modules = [...new Set(raw.modules)].filter((m): m is ContextModule => known.has(m));
  if (modules.length === 0) return undefined;
  const entityIds: Partial<Record<ContextModule, string[]>> = {};
  for (const [mod, ids] of Object.entries(raw.entityIds ?? {})) {
    if (known.has(mod) && Array.isArray(ids) && ids.length > 0) {
      entityIds[mod as ContextModule] = ids;
    }
  }
  return { modules, ...(Object.keys(entityIds).length > 0 ? { entityIds } : {}) };
}
