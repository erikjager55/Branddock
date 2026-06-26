# Security Audit — pre-launch (Branddock)

> **Datum**: 2026-06-26 · **Fase**: 0+1 afgerond (versie-/CVE-verificatie + geautomatiseerde sweep). Fase 2 (handmatige diepte-review) nog te plannen.
> **Framework**: OWASP ASVS 5.0 (doel: Level 2) + OWASP Multi-Tenant Cheat Sheet + OWASP Top 10 for LLM (2025).
> **Stack**: Next.js 16.1.6, React 19, Prisma 7.4 + Postgres/pgvector, Better Auth 1.4.18, Stripe 20.3.1.
> **Methode-bronnen**: zie onderaan.

---

## Fase 0 — Versie- & CVE-verificatie

- ✅ **Next.js 16.1.6 is voorbij de catastrofale 2025-CVE's**: CVE-2025-29927 (middleware auth-bypass, fixed 15.2.3) en de dec-2025 RSC-Flight-RCE (CVSS 10) zijn NIET in de huidige advisory-set → al gepatcht in deze major.
- ⚠️ **Next heeft nog wél een openstaande high advisory** → **bump 16.1.6 → 16.2.9** (non-breaking, zelfde major):
  - HTTP request smuggling in rewrites (GHSA-ggv3-7p47-pfv8)
  - Unbounded `next/image` disk-cache groei → storage-exhaustion DoS (GHSA-3x4c-7xq6-9pq8)
  - Unbounded postponed-resume buffering → DoS (GHSA-h27x-g6w4-24gq)
- **Architectuur-principe (Next-team, post-CVE-2025-29927)**: middleware (`src/proxy.ts`) is GEEN security-boundary. Élke route-handler/Server-Action heeft een *eigen* auth- + workspace-scope-check nodig. → kernvraag voor Fase 2.

## Fase 1 — Geautomatiseerde sweep

### SCA — `npm audit`: 45 kwetsbaarheden (0 critical, **10 high**, 33 moderate, 2 low)

Directe, security-kritieke high-severity pakketten (fix beschikbaar, meestal non-breaking):

| Pakket | Risico | Fix |
|---|---|---|
| **next** | request smuggling + DoS (zie Fase 0) | → 16.2.9 |
| **better-auth** | device-auth approve/deny accepteert elke geauth. sessie terwijl user-code pending (GHSA-cq3f-vc6p-68fh) | upgrade (≥1.6.11-lijn) — verifieer of device-auth-flow gebruikt wordt |
| **undici** | TLS-cert-bypass (SOCKS5) + HTTP header-injection via Set-Cookie | fix beschikbaar |
| **axios** | NO_PROXY-bypass (SSRF-relevant) + ReDoS | fix beschikbaar |
| **ws** | uninitialized memory disclosure + DoS | fix beschikbaar |
| **form-data** | CRLF-injection via multipart field-names | fix beschikbaar |
| **hono** | IP-restriction-bypass + cookie-injection + JWT-scheme | fix beschikbaar |

Dev-only / breaking-fix (lagere prio): `@opentelemetry/otlp-transformer` + `protobufjs` → vereisen breaking `promptfoo@0.120.5` bump (eval-tooling, niet productie-runtime).

### Secrets — basis op orde
- Alleen `.env.example` is getrackt; `.gitignore` dekt `.env*` (met `!.env.example`-uitzondering). ✅
- Geen hardcoded secrets in `src/` (geen `sk-…`/AKIA/private-keys). ✅
- `NEXT_PUBLIC_*` bevat alleen legitiem-publieke waarden (PostHog/Stripe-*publishable*/Sentry-DSN/domeinen). ✅
- ⏳ **Open**: volledige git-history secret-scan (vereist `gitleaks`/`trufflehog` — nog niet geïnstalleerd).

### SAST-lite (grep-based; volledige Semgrep nog te draaien)
- ⚠️ **3 echte raw-SQL call-sites** (buiten gegenereerde client) — **top Fase-2-item**:
  - `src/lib/agents/memory.ts:68` — `$executeRawUnsafe` (pgvector-literal-interpolatie; comment "interpolates cleanly" = yellow flag)
  - `src/lib/media/embedding-search.ts:84` (`$executeRawUnsafe`) + `:144` (`$queryRawUnsafe`)
  - **Verifiëren**: komt er user-gecontroleerde string in de query, of zijn alle waarden numeriek/geparametriseerd? pgvector-similarity bouwt vaak vector-strings.
