import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/brandstyle/ai-context — alle saved secties als AI prompt context
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      include: { colors: { orderBy: { sortOrder: "asc" } } },
    });

    if (!styleguide) {
      return NextResponse.json({ context: null });
    }

    const sections: Record<string, unknown> = {};

    if (styleguide.logoSavedForAi) {
      sections.logo = {
        variations: styleguide.logoVariations,
        guidelines: styleguide.logoGuidelines,
        donts: styleguide.logoDonts,
      };
    }

    if (styleguide.colorsSavedForAi) {
      sections.colors = {
        palette: styleguide.colors.map((c) => ({
          name: c.name,
          hex: c.hex,
          category: c.category,
          tags: c.tags,
        })),
        donts: styleguide.colorDonts,
      };
    }

    if (styleguide.typographySavedForAi) {
      sections.typography = {
        primaryFont: styleguide.primaryFontName,
        typeScale: styleguide.typeScale,
      };
    }

    if (styleguide.toneSavedForAi) {
      sections.toneOfVoice = {
        contentGuidelines: styleguide.contentGuidelines,
        writingGuidelines: styleguide.writingGuidelines,
        examplePhrases: styleguide.examplePhrases,
      };
    }

    if (styleguide.imagerySavedForAi) {
      sections.imagery = {
        photographyStyle: styleguide.photographyStyle,
        photographyGuidelines: styleguide.photographyGuidelines,
        illustrationGuidelines: styleguide.illustrationGuidelines,
        donts: styleguide.imageryDonts,
      };
    }

    return NextResponse.json({ context: sections });
  } catch (error) {
    console.error("[GET /api/brandstyle/ai-context]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
