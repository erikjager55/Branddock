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
      ✅ **Rest afgerond 19-08 (#436)**: chromium staat nu in de `check`-job, dus
      **14 van de 15** draaien. Het alternatief — de sweep naar de `e2e`-job — was
      duurder: die draait `npm run dev` terwijl de sweep een PRODUCTIEBUILD nodig
      heeft, dus dat had daar een tweede build gekost.
      De vijftiende (`ingelogde app-shell`) blijft eruit: hij logt in en vraagt een
      GESEEDE database, en faalt zonder die op `sign-in faalde` — niet op een
      violation.

      **Wat het werkelijk kostte** (CI-run 32302698658, tegen 8m58s daarvoor):

          Browsercache            0m03s
          Install chromium        OVERGESLAGEN — cache-hit
          taalbewaker fase 1+2    0m59s   (was 0m09s)
          CSP-sweep               0m16s   (was 0m05s)
          hele check-job          10m21s  (+1m23s, limiet 30 min)

      ⚠️ De risico-analyse ging uit van een chromium-DOWNLOAD, met de hangs van
      18-08 als gevaar. Dat gevaar geldt niet op het normale pad: de cachesleutel
      is dezelfde die de `e2e`-job al vult, dus de installatie wordt overgeslagen.
      De dominante nieuwe kost is fase 2 van de taalbewaker (+50s), niet chromium.

      ⚠️ **20-08 — die +50s bleek geen kost maar een symptoom.** De `check`-poort ging
      flappen op main (rood/groen/groen/rood binnen twintig minuten). Oorzaak: de
      browserfase wachtte op `networkidle`, en `/marketing/pricing` haalt tien externe
      dingen op — een typekit-stylesheet in `<head>` (blokkeert de parser) en vier
      PostHog-scripts (blijven pollen). In de GESLAAGDE run duurde één navigatie 24,6s
      van de 30s limiet; de marge was er nooit. Gefixt in #445 door alles buiten de
      eigen host af te kappen. Zie de gotcha van 20-08.

      🔭 **Openstaand risico, bewust niet meegefixt: `csp-enforce.spec.ts` doet hetzelfde.**
      Regel 168 en 182 gebruiken óók `waitUntil: 'networkidle'`, op dezelfde routes, in
      dezelfde `check`-job.

      **De fix van #445 werkt daar niet.** Een CSP-test bestaat juist om te zien wát de
      pagina probeert te laden; externe verzoeken afkappen zou overtredingen kunnen
      onderdrukken die hij moet vangen (een geblokkeerde bron bereikt de route-laag niet,
      maar een tóegestane bron die vervolgens meer laadt wél).

      Gemeten 20-08, drie rondes lokaal tegen een productiebuild: **3× 5/5 groen,
      11,5-12,1s.** Lokaal is echter niet waar de taalbewaker faalde — dat was CI, waar
      externe hosts trager en wisselvalliger zijn. En de CSP-stap is daar nog nooit
      gedraaid met een groene voorganger, want de job viel eerder al om op de taalbewaker.

      **Toetsbare verwachting**: gaat `test:csp` ná #445 flappen in CI, dan is dit de
      oorzaak. De juiste ingreep is dan `waitUntil: 'load'` met de bestaande vaste
      1000ms erachter — níet externe verzoeken blokkeren.
- [x] **`npm run smoke:document-lang-browser`** — ✅ **fase 1 af 2026-08-19 (#380).**
      Het probleem was de kóppeling, niet de kosten: hij vroeg een server én een
      browser, dus draaide hij nergens. Fase 2 zit nu achter `SMOKE_BROWSER=1`; fase 1
      draait in de `check`-job tegen `next start` (10 checks). ✅ **Fase 2 draait sinds
      19-08 mee** (#436), samen 22 checks.

      ⚠️ Maar fase 2 was tot dat moment **stuk**: hij navigeerde met
      `history.pushState`, en dat werkt `usePathname()` in Next 16.2.9 niet bij. Drie
      scenario's faalden dus ongeacht het gedrag van `DocumentLangSync` en bewezen
      niets. Gerepareerd naar een echte klik op een `next/link` (#435). Twee
      scenario's melden zich luid als overgeslagen omdat er geen link van de
      app-shell naar `/marketing` of `/brandmd` is — een grens van wat er kán
      gebeuren, geen dekkingsgat.
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
- [x] **Een nieuwe publieke NL-route toevoegen is onbeschermd** — ✅ **af 2026-08-19**
      (#384). `smoke:route-language` leest de bestandsboom en eist dat elke route bij
      precies één taalregel hoort. Faalt bij *vergeten*, niet bij toevoegen; alle 25
      bestaande routes zijn geclassificeerd.

      ⚠️ En hij vond meteen een gat dat de indeling zelf niet dekte: `/brandmd/claim/
      [token]` is volledig Engels (0 Nederlandse tegen 29 Engelse stopwoorden) maar erfde
      `lang="nl"` van `/brandmd`. Toevoegen aan `ENGLISH_PUBLIC_PREFIXES` hielp niet —
      de Nederlandse lijst werd eerst getoetst, dus elke Engelse uitzondering eronder was
      dode code. Nu wint de **langste match** (#396). De bewaker toetst sindsdien ook of
      de indeling *klopt* met de tekst, niet alleen dát er een indeling is.

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

      ## ⛔ Alle drie de Next-API's geprobeerd — geen ervan werkt

      Uitgezocht op 2026-08-19/20, drie builds:

      | aanpak | uitkomst |
      |---|---|
      | `not-found.tsx` in het segment | `<html id="__next_error__">`, geen `lang` |
      | `not-found.tsx` op rootniveau | idem |
      | `global-not-found.tsx` + `experimental.globalNotFound` | idem |

      Die derde is de interessantste, want die API rendert per ontwerp een eígen
      `<html>`-element — en tóch houdt Next voor dit geval zijn foutdocument aan.

      De meting discrimineert: in dezelfde run gaven `/marketing/bestaat-niet`
      wél `lang="nl"`, `/marketing/pricing` `lang="nl"` en `/reset-password`
      `lang="en"`. Het is dus niet zo dat er niets werkte.

      **Conclusie: dit is een grens van Next 16.2.9, geen bedradingsgat.** Een
      `notFound()` uit een dynamisch segment tijdens een dynamische render valt
      terug op het ingebouwde foutdocument, en geen van de not-found-API's
      vervangt dat. Wie het alsnog wil oplossen, ontkomt niet aan het vermijden
      van `notFound()` zelf — bijvoorbeeld door de route een eigen 404-weergave
      te laten renderen en de status elders te zetten. Dat is een herbouw van de
      route, geen attribuut-fix.

      Probeer de drie hierboven niet opnieuw; dat kost drie builds.

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

      ⚠️ **De chromium-blokkade is weg, de fixture-blokkade niet.** Tot 19-08 stond
      hier dat dit werk nul draaiende checks zou opleveren omdat de violation-sweep een
      browser vroeg die nergens stond. Die staat er nu (#436), dus de sweep draait — maar
      dat verplaatst de blokkade in plaats van hem op te heffen.

      Wat nu in de weg staat is de **database**. De sweep draait in de `check`-job met
      een neppe `DATABASE_URL`; `/p/<ws>/<slug>` heeft een echte gepubliceerde pagina
      nodig (Campaign → Deliverable → LandingPage → PagePublish) en zou daar dus falen op
      het ontbreken van de rij, niet op een CSP-violation.

      Twee wegen, en het is een keuze: de fixture in de e2e-seed zetten en de sweep dáár
      een tweede keer draaien (kost een build in die job), óf accepteren dat `/p` buiten
      de violation-sweep blijft. ⚠️ Voeg de route hoe dan ook toe aan `PUBLIC_ROUTES`,
      niet aan `NONCE_GUARD_ROUTES` — die filtert `/p` bewust uit (hash-scope zonder
      nonce).
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
      `loadPublishedPageSeo`, `resolvePublishedPage` en `loadLandingPageLocale`.

      **Gemeten 2026-08-19 — de risico-inschatting klopt structureel, maar er zijn nul
      gevallen.** De unieke sleutel is `@@unique([workspaceId, locale, slug])`, dus twee
      rijen met dezelfde slug en een andere locale kunnen inderdaad bestaan. Geteld:

      | | rijen | unieke (ws, slug) | locales |
      |---|---:|---:|---|
      | productie (Neon) | 1 | 1 | `nl-NL` |
      | dev | 2 | 2 | — |

      Nul dubbele slugs, in beide. Het is dus latent, niet actief.

      **Waar de drie precies uiteenlopen**, zodat de volgende persoon niet opnieuw hoeft
      te vergelijken:

      - `loadPublishedPageSeo` en `resolvePublishedPage` doen
        `findFirst({ workspaceId, slug })` **zonder `orderBy`** en toetsen `status` daarná.
        Bij twee rijen kiest de database willekeurig, en als dat de niet-gepubliceerde is
        volgt een 404 op een pagina die wél gepubliceerd is.
      - `loadLandingPageLocale` filtert `status: 'PUBLISHED'` **in** de query en sorteert
        op `updatedAt desc`. Die kiest dus altijd een gepubliceerde rij.

      Gevolg zodra er een tweede rij komt: het taalattribuut kan een pagina vinden die de
      render-route weigert.

      ⚠️ **Bewust nog niet verzoend.** De drie gelijktrekken vraagt een antwoord op *welke*
      rij juist is bij twee gepubliceerde locales, en dat is locale-onderhandeling — een
      productbeslissing die bij het multi-markt-spoor hoort, niet bij deze opruiming. Ze
      alle drie op `updatedAt desc` zetten zou de divergentie wegnemen maar een willekeurige
      keuze tot norm verheffen. Heropenen zodra multi-markt-pagina's echt landen; de
      meting hierboven is dan het startpunt (en check hem opnieuw — hij is van 19-08).

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
