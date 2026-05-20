# APIFY-INTEGRATIE — Beslis-spec voor competitor-intelligence pipeline

## Laatst bijgewerkt: 19 mei 2026

---

## SCOPE & PROBLEEM

Branddock's competitor-pipeline leunt op een rauwe `fetch` (`scrapeProductUrl`) met Gemini-fallback. Pain-points: bot-blockers, JS-rendered sites, rate-limits, geen visuele/news/LinkedIn-bronnen. Vier classifier-events (`FUNDING_EVENT`, `LEADERSHIP_CHANGE`, `VISUAL_REBRAND`, `NEW_FORMAT_EMERGING`) blijven leeg in productie omdat externe data ontbreekt, en `competitor-content-item-discovery` wacht op een crawl/RSS-bron.

Scope: evalueer of Apify (managed scraping-platform met 1500+ actors) één gedeelde data-laag kan leveren voor:

- (A) Refresh-route URL-scrape vervanging
- (B) News-monitoring voor funding + leadership events
- (C) LinkedIn company-page voor leadership + visual-rebrand signaal
- (D) RSS/crawl voor content-item-discovery + nieuwe formats
- (E) Screenshot voor visual-rebrand diff

Pilot-volume: ~50-150 competitors, weekly refresh (`0 9 * * 1`), news/LinkedIn op dezelfde cadans.

---

## AANBEVOLEN ACTOR PER USE-CASE

