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

    // Delete existing styleguide if present (max 1 per workspace, atomic)
    const existing = await prisma.brandStyleguide.findUnique({ where: { workspaceId } });
    if (existing) {
      await prisma.$transaction([
        prisma.styleguideColor.deleteMany({ where: { styleguideId: existing.id } }),
        prisma.brandStyleguide.delete({ where: { id: existing.id } }),
      ]);
    }

    // Create new styleguide in ANALYZING state
    const styleguide = await prisma.brandStyleguide.create({
      data: {
        status: "ANALYZING",
        sourceType: "URL",
        sourceUrl: parsed.data.url,
        analysisStatus: "SCANNING_STRUCTURE",
        analysisJobId: `job_${crypto.randomUUID()}`,
        createdById: session.user.id,
        workspaceId,
      },
    });

    // Serverless-safe: op de AgentJob-queue i.p.v. fire-and-forget (dat wordt op
    // Vercel gekild na de response). De analyse-engine schrijft analysisStatus
    // progressief naar de DB; frontend blijft GET /analyze/status/[jobId] pollen.
    // maxAttempts:1 — analyse is duur (AI-calls) + de route is destructief; bij
    // falen landt de engine op ERROR en laat de user opnieuw triggeren.
    await dispatchJob({
      type: "BRANDSTYLE_ANALYZE_URL",
      payload: { styleguideId: styleguide.id, url: parsed.data.url },
      workspaceId,
      priority: 50,
      maxAttempts: 1,
      idempotencyKey: `brandstyle-analyze:${styleguide.id}`,
      triggeredBy: "user",
    });

    return NextResponse.json({ jobId: styleguide.analysisJobId }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brandstyle/analyze/url]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
