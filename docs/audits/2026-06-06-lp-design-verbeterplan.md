# LP-render verbeterplan — best-practice landingspagina-design (case: Zwarthout)

> **Datum**: 2026-06-06
> **Scope**: web-page-builder "Medium"-renderer (Puck). Diepgaand design-onderzoek (4 lenzen / 5 agents, ~180k tokens, NN/g + Julian Shapiro + CXL + Refactoring UI + Baymard + premium-brand-referenties) → toegepast op de gegenereerde Zwarthout-pagina.
> **Status-context**: Tracks 1/3/4 (contrast/fonts/ritmiek) gemerged via PR #20 (changelog #289); hero-gen deterministisch via PR #21 (#290); **deze sessie**: E-1 (per-rol display-font), Track 2 (feature-beeld-infra), E-3 (Adobe/uploaded font-loader). Dit document is het *vervolg*: de architecturale design-upgrades die de pagina van "correct" naar "premium" tillen.
> Voorgangers: `docs/audits/2026-06-06-lp-render-zwarthout.md` (6-track audit) + memory `branddock-lp-render-zwarthout`.

---

## DEEL 0 — Twee correcties op de oorspronkelijke audit (data-gedreven)

Tijdens deze sessie is de **werkelijke Zwarthout-DB-staat** geïnspecteerd (read-only). Twee aannames uit de 6-track audit blijken onjuist of achterhaald:

### 0.1 — Track 6 "donker-sectie-fidelity" was verkeerd gediagnosticeerd

**Audit-premisse (fout)**: "scraper tagt Zwarthout's donkere hero/footer niet → `hasDarkSections=false` → renderer forceert lichte hero."

**Werkelijkheid (DB)**: Zwarthout heeft 3 kleuren: `#E06000` (PRIMARY, burnt orange), `#F8F9FA` (NEUTRAL light), `#212529` (NEUTRAL, tags `text,dark,background`). De donkere `#212529` draagt **wél** `background`+`dark` en luminance 14,5% < 25% → `hasDarkSections` is **al `true`**, `darkSectionBg = #212529`. De render-side dark-capability is dus actief.

**De echte oorzaak van de vlakke hero**:
1. Zwarthout = **archetype CREATOR + layoutStyle EXPERIENTIAL**. CREATOR zit in géén van de hero-layout-buckets (`pickHeroLayout`) → valt door naar de `solid-brand`-default.
2. MAAR: in `puck-config.tsx:438` geldt `const useFullBleed = hasHeroVisual` — **zodra er een hero-beeld is, rendert de hero full-bleed met scrim**, ongeacht archetype. De vlakke/lichte hero die de user zag was de **pre-#290 race**: de pagina opende vóór het AI-beeld klaar was → geen `hasHeroVisual` → `solid-brand`/surface-fallback. Met #290 (deterministisch beeld vóór persist) is `hasHeroVisual=true` → full-bleed cinematische hero (CREATOR `scrimStyle: 'scrim-soft'` op `onSurface` #212529 = donker, witte tekst).

**Conclusie**: Track 6 vereist **geen extractie-fix en geen code-change** voor Zwarthout — het is opgelost door #289 (leesbaarheid) + #290 (beeld-timing). De resterende hefboom (een écht donker *canvas-merk* een dark hero geven óók zónder beeld, i.p.v. `solid-brand` orange) is een renderer-keuze die in DEEL 2 (P3) als architecturale track staat, niet als bugfix.

### 0.2 — `visualLanguage` is nog Bootstrap-vervuild (raakt de AI-beeldgeneratie)

Zwarthout's `BrandStyleguide.visualLanguage.promptFragment` (die de hero-image-gen voedt) bevat nog framework-defaults: het noemt **"vibrant purple (#7A00DF) for primary actions"** + de volledige Bootstrap-semantiek (`#198754`, `#DC3545`, `#0A58CA`) als merk-palet — terwijl het *resolved* palet correct PRIMARY=`#E06000` heeft. De color-resolution (usage-filter + `demoteAchromaticPrimary`) heeft de StyleguideColor-rij gefixt, maar de `visualLanguage`-snapshot (los gegenereerd tijdens analyse) is niet meegecorrigeerd.

