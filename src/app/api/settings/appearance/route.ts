import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

const APPEARANCE_DEFAULTS = {
  theme: "SYSTEM" as const,
  accentColor: "TEAL" as const,
  language: "en",
  fontSize: "MEDIUM" as const,
  sidebarPosition: "LEFT" as const,
  compactMode: false,
  animations: true,
};

// =============================================================
// GET /api/settings/appearance
// =============================================================
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    let pref = await prisma.appearancePreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await prisma.appearancePreference.create({
        data: {
          userId,
          ...APPEARANCE_DEFAULTS,
        },
      });
    }

    return NextResponse.json({
      appearance: {
        theme: pref.theme,
        accentColor: pref.accentColor,
        language: pref.language,
        fontSize: pref.fontSize,
        sidebarPosition: pref.sidebarPosition,
        compactMode: pref.compactMode,
        animations: pref.animations,
      },
    });
  } catch (error) {
    console.error("[GET /api/settings/appearance]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]).optional(),
  accentColor: z
    .enum(["BLUE", "PURPLE", "GREEN", "ORANGE", "PINK", "TEAL"])
    .optional(),
  language: z.string().optional(),
  fontSize: z.enum(["SMALL", "MEDIUM", "LARGE"]).optional(),
  sidebarPosition: z.enum(["LEFT", "RIGHT"]).optional(),
  compactMode: z.boolean().optional(),
  animations: z.boolean().optional(),
});

// =============================================================
// PATCH /api/settings/appearance
// =============================================================
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const pref = await prisma.appearancePreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...APPEARANCE_DEFAULTS,
        ...data,
      },
    });

    return NextResponse.json({
      appearance: {
        theme: pref.theme,
        accentColor: pref.accentColor,
        language: pref.language,
        fontSize: pref.fontSize,
        sidebarPosition: pref.sidebarPosition,
        compactMode: pref.compactMode,
        animations: pref.animations,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/settings/appearance]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
