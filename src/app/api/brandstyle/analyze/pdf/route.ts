import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";

// =============================================================
// POST /api/brandstyle/analyze/pdf — start PDF analyse
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
    }

    // Delete existing styleguide if present
    const existing = await prisma.brandStyleguide.findUnique({ where: { workspaceId } });
    if (existing) {
      await prisma.styleguideColor.deleteMany({ where: { styleguideId: existing.id } });
      await prisma.brandStyleguide.delete({ where: { id: existing.id } });
    }

    const styleguide = await prisma.brandStyleguide.create({
      data: {
        status: "ANALYZING",
        sourceType: "PDF",
        sourceFileName: file.name,
        analysisStatus: "SCANNING_STRUCTURE",
        analysisJobId: `job_${Date.now()}`,
        createdById: session.user.id,
        workspaceId,
      },
    });

    // Demo: simulate completion after delay (same as URL analysis)
    setTimeout(async () => {
      try {
        await prisma.brandStyleguide.update({
          where: { id: styleguide.id },
          data: { status: "COMPLETE", analysisStatus: "COMPLETE" },
        });
      } catch (e) {
        console.error("[analyze/pdf background]", e);
      }
    }, 8000);

    return NextResponse.json({ jobId: styleguide.analysisJobId }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brandstyle/analyze/pdf]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
