---
id: lp-page-analytics
title: First-party meting per pagina, cookieloos (P4)
fase: pre-launch
priority: next
effort: 2-3 dagen (uitgevoerd in 1 sessie, samen met lp-forms-leads)
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: -
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md (§5 Fase P-vervolg, P4; §7 Leads-metriek)
worktree: - (branch claude/puck-editor-improvement-y9ep4x, parallel-engineering sessie)
---

# Probleem

Geen enkele meting op live pagina's ("hoog (product)"-gap, marktonderzoek
§4.1): geen views, geen conversies, geen dashboard. Elke marketing-suite
levert dit als table-stakes; het voedt later de agent-loop ("Iris voor
conversie") en de D2-A/B-fase.

# Voorstel

Additief `PageEvent`-model (kind: 'view' | 'form_submit' | 'cta_click'
gereserveerd) + publiek sendBeacon-endpoint `POST /api/t` + een < 2KB inline
vanilla-beacon in het publish-artifact + "Views / Leads / conversie%" in het
WebPagePublishPanel via `GET /api/landing-pages/[deliverableId]/stats`.

# Beslissingen (beacon-shape)

- **Beacon-payload**: `{ w: workspaceSlug, s: slug, k: kind, r: referrer? }`
  als JSON-string via `navigator.sendBeacon('/api/t', …)` (text/plain → geen
  preflight; fetch-keepalive-fallback). De compiler kent het landingPageId
  niet (het artifact is context-vrij en bevroren), dus het script leidt
  workspace+slug af uit `location`: pad-vorm `/p/<ws>/<slug>` of
  subdomein-vorm `<ws>.host/<slug>`. Het endpoint resolvet naar het
  landingPageId. Een optioneel `p` (landingPageId) in het schema wordt alleen
  vertrouwd als het bij de workspace-slug hoort (client-input).
- **Zelfde-origin geverifieerd**: `/api` staat in de
  `EXEMPT_PATH_PREFIXES`-passthrough van `host-router.ts`, dus `/api/t` werkt
  op workspace-subdomeinen (en straks custom domains) zonder CORS-dans; het
  endpoint is tóch CORS-open voor zip-/WP-export.
- **Conversieteller is server-side**: `/api/f` logt het
  `PageEvent('form_submit')` bij elke opgeslagen submission (werkt óók
  no-JS). Het artifact-script stuurt bewust GEEN client-side
  form_submit-beacon — afwijking van de letterlijke taakomschrijving, anders
  telt elke JS-submit dubbel (client + server). Eén teller, de betrouwbare.
- **Beacon alleen in het artifact** (P2-pad): het runtime-fallback-pad
  (pre-P2-publishes zonder compiledHtml) heeft geen beacon — republish
  compileert het artifact en activeert de meting.
- **Views ≠ unieke bezoekers**: zonder cookie/fingerprint is dedupe bewust
  onmogelijk; het getal is "page loads". Dat is de AVG-prijs en hij is oké
  voor het doel (trend + conversieratio).

# AVG-notities (expliciet vereist)

- **Geen PII in PageEvent**: geen cookies, geen IP-opslag, geen
  user-agent/fingerprint. De referrer wordt server-side geschoond tot
  origin+pad (querystrings kunnen tokens/PII dragen) en gecapt op 300 tekens.
  Daarmee is dit cookieloze, first-party meting zonder
  toestemmings-/bannerplicht (zelfde categorie als Plausible-achtigen).
- De rate-limiter gebruikt het IP alleen vluchtig als bucket-key (≈ 1 min
  sliding window), nooit gepersisteerd aan het event.
- **Retentie-advies**: PageEvents zijn geen persoonsgegevens maar groeien
  onbegrensd — aggregeer of prune na 13 maanden (vergelijkingsjaar + 1 maand)
  via een cron zodra volumes dat vragen. Vervolgtask.

# Acceptatiecriteria

- [x] `PageEvent`-model additief + relations (Workspace + LandingPage, cascade)
      + indexes `[landingPageId, kind, createdAt]` en `[workspaceId, createdAt]`
      (prisma validate + generate; GEEN db push)
- [x] `POST /api/t`: publiek, CORS + OPTIONS, sendBeacon-vriendelijk
      (JSON uit text/plain), Zod, lichte rate-limit per IP (60/min), resolve
      workspace-slug → published page, onbekend → stille 204, geen IP-opslag
- [x] View-beacon in élk artifact (ook zonder LeadForm); form-enhancement
      alleen mét LeadForm; script < 2KB, geen externe hosts (CSP), vanilla
- [x] `/api/f` logt `PageEvent('form_submit')` server-side per submission
- [x] `GET /api/landing-pages/[deliverableId]/stats` (auth+membership):
      views/leads per pagina over 7d én 30d in één response (2 groupBy-queries)
- [x] Panel-blok "Meting": views / leads / conversie% (30d) + 7d-samenvatting,
      loading/error states, Lucide, webPublish.*-i18n en+nl
- [x] `npx tsc --noEmit` 0 errors; ESLint clean; phase51 + phase52 smokes groen

# Bestanden die ik aanraak

- `prisma/schema.prisma` (PageEvent + back-relations Workspace/LandingPage)
- `src/lib/landing-pages/static-compile.ts` (`buildPageRuntimeScript` + injectie vóór de body — phase51-invariant "artifact eindigt op de render-body" blijft staan)
- `src/app/api/t/route.ts` (nieuw)
- `src/app/api/f/[formId]/route.ts` (server-side form_submit-event)
- `src/app/api/landing-pages/[deliverableId]/stats/route.ts` (nieuw)
- `src/features/campaigns/components/canvas/WebPagePublishPanel.tsx` + en/nl `campaigns-canvas-accordion.ts`
- `scripts/smoke-tests/web-page-builder-phase52-leadform.ts` (beacon-asserts)

# Bestanden die ik NIET aanraak

- `src/proxy.ts` / `host-router.ts` — `/api`-passthrough bestond al (alleen geverifieerd)
- `package.json` (smoke-registratie volgt separaat — gedeeld bestand)

# Smoke test plan

1. `npx tsx scripts/smoke-tests/web-page-builder-phase52-leadform.ts` → groen
   (beacon altijd, form-script conditioneel, < 2KB, geen externe hosts)
2. `npx tsx scripts/smoke-tests/web-page-builder-phase51-static-compile.ts` → groen
3. Handmatig (post-db-push): pagina publiceren → publieke URL laden →
   PageEvent 'view' rij; formulier submitten → 'form_submit' rij; panel toont
   Views/Leads/conversie na refresh.

# Risico's

- ⚠️ **db push bij deploy**: `PageEvent` bestaat pas na `npx prisma db push`;
  het endpoint faalt er stil op (204 + warn-log) dus pagina's blijven werken,
  maar de meting start pas na de push.
- Bot-/crawler-views tellen mee (geen UA-filter — bewust geen UA-opslag);
  accepteren voor v1, evt. later een UA-allowlist-check zónder opslag.
- Ad-blockers blokkeren soms `sendBeacon` naar "/api/t"-achtige paden →
  ondertelling; first-party zelfde-origin beperkt dit.

# Out of scope

- `cta_click`-events (kind is gereserveerd; CTA's zenden nog niet);
  dashboards buiten het panel; per-versie-uitsplitsing; A/B (D2); unieke
  bezoekers; event-pruning-cron.

# Notes

- Stats-endpoint retourneert 7d én 30d in één response — panel toont 30d als
  hoofdgetal met een 7d-subregel; conversie% berekent de client.
