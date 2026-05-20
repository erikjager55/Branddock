---
id: competitor-scraping-apify-fallback
title: Apify scraping-fallback in competitor refresh-route
fase: pre-launch
priority: now
effort: 1-1.5 dagen
owner: claude-code
status: open
created: 2026-05-19
completed: -
related-adr: -
related-spec: docs/specs/apify-integration-options.md
worktree: branddock-brandclaw (spike/apify-url-crawler)
---

# Probleem

`refresh/route.ts` gebruikt vandaag `scrapeProductUrl` (rauwe fetch + cheerio) met fallback naar `scrapeUrlViaGemini`. Probe v2 (zie spike-bevindingen in `docs/specs/apify-integration-options.md` §SPIKE-RESULTATEN) toonde 1 van 11 representatieve URLs gefaald op current — JS-heavy SPAs zonder browser-runtime krijgen 0 bruikbare body-text. Op pilot-volume (50-150 concurrenten) zou dat 5-14 silently-failed refreshes per cyclus betekenen — en die competitors leveren dan ook geen input aan de net-toegevoegde AI pattern-classifier (entry #263).

Apify Website Content Crawler met `playwright:firefox` + residential proxy lost dit op (Snowflake-case: 0 → 2868 chars). Geen hybrid extractor-complexiteit nodig — Apify's eigen output is voldoende voor classifier-input op de fail-cases.

# Voorstel

3-step fallback-chain in `refresh/route.ts`, vervangt huidige 2-step (current → Gemini):

```
try scrapeProductUrl(url)
  if bodyText < 500 chars OR throw → try scrapeViaApify(url)
    if bodyText < 500 chars OR throw → scrapeUrlViaGemini(url)
```

Apify-call alleen op fail-pad → ~10% van refreshes → ~$0.80/maand cost @ pilot-volume + 30s latency-tax alleen op die ~10%.

# Acceptatiecriteria

**Apify-client wrapper**:
- [ ] `src/lib/scraping/apify-client.ts` (nieuw) — singleton ApifyClient (zelfde pattern als `geminiClient` / `openaiClient`)
- [ ] `scrapeViaApify(url): Promise<ScrapedProductData>` — returnt zelfde shape als `scrapeProductUrl` voor drop-in compat
- [ ] Config: `crawlerType: 'playwright:firefox'`, residential proxy, 4096MB memory, 120s timeout
- [ ] Graceful: API-error → throw met duidelijke message (refresh-route catch'eert)
- [ ] `APIFY_TOKEN` env var required at startup (fail fast als ontbreekt — niet runtime)
- [ ] Cost-tracking optioneel — Apify's `usageUsd` veld is niet-betrouwbaar in API-response, dus skip ingebouwde tracking; user moet apify.com dashboard checken

**Refresh-route integratie**:
- [ ] `src/app/api/competitors/[id]/refresh/route.ts` — 2-step `try-catch` wordt 3-step chain
- [ ] Minimum content-threshold `MIN_BODY_TEXT_CHARS = 500` als shared const
- [ ] Log welke scraper uiteindelijk succeeded (PostHog of console.info met `sourceIdentifier`) voor observability
- [ ] Backwards-compat: bestaand gedrag identiek wanneer current succeeds (geen Apify-call dan)

**scrapeProductUrl tweak** (klein):
- [ ] Verwijder of expose 8000-char cap (`slice(0, 8000)` op regel 254 maskeert vergelijking) — maak `MAX_BODY_LENGTH` constant in module, default 8000 maar tunable
- [ ] (Niet vereist, kan in vervolg-task)

**Smoke-test**:
- [ ] `scripts/smoke-tests/apify-fallback-chain.ts` (nieuw) — 4 scenarios:
  - (a) current succeeds (Stripe-type) → Apify NIET aangeroepen
  - (b) current fails (Snowflake-type) → Apify aangeroepen + bruikbare content
  - (c) beide falen → Gemini-fallback aangeroepen
  - (d) Apify API-error → graceful door naar Gemini
- [ ] Mock-injection patroon: maak `refresh-route`'s scraper-chain testbaar via DI in een nieuwe `runScraperChain()` helper, of test direct via fetch tegen `/api/competitors/[id]/refresh` met fixture-URLs

**Quality gates**:
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors in nieuwe files
- [ ] Smoke 4/4 PASS

# Bestanden die ik aanraak

**Nieuw**:
- `src/lib/scraping/apify-client.ts` (~120 LOC) — singleton + scrapeViaApify wrapper
- `scripts/smoke-tests/apify-fallback-chain.ts` (~150 LOC) — 4 scenarios

**Modify**:
- `src/app/api/competitors/[id]/refresh/route.ts` — 2-step → 3-step chain (regel 89-99)
- `src/lib/products/url-scraper.ts` — expose 8000-char cap (regel 254) als optional param (kleine refactor)

**Read-only**:
- `scripts/probes/apify-vs-current-scraper.ts` — Apify-config referentie
- `docs/specs/apify-integration-options.md` — design-context

# Bestanden die ik NIET aanraak

- `scrapeUrlViaGemini` — blijft last-resort fallback
- Andere callers van `scrapeProductUrl` buiten refresh-route (lijst checken vóór scrapeProductUrl tweak om geen regressie te introduceren)
- competitor-snapshot-historie / diff-engine — werken op canonical extracted, scraper-bron irrelevant

# Smoke test plan

1. `npx tsx scripts/smoke-tests/apify-fallback-chain.ts` — 4 scenarios groen
2. Live test 2 URLs via curl tegen lokale refresh-route:
   - `https://stripe.com` (current moet succeed, geen Apify-call in logs)
   - `https://www.snowflake.com` (current faalt, Apify rescues)
3. Verifieer in DB: `CompetitorSnapshot.extractedJson.valueProposition` is gevuld voor beide cases
4. Check `console.info` logs voor welke scraper succeeded — observability bewijs

# Risico's

- **Apify-call kan refresh-route p99 latency naar ~32s duwen** (vs huidige ~2s op fail-pad via Gemini). **Mitigatie**: alleen op ~10% fail-pad, niet hot-path. Voor interactive refresh: UI moet loading-state tonen die >30s comfortabel handelt.
- **APIFY_TOKEN missing in productie** → refresh-route crasht bij fail-pad. **Mitigatie**: fail-fast bij module-load + duidelijke error in Vercel logs. Of: fallback direct naar Gemini als token ontbreekt (graceful degrade).
- **Apify-cost runaway** als veel competitors regelmatig falen op current. **Mitigatie**: monitor via `console.info` logs eerste 30 dagen, threshold-tune `MIN_BODY_TEXT_CHARS` indien te triggerhappy.
- **Backwards-compat regressie**: scrapeProductUrl tweak (8000-char cap exposed) kan andere callers raken. **Mitigatie**: default-waarde behoudt huidig gedrag; expliciete grep naar andere call-sites vóór implementatie.

# Out of scope

- Apify als REPLACEMENT van current (spike-NO-GO bevestigd in v1/v2)
- Hybrid render-only + cheerio-extract pattern (probe v3 tooling-bug + Apify-direct werkt good-enough)
- News-actor / RSS-actor / LinkedIn-actor (separate tasks per spec)
- Per-workspace Apify-config (geen tier-aware refresh in MVP)
- ApifyClient cost-tracking via project's AiCallTrace tabel (usageUsd niet betrouwbaar in API)
- scrapeProductUrl volledige refactor (alleen 8000-char cap exposed)

# Notes

Spike-branch `spike/apify-url-crawler` heeft alle context: probe-script v1/v2/v3, stripe-debug, spec-doc met SPIKE-RESULTATEN sectie. Idea-flow → technical-planner geskipt omdat spike-evidence al concrete scope-grenzen oplevert.

Volgorde binnen Track B: implementatie kan parallel met strategy-analyst-stub Phase C (Vercel Cron) want raakt verschillende bestanden.

PR-volgorde: dependt op `feat/competitor-ai-classifier` (entry #263) merge naar main — deze branch is afgesplitst van die feature-branch.
