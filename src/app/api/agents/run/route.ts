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
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { withAiRateLimit } from "@/lib/ai/middleware";
import {
  runAgent,
  UnknownAgentError,
  UnknownUseCaseError,
} from "@/lib/agents/registry/run-agent";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

export const maxDuration = 800;

// Byte-cap op de vrije input: landt verbatim op AgentRun.input én (via
// {{input}}/JSON.stringify) in de Anthropic-prompt — zonder cap is één
// request genoeg voor kosten-amplificatie + DB-bloat (byte-cap-conventie
// uit de security-sweep 2026-06-30; rate-limit begrenst alleen frequentie).
const MAX_INPUT_BYTES = 32_768;

const bodySchema = z.object({
  agentId: z.string().min(1),
  useCaseId: z.string().min(1).optional(),
  input: z
    .record(z.string(), z.unknown())
    .optional()
    .refine((val) => val === undefined || Buffer.byteLength(JSON.stringify(val), "utf8") <= MAX_INPUT_BYTES, {
      message: `input exceeds ${MAX_INPUT_BYTES} bytes`,
    }),
});

export async function POST(request: Request) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }
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