| Use-case | Actor (store-URL) | Waarom |
|---|---|---|
| (A) URL-scrape refresh | [`apify/website-content-crawler`](https://apify.com/apify/website-content-crawler) | Official, adaptive HTTP/headless, ingebouwde anti-bot + proxy, output direct geschikt voor Gemini-classifier (markdown). |
| (B) News-monitoring (FUNDING + LEADERSHIP signaal) | [`andok/google-news-scraper`](https://apify.com/andok/google-news-scraper) | Pay-per-result ($1 / 1000 articles), RSS-gebaseerd dus stabiel, keyword-batches per workspace. |
| (C) LinkedIn company-page | [`scrapio/linkedin-company-page-scraper`](https://apify.com/scrapio/linkedin-company-page-scraper) | Public-mode default (geen LinkedIn-cookies vereist), levert tagline/about/posts/follower-count + employee preview voor leadership-detectie. |
| (D) Content-item discovery | [`automation-lab/rss-feed-reader`](https://apify.com/automation-lab/rss-feed-reader) | Batch-feeds in één run, $0.035/run + $0.001/item. Voor sites zonder RSS: fallback op (A). |
| (E) Visual-rebrand screenshot | [`apify/screenshot-url`](https://apify.com/apify/screenshot-url) | Official, headless, key-value-store opslag, combineerbaar met Gemini-vision voor visual-diff. |

---

## COST-MODEL (pilot-volume, EU-prijzen indicatief)

Aanname: 100 competitors, Scale-plan (CU $0.16, $199/mnd prepaid).

| Use-case | Cost-per-run | Runs / mnd | Schatting / mnd |
|---|---|---|---|
| (A) Website-crawl, ~20 pages × 100 competitors weekly | ~$0.05 (headless, 20 pages) | 4 × 100 = 400 | ~$20 |
| (B) Google News, ~50 articles × 100 competitors weekly | $0.05 (pay-per-result) | 400 | ~$20 |
| (C) LinkedIn company-page × 100 weekly | $14.99/mnd actor-rent + ~$0.02 CU/run | 400 | ~$23 (incl. rent) |
| (D) RSS reader, ~10 feeds × 100 wkly, gem. 30 items | $0.035 + 0.03 = ~$0.07 | 400 | ~$28 |
| (E) Screenshot, 3 pages × 100 weekly | ~$0.01 | 1.200 | ~$12 |
| **Subtotaal usage** | | | **~$103** |
| **+ Plan (Scale)** | | | **$199** |
| **Pilot TCO** | | | **~$200-250/mnd** (binnen prepaid credits) |

Free tier ($5/mnd, $0.20/CU) is voldoende voor dev/staging maar krap voor demo-data. Starter ($29) volstaat tot ~10 competitors pilot, dan opschalen naar Scale.

---

## INTEGRATION APPROACH

- **SDK**: officiële [`apify-client`](https://www.npmjs.com/package/apify-client) (npm, TypeScript-types in package, GitHub `apify/apify-client-js` actively maintained). Auto-retry (8x, exponential backoff) + webhook-retry (11x) out-of-the-box — past op onze rate-limiter/error-handler patronen.
- **Auth**: API-token per-environment via `APIFY_TOKEN` env-var. Géén per-workspace OAuth (Apify is interne service, niet user-facing).
- **Abstractie-plek**: `src/lib/ai/` past niet (geen AI-call). Voorstel: nieuwe `src/lib/scraping/apify-client.ts` als singleton (zelfde pattern als `geminiClient` / `openaiClient`), plus per-actor wrappers (`scrapeCompetitorSite`, `fetchCompetitorNews`, etc.) in `src/lib/scraping/actors/`.
- **Sync vs webhook**: weekly cron blijft Vercel Cron. Voor langlopende actor-runs (>60s) → fire-and-forget + Apify-webhook → Vercel route `/api/webhooks/apify` schrijft naar `CompetitorSnapshot`. Voor refresh-route (interactive) → blocking `runActor()` met 90s-timeout, fallback op huidige Gemini-scrape.

---

## DECISION-MATRIX

| Use-case | Cost-risk | TOS-risk | Strategic value | Dependency | Verdict |
|---|---|---|---|---|---|
| (A) URL-crawl | Laag | Geen | Hoog (98% scrape-rate vervangt brittle fetch) | Geen | **Greenlight nu** |
| (B) News (FUNDING) | Laag | Geen | Hoog (ontgrendelt event-type direct) | Classifier MVP staat al | **Greenlight nu** |
| (C) LinkedIn (LEADERSHIP) | Midden ($15/mnd rent) | **Midden** (TOS-grijs zone, public-mode mitigates) | Midden | Pilot-customer toestemming | **Defer naar pilot+2** |
| (D) RSS discovery | Laag | Geen | Hoog | `competitor-content-item-discovery` task moet eerst datamodel definiëren | **Greenlight zodra task in IN-PROGRESS** |
| (E) Screenshot visual-diff | Laag | Geen | Laag-midden (mooi-maar-nice-to-have) | Vision-pipeline + diff-algoritme nog niet gebouwd | **Defer naar Sprint #4** |

Greenlight-batch nu: A + B + D (volgt zodra discovery-task open). Defer: C, E.

---

## RISICO'S + OPEN VRAGEN

1. **TOS-risk LinkedIn**: hiQ-v-LinkedIn precedent ondersteunt public-data, maar LinkedIn blijft litigieus. Voor B2B SaaS pilot in EU: vraag legal review vóór (C) productie-rollout.
2. **Cost-creep bij scale**: 1.000 competitors zou TCO naar ~$1.500/mnd duwen (Business-plan $999 + usage). Need usage-monitoring + per-workspace quotas voordat we publiek launchen.
3. **Vendor lock-in vs flexibiliteit**: actor-output schemas verschillen per maker (community vs official). Wrapper-laag in `src/lib/scraping/actors/` moet normaliseren naar Branddock-interne types — wie owns die mapping per actor-update?
4. **GDPR voor news-data**: persoonsnamen in news-snippets (CEO-changes) = persoonsgegevens. DPA met Apify nodig? Apify zit in EU (Praag) → waarschijnlijk SCC-compliant, maar bevestigen.
5. **Open: webhook-auth**. Apify webhooks ondersteunen signed-payloads? Of moet `/api/webhooks/apify` een shared-secret in query-string accepteren? Te valideren in spike.

---

---

## SPIKE-RESULTATEN (2026-05-19)

Probe-iteraties op branch `spike/apify-url-crawler` — zie `scripts/probes/apify-*.ts`.

**Probe v1** (`apify-vs-current-scraper.ts`, 7 publieke SaaS-landings, default config):
Current 7/7 success (~948ms, ~7218 chars), Apify 5/7 success (~31418ms, ~2027 chars). Linear + Stripe failed bij Apify door `crawlerType: 'playwright:adaptive'` switching-bug. **Verdict: NO-GO als replacement.**

**Probe v2** (zelfde script, tuned config: forced `playwright:firefox` + residential proxy + `htmlTransformer: 'readableText'` + 4096MB + 4 hard URLs toegevoegd):
Beide 10/11 (91%) success maar **complementaire failure-modes**:
- Current faalt op Snowflake (0 chars) — JS-heavy SPA, geen browser-runtime
- Apify faalt op Stripe (138 chars) — `readableText` extractor te aggressief op visual-heavy landings

Apify wint duidelijk waar het ertoe doet: Linear +7045, Salesforce +3069, Snowflake APIFY-UNLOCKS. Op normale SaaS-landings is current ~4-7× méér content (deels door 8000-char cap in current die "winnaar" maskeert).

**Probe v3** (`apify-hybrid-render.ts`, 4 hard URLs, Apify als rendering-only + cheerio-extractie):
Hybrid-arm faalde door tooling-bug (`saveHtmlToFile: true` populeert `htmlUrl` niet zoals verwacht). Side-result wel waardevol: Apify-direct (b) bevestigt patroon — wint op JS-render cases, verliest op visual landings.

**Stripe-debug** (`apify-stripe-debug.ts`): Apify zag pagina correct (title+description perfect ge-extract in `metadata`), maar `readableText` extract slechts 104 chars omdat Stripe's homepage genuinely sparse aan body-text is. Niet een Apify-bug.

### Architectuur-verdict

**Apify als simpele fallback** in refresh-route — geen hybride render-extractor complexiteit nodig:

```
try scrapeProductUrl(url)
  if bodyText < 500 chars OR throw → try Apify-direct
    if still < 500 chars → fallback Gemini (huidige laatste-redmiddel)
```

**Cost-projectie**: ~10% van competitors faalt op current → ~10 Apify-calls × ~$0.002 × 100 competitors × 4 refreshes/maand = **~$0.80/maand**. Triviaal.

**Latency**: alleen het ~10% fail-pad krijgt +30s. Voor weekly cron-refreshes onzichtbaar; voor interactive refresh ziet user alleen wachttijd op problematische sites.

**Implementatie-task**: `tasks/competitor-scraping-apify-fallback.md` — ~1d werk (apify-client wrapper + refresh-route 3-step chain + smoke).

---

## BRONNEN

- [Apify pricing](https://apify.com/pricing) — plan-tiers + CU-rates
- [apify-client npm](https://www.npmjs.com/package/apify-client) — SDK docs
- [Website Content Crawler](https://apify.com/apify/website-content-crawler) — use-case A pricing
- [Google News Scraper](https://apify.com/andok/google-news-scraper) — use-case B pay-per-result
- [LinkedIn Company Page Scraper](https://apify.com/scrapio/linkedin-company-page-scraper) — use-case C TOS-disclaimer + fields
- [RSS Feed Reader](https://apify.com/automation-lab/rss-feed-reader) — use-case D batch-pricing
- [Screenshot URL](https://apify.com/apify/screenshot-url) — use-case E official actor
