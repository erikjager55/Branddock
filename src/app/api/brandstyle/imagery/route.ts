import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { resolveFieldClaims } from "@/lib/brandstyle/claim-fields";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// =============================================================
// GET /api/brandstyle/imagery — imagery section
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      select: {
        photographyStyle: true,
        photographyGuidelines: true,
        illustrationGuidelines: true,
        imageryDonts: true,
        imagerySavedForAi: true,
        brandImages: true,
      },
    });

    if (!styleguide) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }

    return NextResponse.json({ imagery: styleguide });
  } catch (error) {
    console.error("[GET /api/brandstyle/imagery]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/brandstyle/imagery — update imagery
// =============================================================
const updateImagerySchema = z.object({
  photographyStyle: z.any().optional(),
  photographyGuidelines: z.array(z.string()).optional(),
  illustrationGuidelines: z.array(z.string()).optional(),
  imageryDonts: z.array(z.string()).optional(),
  brandImages: z.any().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateImagerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const styleguide = await prisma.brandStyleguide.update({
      where: { workspaceId },
      // Claim de geschreven velden zodat de volgende re-analyse ze niet
      // overschrijft (W5). Zonder deze regel is `userEditedFields` een vlag
      // zonder schrijver — precies wat de `*Override`-vlaggen waren.
      data: { ...parsed.data, ...(await resolveFieldClaims(workspaceId, parsed.data)) },
      select: {
        photographyStyle: true,
        photographyGuidelines: true,
        illustrationGuidelines: true,
        imageryDonts: true,
        imagerySavedForAi: true,
        brandImages: true,
      },
    });

    // CLAUDE.md #10: elke mutatieroute invalideert de brandstyle-cache. Deze
    // sectie-routes deden dat als enige niet, waardoor de AI-paden na een
    // curatie nog een cache-TTL lang met de oude merkdata werkten.
    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ imagery: styleguide });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/imagery]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
