---
id: website-page-types-w2-w3
title: Page-types W2 (product-page volwaardig + Product-koppeling) + W3 (FAQ-page volwaardig)
fase: pre-launch
priority: now
effort: ~5-7 dagen (plan W2 3-4d + W3 2-3d)
owner: claude-code
status: done — gemerged via #329 (2026-06-16)
created: 2026-06-12
completed: -
related-spec: docs/specs/website-page-types-implementatieplan.md
worktree: branddock-feat-page-types
depends-on: website-page-types-w0-w1 (schema's + builders + dispatch)
---

# Probleem

Na W1 genereren faq/product/microsite type-eigen, maar twee gaten blijven:
- **Product-page is niet aan een echt Product gekoppeld** (user-eis: "altijd gekoppeld aan de product/services sectie"). De generator krijgt geen productnaam/features/benefits/prijzen/beelden mee → verzint product-details. Layer 7 leest alleen CampaignKnowledgeAsset (0/53 campagnes gevuld) en haalt geen ProductImages op.
- **Geen SEO/AEO-structuur**: geen Product/Service/FAQPage JSON-LD op de publieke `/p/[slug]`.
- **Rendering**: specs renderen als bullet-lijst i.p.v. tabel; FAQ-pagina mist categorie-sprongnavigatie.

# Voorstel (W2 = product-koppeling + render + SEO; W3 = FAQ-restpunten)

W3 is grotendeels al in W1 gebouwd (PopularQuestions, categorie-koppen, escape-hatch, anti-fabricage prompt-regels, feature-images-uit). Resterend W3: categorie-ankernavigatie + FAQPage JSON-LD.

# Acceptatiecriteria

**W2 — Product-koppeling (kern)**
- [x] `product-select` veldtype + `productId`-veld (required, aiDerivable) op product-page; `productSpecs` van required→optioneel (product-record levert specs nu)
- [x] ContentTypeInputFields rendert product-select als dropdown (`ProductSelectField`, GET /api/products, loading/error/lege-staat)
- [x] Layer 7 settings-first: `settings.contentTypeInputs.productId` (workspace-gevalideerd in de findMany-where) → fallback CampaignKnowledgeAsset; ProductImage-fetch (sortOrder); `images[]` (`ProductImageContext`) op ProductContext
- [x] variant-generator `product?`-param + `buildProductBlock` in user-prompt (feature→benefit-zip + use-cases + pageFlavor-hint + hard anti-hallucinatie-mandaat); alleen voor `contentType === 'product-page'`
- [x] `product-images.ts`: `assignProductImagesToVariant` (HERO/SCREENSHOT→hero, FEATURE/DETAIL/LIFESTYLE/…→features op sortOrder), vóór brand-images; toegepast in de product-page builder + briefIncomplete-gate accepteert productId
- [x] generate-structured-variant route: product (settings-first uit ctx.products) doorgeven + server-guard 400 "Koppel eerst een product" bij product-page zonder product
- [x] productId uit formatContentTypeInputs (skip `product-select`-type → geen cuid-leak); client builtPrompt skipt productId al (W1)

**W2 — Render + SEO**
- [x] SpecTable Puck-component (native 2-koloms tabel, zebra-rijen, contrast-clamp, band-ritmiek) i.p.v. markdown-bullet-specs
- [x] pageFlavor-preset (saas/physical/service) afgeleid uit category+pricingModel → nadruk-hint in productblok
- [x] Product/Service JSON-LD op /p/[slug] (`page-json-ld.ts`, shape-dispatch; offers alleen bij parsebare EUR-prijs; Service+provider bij dienst-flavor)

**W3 — FAQ-restpunten**
- [x] Categorie-ankernavigatie op de FAQ-pagina (BrandNav-jump-nav bij ≥2 categorieën, gededupliceerde slugs, `anchorId` + scrollMarginTop op FAQ-secties)
- [x] FAQPage JSON-LD op /p/[slug] (alle popular + categorie-Q&A's als Question/Answer)

**Gates**
- [x] tsc 0; eslint 0 errors (alleen pre-existing warnings); smoke:page-types 64+50 groen; prompt-contracts 235/235; web-page-builder 1443/0; lp-text-quality 50/50; lp-variant-golden 12/12
- [x] Pre-existing, niet-W2/W3-gerelateerde rode smokes gedocumenteerd: image-content-coupling (CTA-in-lifestyle-chip, builder neemt CTA daar nooit mee — mijn enige diff is `images: []`-fixture) + structured-tweaks (flaky live carousel-generatie 4/5 slide-titels). Beide buiten gate-set.

# Niet doen / defer

- Wizard `productIds`-bijvangst (plan §2.3 stap 8): vereist wizard-frontend product-picker; primaire koppeling loopt via de Canvas product-select dropdown (settings-first) → werkt zonder. Gedefferd + gedocumenteerd.
- remark-gfm dependency (geen autonome dep-install) → SpecTable-component i.p.v. GFM-tabel.
- ProductImage-mirroring scrape-URLs → /uploads (beslispunt 5): publish-hardening, los traject.
- Pricing-datamodel `price`/`priceCurrency` migratie (beslispunt 3): JSON-LD offers alleen bij parsebare prijs uit pricingDetails.
- comparison-page (buiten page-types-scope).

# Notes

**Uitvoering 2026-06-12 (solo main-loop).** W2 + W3-restpunten volledig gebouwd; ongecommit in worktree `branddock-feat-page-types` (naast W0-W1).

**Architectuurkeuzes:**
- **Settings-first product-koppeling**: Layer 7 leest `settings.contentTypeInputs.productId` (uit de nieuwe product-select dropdown) vóór de CampaignKnowledgeAsset-fallback. workspaceId in de `product.findMany`-where filtert een cross-tenant/stale id defensief weg. Geen schema-migratie (spiegelt het `targetPersonas`-patroon).
- **Productblok type-gated**: alleen `contentType === 'product-page'` rendert het GEKOPPELD-PRODUCT-blok; andere types negeren een (per ongeluk) meegegeven product → prompt onveranderd.
- **Beeld-chokepoint**: voor product-page is het LP-beeld-blok in handleChooseVariant al ge-skipt (W1); de échte chokepoint is de builder, die nu `assignProductImagesToVariant(ctx.products[0].images)` vóór de brand-image-fallback draait. Productfoto wint dus van merkbeeld.
- **SpecTable i.p.v. remark-gfm**: remark-gfm is geen dependency (geen autonome dep-install) → native 2-koloms component (W2-scoped) i.p.v. een GFM-markdown-tabel. SpecTable + `anchorId` op FAQ toegevoegd als additieve puck-config-props (bandTone-precedent).
- **JSON-LD shape-dispatch**: `page-json-ld.ts` discrimineert op variant-shape (popularQuestions→FAQPage, solution→Product/Service); LP/microsite → null. Op /p/[slug] gevalideerd tegen het type-schema vóór injectie (fail-soft).

**Stale gate-asserts bijgewerkt (bewuste W2/W3-gedragsveranderingen):**
- `page-types-w1.ts`: faq-sectie-volgorde krijgt BrandNav-prefix (≥2 cat); specs → SpecTable i.p.v. RichText-bullets; faq-dispatch-test.
- `web-page-builder-phase2.ts`: component-count 12→13 (SpecTable).

**Gedefferd / niet gedaan (gedocumenteerd):**
- Wizard `productIds`-bijvangst (§2.3 stap 8): vereist wizard-frontend product-picker; primaire koppeling via Canvas-dropdown werkt zonder. De wizard heeft geen `productIds`-veld.
- ProductImage-mirroring scrape-URLs → /uploads (beslispunt 5): publish-hardening, los traject.
- Pricing-migratie `price`/`priceCurrency` (beslispunt 3): JSON-LD offers parset nu een EUR-bedrag uit pricing.body.
- comparison-page: buiten page-types-scope.

**Open voor browser-verificatie**: end-to-end product-page (product kiezen → genereren → SpecTable + productfoto's → publish → JSON-LD in page-source) en faq-jump-nav-scroll. Code-paden zijn smoke-gedekt, nog niet in de browser gezien.
