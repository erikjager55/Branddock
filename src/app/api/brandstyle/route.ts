import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/brandstyle — haal styleguide op (max 1 per workspace)
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      include: {
        colors: { orderBy: { sortOrder: "asc" } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        lockedBy: { select: { id: true, name: true } },
      },
    });

    if (!styleguide) {
      return NextResponse.json({ styleguide: null });
    }

    return NextResponse.json({ styleguide });
  } catch (error) {
    console.error("[GET /api/brandstyle]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/brandstyle — update hele styleguide
// =============================================================
const updateSchema = z.object({
  logoVariations: z.any().optional(),
  logoGuidelines: z.array(z.string()).optional(),
  logoDonts: z.array(z.string()).optional(),
  colorDonts: z.array(z.string()).optional(),
  primaryFontName: z.string().optional(),
  primaryFontUrl: z.string().optional(),
  typeScale: z.any().optional(),
  contentGuidelines: z.array(z.string()).optional(),
  writingGuidelines: z.array(z.string()).optional(),
  examplePhrases: z.any().optional(),
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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const styleguide = await prisma.brandStyleguide.update({
      where: { workspaceId },
      data: parsed.data,
      include: {
        colors: { orderBy: { sortOrder: "asc" } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        lockedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ styleguide });
  } catch (error) {
    console.error("[PATCH /api/brandstyle]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
