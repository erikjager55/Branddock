import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { prisma } from "./prisma";
import { ac, owner, admin, member, viewer } from "./auth-permissions";
import { CANONICAL_BRAND_ASSETS, ACTIVE_RESEARCH_METHOD_TYPES } from "./constants/canonical-brand-assets";
import type { SocialProviders } from "better-auth/social-providers";

// ─── Build socialProviders config from env vars ────────────
// Each provider is only included when its env vars are set.
// This prevents runtime errors when credentials are missing.

function buildSocialProviders(): SocialProviders {
  const providers: SocialProviders = {};

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }

  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    providers.microsoft = {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    };
  }

  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
    providers.apple = {
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    };
  }

  return providers;
}

// ─── Auto-provision Organization + Workspace for new users ──

async function provisionNewUser(userId: string, userName: string) {
  // Check if user already has an organization
  const existing = await prisma.organizationMember.findFirst({
    where: { userId },
  });
  if (existing) return;

  const slug = `user-${userId.substring(0, 8).toLowerCase()}`;

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: `${userName}'s Brand`,
        slug,
        type: 'DIRECT',
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
        workspaces: {
          create: {
            name: `${userName}'s Workspace`,
            slug: `ws-${slug}`,
          },
        },
      },
      include: { workspaces: true },
    });

    const workspace = org.workspaces[0];
    if (!workspace) return;

    // Create 11 canonical brand assets with active research methods
    for (const asset of CANONICAL_BRAND_ASSETS) {
      await tx.brandAsset.create({
        data: {
          name: asset.name,
          slug: asset.slug,
          description: asset.description,
          category: asset.category as never,
          status: "DRAFT",
          frameworkType: asset.frameworkType,
          workspaceId: workspace.id,
          researchMethods: {
            create: ACTIVE_RESEARCH_METHOD_TYPES.map((method) => ({
              method: method as never,
              status: "AVAILABLE" as never,
              progress: 0,
            })),
          },
        },
      });
    }

    console.log(`[auth] Provisioned org ${org.id} + workspace + 11 brand assets for user ${userId}`);
  });
}

// ─── Sync OAuth tokens to WorkspaceIntegration ─────────────
// After OAuth login, Better Auth stores tokens in the Account table.
// This function copies them to WorkspaceIntegration for external API usage
// (e.g., Google Ads API). Uses upsert to handle re-authentication.

async function syncOAuthTokensToWorkspace(account: {
  userId: string;
  providerId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  scope?: string | null;
  accountId?: string | null;
}) {
  try {
    // Find the user's most recent org membership + email in one query
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: account.userId },
      orderBy: { joinedAt: 'desc' },
      select: {
        user: { select: { email: true } },
        organization: {
          select: {
            workspaces: { take: 1, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    const workspace = membership?.organization?.workspaces?.[0];
    if (!workspace) return;

    const email = membership?.user?.email;

    await prisma.workspaceIntegration.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: workspace.id,
          provider: account.providerId,
        },
      },
      create: {
        workspaceId: workspace.id,
        provider: account.providerId,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        tokenExpiry: account.accessTokenExpiresAt,
        scopes: account.scope,
        accountEmail: email ?? account.accountId,
        isActive: true,
      },
      update: {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        tokenExpiry: account.accessTokenExpiresAt,
        scopes: account.scope,
        accountEmail: email ?? account.accountId,
        isActive: true,
      },
    });

    console.log(`[auth] Synced ${account.providerId} OAuth tokens to workspace ${workspace.id}`);
  } catch (error) {
    // Non-critical: don't block login if token sync fails
    console.error('[auth] Failed to sync OAuth tokens to workspace:', error);
  }
}

// ─── Better Auth server config ─────────────────────────────

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: buildSocialProviders(),
  user: {
    modelName: "User",
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await provisionNewUser(user.id, user.name || user.email?.split('@')[0] || 'User');
        },
      },
    },
    account: {
      create: {
        after: async (account) => {
          // After OAuth login, sync tokens to WorkspaceIntegration for API usage
          if (account.providerId === 'credential') return;
          await syncOAuthTokensToWorkspace(account);
        },
      },
    },
  },
  plugins: [
    organization({
      ac,
      roles: { owner, admin, member, viewer },
      schema: {
        organization: {
          modelName: "Organization",
          fields: {
            logo: "logoUrl",
          },
        },
        member: {
          modelName: "OrganizationMember",
          fields: {
            createdAt: "joinedAt",
          },
        },
        invitation: {
          modelName: "Invitation",
          fields: {
            inviterId: "invitedById",
          },
        },
      },
    }),
    nextCookies(), // Must be last in plugins array
  ],
});
