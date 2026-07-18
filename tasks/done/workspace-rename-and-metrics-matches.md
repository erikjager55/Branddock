---
id: workspace-rename-and-metrics-matches
title: Workspace hernoemen (ontbrak volledig) + pilot-metrics multi-match-fix
fase: launch
priority: now
effort: 2-3 uur
owner: claude-code
status: done
created: 2026-07-17
completed: 2026-07-17
related-adr: -
related-spec: -
worktree: branddock-workspace-rename
---

# Probleem

(1) Een workspace hernoemen kan nergens: de PATCH `/api/workspaces` accepteert alleen `contentLanguage` en de Settings → Workspaces-tab heeft geen naam-veld. Erik wil "Erik Jager's Workspace" (de echte BB-pilot-workspace) hernoemen naar "Better Brands" en liep hier vandaag op vast. (2) `GET /api/admin/pilot-metrics` pakt bij een naam-lookup stil de éérste match — vandaag bewezen misleidend: een lege "better brands"-dubbelganger (aangemaakt 2026-07-17) maskeerde de echte pilot-workspace en gaf een vals all-zero-verdict.

# Voorstel

(1) PATCH-route uitbreiden met optioneel `name` (trim, 1-60 chars) + cache-invalidatie (brand-context + dashboard, zelfde als bij taal-wijziging); `updateWorkspaceName` in de API-client; inline rename in de WorkspacesTab (potlood-icoon → input, Enter/✓ = opslaan, Escape/✕ = annuleren, loading + error states). (2) pilot-metrics: `findFirst` → `findMany take 10`; bij >1 naam-match een 409 met kandidatenlijst (id, naam, createdAt) i.p.v. stil meten; meetscript krijgt `PILOT_WORKSPACE_ID`-env (voorrang op naam) en print de kandidaten bij een 409.

# Acceptatiecriteria

- [x] PATCH met `{ workspaceId, name }` hernoemt de workspace (owner/admin), weigert lege/te lange namen met 400 (beide gesmoked: 400 PASS)
- [x] Workspaces-tab toont potlood-icoon; hernoemen werkt in de browser incl. loading/error state; naam ververst in lijst (Playwright: rename → naam zichtbaar → terug-rename OK)
- [x] pilot-metrics geeft bij meervoudige naam-match een 409 met kandidaten (smoke: naam "e" → 409 + 10 kandidaten); op workspaceId blijft alles werken (200)
- [x] Meetscript ondersteunt `PILOT_WORKSPACE_ID` en print kandidaten bij 409
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors
- [x] Browser-smoke van de rename-flow uitgevoerd (Playwright, dev-server 3005)

# Bestanden die ik aanraak

- `src/app/api/workspaces/route.ts` (PATCH: name-support)
- `src/lib/api/workspaces.ts` (updateWorkspaceName)
- `src/features/settings/components/workspaces/WorkspacesTab.tsx` (inline rename UI)
- `src/app/api/admin/pilot-metrics/route.ts` (multi-match 409)
- `scripts/dev/pilot-meting.mjs` (PILOT_WORKSPACE_ID + 409-afhandeling)
- `tasks/workspace-rename-and-metrics-matches.md`

# Bestanden die ik NIET aanraak

- Slug-generatie — slug blijft ongewijzigd bij rename (identifier, geen display-naam)
- `OrganizationSwitcher` — leest dezelfde query-cache, ververst vanzelf mee
- i18n-vertaalbestanden — nieuwe UI-strings via `defaultValue`-pattern (bestaand patroon in deze tab); NL-vertaling volgt in de reguliere i18n-sync

# Smoke test plan

1. Dev-server op 3005 in deze worktree
2. Playwright: login → Settings → Workspaces → potlood bij een workspace → naam wijzigen → Enter → naam zichtbaar bijgewerkt in lijst
3. API-check: PATCH met lege naam → 400; met naam van 61 chars → 400
4. pilot-metrics: twee workspaces met overlappende naam in dev-DB → naam-query geeft 409 + kandidaten; workspaceId-query geeft gewoon metrics

# Risico's

- Rename van de actieve workspace: switcher/headers tonen naam uit de react-query-cache — invalidatie van `['workspaces','list']` dekt dit; brand-context-cache server-side geïnvalideerd
- 409-shape is een contract-wijziging van pilot-metrics — enige consumer is het eigen meetscript (zelfde PR bijgewerkt)

# Out of scope

- Slug hernoemen
- Workspace-avatar/kleur
- Org-naam hernoemen

# Notes

- Aanleiding: pilot-workspace-identiteit-verwarring 2026-07-17 (zie memory `postiz-verbeterplan-state`). Na merge: Erik hernoemt `cmr4znouo000204ic257g3gcn` naar "Better Brands" en verwijdert de lege dubbelganger `cmrouor3w000009kt7q2unhfm`.
