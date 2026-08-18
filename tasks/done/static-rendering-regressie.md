---
id: static-rendering-regressie
title: Hele app rendert dynamic door één cookie-read in de root layout — static/ISR is app-breed inert
fase: post-launch
priority: next
effort: 1 dag (meting + fix + 5 reviewrondes)
owner: claude-code
status: done
created: 2026-08-18
completed: 2026-08-18
related-adr: docs/adr/2026-08-18-csp-enforce-nonce-en-hashes.md
related-spec: -
worktree: branddock-static-rendering-regressie
---

# Probleem

Bij de CSP-enforce-flip (18-08) bleek uit de build-uitvoer dat **élke pagina-route
`ƒ (Dynamic) — server-rendered on demand` is**. Alleen twee icon-PNG's zijn `○ (Static)`.

Oorzaak: `src/app/layout.tsx:26` doet `await cookies()` om de UI-locale te bepalen
(`UI_LOCALE_COOKIE`). Een cookie-read in de **root layout** zet de hele app op dynamic
rendering — dat is Next-gedrag, geen bug in onze code.

Het gevolg is dat twee bestaande optimalisaties al maanden niets opleveren:

- **`generateStaticParams`** op `/marketing/features/[slug]`, `/marketing/solutions/[slug]`
  en `/marketing/vergelijk/[slug]` — de marketing-site wordt bij élk bezoek
  server-gerenderd in plaats van als statische HTML geserveerd.
- **`revalidate = 604800`** op `/p/[workspace]/[slug]` — de ISR-cache van de gepubliceerde
  klant-landingspagina's. Die pagina's zijn een betaald productonderdeel; ze horen zo snel
  mogelijk te laden, en het bevroren `compiledHtml`-artifact (ADR 2026-08-12) is er
  expliciet voor gebouwd om dat te kunnen.

Niemand heeft dit gemerkt omdat het nergens misgaat: de pagina's werken, ze zijn alleen
duurder en trager dan bedoeld. Het is uitsluitend zichtbaar in de `next build`-tabel.

# Meting 2026-08-18 (worktree `branddock-static-rendering-regressie`)

Alles hieronder is gemeten, niet beredeneerd. Baseline-build, experiment-build en
een runtime-probe op `next start`; prod-cijfers via curl tegen `branddock.app`.

## 1. De diagnose klopt — en de winst is groter dan het task-file aannam

`next build` route-tabel, ongewijzigde main (`d360caad`):

| | static | dynamic |
|---|---:|---:|
| Baseline | 2 (alleen `icon.png`, `apple-icon.png`) | 29 pagina-routes |

> Telnotitie: een kale `grep` op de rendermode-tekens telt óók de twee
> legenda-regels onderaan de tabel mee en geeft dan 3 ○ / 593 ƒ. De cijfers
> hierboven zijn de échte routes.
| Cookie-read uit de root layout | **26** | 5 |

De vijf die dynamisch blijven zijn dat terecht: `/brandmd/claim/[token]` (token),
`/llms.txt`, `/robots.txt`, `/sitemap.xml` (expliciet `force-dynamic`) en
`/.well-known/*`. **Alle 13 marketing-routes** worden statisch, inclusief de drie
`generateStaticParams`-routes die dan pas écht SSG worden.

## 2. `/p/[workspace]/[slug]` heeft een TWEEDE, onafhankelijke oorzaak

De layout-fix alleen is niet genoeg — de route blijft `ƒ` en ongecached. Oorzaak:
een dynamisch segment **zonder `generateStaticParams`** krijgt in Next 16 geen
ISR-pad, ook niet met `export const revalidate`. Gemeten met een lege
`generateStaticParams(): []`:

- route-tabel: `ƒ` → `● (SSG)`
- runtime `next start`: 1e request `x-nextjs-cache: MISS`, 2e **`HIT`**,
  `Cache-Control: s-maxage=604800, stale-while-revalidate=30931200`

