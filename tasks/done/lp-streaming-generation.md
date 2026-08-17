---
id: lp-streaming-generation
title: Streaming variant-voor-variant generatie in Step 2 (B2, pragmatische versie)
fase: pre-launch
priority: next
effort: 3-4 dagen
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: -
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md (§5 Fase B, B2)
worktree: - (branch claude/puck-editor-improvement-y9ep4x, parallel-engineering sessie)
---

# Probleem

Step 2 voor de 5 Puck-webpage-types (`LandingPageGenerateBlock`) toont tijdens
generatie één spinner van 30-90 seconden; alle varianten verschijnen pas als de
hele batch klaar is. De ervaren wachttijd is het grootste UX-pijnpunt van de
generatie-flow (verbeterplan-KPI "time-to-first-publish dalend na B2").

# Voorstel

Pragmatische perceived-speed streaming: een SSE-modus op de bestaande
generate-route die varianten SEQUENTIEEL genereert en elke variant als
`variant_complete`-event uitstuurt zodra hij zijn Zod-schema + nabewerking
gepasseerd is. De client rendert elke kaart direct bij binnenkomst; nog niet
geleverde slots tonen een skeleton met shimmer. Het JSON-pad blijft 100%
intact als fallback en voor bestaande callers/smokes.

# Acceptatiecriteria

- [x] SSE-modus op `POST /api/landing-pages/[id]/generate-structured-variant`, opt-in via `?stream=1` (canoniek) of `Accept: text/event-stream`
- [x] Sequentiële generatie per slot met dezelfde divergentie (angles/axes) + temperatures + recovery-retry als de parallelle batch (gedeelde exports `variantSlotParams` / `recoveryTemperature`)
- [x] Events: `variant_started {index,label}` · `variant_complete {index,variant,label}` · `variant_failed {index,error}` (extensie) · `all_complete {…payload identiek aan JSON-response}` · `error {…}` — SSE-formatting per orchestrate-patroon (TextEncoder + `event:`/`data:` + 15s heartbeat)
- [x] Per-variant nabewerking (AI-call-tracking, STRICT tell-rewrite, silent-iterate) draait vóór `variant_complete` — getoond = gepersisteerd
- [x] JSON-pad byte-gedrag behouden (zelfde volgorde tracking → strict → iterate → persist, via gedeelde helpers)
- [x] Client rendert kaarten per `variant_complete`; skeletons met shimmer voor open slots; automatische fallback naar het JSON-pad bij transport-falen vóór het eerste event; error/mid-stream-fouten volgen de bestaande error-flow (geen dubbele generatiekosten)
- [x] Post-generatie-gedrag identiek (fidelity-scoring-trigger per variant, labels, partial-delivery-banner) via gedeelde `applyGenerationResponse`
- [x] i18n en+nl (`lp.streaming.*`)
- [x] `npx tsc --noEmit` 0 errors in eigen bestanden (2 pre-existente errors in parallel-engineer-bestanden publish/route.ts + publish-page.ts)
- [x] `npx eslint` 0 errors, 0 nieuwe warnings op geraakte bestanden
- [x] Smoke-tests: phase8-variant-generator (40 PASS, met DATABASE_URL), phase9-structured-mapper (34 PASS) groen

# Bestanden die ik aanraak

- `src/app/api/landing-pages/[deliverableId]/generate-structured-variant/route.ts`
- `src/lib/landing-pages/variant-generator.ts` (alleen exports `recoveryTemperature` + `variantSlotParams`, batch herbruikt ze)
- `src/features/campaigns/components/canvas/accordion/LandingPageGenerateBlock.tsx`
- `src/lib/ui-i18n/locales/en/campaigns-canvas-accordion.ts`
- `src/lib/ui-i18n/locales/nl/campaigns-canvas-accordion.ts`

# Bestanden die ik NIET aanraak

- `src/lib/ai/anthropic-client.ts` — geen token-streaming toevoegen (zie Notes)
- `src/app/api/studio/[deliverableId]/orchestrate/route.ts` — alleen als patroon-referentie gelezen
- `PuckPageBuilder.tsx`, publish-routes, `Step4Timeline`, `WebPagePublishPanel` — parallel engineers

# Smoke test plan

1. Step 2 openen voor een landing-page met complete brief → generatie start automatisch.
2. Verwacht: voortgangs-InfoBox "N van M varianten klaar" + per slot een skeleton; zodra variant A klaar is verschijnt zijn kaart (echte Puck-preview) terwijl B nog schrijft.
3. Na `all_complete`: exact dezelfde keuze-UI als voorheen (thumbnails, fidelity-bar, labels, partial-banner bij slot-failure).
4. SSE geforceerd breken (devtools offline vóór response) → JSON-fallback genereert alsnog.
5. `npm run smoke:web-page-builder` → phase8 + phase9 groen.

# Risico's

- Sequentieel stapelt wall-time (4 slots × worst case) → `maxDuration` 300 → 480 (Fluid-ceiling 800s); typisch 30-50s per slot.
- Stream sterft halverwege terwijl de server doorwerkt/persist → bewust GEEN automatische her-generatie (kosten); bestaande error-flow + retry-knop.
- Proxy's die SSE bufferen → `Cache-Control: no-cache, no-transform` + heartbeat elke 15s (orchestrate-patroon).

# Out of scope

- `section_preview {index, sectionKey}`-events: `anthropicClient.createChatCompletion` is non-streaming; token-streaming toevoegen aan de gedeelde AI-util of een partial-JSON-parser bouwen is expliciet buiten deze pragmatische versie (task-instructie B2.2: skip als niet goedkoop haalbaar).
- Parallel streamen (alle slots tegelijk met interleaved events) — sequentieel is de bewuste keuze: eerste kaart eerder zichtbaar, eenvoudiger event-contract.
- Rate-limiting op deze route (JSON-pad had het ook niet; pariteit behouden).

# Notes

**Beslissingen:**
- **SSE-trigger**: `?stream=1` als canonieke opt-in (gedocumenteerd in route-JSDoc); `Accept: text/event-stream` werkt ook. De client stuurt beide.
- **Sequencing van nabewerking**: STRICT tell-rewrite + silent-iterate draaien per variant VÓÓR `variant_complete` — iets latere kaart, maar de kaart is altijd gelijk aan wat opgeslagen wordt (geen "flash of unrewritten content").
- **Fallback-grens client**: alleen bij fetch-reject vóór server-response of stream-dood vóór het éérste event valt de client terug op het JSON-pad. Elke fout ná events (incl. `error`-event) volgt de normale error-flow — voorkomt dubbele generatiekosten wanneer de server al (deels) gepersisteerd heeft.
- **Slot-compacting**: `all_complete` draagt de definitieve arrays (successes gecompact); de client swapt van slot-gebaseerde stream-state naar dat authoritative payload — partial-delivery-detectie blijft identiek aan het JSON-pad.
- **`variant_failed`** is een extensie op de gevraagde events zodat een mislukte slot-skeleton direct een nette fouttegel toont i.p.v. te blijven shimmeren tot `all_complete`.
- phase8-smoke vereist een `DATABASE_URL` (transitieve prisma-import) — sandbox-run met dummy-URL groen.
