---
id: document-lang-followups
title: Restwerk uit static-rendering-regressie — taalattribuut, bewaking en de statische-renderingvraag
fase: post-launch
priority: later
effort: los oppakbaar; het zwaarste item (statisch renderen) is 2-4 dagen
owner: unassigned
status: open
created: 2026-08-18
completed: -
related-adr: docs/adr/2026-08-18-csp-enforce-nonce-en-hashes.md
related-spec: -
worktree: branddock-static-rendering-regressie
---

# Waarom dit bestand bestaat

`static-rendering-regressie` is afgerond, maar liet acht punten bewust open. Die
stonden eerst alleen in dát task-file — en dat gaat naar `tasks/done/`. Precies zo
is [`deferred-browser-smokes-unblocked`](deferred-browser-smokes-unblocked.md)
ontstaan: drie handmatige smokes die maandenlang niemands verantwoordelijkheid
waren. Een reviewer wees erop dat dit dezelfde kant op ging.

Volledige onderbouwing en metingen: `tasks/done/static-rendering-regressie.md`.

# De punten

## A. Bewaking die niet automatisch draait

- [x] **`npm run test:csp`** — ✅ **grotendeels af 2026-08-19 (#380).** De aanname
      "vereist build + test-DB" is nagemeten en klopte voor 9 van de 15 checks niet:
      de vier policy-checks en de vijf nonce-integriteitschecks gaan via Playwrights
      `request`-fixture. Gedraaid met `PLAYWRIGHT_BROWSERS_PATH` naar een lege map en
      een neppe `DATABASE_URL`: 9 passed in 2,1s. Draaien nu in de `check`-job.
      **Rest**: de zes `page`-checks vragen chromium (één ook een geseede DB). Dat
      blijft een kostenafweging voor Erik.
- [x] **`npm run smoke:document-lang-browser`** — ✅ **fase 1 af 2026-08-19 (#380).**
      Het probleem was de kóppeling, niet de kosten: hij vroeg een server én een
      browser, dus draaide hij nergens. Fase 2 zit nu achter `SMOKE_BROWSER=1`; fase 1
      draait in de `check`-job tegen `next start` (10 checks). Fase 2 wacht op dezelfde
      chromium-beslissing.
- [~] **De `languageChanged`-listener heeft géén gate.** ⚠️ **Deels afgedekt
      2026-08-19**: `smoke:document-lang` heeft drie bedradingschecks gekregen die
      verwijderen en hernoemen vangen — listener geregistreerd, listener afgemeld
      (geen stapeling), en de handler schrijft zélf naar `documentElement.lang`.
      Alle drie nagemeten met een mutatie.

      De eerste versie van die derde check matchte `document.documentElement.lang =`
      ergens in het bestand, en dat patroon staat er drie keer — hij liet de mutatie
      dus gewoon door. Nu bindt hij de toewijzing aan de handler zelf.

      **Wat nog steeds niet gedekt is**: of het attribuut ná een échte wissel klopt.
      Dat vraagt een browser die tijdens de sessie van taal wisselt, en dat kan alleen
      via de ingelogde instellingen-UI. Origineel punt hieronder: In `DocumentLangSync` staat
      de tak die `<html lang>` bijwerkt bij een runtime-taalwissel. Geen enkele van de
      vijf gates draait ooit een echte wissel: de pure gate raakt de DOM niet, de
      browser-smoke zet de cookie vóór de page load. Valt die tak stil, dan blijft de
      taal ná een wissel de hele sessie verkeerd — dezelfde klasse fout die de taak
      oploste. ⚠️ Het acceptatiecriterium "taal-switch blijft werken" is in de
      oorspronkelijke taak afgevinkt op handmatige waarneming, niet op een gate.
- [ ] **Een nieuwe publieke NL-route toevoegen is onbeschermd.** `DUTCH_PUBLIC_PREFIXES`
      is een handmatige lijst; wie `src/app/handleiding/page.tsx` bouwt ziet nergens dat
      hij bestaat. De bestaande check faalt bij *toevoegen* (de veilige handeling) en
      zwijgt bij *vergeten*. De juiste vorm staat al in de repo:
      `scripts/smoke-tests/i18n-namespace-reachability.ts` scant de bestandsboom.

## B. Dezelfde bug, andere routes

- [x] **`/oauth/login`, `/oauth/consent`, `/reset-password`** — ✅ **af 2026-08-18**.
      Gemeten vóór de fix: 0 `useTranslation`-aanroepen, zichtbare strings "Password
      updated", "Authorize access", "Sign in" — dus feitelijk Engels, terwijl het
      attribuut de cookie volgde. Nu `ENGLISH_PUBLIC_PREFIXES`.
- [x] **`/invite/accept`** — ✅ **af 2026-08-18**. De precedentievraag is beantwoord door
      de pagina zelf te lezen: die haalt de taal bewust uit `?lang` en níét uit de cookie,
      omdat de ontvanger nog geen account heeft en de cookie van een toevallig ingelogde
      ándere gebruiker juist de verkeerde taal geeft. `<html lang>` volgt nu dezelfde bron.
      Vereiste één nieuwe request-header (`x-search`), omdat een layout `searchParams`
      niet kan lezen.
- [ ] **`/p`-404's hebben helemaal géén `lang`-attribuut.** Pre-existing.

      ⚠️ **De voor de hand liggende fix werkt NIET — gemeten 2026-08-19, twee
      builds.** De oorspronkelijke diagnose hier ("er is nergens een
      `not-found.tsx`") suggereert dat er één toevoegen het oplost. Dat is
      geprobeerd op beide niveaus:

      | wat | resultaat |
      |---|---|
      | `src/app/p/[workspace]/[slug]/not-found.tsx` | eigen 404-tekst rendert, `<html id="__next_error__">`, **geen `lang`** |
      | `src/app/not-found.tsx` (rootniveau) | idem — **geen `lang`** |

      In beide gevallen rendert de eigen component wél (de tekst staat in de
      HTML) en klopt de status (404, was 500 door een niet-opgeruimde probe-
      server), maar Next 16.2.9 zet er zijn eigen foutdocument omheen in plaats
      van de root layout. Een `not-found.tsx` is dus niet het ontbrekende stuk.

      Ter vergelijking, dezelfde meting op productie:

          linfi.branddock.app/pillar-page        200  <html lang="nl-NL">
          linfi.branddock.app/bestaat-niet       404  <html id="__next_error__">
          branddock.app/marketing/bestaat-niet   404  <html lang="nl">
          branddock.app/bestaat-niet             404  <html lang="en">

      Alleen een `notFound()` uit een DYNAMISCH segment verliest de layout; een
      onbekende route onder een statisch pad houdt hem gewoon. Wie dit oppakt
      begint dus bij die vraag, niet bij een `not-found.tsx`.

      Afweging voor later: de impact is klein (een 404 is per definitie
      noindex; het raakt vooral schermlezers, die terugvallen op de
      browsertaal). Een rootniveau-404 zou bovendien álle 404's raken — ook die
      van de Engelstalige app-shell — en dat is een productbeslissing over
      wiens 404-pagina dit is, niet alleen een attribuut-fix. De pagina draait
      op het subdomein van een KLANT.

## C. Opgeruimd worden

- [x] **Drie `revalidatePath('/p/…')`-aanroepen** — ✅ **geannoteerd 2026-08-19.**
      Bij `publish` was de bestaande comment niet alleen ontbrekend maar **onjuist**:
      hij noemde on-demand revalidation "het primaire verversmechanisme van de
      statisch gecachte render-route". Die route is niet statisch gecacht, dus dat
      leest als een optimalisatie die er niet is — erger dan geen comment.

      Alle drie dragen nu dezelfde noot: dit doet op dit moment niets, het staat er
      bewust, en het wordt vanzelf weer het juiste mechanisme zodra sectie D wordt
      opgepakt. Bij `publish` is ook de volgorde-reden bewaard (ná de artifact-write,
      zodat een verse cache-vulling het artifact ziet) — die blijft gelden zodra
      caching terugkomt.
- [ ] **`/p/<ws>/<slug>` in de CSP-violation-sweep.** Vereist een fixture van vier
      entiteiten (Campaign → Deliverable → LandingPage → PagePublish); de e2e-seed heeft
      geen landingspagina. ⚠️ Voeg de route toe aan `PUBLIC_ROUTES`, niet aan
      `NONCE_GUARD_ROUTES` — die filtert `/p` er bewust uit (hash-scope zonder nonce).
- [x] **`decideHostRoute` moet puur en client-veilig blijven** — ✅ **al afgedwongen,
      gemeten 2026-08-19.** Er is hier géén eigen bewaker nodig: de Next-build doet het al.
      Getoetst door een `import { prisma }` in `host-router.ts` te zetten en te bouwen:

          Build error occurred
          Error: Turbopack build failed with 6 errors

      `DocumentLangSync` is een client-component en importeert `decideHostRoute` via
      `document-locale.shared.ts`; server-only code daarin laat de bundel-grens knappen
      en dat is een harde buildfout, geen waarschuwing.

      De onderliggende zorg blijft wél staan en verhuist naar de opmerking hieronder:
      zodra `DomainMapping` live gaat moet die host door dezelfde resolutie, en dát is
      een DB-lookup. Die hoort in een aparte servertak — niet omdat een bewaker het
      verbiedt, maar omdat de build je anders tegenhoudt.

      ⚠️ Bewust géén bewaker gebouwd. Een tweede controle op wat de build al hard
      afdwingt is onderhoud zonder dekking; hij zou nooit rood worden zonder dat de
      build eerder rood is.
- [ ] **Drie call-sites resolven dezelfde landingspagina-rij** met drie queryvormen:
      `loadPublishedPageSeo`, `resolvePublishedPage` en `loadLandingPageLocale`. Zodra er
      een tweede `PUBLISHED`-rij per slug bestaat (kan vandaag al, via een locale-wissel
      plus herpublicatie) moeten die verzoend worden tot één gedeelde lookup.

## D. De grote openstaande vraag

- [ ] **Statisch renderen alsnog aanzetten.** De meting ligt klaar: 2 → 26 statische
      routes, en `/p` wordt ISR-cachebaar met twee regels `generateStaticParams`. Wat het
      blokkeert is de nonce-based enforce-CSP — een gecachete respons draagt een
      verouderde nonce en `'strict-dynamic'` blokkeert dan élk script (gemeten: 6 van de
      10 CSP-tests falen). Vereist een CSP-scope voor publieke routes zonder per-request
      nonce, met hashes per build plus een guard tegen drift. Geraamd 2-4 dagen.
      Heropenen wanneer er verkeer is dat het rechtvaardigt — bij 4 page-events was dat
      er niet.
- [ ] **ADR-addendum overwegen.** "Dynamische rendering is voortaan bewust permanent,
      omdat nonce-CSP en caching elkaar uitsluiten" is een architecturale vaststelling.
      Erik koos bij richting A expliciet voor een notitie in plaats van een ADR; het is
      het overwegen waard zodra iemand punt D oppakt.

# Out of scope

- Meertaligheid van de publieke routes (`PUBLIC_CONTENT_LANG` is nu een constante).
  Dat hoort bij open beslissing #3 in `START_HERE.md`.