De `revalidate = 604800` die er sinds de P0-ISR-fix staat wordt dus pas effectief
mét die twee regels. Zonder: `private, no-cache, no-store` op élke view.

## 3. Wat het vandaag op productie kost

| Route | TTFB mediaan | min / max | CDN |
|---|---:|---|---|
| `/marketing/pricing` | 168 ms | 143 / 264 | MISS, `no-store` |
| `/marketing/features/campaigns` | 172 ms | 141 / 413 | MISS, `no-store` |
| `/marketing/platform` | 178 ms | 158 / 206 | MISS, `no-store` |
| `/brandmd` | 177 ms | 116 / 448 | MISS, `no-store` |
| `linfi.branddock.app/pillar-page` | **264 ms** | 194 / **1832** | MISS, `no-store` |

Elke view van de klant-landingspagina draait de volledige DB+render-keten. Lokaal
statisch geserveerd wordt dezelfde marketing-pagina `s-maxage=31536000`.

## 4. Een correctheidsbug die losstaat van prestaties

De root layout zet `<html lang>` uit de UI-cookie. **Geen enkele publieke route
gebruikt `useTranslation`** (marketing 0, brandmd 0, `/p` 0) — die zijn
hardgecodeerd Nederlands. Gevolg, geverifieerd op prod:

- `branddock.app/marketing/pricing` zonder cookie → `<html lang="en">`; mét
  `branddock-ui-locale=nl` → `lang="nl"`
- `linfi.branddock.app/pillar-page` → `<html lang="en">` terwijl
  `LandingPage.locale = 'nl-NL'`

Elke nieuwe bezoeker — dus de complete acquisitie-funnel — krijgt een Nederlandse
pagina met `lang="en"`. De app betaalt volledige dynamische rendering om een
attribuut te berekenen dat op juist die pagina's fout uitpakt.

## 5. ⚠️ De blocker die het task-file niet kende: nonce-CSP ↔ caching

Sinds de enforce-flip van vandaag is `script-src` **nonce-based met
`'strict-dynamic'`**, per request gezet door `src/proxy.ts`. Dat verdraagt zich
principieel niet met een gecachete respons:

- **Statische marketing-pagina**: prod (dynamisch) stempelt 38 `nonce=`-attributen;
  de statische build serveert dezelfde 38 script-tags met **0** nonces, terwijl de
  header wél een verse nonce-CSP draagt.
- **Gecachete `/p`**: de nonce in de bewaarde HTML (`NjM5…`) verschilt van die in de
  header bij een cache-HIT (`ZmY4…`).

In beide gevallen blokkeert `'strict-dynamic'` alles wat geen geldige nonce heeft.
**Bewijs**: `npm run test:csp` tegen de statische build → **6 van de 10 falen**,
`script-src-elem`-violations op `/marketing`, `/marketing/pricing`, `/brandmd`,
`/brandmd/use` en `/`. Op main staat diezelfde suite groen.

De ADR-aanname *"de CSP is bewust zo ontworpen dat statische rendering hier terug
kan komen"* geldt alleen voor de twee **hash**-toegestane snippets van het
`compiledHtml`-artifact — niet voor de ~38 Next-bootstrapscripts, die aan de nonce
hangen. Statisch renderen is dus niet vrij te schakelen zonder de CSP te heropenen.

## 6. Verkeer: de eerlijke tegenweging

Op prod, gemeten: **4 `PageEvent`-rijen in totaal** (oudste 14-08), **1**
gepubliceerde landingspagina, 4 brand.md-scans. De prestatiewinst is vandaag dus
vrijwel nul. Net als bij de retentie-indexen van 18-08 beschrijft de tekst van de
taak een probleem dat de meting niet in die orde van grootte terugvindt.

Wat wél nú waar is, ongeacht verkeer: de `lang`-bug, en het feit dat
`generateStaticParams` (3×) en `revalidate` (1×) een optimalisatie suggereren die
aantoonbaar niet plaatsvindt.

## 7. Gat in de bewaking