- ⚠️ **4× `dangerouslySetInnerHTML`** — verifieer sanitisatie (DOMPurify o.i.d.).
- ℹ️ `execFile` in `src/lib/landing-pages/lp-screenshotter.ts` — verifieer dat args niet user-gecontroleerd zijn (worker-payload via temp-JSON).
- ✅ Geen `eval()`/`new Function()` met user-input (overige `exec`-hits zijn `regex.exec`), geen CORS-wildcard.

### Security headers (`src/proxy.ts`)
- ✅ Aanwezig: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy, Strict-Transport-Security.
- ⚠️ **Content-Security-Policy lijkt te ontbreken** — sterkste XSS-defense; aanrader om toe te voegen.
- ✅ Rate-limiting geïmplementeerd in `proxy.ts` (12 refs) — coverage/effectiviteit verifiëren in Fase 2.

---

## Fase 1 — uitvoeringsresultaten (2026-06-26)

**Dependency-fixes APPLIED** (branch `chore/security-dep-fixes`, commit `e52300ff`): `npm audit fix` + `next@16.2.9` → **van 45 (10 high) naar 22 (0 high, 21 moderate, 1 low)**. Alle high-severity advisories opgelost. `npx prisma generate` + `npm run build` groen. Resterende 21 moderate/1 low = breaking promptfoo/puck-keten (dev/build-only), bewust uitgesteld.

**Gitleaks** (git-history, 1114 commits / 41.7 MB): 9 hits → **alle 9 false-positive, history schoon**. `client.ts` matchte de letterlijke `'sk_test_placeholder'`-fallback; `CRON_SECRET='smoke-secret-12345'` = smoke-fixture; rest = doc-/`.env.example`-placeholders + een schema-veldnaam. → Aanbeveling: `.gitleaks.toml`-allowlist + gitleaks als CI-gate zodat het schoon blijft.

**Semgrep** (`--config auto`, 455 rules, 2318 files): **102 findings — 2 ERROR, 42 WARNING, 58 INFO**.
- ⚠️ **2 ERROR — `gcm-no-tag-length`** (`security/token-crypto.ts:184`, `ad-tokens/encryption.ts:68`): AES-256-GCM `createDecipheriv` zonder expliciete `authTagLength`. **Laag-reëel-risico** (tag wordt als vaste 16-byte slice geëxtraheerd mét lengte-check), **maar hardening aanbevolen**: geef `{ authTagLength: 16 }` mee aan beide `createDecipheriv`-calls (defense-in-depth). Crypto-pad — test decrypt van bestaande tokens na wijziging.
- ⚠️ **WARNING**: `path-join-resolve-traversal` (6× / 5 files — pad-traversal-risico, verifieer upload/media file-paths), `detect-non-literal-regexp` (31× — ReDoS-risico bij user-input-regex), `prototype-pollution-loop` (4×), `react-dangerouslysetinnerhtml` (1×).
- ℹ️ 58 INFO `unsafe-formatstring` (ruis, laag).

**Tools nu geïnstalleerd**: gitleaks 8.30.1 + semgrep 1.168.0 (Homebrew) — herbruikbaar als CI-gate.

## Aanbevolen directe acties (uit Fase 0+1)

1. ✅ **Dependency-fixes** — DONE (zie Fase 1-resultaten; branch `chore/security-dep-fixes`). Nog open: breaking promptfoo/puck-bump beslissen (dev-only).
2. **GCM-hardening**: `{ authTagLength: 16 }` toevoegen aan beide `createDecipheriv`-calls (token-crypto.ts + ad-tokens/encryption.ts) + decrypt van bestaande tokens testen.
3. **CSP toevoegen** aan `proxy.ts` (sterkste XSS-defense; nu afwezig).
4. **Fase 2 prioriteit #0**: de 3 raw-SQL pgvector-sites + de 6 path-traversal-WARNINGs verifiëren/parametriseren.
5. **CI-gates**: gitleaks + semgrep + `npm audit` (high-gate) als workflow zodat het schoon blijft.

