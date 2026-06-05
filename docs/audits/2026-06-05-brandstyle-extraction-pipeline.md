# Audit — scrape→brandstyle extractie-pijplijn (deep-research)

> Datum: 2026-06-05 · Methode: 6 parallelle stage-onderzoeken + adversariële code-cross-check + synthese (workflow brandstyle-extraction-deep-research-v2). Aanleiding: user-bevindingen op Zwarthout-brandstyle (geen kleurcombinaties, buttons kloppen niet, fonts leeg, interlinie/var() onopgelost, framework-defaults winnen).

# Definitief architectuur-rapport — Branddock scrape→brandstyle-extractie

**Casus**: Zwarthout (WordPress + Bootstrap + Gravity Forms), scrape-first onboarding zonder ingevulde brand-foundation.
**Bron**: 6 stage-rapporten, getoetst tegen een adversariële code-cross-check. **Dit rapport bevat uitsluitend claims die de cross-check BEVESTIGDE of CORRIGEERDE.** Onbevestigde claims (Stage 2.7 `resolveColors` exacte regels, Stage 3.6 regex regel 211, Stage 6.4 var→typeScale-keten) zijn uit de root-cause-map verwijderd of expliciet gecorrigeerd. Alle paden absoluut t.o.v. `/Users/erikjager/Projects/branddock-app/`.

---

## 1. Meta-root-cause

De pijplijn leest CSS via **drie niet-uniforme paden** met verschillende `var()`-resolutie en zonder gedeelde framework-default-gate. De brand-extractoren (`buttonProfile`, `typographyProfile`, `components`, `spacing/elevation/radius`) hergebruiken de bestaande, werkende var-resolvers en de DOM-presence-filter niet — terwijl alleen de font-LIJST-extractors dat wél doen. Op een Bootstrap-default-site convergeert dit op één klasse fout: framework-defaults (Bootstrap `--bs-*`, Gutenberg `.wp-block-*`, Gravity Forms `.gform_*`) winnen via vier ongegate'de routes, de echte merk-redding (logo-kleur) wordt juist geblokkeerd, en onopgeloste `var()`-strings + lege fonts lekken naar de DB en de LP-renderer. Kleurcombinaties ontbreken omdat ze nergens als concept gemodelleerd of gegenereerd worden.

---

## 2. Root-cause-map per stage (severity-geordend)

### A. CSS-var-resolutie — **CRITICAL** (de architecturale kern, raakt B/C/D/E)

- **Asymmetrie var-resolutie** — `extractTypographyByRole(allCss)` (`url-scraper.ts:345-346`) krijgt **alleen** de rauwe CSS-string; `extractButtonStyles(allCss, {cssVariables, $})` (`url-scraper.ts:339-342`) krijgt wél de var-map én DOM. De werkende resolvers `resolveFontSizeValue` (`url-scraper.ts:851`) / `resolveFontFamilyValue` (`url-scraper.ts:972`) resolven `var()` recursief tegen de full-CSS en worden door de font-lijst-extractors gebruikt (`extractFontSizes`, `url-scraper.ts:827`) — maar nooit door de profiel-extractor. **BEVESTIGD.**
- **Geen resolutie in typografie-extractor** — `typography-extractor.ts:202-206` plukt `fontSize`/`lineHeight`/`fontFamily` rauw via `getProp` (`typography-extractor.ts:131-135`); alleen `color` heeft een var-guard die de var *skipt* i.p.v. resolvet (`typography-extractor.ts:213`). **BEVESTIGD.**
- **Letterlijke persist** — `analysis-engine.ts:823-826` schrijft `typographyProfile = JSON.parse(JSON.stringify(scraped.typographyByRole))` zonder tussen-resolutie. **BEVESTIGD.**
- **Var-map mist typografie-vars by design** — `extractCssVariables` filtert op color-keyword (`isColorRelatedVariableName`, `url-scraper.ts:581-589`), dus `--bs-body-font-size/-line-height/-font-family` komen nooit in `cssVariables`. Een typografie-resolver zou de var-map dus zelfs niet kunnen voeden tenzij hij (zoals de font-lijst-resolvers) tegen de full-CSS resolvet. **BEVESTIGD.**
- **Headless redt het niet** — `playwright-fallback.ts:204-211` bouwt een volledig geresolveerde `rootVariables`-map, maar de headless-pad triggert alleen op een zwak **kleur**-palet (`analysis-engine.ts:267-272`) en her-extraheert typografie niet. **BEVESTIGD.**
- **Impact**: `var(--bs-*)`-strings landen onopgelost in `typographyProfile`, die de **LP-renderer** voedt (zie correctie hieronder), en typografie/radius-button-vars degraderen naar `null`.