`e2e/tests/security/csp-enforce.spec.ts` laadt `/marketing`, `/marketing/pricing`,
`/brandmd`, `/brandmd/use` en `/` in een echte browser — die vangen dit dus. Maar
`/p/<workspace>/<slug>` zit **niet** in `PUBLIC_ROUTES`; van de landingspagina wordt
alleen de header-scope getoetst, niet of de pagina zonder violations draait. De
stale-nonce bij een cache-HIT zou daar ongezien passeren.

# Voorstel

Eerst **meten**, dan pas kiezen — de omvang van de winst bepaalt of de fix de moeite waard is.

Meting: hoeveel schelen de betrokken routes in TTFB/renderkosten als ze wél statisch of
ISR-gecached zijn? Vercel-analytics per route + een lokale vergelijking volstaan.

Richtingen voor de fix (nog niet gekozen, elk met een eigen prijs):

1. **De locale-read uit de root layout halen** en per route-segment afhandelen — publieke
   routes (`/marketing/*`, `/p/*`, `/brandmd`) hebben geen per-gebruiker-locale nodig; de
   app-routes wel. Vergt uitzoeken wat `I18nProvider` precies nodig heeft bij eerste render.
2. **Locale uit het pad in plaats van uit een cookie** voor de publieke routes
   (`/nl/...`, `/en/...`). Grootste ingreep, maar sluit aan op de openstaande wens
   "site meertalig" uit `START_HERE` §Open beslissingen #4.
3. **Bewust accepteren** en het vastleggen — dan horen `generateStaticParams` en
   `revalidate` weg, want die wekken nu de indruk dat er statisch gerenderd wordt.

Optie 3 is een geldige uitkomst: dit is een kosten/prestatie-afweging, geen defect.

# Besluit 2026-08-18 (Erik) — richting A

**De rendermodus blijft bewust dynamisch; de correctheidsbug wordt gefixt.**

Reden: statisch renderen is geen vrije schakelaar meer (§5) en de prestatiewinst
is bij 4 page-events niet te verantwoorden (§6), terwijl de `lang`-bug (§4) élke
bezoeker van de acquisitie-funnel raakt en losstaat van verkeer.

Optie 2 (locale uit het pad) is niet gekozen: die lost de nonce-blokkade evenmin
op, want die staat los van hoe de taal bepaald wordt.

## Wat er gebouwd is

- `src/lib/ui-i18n/document-locale.ts` — **nieuw**. Scheidt de documenttaal van
  de UI-taal: marketing en brand.md → `nl`, `/p/<ws>/<slug>` → `LandingPage.locale`,
  app-routes → de cookie (ongewijzigd gedrag).
- `src/proxy.ts` — zet `x-pathname` op de request-headers, met het **effectieve**
  pad (ná host-rewrite), zodat een custom-domein-landingspagina als
  `/p/<ws>/<slug>` binnenkomt. Onvoorwaardelijk `set`, dus een door de client
  meegestuurde `x-pathname` wordt overschreven.
- `src/app/layout.tsx` — `<html lang>` uit de resolver.
- `src/lib/ui-i18n/document-locale.shared.ts` + `DocumentLangSync.tsx` — **nieuw**.
  De prefix- en padregels staan in één puur bestand dat server én client lezen, en
  een client component houdt `<html lang>` correct ná een client-side navigatie.
  `I18nProvider` beheert het attribuut niet meer: die mount één keer per sessie en
  ziet een routewissel dus niet.
- `scripts/smoke-tests/document-lang-resolution.ts` + `npm run smoke:document-lang`
  — 61 deterministische checks: de gedeelde regels, de host-routing, de
  server-precedentie én de bedrading van de lookup (geen DB, geen browser).
  Draait mee in de CI-`check`-job.
- `scripts/smoke-tests/document-lang-browser.ts` + `npm run smoke:document-lang-browser`
  — twee fases: fase 1 leest de RAUWE serverrespons (dekt proxy → root layout, géén
  browser), fase 2 checkt ná hydratie en ná client-side navigatie. Vereist een draaiende
  productieserver, dus niet in CI.
