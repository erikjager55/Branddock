import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/brandstyle/logo — logo section
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
        logos: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            variant: true,
            fileUrl: true,
            fileName: true,
            fileType: true,
            description: true,
            width: true,
            height: true,
            sortOrder: true,
          },
        },
        logoGuidelines: true,
        logoDonts: true,
        logoSavedForAi: true,
      },
    });

    if (!styleguide) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }

    // Legacy response shape: callers expect `logoVariations` array of { name, url, type }
    return NextResponse.json({
      logo: {
        logoVariations: styleguide.logos.map((l) => ({
          id: l.id,
          name: l.description ?? l.fileName,
          url: l.fileUrl,
          type: l.variant,
        })),
        logoGuidelines: styleguide.logoGuidelines,
        logoDonts: styleguide.logoDonts,
        logoSavedForAi: styleguide.logoSavedForAi,
      },
    });
  } catch (error) {
    console.error("[GET /api/brandstyle/logo]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/brandstyle/logo — update logo
// =============================================================
// PATCH only handles guidelines/donts. Logo files zelf worden beheerd via
// `POST /api/brandstyle/logos` en `DELETE /api/brandstyle/logos/[id]` (Fase 1).
const updateLogoSchema = z.object({
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

    await prisma.brandStyleguide.update({
      where: { workspaceId },
      data: parsed.data,
    });

    // Return fresh payload in legacy shape for compat with existing callers.
    const fresh = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      select: {
        logos: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, variant: true, fileUrl: true, fileName: true, description: true },
        },
        logoGuidelines: true,
        logoDonts: true,
        logoSavedForAi: true,
      },
    });

    return NextResponse.json({
      logo: {
        logoVariations: fresh?.logos.map((l) => ({
          id: l.id,
          name: l.description ?? l.fileName,
          url: l.fileUrl,
          type: l.variant,
        })) ?? [],
        logoGuidelines: fresh?.logoGuidelines ?? [],
        logoDonts: fresh?.logoDonts ?? [],
        logoSavedForAi: fresh?.logoSavedForAi ?? false,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/logo]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
