import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

type RouteParams = { params: Promise<{ assetId: string }> };

/**
 * POST /api/research/validate/[assetId] — mark a completed research method as
 * VALIDATED so it stops appearing in the "Pending validation" list.
 *
 * The `assetId` URL segment uses the discriminator format produced by the
 * pending-validation endpoint:
 *   - `ba-{methodId}` → BrandAssetResearchMethod
 *   - `p-{methodId}`  → PersonaResearchMethod
 *
 * Workspace ownership is enforced via the relation join. Returns 404 when the
 * id format is unrecognised, the method does not exist, or it belongs to
 * another workspace.
 */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { assetId } = await params;

    // Parse prefix to determine which table to update
    let kind: "BRAND_ASSET" | "PERSONA";
    let methodId: string;
    if (assetId.startsWith("ba-")) {
      kind = "BRAND_ASSET";
      methodId = assetId.slice(3);
    } else if (assetId.startsWith("p-")) {
      kind = "PERSONA";
      methodId = assetId.slice(2);
    } else {
      return NextResponse.json(
        { error: "Invalid assetId format. Expected 'ba-{id}' or 'p-{id}'." },
        { status: 400 },
      );
    }

    if (!methodId) {
      return NextResponse.json({ error: "Empty method id" }, { status: 400 });
    }

    if (kind === "BRAND_ASSET") {
      const method = await prisma.brandAssetResearchMethod.findFirst({
        where: { id: methodId, brandAsset: { workspaceId } },
        select: { id: true, status: true, brandAssetId: true },
      });
      if (!method) {
        return NextResponse.json({ error: "Research method not found" }, { status: 404 });
      }
      if (method.status !== "COMPLETED") {
        return NextResponse.json(
          { error: `Cannot validate — method is ${method.status}, expected COMPLETED.` },
          { status: 409 },
        );
      }
      await prisma.brandAssetResearchMethod.update({
        where: { id: methodId },
        data: { status: "VALIDATED" },
      });

      invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

      return NextResponse.json({
        validated: true,
        kind,
        methodId,
        assetId: method.brandAssetId,
      });
    }

    // PERSONA
    const method = await prisma.personaResearchMethod.findFirst({
      where: { id: methodId, persona: { workspaceId } },
      select: { id: true, status: true, personaId: true },
    });
    if (!method) {
      return NextResponse.json({ error: "Research method not found" }, { status: 404 });
    }
    if (method.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Cannot validate — method is ${method.status}, expected COMPLETED.` },
        { status: 409 },
      );
    }
    await prisma.personaResearchMethod.update({
      where: { id: methodId },
      data: { status: "VALIDATED" },
    });

    invalidateCache(cacheKeys.prefixes.personas(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      validated: true,
      kind,
      methodId,
      assetId: method.personaId,
    });
  } catch (error) {
    console.error("[POST /api/research/validate/[assetId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
