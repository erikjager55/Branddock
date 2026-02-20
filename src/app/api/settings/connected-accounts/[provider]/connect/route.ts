import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";

const VALID_PROVIDERS = ["GOOGLE", "SLACK", "MICROSOFT"] as const;

type RouteParams = { params: Promise<{ provider: string }> };

// =============================================================
// POST /api/settings/connected-accounts/[provider]/connect
// Stub OAuth connect — upsert ConnectedAccount with CONNECTED status
// =============================================================
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    const { provider } = await params;
    const upperProvider = provider.toUpperCase();

    if (!VALID_PROVIDERS.includes(upperProvider as (typeof VALID_PROVIDERS)[number])) {
      return NextResponse.json(
        { error: `Invalid provider: ${provider}. Valid: ${VALID_PROVIDERS.join(", ")}` },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const providerEnum = upperProvider as "GOOGLE" | "SLACK" | "MICROSOFT";

    const account = await prisma.connectedAccount.upsert({
      where: {
        userId_provider: { userId, provider: providerEnum },
      },
      update: {
        status: "CONNECTED",
        connectedAt: new Date(),
        providerUserId: `demo-${provider.toLowerCase()}-user`,
      },
      create: {
        userId,
        provider: providerEnum,
        status: "CONNECTED",
        connectedAt: new Date(),
        providerUserId: `demo-${provider.toLowerCase()}-user`,
      },
      select: {
        id: true,
        provider: true,
        status: true,
        connectedAt: true,
        providerUserId: true,
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error("[POST /api/settings/connected-accounts/:provider/connect]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
