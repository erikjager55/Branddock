# LP render-pipeline analyse — Napking (end-to-end)

> Datum: 2026-06-04 · Aanleiding: LP-design oogt slecht (CTA, trust-sectie, witruimte). User-verzoek: diepgaande analyse website → brandstyle → render → gap → verbeterplan.

## TL;DR

De LP rendert slecht om **twee onafhankelijke redenen**:

1. **Garbage in (primair)** — `napking.nl` is een **leeg WordPress-placeholdersite** (Twenty Twenty-Five default theme, "Hello world!"-content). De brandstyle is gebouwd op WordPress-defaults, niet op een echt merk-design. Geen echte buttons, geen echte spacing/radius, default-kleuren.
2. **Renderer degradeert niet netjes (secundair)** — zelfs met minimale/garbage brand-data gebruikt de renderer agressieve archetype-**presets** (MINIMAL) i.p.v. de scraped waarden, en accepteert hij een garbage button-profiel. Resultaat: giant button, scherpe hoeken, uppercase, enorme witruimte.

---

## Laag 1 — Website (napking.nl)

WebFetch 2026-06-04: **WordPress Twenty Twenty-Five default install**, placeholder-content ("Blog", "Hello world!", "Welcome to WordPress. This is your first post."). Navigatie = platte tekst-links, **geen echte CTA-buttons**. Geen merk-design aanwezig om te extraheren.

## Laag 2 — Gegenereerde brandstyle (scrape 2026-06-03)

Weerspiegelt de placeholder-bron:

| Aspect | Waarde | Oordeel |
|---|---|---|
| `buttonProfile` primary | `{background:"#fff0" (transparant), paddingX:"0", paddingY:"0", borderRadius:null, border:null, textTransform:"none"}` | **Garbage** — kaal `<button>`-reset, geen echte CTA |
| Kleuren | #7A00DF `unused,wordpress-default` · #007CBA `admin,backend` · #1A171B `text` · #008ACF `cta,buttons,interactive` · #EEEEEE `backgrounds` | Mix van WP-defaults + enkele plausibele (blauw #008ACF getagd als CTA) |
| `spacingScale` (scraped) | `[1.6, 4, 6.6, 8, 12, 16]`, gridBase 8 | **Klein/tight** — maar wordt genegeerd door renderer |
| `radiusProfile` | volledig leeg (`[]`) | Geen radius-signaal (default-theme of scrape-miss) |
| archetype / layoutStyle | CARETAKER / MINIMAL (inferred) | Drijft de presets hieronder |
| font | effra | — |

## Laag 3 — Gerenderde LP

- **CTA**: garbage button-profiel → transparante/onzichtbare button (baseline), of na fill-fix een **giant blauw blok** (96px padding) + scherp + uppercase.
- **Trust-sectie**: 5 overmaatse koppen los onder elkaar, enorme witruimte.
- **Kleur-inconsistentie**: hero-CTA blauw (`tokens.brand`) vs final-CTA zwart (`tokens.onSurface`).

---

## Gap-analyse: brandstyle → render

De renderer gebruikt **archetype/layout-PRESETS** i.p.v. de scraped brand-waarden:

1. **Preset-over-scrape (spacing)** — `pickButtonStyle` + sectie-rendering gebruiken `designSystem.spacing` (MINIMAL-preset `[4,8,16,24,48,64,96,128,160]`), NIET de scraped `spacingScale` (`[1.6..16]`). Gevolg: button `paddingX = spacing[6] = 96px` → giant blok; secties 96–160px → leegte. *(`brand-render-rules.ts:270-271`, `design-system.ts:27`)*
2. **Preset-over-scrape (radius)** — MINIMAL `radius.button = 0` → scherpe hoeken, ook al is dat niet vastgesteld voor het merk. *(`design-system.ts:278`)*
3. **Preset-over-scrape (textTransform)** — CARETAKER → `textTransform:"uppercase"`, terwijl de scrape `"none"` zegt. *(`brand-render-rules.ts:265`)*
4. **Geen garbage-detectie** — een button-profiel met transparante bg + padding 0 + geen radius/border wordt als echte "primary" geaccepteerd i.p.v. genegeerd → alle button-tokens worden afgeleid van rommel. *(`brand-tokens-v4-mappers.ts:pickPrimaryButton`)*
5. **Getagde CTA-kleur ongebruikt** — #008ACF is getagd `cta,buttons` maar de renderer leidt de button-kleur NIET af van die tag; hij gebruikt `buttonProfile.background` + fallback `tokens.brand`.
6. **Dubbel button-systeem** — hero-CTA gebruikt `buttonStyle` (archetype-hints), final-CTA gebruikt `tokens.button` (scraped) → inconsistente kleur/grootte tussen twee CTA's op dezelfde pagina.