- 3× `generateStaticParams` + de `revalidate` op `/p` — geannoteerd met de gemeten
  reden waarom ze vandaag niets doen. Bewust laten staan: ze werken meteen zodra de
  CSP-blokkade opgelost is. (Ze bepalen NIET welke slugs geldig zijn — `dynamicParams`
  staat nergens op `false` en de pagina's 404'en zelf.)
- `e2e/tests/security/csp-enforce.spec.ts` — nieuwe `nonce-integriteit`-guard.

## Reviewronde (2 subagents, 2026-08-18)

0 CRITICAL. Beide reviewers vonden onafhankelijk dezelfde twee zwaarste punten:

1. **`syncDocumentLang` overleefde client-side navigatie niet** (die prop bestaat inmiddels
   niet meer — zie ronde 2). De prop bevroor bij
   mount; de root layout re-rendert niet bij een `next/link`-navigatie tussen
   route-groepen. Een bezoeker die vanaf `/marketing/pricing` op een CTA klikte
   belandde met `lang="nl"` in de Engelse app-shell, en de taalwissel werkte het
   attribuut daarna de hele sessie niet meer bij. Die CTA's zijn relatieve links
   zolang `NEXT_PUBLIC_APP_URL` leeg is, dus dit was een echt pad — en mijn
   6/6-meting kon het niet zien omdat die met verse page loads werkte.
   **Opgelost** met `DocumentLangSync` (leidt de eigenaar per navigatie af uit
   `usePathname()`), en de meting is uitgebreid met vier navigatiescenario's.
2. **Mijn rechtvaardiging voor het laten staan van `generateStaticParams` was
   onjuist**: `dynamicParams` staat nergens op `false` en de pagina's 404'en zelf
   via `notFound()`, dus die lijst definieert géén geldige slugs. De afwijking van
   het acceptatiecriterium blijft, maar nu op de juiste grond.

Verder opgelost: `status: 'PUBLISHED'` + deterministische `orderBy` op de
locale-lookup (een concept-pagina gaf anders haar locale prijs op een publieke
route), validatie zodat `<html lang="">` niet kan ontstaan, een log in de
catch, segmentgrens-matching op de prefixen, de tegenstrijdige JSDoc boven
`interface Props` in de `/p`-route, en de nonce-guard die met één GET vals-groen
kon staan (nu twee opeenvolgende requests + script-tag-telling).

**Bewust niet opgelost** (genoteerd als restwerk): de extra DB-query in de root
layout op `/p` — de taal moet daar bekend zijn vóór de pagina draait, dus die
round-trip is de prijs. En de drie `revalidatePath('/p/…')`-aanroepen in de
publish/rollback-routes zijn per dezelfde meting even effectloos als de
geannoteerde `revalidate`; die zijn niet meegenomen in de annotatieronde.

## Reviewronde 2 — één CRITICAL, en die zat in mijn eigen fix

**De client-sync sloopte de marketing-homepage op productie.** `decideHostRoute`
rewrite't de apex-root `/` naar `/marketing`, dus de server resolvet daar correct
`lang="nl"`. Maar `usePathname()` geeft het **browserpad** (`/`), en de eerste versie
van `DocumentLangSync` beoordeelde dát pad: `/` is geen Nederlandse prefix, dus zette
hij ná hydratie `lang="en"` — op de canonieke entry van de hele acquisitie-funnel.
De fix van de ene helft introduceerde daarmee dezelfde bug in de andere.

Waarom geen van mijn metingen dit ving: ze draaien op `localhost`, en dat is geen
apex-host. Daar ís `/` een app-route, dus `lang="en"` was daar het juiste antwoord.
Het scenario bestond simpelweg niet in de testomgeving.

**Opgelost** door de client dezelfde routingfunctie te laten gebruiken als de
middleware: `resolveClientLangDecision(host, pathname)` haalt het browserpad eerst
door `decideHostRoute`. Server en client kunnen nu niet meer uit elkaar lopen, en de
apex- en workspace-hostregels staan als deterministische checks in de smoke — de
enige plek waar ze lokaal toetsbaar zijn.

