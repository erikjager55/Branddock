// =============================================================
// POST /api/agents/run — start een synchrone agent-run (ADR 2026-07-05 D5).
//
// Body: { agentId, useCaseId?, input? } (Zod-gevalideerd, dag-1
// security-conventie). Response: RunAgentResponse — óók bij een
// gefaalde run 200 met status FAILED zodra de run-rij bestaat (de
// client heeft de runId nodig voor de inbox); 400 voor onbekende
// agent/use-case; 500 alleen vóór run-creatie.
//
// maxDuration 800s (Vercel Pro + Fluid): agent-runs met tool-use en
// pipeline-motoren duren minuten; de loop-guard (timeoutMs, default
// 5min) blijft de echte begrenzing per run.
// =============================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth-server";
import { requireWorkspaceRole } from "@/lib/auth/require-role";
import { withAiRateLimit } from "@/lib/ai/middleware";
import {
  runAgent,
  UnknownAgentError,
  UnknownUseCaseError,
} from "@/lib/agents/registry/run-agent";
import { ALL_CONTEXT_MODULES, type ContextModule } from "@/lib/claw/claw.types";
import type { AgentContextSelection } from "@/lib/agents/registry/types";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

export const maxDuration = 800;

// Byte-cap op de vrije input: landt verbatim op AgentRun.input én (via
// {{input}}/JSON.stringify) in de Anthropic-prompt — zonder cap is één
// request genoeg voor kosten-amplificatie + DB-bloat (byte-cap-conventie
// uit de security-sweep 2026-06-30; rate-limit begrenst alleen frequentie).
const MAX_INPUT_BYTES = 32_768;

// Content-sources-selectie: zelfde vorm als de Claw-chat; onbekende module-
// waarden worden server-side weggefilterd (geen 400 — forward-compatible).
const contextSelectionSchema = z
  .object({
    modules: z.array(z.string().max(32)).max(24),
    entityIds: z
      .record(z.string().max(32), z.array(z.string().max(64)).max(50))
      .optional()
      .nullable()
      .refine((v) => !v || Object.keys(v).length <= 24, { message: "too many entityIds keys" }),
  })
  .optional();

const bodySchema = z.object({
  agentId: z.string().min(1),
  useCaseId: z.string().min(1).optional(),
  contextSelection: contextSelectionSchema,
  input: z
    .record(z.string(), z.unknown())
    .optional()
    .refine((val) => val === undefined || Buffer.byteLength(JSON.stringify(val), "utf8") <= MAX_INPUT_BYTES, {
      message: `input exceeds ${MAX_INPUT_BYTES} bytes`,
    }),
});


/** Filtert de selectie op bekende modules; lege selectie → undefined (default-gedrag). */
function sanitizeContextSelection(
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

export async function POST(request: Request) {
  try {
    // Member+ (zelfde policy als de confirm-route en /api/claw/confirm):
    // een run geeft AI-budget uit én kan via pipeline-tools domein-rijen
    // schrijven (KnowledgeResource, ContentReviewLog) — viewers zijn read-only.
    const role = await requireWorkspaceRole(["owner", "admin", "member"]);
    if (role instanceof NextResponse) return role;
    const workspaceId = role.workspaceId;
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    let result;
    try {
      result = await runAgent({
        workspaceId,
        userId: session.user.id,
        agentId: parsed.data.agentId,
        useCaseId: parsed.data.useCaseId,
        input: parsed.data.input,
        contextSelection: sanitizeContextSelection(parsed.data.contextSelection),
      });
    } catch (err) {
      if (err instanceof UnknownAgentError || err instanceof UnknownUseCaseError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    // Nieuwe run muteert de runs-list — verplichte invalidatie (CLAUDE.md #10).
    invalidateCache(cacheKeys.prefixes.agents(workspaceId));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/agents/run]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
