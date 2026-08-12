---
id: lp-forms-leads
title: Formulier-sectie + leads-pijplijn (P3)
fase: pre-launch
priority: next
effort: 4-6 dagen (uitgevoerd in 1 sessie, MVP-scope zonder Turnstile)
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: docs/adr/ (ADR 2026-08-12 besluit 5 — no-JS-first)
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md (§5 Fase P-vervolg, P3; §7 AVG-rij + webhook-rij)
worktree: - (branch claude/puck-editor-improvement-y9ep4x, parallel-engineering sessie)
---

# Probleem

Branddock had geen formulier-sectie en geen lead-capture — de in-code
geverifieerde "hoog (product)"-gap uit het marktonderzoek (§4.1): CTA's zijn
links, conversie-primitieven zijn table-stakes bij élke marketing-suite.
Zonder forms is een gepubliceerde pagina een folder, geen funnel.

# Voorstel

Nieuw sectie-type `LeadForm` (registry + `puck-config.tsx`, server-safe,
no-JS-first) + publiek endpoint `POST /api/f/[formId]` (honeypot, timing,
rate-limit, payload-caps, CORS-open) → `FormSubmission` per workspace +
fire-and-forget e-mailnotificatie (Emailit) en webhook (safeFetch, 5s
timeout) + submissions-blok in de publish-UI.

# formId-formaat (contract — zie `src/lib/landing-pages/lead-form.ts`)

`formId = "<workspaceId>:<formKey>"` — workspaceId is de workspace-cuid
(bevat nooit ':', dus parsen op de eerste ':' is deterministisch); formKey is
de sectie-instance-id (`props.id`) gesaneerd tot `[A-Za-z0-9_-]`. Het
publieke endpoint resolvet de tenant dus uit het formId zelf; formKey
groepeert submissions per formulier. De sectie stelt het formId samen via
`buildLeadFormId(workspaceId, sectionId)` — de workspaceId komt binnen via
`buildSpikePuckConfig(ctx, { workspaceId })` (alleen gezet op de
publish-compile en de publieke runtime-route; de editor-preview rendert
inert met `action="#"` + `type="button"`).

# Beslissingen

- **No-JS success-state = CSS `:target`** (eenvoudigste dat zonder React
  werkt): het endpoint 303-redirect naar `<bron>?submitted=1#lp-form-ok-<formKey>`;
  de sectie rendert een verborgen success-blok + een
  `#id{display:none}#id:target{display:block}`-styleregel. Het
  progressive-enhancement-script (in het publish-artifact) zet in plaats
  daarvan inline `display:block` (inline wint van de id-selector) — geen
  page-reload op het JS-pad. `?submitted=1` blijft puur informatief in de URL.
- **Notify-config server-side vertrouwd**: `webhookUrl`/`notifyEmail` worden
  uit de GEPUBLICEERDE snapshot gelezen (scan van de workspace-pagina's op de
  formKey), nooit uit de request — anders is het endpoint een open
  spam-/SSRF-relay. safeFetch (SSRF-guard) is verplicht op de webhook-URL.
- **Webhook/e-mail via `after()`** (Next 15.1+): dispatch ná de response,
  timeout 5s, fail-soft — bedankgedrag wacht nooit op de consumer
  (Instapage-les, spec §7).
- **Stille bot-afhandeling**: honeypot gevuld of submit-timing < 2s → zelfde
  response-shape als succes (303/200) zonder opslag; een false positive
  strandt dus nooit een mens op een foutpagina. De timing-guard is alleen
  betrouwbaar mét JS (het artifact-script ververst `_ts` naar load-tijd; de
  statisch bevroren render-timestamp geeft een grote delta) — de honeypot is
  de no-JS-safe guard.
- **Redirect-target-validatie**: `_src` (client-input) alleen http(s), anders
  fallback op de Referer-header, anders 200 JSON. POST-only → geen
  GET-open-redirect; restrisico gedocumenteerd in de route-JSDoc.
- **Turnstile bewust uitgesteld** (spec noemt hem): honeypot + timing +
  rate-limit dekken het MVP; Turnstile vergt een key-flow + extern script in
  het artifact (CSP) — eigen vervolgtask zodra spam dat afdwingt.
- **`landingPageId` op FormSubmission is FK-loos**: lead-data moet een
  pagina-delete overleven; null wanneer onherleidbaar (zip-/WP-export).

# AVG-notities (spec §7-risicorij — expliciet vereist)

- **Submissions zijn persoonsgegevens.** Branddock is hier **verwerker**; de
  workspace-eigenaar (klant) is verwerkingsverantwoordelijke. Dit hoort vóór
  livegang in de verwerkersovereenkomst/DPA als categorie "door eindgebruikers
  ingevulde formulierdata" met de workspace als eigenaar.
- **Retentie-advies**: default 12 maanden en daarna automatisch verwijderen
  (cron), configureerbaar per workspace zodra settings-UI bestaat; export +
  delete per workspace moet vóór launch bestaan (cascade-delete op Workspace
  dekt account-opzegging al). Nog niet geautomatiseerd — vervolgtask.
- **Dataminimalisatie in het endpoint**: geen cookies, geen IP-opslag, geen
  user-agent; alleen de ingevulde velden + bron-URL + timestamp. De
  rate-limiter gebruikt het IP alleen vluchtig als bucket-key (sliding
  window, TTL ≈ 1 min), het wordt niet gepersisteerd bij de submission.