## Fase 2 — UITGEVOERD (handmatige diepte-review, 6 parallelle reviewers, 2026-06-26)

> Elke finding adversarieel geverifieerd op exploitability. ~40 door scanners/sub-agents geflagde "critical" IDORs bleken het veilige `findFirst({id, workspaceId})`→mutate-by-PK-idioom (false-positive, verworpen). Onderstaande zijn de **bevestigde** findings.

### 🔴 HIGH (vóór launch dichten)

| # | Finding | Locatie | Exploit |
|---|---|---|---|
| H1 | **SSRF — primaire scraper-guard kapot** | `src/lib/utils/ssrf.ts` (`isPrivateHostname`) + alle scrapers | Bracketed IPv6 (`http://[::ffff:169.254.169.254]`) + DNS-rebind (`169.254.169.254.nip.io`) omzeilen de guard → AWS/GCP-metadata + interne services. `playwright-fallback.ts` valideert 0. **Latent tot Vercel (metadata-creds); loopback/intern nú al exploitabel.** Fix: hergebruik de gold-standard `external-content-ingest.ts` (DNS-resolve-en-verifieer + manual redirect-revalidatie). |
| H2 | **Stored XSS via JSON-LD op publieke `/p/[slug]`** | `src/app/p/[slug]/page.tsx:136` + `page-json-ld.ts` | `JSON.stringify(jsonLd)` in `dangerouslySetInnerHTML` zonder `<`/`/`-escaping; AI/user-variant-velden (headline, FAQ, GEO-terms) stromen erin → `</script>`-breakout = stored XSS op publieke pagina. Fix: `</>/&`-escape + strip bij persist. *(2× bevestigd)* |
| H3 | **One-time purchase-prijs client-gecontroleerd** | `src/app/api/stripe/purchase/route.ts:31` → `one-time.ts` | `amount` uit body, geen server-side prijs-lookup; `amount:0` ontgrendelt bundle-tools gratis. Fix: prijs server-side uit `ResearchBundle`/`Workshop` halen. *(billing-flag)* |
| H4 | **Billing-mutaties zonder rol-check** | `settings/billing/{change-plan,cancel}`, `stripe/{checkout,portal}` | Elke member/viewer kan het org-abonnement wijzigen/opzeggen. Fix: `requireRole(['owner','admin'])`. |
| H5 | **`/api/stripe/sync` cross-tenant IDOR + geen rol** | `stripe/sync/route.ts:32` → `subscription-sync.ts:147` | Vertrouwt body-`workspaceId`, alleen `requireAuth()` → forceer andere tenant naar FREE + verwijder Subscription-rijen. Fix: `resolveWorkspaceId()` + rol. *(2× bevestigd)* |
| H6 | **3 ongeauthenticeerde LP-AI-routes** | `landing-pages/{component-edit,strict-rewrite,auto-iterate}` | Geen auth/rate-limit, roepen Claude (maxTokens 8000) → ongeauth. billable LLM-abuse/DoS. Fix: wrap met `withAi()`. |
| H7 | **Claw context-stack fence't untrusted content niet** | `src/lib/claw/context-assembler.ts` | Geüploade PDF's / gescrapete competitor- / knowledge-content gaan rauw de Claw-prompt in (de component mét write-tools) → indirecte prompt-injection → tool-steering. `fenceUntrustedContent` bestaat maar wordt door Claw niet gebruikt. Fix: alle untrusted blokken door de fence. |
| H8 | **Cross-tenant IDOR op Strategy-child-resources** | `strategies/[id]/{objectives/[objId],…/key-results/[krId],milestones/[msId],focus-areas/[faId]}` PATCH/DELETE | Scopen alleen de parent-strategy, muteren child by global-id → muteer/verwijder child van andere tenant. Fix: `updateMany({ where:{ id, strategyId }})` (sibling `reorder` doet dit al correct). |

### 🟠 MEDIUM

