import { NextResponse } from "next/server";
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
// POST /api/settings/appearance/reset
// =============================================================
export async function POST() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const pref = await prisma.appearancePreference.upsert({
      where: { userId },
      update: APPEARANCE_DEFAULTS,
      create: {
        userId,
        ...APPEARANCE_DEFAULTS,
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
    console.error("[POST /api/settings/appearance/reset]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
