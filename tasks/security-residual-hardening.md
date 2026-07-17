---
id: security-residual-hardening
title: Security residual hardening — LOW-findings + review-MINORs (post-launch)
fase: post-launch
priority: later
effort: 1-2 dagen
owner: claude-code
status: in-progress
created: 2026-06-27
completed: -
related-adr: -
related-spec: docs/audits/2026-06-26-security-audit.md
worktree: branddock-security-residual-hardening
---

# Probleem

Restscope van de pre-launch security-audit 2026-06-26. De HIGH-findings (#345/#346/#347) en de MEDIUM/LOW-cluster (#348, PR #61) zijn afgerond; wat overblijft zijn LOW-severity hardening-items + drie MINORs uit de finalize-review. Geen van deze is exploitabel op het primaire pad vandaag (admin-only content, latente paden, of puur cleanup), daarom bewust uitgesteld tot na launch — maar wel wegschrijven zodat ze niet verdampen.

# Voorstel

Cluster van losse, grotendeels chirurgische edits — zelfde patronen als #348 (`requireWorkspaceRole`, `escapeHtml`, versioned-crypto-contract, Zod-body-schema's). Geen gedeelde refactor; per sub-item een kleine diff. Splits desgewenst af per sub-item in een eigen branch.

# Acceptatiecriteria

**LOW (audit)**
- [x] **L4** — `workspace/brand-style-anchors` + `workspace/hero-logo-overlay`: PUT nu via `requireWorkspaceRole(['owner','admin','member'])` — viewer = 403.
- [x] **L6** — Help-Center markdown-renderer: `escapeHtml` in `inlineFormat` aan de bron (dekt álle branches die door inlineFormat lopen — paragraaf/heading/tabel/info-warning-box; code-blocks escapeten al) + `href`-allowlist (alleen `https:`/`mailto:`, anders platte tekst). Sanitizers verplaatst naar pure module `src/lib/security/html-escape.ts` (herbruikbaar + smoke-testbaar).
- [x] **L9** — `ad-tokens/encryption` is nu een dunne adapter op `src/lib/security/token-crypto.ts`: nieuwe writes in het versioned `v1:`-formaat via de gedeelde helper; bestaande unversioned rijen decrypten via een legacy-compat-pad (geen brick). Signatures ongewijzigd → callers ongeraakt. Smoke bewijst round-trip + legacy-decrypt + tamper-detectie.
- [x] **Zod-coverage-sweep** — **batch 1** (2026-07-13): `knowledge` POST + `research-plans` POST. **Batches 2-4 (2026-07-17, tweede pass): alle 13 HOOG-routes gedaan** — routes die untrusted body in Prisma of een AI-engine spreadden: `research-plans` PATCH (was óók een IDOR: rauwe `...updates`-spread zónder workspace-scope — nu 404 op cross-workspace-id), `trends` POST, `trend-radar/manual` POST + `trend-radar/[id]` PATCH (Prisma-enum-velden: ongeldige waarde 500'de), `knowledge/[id]` PATCH, de 4 wizard-strategy-routes (`validate-briefing`/`improve-briefing`/`build-foundation`/`elaborate`, gedeelde schema's in `src/lib/campaigns/strategy-request-schemas.ts` naar het patroon van build-strategy/generate-concepts), `ai/completion` (per-message shape), `personas/chat`, `landing-pages/auto-iterate` (hele body ging gespreid de scoring-engine in) + `strict-rewrite`. Nieuwe gedeelde helper: `src/lib/api/parse-json-body.ts` (safeParse + vaste 400-shape). **Resterend = alleen MIDDEL/LAAG** (zie §Zod-inventaris) — bewust follow-up: MIDDEL heeft handmatige guards met gaten, LAAG is functioneel al afgedekt.

**SSRF-convergentie (uit H1-task `security-h1-ssrf-guard`) — AFGEROND in #350**
- [x] **`fetch-with-limit.ts` → `safeFetch`** — gemigreerd (16 callers, signature ongewijzigd). Plus de 3 resterende raw-fetch-paden ontdekt in review en óók geconverteerd: `media/import-url` (entry-probe), `media/stock/import` (user-URL, had géén SSRF-validatie), `export/proxy-image` (allowlisted). `assertSafeRedirect` is nu dood en verwijderd. Geen oude-patroon-fetch meer in `src/app`/`src/lib`.
- [x] **Rate-limit** — `checkGenericRateLimit` (429 + Retry-After) op `website-scanner` (10/min/workspace), `claw/scrape` (20/min/user), `briefing-sources/parse-url` (20/min/workspace).
- [x] **byte-cap** — `products/url-scraper` leest de body via `readBodyWithCap` (10MB stream-cap, OOM-defense) i.p.v. `.text()`.
- [x] **`safeFetch` 307/308** — 303 (+301/302 op non-GET) → bodyless GET-downgrade; 307/308 behoudt method+body (fetch-spec).
- [x] **`image-scraper` + `knowledge-research/search`** — **afgehecht 2026-07-17 (tweede pass)**. `knowledge-research/phases/search.ts` → `resolveRedirectUrl` geüpgraded naar async `assertSafeUrl` op zowel de fetch-target als de `Location`-bestemming (DNS-resolve, sluit rebind uit; throw → bestaande fallback, dus fail-soft). Bewust géén `safeFetch` dáár: die volgt de redirect-keten zelf, terwijl deze functie juist de Location wil aflezen zonder te volgen (de scrape-fase fetcht de bestemming al via safeFetch). `image-scraper.ts` → **bewust NIET geüpgraded**: `addImageSafe` filtert alleen kandidaat-URLs; de daadwerkelijke fetch loopt via `import-scraped-image.ts` dat al safeFetch gebruikt (finale gate is safe). Async maken = een DNS-lookup per kandidaat-image + refactor van 11 loop-call-sites voor nul extra dekking. Bewijs: ssrf-harness (grounding-host passeert; localhost/private-IP/IMDS/file geweigerd, 6/6) + grep: geen `isPrivateHostname`-caller meer buiten image-scraper.

**MINORs (finalize-review #348)**
- [x] **CSP-bron consolideren** — CSP + security-headers-waarden staan nu in één bron `src/lib/security/security-headers.ts` (`buildSecurityHeaders(isProd)`), geïmporteerd door zowel `src/proxy.ts` als `next.config.ts`. Meteen de gevonden drift gedicht: Permissions-Policy `interest-cohort` en HSTS max-age (was 31536000 vs 63072000) zijn nu identiek.
- [x] **Nonce-CSP stap 1+2 (Report-Only) — gedaan 2026-07-17 (tweede pass)**: (a) CSP-emissie geconsolideerd naar alléén de middleware (`next.config.ts` → `buildStaticSecurityHeaders`, zonder CSP — een tweede statische policy zou de nonce ondermijnen; overige headers blijven daar als vangnet); (b) per-request nonce in `src/proxy.ts` + `Content-Security-Policy-Report-Only: script-src 'nonce-…' 'strict-dynamic'` (bewust zónder unsafe-inline/unsafe-eval — dát is de meting) + `Reporting-Endpoints`, op álle return-takken (rewrite/429/cache) via `applySecurityHeaders()`; (c) collector `POST /api/security/csp-report` (beide rapport-formaten, rate-limited per IP, altijd 204, gestructureerde warn-log, geen DB); (d) bijvangst-fix: **`https://eu.i.posthog.com` toegevoegd aan `connect-src`** — de POSTHOG-key staat op prod maar de eigen CSP blokkeerde alle ingest-calls. Bewust nog GEEN nonce-propagatie via de request-headers (Next-stamping): dat kan pagina's naar dynamic rendering forceren — hoort bij de enforce-flip. Bewijs prod-build: exact 1 enforce + 1 Report-Only-header, nonce uniek per request, collector logt + 204.
- [ ] **Nonce-CSP stap 3 (enforce-flip)** — _follow-up, gated op Report-Only-data van prod_: na een periode rapporten analyseren (eval-gebruikers, niet-strict-dynamic loaders, statisch-geprerenderde inline-scripts), dan request-header-nonce-propagatie (meet de dynamic-rendering-impact!) + enforce-`script-src 'nonce-…' 'strict-dynamic'`.
- [x] **Dubbele workspace-resolutie** — `claw/confirm/route.ts` gebruikt nu de `workspaceId` uit `requireWorkspaceRole`; de losse `resolveWorkspaceId()` is weg (sessie-call blijft, alleen voor de `userId`).
- [x] **RBAC smoke-coverage** — **gedaan 2026-07-17 (tweede pass)**: `e2e/tests/workspace/rbac-403.spec.ts` (5/5 groen) bewijst runtime met échte auth-cookies: viewer→403 op export/claw-confirm/beide L4-PUTs, member→403 op export én member→200 op de L4-boundary, admin→403 op owner-invite (M1) + admin→201 op member-invite, owner-sanity 200, unauth 401. Daarvoor geseed: admin- (`david@branddock.com`) + viewer-user (`nina@branddock.com`) in `prisma/seed.ts` (additief) + `TEST_USERS` + `viewerPage`-fixture is nu een échte viewer. **NB de open vraag is beantwoord**: `GET /api/workspace/export` gebruikt WÉL `requireWorkspaceRole()` (owner/admin) — de "resolveWorkspaceId zonder role-check"-aanname hierboven was achterhaald; export-by-viewer én -by-member is geblokkeerd. ⚠️ Ontwerpkeuze: bewust één test (= één login) per rol — de auth-brute-force-limiter (`src/proxy.ts`, 10 sign-ins/min/IP) wordt door de hele e2e-suite vanaf localhost gedeeld; per-assert logins blazen dat budget op. Dat is ook waarom `permissions.spec.ts` mid-suite rood staat (7 fails, **pre-existing** — identieke faalset op ongewijzigde seed geverifieerd; zie gotchas.md 2026-07-17).

- [x] `npx tsc --noEmit` 0 errors (beide passes)
- [x] Lint 0 errors op alle geraakte files (beide passes)
- [x] Smoke-test uitgevoerd (zie §verificatie-secties)

# Bestanden die ik aanraak

- `src/app/api/workspace/brand-style-anchors/route.ts` (L4)
- `src/app/api/workspace/hero-logo-overlay/route.ts` (L4)
- `src/components/help/HelpArticlePage.tsx` (L6) + evt. een gedeelde `escapeHtml`/markdown-helper
- `src/lib/ad-tokens/encryption.ts` + `src/lib/security/token-crypto.ts` (L9 — convergentie)
- diverse `src/app/api/**/route.ts` mutatie-routes (Zod-sweep — inventariseer eerst)
- `src/proxy.ts` + `next.config.ts` (CSP-consolidatie)
- `src/app/api/claw/confirm/route.ts` (dubbele resolutie)
- `scripts/smoke-tests/security-medium.ts` of nieuw integratie-smoke-bestand (RBAC-coverage)

# Bestanden die ik NIET aanraak

- De #348-fixes zelf (invite-routes, export, deepSet, GCM, webhook) — al af, niet herzien.
- `src/lib/auth.ts` / Better Auth org-plugin — de native `invite-member` blokkeert admin→owner al ingebouwd (crud-invites.mjs:123), niet aanpassen.

# Smoke test plan

1. **L4**: als viewer een PATCH/DELETE op `brand-style-anchors`/`hero-logo-overlay` → 403; als owner/admin → 200.
2. **L6**: een help-artikel met `<img onerror=...>` / `javascript:`-href in de markdown → output is geëscaped / href gestript.
3. **L9**: encrypt → decrypt roundtrip blijft werken voor bestaande én nieuwe (versioned) tokens; oude tokens zonder version-prefix decrypten nog.
4. **Zod-sweep**: malformed body op een gefixte route → 400 met `safeParse`-details i.p.v. 500/silent-accept.
5. **RBAC-smoke**: de drie owner-guard-403's asserten groen.

# Risico's

- **L9** raakt het OAuth/ad-token-decrypt-pad — een fout brickt alle encrypted rijen (gotcha). Version-prefix moet backward-compatible zijn: oude tokens zonder prefix moeten blijven decrypten. Test met een bestaande rij vóór rollout.
- **CSP nonce-based script-src** kan Next-inline-scripts breken — incrementeel uitrollen (report-only → enforce) en in de browser-console verifiëren.
- **Zod-sweep** is breed; cap de scope per batch en log welke routes bewust param-only (geen body) blijven, zodat "geen schema" niet als "vergeten" leest.

# Out of scope

- **L7** `proxy.ts` in-memory rate-limiter → Redis/Upstash (infra/ops, post-Vercel — aparte task).
- Nieuwe auth-mechanismen of een volledige RBAC-herontwerp — dit is hardening van het bestaande model.

# Zod-inventaris (2026-07-13)

Grep `POST/PUT/PATCH-routes die `.json()` lezen zonder `safeParse`/`.parse(`' gaf 65 hits. Categorisatie (zodat "geen schema" niet als "vergeten" leest):

- **Gefixt deze pass (2)**: `knowledge` POST, `research-plans` POST — spreadden untrusted structured data (JSON-velden, arrays, `rating`) ongevalideerd in `prisma.create`.
- **Al handmatig geguard (geen Zod nodig, laag risico)**: alle `*/lock`-routes (`brand-assets|campaigns|competitors|interviews|personas|products|strategies|trend-radar/[id]/lock`, `brandstyle/lock`) doen `typeof locked !== 'boolean'` → 400; `media/collections` + `media/tags` valideren `name` + workspace-ownership van `parentId`. Deze accepteren geen ongevalideerde writes.
- **Resterende batch (follow-up)**: de overige ~55 routes — o.a. `media/*` (bulk/import-url/collections-assets), `brand-assets` CRUD, `personas/[id]/chat/*`, `trends`/`trend-radar/manual`, `versions`, `stripe/checkout|purchase`, `admin/exploration-configs/*`, diverse `ai/*`- en `campaigns/wizard/strategy/*`-routes. Prioriteer op "spreadt untrusted body in DB/engine" boven "leest 1 veld met eigen guard". Splits per module-batch.

# Deze pass — verificatie

- `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors (4 pre-existing warnings in HelpArticlePage, ongewijzigd).
- `npm run smoke:security-residual` — **22/22 groen**: L6 escape (`<script>`/`<img onerror>`/quote) + href-allowlist (https/mailto toegestaan; javascript:/data:/http: geblokkeerd), L9 v1-round-trip + legacy-unversioned-decrypt (backward-compat, geen brick) + tamper-detectie, CSP-consolidatie (prod CSP+HSTS, dev geen CSP, Permissions-Policy consistent).
- **Handmatig te bevestigen door Erik** (UI-afhankelijk): viewer krijgt 403 op de twee L4-PUT-routes (smoke-plan stap 1).
- **L9-rollout-gate GESLOTEN (2026-07-14)** — sinds vandaag bestaat er een échte ad-token-rij (BB-Meta-account, gekoppeld tijdens ads-watchdog Fase 0). Bewijs in drievoud: (1) **formaatcheck op de echte prod-rij** (Neon, alleen structuur — geen secret): geen `v1:`-prefix, base64-decodeert naar 230 bytes ≥ iv12+tag16+1 → routeert in de nieuwe adapter aantoonbaar naar het legacy-compat-pad; (2) **cross-versie-roundtrip met de échte oude writer**: blob geschreven door de main-versie van `encryptToken` (ads-worktree) decrypt **byte-identiek** via de nieuwe adapter onder dezelfde key; (3) nieuwe writes zijn `v1:` en roundtrippen. Post-merge-main herbevestigd: ad-encryption-smoke 13/13 + security-residual 23/23 + tsc 0. NB: sinds #399 is er een extra `decryptToken`-caller (`sync-ad-insights.ts`) — signatures ongewijzigd, dus gedekt door dezelfde adapter.

# Tweede pass (2026-07-17) — verificatie

- `npx tsc --noEmit` 0 errors · eslint 0 errors op alle 25 geraakte files (16 pre-existing unused-var-warnings in seed.ts, niet van deze pass).
- `npm run smoke:security-residual` **31/31** (23 bestaand + 8 nieuw: statische laag zonder CSP, Report-Only-nonce/strict-dynamic/report-uri, geen unsafe-* in RO, PostHog in connect-src) · `smoke:ad-encryption` 13/13.
- **RBAC-e2e**: `rbac-403.spec.ts` 5/5 groen tegen `branddock_test` (lokale run: `E2E_DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock_test"`).
- **Zod-curl-steekproef** (dev-server): `ai/completion` lege/verkeerde messages → 400 + flatten-details · `trends` POST zonder title / string-relevance → 400, geldige body → 201 met identieke response-shape (rij daarna opgeruimd) · `research-plans` PATCH zonder id → 400, onbekend id → 404 (nieuwe workspace-scope) · `validate-briefing` met realistische wizard-payload → 200 SSE-start (schema laat legitiem verkeer door), kapotte payload → 400 · collector → 204 (ook op rommel-body).
- **CSP prod-build** (`npm run build && npm start`): exact 1 enforce-CSP (mét eu.i.posthog.com) + 1 Report-Only met nonce + Reporting-Endpoints op `/` én `/marketing`; nonce uniek per request; collector logt `[csp-report]` en antwoordt 204.
- **SSRF-harness** 6/6: grounding-host + publieke bestemming passeren `assertSafeUrl`; localhost/private-IP/AWS-IMDS/file-scheme geweigerd. Grep: geen `isPrivateHostname`-caller buiten `image-scraper.ts` (bewust besluit).
- ⚠️ **Pre-existing, niet van deze pass**: `permissions.spec.ts` faalt lokaal 7/18 mid-suite — baseline-run op ongewijzigde seed gaf een **identieke faalset**. Oorzaak: de auth-brute-force-limiter (10 sign-ins/min/IP) gedeeld door de hele suite vanaf localhost → sessieloze 401's; plus een 400 op workspace-create. Zie gotchas.md 2026-07-17. CI raakt dit niet (e2e-gate grept alleen critical-flow).

# Derde ronde (2026-07-17, zelfde dag — "ga door")

- **Zod batch 5-7 (MIDDEL) ✅** — 15 extra routes: `stripe/checkout` + `purchase`, `ad-publish/meta` (types op variantIndex/budget — string-variantIndex 500'de in Prisma), `organization/invite` (+ e-mail-format) + `invite/accept`, `media/[id]` PATCH + `media/collections/[id]` PATCH + `media/import-url` (Prisma-enum `category` 500'de ná de download), `brand-assets` POST + `[id]/regenerate`, `admin/exploration-configs` knowledge POST/PUT, `versions` POST (enum `changeType`), `campaigns/[id]/master-message` PATCH, `workspaces` POST/PATCH/DELETE. **Batch 8 (LAAG) bewust overgeslagen — definitief**: alle lock-/enkel-veld-routes hebben adequate `typeof`-guards; een schema voegt daar niets toe. **De Zod-sweep is hiermee afgerond.**
- **Bijvangst-IDOR #2 ✅**: `campaigns/[id]/master-message` PATCH update'te op kaal `id` zonder workspace-check — elke ingelogde user kon elke campaign cross-workspace overschrijven. Nu 404 buiten de eigen workspace (zelfde klasse als de research-plans-PATCH-fix).
- **Bijvangst seat-limit-bug — ontdekt, daarna SUPERSEDED door mains billing-werk**: `maxSeats = -1` blokkeerde élke invite (`memberCount >= -1` altijd waar). Onze `maxSeats < 0`-guard bleek bij de main-merge achterhaald: het billing-entitlements-plan (#180–#186, zelfde dag, andere sessie) verving de legacy maxSeats-check al door `enforceOrgPlanLimit()` (plan-tier-based + `-1`-developer-override) en **verwijderde `settings/team/invite` volledig**. Merge-resolutie: mains plan-limit-logica + ons Zod-schema behouden; onze seat-guard gedropt; de route-verwijdering gevolgd. Het onderliggende probleem is dus op main structureel opgelost.
- **e2e vs auth-rate-limiters ✅ — structureel opgelost**: er bleken DRIE gestapelde lagen (proxy 10/min/IP · Better Auth customRules 10/15min/IP — de échte dader · per-email-bucket 10/15min); alle drie hangen nu aan één test-knop `AUTH_RATE_LIMIT_MAX` (default overal strikt; Playwright-webServer zet 1000). ⚠️ Raakt `src/lib/auth.ts` — de "niet aanraken"-regel hierboven ging over de invite-member-logica, niet het rateLimit-blok; alleen de max-waarden zijn env-overridable gemaakt. Plus twee test-side-fixes in `permissions.spec.ts`: expliciete `organization/set-active` na login (kale API-login heeft geen activeOrganizationId) en Origin-headers op auth-POSTs (Better Auth CSRF; ná sign-out ook op de volgende sign-in enforce'd). **`permissions.spec.ts` + `rbac-403.spec.ts` samen: 23/23 groen** — de spec stond vóór deze pass structureel 7/18 rood.
- **Verificatie ronde 3**: tsc 0 · lint 0 errors · `smoke:security-residual` 31/31 + `smoke:ad-encryption` 13/13 · curl-steekproef alle nieuwe schema's (invalid → 400 + flatten; token-als-getal → 400 waar eerst 500; import-url-category → 400 vóór download; geldige invite → 201).

# Reviewronde (2026-07-17) — 2×2 subagents, task-finalize-conventie

Ronde 1 (2 onafhankelijke reviewers over de volledige diff): **0 CRITICAL**, 5 unieke WARNINGs, ~12 MINORs. Afhandeling:
- **W: branch conflicteerde met mains billing-werk (#180–#186)** → origin/main ingemerged; 3 conflicten opgelost (invite → mains `enforceOrgPlanLimit` + ons Zod-schema; checkout → ons schema met mains STARTER/GROWTH-tierset; `settings/team/invite` → mains verwijdering gevolgd).
- **W: `AUTH_RATE_LIMIT_MAX` zonder prod-guard** → gefixt: prod-gated in alle 3 lagen (genegeerd + warn bij NODE_ENV=production).
- **W: `.nullish()` op Json?-kolommen (knowledge/[id])** → gefixt: `.optional()` — een schema-valide `null` zou anders alsnog in Prisma 500'en.
- **W: collector bufferde body vóór de size-check** → gefixt: Content-Length-precheck.
- **W (geaccepteerd, follow-up)**: de in-memory fallback van `checkGenericRateLimit` evict nooit keys — op prod draait Redis (Upstash, met expire), dus alleen een lokaal/dev-artefact; meenemen als mini-item bij een volgende limiter-aanpassing. **Ronde 2-aanvulling**: de XFF-spoof-hoek (per-IP-key uit spoofbare header op het unauthenticated collector-endpoint) hoort bij hetzelfde item; als mitigatie is een globale 200/min-bucket vóór de per-IP-check toegevoegd — begrenst de totale verwerking én de map-groei ongeacht geroteerde XFF-waarden.
- MINORs: bewust niet auto-gefixt (conventie); genoteerd in de PR-comment. CLAUDE.md-envlijst wél bijgewerkt (`AUTH_RATE_LIMIT_MAX`).

Ronde 2 (2 verse reviewers op de gemergde staat): **0 CRITICAL**, 3 unieke WARNINGs — beide reviewers oordeelden "ready-to-merge na adresseren of expliciet accepteren". Afhandeling:
- **W: rbac-403 `login()` asserteerde de sign-in niet** (tegen de eigen gotcha-regel) → gefixt.
- **W: XFF-hoek collector** → globale rate-limit-bucket toegevoegd (zie boven).
- **W (expliciet geaccepteerd): `parsed.data as unknown as XxxBody`-casts (7 routes)** — de schema's zijn bewust wíjder dan de interfaces (strategicIntent/useCase als capped string i.p.v. enum-union; elaborate-velden optional) omdat de routes vóór de sweep niets valideerden: `satisfies z.ZodType<XxxBody>` afdwingen = contracten aanscherpen = gedragswijziging. Rationale gedocumenteerd in `strategy-request-schemas.ts`; aanscherpen kan als eigen mini-task zodra de wizard-callers erop gecontroleerd zijn.

# Resterend na deze pass

1. **Nonce-CSP enforce-flip** — gated op prod-Report-Only-data (zie MINOR-checklist). Bij die flip ook `eu-assets.i.posthog.com` overwegen (posthog-js lazy-features; reviewer-MINOR). Dit is het enige inhoudelijke rest-item; daarna kan de task definitief dicht.

# Notes

- Bron: security-audit 2026-06-26 §LOW + de finalize-review van #348 (PR #61). Volledige context in `docs/audits/2026-06-26-security-audit.md`.
- De complete HIGH+MEDIUM-remediatie zit in changelog #345–#348.
- **SSRF-sync-upgrade (image-scraper + knowledge-research/search)** blijft bewust open (task markeerde het al als optioneel/"blijft open"): geen DNS-resolve-risico nu, en de upgrade van sync `isPrivateHostname` naar async `assertSafeUrl` verandert de control-flow van die callers — eigen mini-batch waard.