### B. Typografie / fonts — **CRITICAL/HIGH**

- **`StyleguideFont` LEEG (0 fonts)** — `analysis-engine.ts:1760-1763`: bij 0 niet-lege fontnamen draait `createMany` niet → lege tabel. `cssFonts` is leeg omdat Bootstrap's `--bs-body-font-family` naar een system/web-safe stack resolvet die `extractFontsFromCss` (terecht) filtert via `GENERIC_FONT_FAMILIES` (`url-scraper.ts:1016-1025`) / `WEB_SAFE_FALLBACK_FONTS` (`url-scraper.ts:1036+`). `extractSemanticFonts` matcht `--h[1-6]-font-family`/`--body-font-family` maar **niet** de `--bs-*`-prefix (`url-scraper.ts:1142,1154-1155`). **BEVESTIGD. Severity: critical.**
- **Geen onafhankelijke font-fallback** — font-persistentie hangt volledig aan de CSS-regex-keten (`analysis-engine.ts:1672-1674`); `bulk-computed-styles.ts` bestaat maar wordt hier niet als computed-style-fallback ingezet. **BEVESTIGD. Severity: high.**
- **`body`-rol matcht Gutenberg-noise** — `body`-pattern matcht ook `p` (`typography-extractor.ts:70`, weight 7), dus `.gutenberg p` claimt de body-rol; `SKIP_PATTERNS` (`typography-extractor.ts:89-104`) bevat geen WP/Gutenberg/Bootstrap-utility-selectors. Vandaar de geobserveerde `color:"#fff"` (WP-utility-wit, geen brand-body-color). **BEVESTIGD. Severity: high.**
- **`lineHeight`/`letterSpacing` zonder guard in renderer-mapper** — `toRoleEntry` (`brand-tokens-v4-mappers.ts:473-474`): `lineHeight: src.lineHeight ?? null`, `letterSpacing: src.letterSpacing ?? null` — **geen** var-guard/parse, terwijl `fontSize` (`pxFromCssValue`, regel 452), `fontWeight` (regel 453) en `color` (var-guard, regel 461-469) die wél hebben. Een DB-waarde `var(--bs-body-line-height)` bereikt zo verbatim de LP-renderer-tokens. **BEVESTIGD. Severity: medium.**

### C. Buttons / componenten — **CRITICAL/HIGH**

- **Statisch pad heeft geen CTA/prominentie-scoring** — component-screenshots staan achter een env-flag (`component-screenshotter.ts:36-38`, default false); de statische `extractComponents` sorteert puur op `confidence` (`component-extractor.ts:369`), zonder DOM-positie/zichtbaarheid/CTA-signaal. **BEVESTIGD. Severity: critical.**
- **Framework-defaults zijn positieve matches** — `BUTTON_SELECTOR_PATTERNS` bevat `.wp-block-button`/`.wp-element-button`/`.btn-primary`/`.has-button-style` (`button-extractor.ts:84-89`); `NEGATIVE_SELECTOR_PATTERNS` (`:94-102`) bevat geen enkele framework-default; `.gform_button` staat nergens. **BEVESTIGD. Severity: critical.**
- **DOM-presence-filter is no-op** — WP/Gravity rendert die elementen wél, dus het filter (`button-extractor.ts:299-339`) behoudt ze; bij 0 overlevenden valt het terug op de ongefilterde set (`:383`). **BEVESTIGD. Severity: high.**
- **Confidence meet volledigheid, niet merk-authenticiteit** — `computeConfidence` (`component-extractor.ts:637-651`) somt property-aanwezigheid tot exact 1.0; een volledig gespecificeerde framework-default scoort juist máximaal. Geen framework-penalty. **BEVESTIGD. Severity: high.**
- **Role-classificatie kiest primary op class-match/solid-bg** — `.btn-primary`→primary via class (`button-extractor.ts:120`); élke `hasSolidBg`→primary (`:132`). Bootstrap-blauw default wordt zo de merk-primary. **BEVESTIGD. Severity: high.**
- **CORRECTIE op het mechanisme**: het rapport stelde elders dat `extractButtonStyles` "var() alleen met de kleur-only var-map" resolvet. De resolver dekt feitelijk **alle** button-velden (paddingY/fontSize/borderRadius/…, `button-extractor.ts:277-281`); de beperking zit in de meegegeven var-*map* (color-gefilterd). Het *effect* (radius/typografie-vars → null) klopt; de formulering "resolvet alleen kleur" was onnauwkeurig.

