---
id: competitor-activities-ui
title: Competitor activities zichtbaar maken — detail-pagina, dashboard, multi-competitor digest, Brand Assistant tool, notificaties
fase: pre-launch
priority: now
effort: "2-3 dagen"
owner: claude-code
status: in-progress
created: 2026-05-19
completed: -
related-adr: -
related-spec: -
worktree: claude/refine-local-plan-sTdHI
---

# Probleem

`CompetitorActivity` rows worden geschreven sinds Fase 1 en sinds PR #6 ook aangevuld met AI-classified MAJOR pattern-events (CATEGORY_REPOSITIONING / TARGET_AUDIENCE_CHANGED). De data wordt echter nergens gerenderd: `GET /api/competitors/[id]` returnt geen activities, `CompetitorDetailPage` heeft geen timeline, `AttentionList` op het dashboard kijkt alleen naar `Competitor.updatedAt` (stale-after-30-days), `unacknowledgedActivityCount` wordt opgehoogd maar nergens getoond, Brand Assistant heeft geen tool om activities te bevragen, en er is geen out-of-band signaal bij MAJOR-events. Net resultaat: de classifier-investering levert ~0 user-visibility.

# Voorstel

End-to-end surfaces voor competitor-activities: (1) detail-pagina timeline-section met filters, mark-as-read, snapshot-grouping en diff-payload visualisatie; (2) dashboard `AttentionList` uitbreiding via data-only edit op `/api/dashboard/attention/route.ts`; (3) multi-competitor activity-digest op `/competitors` overview; (4) Brand Assistant tool `review_competitor_activities`; (5) in-app + email notificaties bij MAJOR-events; (6) dagelijkse drift-reconciliation cron voor `unacknowledgedActivityCount`.

# Acceptatiecriteria

- [ ] `GET /api/competitors/:id/activities` returns paginated + filterable activity list per competitor met workspace-isolation
- [ ] `POST /api/competitors/:id/activities/acknowledge` markeert (specifieke of alle) activities als gelezen en decrementeert `unacknowledgedActivityCount` atomic
- [ ] `GET /api/competitors/activity-summary` returns workspace-brede aggregaten (totals per severity, top events, hot competitors)
- [ ] `ActivityTimelineSection` rendert in `CompetitorDetailPage` met severity/method filter-chips, mark-all-read, snapshot-grouping en diff-payload visualisatie per kind
- [ ] `CompetitorActivityDigest` toont op `/competitors` overzicht boven de grid (skip indien geen events in window)
- [ ] Dashboard `AttentionList` toont MAJOR-events ≤ 7 dagen als attention-rows met deeplink naar competitor-detail
- [ ] Brand Assistant tool `review_competitor_activities` werkt en is opvraagbaar door agent
- [ ] Bij detectie van MAJOR-event: in-app `Notification` rows worden gemaakt voor workspace-users; email wordt verstuurd (of in dev console-logged) per user
- [ ] `vercel.json` cron `/api/cron/reconcile-competitor-counts` corrigeert per-competitor `unacknowledgedActivityCount` drift
- [ ] `NotificationType` enum bevat `COMPETITOR_MAJOR_EVENT`
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd (zie sectie hieronder)

# Bestanden die ik aanraak

**Nieuw**:
- `tasks/competitor-activities-ui.md`
- `src/app/api/competitors/[id]/activities/route.ts`
- `src/app/api/competitors/[id]/activities/acknowledge/route.ts`
- `src/app/api/competitors/activity-summary/route.ts`
- `src/app/api/cron/reconcile-competitor-counts/route.ts`
- `src/features/competitors/components/detail/ActivityTimelineSection.tsx`
- `src/features/competitors/components/CompetitorActivityDigest.tsx`
- `src/features/competitors/hooks/use-competitor-activities.ts`
- `src/features/competitors/types/activity.ts`
- `src/lib/competitors/notify-major-events.ts`

**Modify**:
- `prisma/schema.prisma` — `COMPETITOR_MAJOR_EVENT` enum-waarde
- `src/lib/competitors/refresh-write.ts` — fire-and-forget `notifyMajorEvents` na transaction
- `src/lib/claw/tools/read-tools.ts` — `review_competitor_activities` tool entry
- `src/features/competitors/components/detail/CompetitorDetailPage.tsx` — render `ActivityTimelineSection`
- `src/features/competitors/components/CompetitorsOverviewPage.tsx` — render `CompetitorActivityDigest`
- `src/features/competitors/api/competitors.api.ts` — 3 nieuwe fetch-functies
- `src/app/api/dashboard/attention/route.ts` — 7e Promise.all-query + AttentionItem mapping
- `vercel.json` — extra cron-entry

