import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, resolveWorkspaceId } from "@/lib/auth-server";
import { buildBrandKitBundle } from "@/lib/export/brand-kit-bundle";

// =============================================================
// GET /api/export/brand-kit-bundle — Brand Kit Bundle zip (W6)
//
// Eén download met de complete designbibliotheek in DTS Ede-anatomie:
// README/SKILL/DESIGN.md/tokens.css/tokens.json/fonts/assets/preview/
// ui_kit. Response-header X-Manifest-Version draagt het W7-contract.
// =============================================================

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse | Response> {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const bundle = await buildBrandKitBundle(workspaceId);
    if (!bundle) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });
    const filename = `${workspace?.slug ?? "workspace"}-brand-kit.zip`;

    return new Response(new Blob([bundle.zip as unknown as BlobPart]), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Manifest-Version": String(bundle.manifestVersion),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/export/brand-kit-bundle]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
