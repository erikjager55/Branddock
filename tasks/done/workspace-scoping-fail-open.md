---
id: workspace-scoping-fail-open
title: "Lege ACL = onbeperkt" wegwerken — expliciete workspaceScoped-vlag + sweep over alle lezers
fase: launch
priority: now
effort: 3-5 uur
owner: claude-code
status: done
created: 2026-07-22
completed: 2026-07-22
related-adr: -
related-spec: tasks/done/invite-acl-hardening.md
worktree: branddock-invite-flow-fixes (vervolg op dezelfde branch)
---

# ⚠️ DEPLOY-VOLGORDE — LEES DIT EERST

Deze taak voegt een kolom toe (`OrganizationMember.workspaceScoped`) waarvan de
default `false` "onbeperkt" betekent. Naïef deployen opent een venster waarin
**elk gescopet lid tijdelijk toegang tot de hele organisatie heeft**.

Draai daarom op Neon deze twee stappen **direct achter elkaar, vóór/bij de
deploy** (de tweede is idempotent en mag herhaald worden):

```sql
-- 1. kolom (via `npx prisma db push` vanuit een verse checkout van main)
-- 2. backfill, meteen erna — zet bestaande gescopete leden terug op beperkt:
UPDATE "OrganizationMember" m
SET "workspaceScoped" = true
WHERE EXISTS (SELECT 1 FROM "WorkspaceMemberAccess" w WHERE w."memberId" = m.id);
```

Geen DB-toegang bij de hand? Dan ná de deploy `POST /api/admin/repair-defaults`
(developer-only, draait op de prod-runtime) — dat doet exact dezelfde backfill.
`GET` op datzelfde pad toont `workspaceScoping.needsBackfill`; die moet 0 zijn.

**Zonder de kolom 500't élk geauthenticeerd request** (de vlag wordt op het hete
pad gelezen) — zelfde klasse als de sign-up-outage van 2026-07-13.

# Probleem

`WorkspaceMemberAccess` beperkt een member/viewer tot bepaalde workspaces, maar
"nul rijen" werd overal gelezen als **onbeperkt**. Dat is een fail-open default,
en hij sloeg op drie manieren toe:

1. **Workspace verwijderen** cascadeert de ACL-rijen weg → een lid dat tot
   precies die workspace beperkt was, werd stil onbeperkt.
2. **Team-UI "alles uitvinken"** wist alle rijen → bedoeld als "geen toegang",
   feitelijk "toegang tot alles".
3. **Elk pad dat per ongeluk geen rijen schrijft** deed hetzelfde — zoals de
   `WORKSPACE_GONE`-tak die in [`invite-acl-hardening`](invite-acl-hardening.md)
   al fail-closed moest worden gemaakt.

Bijkomend: `invite-acl-hardening` zette alleen de *resolver* om. Vier andere
lezers bleven op de oude telling staan, waardoor het model inconsistent was.

# Voorstel

`OrganizationMember.workspaceScoped` maakt "beperkt tot niets" een uitdrukbare
staat: `true` = uitsluitend de gekoppelde rijen (nul = géén toegang), `false` =
onbeperkt. Alle lezers en schrijvers gaan op die vlag over, met een idempotente
backfill voor bestaande data.

# Acceptatiecriteria

- [x] `hasWorkspaceAccess` + `accessibleWorkspaceIds` lezen de vlag
- [x] Sweep: géén `workspaceAccess.length === 0`/`aclCount === 0`-check meer in
      `src/` — omgezet in `canActInWorkspace`, `getWorkspaceUsers`, de
      workspaces-lijst, `workspace/switch` en de publieke `brand-resolver`
      (3 plekken)
- [x] Alle schrijvers zetten de vlag: invite-accept (nieuw + bestaand lid),
      team-UI workspace-access, seed
- [x] Invite-accept herkent een gescopet lid met nul rijen en geeft het weer
      rijen (anders bleef zo iemand voorgoed buitengesloten)
- [x] Idempotente backfill + diagnose in `/api/admin/repair-defaults`
- [x] Workspace-delete meldt welke leden zonder workspace achterblijven, tot in
      de UI
