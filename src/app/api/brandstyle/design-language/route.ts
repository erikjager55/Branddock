import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
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
const graphicElementsSchema = z.object({
  brandShapes: z.array(z.string()).optional(),
  decorativeElements: z.array(z.string()).optional(),
  visualDevices: z.array(z.string()).optional(),
  usageNotes: z.string().optional(),
}).nullable().optional();

const patternsTexturesSchema = z.object({
  patterns: z.array(z.string()).optional(),
  textures: z.array(z.string()).optional(),
  backgrounds: z.array(z.string()).optional(),
  usageNotes: z.string().optional(),
}).nullable().optional();

const iconographyStyleSchema = z.object({
  style: z.string().optional(),
  strokeWeight: z.string().optional(),
  cornerRadius: z.string().optional(),
  sizing: z.string().optional(),
  colorUsage: z.string().optional(),
  usageNotes: z.string().optional(),
}).nullable().optional();

const gradientDefinitionSchema = z.object({
  name: z.string(),
  type: z.string(),
  colors: z.array(z.string()),
  angle: z.string().optional(),
  usage: z.string().optional(),
});

const layoutPrinciplesSchema = z.object({
  gridSystem: z.string().optional(),
  spacingScale: z.string().optional(),
  whitespacePhilosophy: z.string().optional(),
  compositionRules: z.array(z.string()).optional(),
  usageNotes: z.string().optional(),
}).nullable().optional();

const updateDesignLanguageSchema = z.object({
  graphicElements: graphicElementsSchema,
  graphicElementsDonts: z.array(z.string()).optional(),
  patternsTextures: patternsTexturesSchema,
  iconographyStyle: iconographyStyleSchema,
  iconographyDonts: z.array(z.string()).optional(),
  gradientsEffects: z.array(gradientDefinitionSchema).nullable().optional(),
  layoutPrinciples: layoutPrinciplesSchema,
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

    // Convert null → Prisma.JsonNull for nullable JSON fields
    const JSON_FIELDS = ["graphicElements", "patternsTextures", "iconographyStyle", "gradientsEffects", "layoutPrinciples"] as const;
    const data: Record<string, unknown> = { ...parsed.data };
    for (const key of JSON_FIELDS) {
      if (key in data && data[key] === null) {
        data[key] = Prisma.JsonNull;
      }
    }

    const styleguide = await prisma.brandStyleguide.update({
      where: { workspaceId },
      data,
      select: DESIGN_LANGUAGE_SELECT,
    });

    return NextResponse.json({ designLanguage: styleguide });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/design-language]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
