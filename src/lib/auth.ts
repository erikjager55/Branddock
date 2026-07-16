import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { prisma } from "./prisma";
import { ac, owner, admin, member, viewer } from "./auth-permissions";
import { CANONICAL_BRAND_ASSETS, ACTIVE_RESEARCH_METHOD_TYPES } from "./constants/canonical-brand-assets";
import { TRIAL_CREDITS, TRIAL_DAYS } from "./constants/plan-limits";
import { grantCredits } from "./billing/credits/ledger";
import { isCreditsEnabled } from "./stripe/feature-flags";
import { checkAuthEmailRateLimit } from "./auth/auth-rate-limiter";
import { redis } from "./redis";
import { trySendTransactional } from "./email/transactional";
import { canonicalizeEmailUrl } from "./email/base-url";
import { resolveEmailLocale } from "./email/email-locale";
import { renderPasswordResetEmail } from "./email/templates/password-reset";
import { renderEmailVerificationEmail } from "./email/templates/email-verification";
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

  const orgId = await prisma.$transaction(async (tx) => {
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
    if (!workspace) return null;

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
    return org.id;
  });

  // Trial-grant (reverse-trial, Fase 3): een nieuwe org krijgt TRIAL_CREDITS voor
  // TRIAL_DAYS dagen. Alleen bij credits-aan — tot de credit-launch is de app gratis
  // en bestaande gebruikers krijgen `unlimitedCredits`. Idempotent (key per org) +
  // fail-soft: een gefaalde grant mag het provisionen van een gebruiker nooit breken.
  if (orgId && isCreditsEnabled()) {
    try {
      await grantCredits({
        organizationId: orgId,
        credits: TRIAL_CREDITS,
        type: 'TRIAL_GRANT',
        reason: `${TRIAL_DAYS}-daagse reverse-trial`,
        idempotencyKey: `trial:${orgId}`,
      });
      // updateMany met null-guard: alleen zetten als de trial-klok nog niet loopt,
      // zodat een retry van provisionNewUser de 28-daagse termijn niet reset.
      await prisma.organization.updateMany({
        where: { id: orgId, trialEndsAt: null },
        data: { trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000) },
      });
    } catch (e) {
      console.warn('[auth] trial-grant failed (swallowed)', {
        orgId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
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

/**
 * Trusted origins voor CSRF/cookie-acceptatie. Zonder dit vertrouwt Better Auth
 * alleen de BETTER_AUTH_URL-origin → preview-deploys (*.vercel.app) + het www-
 * marketingdomein zouden falen op auth. Env-driven; wildcard alleen op preview.
 *
 * NB (2026-07-16): de canonieke app-host (NEXT_PUBLIC_APP_URL) MOET hier
 * expliciet bij — BETTER_AUTH_URL is op prod bewust leeg (host-inferentie),
 * en na de domein-cutover weigerde Better Auth logins op app.branddock.app
 * met "Invalid origin" (403), terwijl de legacy *.vercel.app-host wél werkte.
 * Gebruikers vielen daardoor stilletjes terug op oude bookmarks.
 */
function buildTrustedOrigins(): string[] {
  const origins = new Set<string>();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) origins.add(appUrl.replace(/\/$/, ""));
  const marketing = process.env.NEXT_PUBLIC_MARKETING_URL;
  if (marketing) origins.add(marketing.replace(/\/$/, ""));
  if (process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV !== "production") {
    origins.add("https://*.vercel.app");
  }
  return Array.from(origins);
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: buildTrustedOrigins(),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }, request) => {
      // Canonicaliseer naar de app-host: Better Auth bouwt de url op de
      // request-origin (host-inferentie), dus zonder dit krijgen gebruikers
      // op een legacy-host (*.vercel.app) die host in hun mail.
      const { subject, html, text } = renderPasswordResetEmail({
        recipientEmail: user.email,
        userName: user.name ?? undefined,
        resetUrl: canonicalizeEmailUrl(url),
        locale: await resolveEmailLocale(user.id, request),
      });
      await trySendTransactional({
        to: user.email,
        subject,
        html,
        text,
        tags: { kind: "password_reset" },
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }, request) => {
      // Nieuwe gebruikers hebben nog geen voorkeur-rij → Accept-Language-fallback.
      const { subject, html, text } = renderEmailVerificationEmail({
        recipientEmail: user.email,
        userName: user.name ?? undefined,
        verifyUrl: canonicalizeEmailUrl(url),
        locale: await resolveEmailLocale(user.id, request),
      });
      await trySendTransactional({
        to: user.email,
        subject,
        html,
        text,
        tags: { kind: "email_verification" },
      });
    },
  },
  socialProviders: buildSocialProviders(),
  user: {
    modelName: "User",
  },
  // Per-IP rate limits on auth endpoints (brute-force defense).
  // Uses secondaryStorage (Redis) when UPSTASH_REDIS_REST_URL is set,
  // falls back to Better Auth's in-memory store in local dev.
  ...(redis
    ? {
        secondaryStorage: {
          get: async (key: string) => {
            const value = await redis!.get<string>(key);
            return value ?? null;
          },
          set: async (key: string, value: string, ttl?: number) => {
            if (ttl) {
              await redis!.set(key, value, { ex: ttl });
            } else {
              await redis!.set(key, value);
            }
          },
          delete: async (key: string) => {
            await redis!.del(key);
          },
        },
      }
    : {}),
  rateLimit: {
    enabled: true,
    storage: redis ? ("secondary-storage" as const) : undefined,
    customRules: {
      "/sign-in/email": { window: 900, max: 10 },
      "/sign-up/email": { window: 900, max: 5 },
      "/sign-in/social": { window: 900, max: 10 },
      "/forget-password": { window: 900, max: 5 },
      "/reset-password": { window: 900, max: 5 },
    },
  },
  hooks: {
    // Per-email rate limit (credential-stuffing defense) on top of Better Auth's per-IP rule.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email" && ctx.path !== "/sign-up/email") return;
      const email = (ctx.body as { email?: unknown } | undefined)?.email;
      if (typeof email !== "string" || email.length === 0) return;
      const result = await checkAuthEmailRateLimit(email);
      if (!result.allowed) {
        const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));
        throw new APIError("TOO_MANY_REQUESTS", {
          message: "Too many attempts for this email. Please try again later.",
          retryAfter,
        });
      }
    }),
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