### D. Kleuren / combinaties — **HIGH**

- **Geen pairing-model, geen pairing-generatie** — `StyleguideColor` (`prisma/schema.prisma:1818-1842`) is een losse swatch; geen fg/bg-relatie, geen pairing-tabel. `enforceOnColorPairs` (`semantic-role-resolver.ts:397-428`) genereert wél contrast-geverifieerde paren maar kiest foreground **altijd alleen `#FFFFFF`/`#000000`** (`:422-428`), nooit merk-op-merk, en landt in "System Roles", niet als "kleurcombinaties". `InContextPreview` (`ColorsSection.tsx:241-376`) is een render-time mock op `primaries[0]`/`secondaries[0]`, niet-persistent, default dichtgeklapt (`:628`). **BEVESTIGD. Severity: high.**
- **Bootstrap-defaults overleven als high-confidence merk-kleur** via vier ongegate'de routes:
  1. Detector-push onvoorwaardelijk `confidence:'high'` (`analysis-engine.ts:1219-1228`); `BOOTSTRAP_DETECTOR` fired op `--bs-primary:` (`framework-detectors.ts:274`), comment erkent het default-probleem maar lost het niet op. `#0D6EFD` zit in `FRAMEWORK_COLORS` (`url-scraper.ts:762`) maar die filter draait **alleen** in `analyzeColorFrequency` (`:691-693`) — de detector-route omzeilt 'm. **BEVESTIGD. Severity: high.**
  2. `:root`-vars gesorteerd bovenaan, gepusht vóór frequentie als `'medium'` (`analysis-engine.ts:1281-1289,1231-1238`). **BEVESTIGD. Severity: medium.**
  3. Usage-verifier schrijft alleen `usageEvidence`/`visionRole`, muteert confidence niet en filtert niet; `none` wordt alleen gelogd (`analysis-engine.ts:411-420`). **BEVESTIGD. Severity: medium.**
  4. **CORRECTIE op de AI-laag**: de AI-prompt zegt "Do not overrule the detector" (`analysis-prompts.ts:108`) en detector outrankt usage-evidence (`:184`) — maar de cross-check toont dat de exceptie op 184 alléén `logo-extraction` noemt, en dat de AI de *category/rol* wél vrij kiest voor medium/low-confidence-tokens. De claim "AI kan niet herclassificeren" geldt dus **alleen voor high-confidence detector-tokens**, niet algemeen. Severity: medium.
- **Logo-kleur-redding geblokkeerd** — logo-extractie draait alleen bij `!frameworkHasPrimary` (`analysis-engine.ts:1143-1144`); omdat Bootstrap áltijd een `--bs-primary`-token produceert, is `frameworkHasPrimary===true` en wordt de sterkste signaal-bron (logo) overgeslagen. **BEVESTIGD. Severity: high.**

### E. Spacing / archetype / layout — **CRITICAL/HIGH**