**Effect**: de AI-hero kan off-brand accenten (paars i.p.v. burnt-orange) krijgen omdat de prompt purple als primary noemt.

**Eigenaar**: dit is **upstream brandstyle-extractie**, niet LP-render → hoort bij plan `functional-conjuring-harbor` / audit `2026-06-05-brandstyle-extraction-pipeline.md`. Hier alleen als cross-reference vastgelegd. Aanbevolen fix daar: `visualLanguage.colorApplication`/`promptFragment` her-synchroniseren met het resolved palet (of de image-gen-prompt uit het resolved palet voeden i.p.v. uit de rauwe snapshot).

---

## DEEL 1 — De 12 kern LP-design-principes (geprioriteerd, met bron)

1. **Descriptieve header boven slogan** — hero-kop = product + premium-belofte + differentiator (5-sec-test). "Passion for wood and fire" wekt gevoel maar verkoopt niet; "Verkoold gevelhout dat een leven lang zwart blijft — Shou Sugi Ban" doet beide. *(Julian Shapiro; NN/g 5-second test)*
2. **Beeld is het bewijs, op 3 niveaus (hero / in-context / textuur-detail)** — bij een tactiel premium-materiaal vervangt fotografie de fysieke aanraking; meerdere hoogwaardige beelden +30% conversie, 56% exploreert eerst beelden. *(Baymard; Shopify/Squareshot; Shapiro)*
3. **Donker charcoal canvas als identiteit, niet als smaak** — verbrand hout = zwart; light-beige is identiteits-incongruent én laat de char-fotografie niet "oppoppen". Dark A/B won +42% bij industry-fit. *(Search Engine Land; Solid Digital; 60-30-10)*
4. **PAS-narratief dat secties bindt** — Probleem→Agitatie→Oplossing-boog waarin elke sectie terugkoppelt op de hero-belofte; losse herhaalde "eyebrow→kop→sub→knop"-blokken verwarren de high-consideration koper. *(Shapiro; ProfileTree PAS vs AIDA)*
5. **Hiërarchie uit grootte × gewicht × kleur, niet grootte alleen** — "emphasize by de-emphasizing": verzwak het secundaire (zachter grijs/lichter gewicht) i.p.v. het primaire te overschreeuwen. Goedkoopste hefboom tegen vlakheid. *(Refactoring UI)*
6. **Brede modulaire type-scale (hero ~5× body)** — niet-lineaire scale, hero `clamp(48→80px)` vs 16–18px body geeft de "luchtdruk" die premium vraagt; huidige ~1.8× domineert nergens. *(Refactoring UI; Baymard; modular-scale)*
7. **Asymmetrisch editorial grid + ritmische full-bleed/contained-wissel** — de gecentreerde stack maakt je inwisselbaar; alterneer layout, achtergrond (wit↔charcoal) en sectiehoogte met ≥1 accent-beat. *(HypeEdge; Awwwards; Tilda; "Section Rhythm")*
8. **Één gereserveerde accentkleur (60-30-10)** — Burnt Orange `#E06000` uitsluitend op primaire CTA's/active states, nooit decoratief, zodat de CTA per definitie "het luidste element" is. *(HYPE4; CXL; Refactoring UI)*
9. **Geattribueerde, specifieke social proof boven anonieme quote** — testimonial met architectnaam + bureau + project + concrete uitkomst + projectfoto = 15-25% lift vs 2-5%; bij premium-architectuur ís het referentieproject de testimonial. *(Baymard/UserIntuition; Hashmeta)*
10. **Trust geclusterd in 3 zware signalen, niet 8 badges** — 1-3 trust-types +23%, 7+ types -8% ("trust-clutter"); bundel als Duurzaam (FSC+C2C) / Veilig (B-s1,d0) / Bewezen (50-jr garantie), elk met "wat het voor jou betekent". *(Baymard/UserIntuition)*
11. **CTA-ladder met friction-discipline (Fogg)** — micro-commitment-ladder (stalen → adviesgesprek → offerte), CTA herhaald na elke bewijslaag, formulier 3-5 velden met één kwalificatieveld. *(Fogg BAT; CXL; Brixon; Cialdini)*
12. **Anti-false-bottom + measure-cap als hygiëne** — laat de volgende sectie een sliver bovenwaarts bleeden + echte scroll-cue (de vlakke hero-band leest als page-end); cap leesbreedte ~36em body / ~44em lead met line-height per rol (koppen 1.0-1.2, body 1.5-1.6). *(CXL false bottom; Baymard line-length)*

