import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { withAiRateLimit } from "@/lib/ai/middleware";
import { dispatchJob } from "@/lib/agents/jobs/dispatch";
import { getStorageProvider } from "@/lib/storage";

// =============================================================
// POST /api/brandstyle/analyze/pdf — start PDF analyse
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
    }

    // Limit file size to 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 20MB limit" }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Delete existing styleguide if present (atomic)
    const existing = await prisma.brandStyleguide.findUnique({ where: { workspaceId } });
    if (existing) {
      await prisma.$transaction([
        prisma.styleguideColor.deleteMany({ where: { styleguideId: existing.id } }),
        prisma.brandStyleguide.delete({ where: { id: existing.id } }),
      ]);
    }

    const styleguide = await prisma.brandStyleguide.create({
      data: {
        status: "ANALYZING",
        sourceType: "PDF",
        sourceFileName: file.name,
        analysisStatus: "SCANNING_STRUCTURE",
        analysisJobId: `job_${crypto.randomUUID()}`,
        createdById: session.user.id,
        workspaceId,
      },
    });

    // Serverless-safe: persist de PDF naar storage (de buffer overleeft de
    // function-freeze niet) + verwerk via de AgentJob-queue i.p.v. fire-and-forget.
    const { url: fileUrl } = await getStorageProvider().upload(buffer, {
      workspaceId,
      fileName: file.name,
      contentType: "application/pdf",
      generateThumbnail: false,
    });
    await dispatchJob({
      type: "BRANDSTYLE_ANALYZE_PDF",
      payload: { styleguideId: styleguide.id, fileUrl, fileName: file.name },
      workspaceId,
      priority: 50,
      maxAttempts: 1,
      idempotencyKey: `brandstyle-analyze:${styleguide.id}`,
      triggeredBy: "user",
    });

    return NextResponse.json({ jobId: styleguide.analysisJobId }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brandstyle/analyze/pdf]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