- **M1** — Admin kan member naar `owner` inviten/escaleren (`organization/invite` — role niet ge-enum'd). 
- **M2** — `/api/workspace/export`: viewer exfiltreert hele workspace + interviewee-PII (geen rol-check). 
- **M3** — Geen rol/RBAC op Claw write-tools (viewer kan via de agent muteren). 
- **M4** — Leak-class-sanitizer (`scrubStrategyLayer`) niet toegepast op Claw-chat-output → Effie/GEO-jargon-leak-klasse blijft open op het chat-pad. 
- **M5** — **Plan-tier-entitlement niet server-side afgedwongen**: `enforceFeature`/`checkPlanLimit`/`withPlanEnforcement` hebben **0 call-sites** → paywall server-side feitelijk ongebouwd. Vóór billing live. 
- **M6** — Prototype-pollution via `deepSet` (`update_asset_framework` fieldPath uit LLM-args; + `user/preferences` `__proto__`-key). Fix: segment-guard in `deepSet`.

### 🟡 LOW / INFO / hardening

- **L1** GCM `{authTagLength:16}` toevoegen (bevestigd níet exploitabel — tag al op 16 gepind — wel hardening). 
- **L2** `webhooks/trigger` timing-unsafe `===` op secret → `timingSafeEqual`. 
- **L3** `ad-tokens/encryption` heeft geen rotatie-pad / unversioned format (vs het versioned `token-crypto`) — convergeer. 
- **L4** Workspace-config-mutaties (`brand-style-anchors`, `hero-logo-overlay`) zonder rol-check (viewer). 
- **L5** `navigate_to_page.section` = unconstrained `z.string()` → `z.enum`. 
- **L6** Help-Center markdown-renderer escaped niet (latent; admin-only content vandaag). 
- **L7** **CSP ontbreekt** in `proxy.ts`. 
- **L8** Input-validatie-dekking ~52% van mutatie-routes (Zod-hygiëne-sweep). 
- **L9** `proxy.ts` per-IP rate-limiter is in-memory → ineffectief over serverless; Redis in prod borgen.

### ✅ Wat al goed verdedigd is (niet regresseren)

Tenant-isolatie is over het algemeen **disciplinair correct**: verify-then-mutate-by-PK + `hasWorkspaceAccess()` + `require*Access`-helpers. Verder bevestigd-veilig: M10-token-encryptie-fundamenten (random IV, key-len-validatie, prod fail-closed, rewrap-script, tag gevalideerd vóór `setAuthTag`), Stripe-webhook (signature + idempotentie + re-fetch), Meta-OAuth-CSRF (random state, single-use, TTL, `appsecret_proof`), cron-auth (`timingSafeEqual`), login-rate-limiting (dual-layer Redis), Brandclaw autonome loop (read-only tools + caps), Claw write-tool-`execute` (server-side `workspaceId` + `updateMany`+count-guard — stopt cross-tenant tool-hijack), human-in-the-loop op alle mutaties, `toPgVectorLiteral` finite-number-gate (raw-SQL veilig), server-gegenereerde upload-filenames (path-traversal veilig), `execFile` zonder shell (geen command-injection).

## Fase 3/4 — remediatie (te plannen)

Domeinen, geprioriteerd: (1) tenant-isolatie/IDOR over de 500 routes — ~63 zonder auth/workspace-grep-hit als startlijst; (2) authN/authZ + rol-enforcement; (3) secrets/crypto (TOKEN_ENCRYPTION_KEY-lifecycle) + git-history-scan; (4) SSRF (website-scanner/competitor-discovery/knowledge-research vs OWASP SSRF-cheatsheet); (5) LLM prompt-injection (direct + indirect via scrape/knowledge); (6) input-validatie/Zod op mutaties; (7) Stripe webhook-signature + idempotentie + plan-enforcement; (8) headers/CSP/rate-limit-coverage.

**Tooling-gap om Fase 2 te versterken**: installeer `semgrep` (volledige SAST + custom tenant-scoping-regels) + `gitleaks` (git-history secret-scan). Beide via Homebrew.

---

## Bronnen (methodologie)

- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) · [Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html) · [Top 10 for LLM 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/) · [SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Next.js — How to think about security](https://nextjs.org/blog/security-nextjs-server-components-actions) · [Data Security guide](https://nextjs.org/docs/app/guides/data-security)
- [Prisma — raw queries (injection-safety)](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries)
- Tooling: [Semgrep](https://semgrep.dev/) · [Gitleaks](https://github.com/gitleaks/gitleaks) · [OSV-Scanner](https://github.com/google/osv-scanner)
