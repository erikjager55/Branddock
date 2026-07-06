// =============================================================
// PATCH /api/agents/artifacts/[id] — accept/dismiss van een artefact.
//
// Accept is first-accept-gated (conditionele updateMany op acceptedAt:
// null): alleen de éérste accept triggert de materialisatie (REPORT/
// TABLE → KnowledgeResource, fail-soft + idempotent) en het PostHog-
// event `agent_output_accepted` (primaire adoptie-metric) — concurrent
// dubbel-accepten kan dus geen duplicaten of metric-inflatie geven.
// Dismiss archiveert een eerder gematerialiseerde resource; re-accept
// de-archiveert (zie materialize-artifact.ts module-header).
// Autorisatie: workspace-membership (codebase-consistent); isolatie
// via findFirst({id, workspaceId}) vóór de update.
// =============================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import {
  materializeArtifactOnAccept,
  setMaterializedResourceArchived,
} from "@/lib/agents/registry/materialize-artifact";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

const bodySchema = z.object({
  action: z.enum(["accept", "dismiss"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body — expected { action: 'accept' | 'dismiss' }" },
        { status: 400 },
      );
    }

    const artifact = await prisma.agentArtifact.findFirst({
      where: { id, workspaceId },
      include: { run: { select: { id: true, agentId: true } } },
    });
    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    let materialized: { knowledgeResourceId: string } | null = null;
    let knowledgeTouched = false;

    if (parsed.data.action === "accept") {
      // First-accept-detectie als DB-level guard tegen concurrent dubbel-
      // accepten (count === 1 = deze request maakte de transitie).
      const transition = await prisma.agentArtifact.updateMany({
        where: { id: artifact.id, acceptedAt: null },
        data: { acceptedAt: new Date(), dismissedAt: null },
      });
      const firstAccept = transition.count === 1;
      // Adoptie-metric telt unieke éérste accepts: dismiss→accept-toggles
      // (o.a. het materialisatie-retry-pad) her-tellen niet.
      const firstEverAccept = firstAccept && artifact.dismissedAt === null;

      const current = await prisma.agentArtifact.findUnique({ where: { id: artifact.id } });
      if (current && current.acceptedAt) {
        // Altijd de helper aanroepen — die is idempotent én zelfherstellend
        // (dearchiveert bestaande resource; detecteert een door de user
        // verwijderde resource en materialiseert opnieuw; advisory lock +
        // in-tx re-read dekken concurrent dubbel-accepten). Zo retournt
        // élke accept het actuele resource-id in `materialized`.
        // Fail-soft: een materialisatie-fout mag de accept niet 500'en.
        materialized = await materializeArtifactOnAccept(current);
        knowledgeTouched = materialized !== null;
      }

      // Compensatie accept↔dismiss-race: is het artefact gedismisst terwijl
      // wij materialiseerden, archiveer de zojuist gemaakte resource alsnog.
      if (materialized) {
        const post = await prisma.agentArtifact.findUnique({ where: { id: artifact.id } });
        if (post?.dismissedAt) {
          await setMaterializedResourceArchived(post, true);
        }
      }

      if (firstEverAccept) {
        void emitAgentOutputAccepted({
          workspaceId,
          artifactId: artifact.id,
          artifactType: artifact.type,
          runId: artifact.run.id,
          agentId: artifact.run.agentId,
        }).catch(() => {
          /* logged binnen trackEvent */
        });
      }
    } else {
      const dismissed = await prisma.agentArtifact.update({
        where: { id: artifact.id },
        data: { dismissedAt: new Date(), acceptedAt: null },
      });
      // Accept-terugdraai mag de library niet vervuild achterlaten:
      // archiveer een eerder gematerialiseerde resource (fail-soft).
      knowledgeTouched = await setMaterializedResourceArchived(dismissed, true);
    }

    invalidateCache(cacheKeys.prefixes.agents(workspaceId));
    if (knowledgeTouched) {
      invalidateCache(cacheKeys.prefixes.knowledgeResources(workspaceId));
    }

    // Re-read ná de status-flip + eventuele materialisatie-write-back zodat
    // acceptedAt/dismissedAt én content.knowledgeResourceId actueel meekomen.
    const finalArtifact = await prisma.agentArtifact.findUnique({ where: { id: artifact.id } });

    return NextResponse.json({
      artifact: finalArtifact ?? artifact,
      materialized,
    });
  } catch (err) {
    console.error("[PATCH /api/agents/artifacts/[id]]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function emitAgentOutputAccepted(args: {
  workspaceId: string;
  artifactId: string;
  artifactType: string;
  runId: string;
  agentId: string;
}): Promise<void> {
  const { trackEvent } = await import("@/lib/analytics/posthog");
  await trackEvent({
    event: "agent_output_accepted",
    workspaceId: args.workspaceId,
    properties: {
      artifact_id: args.artifactId,
      artifact_type: args.artifactType,
      run_id: args.runId,
      agent_id: args.agentId,
    },
  });
}
