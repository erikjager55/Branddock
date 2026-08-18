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
worktree: -
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

- [ ] **`npm run test:csp` staat in geen enkele workflow.** De nonce-integriteitguard
      (5 checks) is de énige automatische bescherming onder de bewuste keuze
      "dynamisch renderen blijft dynamisch", en hij draait alleen handmatig. Vereist
      een build + test-DB, dus het is een echte CI-kostenafweging — vandaar hier en
      niet eenzijdig doorgevoerd.
- [ ] **`npm run smoke:document-lang-browser` idem.** Zelfde reden; deze dekt de
      keten proxy → root layout (fase 1) en de client-sync (fase 2).
- [ ] **De `languageChanged`-listener heeft géén gate.** In `DocumentLangSync` staat
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

- [ ] **`/oauth/login`, `/oauth/consent`, `/reset-password`** — hardgecodeerd Engels,
      volgen nog de cookie. Een bezoeker met `branddock-ui-locale=nl` krijgt daar
      `<html lang="nl">` op Engelse tekst. Het spiegelbeeld van de gefixte bug; geen
      SEO-impact (niet geïndexeerd), wel dezelfde onwaarheid.
- [ ] **`/invite/accept`** — Nederlandse content, taal uit `?lang=`. Niet meegenomen
      omdat de juiste waarde daar uit de query komt en niet uit een prefix; dat vraagt
      een beslissing over precedentie.
- [ ] **`/p`-404's hebben helemaal géén `lang`-attribuut.** Er is nergens een
      `not-found.tsx`, dus Next' foutdocument vervangt de root layout. Pre-existing.

## C. Opgeruimd worden

- [ ] **Drie `revalidatePath('/p/…')`-aanroepen** (publish, rollback, deliverable-DELETE)
      zijn even effectloos als de wél geannoteerde `revalidate`, maar dragen geen
      annotatie. Strikt genomen is "niets suggereert nog een optimalisatie die niet
      plaatsvindt" daarmee niet volledig gehaald.
- [ ] **`/p/<ws>/<slug>` in de CSP-violation-sweep.** Vereist een fixture van vier
      entiteiten (Campaign → Deliverable → LandingPage → PagePublish); de e2e-seed heeft
      geen landingspagina. ⚠️ Voeg de route toe aan `PUBLIC_ROUTES`, niet aan
      `NONCE_GUARD_ROUTES` — die filtert `/p` er bewust uit (hash-scope zonder nonce).
- [ ] **`decideHostRoute` moet puur en client-veilig blijven.** `DocumentLangSync`
      importeert het via `document-locale.shared.ts`. Zodra `DomainMapping` live gaat
      moet die host door dezelfde resolutie — maar dat is een DB-lookup, dus die hoort
      in een aparte servertak, niet in `decideHostRoute` zelf.
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
