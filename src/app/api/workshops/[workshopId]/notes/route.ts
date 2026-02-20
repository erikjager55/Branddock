import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

type RouteParams = { params: Promise<{ workshopId: string }> };

const addNoteSchema = z.object({
  authorName: z.string().min(1),
  authorRole: z.string().optional(),
  content: z.string().min(1),
});

// =============================================================
// GET /api/workshops/[workshopId]/notes
// Get all notes
// =============================================================
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { workshopId } = await params;

    const workshop = await prisma.workshop.findFirst({
      where: { id: workshopId, workspaceId },
      select: { id: true },
    });

    if (!workshop) {
      return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
    }

    const notes = await prisma.workshopNote.findMany({
      where: { workshopId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("[GET /api/workshops/:workshopId/notes]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// POST /api/workshops/[workshopId]/notes
// Add a note
// =============================================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { workshopId } = await params;
    const body = await request.json();
    const parsed = addNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const workshop = await prisma.workshop.findFirst({
      where: { id: workshopId, workspaceId },
      select: { id: true },
    });

    if (!workshop) {
      return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
    }

    const note = await prisma.workshopNote.create({
      data: {
        workshopId,
        authorName: parsed.data.authorName,
        authorRole: parsed.data.authorRole ?? null,
        content: parsed.data.content,
      },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/workshops/:workshopId/notes]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
