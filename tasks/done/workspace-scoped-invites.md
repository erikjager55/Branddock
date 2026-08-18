---
id: workspace-scoped-invites
title: Uitnodigingen en leden per workspace scopen (i.p.v. altijd hele organisatie)
fase: pre-launch
priority: now
effort: 4-6 uur
owner: claude-code
status: done
created: 2026-07-20
completed: 2026-07-20
related-adr: -
related-spec: -
worktree: branddock-workspace-scoped-invites
---

# Probleem

Erik (2026-07-20): "Ik kan mensen wel uitnodigen maar dan worden ze meteen lid van al mijn werkomgevingen. Dat is niet wenselijk." Het datamodel voor per-workspace toegang bestaat al (`WorkspaceMemberAccess`, afgedwongen in `hasWorkspaceAccess`, de switch-route en `workspace-users.ts`: leeg = alle, niet-leeg = alleen die), maar de uitnodigings-flow vult het nooit: `Invitation` kent geen workspace-scoping en de accept-route maakt alleen een `OrganizationMember` aan. Bovendien toont `GET /api/workspaces` een beperkt lid alsnog álle workspaces (switchen faalt dan met 403).

# Voorstel

De laatste kilometer afmaken op het bestaande ACL-model: (1) `Invitation.workspaceIds` (leeg = alle, huidig gedrag), (2) invite-route accepteert en valideert workspace-selectie (alleen voor member/viewer — owner/admin bypassen de ACL), (3) accept-route zet de `WorkspaceMemberAccess`-rijen in de transactie, (4) nieuwe PATCH `settings/team/members/[id]/workspace-access` om bestaande leden bij te stellen, (5) `GET /api/workspaces` filtert voor beperkte leden, (6) UI: workspace-kiezer in InviteMemberModal, werkomgevingen-kolom + beheer-actie in de ledentabel, scope op openstaande uitnodigingen.

# Acceptatiecriteria

- [x] Uitnodiging met geselecteerde workspaces → geaccepteerd lid heeft exact die `WorkspaceMemberAccess`-rijen en ziet alleen die workspaces in de switcher
- [x] Uitnodiging "alle werkomgevingen" → gedrag ongewijzigd (lege ACL)
- [x] workspaceIds bij owner/admin-invite → 400 met duidelijke fout
- [x] Owner/admin kan per bestaand member/viewer-lid de workspace-toegang aanpassen; eigen rol/owner niet
- [x] Beperkt lid ziet in `GET /api/workspaces` alleen toegestane workspaces
- [x] `npx tsc --noEmit` 0 errors
- [x] eslint 0 errors op aangeraakte bestanden
- [x] Smoke-test: invite→accept-flow op dev-DB doorlopen (script), UI rendert
- [x] Changelog-entry; Neon `prisma db push` als Erik-stap gedocumenteerd (additieve kolom)

# Bestanden die ik aanraak

- `prisma/schema.prisma` (Invitation.workspaceIds)
- `src/app/api/organization/invite/route.ts`
- `src/app/api/organization/invite/accept/route.ts`
- `src/app/api/settings/team/members/route.ts`
- `src/app/api/settings/team/members/[id]/workspace-access/route.ts` (nieuw)
- `src/app/api/settings/team/invites/route.ts`
- `src/app/api/organization/members/route.ts`
- `src/app/api/workspaces/route.ts` (GET-filter)
- `src/types/settings.ts`, `src/lib/api/settings.ts`, `src/hooks/use-settings.ts`
- `src/features/settings/components/team/InviteMemberModal.tsx`
- `src/features/settings/components/team/TeamMemberRow.tsx` (+ nieuw `MemberWorkspaceAccessModal.tsx`)
- `src/features/settings/components/team/TeamMembersTable.tsx`
- `src/features/settings/components/team/PendingInviteItem.tsx`
- `src/lib/ui-i18n/locales/{nl,en}/settings-team.ts`
- `docs/changelog.md`

# Out of scope

- E-mailtemplate uitbreiden met workspace-namen
- Per-workspace rollen (rol blijft org-niveau; alleen zichtbaarheid wordt gescoped)
- Better-Auth-invitations migreren (custom Invitation-model blijft)

# Smoke-test

Dev-DB-script: invite met 1 workspace → accept gesimuleerd → assert ACL-rij + `hasWorkspaceAccess` true/false voor wel/niet-gescoped workspace; UI-render van modal en tabel.
