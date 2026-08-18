---
id: 2026-08-18-csp-enforce-nonce-en-hashes
title: CSP enforce-flip — nonce + strict-dynamic, met snippet-hashes voor de landingspagina's
status: accepted
date: 2026-08-18
supersedes: -
superseded-by: -
---

# Context

De nonce-CSP staat sinds 2026-07-17 in **Report-Only** op productie (stap 1+2 van de
migratie, `tasks/security-residual-hardening.md`). De enforce-flip stond genoteerd als
"gated op prod-Report-Only-data": eerst een periode rapporten verzamelen, dan flippen.

Bij het oppakken bleek die opzet niet te kunnen leveren wat ervan verwacht werd.

**De meting meet zichzelf.** De nonce wordt nergens op een script gestempeld — dat was
een bewuste keuze in de meetfase (`src/proxy.ts`, oude regels 22-26), omdat
nonce-propagatie pagina's naar dynamic rendering kan forceren. Gevolg: élk script op
élke pagina violeert de Report-Only-policy. De rapporten zijn dus vrijwel volledig
bekende ruis. Daarbij persisteert de collector niet (alleen `console.warn`) en bewaart
Vercel runtime-logs dagen, geen maand.

Daarom is de beslissing genomen op een **lokale meting tegen een echte productiebuild**
(`next build` + `next start`, dezelfde policy-headers als prod), met een browser die
`securitypolicyviolation`-events verzamelt over zes routes. Die meting leverde vier
uitkomsten die het ontwerp bepalen:

1. **Niets heeft `'unsafe-eval'` nodig.** Nul eval-violations over alle zes routes.
2. **Alle externe scripts zijn same-origin** (`_next/static/chunks/*`). Er is geen
   enkel derde-partij-script-host in gebruik; `js.stripe.com` staat in `script-src`
   maar wordt nergens als script geladen (checkout loopt via redirect).
3. **`<script type="application/ld+json">` valt niet onder `script-src`.** Op
   `/marketing` staan 33 inline scripts (32 JS + 1 JSON-LD) en vuren er 32
   violations. JSON-LD is data, geen uitvoerbare code — het heeft dus geen nonce en
   geen hash nodig.
4. **Er is vandaag niets statisch om te beschermen.** In de build-uitvoer is élke
   pagina-route `ƒ (Dynamic) — server-rendered on demand`; alleen twee icon-PNG's zijn
   `○ (Static)`. Oorzaak: `src/app/layout.tsx` leest `await cookies()` voor de
   UI-locale, en een cookie-read in de root layout zet de hele app op dynamic
   rendering. `generateStaticParams` op de marketing-pagina's en `revalidate = 604800`
   op `/p/[workspace]/[slug]` zijn daardoor feitelijk inert.

Punt 4 haalt het argument weg dat nonce-propagatie duur zou zijn — er valt geen
static/ISR te verliezen die er nu al niet is. Wat overblijft is één echt obstakel,
dat losstaat van rendering:

**Het bevroren artifact.** `compilePageArtifact` bakt `<script>…</script>` ín het
opgeslagen `compiledHtml` (`src/lib/landing-pages/static-compile.ts:109`), gemint op
publish-moment en daarna onveranderlijk geserveerd. Een per-request nonce bereikt die
bytes nooit — niet omdat de pagina statisch is, maar omdat de HTML dat is.

# Decision

**Eén policy-vorm, twee scopes.** `script-src` is overal nonce-based met
`'strict-dynamic'`; de landingspagina-scope draagt daarnaast twee SHA-256-hashes.

```
app-scope:          script-src 'nonce-<per request>' 'strict-dynamic'
landing-page-scope: script-src 'nonce-<per request>' 'strict-dynamic' 'sha256-…' 'sha256-…'
```

`'strict-dynamic'` maakt host-allowlists, `'self'` en `'unsafe-inline'` betekenisloos
voor scripts: vertrouwen propageert alleen nog via de nonce naar wat een vertrouwd
script zelf inlaadt. Nonce- én hash-bronnen blijven wél gelden — daarop rust de
landingspagina-tak.

## Waarom niet "hashes op al het publieke terrein"