Verder uit ronde 2 verwerkt: de `owner`-prop is dood geworden en verwijderd, de
assertie "twee requests kregen dezelfde nonce" is eruit (die kón niet falen — de proxy
maakt per request een verse nonce, ook bij een cache-hit), de nonce-telling kijkt nu
alleen naar script-tags, het comment in `brandmd/layout.tsx` klopt weer, de smoke
draait daadwerkelijk in CI, en drie claims in dit bestand die de code weerspraken zijn
rechtgezet.

## Ronde 3 — en een fix die zijn eigen claim niet haalde

Beide reviewers: 0 CRITICAL. Eén verifieerde de hele bewijstabel door de gates zelf te
draaien (`tsc`, `lint`, `test:csp` 15/15, `smoke` groen, `build`) — alle claims kloppen.

Twee inhoudelijke fixes: de locale-lookup is nu injecteerbaar (verwissel workspace en
slug en élke klantpagina viel stil terug op de fallback-taal, terwijl de gate groen
bleef), en de nonce-guard heeft een eigen routelijst (het geplande restwerk "`/p` aan de
sweep toevoegen" zou hem per definitie breken, want die scope draait op hashes zónder
nonce). Het browserharnas is een echt script geworden in plaats van een weggooibestand.

⚠️ **Eén voorgestelde fix haalde zijn doel niet, en dat is gemeten.** Een reviewer wees
erop dat de statische `import { prisma }` via de root layout aan élke route hangt: de
marketing-lambda traceerde 11 Prisma-bestanden inclusief een wasm van 4,9 MB. Ik heb er
een lazy `await import()` van gemaakt — en ná de build staan die 11 bestanden er nog
steeds, exact zoveel als bij de `/p`-route. Next' file-tracer volgt een dynamische
import gewoon mee. Wat de wijziging wél oplevert is uitgestelde module-evaluatie
(`src/lib/prisma.ts` bouwt een `pg.Pool` op module-scope), en zo staat het nu in het
comment. De bundle-kant blijft open.

## Ronde 4 — de gate zelf was het probleem

Een adversariële reviewer kreeg de opdracht de fix te BREKEN in plaats van te
beoordelen. Dat lukte, met één regel.

**Verwijder `requestHeaders.set('x-pathname', …)` uit `src/proxy.ts` en de hele
server-side fix vervalt** — `/marketing/pricing` gaat van `lang="nl"` terug naar
`lang="en"`. En álle gates bleven groen: `tsc` 0, `smoke:document-lang` 61/61,
`test:csp` ziet het niet (nul lang-assertions), en **de browser-smoke meldde OK
`lang="nl"` tegen HTML die letterlijk `lang="en"` zei**.

De oorzaak is logisch zodra je 'm ziet: `DocumentLangSync` repareert de DOM ná
hydratie. Een browsercheck meet dus de client-fix en kán structureel niet falen op
de server-fix — terwijl juist crawlers en schermlezers, die dat effect nooit
draaien, de begunstigden van dat server-deel zijn. De hele fix hing aan twee losse
string-literals (`'x-pathname'` in de proxy en in de layout) zonder enige dekking.

**Opgelost**: `smoke:document-lang-browser` draait nu in twee fases. Fase 1 leest de
RAUWE serverrespons zonder browser en dekt de keten proxy → root layout; fase 2 doet
de bestaande post-hydratiechecks. Nagemeten met exact dezelfde mutatie: fase 1 geeft
**4 FOUT**, fase 2 blijft op die routes groen — het verschil dat het bestaansrecht
van fase 1 is.

