import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { organization, mcp } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { prisma } from "./prisma";
import { ac, owner, admin, member, viewer } from "./auth-permissions";
import { CANONICAL_BRAND_ASSETS, ACTIVE_RESEARCH_METHOD_TYPES } from "./constants/canonical-brand-assets";
import { ensureBrandWithDefaultProfile, resolveInitialLocale } from "./content-locale/default-profile";
import { TRIAL_CREDITS, TRIAL_DAYS } from "./constants/plan-limits";
import { grantCredits } from "./billing/credits/ledger";
import { isCreditsEnabled } from "./stripe/feature-flags";
import { checkAuthEmailRateLimit, authRateLimitMax } from "./auth/auth-rate-limiter";
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

    // Content-locale anker (ADR 2026-07-16). Dit pad maakte tot 2026-07-16 géén Brand +
    // default-profiel aan, terwijl POST /api/workspaces dat wél deed — 3 van de 4
    // prod-workspaces stonden daardoor zonder anker en `resolveTargetProfile` gaf `null`.
    // Bij sign-up is er nog geen voiceguide, dus de precedentie valt terug op
    // Workspace.contentLanguage (@default("en")) → en-GB. Binnen dezelfde transactie:
    // een workspace zonder anker mag niet bestaan.
    await ensureBrandWithDefaultProfile(
      tx,
      workspace.id,
      resolveInitialLocale(null, workspace.contentLanguage),
    );

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
  /**
   * Expliciete baseURL — vereist voor de MCP/OAuth-discovery: de mcp-plugin
   * gebruikt `options.baseURL` letterlijk als OIDC-`issuer` en gooit een 500
   * (→ discovery serveert `null`) wanneer die geen string is. Dev leest dit
   * de facto al uit BETTER_AUTH_URL (zelfde bron als Better Auth's eigen
   * fallback — gedrag ongewijzigd); op prod is BETTER_AUTH_URL bewust leeg
   * (host-inferentie sinds de domein-cutover) en pinnen we op de canonieke
   * app-host. NB: dit fixeert op prod ook redirect-/callback-URL's op de
   * app-host i.p.v. de request-host — gewenste canonicalisatie, maar wel een
   * gedragswijziging voor legacy *.vercel.app-bookmarks (zie task-rapport).
   */
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || undefined,
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
      // AUTH_RATE_LIMIT_MAX: e2e-uitzondering (gotcha 2026-07-17) — de hele
      // suite logt in vanaf één IP en blies de 10-per-15-min-limiet mid-suite
      // op (429 → sessieloze 401's). Default blijft strikt; alleen een
      // expliciete env-waarde (Playwright-webServer) verruimt. Bewust niet op
      // forget-/reset-password: die raakt de suite niet.
      "/sign-in/email": { window: 900, max: authRateLimitMax(10) },
      "/sign-up/email": { window: 900, max: authRateLimitMax(5) },
      "/sign-in/social": { window: 900, max: authRateLimitMax(10) },
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
      /**
       * De tweede deur naar hetzelfde lidmaatschap.
       *
       * De app accepteert uitnodigingen via `/api/organization/invite/accept`,
       * maar deze plugin exposeert daarnaast zijn eigen `accept-invitation` op
       * dezelfde tabellen. Die kent `Invitation.workspaceIds` niet en maakt dus
       * een lid met een LEGE ACL aan — en leeg betekent onbeperkt
       * (`workspace-resolver.ts`). Zonder deze hooks is de workspace-scoping
       * dus te omzeilen door de plugin-route te gebruiken.
       */
      organizationHooks: {
        /**
         * De plugin-route wordt volledig geblokkeerd, niet nagebouwd.
         *
         * Eerst geprobeerd om in `afterAcceptInvitation` de ACL-rijen alsnog
         * te schrijven, maar dat kán niet fail-closed: de plugin commit het
         * lidmaatschap in `runWithTransaction` (crud-invites.mjs:291-324) en
         * roept de after-hook pas daarná aan (:339). Een fout in die hook —
         * of een workspace die tussen de twee hooks verdwijnt — laat dan een
         * lid met NUL ACL-rijen achter, en nul betekent onbeperkt. De
         * before-hook draait wél vóór elke schrijfactie (:280), dus daar
         * weigeren is het enige punt waar niets half blijft staan.
         *
         * Nabouwen is bovendien een verliezende strategie: deze plugin-route
         * kent `workspaceIds` niet, slaat rol-arrays komma-gescheiden op en
         * gaat langs onze seat-limiet, rol-verzoening en landings-cookie.
         * Alle uitnodigingen lopen daarom via `/invite/accept` →
         * `POST /api/organization/invite/accept`.
         */
        beforeAcceptInvitation: async () => {
          throw new APIError("BAD_REQUEST", {
            message:
              "Accept invitations via /invite/accept — this endpoint does not apply workspace scoping",
          });
        },
      },
    }),
    /**
     * MCP OAuth-provider (OAuth-connect-fase publieke MCP-server).
     * Branddock wordt hiermee zelf authorization-server voor claude.ai/ChatGPT-
     * connectors: dynamic client registration (/api/auth/mcp/register),
     * authorize (/api/auth/mcp/authorize), token (/api/auth/mcp/token) en
     * getMcpSession voor Bearer-validatie in /api/mcp.
     */
    mcp({
      // Niet-ingelogd op authorize → 302 naar deze SPA-pagina, mét de
      // volledige authorize-query zodat de pagina na login terug kan.
      loginPage: "/oauth/login",
      oidcConfig: {
        // OIDCOptions verplicht loginPage ook hier; de plugin overschrijft dit
        // sowieso met de buitenste loginPage — zelfde waarde, geen effect.
        loginPage: "/oauth/login",
        // Alleen gebruikt bij prompt=consent (zonder prompt doet de plugin
        // auto-consent met directe code-redirect — bewuste v1-keuze: de
        // connector-flow van claude.ai stuurt geen prompt, en de gebruiker
        // heeft zojuist expliciet ingelogd op onze eigen login-pagina).
        consentPage: "/oauth/consent",
        // OAuth 2.1: PKCE verplicht. Connectors registreren zich als public
        // client (token_endpoint_auth_method=none) — zonder PKCE zou een
        // gelekte authorization-code direct inwisselbaar zijn.
        requirePKCE: true,
        // Access-token 1u en code 10min blijven de plugin-defaults (OIDC-spec).
        //
        // Het refresh-token wél verlengd: 7d (default) betekent dat élke
        // gebruiker die de connector een week niet aanraakt opnieuw moet
        // koppelen — het token roteert namelijk alléén bij gebruik. Voor een
        // connector die weken tussen twee sessies stil kan liggen (pilot-
        // testers, vakantie, een drukke week) is dat de meest voorspelbare
        // manier om de koppeling stil te verliezen.
        //
        // 60 dagen = een pilot-ronde van 6 weken plus marge. Bewust niet
        // langer: we hebben (nog) géén intrek-knop — ontkoppelen in Claude/
        // ChatGPT stopt alleen die client, de tokenrij blijft geldig tot de
        // vervaldatum, en de rotatie van de plugin trekt het vorige token niet
        // in. De expiry is dus onze enige bovengrens op een verweesd token.
        refreshTokenExpiresIn: 60 * 24 * 60 * 60,
      },
    }),
    nextCookies(), // Must be last in plugins array
  ],
});
