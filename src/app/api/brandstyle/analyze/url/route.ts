import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { withAiRateLimit } from "@/lib/ai/middleware";
import { dispatchJob } from "@/lib/agents/jobs/dispatch";

const analyzeUrlSchema = z.object({
  url: z.string().url("Invalid URL"),
});

// =============================================================
// POST /api/brandstyle/analyze/url — start URL analyse
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = analyzeUrlSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // W5/G6: re-analyse is een refresh, geen wipe. Het oude delete+create-pad
    // vernietigde bij elke nieuwe analyse de reviews, rules, snapshots, het
    // manifest en alle user-edits. De engine doet partial-upsert met
    // *Override-bescherming, dus het bestaande record wordt hergebruikt;
    // destructief wissen kan alleen nog expliciet via rescrape-brand.ts --hard.
    const existing = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      select: { id: true },
    });
    const analysisJobId = `job_${crypto.randomUUID()}`;
    const styleguide = existing
      ? await prisma.brandStyleguide.update({
          where: { id: existing.id },
          data: {
            status: "ANALYZING",
            sourceType: "URL",
            sourceUrl: parsed.data.url,
            analysisStatus: "SCANNING_STRUCTURE",
            analysisJobId,
            errorMessage: null,
          },
        })
      : await prisma.brandStyleguide.create({
          data: {
            status: "ANALYZING",
            sourceType: "URL",
            sourceUrl: parsed.data.url,
            analysisStatus: "SCANNING_STRUCTURE",
            analysisJobId,
            createdById: session.user.id,
            workspaceId,
          },
        });

    // Serverless-safe: op de AgentJob-queue i.p.v. fire-and-forget (dat wordt op
    // Vercel gekild na de response). De analyse-engine schrijft analysisStatus
    // progressief naar de DB; frontend blijft GET /analyze/status/[jobId] pollen.
    // maxAttempts:1 — analyse is duur (AI-calls); bij falen landt de engine op
    // ERROR en laat de user opnieuw triggeren. idempotencyKey op de job-id
    // (per klik uniek — het styleguide-id is sinds het refresh-pad stabiel en
    // zou herhaalde analyses dedupen).
    await dispatchJob({
      type: "BRANDSTYLE_ANALYZE_URL",
      payload: { styleguideId: styleguide.id, url: parsed.data.url },
      workspaceId,
      priority: 50,
      maxAttempts: 1,
      idempotencyKey: `brandstyle-analyze:${analysisJobId}`,
      triggeredBy: "user",
    });

    return NextResponse.json({ jobId: styleguide.analysisJobId }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brandstyle/analyze/url]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