- **Geen tracking-captcha** (spec: Turnstile i.p.v. tracking-captcha wanneer
  hij komt); geen third-party scripts in het artifact.

# Acceptatiecriteria

- [x] `LeadForm` in `SECTION_TYPE_IDS` + registratie in `buildSpikePuckConfig`
      (server-safe render, geen hooks/'use client', inline styles, tokens via
      closure; button volgt `tokens.button` via `resolveCtaVisual` zoals BrandCTA)
- [x] Plain `<form method="POST" action="/api/f/<formId>">` + hidden `_hp`
      (honeypot) / `_ts` (timestamp) / `_src` (bron) + native HTML-validatie
      (required, type=email/tel) — werkt zonder JavaScript
- [x] `POST /api/f/[formId]`: publiek, CORS-open (incl. OPTIONS), parseert
      form-encoded/multipart/JSON, Zod-validatie, honeypot/timing stil,
      rate-limit per IP+formId (10/min, `checkGenericRateLimit`-patroon),
      caps 30 velden/10KB, 303-redirect (no-JS) of 200 JSON
- [x] `FormSubmission`-model additief (prisma validate + generate; GEEN db push)
- [x] E-mail (trySendTransactional) + webhook (safeFetch, 5s, `after()`) fail-soft
- [x] `GET /api/landing-pages/[deliverableId]/submissions` (auth+membership) +
      "Leads (N)" + laatste 5 in WebPagePublishPanel (webPublish.*-i18n, en+nl)
- [x] `TEXT_FIELDS_BY_TYPE.LeadForm = [heading, sub, buttonLabel, successMessage]`
- [x] `npx tsc --noEmit` 0 errors
- [x] ESLint 0 errors op aangeraakte bestanden
- [x] Smoke: `web-page-builder-phase52-leadform.ts` groen (47 asserts) +
      phase51 (static-compile) blijft groen

# Bestanden die ik aanraak

- `prisma/schema.prisma` (FormSubmission + back-relation Workspace)
- `src/lib/landing-pages/lead-form.ts` (nieuw — formId-contract + helpers)
- `src/lib/landing-pages/page-data.ts` (SECTION_TYPE_IDS)
- `src/features/campaigns/components/canvas/medium/puck-config.tsx` (LeadForm)
- `src/lib/landing-pages/static-compile.ts` (enhancement-script, zie ook lp-page-analytics)
- `src/app/api/f/[formId]/route.ts` (nieuw)
- `src/app/api/landing-pages/[deliverableId]/submissions/route.ts` (nieuw)
- `src/app/api/landing-pages/publish/route.ts` + `src/app/p/[workspace]/[slug]/page.tsx` (workspaceId → config)
- `src/app/api/landing-pages/component-edit/route.ts` (TEXT_FIELDS_BY_TYPE)
- `src/features/campaigns/components/canvas/WebPagePublishPanel.tsx` + en/nl `campaigns-canvas-accordion.ts`
- `scripts/smoke-tests/web-page-builder-phase52-leadform.ts` (nieuw)

# Bestanden die ik NIET aanraak

- `src/lib/landing-pages/publish-gate.ts` / `section-edit-tools.ts` — LeadForm
  is bewust GEEN verplichte sectie
- `PuckPageBuilder.tsx` / `PreviewEditingLayer` / claw/** / `package.json`
  (smoke-registratie in package.json volgt separaat — gedeeld bestand)

# Smoke test plan

1. `npx tsx scripts/smoke-tests/web-page-builder-phase52-leadform.ts` → groen
2. `npx tsx scripts/smoke-tests/web-page-builder-phase51-static-compile.ts` → groen
3. Handmatig (post-db-push): LeadForm toevoegen in de builder → publiceren →
   op de publieke pagina submitten mét en zónder JS → submission in het
   Leads-blok; webhook-URL naar een request-bin → payload < 5s; JS uit →
   303-redirect toont success-blok via `:target`.

# Risico's

- ⚠️ **db push bij deploy**: `FormSubmission` bestaat pas na
  `npx prisma db push` — de nieuwe endpoints 500'en er netjes op maar leads
  gaan verloren; push vóór het live zetten van pagina's met een LeadForm.
- Spam ondanks honeypot/timing/rate-limit → Turnstile-vervolgtask (gate: echte
  spam-druk); payloads zijn gecapt dus geen storage-DoS.
- Webhook-consumers die PII doorzetten zijn de verantwoordelijkheid van de
  workspace-eigenaar (documenteren in de DPA — zie AVG-notities).

# Out of scope

- Turnstile/captcha; conversiedoel-per-pagina-UI; bedankpagina-redirect per
  formulier (nu: successMessage inline); native CRM-koppelingen (webhook dekt
  Zapier); submissions-export/-delete-UI (AVG-vervolgtask); HTML-zip-export.

# Notes

- De timing-guard dropt alleen bij `0 <= delta < 2s` — klokscheefstand of de
  bevroren artifact-timestamp kan een mens nooit stil laten vallen.
- Editor-preview rendert het formulier inert (action="#", type=button) zodat
  de builder nooit echte submissions maakt.
