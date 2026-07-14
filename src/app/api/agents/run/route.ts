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
import {
  contextSelectionSchema,
  sanitizeContextSelection,
} from "@/lib/agents/registry/context-selection";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { enforceNotLocked } from "@/lib/stripe/enforcement";
import { prisma } from "@/lib/prisma";

export const maxDuration = 800;

// Byte-cap op de vrije input: landt verbatim op AgentRun.input én (via
// {{input}}/JSON.stringify) in de Anthropic-prompt — zonder cap is één
// request genoeg voor kosten-amplificatie + DB-bloat (byte-cap-conventie
// uit de security-sweep 2026-06-30; rate-limit begrenst alleen frequentie).
const MAX_INPUT_BYTES = 32_768;

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

export async function POST(request: Request) {
  try {
    // Member+ (zelfde policy als de confirm-route en /api/claw/confirm):
    // een run geeft AI-budget uit én kan via pipeline-tools domein-rijen
    // schrijven (KnowledgeResource, ContentReviewLog) — viewers zijn read-only.
    const role = await requireWorkspaceRole(["owner", "admin", "member"]);
    if (role instanceof NextResponse) return role;
    const workspaceId = role.workspaceId;

    // Fase 4: verlopen no-card trial -> generatie dicht (read-only-lock).
    const trialLock = await enforceNotLocked(workspaceId);
    if (trialLock) return trialLock;
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

    // Lege-staat-guard (tasks/agent-ads-watchdog.md, Fase 3): de waakhond
    // zonder gekoppeld account bewaakt een lege tuin — hard 400 met uitleg
    // i.p.v. een run die AI-budget uitgeeft aan "niets te bewaken".
    if (parsed.data.agentId === "ads-watchdog") {
      const activeAccounts = await prisma.connectedAdAccount.count({
        where: { workspaceId, status: "active" },
      });
      if (activeAccounts === 0) {
        return NextResponse.json(
          { error: "No active ad account — connect (or reconnect an expired) account under Settings → Integrations → ad accounts first." },
          { status: 400 },
        );
      }
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
