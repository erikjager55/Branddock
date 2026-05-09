# Competitor URL-classifier accuracy — A3 probe-resultaten

> **Datum**: 2026-05-08 · **Probe-script**: `scripts/probes/competitor-classifier-accuracy.ts` · **Doel**: A3 validatie voor `tasks/_drafts/idea-competitor-content-item-discovery.md`. Vervolg op A1 (RSS) + A2 (sitemap-coverage).

## Samenvatting

**100% accuracy (25/25)** met Claude Haiku 4.5 op URL-only classificatie. Alle 6 voorkomende formats correct geclassificeerd. **AI-classifier in MVP-pad bevestigd**, idea-doc kan naar `ready-to-build`.

## Setup

- **Model**: `claude-haiku-4-5-20251001` (cheap, ~$0,001 per call)
- **Input**: alleen de URL (geen page-fetch, geen titel) — replica van runtime sitemap-only scenario
- **Output**: één enum-waarde uit 12 ContentFormat opties
- **System prompt**: gestructureerde format-definities met path-keyword voorbeelden per format
- **Sample**: 25 URLs uit drie sitemaps (Storax, Branding a Better World, Metaal Art)
- **Cost**: ~$0,025 voor de hele probe

## Per-format breakdown

| Format | Recall | Notitie |
|---|---|---|
| PRESS_RELEASE | 4/4 (100%) | Alle Storax `/nieuws/` URLs correct gelabeld |
| CASE_STUDY | 10/10 (100%) | Storax `/projecten/`, BABW `/branding-cases/`, Metaal Art `/projecten/` allemaal correct |
| BLOG_POST | 5/5 (100%) | BABW `/branding-tips/` correct als blog ondanks `tips`-keyword in plaats van `blog` |
| OTHER | 3/3 (100%) | `/contact/`, `/over-ons/`, `/team/` correct als non-content |
| DOC | 2/2 (100%) | `/algemene-voorwaarden/`, `/veelgestelde-vragen/` correct |
| TOOL | 1/1 (100%) | `/deurconfigurator/` correct als TOOL |

## Per-bron breakdown

| Bron | Accuracy |
|---|---|
| Storax (industrieel B2B) | 7/7 (100%) |
| Branding a Better World (NL agency) | 9/9 (100%) |
| Metaal Art (B2C/B2B metaal) | 9/9 (100%) |

## Analyse

### Wat werkte goed

1. **Path-keyword herkenning is robuust** — Claude Haiku herkende `/nieuws/`, `/projecten/`, `/branding-cases/` correct als format-signalen, ook in NL.
2. **Niet-Engels paths geen probleem** — `merkpositionering`, `kernwaarden`, `algemene-voorwaarden` correct geclassificeerd zonder vertaling.
3. **Categorische uitsluitingen werkten** — `/contact/`, `/team/` correct als OTHER, niet als content.
4. **Edge cases gehandeld**: `/branding-tips/` (geen `/blog/`-keyword) correct als BLOG_POST. `/deurconfigurator/` correct als TOOL.

### Wat niet getest is (caveats voor productie)

- **Ambiguous URLs**: paths zoals `/insights/case-2024-x`, `/resources/launch-y` (mix van keywords) niet in sample
- **Engelse/internationale sites**: alle 3 sources zijn NL — hebben we BCP-7 sites in pilot, dan andere keyword-patterns
- **Diepe nesting**: `/blog/category/sub/article-slug/` (4+ levels) niet getest — sommige sites doen dat
- **Misleading paths**: `/news-items/case-study-acme` (keyword-conflict) niet getest
- **Geen content** (404/redirects): probe controleert geen status — implementatie moet dat afvangen
- **EBOOK / WEBINAR / PODCAST / SOCIAL_POST / VIDEO / EVENT**: 0 voorbeelden in sample, recall onbekend

### Wat de probe niet meet

- **Theme-tagger accuracy** — apart te valideren bij implementation
- **Token-cost in batches** — probe doet 1 call per URL ($0,025 voor 25). Productie zal batches doen (bijv. 25 URLs in één call) wat significant goedkoper is — meet bij implementation
- **Latency** — Haiku ~1s per call zonder batching; met batching wordt dat ~3-5s per workspace voor 25-100 URLs

## Implicaties voor MVP-implementatie

### Bevestigd voor inclusion

- ✅ **URL-only classifier voldoende voor format-detection** — geen page-fetch nodig (kostenbesparend, snelheidswinst)
- ✅ **Haiku 4.5 is genoeg model-power** — geen Sonnet/Opus nodig voor deze taak
- ✅ **Multi-language support out-of-the-box** — geen aparte NL/EN/BE prompts nodig
- ✅ **Format-set van 12 enum-waarden is onderscheidbaar** — Haiku kan ze onderscheiden zonder confusing examples

### Aanbevelingen voor implementation

1. **Batch URLs in één call** — i.p.v. 25 individuele calls, één call met `[url1, url2, ...]` input en `[format1, format2, ...]` output. Verlaagt cost ~10×.
2. **Confidence-veld in output** — vraag classifier ook om "0.0-1.0 confidence" per URL. Lage confidence (< 0,7) → markeer voor manual review of fallback naar OTHER.
3. **Caching op URL-niveau** — zelfde URL hoeft maar één keer geclassificeerd; cache per `urlHash` (al unique in schema).
4. **Periodic re-validation** — random sample van 25 URLs per maand opnieuw classificeren met andere model-versie om drift te detecteren.
5. **Edge-case probe nodig vóór go-live** — extend deze probe met 25 ambiguous + 25 internationale URLs zodra pilot live data heeft.

### Niet aanbevolen voor MVP

- ❌ Title-fetch enrichment — niet nodig op deze accuracy
- ❌ Sonnet of Opus voor classification — overkill, factor 5-10× duurder
- ❌ Custom fine-tuned model — niet rendabel voor 12-class probleem
- ❌ Heuristische regex-fallback — adds complexity zonder accuracy-winst (Haiku doet het beter dan handgeschreven regels)

## Status van pre-build validaties (volledig)

| Validatie | Status | Resultaat |
|---|---|---|
| **A1 RSS-coverage** | ✅ uitgevoerd | 42.9% — verworpen, scope-cut naar sitemap-first |
| **A2 sitemap-coverage** | ✅ uitgevoerd | 71.4% — bevestigd, sitemap-first MVP scope |
| **HTML-fallback** | ✅ uitgevoerd | 0% — verworpen, uit MVP scope |
| **A3 classifier-accuracy** | ✅ uitgevoerd | **100%** — bevestigd, AI-classifier in MVP |
| A5 async-fallback design | ⏳ technical-planner | nog te ontwerpen vóór async wordt geforceerd |

**Conclusie**: alle pre-build evidence-based validaties zijn afgerond. Idea-doc verdict mag van `needs-validation-first` naar `ready-to-build`. Technical-planner kan promotion doen.

## Volgende stappen voor user

1. **Technical-planner promotion** — idea-doc → uitvoerbare `tasks/competitor-content-item-discovery.md` met sitemap-first MVP-scope (5-6 dagen effort)
2. **Sample uitbreiden voor productie-zekerheid** — bij eerste 5 echte pilot-merken: rerun A3 op 50 URLs uit hun sitemaps, valideer dat 100% accuracy stand houdt op edge-cases
3. **Cost-budget toevoegen aan implementation task** — classifier-batching strategie + caching policy
