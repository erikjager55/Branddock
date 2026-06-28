---
id: security-residual-hardening
title: Security residual hardening — LOW-findings + review-MINORs (post-launch)
fase: post-launch
priority: later
effort: 1-2 dagen
owner: claude-code
status: open
created: 2026-06-27
completed: -
related-adr: -
related-spec: docs/audits/2026-06-26-security-audit.md
worktree: -
---

# Probleem

Restscope van de pre-launch security-audit 2026-06-26. De HIGH-findings (#345/#346/#347) en de MEDIUM/LOW-cluster (#348, PR #61) zijn afgerond; wat overblijft zijn LOW-severity hardening-items + drie MINORs uit de finalize-review. Geen van deze is exploitabel op het primaire pad vandaag (admin-only content, latente paden, of puur cleanup), daarom bewust uitgesteld tot na launch — maar wel wegschrijven zodat ze niet verdampen.

# Voorstel

Cluster van losse, grotendeels chirurgische edits — zelfde patronen als #348 (`requireWorkspaceRole`, `escapeHtml`, versioned-crypto-contract, Zod-body-schema's). Geen gedeelde refactor; per sub-item een kleine diff. Splits desgewenst af per sub-item in een eigen branch.

# Acceptatiecriteria

**LOW (audit)**
- [ ] **L4** — `workspace/brand-style-anchors` + `workspace/hero-logo-overlay`: rol-check via `requireWorkspaceRole` (viewer = read-only; mutaties owner/admin/member zoals past bij het patroon van de andere workspace-mutatie-routes).
- [ ] **L6** — Help-Center markdown-renderer: `escapeHtml` in álle branches + `href`-allowlist (alleen `https:`/`mailto:`). Latent — content is admin-only vandaag, maar de renderer is niet-escaping. Bron-component: `src/components/help/HelpArticlePage.tsx`.
- [ ] **L9** — `ad-tokens/encryption`: version-prefix + rotatie-pad; convergeer op het versioned `token-crypto`-contract (één crypto-helper-shape voor alle encrypted tokens i.p.v. twee divergerende implementaties).
- [ ] **Zod-coverage-sweep** — mutatie-routes (POST/PATCH/DELETE) zonder body-validatie (~48% bij de audit). Minstens de niet-param-only routes een `safeParse`-schema geven. Inventariseer eerst, fix dan in batches.

**MINORs (finalize-review #348)**
- [ ] **CSP-bron consolideren** — CSP staat nu zowel in `src/proxy.ts` als `next.config.ts` (waarden komen overeen, browser enforce't de intersectie). Eén bron-of-truth kiezen om een toekomstige drift-trap te voorkomen. Overweeg meteen een nonce-based `script-src` (de #348-CSP liet die bewust weg om Next-inline-scripts niet te breken).
- [ ] **Dubbele workspace-resolutie** — `src/app/api/claw/confirm/route.ts` roept `resolveWorkspaceId()` + `getServerSession()` aan én opnieuw intern via `requireWorkspaceRole()`. Gebruik de `workspaceId` uit het `requireWorkspaceRole`-resultaat en laat de losse calls vervallen (2-3 minder DB/session-roundtrips per request).
- [ ] **RBAC smoke-coverage** — `scripts/smoke-tests/security-medium.ts` dekt alleen M6 (deepSet). Voeg een lichte integratie-/e2e-assertie toe op de owner-guard-403's (M1 invite-owner-by-admin, M2 export-by-viewer, M3 claw-confirm-by-viewer).

- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd

# Bestanden die ik aanraak

- `src/app/api/workspace/brand-style-anchors/route.ts` (L4)
- `src/app/api/workspace/hero-logo-overlay/route.ts` (L4)
- `src/components/help/HelpArticlePage.tsx` (L6) + evt. een gedeelde `escapeHtml`/markdown-helper
- `src/lib/ad-tokens/encryption.ts` + `src/lib/security/token-crypto.ts` (L9 — convergentie)
- diverse `src/app/api/**/route.ts` mutatie-routes (Zod-sweep — inventariseer eerst)
- `src/proxy.ts` + `next.config.ts` (CSP-consolidatie)
- `src/app/api/claw/confirm/route.ts` (dubbele resolutie)
- `scripts/smoke-tests/security-medium.ts` of nieuw integratie-smoke-bestand (RBAC-coverage)

# Bestanden die ik NIET aanraak

- De #348-fixes zelf (invite-routes, export, deepSet, GCM, webhook) — al af, niet herzien.
- `src/lib/auth.ts` / Better Auth org-plugin — de native `invite-member` blokkeert admin→owner al ingebouwd (crud-invites.mjs:123), niet aanpassen.

# Smoke test plan

1. **L4**: als viewer een PATCH/DELETE op `brand-style-anchors`/`hero-logo-overlay` → 403; als owner/admin → 200.
2. **L6**: een help-artikel met `<img onerror=...>` / `javascript:`-href in de markdown → output is geëscaped / href gestript.
3. **L9**: encrypt → decrypt roundtrip blijft werken voor bestaande én nieuwe (versioned) tokens; oude tokens zonder version-prefix decrypten nog.
4. **Zod-sweep**: malformed body op een gefixte route → 400 met `safeParse`-details i.p.v. 500/silent-accept.
5. **RBAC-smoke**: de drie owner-guard-403's asserten groen.

# Risico's

- **L9** raakt het OAuth/ad-token-decrypt-pad — een fout brickt alle encrypted rijen (gotcha). Version-prefix moet backward-compatible zijn: oude tokens zonder prefix moeten blijven decrypten. Test met een bestaande rij vóór rollout.
- **CSP nonce-based script-src** kan Next-inline-scripts breken — incrementeel uitrollen (report-only → enforce) en in de browser-console verifiëren.
- **Zod-sweep** is breed; cap de scope per batch en log welke routes bewust param-only (geen body) blijven, zodat "geen schema" niet als "vergeten" leest.

# Out of scope

- **L7** `proxy.ts` in-memory rate-limiter → Redis/Upstash (infra/ops, post-Vercel — aparte task).
- Nieuwe auth-mechanismen of een volledige RBAC-herontwerp — dit is hardening van het bestaande model.

# Notes

- Bron: security-audit 2026-06-26 §LOW + de finalize-review van #348 (PR #61). Volledige context in `docs/audits/2026-06-26-security-audit.md`.
- De complete HIGH+MEDIUM-remediatie zit in changelog #345–#348.
