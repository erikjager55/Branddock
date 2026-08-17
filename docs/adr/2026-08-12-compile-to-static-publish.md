---
id: 2026-08-12-compile-to-static-publish
title: Compile-to-static bij publish — bevroren HTML-artifact per PagePublish-versie
status: accepted
date: 2026-08-12
supersedes: -
superseded-by: -
---

# Context

Gepubliceerde webpagina's renderden per request runtime React met een volledige
`assembleCanvasContext` (merkdata live uit de DB) — duur op elke ISR-miss én
semantisch scheef: de "immutable snapshot" bevroor alleen de content, terwijl
brand-tokens live geresolved werden. Een styleguide-wijziging herstijlde dus
stilzwijgend alle live pagina's. Marktonderzoek (2026-08-07, spoor 3/4):
Webflow en Framer compileren bij publicatie naar statische HTML ("no database
queries on page load"); AI-crawlers voeren geen JS uit → content in de
initiële HTML is de enige robuuste GEO-strategie. Randvoorwaarden die dit nu
mogelijk maken: E1's `PageRender` is hook-vrij (in-proces server-render kan —
de screenshot-worker bestond alléén om Pucks hook-crash te omzeilen) en P1's
`PagePublish` geeft een natuurlijke plek per versie.

# Decision

1. **Compile bij publish**: na elke publish wordt de sectie-tree + de op dat
   moment geldende brand-tokens gecompileerd naar een zelfstandig
   HTML-fragment (`renderToStaticMarkup` over `PageRender`, + a11y-styles +
   font-links), opgeslagen als `PagePublish.compiledHtml` (TEXT). Fail-soft:
   een compile-fout breekt de publish nooit (artifact leeg → runtime-pad).
2. **Token-freeze**: het artifact bevriest de styling per versie — de
   snapshot-semantiek wordt eerlijk (content én stijl). Een merkbrede
   restyling vergt bewust een republish ("republish alles met nieuw thema"
   — batch-operatie, follow-up in het C/D-spoor).
3. **Serving**: de publieke route serveert het artifact van de live versie
   (pointer) en slaat context-assembly + config-build + render over; alleen
   de pointer+artifact-lookup raakt de DB, en alleen op ISR-miss. JSON-LD
   en metadata blijven page-level (goedkoop, verse workspace-velden).
   Rollback = pointer-swap serveert automatisch het artifact van díe versie.
4. **Opslag v1 = DB-kolom** (Neon TEXT, LP-artifacts ~50-200 KB). R2 +
   edge-serving is de deploy-optimalisatie zodra volume dat rechtvaardigt —
   het artifact-formaat verandert daardoor niet.
5. **Interactiviteit = no-JS-first**: secties met gedrag behouden hun
   no-JS-fallback (AnchorNav: native ankers). Hydration-islands pas wanneer
   een sectie zonder fallback onvermijdelijk is (P3-formulieren krijgen een
   plain-POST-fallback, geen React-vereiste).

# Y-statement

In de context van **gepubliceerde merk-pagina's die per request runtime React
+ live merkdata renderden**, facing **kosten/latency op het publieke pad,
half-bevroren snapshot-semantiek en een GEO-belofte die van initiële HTML
afhangt**, I decided **bij elke publish een bevroren HTML-artifact per
PagePublish-versie te compileren en dat te serveren** to achieve **zero
context-assembly op het hot path, eerlijke versie-semantiek (rollback =
exact die pagina terug) en structureel AI-crawler-veilige output**, accepting
tradeoff **dat merkbrede restyling een expliciete republish vergt en dat het
artifact in de DB leeft tot R2-serving loont**.

# Consequences

## Positief
- ISR-miss kost een pointer+artifact-read i.p.v. 5-7 queries + context-assembly + render.
- Versies zijn écht immutabel; rollback en preview tonen exact wat toen live stond.
- CWV/GEO by construction (statische HTML, geen render-afhankelijkheid).
- Zelfde compiler voedt straks zip-export (D3) en het WordPress-kanaal (P5).

## Negatief / tradeoffs
- Styleguide-wijziging vernieuwt live pagina's niet meer stilzwijgend — batch-republish nodig (bewust; volgt).
- Artifact-bytes in Postgres (v1) — monitoren; R2-trigger bij >±50 MB totaal of merkbare query-vertraging.
- Twee serving-paden (artifact + legacy runtime-fallback) tot alle publishes ≥ deze versie zijn.

## Neutraal
- Publish duurt ~100-300 ms langer (compile) — onmerkbaar naast de bestaande GEO-analyse-haak.
- De screenshot-worker kan later in-proces (zelfde render-pad als de compiler).

# Alternatives considered

- **Runtime blijven renderen + alleen ISR verlengen (P0)**: al gedaan als quick-win, maar lost de half-bevroren semantiek en de miss-kosten niet op; elke cache-flush herhaalt het volledige werk.
- **R2/edge-serving meteen**: mooiste eindplaat, maar introduceert nu een storage-dependency + deploy-koppeling terwijl de DB-kolom hetzelfde artifact-contract bewijst; migratiepad expliciet opengehouden.
- **Volledig statisch exporteren buiten Next om (aparte host)**: maximaal ontkoppeld, maar breekt de bestaande middleware-routing/domains-architectuur (ADR 2026-05-22 beslissingen 3/4 blijven gelden) voor winst die serving-uit-kolom ook levert.

# Notes

- Uitvoering: verbeterplan v3 §5 taak P2; task-file `tasks/done/publish-static-compile.md`.
- Follow-up expliciet: batch-"republish met nieuw thema" (raakvlak C-spoor), R2-migratietrigger, forms-island (P3).
