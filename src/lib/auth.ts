import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { prisma } from "./prisma";
import { ac, owner, admin, member, viewer } from "./auth-permissions";
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
