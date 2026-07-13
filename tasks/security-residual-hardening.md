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
- [~] **Zod-coverage-sweep** — **eerste batch gedaan**: `knowledge` POST (spreadde rating/tags/JSON-velden) + `research-plans` POST (spreadde `configuration`-JSON + arrays) hebben nu een `safeParse`-schema. **Inventaris + resterende batches**: zie §Zod-inventaris hieronder — het gros van de ~63 overige routes heeft al een handmatige `typeof`-guard (bv. álle `*/lock`-routes: `{ locked: boolean }`) of is param-only; die lezen niet als "vergeten". Resterend als losse follow-up-batch.

**SSRF-convergentie (uit H1-task `security-h1-ssrf-guard`) — AFGEROND in #350**
- [x] **`fetch-with-limit.ts` → `safeFetch`** — gemigreerd (16 callers, signature ongewijzigd). Plus de 3 resterende raw-fetch-paden ontdekt in review en óók geconverteerd: `media/import-url` (entry-probe), `media/stock/import` (user-URL, had géén SSRF-validatie), `export/proxy-image` (allowlisted). `assertSafeRedirect` is nu dood en verwijderd. Geen oude-patroon-fetch meer in `src/app`/`src/lib`.
- [x] **Rate-limit** — `checkGenericRateLimit` (429 + Retry-After) op `website-scanner` (10/min/workspace), `claw/scrape` (20/min/user), `briefing-sources/parse-url` (20/min/workspace).
- [x] **byte-cap** — `products/url-scraper` leest de body via `readBodyWithCap` (10MB stream-cap, OOM-defense) i.p.v. `.text()`.
- [x] **`safeFetch` 307/308** — 303 (+301/302 op non-GET) → bodyless GET-downgrade; 307/308 behoudt method+body (fetch-spec).
- [ ] **`image-scraper` + `knowledge-research/search`** — overweeg upgrade van sync `isPrivateHostname` naar `assertSafeUrl`/`safeFetch` (lager risico; geen DNS-resolve nu). _(blijft open)_

**MINORs (finalize-review #348)**
- [x] **CSP-bron consolideren** — CSP + security-headers-waarden staan nu in één bron `src/lib/security/security-headers.ts` (`buildSecurityHeaders(isProd)`), geïmporteerd door zowel `src/proxy.ts` als `next.config.ts`. Meteen de gevonden drift gedicht: Permissions-Policy `interest-cohort` en HSTS max-age (was 31536000 vs 63072000) zijn nu identiek. Nonce-based `script-src` blijft bewust een grotere follow-up (buiten scope).
- [x] **Dubbele workspace-resolutie** — `claw/confirm/route.ts` gebruikt nu de `workspaceId` uit `requireWorkspaceRole`; de losse `resolveWorkspaceId()` is weg (sessie-call blijft, alleen voor de `userId`).
- [ ] **RBAC smoke-coverage** — _resterend._ De owner-guard-403's (M1/M2/M3) vereisen een runtime-assertie met geseede rollen + auth-cookies (Playwright/integratie), niet een pure unit-smoke; bewust NIET vervangen door een brittle grep-test die runtime-gedrag voorwendt. Oppakken samen met de bredere e2e-RBAC-suite. NB: M2 `export`-routes gebruiken `resolveWorkspaceId` (geen role-helper) — verifieer bij die smoke of export-by-viewer inderdaad geblokkeerd hoort te zijn of dat de #348-M2-fix elders zit.

- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd

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
- **Handmatig te bevestigen door Erik** (UI/DB-afhankelijk): viewer krijgt 403 op de twee L4-PUT-routes (smoke-plan stap 1); een bestaande ad-token-rij (unversioned) blijft decrypten na deploy (L9-risico — test met een échte rij vóór rollout, gotcha 2026-04-21).

# Notes

- Bron: security-audit 2026-06-26 §LOW + de finalize-review van #348 (PR #61). Volledige context in `docs/audits/2026-06-26-security-audit.md`.
- De complete HIGH+MEDIUM-remediatie zit in changelog #345–#348.
- **SSRF-sync-upgrade (image-scraper + knowledge-research/search)** blijft bewust open (task markeerde het al als optioneel/"blijft open"): geen DNS-resolve-risico nu, en de upgrade van sync `isPrivateHostname` naar async `assertSafeUrl` verandert de control-flow van die callers — eigen mini-batch waard.
