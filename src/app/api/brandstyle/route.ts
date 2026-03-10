import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/brandstyle — fetch styleguide (max 1 per workspace)
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
const iconographyStyleSchema = z.object({
  style: z.string().optional(),
  strokeWeight: z.string().optional(),
  cornerRadius: z.string().optional(),
  sizing: z.string().optional(),
  colorUsage: z.string().optional(),
  usageNotes: z.string().optional(),
}).nullable().optional();

const layoutPrinciplesSchema = z.object({
  gridSystem: z.string().optional(),
  spacingScale: z.string().optional(),
  whitespacePhilosophy: z.string().optional(),
  compositionRules: z.array(z.string()).optional(),
  usageNotes: z.string().optional(),
}).nullable().optional();

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

const gradientDefinitionSchema = z.object({
  name: z.string(),
  type: z.string(),
  colors: z.array(z.string()),
  angle: z.string().optional(),
  usage: z.string().optional(),
});

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
  brandImages: z.any().optional(),
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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Convert null → Prisma.JsonNull for nullable JSON fields
    const NULLABLE_JSON_FIELDS = [
      "logoVariations", "typeScale", "examplePhrases", "photographyStyle", "brandImages",
      "graphicElements", "patternsTextures", "iconographyStyle", "gradientsEffects", "layoutPrinciples",
    ] as const;
    const data: Record<string, unknown> = { ...parsed.data };
    for (const key of NULLABLE_JSON_FIELDS) {
      if (key in data && data[key] === null) {
        data[key] = Prisma.JsonNull;
      }
    }

    const styleguide = await prisma.brandStyleguide.update({
      where: { workspaceId },
      data,
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
