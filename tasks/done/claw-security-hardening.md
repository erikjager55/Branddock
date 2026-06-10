---
id: claw-security-hardening
title: Brand Assistant tenant-hardening — scope-guard + write-tool IDOR
fase: pre-launch
priority: now
effort: 0,5 dag
owner: claude-code
status: done
created: 2026-06-10
completed: 2026-06-10
related-adr: -
related-spec: -
worktree: branddock-feat-claw-security
---

# Probleem

Twee bevindingen uit de Brand Assistant ("Claw") cross-tenant leak-audit (2026-06-10):

1. **Scope-guard ontbreekt.** De system-prompt (`SYSTEM_IDENTITY`) verbiedt nergens om over merken buiten de workspace te praten. De assistant beantwoordt daardoor vragen over willekeurige (andere klant-)merken uit zijn trainingskennis. Geen DB-lek, maar voelt als een lek en is ongewenst.
2. **Write-tool IDOR.** Meerdere write-tools muteren in `execute()` op `prisma.X.update({ where: { id } })` zónder workspace-check. Omdat `execute` los van `buildProposal` via de confirm-route draait met een client-geleverd entity-id, kan een gemanipuleerde confirm een entiteit uit een **andere** workspace muteren. Op `main` geverifieerd aanwezig in: `update_asset_content`, `update_asset_framework`, `update_product`, `update_competitor`, `update_strategy_context`, `update_persona`, en `lock_entity` (brand_asset/persona/product — die had zelfs in `buildProposal` geen check).

# Voorstel

1. Scope-boundary toevoegen aan `SYSTEM_IDENTITY`: bespreek alleen merken/concurrenten uit de workspace-context; weiger analyse van bedrijven die niet in context staan; nooit fabriceren over andere tenants. Eigen `Competitor`-records blijven in-scope (het is eigen concurrentieanalyse).
2. Elke ongescopede per-id mutatie tenant-scopen: `updateMany({ where: { id, workspaceId }, data })` + `count === 0 → throw`, of (waar al een `findFirst` staat) een `if (!row) throw` vóór de update. Geldt in zowel `buildProposal` als `execute`.

# Acceptatiecriteria

- [x] `SYSTEM_IDENTITY` bevat een tenant-scope-boundary (eigen competitors expliciet toegestaan)
- [x] 7 write-tool-surfaces tenant-gescoped: asset_content / asset_framework / product / competitor / strategy_context / persona / lock_entity
- [x] Reeds-gescopede tools ongemoeid + geverifieerd: update_interview, link_persona_to_product, alle 4 deliverable-update-tools
- [x] Integratietest (eenmalige run tegen echte DB): cross-workspace write geweigerd op alle 5 tools + DB ongemoeid + in-workspace write werkt met revert (12/12)
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors
- [x] Smoke `npm run smoke:claw-security` (7/7) — scope-guard-tekst + statische IDOR-scan
- [ ] (optioneel) behaviorale chat-test scope-guard met gesigneerde sessie

# Bestanden die ik aanraak

- `src/lib/claw/tools/write-tools.ts` (7 execute-blokken scopen)
- `src/lib/claw/context-assembler.ts` (scope-boundary in SYSTEM_IDENTITY)
- `scripts/smoke-tests/claw-security-hardening.ts` (NIEUW) + `package.json`

# Out of scope

- Behaviorale weiger-tuning van de assistant (prompt-iteratie na pilot-feedback)
- Andere claw-tool-categorieën dan write (read/analyze zijn al workspace-gescoped — geverifieerd in de leak-audit)
