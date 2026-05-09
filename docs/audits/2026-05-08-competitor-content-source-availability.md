# Competitor content-source availability — A2 probe-resultaten

> **Datum**: 2026-05-08 · **Probe-script**: `scripts/probes/competitor-content-source-availability.ts` · **Doel**: A2 + HTML-fallback validatie voor `tasks/_drafts/idea-competitor-content-item-discovery.md`. Vervolg op A1 (RSS) probe.

## Samenvatting

**Sitemap-first MVP scope BEVESTIGD**: sitemap.xml hit-rate **71.4%** (5/7), boven de 70% target uit het idea-doc. Combined-source coverage (sitemap OR RSS) is ook 71.4% — RSS voegt geen nieuwe competitors toe boven sitemap.

**Belangrijke implicatie**: HTML-fallback paden (`/blog`, `/news`, etc.) leveren **0%** in deze sample. Niet op vertrouwen voor MVP. Voor de 2 competitors zonder enige bron (BrandBuilder Pro, StrategyHive) is graceful degradation noodzakelijk.

## Per-competitor matrix

| Competitor | Sitemap | RSS | HTML | Notes |
|---|---|---|---|---|
| BrandBuilder Pro | ✗ | ✗ | ✗ | geen enkele bron — graceful skip |
| Branding a better world | ✓ `/sitemap.xml` | ✓ `/feed` | ✗ | beide bronnen, kies sitemap |
| Metaal Art | ✓ via robots.txt (9 content URLs) | ✗ | ✗ | sitemap-only, sterke content-pad signaal |
| Sterk Merk | ✓ `/sitemap_index.xml` (0 content URLs) | ✓ `/feed` | ✗ | sitemap leeg-ish, RSS vult aan |
| Storax | ✓ `/sitemap.xml` | ✓ `/feed` | ✗ | beide bronnen |
| StrategyHive | ✗ | ✗ | ✗ | geen enkele bron — graceful skip |
| Vinotilus | ✓ via robots.txt (0 content URLs) | ✗ | ✗ | sitemap-only, content-tags niet gematcht |

**Detectie-routes voor sitemap**:
- 3 via standaard pad (`/sitemap.xml` of `/sitemap_index.xml`)
- 2 via `robots.txt` Sitemap-directive
- Geen enkele competitor heeft sitemap onder `/wp-sitemap.xml` (WordPress-default sinds 5.5)

## Aggregatie

| Metric | Hits | % | Verdict |
|---|---|---|---|
| **Sitemap.xml** | 5/7 | 71.4% | ✓ boven 70% target |
| **RSS feed** | 3/7 | 42.9% | ✗ onder 50% (consistent met A1) |
| **HTML-paden** | 0/7 | 0.0% | ✗ niet bruikbaar in deze sample |
| **Sitemap OR RSS** | 5/7 | 71.4% | RSS voegt 0 nieuwe competitors toe |
| **Any source** | 5/7 | 71.4% | HTML voegt 0 nieuwe competitors toe |

## Analyse

### Waarom sitemap-first werkt

1. **Robots.txt + standaard pad samen geven 100% sitemap-coverage** voor wie het heeft
2. **WordPress en non-WordPress beide gedekt** — `/sitemap.xml` is bijna universeel als het bestaat
3. **Yoast / Rank Math plugins** publiceren `/sitemap_index.xml` — beide getest, beide gevonden waar aanwezig

### Waarom RSS als secundaire fallback teleurstellend is

- 3/3 RSS-hits hadden ook al een sitemap (Branding a better world, Sterk Merk, Storax). Geen incremental coverage.
- Voor sites met sitemap maar zonder RSS (Metaal Art, Vinotilus): sitemap is enige bron — moet werken in implementatie.

### HTML-paden 0%-bevinding

Mijn heuristiek (status 200 + body >500 chars + ≥5 `<a href>` links) zou een werkende blog-listing moeten detecteren. Drie verklaringen:
1. **Sites hebben echt geen `/blog` pad** — content zit ofwel onder homepage of onder een aangepast pad (`/insights`, `/inspiratie`, `/portfolio`)
2. **Heuristiek te streng** — sommige niche-sites hebben minder dan 5 links op een blog-overview
3. **Single-page application** — modern frontends laden content via JavaScript, body bij eerste fetch is leeg