- **Spacing/radius/elevation uit ongefilterde framework-CSS** — `extractSpacingElevationProfile(css)` (`spacing-elevation-extractor.ts:215`) neemt alleen een CSS-string, géén `$`/DOM-filter (anders dan de zuster-extractor button). CONTEXT_PATTERNS matcht `.wp-block-button` (`:74`) en `.card` (`:66`); frequentie = framework-frequentie, niet brand-frequentie. **BEVESTIGD. Severity: critical.**
- **var()/calc()-padding gedropt** — `splitPadding` (`spacing-elevation-extractor.ts:126-128`) en `pickTypical` (`:163`) gooien var/calc-rules weg; geen `cssVariables`-resolutie. Bootstrap drukt spacing systematisch als `var()`/`calc()` uit → echte spacing-signaal verloren. **BEVESTIGD. Severity: high.**
- **layoutStyle color-tier erft defecte kleur-extractie** — `inferLayoutStyleFromSiteData({brandHex})` gebruikt `colors[0].hex` (`analysis-engine.ts:924-928`, `infer-layout-style.ts:147`); een foute/near-white primary duwt naar verkeerde layoutStyle. **BEVESTIGD. Severity: high.**
- **Archetype faalt-naar-null → COMMERCIAL-default** — `hasSufficientSignalForClassification` (`ensure-archetype.ts:60-73`) vereist verbaal signaal; `!archetype` → null → schema-default COMMERCIAL (`ensure-layout-style.ts:137`). **CORRECTIE**: de gate omvat `brandName` (`:64`); een scrape-only workspace met **enkel een ingevulde brandName** haalt de gate al wél. De faal-claim geldt alleen als óók brandName leeg is — strenger dan oorspronkelijk gesteld. **BEVESTIGD met nuance. Severity: high.**
- **classifyShadow telt kleur-getallen mee** — `numbers[2]` als blur (`spacing-elevation-extractor.ts:142-144`); bij color-first shadows (`rgba(0,0,0,.1) 0 2px 8px`) is `numbers[2]` fout. Cross-check verifieerde runtime: blur=0 i.p.v. 8; `#000 0 1px 3px` → blur=1 i.p.v. 3. **BEVESTIGD. Severity: medium.**
- **rem-conversie hardcodeert 16px** — `pxFromCssValue` (`brand-tokens-v4-mappers.ts:49-59`) doet rem/em ×16, accepteert alleen px/rem/em. **BEVESTIGD. Severity: medium.**
- **Profielen homepage-only** — `multi-page-scraper.ts:277-279` neemt spacing/elevation/radius alleen van homepage; cross-check voegt toe: `typographyByRole`+`buttonStyles` zijn óók homepage-only (`:275-276`). **BEVESTIGD. Severity: low.**

### F. UI-display — **HIGH/MEDIUM** (grotendeels eerlijke spiegel van slechte input)

- **CORRECTIE — twee verschillende styleguide-viewers**: Stage 1 baseerde bevinding 1 op `StyleGuideViewer.tsx` (1327 regels), maar dat bestand is **dead code** (alleen geïmporteerd door `BrandstyleView.tsx`, dat nergens gerenderd wordt). De **live** surface is `BrandStyleguidePage` (`App.tsx:545`) uit `src/features/brandstyle/components/`. De conclusie (geen pairing-surface) blijft waar, maar fixes moeten in de live viewer. **GECORRIGEERD.**
- **CORRECTIE (belangrijkste feitelijke fout) — `typeScale` ≠ `typographyProfile`**: de UI rendert `styleguide.typeScale` (`TypographySection.tsx:559`), en `typeScale = result.typeScale` is **AI-output** (`analysis-engine.ts:1917`), gebouwd uit de var-resolvende `fontSizes` (`extractFontSizes`, `url-scraper.ts:827`). De onopgeloste `var(--bs-*)` in `typographyProfile` voedt de **LP-renderer** (via `toRoleEntry`), **niet** de zichtbare Type Scale. Stage 6.4's causale keten ("var lekt in typeScale.size/.lineHeight") is **niet door de code gestaafd**. Het zichtbare "interlinie ontbreekt"-symptoom komt waarschijnlijker uit de AI die lineHeight als "estimated"/leeg laat óf uit de LP-render. **GECORRIGEERD — dit verschuift het var()-impactpunt van de UI naar de renderer.**
- **Gefabriceerde button-CTA-tekst** — `ScrapedButtonProfilePreview.tsx:169-173` hardcodet "Plan een afspraak"/"Bekijk programma"/"Meer informatie" per rol, los van de echte scraped sample-tekst. Pure display-bug. **BEVESTIGD. Severity: high.**
- **Brand-font-cards bypassen empty-state** — `FontsGrid` toont eerlijke empty-state (`FontsGrid.tsx:90-92`), maar de "Brand Fonts"-cards sourcen uit `primaryFontName` = AI-fallback (`analysis-engine.ts:1672-1673`). **CORRECTIE/kanttekening**: de AI-prompt (rule 5, `analysis-prompts.ts:113`) instrueert `primaryFontName:null` bij lege fontlijst, dus normaal is óók de AI-waarde null en tonen de cards óók niets. Het "false-confidence AI-font"-scenario vereist dat de AI z'n eigen instructie negeert — het *mechanisme* (bypass empty-state) klopt, de *frequentie* is overschat. **BEVESTIGD met kanttekening. Severity: high (mechanisme), laag in praktijk-frequentie.**
- **Components-tab toont confidence=1 framework-defaults getrouw** — de UI is een eerlijke spiegel; de upstream confidence=1 op WP-default-selectors (C) is de fout. **BEVESTIGD als architectuur. Severity: medium.**

