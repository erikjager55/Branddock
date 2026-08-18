---
id: static-rendering-regressie
title: Hele app rendert dynamic door één cookie-read in de root layout — static/ISR is app-breed inert
fase: post-launch
priority: next
effort: onbekend tot na de meting; fix zelf waarschijnlijk 0,5-2 dagen
owner: unassigned
status: open
created: 2026-08-18
completed: -
related-adr: docs/adr/2026-08-18-csp-enforce-nonce-en-hashes.md
related-spec: -
worktree: -
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

# Acceptatiecriteria

- [ ] Meting vastgelegd: wat kost de huidige situatie per route (TTFB + Vercel-functie-tijd)
- [ ] Beslissing genomen en vastgelegd (ADR bij optie 1 of 2; notitie bij optie 3)
- [ ] Bij een fix: `next build`-route-tabel laat de bedoelde routes als `○` of ISR zien
- [ ] Bij een fix: taal-switch blijft werken op zowel publieke als app-routes
- [ ] Bij optie 3: de misleidende `generateStaticParams`/`revalidate` zijn verwijderd
- [ ] `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors
- [ ] `npm run test:csp` blijft groen — de CSP-scope-indeling hangt niet aan rendermodus,
      maar de landingspagina-hashes bestaan juist zodat statische rendering daar terug kán

# Bestanden die ik aanraak

- `src/app/layout.tsx` — de `await cookies()`-read
- `src/lib/ui-i18n/config.ts` + `src/lib/ui-i18n/I18nProvider.tsx` — locale-resolutie
- Mogelijk de marketing- en `/p`-routes, afhankelijk van de gekozen richting

# Bestanden die ik NIET aanraak

- `src/proxy.ts` / `src/lib/security/security-headers.ts` — de CSP is klaar en staat los
  van deze vraag

# Smoke test plan

1. `npm run build` en de route-tabel vergelijken met de huidige stand (2 static / 30 dynamic)
2. Een marketing-pagina en een gepubliceerde `/p/…` ophalen en TTFB vergelijken vóór/ná
3. Taal wisselen in de app en controleren dat publieke pagina's de juiste taal tonen
4. `npm run test:csp` — nog steeds 10/10

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
