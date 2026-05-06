import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { applyFixOption } from "@/lib/alignment/fix-generator";
import { prisma } from "@/lib/prisma";
import { emitLearningEvent } from "@/lib/learning-loop";

type RouteParams = { params: Promise<{ id: string }> };

const applyFixSchema = z.object({
  optionKey: z.enum(["A", "B", "C"]),
});

// =============================================================
// POST /api/alignment/issues/:id/fix — apply selected fix option
// =============================================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = applyFixSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const session = await getServerSession();
    const result = await applyFixOption(id, parsed.data.optionKey, workspaceId, session?.user?.id);

    // Learning Loop event emission (cat 9) — needs scanId from issue record
    const issue = await prisma.alignmentIssue.findUnique({
      where: { id },
      select: { scanId: true },
    });
    if (issue) {
      void emitLearningEvent({
        workspaceId,
        userId: session?.user?.id ?? null,
        payload: {
          type: 'alignment.fix_applied',
          data: {
            issueId: id,
            scanId: issue.scanId,
            fixOption: parsed.data.optionKey,
          },
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Issue not found or already resolved") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("[POST /api/alignment/issues/:id/fix]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