Verder uit ronde 4: `NONCE_GUARD_ROUTES` was een alias van `PUBLIC_ROUTES` (dezelfde
array-referentie) terwijl het comment "bewust een EIGEN lijst" claimde — nu een echt
filter, zodat het geplande restwerk de guard niet kan slopen. Twee vals-groen-vectoren
uit het browserharnas verwijderd: een `click('body')` die op een echte link kon landen,
en een `PopStateEvent`-dispatch die aantoonbaar niets deed (Next' handler returnt op
`state === null`). De `LP_PATH`-skip is nu zichtbaar in plaats van stil. En één
kalibratiegetal klopte niet meer: de publieke-route-tak slopen geeft **4** van de 61,
niet 3 — verouderd sinds de bedradingschecks van ronde 3, zelf nagemeten.

## Bewijs

| Gate | Uitkomst |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npx eslint <gewijzigde bestanden>` | 0 errors — ⚠️ dekt de e2e-spec NIET; `e2e/` valt in een eslint-ignore-pattern |
| `npm run test:csp` | **15/15** (was 10/10; 5 nieuwe nonce-integriteitchecks) |
| `npm run smoke:document-lang` | **61/61** — deterministisch, draait mee in de CI-`check`-job |
| `next build` route-tabel | **identiek aan baseline** (2 statische routes: de twee icon-PNG's), zoals bedoeld |
| `npm run smoke:document-lang-browser` | **16/16** — 6 server-HTML- + 10 post-hydratiechecks. ⚠️ Alleen mét `LP_PATH` gezet; zonder is het 14 en wordt de DB-tak overgeslagen |

**Kalibratie** (een groene check is pas bewijs als hij kan falen):

- Client-sync uitgezet → **3 van de 4 navigatiescenario's falen**; de 6 page loads
  blijven groen, want het server-deel staat daar los van. De vierde navigatie
  discrimineert niet (verwachting en beginwaarde zijn allebei `nl`).
- `matchesPrefix` teruggezet naar een kale `startsWith` → **3 van de 61** smoke-checks vallen om.
- De publieke-route-tak uit `decideDocumentLang` gesloopt → **4 van de 61** vallen om
  (was 3 vóór de bedradingschecks van ronde 3; nagemeten in ronde 4).
- De argumenten van de locale-lookup verwisseld → **2 van de 61** vallen om.
- `requestHeaders.set('x-pathname', …)` uit `src/proxy.ts` verwijderd → **4 van de 16**
  browser-checks vallen om, allemaal in fase 1. Fase 2 blijft op die routes groen; dat
  verschil is precies waarom fase 1 bestaat.
  (Die tweede is er gekomen ná review: de gate toetste eerst alleen losse helpers,
  waardoor je een hele tak uit de resolver kon halen zonder dat er iets rood werd.)

⚠️ **Wat het browseronderzoek NIET kan dekken**: het draait op `localhost`, en dat is
geen apex-host. Op productie rewrite `decideHostRoute` de apex-root `/` naar
`/marketing` — daar is `/` dus de Nederlandse homepage, terwijl het lokaal een
app-route is. Precies dáár zat de fout die reviewronde 2 vond (zie hieronder). Die
regel is nu vastgelegd in de smoke (`resolveClientLangDecision`-checks met echte
hostnamen), omdat een lokale browsercheck hem per constructie niet kan raken.

## Wat bewust NIET is gedaan

> Alle punten hieronder staan óók als afvinkbare lijst in
> [`tasks/document-lang-followups.md`](../document-lang-followups.md), zodat ze niet
> met dit bestand mee naar `done/` verdwijnen.

- **Statisch renderen aanzetten.** Vereist eerst een antwoord op de nonce-vraag:
  een CSP-scope voor publieke routes die zonder per-request nonce werkt (hashes
  per build + guard tegen drift). Geraamd 2-4 dagen, met regressierisico op een
  CSP die vandaag pas op enforce ging. Heropenen wanneer er verkeer is dat het
  rechtvaardigt — de meting in §1-§3 ligt er dan klaar.
- **`/p/<ws>/<slug>` in de browser-violation-sweep.** De e2e-seed bevat geen
  landingspagina; een fixture vraagt vier entiteiten (Campaign → Deliverable →
  LandingPage → PagePublish). De nieuwe nonce-guard dekt de gemeten hazard wél,
  maar op de andere publieke routes. Restwerk.
- **`/oauth/login`, `/oauth/consent` en `/reset-password`.** Het spiegelbeeld van de
  gefixte bug: die pagina's zijn hardgecodeerd ENGELS maar volgen nog de cookie, dus een
  bezoeker met `branddock-ui-locale=nl` krijgt daar `<html lang="nl">` op Engelse tekst.
  Geen SEO-impact (auth-schermen, niet geïndexeerd), wel dezelfde soort onwaarheid.
- **`/invite/accept`.** Dezelfde klasse: Nederlandse content op een publieke route die
  haar taal uit `?lang=` haalt, terwijl `<html lang>` de bezoekerscookie volgt. Niet
  meegenomen omdat de juiste waarde daar uit de query komt en niet uit een prefix — dat
  vraagt een eigen beslissing over precedentie. Gevonden in review, bewust open gelaten.
- **De `gotchas.md`-entry en de changelog-entry zitten NIET in deze PR.** Beide
  bestanden zijn per `gotchas.md` 2026-08-18 de drukste schrijfplek van de repo, en er
  draaiden vier parallelle sessies tijdens dit werk. Ze gaan als losse doc-PR van één
  bestand, zoals die gotcha voorschrijft. Concepten liggen klaar.
- **Een ADR-addendum bij `docs/adr/2026-08-18-csp-enforce-nonce-en-hashes.md`.** Een
  reviewer merkte terecht op dat "dynamische rendering is voortaan bewust permanent,
  omdat nonce-CSP en caching elkaar uitsluiten" een architecturale vaststelling is die
  nu alleen in dit task-file staat. Erik koos bij richting A expliciet voor een notitie
  in plaats van een ADR; dat blijft staan, maar het is het overwegen waard zodra iemand
  de statische-renderingvraag heropent.
- **De drie `revalidatePath('/p/…')`-aanroepen** in de publish-, rollback- en
  deliverable-routes zijn per dezelfde meting even effectloos als de geannoteerde
  `revalidate`, maar zijn niet geannoteerd. Strikt genomen is het criterium "niets
  suggereert nog een optimalisatie die niet plaatsvindt" daarmee niet volledig gehaald.
- **Meertaligheid van de publieke routes.** `nl` staat nu als constante in
  `document-locale.shared.ts`. Zodra de site meertalig wordt (open beslissing #3 in
  `START_HERE.md`) hoort die constante een lookup te worden.

# Acceptatiecriteria

- [x] Meting vastgelegd: wat kost de huidige situatie per route (TTFB + Vercel-functie-tijd)
- [x] Beslissing genomen en vastgelegd (ADR bij optie 1 of 2; notitie bij optie 3)
- [–] ~~Bij een fix: `next build`-route-tabel laat de bedoelde routes als `○` of ISR zien~~
      **N.v.t. bij richting A.** De route-tabel moet juist ONgewijzigd blijven; geverifieerd:
      2 statische routes (de twee icon-PNG's), alle pagina-routes `ƒ` — identiek aan de
      baseline. Dit criterium hoort bij optie 1/2.
- [~] Bij een fix: taal-switch blijft werken op zowel publieke als app-routes
      **Deels**: de resolutie per route is gedekt (16 browser-checks), maar een
      runtime-taalwissel — de `languageChanged`-tak in `DocumentLangSync` — heeft géén
      gate. Handmatig waargenomen, niet geborgd. Staat in `tasks/document-lang-followups.md`.
- [~] Bij optie 3: de misleidende `generateStaticParams`/`revalidate` zijn verwijderd
      **Bewust afgeweken**: niet verwijderd maar geannoteerd met de gemeten reden. Ze blijven
      staan zodat de routes meteen SSG zijn zodra de nonce-blokkade weg is, en `revalidate` is
      de bedoelde TTL. (Een eerdere versie van deze regel beweerde dat `generateStaticParams`
      de geldige slugs definieert — dat is onjuist: `dynamicParams` staat nergens op `false`
      en de pagina's 404'en zelf via `notFound()`.) Het doel van het criterium — niets
      suggereert nog een optimalisatie die niet plaatsvindt — is gehaald.
- [x] `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors
- [x] `npm run test:csp` blijft groen (15/15) — de CSP-scope-indeling hangt niet aan rendermodus,
      maar de landingspagina-hashes bestaan juist zodat statische rendering daar terug kán