---

## 3. Verbeterplan (gefaseerd, geprioriteerd)

Volgorde = breedste symptoom-dekking per fix-eenheid, oplopend in risico. Per fase: **[DET]** = verifieerbaar met deterministische test (fixture-CSS → assert, geen netwerk), **[RE-SCRAPE]** = vereist live re-scrape om te valideren.

### Fase 1 — Gedeelde var-resolutie-laag (CONTAINED, hoogste leverage) — **[DET]**
**Wat**: één gedeelde resolver vóór persistentie, gevoed door een **volledige** (niet color-gefilterde) `:root`/`*`-var-map uit `allCss`, toegepast op `typographyByRole`, `buttonStyles` én `components` vóór de `JSON.stringify`-persist (`analysis-engine.ts:818-847`). De resolver-logica bestaat al (`resolveFontSizeValue`/`resolveFontFamilyValue`/`button-extractor.resolveVar`) — alleen niet bedraad naar de profiel-extractors.
**Dekt symptomen**: onopgeloste `var(--bs-*)` in typografie (→ LP-renderer), button-typografie/radius-vars die naar null degraderen, interlinie-regels.
**Risico**: laag — pure functie-bedrading, geen gedragswijziging buiten de resolutie. Fixture-CSS met `:root{--bs-body-line-height:1.5}` + `body{line-height:var(--bs-body-line-height)}` → assert geresolved naar `1.5`. **[DET]**
**Plus** (zelfde fase, `brand-tokens-v4-mappers.ts:473-474`): var-guard + parse op `lineHeight`/`letterSpacing` symmetrisch met `fontSize`/`color`. **[DET]**

### Fase 2 — Centrale framework-default-classifier op extractieniveau (CONTAINED, breedste symptoom-dekking) — **[DET]**
**Wat**: één `isFrameworkDefault(selector|hex, framework)`-gate, toegepast op:
- buttons/componenten: blacklist/penalty op `.wp-block-button`/`.wp-element-button`/`.gform_button`/`.gform_wrapper`/`.has-button-style`/kale `.btn-primary` (`button-extractor.ts:84-102`, `component-extractor.ts`), + confidence-penalty in `computeConfidence` (`component-extractor.ts:637-651`).
- kleuren: hex-vergelijk tegen `FRAMEWORK_COLORS` vóór de detector-push (`analysis-engine.ts:1219`) én op de `:root`-var-route (`buildColorGroups`, `:1231-1238`); identiek aan default → drop of `confidence:'low'`+neutral.
- spacing: geef `$` mee aan `extractSpacingElevationProfile` (`url-scraper.ts:349`) + DOM-presence-filter analoog aan button-extractor.
**Dekt symptomen**: buttons kloppen niet (framework-defaults winnen), WP-componenten @100% confidence, Bootstrap-blauw als primary, spacing/radius uit framework-CSS.
**Risico**: medium — verandert wélke samples winnen; afdekken met fixtures per stack (WP+Bootstrap+Gravity). **[DET]** voor de gate-logica; **[RE-SCRAPE]** om te bevestigen dat de échte Zwarthout-CTA bovenkomt.

