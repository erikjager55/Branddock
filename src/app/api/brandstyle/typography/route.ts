import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/brandstyle/typography — typography sectie
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
        primaryFontName: true,
        primaryFontUrl: true,
        typeScale: true,
        typographySavedForAi: true,
      },
    });

    if (!styleguide) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }

    return NextResponse.json({ typography: styleguide });
  } catch (error) {
    console.error("[GET /api/brandstyle/typography]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/brandstyle/typography — update typography
// =============================================================
const updateTypographySchema = z.object({
  primaryFontName: z.string().optional(),
  primaryFontUrl: z.string().optional(),
  typeScale: z.any().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateTypographySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const styleguide = await prisma.brandStyleguide.update({
      where: { workspaceId },
      data: parsed.data,
      select: {
        primaryFontName: true,
        primaryFontUrl: true,
        typeScale: true,
        typographySavedForAi: true,
      },
    });

    return NextResponse.json({ typography: styleguide });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/typography]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
