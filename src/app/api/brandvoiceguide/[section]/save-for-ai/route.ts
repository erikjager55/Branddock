import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateBrandContext } from "@/lib/ai/brand-context";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

const SECTION_FIELD_MAP: Record<string, string> = {
  "voice-dna": "voiceDnaSavedForAi",
  vocabulary: "vocabularySavedForAi",
  "channel-tones": "channelTonesSavedForAi",
  "anti-patterns": "antiPatternsSavedForAi",
  references: "referencesSavedForAi",
  // Verhuisd uit Brandstyleguide.toneSavedForAi gesplitst (ADR 2026-05-15)
  guidelines: "guidelinesSavedForAi",
  "example-phrases": "examplePhrasesSavedForAi",
};

// =============================================================
// POST /api/brandvoiceguide/[section]/save-for-ai
// Body: { value?: boolean } — toggles the savedForAi flag.
//       Defaults to true when body omitted (matches brandstyle).
// =============================================================
export async function POST(
  request: NextRequest,
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

    let value = true;
    try {
      const body = await request.json();
      if (typeof body?.value === "boolean") value = body.value;
    } catch {
      // No body — keep default true
    }

    // Upsert: if voiceguide row missing, create with the toggled flag.
    const voiceguide = await prisma.brandVoiceguide.upsert({
      where: { workspaceId },
      update: { [field]: value },
      create: { workspaceId, [field]: value },
      select: { id: true, [field]: true },
    });

    invalidateBrandContext(workspaceId);
    invalidateCache(cacheKeys.prefixes.brandvoiceguide(workspaceId));

    return NextResponse.json({
      success: true,
      section,
      savedForAi: value,
      voiceguideId: voiceguide.id,
    });
  } catch (error) {
    console.error("[POST /api/brandvoiceguide/:section/save-for-ai]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
