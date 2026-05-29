# Content-flow analyse — Website

> **Status**: ingevuld 2026-05-29 · sub-sprint **#7.A** · methode: code-audit
> **Types (5, "Website & Landing Pages")**: `landing-page` · `product-page` · `faq-page` · `comparison-page` · `microsite`
> Bron: `deliverable-types.ts:738-795` · template-registry `prompt-templates/website.ts`

## 1. Pipeline-doorloop — category-specific checkpoints

- **SEO-pipeline is exclusief voor website.** Conditie: `WEBSITE_DELIVERABLE_TYPES.has(deliverableTypeId)` **én** `seoInput.primaryKeyword` → dynamisch geladen `runSeoPipeline()` (`canvas-orchestrator.ts:337-343`). Volledig alternatief pad (keyword-research → SEO-content) dat de angle-based dual-call vervangt.
- Zonder `primaryKeyword` valt website terug op het standaard pad.
- Geen Plan-and-Solve (long-form-only), ondanks dat lange website-types daar baat bij zouden hebben — §6.
- `validateFidelityComposite` (`checkpoint-gates.ts:295`) relevant door hoge woord-ranges (faq/comparison/microsite).

## 2. Prompt-quality

- **Bestand**: `src/lib/studio/prompt-templates/website.ts` — 511 regels, `PROMPT_VERSION 1.2.0`.
- **4 van de 5 types hebben een dedicated template**: `landing-page`, `product-page`, `faq-page`, `comparison-page`. → **`microsite` heeft GEEN template** en valt terug op de generieke prompt (`index.ts:56-74`).
- **Few-shot**: ≈10 example-referenties (≈2-3 per getemplate type) — goede dekking.
- Gedeelde helper `buildWebsiteUserPrompt`. **Twee generatiepaden** (standaard + SEO) → meest pad-complexe categorie naast long-form.

## 3. Output-format (geverifieerd)

Alle 5: Text + HTML (`deliverable-types.ts:738-795`). HTML-first met structuur (secties, TOC voor faq/comparison). Geen PDF.

## 4. Asset-pattern

- **Hero + inline**: `landing-page`, `product-page`, `microsite`.
- **No-asset**: `faq-page`, `comparison-page` (tekst/tabel-gedreven).

## 5. Recente gotchas (categorie-relevant)

- **2026-04-18 — URL input rejected bare hostnames** (`gotchas.md:140-142`). Raakt elke plek waar een website-URL wordt ingevoerd (scanner, landing-flows).
- **2026-04-17 — Brandstyle scraper kleur/font-extractie inaccuraat** (`gotchas.md:117-134`). Indirect: website-content erft brand-tokens; foute tokens → off-brand pages.

## 6. Friction-points

- **`microsite` draait generiek** — terwijl het de breedste/langste website-type is (campagne-microsite, 500-5000w).
- **Brand-fidelity gap op landing-page (Step 2)**: bekende gap dat de landing-page generate-flow de FidelityScoreBar miste (web-page-builder worktree). Verifieer of dit op `main` ook speelt. *Te verifiëren.*
- **Plan-and-Solve niet beschikbaar** voor lange website-types (faq/comparison/microsite 3000-5000w) terwijl pillar-page dat wél krijgt → asymmetrie.
- **SEO-pad vs standaard-pad**: dubbele test-oppervlakte; goldens dekken vermoedelijk alleen standaard-pad. *pending Ronde 1.*

## 7. Verbeter-aanbevelingen

1. **Template voor `microsite`** schrijven (nu generiek). → ticket CF-1.
2. **Plan-and-Solve openstellen voor lange website-types** via `LONG_OUTPUT_TYPES`-set. → ticket CF-3 (ADR-waardig).
3. **SEO-pad golden-set** apart opnemen zodat beide website-paden regressie-getest zijn.
4. **Brand-fidelity wiring op landing-page Step 2 verifiëren** op `main`. → ticket CF-9.

## 8. Cross-type patterns / DRY

- Getemplate types delen `buildWebsiteUserPrompt`.
- Cross-categorie overlap: `pillar-page` (long-form) en `microsite`/`landing-page` delen long-output structuurbehoefte maar verschillende paden (Plan-and-Solve vs SEO) → kandidaat gedeelde "long-output" capability. Synthesis §E.

## Referenties (file:line)

- `canvas-orchestrator.ts:175`, `:337-343` (SEO-pipeline), `:396/:401` (Plan-and-Solve, niet beschikbaar hier)
- `src/lib/studio/prompt-templates/website.ts` (511r, v1.2.0; templates: landing-page/product-page/faq-page/comparison-page — microsite ontbreekt)
- `src/lib/ai/seo-pipeline.ts` + `seo-pipeline.types.ts` (`WEBSITE_DELIVERABLE_TYPES`)
- `checkpoint-gates.ts:295`
- `deliverable-types.ts:738-795`
- `gotchas.md:140-142`, `:117-134`
