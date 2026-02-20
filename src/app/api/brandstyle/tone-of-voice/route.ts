import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/brandstyle/tone-of-voice — tone of voice sectie
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
        contentGuidelines: true,
        writingGuidelines: true,
        examplePhrases: true,
        toneSavedForAi: true,
      },
    });

    if (!styleguide) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }

    return NextResponse.json({ toneOfVoice: styleguide });
  } catch (error) {
    console.error("[GET /api/brandstyle/tone-of-voice]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/brandstyle/tone-of-voice — update tone of voice
// =============================================================
const updateToneSchema = z.object({
  contentGuidelines: z.array(z.string()).optional(),
  writingGuidelines: z.array(z.string()).optional(),
  examplePhrases: z.any().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateToneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const styleguide = await prisma.brandStyleguide.update({
      where: { workspaceId },
      data: parsed.data,
      select: {
        contentGuidelines: true,
        writingGuidelines: true,
        examplePhrases: true,
        toneSavedForAi: true,
      },
    });

    return NextResponse.json({ toneOfVoice: styleguide });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/tone-of-voice]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
