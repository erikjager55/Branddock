import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/brandstyle/colors — colors sectie
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
        colorDonts: true,
        colorsSavedForAi: true,
        colors: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!styleguide) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }

    return NextResponse.json({ colors: styleguide });
  } catch (error) {
    console.error("[GET /api/brandstyle/colors]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/brandstyle/colors — update color donts
// =============================================================
const updateColorsSchema = z.object({
  colorDonts: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateColorsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const styleguide = await prisma.brandStyleguide.update({
      where: { workspaceId },
      data: parsed.data,
      select: {
        colorDonts: true,
        colorsSavedForAi: true,
        colors: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ colors: styleguide });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/colors]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// POST /api/brandstyle/colors — voeg kleur toe
// =============================================================
const addColorSchema = z.object({
  name: z.string().min(1),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  rgb: z.string().optional(),
  hsl: z.string().optional(),
  cmyk: z.string().optional(),
  category: z.enum(["PRIMARY", "SECONDARY", "ACCENT", "NEUTRAL", "SEMANTIC"]).default("PRIMARY"),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  contrastWhite: z.string().optional(),
  contrastBlack: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      select: { id: true, colors: { select: { sortOrder: true }, orderBy: { sortOrder: "desc" }, take: 1 } },
    });

    if (!styleguide) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = addColorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const maxSort = styleguide.colors[0]?.sortOrder ?? -1;

    const color = await prisma.styleguideColor.create({
      data: {
        ...parsed.data,
        sortOrder: maxSort + 1,
        styleguideId: styleguide.id,
      },
    });

    return NextResponse.json({ color }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brandstyle/colors]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
