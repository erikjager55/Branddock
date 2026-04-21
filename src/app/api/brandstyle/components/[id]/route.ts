import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, requireAuth } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  label: z.string().max(200).optional(),
  extractedStyles: z.record(z.string(), z.unknown()).optional(),
  previewHtml: z.string().max(10_000).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// =============================================================
// PATCH /api/brandstyle/components/[id]
// =============================================================
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const { id } = await context.params;
    const existing = await prisma.styleguideComponent.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Component not found" }, { status: 404 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if ("extractedStyles" in data && data.extractedStyles) {
      // Prisma JSON needs proper type cast
      data.extractedStyles = data.extractedStyles as object;
    }

    const component = await prisma.styleguideComponent.update({
      where: { id },
      data,
    });

    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    return NextResponse.json({ component });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/components/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// DELETE /api/brandstyle/components/[id]
// =============================================================
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const { id } = await context.params;
    const existing = await prisma.styleguideComponent.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Component not found" }, { status: 404 });

    await prisma.styleguideComponent.delete({ where: { id } });

    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/brandstyle/components/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
