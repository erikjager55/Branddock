import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

const SECTION_FIELD_MAP: Record<string, string> = {
  logo: "logoSavedForAi",
  colors: "colorsSavedForAi",
  typography: "typographySavedForAi",
  "tone-of-voice": "toneSavedForAi",
  imagery: "imagerySavedForAi",
};

// =============================================================
// POST /api/brandstyle/[section]/save-for-ai — markeer savedForAi=true
// =============================================================
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { section } = await params;
    const field = SECTION_FIELD_MAP[section];

    if (!field) {
      return NextResponse.json(
        { error: `Invalid section: ${section}. Valid: ${Object.keys(SECTION_FIELD_MAP).join(", ")}` },
        { status: 400 }
      );
    }

    const styleguide = await prisma.brandStyleguide.update({
      where: { workspaceId },
      data: { [field]: true },
      select: { id: true, [field]: true },
    });

    return NextResponse.json({ success: true, section, savedForAi: true, styleguideId: styleguide.id });
  } catch (error) {
    console.error("[POST /api/brandstyle/:section/save-for-ai]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
