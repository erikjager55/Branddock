import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// =============================================================
// GET /api/brandstyle/adobe-kit — fetch workspace-wide Adobe Fonts kit ID
// =============================================================
export async function GET() {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { adobeFontsKitId: true },
    });
    return NextResponse.json({ adobeFontsKitId: workspace?.adobeFontsKitId ?? null });
  } catch (error) {
    console.error("[GET /api/brandstyle/adobe-kit]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/brandstyle/adobe-kit — set / clear workspace-wide kit ID
//
// Body: { adobeFontsKitId: string | null }
//   - Pass "" or null to clear.
//   - Must be alphanumeric, max 32 chars.
// =============================================================
const patchSchema = z.object({
  adobeFontsKitId: z
    .string()
    .max(32)
    .regex(/^[a-z0-9]*$/i, "Kit ID must be alphanumeric")
    .nullable(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const kitId = parsed.data.adobeFontsKitId?.trim();
    const nextValue = kitId && kitId.length > 0 ? kitId : null;

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { adobeFontsKitId: nextValue },
      select: { adobeFontsKitId: true },
    });

    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    return NextResponse.json({ adobeFontsKitId: workspace.adobeFontsKitId });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/adobe-kit]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