# Bestanden die ik aanraak

Bijgewerkt ná uitvoering (de oorspronkelijke schatting noemde `config.ts`, dat
onaangeraakt bleef):

**Nieuw**
- `src/lib/ui-i18n/document-locale.ts` — server-resolutie (lazy Prisma-lookup)
- `src/lib/ui-i18n/document-locale.shared.ts` — de regels die server én client delen
- `src/lib/ui-i18n/DocumentLangSync.tsx` — client-sync ná navigatie
- `scripts/smoke-tests/document-lang-resolution.ts` — pure gate (61 checks)
- `scripts/smoke-tests/document-lang-browser.ts` — runtime-gate (10 scenario's)

**Gewijzigd**
- `src/app/layout.tsx` — `<html lang>` uit de resolver
- `src/lib/ui-i18n/I18nProvider.tsx` — beheert `lang` niet meer
- `src/proxy.ts` — zet `x-pathname` (één regel in `headersFor`)
- `src/app/brandmd/layout.tsx` — comment bij het `lang="nl"`-vangnet
- `src/app/marketing/{features,solutions,vergelijk}/[slug]/page.tsx` — annotatie
- `src/app/p/[workspace]/[slug]/page.tsx` — annotatie bij `revalidate` + JSDoc
- `e2e/tests/security/csp-enforce.spec.ts` — nonce-integriteitguard
- `.github/workflows/ci.yml` + `package.json` — de pure gate in CI

# Bestanden die ik NIET aanraak

- `src/lib/security/security-headers.ts` — de CSP is klaar en staat los van deze vraag.
  ⚠️ `src/proxy.ts` stond hier aanvankelijk óók bij, maar is wél aangeraakt: er wordt één
  regel toegevoegd in `headersFor()` die `x-pathname` op de request-headers zet. De
  CSP-opbouw zelf is ongemoeid.

# Smoke test plan

1. `npm run build` en de route-tabel vergelijken met de baseline (2 statische routes:
   de twee icon-PNG's; alle pagina-routes `ƒ`)
2. Een marketing-pagina en een gepubliceerde `/p/…` ophalen en TTFB vergelijken vóór/ná
3. Taal wisselen in de app en controleren dat publieke pagina's de juiste taal tonen
4. `npm run test:csp` — 15/15 (10 bestaand + 5 nieuwe nonce-integriteitchecks)

# Risico's

- **Locale-regressie**: de UI-taal komt nu uit een cookie die overal beschikbaar is. Elke
  splitsing riskeert dat een route de verkeerde taal toont, of een flits van de verkeerde
  taal bij hydratie.
- **De winst kan tegenvallen.** Vandaar meten vóór bouwen: als de marketing-site toch al
  snel genoeg is, is optie 3 het eerlijke antwoord.
- **Raakt de meertaligheids-wens** uit `START_HERE` §Open beslissingen #4 — als die richting
  op korte termijn opgepakt wordt, hoort deze taak daarin op te gaan in plaats van er
  los naast te lopen.

# Out of scope

- De brand.md-funnel meertalig maken (eigen open beslissing)
- Alles aan de CSP

# Notes

- Ontdekt tijdens de CSP-enforce-flip; volledige onderbouwing in
  [`ADR 2026-08-18`](../docs/adr/2026-08-18-csp-enforce-nonce-en-hashes.md) §Context punt 4
  en in `gotchas.md` 2026-08-18.
- De CSP is bewust zo ontworpen dat statische rendering hier terug kan komen: de
  landingspagina's hangen aan snippet-hashes en niet aan een per-request nonce.
