import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

const DESIGN_LANGUAGE_SELECT = {
  graphicElements: true,
  graphicElementsDonts: true,
  patternsTextures: true,
  iconographyStyle: true,
  iconographyDonts: true,
  gradientsEffects: true,
  layoutPrinciples: true,
  designLanguageSavedForAi: true,
} as const;

// =============================================================
// GET /api/brandstyle/design-language — design language section
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      select: DESIGN_LANGUAGE_SELECT,
    });

    if (!styleguide) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }

    return NextResponse.json({ designLanguage: styleguide });
  } catch (error) {
    console.error("[GET /api/brandstyle/design-language]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/brandstyle/design-language — update design language
// =============================================================
const updateDesignLanguageSchema = z.object({
  graphicElements: z.any().optional(),
  graphicElementsDonts: z.array(z.string()).optional(),
  patternsTextures: z.any().optional(),
  iconographyStyle: z.any().optional(),
  iconographyDonts: z.array(z.string()).optional(),
  gradientsEffects: z.any().optional(),
  layoutPrinciples: z.any().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateDesignLanguageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const styleguide = await prisma.brandStyleguide.update({
      where: { workspaceId },
      data: parsed.data,
      select: DESIGN_LANGUAGE_SELECT,
    });

    return NextResponse.json({ designLanguage: styleguide });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/design-language]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
