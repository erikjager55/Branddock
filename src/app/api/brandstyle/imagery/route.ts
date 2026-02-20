import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/brandstyle/imagery — imagery sectie
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
      data: parsed.data,
      select: {
        photographyStyle: true,
        photographyGuidelines: true,
        illustrationGuidelines: true,
        imageryDonts: true,
        imagerySavedForAi: true,
      },
    });

    return NextResponse.json({ imagery: styleguide });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/imagery]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
