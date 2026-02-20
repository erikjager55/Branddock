import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

const DEFAULT_MATRIX = {
  brandAssets: { email: true, browser: true, slack: false },
  personas: { email: true, browser: true, slack: false },
  research: { email: true, browser: true, slack: false },
  campaigns: { email: true, browser: true, slack: false },
  alignment: { email: true, browser: true, slack: false },
  teamActivity: { email: true, browser: true, slack: false },
  billing: { email: true, browser: false, slack: false },
  security: { email: true, browser: true, slack: false },
  productUpdates: { email: true, browser: false, slack: false },
  weeklyDigest: { email: true, browser: false, slack: false },
  aiAnalysis: { email: false, browser: true, slack: false },
  contentStudio: { email: false, browser: true, slack: false },
};

// =============================================================
// GET /api/settings/notifications
// =============================================================
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    let pref = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: {
          userId,
          emailEnabled: true,
          browserEnabled: true,
          slackEnabled: false,
          matrix: DEFAULT_MATRIX,
          quietHoursStart: null,
          quietHoursEnd: null,
          quietHoursEnabled: false,
        },
      });
    }

    return NextResponse.json({
      preferences: {
        emailEnabled: pref.emailEnabled,
        browserEnabled: pref.browserEnabled,
        slackEnabled: pref.slackEnabled,
        matrix: pref.matrix,
        quietHoursStart: pref.quietHoursStart,
        quietHoursEnd: pref.quietHoursEnd,
        quietHoursEnabled: pref.quietHoursEnabled,
      },
    });
  } catch (error) {
    console.error("[GET /api/settings/notifications]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  emailEnabled: z.boolean().optional(),
  browserEnabled: z.boolean().optional(),
  slackEnabled: z.boolean().optional(),
  matrix: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),
  quietHoursStart: z.string().nullable().optional(),
  quietHoursEnd: z.string().nullable().optional(),
  quietHoursEnabled: z.boolean().optional(),
});

// =============================================================
// PATCH /api/settings/notifications
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

    const updatePayload = {
      ...data,
      matrix: data.matrix
        ? (data.matrix as unknown as Prisma.InputJsonValue)
        : undefined,
    };

    const pref = await prisma.notificationPreference.upsert({
      where: { userId },
      update: updatePayload,
      create: {
        userId,
        emailEnabled: data.emailEnabled ?? true,
        browserEnabled: data.browserEnabled ?? true,
        slackEnabled: data.slackEnabled ?? false,
        matrix: (data.matrix ?? DEFAULT_MATRIX) as Prisma.InputJsonValue,
        quietHoursStart: data.quietHoursStart ?? null,
        quietHoursEnd: data.quietHoursEnd ?? null,
        quietHoursEnabled: data.quietHoursEnabled ?? false,
      },
    });

    return NextResponse.json({
      preferences: {
        emailEnabled: pref.emailEnabled,
        browserEnabled: pref.browserEnabled,
        slackEnabled: pref.slackEnabled,
        matrix: pref.matrix,
        quietHoursStart: pref.quietHoursStart,
        quietHoursEnd: pref.quietHoursEnd,
        quietHoursEnabled: pref.quietHoursEnabled,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/settings/notifications]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