# Bestanden die ik NIET aanraak

- `src/components/dashboard/AttentionList.tsx` — bestaande competitor-navigatie blijft werken via data-edit op API
- `src/components/shared/Badge.tsx` — bestaande variants volstaan
- `src/lib/competitors/diff-engine.ts` — alleen lezen om payload-shapes te verifiëren
- `src/lib/email/emailit-client.ts` + `transactional.ts` — alleen importeren via `sendTransactional`/`trySendTransactional`

# Smoke test plan

1. **Type/lint**: `npx tsc --noEmit` + `npx eslint <changed>` → 0 errors
2. **Schema**: `npx prisma generate` succeed; `NotificationType.COMPETITOR_MAJOR_EVENT` exporteert
3. **Seed**: SQL inserts voor 3 events (NOTABLE+MAJOR+INFO) tegen test competitor (zie plan-file)
4. **Detail-pagina**: navigate naar competitor-detail → 3 items, filter-chips werken, diff-payload disclosure rendert correct per `kind`, mark-all-read laat `unacknowledgedActivityCount = 0` achter
5. **Dashboard**: `/dashboard` → MAJOR-event verschijnt als attention-row → klik routeert naar competitor-detail
6. **Multi-competitor**: `/competitors` → digest-card toont tellers (1/1/1), top-event, hot-competitor met `(3)`
7. **API curl**: `GET /api/competitors/:id/activities`, `GET /api/competitors/activity-summary?window=7d`, `POST .../acknowledge {"all": true}`
8. **Brand Assistant**: vraag *"Welke MAJOR shifts deze week?"* → tool wordt aangeroepen, seed-event in antwoord
9. **Notificatie**: trigger MAJOR-event of run `notifyMajorEvents` direct → `Notification` row aanwezig; in dev: emailit log-output
10. **Cron**: forceer drift met `UPDATE Competitor SET unacknowledgedActivityCount = 99 ... ;` → call reconcile cron met Bearer → drift corrigeert
11. **Workspace-isolation**: workspace-B cookie tegen workspace-A competitor-id → 404

# Risico's

- **Ack race** (2 sessies ack tegelijk) → `updateMany({ where: { ..., acknowledgedAt: null } })` count = werkelijk aangepast → veilige decrement
- **AttentionList domination** door MAJOR-events (cap 5) → `take: 3` in query + priority 2 (bewust)
- **Email-IO blokkeert refresh-write** → `void notifyMajorEvents(...)` fire-and-forget + try/catch in functie
- **Heterogene diff-payload shape** → `payload: unknown` + defensieve `kind`-narrowing; default = JSON-dump fallback
- **`EMAILIT_API_KEY` ontbreekt in dev** → `isEmailitConfigured()` guard / `sendTransactional` logged stub in dev
- **Notification-spam bij batch refresh (10+ MAJOR)** → email-batching max 5 events per user; in-app krijgt wel alle rijen (UI heeft `clear`-knop)

# Out of scope

- Slack-webhook dispatcher (geen bestaande infra)
- Per-user fine-grained notification preferences (workspace-wide email-flag volstaat)
- CSV/PDF export van activity-lijst
- Full-text search op activities
- LLM-gegenereerde "weekly digest" samenvattingen
- Activity-detail-modal met side-by-side snapshot-diff visualisatie
- Backfill van historische `unacknowledgedActivityCount` bij eerste deploy (reconcile-cron pakt het de eerste nacht)

# Notes

Plan-bestand: `/root/.claude/plans/here-is-a-draft-mutable-meteor.md`.
Templates: notifications `route.ts:17-44` (pagination), `alignment/issues/[id]/dismiss/route.ts:18-87` (acknowledge), `trend-radar/research/[jobId]/approve/route.ts:103-122` (notification.createMany), `claw/tools/read-tools.ts:467-494` (tool entry), `cron/run-jobs/route.ts:16-24` (cron auth), `PositioningSection.tsx:46` (section wrapper).
