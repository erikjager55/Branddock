# Competitor RSS hit-rate probe — resultaten

> **Datum**: 2026-05-08 · **Probe-script**: `scripts/probes/competitor-rss-hit-rate.ts` · **Doel**: A1-aanname validatie uit `tasks/_drafts/idea-competitor-content-item-discovery.md`

## Samenvatting

**Hit-rate: 42.9% (3 van 7 ANALYZED competitors)** — onder de 50% threshold uit het idea-doc. **Scope-cut nodig**: van RSS-first naar sitemap-first variant met RSS als fallback.

## Per-competitor resultaten

| Competitor | URL | RSS gevonden | Pad |
|---|---|---|---|
| BrandBuilder Pro | brandbuilder.pro | ✗ | none |
| Branding a better world | brandingabetterworld.com | ✓ | `/feed` |
| Metaal Art | www.metaal-art.nl | ✗ | none |
| Sterk Merk | sterkmerk.online | ✓ | `/feed` |
| Storax | www.storax.nl | ✓ | `/feed` |
| StrategyHive | strategyhive.io | ✗ | none |
| Vinotilus | www.vinotilus.be | ✗ | none |

**Detectie-bron**: 3 hits via standaard URL-pad (`/feed`), 0 hits via `<link rel="alternate">` parsing op homepage.

## Analyse

### Waarom RSS-first niet haalbaar is

1. **3 hits zijn allemaal WordPress-sites** — `/feed` is een standaard WordPress endpoint. Sterk Merk, Storax en Branding a better world draaien duidelijk op WordPress.
2. **Niet-WordPress sites hebben geen RSS** — moderne SaaS / tech-sites (StrategyHive, BrandBuilder Pro) en custom-built sites (Metaal Art, Vinotilus) publiceren geen RSS.
3. **Homepage-link parsing voegt 0% toe** — geen van de 4 misses heeft een `<link rel="alternate" type="application/rss+xml">` in hun HTML head.

### Sample-beperkingen

- **n = 7**: te klein voor statistische zekerheid. Echte pilot heeft mogelijk andere mix.
- **Skewed naar Nederlandse markt**: alle 7 zijn NL/BE bedrijven. Internationale tech-sites (US SaaS) hebben mogelijk andere RSS-adoption-pattern (lagere zelfs — Substack, Medium hebben RSS, custom CMS doorgaans niet).
- **DRAFT-status competitors niet getest**: probe filtert op `status='ANALYZED'`. Echte productie zou ook nieuwe DRAFT-competitors moeten kunnen verwerken.

### Wat dit niet uitsluit

- **Sitemap.xml hit-rate** is niet gemeten in deze probe. Verwachting: ~85% (sitemap is verplicht voor SEO en wordt door bijna alle CMS-platforms gegenereerd). Validatie nodig in vervolg-probe.
- **HTML-fallback hit-rate** — `/blog/`, `/news/`, `/insights/` direct scrapen — niet gemeten. Veel sites hebben deze paden zonder RSS of sitemap.

## Aanbeveling — scope-cut naar sitemap-first variant

**Nieuwe MVP-scope (idea-doc revisie)**:

1. **Primaire bron**: sitemap.xml parsing — verwacht ~85% hit-rate
2. **Secundaire bron** (fallback): RSS-feed paden — bekend werkend voor ~40% (de WordPress-cohort)
3. **Tertiaire bron** (fallback): direct HTML-scrape van `/blog/`, `/news/`, `/case-studies/` paden met content-link extractie

Format-classificatie:
- **Sitemap-pad**: format-detection alleen via URL-pattern (geen `<title>` of `<description>` van RSS); accuracy zal lager liggen → AI-classifier sterker noodzakelijk
- **RSS-pad**: format-detection via combinatie URL-pattern + RSS `<category>` tag

**Vervolg-probe nodig** (A2 + A3 validatie):
- A2: sitemap.xml hit-rate op zelfde 7 competitors
- A3: format-classificatie accuracy op 50-item sample (gemixt RSS + sitemap items)

**Effort-impact**: MVP scope blijft ~5-7 dagen, maar verdeling verandert:
- Sitemap-parser: 2 dagen (was 0)
- RSS-parser: 1 dag (was 2)
- Classifier (AI-fallback verplicht): 2 dagen (was 1)
- HTML-fallback voor laatste 10-15%: 1 dag

## Open beslispunten voor user

1. **Probe uitbreiden vóór commit?** Vervolg-probe op sitemap.xml + HTML-fallback patterns (1u extra). Zou A2+A3 in één keer mee-valideren.
2. **Scope-cut accepteren of project-scope herzien?** Sitemap-first is technisch werkbaar maar MVP wordt iets groter. Alternatief: defer hele content-discovery naar post-launch.
3. **Sample uitbreiden** — kan de pilot scope worden vergroot tot ~15-20 fixture-competitors zodat we statistisch betere data hebben? Vereist dat user meer test-fixtures invoert.

## Volgende stap

**Aanbevolen**: vervolg-probe `scripts/probes/competitor-content-source-availability.ts` die naast RSS ook sitemap.xml + standaard blog-paden test op dezelfde 7 competitors. Levert volledige bron-availability-matrix in één run (~2 min). Daarna idea-doc revisie en pas dan technical-planner promotion.
