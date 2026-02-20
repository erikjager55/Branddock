import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";

// =============================================================
// GET /api/settings/email-preferences — Return email preferences
// =============================================================
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    const userId = session.user.id;

    let preferences = await prisma.emailPreference.findUnique({
      where: { userId },
    });

    // If none exist, create defaults (all true except marketing)
    if (!preferences) {
      preferences = await prisma.emailPreference.create({
        data: {
          userId,
          productUpdates: true,
          researchNotifications: true,
          teamActivity: true,
          marketing: false,
        },
      });
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("[GET /api/settings/email-preferences]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================
// PATCH /api/settings/email-preferences — Update email preferences
// =============================================================
const updatePreferencesSchema = z.object({
  productUpdates: z.boolean().optional(),
  researchNotifications: z.boolean().optional(),
  teamActivity: z.boolean().optional(),
  marketing: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const parsed = updatePreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const preferences = await prisma.emailPreference.upsert({
      where: { userId },
      update: parsed.data,
      create: {
        userId,
        productUpdates: parsed.data.productUpdates ?? true,
        researchNotifications: parsed.data.researchNotifications ?? true,
        teamActivity: parsed.data.teamActivity ?? true,
        marketing: parsed.data.marketing ?? false,
      },
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/settings/email-preferences]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
