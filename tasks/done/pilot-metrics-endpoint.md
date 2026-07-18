---
id: pilot-metrics-endpoint
title: Developer-only pilot-metrics endpoint + meetscript (C1-C5 proefmeting)
fase: launch
priority: now
effort: 4-6 uur
owner: claude-code
status: done
created: 2026-07-17
completed: 2026-07-17
related-adr: -
related-spec: docs/playbooks/pilot-succes-definitie.md (in worktree agent-a0c326236bcdb7788, nog niet op main)
worktree: branddock-pilot-metrics
---

# Probleem

De pilot-succes-definitie (bekrachtigd 2026-07-17, peildatum 2026-07-28) vereist per-week-counts voor 5 criteria op de Better Brands-workspace op prod. Directe prod-DB-toegang is er bewust niet meer (Neon geroteerd 2026-07-15). C2/C3/C4 zijn deels via PostHog te benaderen, maar C1 (Deliverables aangemaakt) wordt nergens getrackt buiten de DB. Zonder endpoint is elke meting handwerk via Erik.

# Voorstel

Eén read-only, developer-only endpoint `GET /api/admin/pilot-metrics` (patroon: `admin/credit-orgs` + `requireDeveloper()`) dat per ISO-week de counts teruggeeft voor C1-C4, plus een meetscript `scripts/dev/pilot-meting.mjs` dat inlogt via `POST /api/auth/sign-in/email` (patroon: `f2-zombie-tab-smoke.mjs`), het endpoint aanroept en de groen/oranje/rood-matrix print tegen de bekrachtigde drempels. Geen schema-wijziging, dus geen Neon-push.

Meetbronnen per criterium:
- C1 gegenereerd: `Deliverable.count` via `campaign.workspaceId` + `createdAt`
- C2 gepubliceerd: `LearningEvent eventType='content.published'` (primair) + `Deliverable.publishedAt` (cross-check)
- C3 F-VAL: `ContentFidelityScore.scoredAt` + `ContentVisualFidelityScore.scoredAt`
- C4 agent-interactie: `AgentRun triggerType='manual'` + `AgentArtifact.acceptedAt/dismissedAt` (scheduled runs tellen bewust NIET mee — die draaien zonder mens)
- C5: afgeleid in het script (actieve weken)

# Acceptatiecriteria

- [x] Endpoint geeft 403 zonder developer-sessie (curl-check: 403 `{"error":"Forbidden"}`)
- [x] Endpoint geeft per-week-counts (ma-aligned, UTC) voor een workspace via `?workspaceId=` of `?workspaceName=` (contains, case-insensitive); 404 bij onbekende workspace; 400 zonder param
- [x] Script logt in, haalt metrics op en print per-week-tabel + venster-verdict (groen/oranje/rood) volgens de matrix uit pilot-succes-definitie
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors (route + script)
- [x] Smoke-test uitgevoerd (lokaal op poort 3005 tegen dev-DB, workspace "Better brands" — tabel + oranje verdict geprint)

# Bestanden die ik aanraak

- `src/app/api/admin/pilot-metrics/route.ts` (nieuw)
- `scripts/dev/pilot-meting.mjs` (nieuw)
- `tasks/pilot-metrics-endpoint.md` (deze file)

# Bestanden die ik NIET aanraak

- `src/app/api/admin/credit-orgs/route.ts` — alleen als template gelezen
- `src/lib/developer-access.ts` — bestaande auth-helper, geen wijziging
- `src/app/api/content-library/route.ts` — createdAt toevoegen aan payload is een alternatief pad, bewust niet gedaan (scope)
- Alles rond LearningEvent-emissie — `content.created` alsnog emitten is out-of-scope

# Smoke test plan

1. Dev-server in deze worktree op poort 3005 (`npm run dev -- -p 3005`)
2. `PILOT_BASE_URL=http://localhost:3005 PILOT_EMAIL=erik@branddock.com PILOT_PASSWORD=… PILOT_WORKSPACE="Better Brands" node scripts/dev/pilot-meting.mjs`
3. Verwacht: login 200, tabel met 4 weekrijen met plausibele counts (lokale BB-workspace heeft data), venster-verdict geprint
4. Negatief: zelfde call met een non-developer-account → script meldt 403-uitleg
5. Na merge + Vercel-deploy: zelfde script met `PILOT_BASE_URL=https://branddock-7y9n.vercel.app` en Eriks prod-login = de echte proefmeting (vóór 2026-07-28)

# Risico's

- `DEVELOPER_EMAILS` op prod bevat mogelijk niet het account waarmee gemeten wordt → script geeft daar expliciete foutmelding voor; Erik checkt de env-var vóór de proefmeting
- Lokale BB-workspace-data ≠ prod-data — smoke valideert alleen de mechaniek, niet de getallen
- `workspaceName contains` kan op prod meerdere workspaces matchen → endpoint pakt de eerste; response bevat id+naam zodat een mismatch direct zichtbaar is

# Out of scope

- UI-paneel (Settings → Developer) voor deze metrics
- PostHog-querying
- "Inbox geopend"-tracking (wordt nergens geregistreerd; C4 is geproxied via runs/artifacts)
- `content.created` LearningEvent emitten

# Notes

- Drempels (bekrachtigd 2026-07-17): C1 ≥3/wk · C2 ≥1/wk · C3 ≥2/wk · C4 ≥1/wk · C5 ≥2 actieve weken. Matrix: ≥4/5 groen · 2-3 oranje · ≤1 rood.
- Context: product P5.1-meetwijze uit het Postiz-verbeterplan (docs in worktree agent-a0c326236bcdb7788).
- Smoke-bevinding: Better Auth weigert script-logins zonder `Origin`-header (`MISSING_OR_NULL_ORIGIN`) én met een origin die niet in trustedOrigins staat (`INVALID_ORIGIN`). Cure in script: `origin: PILOT_ORIGIN ?? BASE` — op prod is BASE zelf de trusted origin; lokaal op afwijkende poort `PILOT_ORIGIN=http://localhost:3000` zetten.
- Prod-proefmeting (na merge + deploy, vóór 2026-07-28): `PILOT_BASE_URL=https://branddock-7y9n.vercel.app PILOT_EMAIL=<dev-account> PILOT_PASSWORD=… node scripts/dev/pilot-meting.mjs` — account moet in prod-`DEVELOPER_EMAILS` staan.
