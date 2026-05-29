---
id: 2026-05-29-brandstyle-analyzer-lp-fidelity
title: Brandstyle-analyzer LP-fidelity werkstroom — color-usage + hero-typography fingerprint + hero-pattern vision-AI + side-by-side judge + user-override surface
status: accepted
date: 2026-05-29
supersedes: -
superseded-by: -
---

# Context

Na MVP Phase 1-6.2 (web-page builder, gemerged target 2026-05-24) bleek uit LINFI-screenshot review 2026-05-26 dat de gegenereerde landing-pages structureel **niet voelden als LINFI** — colors klopten, archetype was correct (RULER), maar het geheel oogde generic. Diepere audit (zie `docs/specs/brandstyle-analyzer-improvement-plan.md` sectie 2) wees op gaps in de scraper → renderer pijplijn: scraped DB-velden (`layoutPrinciples`, `iconographyStyle`, `cornerRadii`, `shadowSystem`) werden geschreven maar nergens geconsumeerd.

`brandstyle-analyzer-improvement-plan.md` (sectie 4) stelde een gestructureerd 4-fase pad voor (A data-extractie, B schema, C BrandTokens v4, D renderer-rewrite, E AI-prompts upgraden) van ~10-11 dagen. Pre-launch capaciteit liet dat plan niet één-op-één toe, maar de LINFI-pijn was reëel. Parallel waren al wel button-scraper-fixes (`efb14497`), framework-class-extensies voor Bricks/Divi/Elementor (`df831143`), en component-extractor accuratesse (`085e8290`) gelandet.

Beslissing nodig: bouwen we het volledige plan, of een gerichte LP-fidelity werkstroom die LINFI-quality oplost zonder schema-bloat?

# Decision

Bouw een **LP-fidelity werkstroom met eigen Fase A-E labelling** die NIET één-op-één matcht met `brandstyle-analyzer-improvement-plan.md` Fase A-E, maar wel LINFI-pijn oplost via een smal-en-diep pad:

1. **LP-fidelity Fase A — color-usage capture** (commit `24105e16`): scraper extraheert per-color een usage-tag (`primary` / `secondary` / `accent` / `background` / `border`) uit waar de kleur in `bodyText` voorkomt. BrandTokens consumeren deze tags zodat een vibrant-saturated brand-color geen full-bleed hero-bg wordt (LINFI-fix `3e29953a`).

2. **LP-fidelity Fase B — hero-typography fingerprint** (commit `b36ca91c`): scraper bewaart h1-color + h1-font-size + h1-letter-spacing uit de source-hero. Hero-renderer consumeert deze direct i.p.v. via archetype-default. Resultaat: LINFI hero typografie matcht source 1-op-1.

3. **LP-fidelity Fase C — hero-pattern detection via vision-AI** (commit `08bc6966`): vision-AI classificeert hero-archetype van source-URL (split-hero / centered-hero / fullbleed-hero / asymmetric-hero / minimal-typographic). BrandTokens.heroPattern dispatcht renderer-variant.

4. **LP-fidelity Fase D — LP-fidelity judge (bron vs gegenereerd side-by-side)** (commits `744ae61f`, `057e4bf7`): nieuwe AI-judge die vergelijkt hero-screenshot van bron-URL met gerenderde LP. Per-dimensie scoring (color-fidelity / typography-fidelity / layout-fidelity / visual-balance). Hero-screenshot persist + API + UI ge-wired.

5. **LP-fidelity Fase E — user-override surface voor color usage-tags** (commit `3ff4122f`): Brandstyle-UI laat user de auto-classified color-usage-tags overschrijven (bv. "deze accent is eigenlijk secondary"). Override-flag `colorUsageOverridden` voorkomt re-classification bij herhaalde scrapes.