---

## DEEL 2 — Verbeterplan per principe → renderer-locatie → type wijziging

Legenda type: **[CONTENT]** = copy-engine/AI-prompt · **[RENDER]** = nieuwe renderer-capability · **[EXTRACT]** = scrape-extractie · **[DONE]** = al geleverd.

| P | Wijziging op DEZE pagina | Renderer-locatie | Type |
|---|---|---|---|
| P1 | Hero-kop koppelen aan USP-kern (product+belofte+differentiator), subkop ≤25 woorden believability | copy-engine + `variant-schema` (structured value-prop object) | [CONTENT] + [EXTRACT] |
| P2 | ≥3 beeldrollen afdwingen (hero/textuur/in-context); feature-cards beeld-capabel | `puck-config` FeatureGrid `<img>` **[DONE deze sessie]** + producer (brandImages-map / AI-feature-gen) | [DONE]-infra + [RENDER]/[CONTENT]-producer |
| P3 | Dark-canvas preset voor donker-dominante merken (charcoal 60%) óók zonder beeld; hero niet `solid-brand` orange | `pickHeroLayout` + hero-bg-resolutie in `puck-config` (nieuwe `solid-dark` tak die `darkSectionBg` gebruikt) | [RENDER] |
| P4 | PAS-skelet (Probleem→Agitatie boven Oplossing) als default voor premium/materiaal-B2B; 6-feature-grid → 4 hero-pilaren die terugkoppelen | `render-constraints` sectionBlueprint + structured-mapper; hero-USP's als variabelen naar bewijssecties | [RENDER] + [CONTENT] |
| P5 | Sub-kop/body verplicht zachter grijs + lager gewicht; eyebrow `#E06000` UPPER +0.1em | type-niveau weight+color-tokens (`brand-tokens` typografie) | [RENDER] |
| P6 | Hero `clamp(48→80px)`, H2 `clamp(32→48px)`, body 16-18px; kerncontrast ~5×; line-height per rol | clamp-based modular scale in `design-system`/`brand-tokens` | [RENDER] |
| P7 | A-B-A-B split + achtergrond-alternatie wit↔charcoal + ≥1 full-bleed + ≥1 overlap-beat; verbied 4× identiek blok | section-library layout-varianten + alternatie-regel in structured-mapper | [RENDER] |
| P8 | Accent-token alléén naar CTA/active-state; sectie/heading-accent = charcoal/wit | token-routing in `puck-config` (60-30-10 enforce) | [RENDER] |
| P9 | Projectfoto-grid + testimonial met verplichte velden (naam/bureau/project/uitkomst) i.p.v. vrije quote | `socialProofSchema` attributievelden + Testimonial-component + project-grid | [RENDER] + [CONTENT] + [EXTRACT] |
| P10 | 3 trust-clusters met contextregel i.p.v. kale badges | trust-component cap op 3 + contextregel | [RENDER] + [CONTENT] |
| P11 | CTA-ladder (stalen→gesprek→offerte), CTA herhaald, formulier 3-5 velden + kwalificatie, objectie-FAQ | sectie-volgorde + formulier-component + FAQ-template | [RENDER] + [CONTENT] |
| P12 | False-bottom bleed + scroll-cue + above-fold credibility-strip; measure-cap 36em/44em; line-height per rol | hero-layout + type-scale | deels [DONE #289] + [RENDER] |

**Reeds gefixt (basis-hygiëne staat):** leesbare hero+cards (#289 contrast), echte fonts Sen/Roboto laden (#289) + per-rol display-font + Adobe/uploaded (deze sessie E-1/E-3), strakkere ritmiek (#289 Track 4), deterministische AI-hero-foto (#290), per-feature beeld-slot (deze sessie Track 2). De open winst zit volledig in **narratief, beeld-rijkdom (producer), dark-canvas, hiërarchie-spanning en proof-architectuur**.

---

## DEEL 3 — TOP 5 hoogste-impact tracks (geprioriteerde roadmap)

> Elk is een nieuwe renderer-capability met cross-brand blast-radius → eigen task-file + plan-mode + browser-verificatie (light + dark merk) vóór merge. Géén van deze zijn bolt-on bugfixes.

1. **Hero-template: full-bleed donker cinematisch + descriptieve claim + nabije gereserveerde-orange CTA (P1+P3+P8).** Vervang de centered-stack-op-band door image-as-background + scrim + asymmetrische Z; voeg een `solid-dark`-hero-tak toe die `darkSectionBg` gebruikt wanneer er géén beeld is (zodat een donker-merk nooit `solid-brand` orange krijgt). Eén klap: merk-fidelity (charcoal-identiteit) + conversie (5-sec + luidste-CTA) + 57%-above-fold-zone.
2. **Beeld-producer op 3 niveaus (P2).** De render-infra staat (Track 2 `<img>`-slot + hero-gen). Wat ontbreekt is de *producer*: (a) brandImages→feature/hero-mapping voor merken mét bronbeeld, (b) per-feature AI-materiaal/textuur-gen voor merken zónder (Zwarthout `brandImages=null` → enige route). Dwing ≥3 beeldrollen af. **Grootste verandering van "SaaS-template" → "architectuur-portfolio".**
3. **PAS-narratief met hero-pilaren die terugkoppelen (P4).** Probleem→Agitatie-sectie + 6-random-features → 4 hero-pilaren-bewezen. Hero-USP's als variabelen naar bewijssecties. Grootste enkele conversie-upgrade; bindt de nu-losse secties.
4. **Type-spanning + hiërarchie via gewicht/kleur (P5+P6).** Hero → `clamp(48→80px)`, secundaire tekst verzwakken; kerncontrast ~1.8× → ~5×. Goedkoopste hefboom voor de premium-"luchtdruk".
5. **Proof-architectuur: geattribueerde social-proof + 3-cluster trust + CTA-ladder (P9+P10+P11).** Anonieme quote + kale stats → referentieproject-grid met architect-credit, 3 trust-clusters, micro-commitment-ladder met 3-5-veld kwalificerend formulier + objectie-FAQ.

---

## DEEL 4 — Status "resterende tracks" (uit de 6-track audit)

| Track | Status na deze sessie |
|---|---|
| **E-1** per-rol `fontFamily` | ✅ **GEBOUWD** — hero-h1 gebruikt `tbr.display.fontFamily`; loader laadt per-rol display/heading/body/label-families. Smoke phase55 (11/11). Geen Zwarthout-zichtbaar effect (Sen/Roboto al gedekt door globale split) — capability voor merken met >2 rol-families. |
| **Track 2** feature-beeld | ✅ **INFRA GEBOUWD** — `imageUrl`-slot op `featureItemSchema` + `FeatureItem`-type + FeatureGrid `<img>`-render (vervangt icon-badge) + mapper-threading. Smoke phase56 (8/8). **Producer (brandImages-map / AI-gen) = Top-5 #2** — Zwarthout `brandImages=null` blokkeert tot bronbeeld. |
| **E-3** Adobe/uploaded font-loader | ✅ **GEBOUWD** — `BrandTokens.fontAssets` + `adobeFontsKitId` (workspace-kit) gedragen door extractor; `useBrandFontLoader` laadt UPLOADED via `@font-face` + ADOBE_FONTS via `injectTypekitCss`, sluit hun families uit de Google-aanvraag. Smoke phase57 (13/13). Additief/inert voor Google-only merken. Geen Zwarthout-zichtbaar effect. |
| **Track 6** donker-sectie | ✅ **OPGELOST / GEREFRAMED** — zie DEEL 0.1: `hasDarkSections` al `true`; vlakke hero was pre-#290 race; opgelost door #289+#290. Echte resterende hefboom = dark-canvas-hero zónder beeld → Top-5 #1 (P3). |

---

## Verificatie deze sessie

- `npx tsc --noEmit` → 0 errors.
- `npx eslint` (alle 9 aangeraakte files) → 0 errors, 0 warnings (pre-existing `columns`-dead-destructure opgeruimd).
- Volledige web-page-builder smoke-sweep (58 smokes) → groen; nieuw: phase56 (8/8), phase57 (13/13); stale phase30-assertie (Track-4-clamp) bijgewerkt → 58/0.
- Browser-verificatie van de gegenereerde Zwarthout-pagina post-#289/#290/E-1: **aanbevolen volgende stap** (de user heeft de pagina nog niet ná die merges gezien — de getoonde flets/vlakke screenshot was pre-fix).

---

## DEEL 5 — Verbeterplan-implementatie (branch `feat/lp-verbeterplan`, 2026-06-06)

Renderer-side tracks gebouwd + visueel geverifieerd (SSR `<Render>` met echte DB-tokens → Playwright-screenshot; dev-tool `scripts/dev/render-lp-screenshot.tsx`). **Cross-brand geverifieerd op Zwarthout (CREATOR/dark) + LINFI (RULER/gold-dark) + Better Brands (vibrant-green/light-only) — geen regressies.**

| Track | Status | Wat |
|---|---|---|
| **Card-fix** | ✅ GEBOUWD | `isCardContextMismatch` — een near-black gescrapte PRODUCT_CARD op een lichte sectie (Zwarthout `rgb(0,0,0)`) wordt genegeerd → sectie-passende card-styling. Zwarte blokken weg. Smoke phase58 (12/12). |
| **P8** accent-reservering | ✅ GEBOUWD | `reserveAccentForHeading` — accent-gekleurde koppen → charcoal; accent gereserveerd voor CTA/stats/eyebrow. Primaire hero-CTA draagt nu de accent (oranje/goud) op donkere hero (contrast-geclampt). Smoke phase59 (12/12). |
| **P3/P7/P9** dark-ritme | ✅ GEBOUWD | Stats-band is een cinematische dark accent-beat voor élk merk met `hasDarkSections`+`darkSectionBg` (was archetype-beperkt → CREATOR/EXPLORER uitgesloten). Ritme wit→charcoal→wit. |
| **P12** measure-cap | ✅ GEBOUWD | RichText body-paragraaf `max-width:40em` + leading 1.6. |
| **P10** trust-cluster | ✅ GEBOUWD | Trust-items krijgen een `badge-check`-icon → credibility-signaal i.p.v. kale tekst. |
| **P1/P4/P9/P11** copy-laag | ⏳ CONTENT-ENGINE | Descriptieve header, PAS-copy + hero-pilaren-terugkoppeling, geattribueerde testimonial-copy, CTA-ladder-copy. Render + schema staan (problem-sectie + attributievelden bestaan); de delta is de AI-copy-prompt, niet de renderer. |
| **P2** beeld-producer | ⏳ INFRA | Track 2 `<img>`-render staat (#291); de *producer* (brandImages→feature/hero-mapping + per-feature AI-materiaal-gen) vereist context-plumbing + AI-gen-infra. |
| **P7** layout-alternatie | ⏳ RENDERER-FOLLOWUP | A-B-A-B split-secties (beeld-links/tekst-rechts) = nieuwe split-layout-componenten; bg-alternatie + dark-stats leveren nu al ritme. |
| **P5/P6** type-spanning | ✅ grotendeels AANWEZIG | Hero = responsive clamp 32→capped (≈5× body); sub measure-capped 560px. Verdere de-emphasis = follow-up. |

**Netto Zwarthout-transformatie**: van "flets/onleesbaar" → premium cinematisch — dark full-bleed hero met oranje CTA, charcoal koppen (accent gereserveerd), feature-cards met beeld, cream testimonial, **donkere stats-band met oranje cijfers**, leesbare ritmiek. Adversariële review (3-dimensie workflow) + cross-brand-check vóór merge.
