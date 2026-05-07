---
id: 2026-02-12-better-auth-organization
title: Better Auth + organization plugin als auth provider
status: accepted
date: 2026-02-12
supersedes: -
superseded-by: -
---

# Context

Branddock vereist multi-tenant authenticatie met:
- Email/password login
- OAuth (Google, Microsoft, Apple) voor agency en direct-klant flows
- Organization model (DIRECT vs AGENCY) met workspaces per organization
- Per-workspace toegangscontrole + 4 rollen (owner, admin, member, viewer)
- Invite flow met expiry
- Session-based workspace resolution

Auth-providers overwogen:
- **NextAuth/Auth.js** — populair maar mist native organization model, vereist veel custom werk
- **Clerk** — krachtig maar SaaS, geen self-hosting, kost per user
- **Supabase Auth** — vereist Supabase platform-lock-in
- **Better Auth** — open-source, native Prisma adapter, organization plugin als first-class feature

# Decision

Adopteer **Better Auth** met:
- `prismaAdapter` voor User/Session/Account/Verification tabellen
- `organization` plugin gemapt op bestaande `Organization`/`OrganizationMember`/`Invitation` tabellen
- `nextCookies()` plugin (verplicht laatste in plugins array)
- Custom `databaseHooks` voor auto-provisioning organization bij user creation + sync OAuth tokens naar `WorkspaceIntegration`
- Better Auth standard scrypt voor password hashing
- Role velden als String (lowercase) i.p.v. enum, validatie in applicatielaag

# Y-statement

In de context van **multi-tenant SaaS met agency-model**, facing **complexe auth-vereisten (OAuth + organization + invites + roles)**, I decided **Better Auth met organization plugin**, to achieve **first-class multi-tenant zonder custom auth-code**, accepting tradeoff **dependency op relatief jong open-source project**.

# Consequences

## Positief
- Geen vendor lock-in (open-source, eigen DB)
- Native Prisma integratie — geen schema-conflicten
- Organization plugin levert kant-en-klare invite flow + role-based access
- OAuth tokens auto-gesynced naar `WorkspaceIntegration` voor herbruikbaarheid
- Geen kosten per user

## Negatief / tradeoffs
- Nieuwer ecosystem dan NextAuth — minder Stack Overflow antwoorden
- `nextCookies()` MOET laatste in plugins array — easy footgun
- Role validatie naar applicatie-laag (geen DB enum)
- `NEXT_PUBLIC_WORKSPACE_ID` env-var fallback verwijderd — sessie verplicht voor workspace resolution

## Neutraal
- Workspace switching via `branddock-workspace-id` cookie (set door `POST /api/workspace/switch`)
- Roles lowercase strings: "owner", "admin", "member", "viewer"

# Alternatives considered

- **NextAuth/Auth.js**: krachtig maar geen native organization model, vereiste 2-3× meer custom code
- **Clerk**: te SaaS-gebonden, prijs schaalt met users, vendor lock-in
- **Supabase Auth**: dwingt Supabase als DB-platform, niet gewenst (we hebben Postgres+Prisma+pgvector zelf)

# Notes

Implementatie geleverd in 4 fases (CLAUDE-original entries #23-27):
- Fase A: emailAndPassword session
- Fase B: organization plugin + multi-tenant
- Fase C: agency flows (org switcher, invite, workspace creation)
- Fase D: OAuth social login (Google/Microsoft/Apple)

Configuratie: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/auth-server.ts`, `src/lib/auth-permissions.ts`.
