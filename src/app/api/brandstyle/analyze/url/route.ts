import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { analyzeUrl } from "@/lib/brandstyle/analysis-engine";

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

    // Start real analysis as fire-and-forget background task
    // The analysis engine updates DB status progressively;
    // frontend polls GET /api/brandstyle/analyze/status/[jobId]
    analyzeUrl(styleguide.id, parsed.data.url).catch((err) => {
      console.error("[analyze/url background] unhandled:", err);
    });

    return NextResponse.json({ jobId: styleguide.analysisJobId }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brandstyle/analyze/url]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
