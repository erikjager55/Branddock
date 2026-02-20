import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";

// OAuth provider IDs from Better Auth (stored in Account.providerId)
const OAUTH_PROVIDER_IDS = ['google', 'microsoft', 'apple'];

// =============================================================
// GET /api/settings/connected-accounts — List connected accounts
//
// Returns both:
// 1. S9 ConnectedAccount entries (Slack, manual integrations)
// 2. Better Auth Account entries for OAuth providers (google, microsoft, apple)
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

    // 1. Existing ConnectedAccount records (S9 integrations)
    const connectedAccounts = await prisma.connectedAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        status: true,
        connectedAt: true,
        providerUserId: true,
      },
    });

    // 2. Better Auth Account records for OAuth providers
    const oauthAccounts = await prisma.account.findMany({
      where: {
        userId,
        providerId: { in: OAUTH_PROVIDER_IDS },
      },
      select: {
        id: true,
        providerId: true,
        accountId: true,
        createdAt: true,
      },
    });

    // Map OAuth accounts to the same ConnectedAccountItem shape
    const oauthItems = oauthAccounts.map((acc) => ({
      id: `oauth-${acc.id}`,
      provider: acc.providerId,
      status: 'CONNECTED',
      connectedAt: acc.createdAt.toISOString(),
      providerUserId: acc.accountId,
    }));

    // Merge: OAuth providers first, then other integrations
    const accounts = [...oauthItems, ...connectedAccounts];

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("[GET /api/settings/connected-accounts]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