**Wat we NIET deden** uit `brandstyle-analyzer-improvement-plan.md`:
- Geen losse `buttonProfile`/`spacingProfile`/`elevationProfile`/`iconographyProfile`/`motionProfile`/`typographyByRole` Json-velden op `BrandStyleguide` (Fase B oorspronkelijk plan)
- Geen BrandTokens v4 sub-shapes voor button/elevation/iconography/sectionRhythm/motion (Fase C oorspronkelijk plan)
- Geen systematische renderer-rewrite voor token-consumption (Fase D oorspronkelijk plan)
- Geen Phase 3 Design Language prompt-promotion (Fase E oorspronkelijk plan)

Het oorspronkelijke plan blijft staan in `docs/specs/brandstyle-analyzer-improvement-plan.md` als gestructureerd verbeterpad voor de toekomst als LP-fidelity werkstroom + LP design-batches 1-8 (zie [[2026-05-29-dts-content-quality]]) onvoldoende blijken op andere pilot-cases.

# Y-statement

In de context van **LINFI-LP-output die generic voelde ondanks correct gescrapede brand-colors + archetype**, facing **keuze tussen volledig 4-fase-plan (10-11 dagen) of gerichte LP-fidelity werkstroom**, I decided **vijf-stappen LP-fidelity werkstroom met eigen Fase A-E labelling die source-hero 1-op-1 reproduceert via color-usage + hero-typography + hero-pattern + side-by-side judge + user-override** to achieve **LINFI-quality binnen 4 dagen i.p.v. 10-11 dagen + onmiddellijke product-impact + behoud van optionaliteit voor volledig plan later**, accepting tradeoff **scraper-→-DB-→-renderer pijplijn is nog niet systematisch geleveld (button/spacing/elevation/iconography/motion blijven archetype-default) — bij niet-LINFI pilot-merken die exotische component-patterns gebruiken kan de output alsnog generic voelen**.

# Consequences

## Positief

- **LINFI-pijn opgelost** — 4 dagen werk i.p.v. 10-11 dagen geprojecteerd plan, met directe user-evidence (LINFI live-verificatie groen)
- **Pattern is generaliseerbaar** — color-usage capture + hero-typography fingerprint werken voor elk merk dat een homepage heeft; geen LINFI-specifieke hardcodes
- **Side-by-side judge geeft objectief signaal** — bron-vs-gegenereerd is een sterker validatie-pattern dan pure F-VAL composite, omdat het directly meet wat de user visueel ervaart
- **User-override surface** voorkomt vendor-lock-in op auto-classificatie — pilot-klanten kunnen scraper-mistakes (bv. een accent als primary gelabeld) corrigeren zonder developer-tussenkomst
- **Backward-compat behouden** — alle nieuwe scraped-velden zijn additive, bestaande workspaces zonder LP-fidelity data vallen terug op archetype-default

## Negatief / tradeoffs

- **Volledig plan blijft open** — als pilot-merken componenten gebruiken die niet via hero-pattern of color-usage geadresseerd worden (bv. specifieke button-styling-philosophy, custom elevation-systemen), moeten we alsnog terug naar `brandstyle-analyzer-improvement-plan.md` Fase A-E
- **AI-cost stijgt** — Fase C hero-pattern vision-AI is een nieuwe Anthropic-vision-call per scrape (~$0.01-0.03), Fase D side-by-side judge per LP-generation (~$0.02-0.04). Op pilot-volume nog acceptabel; op schaal mogelijk een budget-trigger.
- **Twee parallelle fasenamen** — `brandstyle-analyzer-improvement-plan.md` Fase A-E ≠ LP-fidelity werkstroom Fase A-E. Risico op verwarring bij sessie-start; spec-sectie 10 documenteert mapping om dit te mitigeren.
- **Side-by-side judge vereist screenshot-pipeline** — Playwright in serverless + screenshot-storage. Bestaande screenshot-capture infra was deferred (zie memory `branddock-branch-state-2026-05-27`); hero-screenshot persist + API + UI is nu wel gebouwd maar de inrichting blijft een infrastructure-investment.

## Neutraal

