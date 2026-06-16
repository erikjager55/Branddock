# Website & landing page types — structuuronderzoek + implementatieplan

> **Datum**: 2026-06-11
> **Aanleiding**: de landing-page-basis staat (Puck-builder, structured variants, beeld-pijplijn, fidelity, publish). Volgende stap: **product/service-pagina** (altijd gekoppeld aan een Product uit de knowledge-sectie), **FAQ-pagina** en **campaign-microsite** (lange pagina met ankernavigatie) volwaardig maken. Plus één gemeld defect: **onjuiste logo's op gegenereerde beelden** — of het juiste logo, of geen logo.
> **Methode**: 9 parallelle onderzoekers — 3× codebase (end-to-end staat, Product-koppeling, logo-trace), 3× extern structuuronderzoek, 3× voorbeeldpagina's + teardowns (live-gefetchte sectie-structuren van o.a. Stripe, GitHub, Notion, Linear, Mollie, Wise, IKEA, Patagonia; teardown-bronnen: Baymard, NN/g, CXL, Unbounce, Smashing).
> **Gerelateerd**: prompt-audit Fase 2 gaf faq/comparison/microsite al component-group-contracten (#327); LP feature-image-pipeline #317; library-first matching #323.

---

## 1. Architectonische kernbevinding — eerst dit oplossen

Er bestaan vandaag **twee overlappende generatiepaden** voor de 5 Puck-types:

1. **Structured-pad (Step 2, dominant)**: `Step2ContentVariants` dispatcht ALLE 5 types naar `LandingPageGenerateBlock` → `generate-structured-variant` → `variant-generator`. **De generator heeft geen contentType-parameter** — het schema en de prompt zijn altijd landing-page (hero/trust/problem/features/socialProof/pricing/faq/finalCta). Een faq-page of microsite wordt dus de facto een **landingspagina in vermomming**, en de type-eigen contentTypeInputs (topQuestions, featureBenefitMap, productSpecs, narrativeFlow, micrositePages) **bereiken de generator niet eens** (`LandingPageGenerateBlock.tsx:171-188` stuurt alleen de LP-velden).
2. **Orchestrate-pad (Step 1, dood spoor)**: draait óók voor deze types en produceert de Fase 2-contracten (question-N/answer-N, page-1..5) — maar Step 2 toont die output nooit. Gevolg: **dubbele generatie-kosten én de net gemergde contracten zijn in de hoofd-flow onbereikbaar.**

**Kernbeslissing (aanbevolen: Optie A)** — type-eigen structured generatie met LP-pariteit:
- `contentType`-parameter op `variant-generator` + per-type Zod-schema (`FaqPageVariantContent`, `ProductPageVariantContent`, `MicrositeVariantContent`) + type-aware system-prompt-dispatch;
- per-type `buildXFromStructured`-builder naast `landing-page-from-structured.ts` + dispatch in `variantToPuckDataFromStructured` op `deliverableTypeId`;
- hergebruikt de héle Step 2-UX gratis: variant-A/B-vergelijk, fidelity-score, auto-iterate, hero/feature-beelden, inline edit, publish, Claw #318-tools;
- orchestrate-pad voor PUCK-types daarna gaten (Step1Context of orchestrate-route) — stopt de dubbele kosten.

*Optie B (verworpen): het orchestrate-contract-pad activeren als hoofdroute — goedkoper, maar verliest de complete structured-variant UX waar net vijf werkstromen in zijn geïnvesteerd.*

---

## 2. Product/service-pagina

### 2.1 Structuur (onderzoek + voorbeelden)

Best-in-class voorbeelden (sectie-volgordes **live geobserveerd**): Stripe Billing, GitHub Copilot, Notion Projects, Linear, **Mollie (NL/EU)**; dienst-variant: Siege Media; PDP-contrast: Bellroy, Glossier (Baymard-onderbouwd). De gedeelde arc: **belofte → bewijs → diepte → conversie.**

| # | Sectie | Status | Gevoed door (Product-record) |
|---|---|---|---|
| 1 | Hero: outcome-headline + subhead (vangt grootste bezwaar) + dual CTA (self-serve + sales) + product-visual | verplicht | `name`, `description`, `benefits[0]`, image HERO/SCREENSHOT; `pricingModel` bepaalt CTA-vorm |
| 2 | Trust-bar direct onder hero (logo's/rating + 1 gekwantificeerde metric — patroon GitHub/Mollie) | optioneel, **alleen bij echte bron** | workspace-proof-assets (gap — zie beslispunt) |
| 3 | Probleem → oplossing (2 korte alinea's) | verplicht SaaS/dienst | `useCases[]`, persona-pains via `linkedPersonas` |
| 4 | Feature-benefit-blokken 3-6× (benefit-subhead + uitleg + beeld, alternerend; volgorde = gebruiksvolgorde) | 3 verplicht | paren `benefits[i]`+`features[i]`, FEATURE/DETAIL-images |
| 5 | Use-cases / "voor wie" (cards) | optioneel | `useCases[]`, `linkedPersonas` |
| 6 | Specs (tabel) | conditioneel: fysiek/technisch | spec-achtige `features[]`, `analysisData` |
| 7 | Proces / "zo werken we" (3-5 stappen) | conditioneel: dienst | afgeleid uit `description`+`useCases` |
| 8 | Pricing | conditioneel: `pricingModel/Details` gevuld | `pricingModel`, `pricingDetails` |
| 9 | FAQ-blok (3-4 Q&A, bezwaar-gedreven) | aanbevolen (conversie + AEO) | persona-bezwaren, `pricingDetails` |
| 10 | Final CTA (dubbel: zelf-start + begeleid) | verplicht | `pricingModel` → CTA-paar |

**Eén template, drie presets** via afgeleide `pageFlavor` (saas / physical / service) uit `category`+`pricingModel` — geen drie templates; het required/optional-mechanisme dekt de conditionaliteit. Teardown-data: outcome-headlines + B1-leesniveau converteren significant beter (Unbounce 12,9% vs 2,1%); testimonials verweven ná feature-claims (Notion-patroon) i.p.v. één blok.

### 2.2 Huidige staat (gaps)

Creation-flow + inputs zijn volwaardig; daarna LP-vermomming. Specifiek: (a) featureBenefitMap/productSpecs/pricingInfo bereiken de generator niet; (b) géén group-contract op het orchestrate-pad (Fase 2 sloeg product-page over); (c) puck-template = 6 default-componenten met **merk-vreemde placeholders** ("Branddock heeft onze launch-snelheid verdubbeld" — risico op klantpagina's); (d) geen SpecTable/UseCaseCards/review-componenten; (e) RichText zonder remark-gfm → markdown-tabellen renderen plat.

### 2.3 Product-koppeling (verplicht — "altijd gekoppeld aan products/services")

Empirie (39 producten, 12 workspaces): name/description/category/features/benefits/useCases **100% gevuld** (website-analyzer vult ze structureel), pricing ~60%, **beelden schaars** (34/39 producten 0 images; bestaande zijn hotlink-fragiele scrape-URLs). Vandaag krijgt een product-page-generatie **letterlijk nul productdetail** mee behalve "naam [categorie]" — alle drie de bestaande product-datapaden zijn de facto dood (Layer 7 heeft nog nooit met echte data gevuurd: 0/53 campagnes met product-knowledge-asset).

**Wiring (spiegel van het bewezen `targetPersonas`-patroon — geen schema-migratie):**
1. `content-type-inputs.ts`: nieuw veldtype `product-select`; bij product-page `{ key: 'productId', required: true, aiDerivable: true }`.
2. `ContentTypeInputFields.tsx`: dropdown gevoed door GET /api/products (max ~39/workspace → simpele select).
3. `canvas-context.ts` Layer 7: settings-first (`settings.contentTypeInputs.productId`, workspace-gescoped gevalideerd), fallback CampaignKnowledgeAsset; `ProductContext` + `images[]` (ProductImage-fetch).
4. `variant-generator.ts`: `product?: ProductContext`-param; prompt-blok met naam/description/pricing/feature→benefit-paren/useCases + anti-hallucinatie ("verzin geen features buiten de lijst").
5. `generate-structured-variant` route: product doorgeven + **server-guard** 400 "Koppel eerst een product" bij product-page zonder product.
6. `canvas-orchestrator.ts`: `productId` in de formatContentTypeInputs-skip-set (anders lekt de rauwe cuid de prompt in).
7. Nieuw `product-images.ts`: `assignProductImagesToVariant` (patroon brand-images.ts) — HERO→hero-slot, FEATURE/DETAIL/LIFESTYLE op sortOrder → feature-slots, VÓÓR brand-images op beide chokepoints; library-first #323 blijft vangnet. **Caveat**: scrape-URLs eerst mirroren naar /uploads vóór publish-hardening.
8. Bijvangst-fix `wizard/launch/route.ts`: persisteer wizard-`productIds` als CampaignKnowledgeAsset mét productId (maakt de fallback-laag + suggest-visual-briefing eindelijk levend).

**Niet doen**: Prisma-relatie Deliverable→Product (settings-Json + validatie volgt het bestaande patroon; duplicate/bulk-routes kopiëren settings al mee).

### 2.4 SEO/AEO
JSON-LD `Product` op /p/[slug] (name/description/image/brand; `offers` alleen bij parsebare prijs); **`Service`-schema bij dienst-category** (Product rich results zijn voor diensten niet toegestaan); FAQ-blok dubbel uitgeven (zichtbaar + FAQPage JSON-LD).

---

## 3. FAQ-pagina

### 3.1 Structuur (onderzoek + voorbeelden)

Voorbeelden: Wise, Huel, Magic Spoon, Secretlab, Airbnb, HubSpot, Notion, Rippling, McDonald's UK. **NN/g-waarschuwing serieus genomen**: FAQ-pagina's falen wanneer ze marketing-vragen bevatten i.p.v. echte klantvragen, of content verbergen — vragen moeten in klanttaal, antwoorden vooraan, content altijd in de DOM.

Doel-skelet: **(1)** conversationele hero in merkstem ("We helpen je graag" i.p.v. "FAQ") + optioneel zoekveld (alleen ≥20 vragen); **(2)** PopularQuestions-blok — 3-5 hoogste koop-angst-vragen eerst (Baymard: verzending 39% / levertijd 21% / retour 15%); **(3)** categorie-ankernav (alleen bij ≥2 categorieën; taak-gebaseerde namen, nooit "Algemeen" eerst); **(4)** per categorie 3-5 Q&A's als accordion — antwoord-eerst-formaat (zin 1 beantwoordt volledig, 40-60 woorden, citeerbaar = AEO), antwoorden in de DOM + "Alles uitklappen"; **(5)** contact-escape-hatch ("Staat je vraag er niet bij?") als eigen herbruikbaar blok; **(6)** closing-CTA.

### 3.2 Contract-evolutie (backwards-compatible op Fase 2)

- `question/answer-1..12` (1-4 verplicht zoals nu, 5-12 optioneel; standalone-doel 8-12 vragen).
- Nieuw optioneel `category-1..3` (label ≤40) met vaste chunking (cat-1 = vraag 1-4, etc.) — vermijdt geneste contracten, past in de bestaande extractie.
- Nieuw verplicht `contact-cta` (≤200; `-cta`-suffix vermijdt de 48-char button-clamp, zelfde les als `closing-cta`).
- Prompt-regels: vragen uitsluitend uit brand-context/products/personas; **"verzin geen prijzen, termijnen, garanties of beleid — sla over of verwijs naar contact"**.

### 3.3 Huidige staat (gaps) + SEO/AEO
Step 2-gaps: topQuestions bereikt generator niet; `briefIncomplete`-gate blokkeert (faq heeft geen valueProposition-veld); planner heeft geen faq-extras. Renderer: accordion bestaat en is goed; mist categorie-koppen, escape-hatch-blok en **FAQPage JSON-LD op /p/[slug]** — verkoop dat als AEO-feature (Bing/Perplexity/AI Overviews-citatie), niet als rich-result (Google-snippets zijn verdwenen). Beeld-pijplijn: hero volstaat; 4 feature-images zijn hier ruis → type-bewust uitschakelen.

---

## 4. Campaign-microsite (lange pagina met ankernavigatie)

### 4.1 Structuur (onderzoek + voorbeelden)

Voorbeelden: IKEA Life at Home Report, Patagonia Blue Heart, ARMEDANGELS Impact Report (EU), Apple MacBook Air, Figma Config, Collaborative Fund. Onderscheid met LP: **storytelling-arc + campagne-thema + tijdelijkheid** (einddatum = urgentie-element). Patronen:

1. **ChapterNav** (sticky, scroll-spy): 3-6 sectie-labels (optioneel genummerd 01-04 — maakt de arc expliciet) + persistente CTA rechts; labels = exact de sectiekoppen.
2. **CampaignHero**: full-bleed merkbeeld + these-headline met meetbare claim + 1 primaire CTA — moet zelfstandig de hele campagne communiceren (meerderheid scrollt niet ver).
3. **HighlightCards** direct na de hero: 4-6 kaarten als TL;DR én jump-links (Apple "Get the highlights"-patroon) — bedient de 50-70% die de bodem nooit haalt.
4. **StoryChapter** (herhaalbaar template): chapter-beeld + headline + intro + stat-callout (1-3 cijfers) + quote + 2-3 subblokken alternerend beeld/tekst; **het vaste ritme vervangt animatie** (IKEA herhaalt 4× identiek); ~40% beeld / 60% tekst; 20-60 woorden per blok.
5. **StatCards**: grote cijfers in merkstijl als rustpunt/deelbaar artefact.

### 4.2 Contract-evolutie (de Fase 2 `page-1..5` is semantisch verkeerd voor dit doel)

Het bestaande contract heeft **multi-page-semantiek** ("ONE group per page", "navigation hint to the next page") — op een scroll-pagina slaat dat nergens op en de renderer kan sectie-rollen niet kennen. **Evolueer naar benoemde ankersecties**: `hero-manifest` (req) / `story` (req) / `impact` (opt) / `community` (opt) / `join` (req, altijd laatste; bevat offer + einddatum). Zelfde 3-5-range en caps → de groepen-infra verandert niet, alleen namen + semantiek. PROMPT_VERSION → 3.0.0; **backwards-compat aliases** in variant-to-puck-data (page-1→hero-manifest … laatste→join). Plus optionele groep `nav-labels` (pipe-separated, ≤2 woorden per label; fallback = sectie-H1's). Blueprint-mapping: concept→hero-manifest, strategy→story, fases→impact, proof→community, offer+einddatum→join.

### 4.3 Huidige staat (gaps)

(a) **Double-render-quirk**: `microsite.ts` rendert `defaultRichText(filled)` op regel 26 én 29 — de volledige inhoud staat 2× op de pagina; (b) **anker-infrastructuur ontbreekt volledig**: geen enkel sectie-component rendert een `id`, BrandNav is niet sticky en zit in geen template, StickyCtaBar idem; (c) narrativeFlow/micrositePages/pageSkeleton bereiken de generator niet; (d) chapters bestaan niet als structuur (1 markdown-blob); (e) geen per-chapter beelden.

**AnchorNav-spec** (a11y): max 5 ankers + persistente CTA; scroll-spy via IntersectionObserver met `aria-current`; native `<a href="#id">`; sectie-wrappers `id` + `tabindex="-1"` + `scroll-margin-top`; `scroll-behavior: smooth` alleen binnen `prefers-reduced-motion: no-preference`; mobiel hide-on-scroll-down. Geen scroll-snap, geen parallax, geen WebGL/audio/quiz.

---

## 5. Logo-defect — "of het juiste logo, of geen logo"

**Trace-conclusie**: nergens vráágt een prompt om een logo — het model hallucineert ze (storefronts/bussen/schorten/verpakkingen), versterkt door drie triggers: **(T1)** `Brand: ${brandName}` als laatste prompt-segment op het hero- én feature-pad (primet het model om de naam als pseudo-wordmark te renderen — de grootste hefboom); **(T2)** brand-style-anchors: tot 14 echte merkfoto's als referentie-beelden — die bevatten het échte logo en multi-ref-fusion kopieert het verminkt terug (immuun voor élke prompt-fix); **(T3)** imageBrief-subjects zonder "unbranded"-instructie. Het hero-pad heeft bovendien **geen enkele** no-text/no-logo-guard; de negative-defaults bevatten wel "competitor logos" maar geen kaal "logos". Extern bevestigd: FLUX negeert negative prompts (CFG=1), nano-banana kent alleen "semantic negatives" in proza — prompt-fixes drukken de frequentie fors maar halen nooit 0.

**Alles voor de oplossing bestaat al in de codebase**: `compositeLogoOverlay` (sharp) + `getBrandLogo` + `parseLogoIntent`/`stripLogoMentions` zijn volledig gebouwd maar alleen op het video-scene-pad aangesloten; de vision-judge heeft al een `logo-fidelity`-dimensie die op elke hero-variant scoort (maar niets triggert).

**Gefaseerd:**
- **L-Fase 1 — prompt-laag (~½ dag, lost vermoedelijk 70-80% op)**: schrap `Brand: ${brandName}` uit beide LP-prompt-builders; onconditionele "No text, no logos, no brand marks or lettering on objects/clothing/vehicles/signage — unbranded surfaces"-guard op het hero-pad (+ aanscherping feature-pad); `"logos"/"brand logos"/"fictional brand marks"` in DEFAULT_NEGATIVE_SEGMENTS; "unbranded"-regel in het imageBrief-contract. Bouw dit in de **gedeelde** prompt-builders zodat product/faq/microsite ze gratis erven.
- **L-Fase 2 — detectie + auto-retry (~1 dag)**: feature-pad: één boolean "visible logo/wordmark?" op de bestaande coherence-judge-call → door de bestaande regen-machinerie; hero-pad: acteer op de al-gescoorde `logo-fidelity` (<50 → auto-deselect naar schone variant of één refine-iteratie — de refine-hint bestaat al).
- **L-Fase 3 — het juiste logo (opt-in, ~1-2 dagen)**: bestaande logo-overlay aansluiten op het hero-pad als workspace-toggle (positie-conflict met Puck-tekstoverlay → default top-right; licht/donker-variant op hoek-luminantie via sharp). Plus anchor-curatie: waarschuw bij logo-dominante style-anchors (T2 is anders niet dicht te krijgen).

---

## 6. Implementatieplan (fasen, efforts, afhankelijkheden)

| Fase | Inhoud | Effort | Afhankelijkheid |
|---|---|---|---|
| **W0 — Quick wins + logo prompt-laag** | Logo L-Fase 1 (5 prompt-fixes in gedeelde builders) · microsite double-render-fix · type-eigen contentTypeInputs → builtPrompt doorvoeren · briefIncomplete-gate per type (faq: topQuestions OF objective; microsite: narrativeFlow OF objective) · merk-vreemde placeholders vervangen (template-helpers.ts) | ~1d | geen — direct te doen |
| **W1 — Type-aware structured generatie (de architectuur-fase)** | `contentType`-param + dispatch in variant-generator · per-type Zod-schema + system-prompt + `buildXFromStructured` + variantToPuckData-dispatch · per-type flatten voor fidelity · tell-rewrite/auto-iterate/copy-diff op de nieuwe schemas verifiëren · orchestrate-dubbelpad gaten voor PUCK-types · `smoke:prompt-contracts` uitbreiden met de nieuwe schemas. Volgorde binnen de fase: **faq eerst** (kleinste schema), dan product, dan microsite | ~3-4d | W0 |
| **W2 — Product-page volwaardig + Product-koppeling** | R5-wiring stap 1-8 (§2.3) · SpecTable + UseCaseCards + escape-hatch-blok (gedeeld met FAQ) · remark-gfm of ComparisonTable voor tabellen · pageFlavor-presets · Product/Service JSON-LD · product-page group-contract op het orchestrate-pad (pariteit Fase 2) | ~3-4d | W1 (schema) — R5-wiring stap 1-3+8 kan parallel met W1 |
| **W3 — FAQ-page volwaardig** | Contract-uitbreiding (Q&A 12 + category-1..3 + contact-cta, backwards-compat) · anti-fabricage prompt-regels · PopularQuestions + categorie-koppen + ankerlijst op FAQ-component · escape-hatch-blok · FAQPage JSON-LD op /p/[slug] · faq planner-extras · feature-images uit voor dit type | ~2-3d | W1 |
| **W4 — Microsite volwaardig** | Contract page-N → benoemde ankersecties + nav-labels (v3.0.0 + aliases) · AnchorNav (sticky/scroll-spy/a11y-spec §4.3) · `anchorId`/`id` op sectie-componenten · StoryChapter + StatCards + HighlightCards componenten · per-chapter imageBriefs · blueprint→sectie-mapping · einddatum/urgentie in join-sectie | ~3-4d | W1 |
| **W5 — Logo-garantie** | L-Fase 2 (judge-detectie + auto-retry/deselect) · L-Fase 3 (logo-overlay opt-in) als apart beslispunt | ~1d (+1-2d opt-in) | W0; onafhankelijk van W1-W4 |

**Totaal**: ~13-17 dagen. **Kritiek pad**: W0 → W1 → {W2, W3, W4 deels parallel via worktrees — file-ownership per type is goed te scheiden na W1}. W5 kan elk moment na W0.

### Beslispunten vóór de bouw

1. **Optie A bevestigen** (type-eigen schemas; §1) — fundament voor alles.
2. **Social-proof-bron**: trust-bar/testimonials alleen renderen bij echte workspace-proof-assets (anti-fabricage) — accepteren dat die sectie vaak leeg blijft tot er een proof-asset-feature is?
3. **Pricing-datamodel**: optioneel `price`/`priceCurrency` op Product (nodig voor JSON-LD offers + buybox-flavor) — kleine migratie, hoge SEO-ROI; of uitstellen?
4. **Logo L-Fase 3** (echte overlay) nu meenemen of na L-Fase 1+2 evalueren? (Aanbeveling: eerst 1+2, meten, dan beslissen.)
5. **ProductImage-mirroring** (scrape-URLs → /uploads of MediaAsset-import) vóór of ná de eerste product-page-release?

---

## 7. Bronnen (selectie)

**Voorbeelden (live geobserveerd)**: stripe.com/billing · github.com/features/copilot · notion.com/product/projects · linear.app/plan · mollie.com/payments · siegemedia.com/services/content-marketing · wise.com (FAQ) · huel.com (FAQ) · IKEA Life at Home Report · Patagonia Blue Heart · ARMEDANGELS Impact Report.
**Teardowns/onderzoek**: Baymard Institute (PDP + FAQ-prioriteiten), NN/g (FAQ-kritiek, accordions), CXL/Unbounce (leesniveau-conversiedata), Smashing Magazine (sticky menus UX), css-tricks/Smashing (smooth scroll + reduced-motion a11y), BFL FLUX.2 prompting guide + Google nano-banana guides (logo/negative-gedrag), Leadpages/involve.me (microsite vs LP).
**Codebase**: volledige file:line-referenties in de onderzoeksrapporten; kernfiles per fase staan in §2.3, §3.2, §4.2-4.3, §5.

> Volledige onderzoeksdata (9 rapporten incl. alle sectie-observaties per voorbeeldpagina en alle file:line-traces) beschikbaar in de sessie-werkdata; dit document is de gedistilleerde synthese.
