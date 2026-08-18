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
- [ ] **Barneveld-logo** uploaden — `~/Downloads/logo_barneveld.svg` in Brandstyle
- [ ] **"+12"-proof point** nog in prod-HQ-workspace — in-app aanpassen (Brand Promise → proof points) of her-import
- [ ] **Marketing-site restjes** — copy-review, quote/testimonial, 3 ontbrekende feature-screenshots
- [ ] **Besluit `docs/Branddock branddoc v3.pdf`** — untracked in main-worktree: committen/verplaatsen/weggooien?

## C. Agent-werk dat op Eriks go wacht
- [ ] **Content-accessor fase 2** — 2 productbeslissingen: (a) Content Library-stoplicht liegt (rood op volle pagina); (b) Brand Assistant zegt onterecht "nog geen content". Zie `tasks/content-chain-accessor.md`
- [ ] **`repair-defaults` op prod** — zet locale-ankers + BB `contentLanguage` en→nl (user-visible; draai bij uitleg-moment)
- [ ] **`guard-hooks-hardening`** — raakt veiligheidsnet, expliciet akkoord nodig. Zie `tasks/guard-hooks-hardening.md`

## D. Gebundelde sessie ~28 juli
- [ ] **CSP-enforce-flip** (`[csp-report]`-logs analyseren → enforce) + **Ada-drempel-kalibratie** + **Vera go/no-go** — vallen samen rond 28-07. Zie [[security-residual-state]] + `tasks/security-residual-hardening.md`

## E. Nieuw uit deze sessie
- [ ] **"Connected apps"-paneel verifiëren** — Settings → API & Connectors op prod: koppelingen zichtbaar + "Revoke" werkt (OAuth-intrek ging vandaag live, PR #250)
- [ ] **Emailit event-parser** — `data.object`-veldnamen bevestigen zodra een echte bounce/complaint-delivery binnenkomt, dan hardharden
- [ ] **Offline workspaces → prod** — zie aparte task `tasks/workspaces-online-migratie.md` (9 rijk-gevulde lokaal-only workspaces geïdentificeerd; Erik kiest de set)

# Acceptatiecriteria

- [ ] Volgende sessie leest dit bestand + [[user-actiepunten]] en weet direct de stand
- [ ] Afgevinkte items migreren naar hun definitieve plek (changelog/memory) en verdwijnen hier

# Out of scope

- Uitvoering van de items zelf — dit is puur het trackings-overzicht.

# Notes

- Bewust afgeronde beslissingen (geen actie): SSO bewust uit (email+password-launch); billing-entitlement-featureverschillen ONafgedwongen tijdens pilot (zie [[billing-entitlements-plan-completed]]).
- Bij sessie-start: eerst verifiëren welke items al zijn afgevinkt (via de memory-pointers) vóór je de lijst herhaalt.
