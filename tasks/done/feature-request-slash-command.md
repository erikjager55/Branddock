---
id: feature-request-slash-command
title: /feature slash command — feature requests indienen via Brand Assistant
fase: pre-launch
priority: now
effort: 4-6 uur
owner: claude-code
status: done
created: 2026-05-29
completed: 2026-05-29
related-adr: -
related-spec: -
worktree: - (branch feat/feature-request-slash-command vanaf main)
---

# Probleem

Tijdens de aankomende user-test kunnen testers bugs (`/bug`) en feedback (`/feedback`)
indienen vanuit de Brand Assistant, maar een **feature request** ontbreekt daar. Er bestaat
al wél een globaal `FeatureRequest`-model + voting + Help-pagina, maar dat is niet
workspace-scoped (we weten dan niet wélke testklant het vroeg) en niet bereikbaar via een
slash command. Voor gestructureerde testfeedback willen we pariteit met de bug/feedback-flow.

# Voorstel

Een nieuw `/feature` slash command dat — exact gespiegeld op `/bug` — een formulier in de chat
opent. Het verzoek wordt workspace-scoped opgeslagen in een nieuw `FeatureReport`-model
(parallel aan `BugReport`, los van het bestaande globale voting-board) en is door het team te
bekijken in een eigen **Feature Triage**-tab onder Settings → Developer. Geen AI-analyse
(bewuste keuze) — alleen opslaan + triage.

# Acceptatiecriteria

- [x] `/feature` verschijnt in de slash-suggestie-menu en opent een formulier met `page` voor-ingevuld
- [x] Indienen → POST `/api/feature-reports` → bevestigingsbericht in chat → form sluit
- [x] Request is workspace-scoped (juiste `workspaceId` + `userId`)
- [x] Settings → Developer → **Feature Triage** toont alle requests (`?all=true`), filterbaar op status, met status-overgangen + notities; developer-only (403 voor niet-developers)
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors (4 pre-existing warnings, niet door deze task geïntroduceerd)
- [x] Browser-smoke uitgevoerd via Playwright (login → /feature → submit → triage → status-transitie), alle stappen groen
- [x] Prisma client ↔ DB-tabel alignment geverifieerd (create/update/delete cyclus)

# Bestanden die ik aanraak

Nieuw:
- `prisma/schema.prisma` — model `FeatureReport` + back-relations op `Workspace`/`User`
- `src/app/api/feature-reports/route.ts` — GET (workspace + ?all=true developer) + POST
- `src/app/api/feature-reports/[id]/route.ts` — PATCH developer-only (status + notes)
- `src/features/claw/components/FeatureRequestForm.tsx`
- `src/features/settings/components/developer/FeatureTriageTab.tsx`

Gewijzigd:
- `src/lib/claw/slash-commands.ts` — `/feature` entry
- `src/features/claw/components/InputBar.tsx` — `/feature` dispatch + deps
- `src/stores/useClawStore.ts` — `FeatureRequestFormState` + state + acties + closeClaw reset
- `src/features/claw/components/ChatArea.tsx` — form mounten
- `src/stores/useSettingsStore.ts` — `'feature-triage'` in `SettingsTab`
- `src/features/settings/components/SettingsPage.tsx` — import + DEVELOPER_TABS + case
- `src/features/settings/components/SettingsSubNav.tsx` — nav-knop

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` bestaande `FeatureRequest`/`FeatureVote` modellen — globale voting blijft ongemoeid
- `src/features/help/components/FeatureRequests.tsx` — bestaande Help-pagina flow blijft zoals het is
- `src/app/api/help/feature-requests/**` — niet aangeraakt

# Smoke test plan

1. Dev-server starten, inloggen, Brand Assistant openen.
2. Typ `/feature` → suggestie-menu toont "Request a feature" (Lightbulb-icoon).
3. Enter → formulier opent met huidige pagina voor-ingevuld.
4. Titel + omschrijving invullen, impact kiezen, submit.
5. Verwacht: bevestigingsbericht in chat, formulier sluit.
6. Ga naar Settings → Developer → Feature Triage (als developer).
7. Verwacht: het verzoek staat er, met juiste workspace + impact + status `open`.
8. Wijzig status naar `Shipped` → "Closed by" verschijnt; voeg notitie toe → Save notes.
9. Niet-developer: tab niet zichtbaar / API geeft 403.

# Risico's

- **Lokale DB-drift**: de gedeelde lokale `branddock` DB stond ge-`push`t vanuit de
  `branddock-feat-web-page-builder-canvas` worktree (BrandStyleguide/BrandVoiceguide kolommen
  die niet in main's schema staan). `prisma db push` vanuit main wilde die kolommen droppen.
  **Mitigatie**: tabel additief aangemaakt via gerichte SQL (zero data-loss), daarna alleen
  míjn worktree-client geregenereerd (`npx prisma generate`). Elke worktree heeft eigen
  node_modules/.prisma. **Bij merge naar main**: zorg dat de DB-migratiestrategie deze drift
  netjes oplost (zie Notes).
- Twee feature-request-ingangen naast elkaar (globaal voting-board + workspace `/feature`) —
  zie Out of scope / follow-up.

# Out of scope

- AI-analyse op feature requests (bewuste keuze — kan later, mirror van bug/feedback analyse).
- Voting op de nieuwe `FeatureReport`-entries.
- Notificaties (email/Slack/PostHog) bij indiening.
- Aparte image-upload-route (screenshot = optionele URL-paste).
- **Follow-up post-test**: de twee feature-request-ingangen consolideren — óf de Help-pagina
  modal naar deze workspace-scoped flow laten wijzen, óf het globale voting-board behouden en
  `/feature` daarheen routeren. Beslissing uitstellen tot na de testronde.

# Notes

- Naamgeving: model heet `FeatureReport` (parallel aan `BugReport`) om botsing met het
  bestaande globale `FeatureRequest` te vermijden. Endpoint `/api/feature-reports`.
- Statussen: `open | planned | in_progress | shipped | declined`. Terminale statussen
  (`shipped`/`declined`) stempelen `resolvedAt`/`resolvedById`; terug naar actief wist die.
- Impact (user-perceived): `nice-to-have | useful | important | critical`, default `useful`.
- **Merge-aandachtspunt**: de SQL-aangemaakte tabel staat in de lokale DB maar niet via een
  Prisma-migratie. Voor productie/Vercel (Neon) moet `FeatureReport` via de reguliere
  migratie/`db push` meekomen — verifieer dat het model in `schema.prisma` voldoende is en
  los de BrandStyleguide/BrandVoiceguide-drift op vóór een schone `db push` op main.