Dat was het oorspronkelijke voorstel, en het is bij de meting gesneuveld. Next zet per
pagina tientallen inline scripts neer die de RSC-payload bevatten (32 op `/marketing`,
21 op `/marketing/pricing`). Die inhoud ís de pagina-inhoud en verschilt per request —
onhashbaar. Een hashes-only publieke policy zou de hydratie van élke publieke pagina
blokkeren. Publieke pagina's krijgen dus dezelfde nonce als de app; de hashes dekken
uitsluitend het bevroren artifact-script.

## Waarom de scope-default `app` is

`resolveCspScope` geeft alles wat niet met `/p/` begint de app-scope. Een vergeten
nieuwe publieke route verliest daarmee hooguit een inline-script dat ze vandaag niet
heeft; de omgekeerde default zou stil bescherming weggeven. Fail naar de strenge kant.

## Waarom de scope ná de host-rewrite bepaald wordt

`decideHostRoute` rewrite't `<workspace>.branddock.app/<slug>` naar
`/p/<workspace>/<slug>`. Een classificatie op de rauwe pathname zou custom-domein-
landingspagina's de app-scope geven en precies het artifact-script blokkeren dat de
hashes moesten dekken. De classificatie draait daarom op het rewrite-doel.

## Waarom de hashes een constante zijn en geen berekening

De policy-module draait in de edge-middleware: `node:crypto` bestaat daar niet en
`crypto.subtle` is async. Een hash per request zou de middleware async maken voor een
waarde die per build vaststaat. De hashes staan dus als constante in
`LANDING_PAGE_SCRIPT_HASHES`, en `smoke:security-residual` hercomputeert ze uit de
échte `buildPageRuntimeScriptBody`-output — drift maakt de smoke rood.

## Meegenomen: `eu-assets.i.posthog.com`

De vorige pass voegde `eu.i.posthog.com` toe voor ingest, maar posthog-js haalt bij
init óók een remote config op van `eu-assets.i.posthog.com`. Die host stond in geen
enkele directive. Lokaal (mét `NEXT_PUBLIC_POSTHOG_KEY`) blokkeert de eigen CSP
daardoor zowel het config-script als de config-fetch. Op prod is dat vandaag **latent**
— daar is geen key gezet, dus posthog-js initialiseert niet — maar het zou stil
toeslaan zodra de key landt. Beide hosts staan nu in `connect-src`.

# Consequences

**Goed.** `'unsafe-inline'` en `'unsafe-eval'` zijn weg uit `script-src`. Een
geïnjecteerd inline-script draait niet meer, ook niet op de publieke pagina's. De
enforce-policy houdt `report-uri` aan, dus er blijft zicht op wat er geblokkeerd wordt
— een enforce zonder rapportage faalt stil, precies de klasse fout die deze migratie
moest voorkomen.

**De prijs.** Wie `buildPageRuntimeScriptBody` wijzigt, maakt élk reeds gepubliceerd
artifact ongeldig: die dragen de oude bytes, en onder enforce vuurt hun view-beacon
niet meer en verliest hun formulier zijn enhancement. Dat faalt **stil** — de pagina
rendert gewoon. Mitigatie: bij zo'n wijziging de nieuwe hash toevoegen en de oude laten
staan, of de artifacts herminten. De smoke dwingt af dat de lijst bijgewerkt wordt; hij
kan niet afdwingen dat de oude hash blijft staan. Vandaag is het risico nul — de
snippets zijn sinds hun introductie (#251) niet gewijzigd, dus alle bestaande artifacts
dragen één van deze twee bodies.

**Niet opgelost, wel blootgelegd.** Dat de hele app dynamic rendert door één
cookie-read in de root layout is een prestatie- en kostenbevinding op zichzelf. Ze valt
buiten deze ADR, maar hoort een eigen taak te krijgen: zolang die stand blijft, leveren
`generateStaticParams` en `revalidate` in deze codebase niets op. Zou iemand dat later
repareren, dan blijft dit ontwerp werken — de landingspagina's hangen aan hashes en
niet aan een per-request nonce, juist zodat statische rendering daar terug kán komen.
