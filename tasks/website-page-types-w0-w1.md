---
id: website-page-types-w0-w1
title: Page-types W0 (quick wins + logo-prompt-fixes) + W1 (type-aware structured generatie voor faq/product/microsite)
fase: pre-launch
priority: now
effort: ~4-5 dagen (plan-schatting W0 1d + W1 3-4d; parallel uitgevoerd)
owner: claude-code
status: in-progress
created: 2026-06-12
completed: -
related-adr: -
related-spec: docs/specs/website-page-types-implementatieplan.md
worktree: branddock-feat-page-types
---

# Probleem

Alle 5 Puck-types lopen door de landing-page-generator zonder contentType-besef: een faq-page/product-page/microsite wordt een landingspagina in vermomming, type-eigen contentTypeInputs bereiken de generator niet, en het orchestrate-pad genereert er nutteloos (en duur) naast. Daarnaast: gegenereerde beelden tonen pseudo-logo's (drie getraceerde triggers, waarvan `Brand: ${brandName}` in de prompt de grootste), de microsite-template rendert zijn inhoud dubbel, en de templates bevatten merk-vreemde placeholders ("Branddock heeft onze launch-snelheid verdubbeld") die op klantpagina's kunnen lekken.

# Voorstel

**W0 (quick wins)**: logo L-Fase 1 (prompt-laag, gedeelde builders zodat alle types de guards erven), microsite double-render-fix, type-eigen inputs → builtPrompt, briefIncomplete-gate per type, placeholders neutraliseren. **W1 (architectuur)**: per-type Zod-schema's (FaqPage/ProductPage/MicrositeVariantContent) + contentType-dispatch in de variant-generator + per-type `buildXFromStructured`-builders + per-type flatten/fidelity + route/Step2-doorvoer + orchestrate-dubbelpad-gate + smoke-uitbreiding. Conform plan §1 Optie A en §6.

# Acceptatiecriteria

**W0**
- [x] `Brand: ${brandName}` weg uit beide LP-image-prompt-builders; onconditionele no-text/no-logo-guard op het hero-pad; aangescherpte unbranded-regel op het feature-pad; `logos`/`brand logos`/`fictional brand marks` in DEFAULT_NEGATIVE_SEGMENTS; unbranded-regel in het imageBrief-contract
- [x] Microsite-template rendert de inhoud niet meer dubbel
- [x] topQuestions/featureBenefitMap/productSpecs/pricingInfo/narrativeFlow/micrositePages bereiken de generator via builtPrompt
- [x] briefIncomplete-gate per type: faq accepteert topQuestions óf objective; microsite narrativeFlow óf objective
- [x] Geen merk-vreemde placeholders meer in template-helpers: Branddock-testimonial weg, verzonnen prijzen → "€ —", verkoopbaar klinkende fallback-copy → herkenbare "vervang met echte content"-placeholders (anti-fabricage-comment toegevoegd)

**W1**
- [x] Drie nieuwe Zod-schema's conform plan §2.1/§3/§4 (`page-type-schemas.ts`); comparison-page blijft op LP-schema (buiten scope)
- [x] variant-generator dispatcht op contentType: per-type system-prompt + schema; landing-page-gedrag byte-compatibel (`buildSharedStyleBlocks`-extractie byte-identiek; default → LP overal)
- [x] Per-type builder mapt structured → Puck-tree met BESTAANDE componenten; microsite rendert hoofdstukken als gescheiden secties met `anchorId`-ankers (RichText/BrandCTA kregen optionele anchorId-prop, BrandNav levert de ankernavigatie; FAQ kreeg optionele heading-prop; BrandHero skipt CTA bij lege label)
- [x] Fidelity werkt per type: `flattenPageVariantToText` shape-dispatch + word-targets herijkt (product 750 / faq 800); tell-rewrite + silent-iterate + auto-iterate degraderen expliciet (gate + structured warn + 422)
- [x] generate-structured-variant route accepteert/valideert per type; hero/feature-image-gedrag type-bewust: eigen-schema-shapes slaan het hele LP-beeld-blok over in handleChooseVariant (builders vullen brandImages zelf); edit-panel/auto-iterate/ImageSourcePanel ge-gate
- [x] Orchestrate-dubbelpad voor PUCK-types gegate: server-side benigne SSE-complete-skip in orchestrate-route (geen error-banner bij Step 1 "Doorgaan"/derive-auto-trigger; legacy variant-groups blijven leesbaar)
- [x] `smoke:prompt-contracts` 235/235; `smoke:page-types` (nieuw) 64/64; tsc 0; eslint 0 nieuwe issues; web-page-builder-suite 0 FAIL; lp-text-quality 50/50; lp-variant-golden 12/12

# Bestanden die ik aanraak (ownership per cluster — fase 1 en 2 zijn sequentieel)

**Fase 1 (parallel):**
- **A (logo)**: `src/features/campaigns/lib/landing-page-visual-prompts.ts`, `src/lib/landing-pages/feature-visual-prompts.ts`, `src/lib/ai/image-quality/negative-prompts.ts`
- **B (microsite-fix)**: `puck-templates/microsite.ts`
- **C (inputs+gate)**: `LandingPageGenerateBlock.tsx`
- **D (placeholders)**: `puck-templates/template-helpers.ts`
- **S1 (schema-fundament)**: nieuw `src/lib/landing-pages/page-type-schemas.ts` (+ re-exports in variant-schema.ts indien passend)

