---
id: open-acties-2026-07-23
title: Open-acties overzicht (handoff) — peildatum 2026-07-23
fase: launch
priority: now
effort: gemengd (menswerk + agent-werk)
owner: claude-code
status: open
created: 2026-07-23
completed: -
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Consolidatie-overzicht van wat er ná de sessie van 2026-07-23 nog openstaat, zodat een
volgende sessie meteen ziet wat afgerond moet worden. **Deze sessie afgerond**: volledige
security-audit-remediatie (7 PR's #245-#250, incl. OAuth-connector-intrekpad live op prod),
Adullam-migratie, Stijlstudio-rename, repo-opruiming (69 remote + 10 lokale branches + 4 stashes weg).

Detail per wacht-op-Erik-punt staat in memory [[user-actiepunten]]; dit bestand is de
taken-spiegel daarvan + de twee nieuwe items uit deze sessie.

# Openstaande acties

## A. Wacht op Erik — beslissing of menswerk
- [ ] **Pilot-adoptie Better Brands** — agents gebruiken + schedules, LoRA-flip-beslissing, feedbackloop observeren
- [ ] **Onboarding-test** — 3 externe testers werven + observeren
- [ ] **TOPUP-schakelmoment** — `NEXT_PUBLIC_TOPUP_ENABLED=true` (technisch klaar; alleen go/no-go-timing)
- [ ] **Connector-pilot per tester** — (a) elke tester-org compen via Credit Admin (`setUnlimited`); (b) tester heeft betaald Claude/ChatGPT-plan nodig
- [ ] **Browser-smoke LP-matrix** — eigenaarschap onduidelijk: Erik zelf (visueel) of Claude functioneel?

## B. Klein prod-nawerk (Erik, kan direct)
- [ ] **Twee retentie-indexen op Neon** (uit PR #286, ADR `2026-08-17-landing-page-data-retention`).
      Niet met `prisma db push`: die vergelijkt het héle schema en neemt eventuele
      prod-drift mee, en de `CREATE INDEX` die Prisma uitstuurt locked `PageEvent`
      tegen writes. Twee losse statements, concurrent, buiten een transactie:
      ```sql
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "PageEvent_createdAt_idx"
        ON "PageEvent" ("createdAt");
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "FormSubmission_createdAt_idx"
        ON "FormSubmission" ("createdAt");
      ```
      Namen zijn exact wat Prisma genereert, dus een latere `db push`/`migrate` ziet
      geen diff. Controle:
      `SELECT indexname FROM pg_indexes WHERE tablename IN ('PageEvent','FormSubmission') AND indexname LIKE '%createdAt_idx';`
      **Geen haast**: de retentie-cron (02:00) werkt zonder deze indexen functioneel
      prima, alleen als volledige tabelscan. Wél doen vóór `PageEvent` serieus groeit.
- [ ] **`NEXT_PUBLIC_POSTHOG_KEY` op prod zetten** — er staat vandaag géén key op productie,
      dus posthog-js initialiseert daar niet en je hebt **geen product-analytics**. De
      CSP-kant is per 18-08 gedicht (`eu.i.posthog.com` én `eu-assets.i.posthog.com` staan
      in `connect-src`, changelog #476), dus zodra je de key zet werkt het meteen. Zonder
      die fix zou de eigen CSP de remote-config-call stil hebben geblokkeerd.
- [ ] **Drie lokale branches opruimen** — `feat/security-csp-enforce`, `docs/csp-followups` en
      `feat/lp-title-metadata` staan nog lokaal. Alle drie zijn squash-gemerged (#294/#297/#301)
      en read-only geverifieerd identiek aan `origin/main` (0 regels diff), maar
      `scripts/dev/worktree.sh --done` laat ze staan omdat git een squash-merge nooit als
      "merged" herkent — de commits zijn geen ancestor. Force-delete ze zodra er geen co-sessie
      meer in de main-worktree draait; de session-guard blokkeert branch-mutaties tot 15 minuten
      ná de laatste heartbeat van de andere sessie.
- [ ] **Barneveld-logo** uploaden — `~/Downloads/logo_barneveld.svg` in Brandstyle
- [ ] **"+12"-proof point** nog in prod-HQ-workspace — in-app aanpassen (Brand Promise → proof points) of her-import
- [ ] **Marketing-site restjes** — copy-review, quote/testimonial, 3 ontbrekende feature-screenshots
- [ ] **Besluit `docs/Branddock branddoc v3.pdf`** — untracked in main-worktree: committen/verplaatsen/weggooien?

## C. Agent-werk dat op Eriks go wacht
- [ ] **Content-accessor fase 2** — 2 productbeslissingen: (a) Content Library-stoplicht liegt (rood op volle pagina); (b) Brand Assistant zegt onterecht "nog geen content". Zie `tasks/content-chain-accessor.md`
- [ ] **`repair-defaults` op prod** — zet locale-ankers + BB `contentLanguage` en→nl (user-visible; draai bij uitleg-moment)
- [ ] **`guard-hooks-hardening`** — raakt veiligheidsnet, expliciet akkoord nodig. Zie `tasks/guard-hooks-hardening.md`

## D. Gebundelde sessie ~28 juli
- [x] ~~**CSP-enforce-flip**~~ — ✅ **gedaan 2026-08-18** (PR #294, changelog #476). De
      `[csp-report]`-route bleek niet begaanbaar: de meetfase stempelde geen nonce, dus
      violeerde élk script en zijn de rapporten ruis; beslissing genomen op een lokale
      meting tegen een echte productiebuild. ⚠️ De Vercel-CLI-token is verlopen — een
      `vercel login` is nodig als je ooit prod-logs wilt ophalen.
- [ ] **Ada-drempel-kalibratie** + **Vera go/no-go** — vielen samen rond 28-07, staan nog open

## E. Nieuw uit deze sessie
- [ ] **"Connected apps"-paneel verifiëren** — Settings → API & Connectors op prod: koppelingen zichtbaar + "Revoke" werkt (OAuth-intrek ging vandaag live, PR #250)
- [ ] **Emailit event-parser** — `data.object`-veldnamen bevestigen zodra een echte bounce/complaint-delivery binnenkomt, dan hardharden
- [x] **Offline workspaces → prod** — ✅ 8 gemigreerd + geverifieerd op prod 2026-07-23 (Linfi, DTS Ede, Zwarthout, Napking, Goed-Bouw, PartnerSelect, Het Nieuwe Golfen, WRA Juristen; commit #453). Rest (Eriks keuze, later): People Masterminds, QonnecQt.ai, Lookaal, Wassink Groep. ⚠️ Erik: prod-DB-wachtwoord roteren (URL stond even lokaal). Linfi mist 18 cosmetische styleguide-previews.

# Acceptatiecriteria

- [ ] Volgende sessie leest dit bestand + [[user-actiepunten]] en weet direct de stand
- [ ] Afgevinkte items migreren naar hun definitieve plek (changelog/memory) en verdwijnen hier

# Out of scope

- Uitvoering van de items zelf — dit is puur het trackings-overzicht.

# Notes

- Bewust afgeronde beslissingen (geen actie): SSO bewust uit (email+password-launch); billing-entitlement-featureverschillen ONafgedwongen tijdens pilot (zie [[billing-entitlements-plan-completed]]).
- Bij sessie-start: eerst verifiëren welke items al zijn afgevinkt (via de memory-pointers) vóór je de lijst herhaalt.