- [x] Team-tabel toont "Geen toegang" i.p.v. "Alle" voor die staat
- [x] E2E: gescopet lid ziet alleen zijn eigen workspaces en krijgt 403 op een
      andere (`permissions.spec`)
- [x] `npx tsc --noEmit` 0 · `npm run lint` 0 errors
- [x] Geen lock-out voor owner/admin/lege-ACL-leden — expliciet getest

# Bestanden die ik aanraak

- `prisma/schema.prisma`, `prisma/seed.ts`
- `src/lib/workspace-resolver.ts`, `src/lib/workspace/workspace-users.ts`
- `src/lib/api/public/brand-resolver.ts`
- `src/app/api/workspaces/route.ts`, `src/app/api/workspace/switch/route.ts`
- `src/app/api/organization/invite/accept/route.ts`
- `src/app/api/settings/team/members/route.ts` + `.../[id]/workspace-access/route.ts`
- `src/app/api/admin/repair-defaults/route.ts`
- `src/types/settings.ts`, `src/lib/api/workspaces.ts`
- `src/features/settings/components/team/TeamMemberRow.tsx`,
  `.../workspaces/WorkspacesTab.tsx`, 4 locale-bestanden
- `e2e/tests/workspace/permissions.spec.ts`

# Smoke test plan

1. Gescopet lid accepteren → cookie wissen → landt op de toegekende workspace.
2. Cookie vervalsen naar een niet-toegekende workspace → genegeerd.
3. Workspace verwijderen die zijn énige toegekende was → lid houdt
   `workspaceScoped=true` met 0 rijen; `hasWorkspaceAccess` op een andere
   workspace van die org geeft **false**.
4. Lid met lege ACL → ongewijzigd (ziet alles).
5. `repair-defaults` GET/POST → `needsBackfill` naar 0.
6. Playwright `settings/invite-accept` + `workspace/permissions`.

# Risico's

- **Tightening**: leden met ACL-rijen landen voortaan anders. Bedoeld, maar
  user-visible. Owner/admin/lege-ACL merken niets (getest).
- **Deploy-volgorde** — zie de blok bovenaan; dit is het echte risico.

# Out of scope

- De 9 routes die `hasWorkspaceAccess` al expliciet aanroepen herzien.
- `resolveWorkspaceId` stap 3 negeert `activeOrganizationId` en kan dus naar
  een workspace in een ándere organisatie vallen als je in je actieve org
  niets mag. Pre-existing gedrag, niet door deze taak geïntroduceerd — maar
  wel nu vaker bereikbaar. Aparte afweging waard.
- Leden die vóór deze fix al gestrand zijn (rijen weg-gecascadeerd) zijn niet
  meer als "ooit gescopet" te herkennen; de backfill kan ze niet herstellen.

# Notes

Bewezen met echte runs (lokale dev-DB + Playwright, data daarna opgeruimd;
`demo-org` geverifieerd intact):

- workspace verwijderd → lid: `workspaceScoped=true`, 0 ACL-rijen;
  `hasWorkspaceAccess(user, "Branddock Demo")` → **false** (was `true`)
- diezelfde gebruiker valt terug op zijn éigen org-workspace (owner daar) —
  legitiem, geen lek
- `repair-defaults`: `needsBackfill` 2 → 0, `alreadyScoped` 0 → 2
- `DELETE /api/workspaces` → `strandedMembers: ["del-scoped@example.com"]`
- Playwright: `invite-accept` 6/6, `permissions` 19/19 (incl. de nieuwe
  scoping-test)

**Reviewronde** (1 subagent): 4 CRITICAL + 10 WARNING. De belangrijkste vondst
was dat ik alleen de resolver had omgezet — `canActInWorkspace` (agent-runs,
untrusted webhook-payload), de workspaces-lijst, `workspace/switch` en de
publieke brand-resolver lazen nog de oude telling, en invite-accept keek naar
`aclCount` in plaats van de vlag. Allemaal omgezet. Ook verwerkt: de
deploy-volgorde (zie blok bovenaan), `strandedMembers` dat nergens aankwam, en
de team-tabel die "Alle" toonde voor iemand zonder toegang.