- **Geen schema-bloat** — geen losse `buttonProfile`/`spacingProfile`/etc. velden op `BrandStyleguide`; alleen color-usage tags en hero-typography fingerprint zijn toegevoegd. Migratie-pad naar volledig plan blijft schoon (oorspronkelijk plan's Fase B kan additive worden uitgevoerd).
- **LP-fidelity werkstroom Fase A-E pre-dates DTS content-quality C1-C11** — beide vermengd in dezelfde feature-branch maar logisch onafhankelijk (zie [[2026-05-29-dts-content-quality]])

# Alternatives considered

## Volledig plan-uitvoeren (4-fase `brandstyle-analyzer-improvement-plan.md`)

**Voor**:
- Systematisch verbeterpad — buttonProfile/spacingProfile/iconographyProfile worden allemaal first-class data
- BrandTokens v4 met sub-shapes is een schone abstractie voor renderer-consumption
- AI-prompts (Phase 3 Design Language) krijgen gewicht en worden niet meer "non-critical fallback"

**Tegen** (waarom NIET gekozen):
- 10-11 dagen werk voor pre-launch capaciteit was te zwaar — LINFI-pijn was urgent
- Schema-bloat risico: 6 nieuwe Json-velden op BrandStyleguide voor `buttonProfile`/`spacingProfile`/`elevationProfile`/`iconographyProfile`/`motionProfile`/`typographyByRole` zonder dat pilot-data nog bewijst dat al die separaties nodig zijn
- Renderer-rewrite (Fase D) is risicovol — alle 8 Puck-components moeten data-driven worden; één fout in de mapping breekt alle LPs

## Niets doen (accepteer LINFI-quality)

**Voor**:
- Geen scope-uitbreiding voor MVP, focus op browser-smoke + merge

**Tegen** (waarom NIET gekozen):
- LINFI is een visible pilot-target; "het ziet er anders uit dan onze website" is een conversion-killer
- Pre-launch is precies het moment om visuele-quality te corrigeren — post-launch heeft elke fix afwegingen tegen klant-impact

## Eigen brandstyle Phase 4 "designPhilosophy" extra prompt

**Voor**:
- Goedkoop — 1 extra prompt-fase tijdens scrape
- Geen renderer-changes nodig

**Tegen** (waarom NIET gekozen):
- "Beschrijf 1 zin wat dit merk visueel anders maakt" is te abstract om actionable te zijn voor renderers
- Geen verifieerbaar signaal — designPhilosophy als string is pas waardevol als renderers er iets mee doen

# Notes

**Re-evaluation triggers**:

1. **Pilot-merk faalt op LP-fidelity ondanks LINFI-werkstroom**: bouw alsnog `brandstyle-analyzer-improvement-plan.md` Fase A-E. Het plan is bewust intact bewaard in `docs/specs/` voor dit scenario.
2. **AI-cost wordt budget-blocker**: Fase C hero-pattern vision-AI is de duurste. Mitigatie-pad = caching per source-URL + skip-classification voor known-archetype merken.
3. **Side-by-side judge geeft systematisch lage scores**: signaleert dat renderer-data-driven-completeness ontbreekt (terug naar oorspronkelijk plan Fase D).

**Cross-references**:
- Onderliggende ADR: [`2026-05-22-landing-page-builder-architectuur`](./2026-05-22-landing-page-builder-architectuur.md) (MVP Puck-builder; deze ADR is een aanvulling)
- Plan-doc: `docs/specs/brandstyle-analyzer-improvement-plan.md` (referentie voor volledig pad, sectie 10 mappt LP-fidelity commits naar plan-items)
- Sister ADR: [[2026-05-29-fval-vision-judge-dim8]] (vision-judge dim 8 in F-VAL composite)
- Sister ADR: [[2026-05-29-dts-content-quality]] (parallel werkstroom DTS C1-C11)
- Plan execution: `~/.claude/plans/zippy-twirling-feigenbaum.md` Track 2.1