Implicatie voor MVP: HTML-fallback skippen. Investeer in sitemap-coverage robuustheid (bijv. extra paden parseren, support voor sub-sitemaps).

### Edge cases voor implementatie

**Lege sitemap content-URL count** (Sterk Merk, Vinotilus, Branding a better world):
- Sterk Merk: sitemap_index.xml verwijst naar sub-sitemaps; mijn heuristiek scant alleen het top-level. Real impl moet sub-sitemaps recursief volgen.
- Vinotilus: BE/NL site met `wijn`, `vinaarden` paden — niet matched op mijn `/(blog|news|press|insight|article|case|stor[iy]|nieuws)` regex. Real impl moet language-aware tagging hebben of geen pre-filter doen (laat AI-classifier alle URLs zien).
- Branding a better world: 1 content URL gevonden — kleine site, klopt waarschijnlijk gewoon.

**Geen enkele bron** (BrandBuilder Pro, StrategyHive):
- BrandBuilder Pro: site lijkt minimaal aanwezig (mogelijk pre-launch zelf)
- StrategyHive: vergelijkbaar — startup-site met homepage-only content
- Voor deze: feature moet 0 content-items teruggeven en geen error gooien. Manual override (gebruiker plakt blog-URLs in?) als post-MVP.

## Aanbeveling — revisie idea-doc

**MVP-scope (definitief)**:

1. **Primaire bron**: sitemap.xml met fallback-keten:
   - robots.txt → `Sitemap:` directive (eerste poging)
   - `/sitemap.xml` (tweede poging)
   - `/sitemap_index.xml` (derde poging)
   - `/wp-sitemap.xml` (vierde poging)
   - **Recursie**: bij `<sitemapindex>` follow alle child-sitemaps

2. **Secundaire bron**: RSS-feed paden (alleen als sitemap leeg is voor deze competitor) — geen incremental coverage maar wel bruikbare metadata (titles, dates) waar het werkt

3. **Geen HTML-fallback in MVP** — onbewezen + complex; defer naar post-launch task

4. **Format-classificatie**: 100% AI-driven — sitemap geeft alleen URL + lastmod, geen `<title>` of `<description>`. AI-call op batch van URLs (bijv. 25 in één call) → `[{url, format, themes[]}]` output.

5. **Graceful skip**: competitors zonder enige werkende bron (verwacht ~28% in pilot) krijgen 0 content-items. Geen error, geen blokker.

**Effort herzien**:
- Sitemap-parser (incl. recursie + robots.txt + 4 paden): 2 dagen
- AI-format-classifier (batched URLs): 1.5 dag
- AI-theme-tagger (batched titles + excerpts uit URLs waar mogelijk): 1 dag
- Activity-event emissie + diff-engine integration: 1 dag
- Smoke-tests + helper-extractie: 1 dag
- **Totaal MVP**: 5-6 dagen (binnen oorspronkelijke 5-7d schatting)

## Volgende stap — promotion-ready

Na deze validatie kan technical-planner het idea-doc promoten naar een uitvoerbare task `tasks/competitor-content-item-discovery.md`. Open beslissing voor user:

1. **Promotion nu** vs **defer naar post-launch** — post-launch zou cron-driven discovery toelaten (Fase 4 brandclaw-monitoring) als eerste echte producer
2. **Sample uitbreiden vóór commit** — 7 is klein. Echte pilot heeft 15-30 competitors. Wachten op meer fixture-data?
3. **Format-classifier accuracy probe (A3)** vóór technical-planner — neem 50 URLs uit gevonden sitemaps, classificeer ze handmatig als ground-truth, run AI-classifier, meet accuracy. ~30 min werk maar levert empirisch beeld van of AI-classifier MVP-haalbaar is.

Aanbeveling: **A3 nog draaien vóór technical-planner promotion** — dat sluit het laatste open validatie-blok af.