---

## Verbeterplan

### Track A — Data-kwaliteit (de echte root)
- **A1** Bevestig de bron: `napking.nl` is een WP-placeholder → de brandstyle is betekenisloos. Opties: (a) scrape de échte Napking-site als die elders live is, (b) her-genereer brandstyle wanneer de site af is, (c) zet kleuren/fonts/buttons handmatig via de styleguide-editor.
- **A2** Scrape-kwaliteitsguard: detecteer een low-signal/default-CMS-scrape (WP default theme, `unused,wordpress-default`-kleuren, garbage buttonProfile) → waarschuw de user dat de brandstyle onbetrouwbaar is i.p.v. stilzwijgend een slechte LP te bouwen.

### Track B — Renderer robuustheid (graceful degradation)
- **B1** Garbage-button detectie in `mapButtonTokens`: button met (transparant/leeg bg) + (padding 0) + (geen radius/border) → behandel als "geen button" → archetype-defaults. *(was deels mijn #6-instinct; nu op de juiste laag + data-onderbouwd)*
- **B2** Button-kleur uit getagde kleur: gebruik de kleur getagd `cta`/`buttons` voor CTA-fill, consistent voor hero + final. Valt terug op `tokens.brand` als geen tag.
- **B3** Unificeer hero + final CTA op één button-token-bron (tokens.button) → consistente kleur/vorm.
- **B4** Tem de MINIMAL-spacing voor content-secties: cap sectie-padding + button-padding op redelijke maxima (button-padding-cap is al toegepast 2026-06-04).
- **B5** Radius-default wanneer `radiusProfile` leeg is: niet automatisch 0 (scherp) aannemen; gebruik een neutrale default (bv. 6–8px) tenzij scherp is vastgesteld.
- **B6** Prefereer scraped `spacingScale` boven het layout-preset waar beschikbaar (de scrape ving Napking's echte tight spacing — die wordt nu weggegooid).

---

## Tweede testklant — Zwarthout (echte-site-verificatie 2026-06-04)

Les uit Napking toegepast: deze keer de **echte website** (WebFetch zwarthout.com) vergeleken met scrape én render. User-bevindingen bevestigd op elk punt.

**zwarthout.com (echt)**: zwart/houtskool (Shou Sugi Ban) + wit + houttinten. **Geen teal/groen.** Donkere, licht-afgeronde buttons (geen pill), title-case ("Request quote", "Order a sample box"). **Grote hero-foto** (Brandmeester Jan bij vuur). **Effen witte achtergrond, geen textuur.** Ingetogen koppen (niet oversized).

**Scrape pakte**: WordPress-default button `.wp-block-button__link` (`borderRadius: 9999px` pill, `#32373c`) + Gravity-Forms oranje `#ea5b0c`; Bootstrap-default kleuren (#0D6EFD etc.). Framework-ruis als merk-design.

**LP rendert**: gigantische **teal** koppen, pill-buttons, **achtergrond-textuur**, **geen header-beeld**.

### Extra root-causes (bovenop Napking-gap)
- **R7 — App-kleur lekt in klant-LP (kritiek)**: `tokens.brand = pickBrand(colors)?.hex ?? DEFAULT_BRAND_TOKENS.brand`, en `DEFAULT_BRAND_TOKENS.brand = '#1FD1B2'` (= Branddock's eigen teal). `pickBrand` gaf null voor Zwarthout → klant-LP krijgt Branddock's huisstijl-kleur. *(brand-tokens.ts:308 default, ~771 pickBrand-fallback)*
- **R8 — Framework-default-ruis ongefilterd**: WordPress/Bootstrap-defaults (`.wp-block-button__link` pill, Bootstrap-palette, `wordpress synced-block`) worden als merk-tokens overgenomen. Geen CMS-default-filter in de scrape/extractie.
- **R9 — Renderer verzint visuals**: `background-textures.ts` legt een patroon/textuur op die niet uit de scrape komt (echte site = effen wit).
- **R10 — Hero-image niet default**: echte site heeft prominente hero-foto; LP rendert zonder beeld. `usePlaceholderFrame`/`useFullBleed` afhankelijk van `heroVisualUrl` die leeg is; mandatory-header-image-feature vuurde niet op deze (bestaande) deliverable.
- **R11 — Display-type-scale te groot**: koppen vullen het hele viewport vs ingetogen echte typografie.

### Herzien plan-accent
De meta-fix: **grond alles in de echte site + degradeer veilig**. Concreet bovenop B1-B6:
- **B7 (kritiek)** — `pickBrand` faalt → NIET terugvallen op `DEFAULT_BRAND_TOKENS.brand` (Branddock-teal). Gebruik een neutrale, uit-de-scrape-afgeleide kleur (donkerste/meest-frequente niet-default kleur) of een grijswaarde, en/of flag voor handmatige input. Nooit de app-huisstijl in een klant-LP.
- **B8** — CMS/framework-default-filter: negeer WordPress/Bootstrap-default selectors+kleuren (`.wp-block-button__link`, `wordpress synced-block`, Bootstrap-palette-hexes) bij token-extractie.
- **B9** — achtergrond-textuur alleen wanneer de scrape die aantoont; default = effen surface.
- **B10** — hero-image standaard afdwingen/genereren (R10) — herbevestigt de mandatory-header-image-feature, ook voor bestaande deliverables.
- **B11** — display-font-size cappen op ingetogen max.

### Volgorde-advies
A1 eerst (zonder echte bron is élke render-fix lippenstift op een placeholder). Parallel B1–B3 (grootste zichtbare winst: CTA consistent + zichtbaar). B4–B6 daarna (layout-dichtheid). Elke B-stap los verifiëren met hard-reload.

---

## Deep-research synthese (4 parallelle agents, 2026-06-04)

Volledige pipeline uitgespit (scrape → brandstyle → tokens → render → presets). Meta-root-cause: **de pipeline behandelt CSS-tekst-aanwezigheid als bewijs van merk-design, heeft geen confidence-gating op de faal-gevoelige velden (button/radius/spacing/kleur), valt bij zwakke extractie terug op Branddock's eigen merk-identiteit + archetype-presets, en de renderer verzint visuals die niet in de bron staan.**

### Laag 1 — Scrape/brandstyle (bevestigd)
- Button-selectie = pure CSS-keyword-regex zonder prominentie/CTA/zichtbaarheid-ranking; `.wp-block-button__link` + Bootstrap-classes zijn first-class kandidaten (`button-extractor.ts:78-92`). `classifyButtonRole` → elke solid-bg = "primary"; `pickPrimaryButton` = eerste-match + cross-sample merge → WP-pill lekt in (`brand-tokens-v4-mappers.ts:89-124`).
- `BOOTSTRAP_DETECTOR` promoot `--bs-primary` naar high-confidence PRIMARY ook als ongewijzigde default (`framework-detectors.ts:272-305`) — bron van "teal/blauw die er niet is".
- `usageEvidence` (screenshot-verifier, de sterkste anti-ruis-signal) wordt berekend maar **nergens downstream geconsumeerd** (`analysis-engine.ts:392-427`).
- Buttons/radius/spacing-profielen dragen **geen confidence** — precies de faalpunten.
- Echte CTA-tekst/-prominentie + hero-image worden nooit betrouwbaar gevangen. Gemini-fallback → lege CSS-shell → renderer valt op presets zonder low-confidence-markering.

### Laag 2 — Token-extractie (bevestigd: teal-lek)
- `brand = pickBrand(colors)?.hex ?? DEFAULT_BRAND_TOKENS.brand` met default `#1FD1B2` = **Branddock's eigen app-teal** (`brand-tokens.ts:770-771, 307`). `pickBrand` geeft null als er geen PRIMARY/ACCENT-kleur is — en de analyzer zet low-confidence/ongebruikte (Bootstrap-default) kleuren op NEUTRAL (`analysis-prompts.ts:110,183`) → geen PRIMARY → teal-lek.
- **`DEFAULT_BRAND_TOKENS` vermengt neutrale defaults met Branddock-merk-waarden.** De drie gevaarlijke lek-tokens: `brand` (#1FD1B2), `brandSubtle` (#E6F9F5 teal-wash), `accent` (#F59E0B amber).
- CTA-getagde kleur wordt nergens voor de button-fill gebruikt; `action = brand` blind (`brand-tokens.ts:1079`).
- `brand`-fallback negeert reeds-gevonden accent (Zwarthout-oranje beschikbaar, brand werd toch teal).
- COMMERCIAL/PLAYFUL alternation-preset opent met `brand`-bg → hele sectie teal (`design-system.ts:315,321`). Typografie-presets injecteren vreemde fonts (Cormorant/Playfair/Nunito) bij missend profiel.

### Laag 3 — Render (verzonnen visuals)
- Hero-headline tot **272px**, geen absolute max-cap (`puck-config.tsx:654-658,759-767`; EXPERIENTIAL display-scale `design-system.ts:207`).
- Achtergrond grain/mesh-textuur is **puur archetype-driven, nooit scraped** (`background-textures.ts:84-99`); FeatureGrid past 't onvoorwaardelijk toe (`puck-config.tsx:1003-1016`).
- Hero-image: geen `<img>`-pad zonder `heroVisualUrl`; generator vult 'm nooit ("placeholder voor v2", `variant-generator.ts:273`); auto-gen vuurt alleen in `handleChooseVariant`-pad (`LandingPageGenerateBlock.tsx:388`).
- Feature/trust body-tekst = `surfaceMuted` op lichte card → onleesbaar; geen contrast-enforcement (`puck-config.tsx:1009,1161`).
- Hero-CTA vs final-CTA = divergente fallback-ketens (`heroIsDark` vs `isVibrantSaturatedColor`) → andere kleur/vorm.
- Trust rendert als FeatureGrid-h3 (56-80px koppen), geen cap (`landing-page-from-structured.ts:49-59`).

### Laag 4 — Presets (preset-over-scrape)
- **Alleen `spacing` heeft een scrape-override en die is buggy**: px/rem-heuristiek misclassificeert `[1.6,4,6.6,8,12,16]` als rem → ×16 (`brand-tokens.ts:894-901`). `radius` + `typography` hebben **geen** scrape-override → altijd preset.
- `pickButtonStyle` negeert scraped button-tokens volledig: `paddingX=spacing[6]` (MINIMAL=96px giant), `radius=radius.button` (MINIMAL=0), `textTransform=archetype` (uppercase) (`brand-render-rules.ts:253-277`).
- Hero gebruikt preset `buttonStyle` (padding/radius/letterSpacing) terwijl StickyCtaBar/CtaBlock scraped `tokens.button` gebruiken → Hero inconsistent. Hero section-padding = pure preset 128px terwijl andere secties `sectionRhythm` gebruiken (`puck-config.tsx:407`).
- Banner/label-textTransform default uppercase, hardcoded in elke preset + `DEFAULT_BRAND_TOKENS` (`design-system.ts:138..`, `brand-tokens.ts:396`).

> Implementatieplan: zie het bijbehorende plan-doc (plan-mode 2026-06-04).

## Reeds toegepast (branch `fix/lp-smoke-bugs`, 2026-06-04)
- Transparante-hex (`#fff0`) → null (B1 deel) · hero-CTA `textTransform` uit tokens.button (B3 deel) · button-padding-cap (B4 deel). **Nog te verifiëren / mogelijk te consolideren onder het bredere plan.**
