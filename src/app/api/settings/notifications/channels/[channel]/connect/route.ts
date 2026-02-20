import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

type RouteParams = { params: Promise<{ channel: string }> };

const VALID_CHANNELS = ["slack", "email", "browser"] as const;
type Channel = (typeof VALID_CHANNELS)[number];

// =============================================================
// POST /api/settings/notifications/channels/:channel/connect
// =============================================================
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { channel } = await params;

    if (!VALID_CHANNELS.includes(channel as Channel)) {
      return NextResponse.json(
        {
          error: `Invalid channel "${channel}". Must be one of: ${VALID_CHANNELS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Slack: stub — integration coming soon
    if (channel === "slack") {
      return NextResponse.json({
        success: true,
        message: "Slack integration coming soon",
        status: "pending",
      });
    }

    // Email or browser: enable the corresponding field
    const enabledField =
      channel === "email" ? "emailEnabled" : "browserEnabled";

    await prisma.notificationPreference.upsert({
      where: { userId },
      update: { [enabledField]: true },
      create: {
        userId,
        emailEnabled: true,
        browserEnabled: true,
        slackEnabled: false,
        matrix: {},
        quietHoursEnabled: false,
        [enabledField]: true,
      },
    });

    return NextResponse.json({
      success: true,
      channel,
      connected: true,
    });
  } catch (error) {
    console.error(
      "[POST /api/settings/notifications/channels/:channel/connect]",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
