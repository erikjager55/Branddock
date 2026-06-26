---
id: security-medium-cluster
title: Security MEDIUM/LOW-cluster — RBAC-gaten, prototype-pollution, hardening
fase: pre-launch
priority: next
effort: 1-2 dagen
owner: claude-code
status: open
created: 2026-06-26
completed: -
related-adr: -
related-spec: docs/audits/2026-06-26-security-audit.md
worktree: -
---

# Probleem

Resterende MEDIUM/LOW-findings uit security-audit 2026-06-26 (de HIGHs H2/H4/H5/H6/H8 zijn al gefixt in `7e86f83e`; H1/H3/H7 hebben eigen task-files). Cluster van kleinere, grotendeels chirurgische fixes.

# Acceptatiecriteria

**MEDIUM**
- [ ] **M1** — `organization/invite`: `role` valideren tegen `z.enum(['admin','member','viewer'])`; non-owners mogen geen `owner`-invite uitgeven (anders escaleert admin → owner).
- [ ] **M2** — `/api/workspace/export`: gate achter owner/admin (viewer kan nu hele workspace + interviewee-PII exfiltreren).
- [ ] **M3** — Claw write-tools: rol-gate in `chat/route.ts`+`confirm/route.ts` (viewer mag niet muteren via de agent); spiegel de directe mutatie-routes.
- [ ] **M6** — `src/lib/utils/deep-set.ts`: segment-guard die `__proto__`/`constructor`/`prototype` weigert (raakt `update_asset_framework` + `user/preferences`); + `.refine()`-key-denylist op `preferencesBodySchema`.

**LOW / hardening**
- [ ] **L1** — CSP-header toevoegen aan `src/proxy.ts`.
- [ ] **L2** — GCM: `{ authTagLength: 16 }` op beide `createDecipheriv`-calls (`token-crypto.ts` + `ad-tokens/encryption.ts`); decrypt van bestaande tokens testen.
- [ ] **L3** — `webhooks/trigger/[type]`: `===` op secret → `timingSafeEqual` (consistent met cron-auth).
- [ ] **L4** — `workspace/brand-style-anchors` + `hero-logo-overlay`: rol-check (viewer = read-only).
- [ ] **L5** — (zit in H7-task) `navigate.section` → enum.
- [ ] **L6** — Help-Center markdown-renderer: `escapeHtml` in alle branches + `href`-allowlist (latent; admin-only content vandaag).
- [ ] **L9** — `ad-tokens/encryption` version-prefix + rotatie-pad (convergeer op `token-crypto`-contract).
- [ ] Zod-coverage-sweep: mutatie-routes zonder body-validatie (~48%) — minstens de niet-param-only routes.
- [ ] `npx tsc --noEmit` + lint + build groen.

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
