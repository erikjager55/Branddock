import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/brandstyle/logo — logo sectie
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
        logoVariations: true,
        logoGuidelines: true,
        logoDonts: true,
        logoSavedForAi: true,
      },
    });

    if (!styleguide) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }

    return NextResponse.json({ logo: styleguide });
  } catch (error) {
    console.error("[GET /api/brandstyle/logo]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/brandstyle/logo — update logo
// =============================================================
const updateLogoSchema = z.object({
  logoVariations: z.any().optional(),
  logoGuidelines: z.array(z.string()).optional(),
  logoDonts: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateLogoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const styleguide = await prisma.brandStyleguide.update({
      where: { workspaceId },
      data: parsed.data,
      select: {
        logoVariations: true,
        logoGuidelines: true,
        logoDonts: true,
        logoSavedForAi: true,
      },
    });

    return NextResponse.json({ logo: styleguide });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/logo]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
