---
id: invite-acl-hardening
title: Workspace-scoping écht afdwingen — ACL-blinde resolver, tweede deur, rol/seats, tokensterkte, e2e
fase: launch
priority: now
effort: 4-8 uur
owner: claude-code
status: done
created: 2026-07-22
completed: 2026-07-22
related-adr: -
related-spec: tasks/done/invite-flow-fixes.md
worktree: branddock-invite-flow-fixes (vervolg op dezelfde branch)
---

# Probleem

[`invite-flow-fixes`](done/invite-flow-fixes.md) maakte workspace-gescopete
uitnodigingen voor het eerst accepteerbaar (het accept-pad 404'de daarvóór).
Daarmee werd zichtbaar dat de scoping uit PR #220 **adviserend** is en niet
afgedwongen. De reviewrondes legden zes punten bloot die bewust buiten die
taak zijn gehouden omdat ze de ACL-architectuur raken; Erik gaf 2026-07-22
akkoord om ze alsnog op te pakken.

1. **De workspace-resolutie is ACL-blind.** `getWorkspaceForOrganization`
   (`workspace-resolver.ts:35-40`) pakt de *oudste* workspace van de
   organisatie zonder enige ACL-check, en `getExplicitWorkspace` valideert de
   cookie alleen op org-lidmaatschap. 398 API-routes leunen op
   `resolveWorkspaceId`; slechts 9 bestanden roepen `hasWorkspaceAccess` aan.
   Een gescopet lid dat zijn cookie wist of een ander apparaat pakt, leest dus
   data buiten zijn scope. De docblock van `hasWorkspaceAccess` benoemt dit gat
   zelf al.
2. **Tweede deur.** De Better-Auth-organization-plugin is op dezelfde tabellen
   gemapt (`auth.ts`) en exposeert een eigen `accept-invitation`, die
   `workspaceIds` niet kent en dus een lid met **lege** ACL aanmaakt — en lege
   ACL betekent onbeperkt (`workspace-resolver.ts:103`).
3. **Rol wordt niet verzoend** als een bestaand lid een uitnodiging met een
   andere rol accepteert: de mail belooft "je doet mee als beheerder", de
   server laat de oude rol staan.
4. **Seat-limiet** wordt alleen bij het versturen gecheckt; N openstaande
   uitnodigingen kunnen samen over de planlimiet heen accepteren.
5. **`Invitation.token` is een `cuid()`** — timestamp + counter + fingerprint +
   8 random tekens, geen CSPRNG — terwijl het 7 dagen lang accountaanmaak op
   andermans adres ontgrendelt, op een endpoint zonder eigen rate-limit.
6. **Geen e2e-dekking** op de zes takken van de accept-pagina.

# Voorstel

Sluit het gat bij de bron: de workspace-resolutie wordt ACL-bewust (één
gedeelde helper, alle drie de stappen), de plugin-deur krijgt dezelfde
scoping-garantie via `organizationHooks`, en het accept-pad verzoent rol +
seats. Tokens worden CSPRNG-gegenereerd bij het aanmaken (geen schema-wijziging
nodig — het veld heeft al een default, we zetten hem expliciet) en het
accept-endpoint krijgt een eigen rate-limit. Tot slot een Playwright-spec over
de takken die nu alleen handmatig gesmoked zijn.

# Acceptatiecriteria

- [x] Een gescopet lid zónder cookie landt op een workspace **binnen** zijn
      ACL, nooit op de oudste van de organisatie
- [x] Een cookie die naar een niet-toegestane workspace wijst wordt genegeerd
- [x] Owner/admin en leden met lege ACL houden ongewijzigd gedrag
- [x] De Better-Auth-plugin-accept levert dezelfde `WorkspaceMemberAccess`-rijen
      op als ons eigen pad, en weigert net zo hard als de workspace weg is
- [x] Een bestaand lid dat een uitnodiging met een andere rol accepteert krijgt
      die rol — behalve wanneer dat de laatste owner zou degraderen
- [x] Accepteren respecteert de seat-limiet
- [x] Nieuwe tokens zijn CSPRNG; het accept-endpoint heeft een rate-limit
- [x] Playwright-spec dekt: onbekend token, verlopen, ingetrokken,
      verkeerd adres, geldig+uitgelogd, geldig+ingelogd
- [x] `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors
- [x] Smoke: gescopet lid ziet aantoonbaar alleen zijn eigen workspace

# Bestanden die ik aanraak

- `src/lib/workspace-resolver.ts` — ACL-bewuste resolutie (kern)
- `src/lib/auth-server.ts` — `userId` doorgeven aan de resolver
- `src/lib/auth.ts` — `organizationHooks` voor de plugin-deur
- `src/app/api/organization/invite/accept/route.ts` — rol + seats + rate-limit
- `src/app/api/organization/invite/route.ts` — CSPRNG-token
- `e2e/tests/settings/invite-accept.spec.ts` — **nieuw**
- `tasks/invite-acl-hardening.md`, `docs/changelog.md`, `gotchas.md`

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` — geen schema-wijziging nodig (token krijgt een
  expliciete waarde bij create; de `@default(cuid())` blijft als vangnet).
  Scheelt een handmatige Neon-push (gotcha 2026-07-13).
- De 398 routes die `resolveWorkspaceId` gebruiken — die erven de fix.

# Smoke test plan

1. Nodig een member uit voor één workspace, accepteer, wis de
   workspace-cookie → `GET /api/workspace/active` moet de toegekende
   workspace geven, niet de oudste van de org.
2. Zet de cookie handmatig op een niet-toegekende workspace → wordt genegeerd.
3. Owner in dezelfde org → ongewijzigd gedrag (ziet alles).
4. Accepteer via het plugin-endpoint → ACL-rijen bestaan alsnog.
5. Playwright-spec groen.

# Risico's

- **Tightening kan bestaande gebruikers raken**: leden met ACL-rijen landen
  voortaan ergens anders. Dat is de bedoeling, maar het is user-visible.
  Mitigatie: owner/admin en lege-ACL-leden (verreweg de meesten) merken niets.
- `resolveWorkspaceId` zit in het hete pad van 398 routes — extra queries
  moeten beperkt blijven.

# Out of scope

- De 9 routes die `hasWorkspaceAccess` al expliciet aanroepen herzien.
- Distributed rate-limiting (Redis) voor de resend-cooldown.

# Notes

Bewezen met echte runs (dev-server + Playwright, lokale smoke-data daarna
opgeruimd; `demo-org` geverifieerd intact — 18 ws, 2 leden, 1 owner):

- gescopet lid, cookie **gewist** → landt op de toegekende workspace (Adullam),
  niet op de oudste (Branddock Demo)
- cookie **vervalst** naar een niet-toegekende workspace → genegeerd
- lid met **lege ACL**, cookie gewist → oudste workspace (ongewijzigd gedrag)
- plugin-`accept-invitation` → **400** en géén half lidmaatschap: geen
  `OrganizationMember`, uitnodiging blijft `pending` (dus nog accepteerbaar via
  de juiste pagina)
- rolverzoening: bestaand lid `member` → uitnodiging `viewer` → rol werd viewer
- token uit de échte invite-route: 43 tekens base64url (cuid ≈ 25)
- e-mail `Token-Test@Example.COM` → opgeslagen als `token-test@example.com`
- Playwright `settings/invite-accept`: **6/6 groen**

**Reviewronde** (1 subagent, ACL-kern): 1 CRITICAL + 6 WARNING, alle verwerkt.
De CRITICAL was structureel — de eerste opzet repareerde de plugin-deur met een
`afterAcceptInvitation`-hook, maar die draait ná de commit van het lidmaatschap
en kan dus niet fail-closed zijn. Vervangen door weigeren in de before-hook.
Verder gefixt: dubbele `workspace.findUnique` op het hete pad, scoping die
verdampte bij een rolverlaging van owner/admin naar member/viewer, stale
uitnodiging die een bewust gewijzigde rol overschreef, `isActive` in de
laatste-owner-guard, rate-limit verruimd (kantoor-NAT) met een eerlijke
Redis-disclaimer, en de nieuwe 402/429 kregen een eigen scherm i.p.v. de
generieke foutmelding.

**Nog open** (bewust, buiten deze taak): `WorkspaceMemberAccess` cascadeert bij
het verwijderen van een workspace, dus een gescopet lid wiens laatste
toegekende workspace wordt verwijderd wordt daarna alsnog onbeperkt. De
accept-tijd-checks dekken dat niet af — dat vraagt een guard op het
workspace-delete-pad.
