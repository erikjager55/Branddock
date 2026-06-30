---
id: security-h1-ssrf-guard
title: SSRF — primaire scraper-guard hardenen (DNS-resolve-en-verifieer)
fase: pre-launch
priority: next
effort: 1-2 dagen
owner: claude-code
status: done
created: 2026-06-26
completed: 2026-06-30
related-adr: -
related-spec: docs/audits/2026-06-26-security-audit.md
worktree: -
---

# Probleem

De primaire SSRF-guard `src/lib/utils/ssrf.ts` (`isPrivateHostname`/`assertSafeUrl`/`assertSafeRedirect`) heeft bewezen bypasses (security-audit 2026-06-26, H1/F1-F7): bracketed IPv6 (`http://[::ffff:169.254.169.254]`), geen DNS-resolutie (DNS-rebind via `169.254.169.254.nip.io`), redirects gerevalideerd met dezelfde kapotte primitive, en geen scheme-allowlist. Gebruikt door **alle** user-facing scrapers (website-scanner, product/brandstyle/competitor URL-analyse, knowledge-research, competitor `fetch-policy.ts`). `playwright-fallback.ts` en `multi-page-scraper.ts` valideren 0. Post-Vercel = cloud-metadata-credential-exfiltratie; loopback/intern nú al exploitabel.

Er bestaat al een **correcte** implementatie: `src/lib/alignment/external-content-ingest.ts` (scheme-allowlist + `isIP()` + DNS-resolve-en-verifieer van alle records + manual redirect-revalidatie per hop + CGNAT + volledige IPv6 + streaming byte-cap).

# Voorstel

1. Extraheer de `external-content-ingest.ts`-logica naar de gedeelde `src/lib/utils/ssrf.ts` (resolve-en-verifieer + manual redirect-loop + scheme-allowlist + byte-cap).
2. Laat alle scrapers door die ene helper lopen. Zet `redirect: 'manual'` + re-valideer elke hop.
3. `playwright-fallback.ts`: valideer vóór `page.goto` (+ overweeg egress-proxy met deny-by-default).
4. `multi-page-scraper.ts`: guard de bare `fetch`.
5. Rate-limit + byte-cap op `website-scanner`/`claw/scrape`/`briefing-sources/parse-url` (nu 0).

# Acceptatiecriteria

- [ ] `isPrivateHostname` blokkeert: bracketed IPv6 (`[::1]`, `[::ffff:169.254.169.254]`, `fe80::/10`, `fc00::/7`), DNS-namen die naar private/metadata-IP's resolven, CGNAT (`100.64/10`), `169.254.169.254`(.nip.io).
- [ ] Alleen `http:`/`https:` schemes; redirects manual + per-hop gerevalideerd.
- [ ] `playwright-fallback.ts` + `multi-page-scraper.ts` gevalideerd.
- [ ] Smoke: de F1/F2/F3-payloads uit de audit worden geblokkeerd (unit-test op de guard).
- [ ] `npx tsc --noEmit` + `npm run lint` groen.

# Bestanden die ik aanraak

- `src/lib/utils/ssrf.ts` (hardenen) · `src/lib/alignment/external-content-ingest.ts` (extract/hergebruik) · alle scraper-consumers · de 3 onbeschermde scrape-routes.

# Smoke test plan

Unit-test `assertSafeUrl`/`isPrivateHostname` tegen de payload-set uit de audit (IPv6-literal, nip.io, metadata-hostname, redirect-naar-metadata) → allemaal geblokkeerd; legitieme publieke URL → toegestaan.

# Risico's

- Te strikte guard blokkeert legitieme klant-URLs → houd de allowlist/whitelist-uitzonderingen die `external-content-ingest` al heeft aan; test op echte test-workspaces.

# Out of scope

- Egress-proxy-infra (eigen ops-taak) — wel aanbevolen post-Vercel.

# Status 2026-06-26 (kern gedaan, commit `6f0875e4`)

**✅ Gedaan**: `ssrf.ts` herschreven (geharde `isPrivateIp` incl. hex-mapped IPv6, `isPrivateHostname` bracket-strip, async `assertSafeUrl`/`assertSafeRedirect` met DNS-resolve-en-verifieer + scheme-allowlist + `readBodyWithCap`). Alle consumers ge-`await`'d; `products/url-scraper` + `media/import-url` ge-upgrade naar `assertSafeUrl`; `playwright-fallback` + `multi-page-scraper` valideren nu; `external-content-ingest` DRY't op de gedeelde guard. Smoke `scripts/smoke-tests/ssrf-guard.ts` 48/48; tsc 0, lint 0, build groen.

**⏳ Residu (defense-in-depth, lager risico)**:
- `redirect: 'manual'` per-hop in alle scrapers (nu post-hoc revalidatie op `'follow'` met de geharde guard — de redirect-*request* zelf gebeurt nog vóór validatie). Overweeg een gedeelde `safeFetch`-helper.
- Rate-limit + streaming byte-cap op `website-scanner`/`claw/scrape`/`briefing-sources/parse-url` (nu 0).
- `image-scraper` + `knowledge-research/search` blijven bewust op de sync `isPrivateHostname` (krijgen de F1-hardening automatisch; geen DNS-resolve — lager risico predicate/redirect-check).

# Status 2026-06-30 (punt 1 afgerond — H1 DONE, branch `fix/security-h1-safefetch-redirects`)

**✅ Punt 1 — per-hop redirect-revalidatie**: nieuwe `safeFetch()` in `ssrf.ts` forceert `redirect:'manual'` + revalideert élke hop met `assertSafeUrl` vóór de connectie (sluit het blind-SSRF-venster dat `redirect:'follow'` + post-hoc `assertSafeRedirect` openliet). Gewired op alle 7 scraper-fetches: products/url-scraper (x2), brandstyle/url-scraper (HTML + CSS), logo-color-extractor, multi-page-scraper, competitors/fetch-policy, media/import-scraped-image. Plus credential-header-stripping (Authorization/Cookie) op cross-origin redirects (review-finding, defense-in-depth voor toekomstige callers). Smoke `ssrf-guard.ts` 62/62; tsc 0, lint 0, build groen (op `7cf50617`). Ge-finalized via 2-subagent review (beide ready-to-merge).

**⏳ Resterend residu → verplaatst naar [[security-residual-hardening]]**:
- `src/lib/security/fetch-with-limit.ts` — zelfde oude patroon (default-follow + post-hoc) én geen entry-`assertSafeUrl`; logische volgende `safeFetch`-conversie (review-finding reviewer B). 16 call-sites.
- Rate-limit + byte-cap op `website-scanner`/`claw/scrape`/`briefing-sources/parse-url` (nu 0).
- `image-scraper` + `knowledge-research/search` bewust op sync `isPrivateHostname` (lager risico).
- `safeFetch` 307/308 method+body-resend (latent; alle huidige callers zijn GET).

# Notes

- Bron: security-audit 2026-06-26 §SSRF (F1-F7). `external-content-ingest.ts` was de referentie; is nu DRY'd op de gedeelde guard.
- Punt 1 (`safeFetch`) afgerond 2026-06-30 in geïsoleerde worktree (parallelle i18n-sessie hield de hoofd-working-tree bezet).