**Fase 2 (parallel, na S1):**
- **S2 (generator)**: `src/lib/landing-pages/variant-generator.ts`
- **S3 (builders)**: nieuw `puck-templates/faq-page-from-structured.ts` + `product-page-from-structured.ts` + `microsite-from-structured.ts`, dispatch in `variant-to-puck-data.ts`
- **S4 (fidelity)**: flatten + fidelity-runner word-targets + `variant-tell-rewrite.ts`-compat
- **S5 (route/flow)**: `generate-structured-variant/route.ts`, `LandingPageGenerateBlock.tsx` (2e beurt, sequentieel), orchestrate-gate (Step1Context of orchestrate-route — kleinste veilige optie)
- **S6 (smokes)**: `scripts/smoke-tests/prompt-contracts.ts` of nieuw fixture-script + package.json scripts-regel

# Bestanden die ik NIET aanraak

- Nieuwe Puck-componenten (AnchorNav/SpecTable/StoryChapter etc.) — W2-W4
- Product-koppeling-wiring (Layer 7, product-select, product-images) — W2
- FAQPage/Product JSON-LD op /p/[slug] — W3/W2
- comparison-page — buiten scope (blijft LP-schema)

# Smoke test plan

1. tsc + eslint op gewijzigde files
2. Schema-fixtures: per type een valide + invalide fixture door de Zod-parse (deterministisch script)
3. `smoke:prompt-contracts` blijft groen + uitbreiding
4. Bestaande suites: web-page-builder + lp-text-quality
5. 2-subagent review-pass over de volledige diff

# Risico's

- **LP-regressie**: het landing-page-pad is productie-kritiek — dispatch moet default-gedrag byte-compatibel laten; reviewer checkt expliciet.
- **Fidelity-keten**: tell-rewrite/auto-iterate parsen vandaag LandingPageVariantContent hard — een faq-variant door die paden mag nooit stil corrupte data persisteren.
- **Orchestrate-gate**: Step 1 doet meer dan tekst (visuals e.d.) — gate alleen de tekst-generatie/dubbelpad, verifieer dat de rest van Step 1 intact blijft.

# Out of scope

W2-W5 (zie plan §6), beslispunten 2-5 (social-proof-bron, price-veld, logo-overlay, image-mirroring).

# Notes

- Plan: `docs/specs/website-page-types-implementatieplan.md` (meegekopieerd naar deze branch). Onderzoeksbasis: 9 agent-rapporten 2026-06-11.
- **Uitvoering 2026-06-12 (solo main-loop — weekly subagent-limit tot 14 jun)**: W0 A/B/C/D + W1 S1-S6 volledig gebouwd.
- **Architectuurkeuzes**:
  - Dispatch overal op **shape** (heroManifest/popularQuestions/solution-discriminatoren) i.p.v. contentType waar runtime-data binnenkomt — legacy LP-shaped variants op faq/microsite-deliverables (van vóór W1) blijven op het LP-pad werken. `isLandingPageVariant()` type-guard in page-type-schemas.ts.
  - puck-config kreeg 4 additieve props zonder Puck-field (bandTone-precedent): `RichTextProps.anchorId`, `SpikeBrandCtaProps.anchorId`, `FAQProps.heading`, + BrandHero CTA-skip bij lege ctaLabel. LP-trees onveranderd (props absent → zelfde render).
  - Gedeelde builder-helpers in `puck-templates/from-structured-shared.ts` (instance/taglineFromSubline/footerInstance/slugifyAnchor) — landing-page-from-structured.ts zelf onaangeraakt.
  - Orchestrate-gate: benigne SSE-`complete` met `{skipped:true, reason:'puck-webpage-type'}` i.p.v. 4xx — de hook zou een 4xx als globale error-banner tonen op het Step 1 "Doorgaan"-pad.
- **Stale smoke-verwachtingen geüpdatet (bewuste W0/W1-gedragsveranderingen)**: phase3 microsite-skelet 7→6 componenten (W0-B double-render-fix), phase32 "bevat brand-name" → geïnverteerd naar "brand-naam NIET in image-prompt" + unbranded-guard-check (W0-A logo-fix), lp-text-quality word-targets product 650→750 + faq 800 (W1-herijking).
- **Em-dash-hygiëne**: alle per-type prompt-literals em-dash-vrij gemaakt (no-priming-contract uit de prompt-audit); LP-regel-15-extensie idem.
- **Bewust W2-W4 gelaten**: AI hero/feature-image-gen voor de 3 nieuwe types (builders vullen wél brandImages), per-type auto-iterate/tell-rewrite, secondaryCta-slot op BrandHero, product-koppeling (Layer 7), inline edit-panel voor eigen-schema-types (bewerken kan in Step 3 Puck-editor), JSON-LD.
- **Open voor browser-verificatie**: end-to-end run per type (Step 1 → Step 2 varianten → keuze → Step 3) — code-paden zijn smoke-gedekt maar nog niet in de browser gezien.