### Fase 3 — Logo-kleur-redding deblokkeren + usage-verifier enforcing maken (CONTAINED) — **[RE-SCRAPE]**
**Wat**: `frameworkHasPrimary`-gate (`analysis-engine.ts:1143-1144`) verfijnen → alleen blokkeren als de framework-primary géén framework-default is (combineer met Fase 2-gate); bij default-primary → logo-extractie draaien en de logo-kleur de PRIMARY-slot geven. Usage-verifier (`analysis-engine.ts:411-420`): entries met `usageEvidence==='none'` én niet logo-gesourced naar `confidence:'low'`+neutral vóór `resolveColors`.
**Dekt symptomen**: geen/verkeerde merk-kleur (Bootstrap-blauw i.p.v. logo-kleur).
**Risico**: medium — raakt welke kleur PRIMARY wordt. **[RE-SCRAPE]** (logo-extractie + screenshot-usage vereisen de live site).

### Fase 4 — Font-fallback via computed-style (vereist scrape-infra) — **[RE-SCRAPE]** — ✅ GEBOUWD (changelog #277)
**Wat**: bij leeg `cssFonts` een computed-style-fallback (`getComputedStyle(body/h1/p).fontFamily`) via de bestaande Playwright/`bulk-computed-styles.ts`-laag; + `--bs-*` toevoegen aan `extractSemanticFonts`-patronen (`url-scraper.ts:1142`). Bij blijvend leeg: expliciete "geen merk-font gedetecteerd"-status i.p.v. AI-fallback-card met valse zekerheid.
**Dekt symptomen**: lege fonts-tabel, "fonts lopen niet lekker".
**Risico**: medium — nieuwe scrape-stap. **[RE-SCRAPE]** (computed-style vereist gerenderde pagina).
**Geïmplementeerd**: `extractSemanticFonts` matcht nu `--bs-headings-font-family`/`--bs-body-font-family` (vanilla system-stack blijft gefilterd); nieuwe `font-fallback.ts` (`hasNoBrandFonts`/`shouldTryHeadless`/`planHeadlessMerge`/`selectDetectedFontNames`) → headless-trigger vuurt óók op lege fonts en merget deficiëntie-gestuurd; StyleguideFont-rijen uit échte `detectedFonts` (geen AI-fallback); `FontDisplayCard` toont eerlijke "Not detected — AI suggestion"-state. De computed-style-render zelf is en blijft **[RE-SCRAPE]** (env `BRANDSTYLE_HEADLESS_FALLBACK=1` + echte gerenderde bron — Track A). Bewijs: smoke `phase44-font-fallback` 20/20. Adversariële review: geen CRITICAL, 1 MAJOR + 3 MINOR/NIT gefixt.

