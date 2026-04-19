import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, requireAuth } from "@/lib/auth-server";
import { getStorageProvider } from "@/lib/storage";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  variant: z.enum(["PRIMARY", "LIGHT", "DARK", "ICON", "WORDMARK", "LOCKUP"]).optional(),
  description: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// =============================================================
// PATCH /api/brandstyle/logos/[id] — update metadata
// =============================================================
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const { id } = await context.params;
    const existing = await prisma.styleguideLogo.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Logo not found" }, { status: 404 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const logo = await prisma.styleguideLogo.update({
      where: { id },
      data: parsed.data,
    });

    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ logo });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/logos/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// DELETE /api/brandstyle/logos/[id] — remove record + stored file
// =============================================================
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const { id } = await context.params;
    const existing = await prisma.styleguideLogo.findFirst({
      where: { id, workspaceId },
      select: { id: true, fileUrl: true },
    });
    if (!existing) return NextResponse.json({ error: "Logo not found" }, { status: 404 });

    await prisma.styleguideLogo.delete({ where: { id } });

    if (existing.fileUrl) {
      try {
        await getStorageProvider().delete(existing.fileUrl);
      } catch (err) {
        console.warn("[DELETE logo] storage cleanup failed:", err);
      }
    }

    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/brandstyle/logos/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
