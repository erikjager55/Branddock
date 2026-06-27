---
id: security-medium-cluster
title: Security MEDIUM/LOW-cluster — RBAC-gaten, prototype-pollution, hardening
fase: pre-launch
priority: next
effort: 1-2 dagen
owner: claude-code
status: done
created: 2026-06-26
completed: 2026-06-26
related-adr: -
related-spec: docs/audits/2026-06-26-security-audit.md
worktree: -
---

# Probleem

Resterende MEDIUM/LOW-findings uit security-audit 2026-06-26 (de HIGHs H2/H4/H5/H6/H8 zijn al gefixt in `7e86f83e`; H1/H3/H7 hebben eigen task-files). Cluster van kleinere, grotendeels chirurgische fixes.

# Acceptatiecriteria

**MEDIUM**
- [x] **M1** — invite-routes: `role` → enum + alléén owner mag `owner` inviten. **Beide** live routes gepatcht: `/api/organization/invite` (TeamManagementPage) én `/api/settings/team/invite` (Settings-UI/InviteMemberModal — gevonden in review-ronde 1, was de échte UI-route). Native Better Auth `invite-member` blokkeert admin→owner al ingebouwd (crud-invites.mjs:123, `creatorRole` default `owner`) — geverifieerd, geen fix nodig.
- [x] **M2** — `/api/workspace/export`: `requireWorkspaceRole()` (owner/admin). Client `DataExportSection` toont accurate 403-melding.
- [x] **M3** — Claw `confirm/route.ts`: `requireWorkspaceRole(['owner','admin','member'])` vóór parse/execute (chat-route voert write-tools niet uit — alleen proposal, dus gate op confirm is het juiste mutatie-pad).
- [x] **M6** — `deepSet`: segment-guard weigert `__proto__`/`constructor`/`prototype` vóór de walk.

**LOW / hardening**
- [x] **L1** — CSP-header in `src/proxy.ts` (non-breaking subset).
- [x] **L2** — GCM `{ authTagLength }` op beide `createDecipheriv` (token-crypto + ad-tokens); decrypt-roundtrip geverifieerd backward-compat.
- [x] **L3** — `webhooks/trigger/[type]`: `timingSafeEqual` + length-guard.
- [ ] **L4** — `workspace/brand-style-anchors` + `hero-logo-overlay`: rol-check (viewer = read-only).
- [ ] **L5** — (zit in H7-task) `navigate.section` → enum.
- [ ] **L6** — Help-Center markdown-renderer: `escapeHtml` in alle branches + `href`-allowlist (latent; admin-only content vandaag).
- [ ] **L9** — `ad-tokens/encryption` version-prefix + rotatie-pad (convergeer op `token-crypto`-contract).
- [ ] Zod-coverage-sweep: mutatie-routes zonder body-validatie (~48%) — minstens de niet-param-only routes.
- [ ] `npx tsc --noEmit` + lint + build groen.

# Status 2026-06-26 (geïmplementeerd, branch `fix/security-medium-cluster`)

**✅ Gedaan**:
- **M1** — `organization/invite`: invited-role gevalideerd tegen {admin,member,viewer}; alléén een owner mag een `owner` inviten (sluit admin→owner-escalatie).
- **M2** — `/api/workspace/export`: nu `requireWorkspaceRole()` (owner/admin) — viewer kan niet meer de hele workspace + interviewee-PII exfiltreren.
- **M3** — Claw `confirm/route`: mutatie-uitvoering via de agent is nu member+ (`requireWorkspaceRole(['owner','admin','member'])`) — viewer = read-only.
- **M6** — `deepSet`: weigert `__proto__`/`constructor`/`prototype`-segmenten (prototype-pollution-guard) vóór de object-walk.
- **L1** — CSP-header in `proxy.ts` (non-breaking: `frame-ancestors/object-src/base-uri/form-action`; geen `script-src` → breekt Next-inline-scripts niet).
- **L2** — GCM `{ authTagLength }` op beide `createDecipheriv` (token-crypto + ad-tokens) — defense-in-depth.
- **L3** — `webhooks/trigger`: `timingSafeEqual` i.p.v. `===` op het Bearer-secret.

Smoke `security-medium.ts` 7/7 (deepSet-guard + pollution-probe + normale paden); tsc 0, lint 0, build groen.

**Finalize — 2-subagent review (2 rondes)**:
- Ronde 1 vond 1 CRITICAL: M1-fix zat op `/api/organization/invite`, maar de UI gebruikt `/api/settings/team/invite` — die had `role: z.string()` + sloeg verbatim op → admin→owner via accept-route. Gefixt (commit `3548f415`). + 1 WARNING: export-403 gaf misleidende "try again" → accurate melding.
- Ronde 2: Reviewer D clean. Reviewer C's "CRITICAL" (native Better Auth `invite-member` zou admin→owner toelaten) = **geverifieerde false-positive** — library-guard crud-invites.mjs:123 blokkeert het al.
- Resterende MINORs (defer): dual-source CSP (proxy.ts + next.config.ts), dubbele workspace-resolutie in claw/confirm, smoke dekt alleen M6.

**⏳ Restscope** (lager / breder, follow-up):
- **L4** — `workspace/brand-style-anchors` + `hero-logo-overlay`: rol-check (viewer=read-only) via `requireWorkspaceRole` — zelfde patroon.
- **L6** — Help-Center markdown-renderer escapen (latent; content is admin-only vandaag).
- **L9** — `ad-tokens/encryption` version-prefix + rotatie-pad (convergeer op het versioned `token-crypto`-contract).
- **Zod-coverage-sweep** — mutatie-routes zonder body-validatie (~48%).

# Bestanden die ik aanraak

- Per sub-item (zie locaties in het audit-doc). Geen gedeelde refactor — losse, kleine edits.

# Smoke test plan

Per sub-item: rol-gate → 403 voor viewer; prototype-pollution-payload → geweigerd; CSP-header aanwezig in response; GCM decrypt van bestaande token blijft werken.

# Risico's

- L2 (GCM) raakt het OAuth-token-decrypt-pad (gotcha: fout brickt alle encrypted OAuth-rijen) — bevestigd níet exploitabel, dus puur additieve `authTagLength` zonder gedrags-wijziging; test decrypt.

# Out of scope

- L7 `proxy.ts` in-memory rate-limiter → Redis (infra/ops, post-Vercel).

# Notes

- Bron: security-audit 2026-06-26 §MEDIUM + §LOW. Splits desgewenst af per sub-item.