### Fase 5 — Kleurcombinaties: model + generatie + UI (FEATURE, grootste scope) — **[DET]** generatie / **[RE-SCRAPE]** end-to-end
**Wat**: `buildColorPairings(resolvedColors)` ná `resolveColors`: PRIMARY/SECONDARY/ACCENT × {NEUTRAL-surfaces, wit/zwart, onderling}, WCAG via bestaande `contrastWithWhite/Black`/`contrastRatio`, AA-filter, rol-label. Persisteer als `colorPairings Json?` op `BrandStyleguide`. UI: `InContextPreview` (`ColorsSection.tsx:241-376`) voeden uit persistente pairings, default open. Generaliseer `enforceOnColorPairs` foreground-kandidaten van {wit,zwart} naar de hele palette.
**Dekt symptomen**: geen kleurcombinaties (#1).
**Risico**: hoog (nieuw model + migratie + UI). Generatie-functie zelf is **[DET]** (palette-fixture → assert pairs); end-to-end **[RE-SCRAPE]**.

### Fase 6 — Display-hardening + dead-code (CONTAINED, geen extractie-werk) — **[DET]**
**Wat**: (a) `ScrapedButtonProfilePreview.tsx:169-173` — gefabriceerde CTA-tekst vervangen door de echte scraped sample-tekst of neutrale "Button"-placeholder; (b) Brand-font-cards (`TypographySection.tsx:731-744`) dezelfde "niet gedetecteerd"-state geven als `fonts.length===0`; (c) var()-guard in de spec-kolom/inline-CSS als defensie; (d) **dead code `StyleGuideViewer.tsx`/`BrandstyleView.tsx`** verwijderen of expliciet markeren om foutieve fixes te voorkomen.
**Dekt symptomen**: gefabriceerde CTA-tekst, valse font-zekerheid.
**Risico**: laag — geïsoleerde UI. **[DET]**.

---

## 4. Symptoom → fix → verwacht resultaat

| Symptoom (user) | Fix (fase) | Verwacht resultaat | Validatie |
|---|---|---|---|
| Geen kleurcombinaties | Fase 5: pairing-model + `buildColorPairings` + UI uit collapsed mock | Persistente, WCAG-geverifieerde fg/bg-combinaties zichtbaar in styleguide | [DET] generatie / [RE-SCRAPE] e2e |
| Buttons kloppen niet met de site | Fase 2 (framework-gate + DOM-filter + confidence-penalty) + Fase 6a (echte CTA-tekst) | Echte merk-CTA wint van WP/Bootstrap/Gravity-defaults; preview toont werkelijke knoptekst | [DET] gate / [RE-SCRAPE] juiste CTA |
| Fonts lopen niet lekker (0 fonts) | Fase 4 (computed-style-fallback + `--bs-*` in semantic-fonts) + Fase 6b (eerlijke font-state) | Echt gerenderde font of eerlijke "niet gedetecteerd"-status i.p.v. lege tabel/AI-gok | [RE-SCRAPE] |
| Interlinie/typografie-regels ontbreken (`var(--bs-*)`) | Fase 1 (gedeelde var-resolver + `toRoleEntry` line-height-guard) | Concrete line-height/font-size/-family in `typographyProfile` → LP-renderer; geen onopgeloste var() | [DET] |
| Framework-default-componenten winnen (@100% confidence) | Fase 2 (confidence-penalty + selector-blacklist) + Fase 3 (logo-redding, usage-enforce) | Framework-defaults gedeprioriteerd; merk-componenten/-kleuren bovenaan | [DET] confidence / [RE-SCRAPE] kleur+logo |

**Hoogste-leverage volgorde**: Fase 1 + 2 eerst — beide CONTAINED, deterministisch testbaar, en samen dekken ze de buttons-, typografie-, component- én spacing-symptomen (de hele B/C/E-cluster) plus de var()-vervuiling richting renderer. Fase 3+4 vergen live re-scrape maar zijn nodig voor de kleur- en font-symptomen die alleen op de echte site reproduceren. Fase 5 (combinaties) is de grootste maar meest geïsoleerde feature-toevoeging. Fase 6 is laag-risico parallel werk.

**Belangrijkste cross-check-correcties die het plan sturen**: (1) de var()-impact zit op de **LP-renderer**, niet op de zichtbare Type Scale (`typeScale` is AI-gemapt uit var-resolvende `fontSizes`) — Fase 1 verbetert dus primair de gegenereerde landingspagina's, niet de styleguide-Type-Scale-weergave; (2) fixes moeten in de **live** `BrandStyleguidePage`, niet in de dode `StyleGuideViewer.tsx`; (3) de archetype→COMMERCIAL-faalmodus treedt alleen op bij óók-lege `brandName`.

**Relevante bestanden**: `src/lib/brandstyle/{url-scraper,typography-extractor,button-extractor,component-extractor,spacing-elevation-extractor,analysis-engine,analysis-prompts,framework-detectors,semantic-role-resolver,playwright-fallback,multi-page-scraper}.ts`, `src/lib/landing-pages/{brand-tokens-v4-mappers,infer-layout-style,ensure-archetype,ensure-layout-style}.ts`, `src/features/brandstyle/components/{ColorsSection,TypographySection,ComponentsSection}.tsx` + `components-section/{ScrapedButtonProfilePreview,ComponentCard}.tsx` + `brand-assets/FontsGrid.tsx`, `prisma/schema.prisma`.
