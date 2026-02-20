import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { fetchContextData } from "@/lib/ai/knowledge-context-fetcher";

// ─── GET /api/personas/[id]/chat/[sessionId]/context ─────────
// List current context items for the session
// ──────────────────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: personaId, sessionId } = await params;

    // Verify session belongs to this persona and workspace
    const chatSession = await prisma.personaChatSession.findFirst({
      where: { id: sessionId, personaId, workspaceId },
    });
    if (!chatSession) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
    }

    const items = await prisma.personaChatContext.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        sourceName: item.sourceName,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/personas/:id/chat/:sessionId/context]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/personas/[id]/chat/[sessionId]/context ────────
// Add context items to the session
// Body: { items: [{ sourceType, sourceId }] }
// ──────────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: personaId, sessionId } = await params;

    // Verify session
    const chatSession = await prisma.personaChatSession.findFirst({
      where: { id: sessionId, personaId, workspaceId },
    });
    if (!chatSession) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
    }

    const body = await request.json();
    const { items } = body as {
      items: Array<{ sourceType: string; sourceId: string }>;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items array is required and must not be empty" },
        { status: 400 },
      );
    }

    const created: Array<{
      id: string;
      sourceType: string;
      sourceId: string;
      sourceName: string;
    }> = [];

    for (const item of items) {
      // Fetch context data snapshot
      const contextResult = await fetchContextData(
        item.sourceType,
        item.sourceId,
        workspaceId,
      );
      if (!contextResult) continue; // Skip items that don't exist or aren't accessible

      const jsonData = contextResult.contextData as Prisma.InputJsonValue;

      // Upsert to skip existing (unique constraint on sessionId+sourceType+sourceId)
      const record = await prisma.personaChatContext.upsert({
        where: {
          sessionId_sourceType_sourceId: {
            sessionId,
            sourceType: item.sourceType,
            sourceId: item.sourceId,
          },
        },
        create: {
          sessionId,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          sourceName: contextResult.name,
          contextData: jsonData,
        },
        update: {
          // Refresh the snapshot on re-add
          sourceName: contextResult.name,
          contextData: jsonData,
        },
      });

      created.push({
        id: record.id,
        sourceType: record.sourceType,
        sourceId: record.sourceId,
        sourceName: record.sourceName,
      });
    }

    return NextResponse.json({ items: created }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/personas/:id/chat/:sessionId/context]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/personas/[id]/chat/[sessionId]/context ──────
// Remove a context item by contextId query param
// ──────────────────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id: personaId, sessionId } = await params;

    // Verify session
    const chatSession = await prisma.personaChatSession.findFirst({
      where: { id: sessionId, personaId, workspaceId },
    });
    if (!chatSession) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
    }

    const contextId = request.nextUrl.searchParams.get("contextId");
    if (!contextId) {
      return NextResponse.json(
        { error: "contextId query param is required" },
        { status: 400 },
      );
    }

    // Verify context item exists in this session
    const contextItem = await prisma.personaChatContext.findFirst({
      where: { id: contextId, sessionId },
    });
    if (!contextItem) {
      return NextResponse.json({ error: "Context item not found" }, { status: 404 });
    }

    await prisma.personaChatContext.delete({
      where: { id: contextId },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/personas/:id/chat/:sessionId/context]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
