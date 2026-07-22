---
id: invite-flow-fixes
title: Uitnodigingsflow repareren — dode accept-link, verkeerde naam in de mail, resend die niets verstuurt
fase: launch
priority: now
effort: 4-6 uur
owner: claude-code
status: done
created: 2026-07-22
completed: 2026-07-22
related-adr: -
related-spec: -
worktree: branddock-invite-flow-fixes
---

# Probleem

Erik stuurde een test-uitnodiging voor een werkomgeving en liep tegen twee bugs
aan; de diagnose legde er een derde bloot.

1. **De accept-link is dood (P0 — elke uitnodiging).**
   `src/app/api/organization/invite/route.ts:165` bouwt
   `${emailBaseUrl()}/invite/accept?token=…`, maar er bestaat geen pagina op dat
   pad. De volledige `page.tsx`-inventaris bevat geen `src/app/invite/*` en
   `git log --diff-filter=D -- 'src/app/invite*'` is leeg: die pagina heeft
   **nooit bestaan**. De enige handler is `POST /api/organization/invite/accept`
   — een API-route, die een GET vanuit een mailclient niet beantwoordt. Elke
   uitnodiging eindigt dus in een 404, vanaf dag één.
   → Exact dezelfde klasse als de reset-password-bug; het comment bovenin
   `src/app/reset-password/page.tsx` documenteert die letterlijk ("deze pagina
   bestond nooit, dus elke reset-link eindigde op een 404"). Tweede keer.

2. **De mail noemt altijd de organisatie.** Regel 177 geeft
   `organizationName: org?.name` door. Bij sign-up heet de org
   `${userName}'s Brand` en de workspace `${userName}'s Workspace`
   (`src/lib/auth.ts:68`), dus de ontvanger las "Je bent uitgenodigd voor Erik
   Jager's Brand" terwijl hij voor één workspace was uitgenodigd. De
   workspace-scoping bestaat al (`Invitation.workspaceIds`, PR #220) — de mail
   gebruikt 'm alleen nooit.

3. **"Opnieuw versturen" verstuurt niets.**
   `POST /api/settings/team/invites/[id]/resend` verzet alleen `expiresAt` met
   7 dagen; er staat geen `trySendTransactional` in het bestand. De knop
   suggereert een tweede mail die nooit aankomt.

# Voorstel

Eén gedeelde helper bepaalt de naam waarvoor iemand is uitgenodigd (precies één
workspace → workspace-naam; nul of meerdere → organisatie), zodat mail, accept-
respons en resend niet uit elkaar kunnen lopen. Daarnaast de ontbrekende
landingspagina `/invite/accept` als zelfstandige client-page — hetzelfde
patroon als `reset-password`, dus zonder `AuthGate`/`App.tsx` te raken. Die
pagina handelt alle takken van de bestaande accept-API af, inclusief de
belangrijkste: een genodigde zonder account krijgt inline een aanmeldformulier
met het uitgenodigde e-mailadres vastgezet. Tot slot verstuurt de resend-route
de mail daadwerkelijk opnieuw.

Beslissingen van Erik (2026-07-22): zelfstandige pagina met eigen
aanmeldformulier (niet: token parkeren + via `AuthGate`), en alle drie de bugs
in één keer.

# Acceptatiecriteria

- [x] Uitnodiging voor precies één workspace → mail-onderwerp, titel en body
      noemen de **workspace**-naam
      → bewezen: `"Erik Jager nodigt je uit voor Gemeente Barneveld"`
- [x] Uitnodiging voor nul of meerdere workspaces → mail noemt de
      **organisatie**-naam
      → bewezen: 2 workspaces én ongescope'd → `"… voor Branddock Agency"`
- [x] `/invite/accept?token=…` rendert een pagina (geen 404) en dekt alle
      takken: geldig+ingelogd, geldig+uitgelogd, verkeerd e-mailadres,
      verlopen, al gebruikt, onbekende token
      → HTTP 200 (baseline: niet-bestaand pad = 404); 6/6 takken gesmoked
- [x] Genodigde zonder account kan vanaf die pagina een account maken en wordt
      direct lid — het e-mailadres ligt vast op het uitgenodigde adres
      → readonly=true; na aanmelden `"Je hoort nu bij Gemeente Barneveld"`
- [x] Na accepteren staat de uitgenodigde organisatie actief, zodat de
      gebruiker niet in zijn eigen lege auto-org landt
      → `activeOrganizationId = demo-org-branddock-001`
- [x] "Opnieuw versturen" verstuurt de uitnodigingsmail daadwerkelijk opnieuw
      → mailpayload gelogd: `"Smoke Tester invited you to join Gemeente
      Barneveld"` (dev-stub, niets verzonden) + expiry verzet
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors op gewijzigde files
- [x] Smoke-test uitgevoerd (zie plan) — 0 onverwachte console-errors
- [x] `gotchas.md` bijgewerkt: mail-link zonder landingspagina, tweede keer
- [x] Review + commit — task-finalize: 4 reviewrondes (7 subagents)

# Bestanden die ik aanraak

- `src/lib/invitations/invite-target-name.ts` — **nieuw**, gedeelde naamregel
- `src/lib/email/templates/invite.ts` — `organizationName` → `targetName` +
  rol-labels vertalen
- `src/app/api/organization/invite/route.ts` — helper gebruiken, `lang` in de link
- `src/app/api/organization/invite/accept/route.ts` — `targetName` +
  `organizationId` in de respons, `code`-contract, fail-closed bij verdwenen
  workspace, ACL alleen verbreden, P2002-race, workspace-cookie
- `src/app/api/settings/team/invites/[id]/resend/route.ts` — mail écht sturen +
  cooldown + WORKSPACE_GONE-guard
- `src/app/invite/accept/page.tsx` — **nieuw**, de ontbrekende landingspagina
- `tasks/invite-flow-fixes.md`, `docs/changelog.md`, `gotchas.md`

**Uitgebreid na de review-ronde** (het `emailSent`-signaal had anders geen
consument — CLAUDE.md eist error-state in de consumerende UI):

- `src/types/settings.ts` — `ResendInviteResponse.emailSent`
- `src/lib/api/settings.ts` — cooldown (429) onderscheiden van een echte fout
- `src/features/settings/components/team/PendingInviteItem.tsx` — resultaat tonen
- `src/lib/ui-i18n/locales/{nl,en}/settings-team.ts` — 4 nieuwe keys
- `scripts/emailit-smoke-test.ts` — meeverhuisd met de veld-hernoeming

# Bestanden die ik NIET aanraak

- `src/components/auth/AuthPage.tsx` + `AuthGate.tsx` — bewuste keuze: de
  accept-pagina is zelfstandig, het inlogpad van iedereen blijft ongemoeid
- `src/lib/workspace-resolver.ts` + `src/lib/auth-server.ts` — de ACL-blinde
  workspace-resolutie is een pre-existing gat dat deze taak alleen *bereikbaar*
  maakt; afgedekt via de workspace-cookie, structurele fix ligt bij Erik
  (zie Notes → openstaande beslissingen)
- `src/lib/auth.ts` `provisionNewUser` + de Better-Auth-organization-plugin —
  dat een genodigde óók een eigen org krijgt is bestaand gedrag; de
  parallelle plugin-endpoints zijn een aparte beslissing

# Smoke test plan

1. Nodig een e-mailadres zonder account uit voor **één** workspace →
   mail noemt de workspace-naam.
2. Klik de link → pagina toont de uitnodiging + aanmeldformulier met het
   e-mailadres vastgezet (geen 404).
3. Maak het account aan → lid van de organisatie, uitgenodigde org actief,
   de workspace zichtbaar.
4. Herhaal de link → "al geaccepteerd"-melding, geen crash.
5. Nodig uit voor **twee** workspaces → mail noemt de organisatie.
6. Uitnodiging met een verlopen/onbekende token → nette foutmelding.
7. "Opnieuw versturen" in de team-UI → tweede mail komt aan.

# Risico's

- **Dubbele org na aanmelden**: `provisionNewUser` geeft elke nieuwe gebruiker
  een eigen org + workspace; een genodigde krijgt er dus twee. Mitigatie: na
  accepteren expliciet `organization.setActive` op de uitgenodigde org, anders
  landt de gebruiker in zijn eigen lege workspace en lijkt de invite mislukt.
- **CSRF/origin-val bij auth-POSTs** (gotcha 2026-07-17): geldt voor
  `page.request` in Playwright, niet voor een echte browser. De smoke draait
  daarom door de browser, niet via raw API-calls.
- **Rate-limiters op sign-in/sign-up** (3 gestapelde lagen, gotcha 2026-07-17):
  bij herhaald smoken lokaal kan de 11e poging 429'en — niet als bug lezen.

# Out of scope

- Taal van de accept-pagina volgt `?lang=` uit de mail (nl/en). De **app**
  daarachter blijft de bestaande UI-taalinstelling volgen — geen i18next in
  deze standalone pagina.
- Bij een uitnodiging voor meerdere workspaces die workspaces opsommen in de
  mail — Erik koos expliciet voor alleen de bovenliggende naam.
- De `branddock-workspace-id`-cookie direct op de uitgenodigde workspace zetten
  bij een 1-workspace-invite (nu: org actief zetten, resolver kiest).

# Notes

- Accept-API-takken die de pagina moet dekken: 200 succes · 200 `alreadyMember`
  · 401 `{requiresAuth, email}` · 403 ander e-mailadres · 400 verlopen/gebruikt
  · 404 onbekend.
- `emailBaseUrl()` is sinds de domein-cutover canoniek `app.branddock.app`; de
  link zelf klopte dus, alleen het doel ontbrak.
- **Smoke-vondst 1**: dev-server op poort 3005 gaf `403 INVALID_ORIGIN` op
  sign-up — Better Auth vertrouwt alleen de origin uit `BETTER_AUTH_URL`
  (:3000). Testopstelling, geen bug; staat nu als regel in `gotchas.md`.
- **Smoke-vondst 2**: mijn eerste testverwachting was fout, niet de code — na
  accepteren staat de invitation op `accepted`, dus een herbezoek hoort het
  "al gebruikt"-scherm te geven (de `alreadyMember`-tak geldt alleen bij een
  nog-pending uitnodiging voor iemand die al lid is).
- Lokale smoke-data (3 uitnodigingen, 2 gebruikers, 2 auto-orgs) is na afloop
  opgeruimd; `demo-org-branddock-001` geverifieerd intact (18 ws, 2 leden).
- Nog niet gedekt: de resend is tot de **verzendgrens** bewezen (Emailit-key
  bewust uit, dev-stub) — bewust geen echte mail de deur uit voor een smoke.

## Review-ronde (2 subagents × 2 rondes)

Gefixt n.a.v. de review:
- **Token overleefde geen reload** — de URL-strip (tegen de PostHog-lek) maakte
  "uitloggen en opnieuw proberen" dood: de reload landde op "link niet geldig".
  Nu stash in `sessionStorage`. Bewezen: F5 → juiste scherm; uitlog-tak →
  aanmeldformulier, sessie leeg.
- **Tokenlek naar PostHog** — `capture_pageview` stuurde `?token=` als
  `$current_url`. Token gaat nu uit de adresbalk vóór PostHog-init (child-effect
  draait vóór het parent-effect van `PostHogProvider`).
- **Fail-open bij verdwenen workspace** — nul ACL-rijen = onbeperkt
  (`workspace-resolver.ts:103`), dus een uitnodiging voor één verwijderde
  workspace gaf toegang tot álles. Nu fail-closed, en vóór de sessiecheck.
- **Foutmelding op regex** — `/expired/i` op de Engelse fouttekst; elke andere
  400 werd "al gebruikt". Nu een `code`-contract; een reeds-op-`expired`-gezette
  uitnodiging meldt ook echt "verlopen".
- **P2002-race** te breed afgevangen + zonder `targetName`/`organizationId`.
- **Stale workspace-cookie** bij een ongescope'de uitnodiging → nu gewist.
- **Resend**: cooldown (was: mailbom-oppervlak), pas ná geslaagde verzending,
  Map wordt gesnoeid, geen rauwe provider-fout naar de client, en geen mail
  meer voor een uitnodiging die het accept-pad tóch weigert.
- **`emailSent` had geen consument** → type + api-client + UI + 4 i18n-keys.
- **Rol niet vertaald in de mail** ("als member" naast "als lid" op de landing).
- a11y (`role="alert"`, `aria-live`, `aria-busy`, `aria-hidden`), ontbrekende
  Tailwind-klassen (`focus:ring-primary/40`, `pr-3` staan niet in `index.css` →
  zichtbare focus-indicator ontbrak), `signOut`-foutafhandeling,
  onvertaalde Better-Auth-fouten ("je hebt al een account" + modus-switch).

## Openstaande beslissingen voor Erik (bewust NIET in deze PR)

1. **ACL-blinde workspace-resolutie.** `getWorkspaceForOrganization` pakt de
   *oudste* workspace van de org zonder ACL-check, en `getExplicitWorkspace`
   valideert de cookie alleen op org-lidmaatschap. Een gescopet lid dat zijn
   cookie wist of een ander apparaat pakt, landt dus buiten zijn scope. Deze
   taak dekt het happy path af met de workspace-cookie, maar de structurele fix
   zit in `workspace-resolver.ts` (1 caller — klein, maar het verandert
   app-breed gedrag voor bestaande gescopete leden).
2. **Tweede deur: de Better-Auth-organization-plugin** exposeert een eigen
   `accept-invitation` op dezelfde tabellen, die `workspaceIds` niet kent en dus
   een lid met lege ACL (= onbeperkt) aanmaakt. Endpoints uitzetten of een
   `afterAcceptInvitation`-hook.
3. **Rol bij her-uitnodigen**: een bestaand lid dat een uitnodiging met een
   ándere rol accepteert houdt zijn oude rol, terwijl de mail iets anders
   belooft. Verhogen is een escalatiepad, verlagen kan toegang breken — een
   productkeuze.
4. **Seat-limiet** wordt alleen bij het versturen gecheckt, niet bij accepteren;
   N openstaande uitnodigingen kunnen samen over de limiet gaan.
5. **`Invitation.token` is een `cuid()`**, geen CSPRNG, en het accept-endpoint
   kent geen rate-limit. Praktisch risico laag, maar het is wel een
   7-daagse credential die accountaanmaak ontgrendelt.
6. **E2E-dekking ontbreekt** op deze zes takken (de `data-testid`-hooks liggen
   er al). Aparte task: de suite heeft seed-fixtures + de auth-rate-limiter-knop
   nodig (gotcha 2026-07-17).
