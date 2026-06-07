# Audit — archetype-presets vs. scraped data in de LP-renderer (2026-06-07)

**Aanleiding**: de LP-CTA-knop was niet conform de brandstyle button-component. Het
patroon: een **accurate scraped bron** (StyleguideComponent BUTTON-card, computed-
style) bestond wél, maar de renderer gebruikte **archetype-presets / profile-
defaults**. Vraag: ontstaan er meer van dit soort inconsistenties door (verkeerde)
archetype-presets?

**Methode**: per visuele dimensie nagegaan of de renderer een beschikbare scraped/
component-bron negeert ten gunste van een preset, via `puck-config.tsx`,
`brand-tokens.ts` en de v4-mappers.

## Classificatie

| Klasse | Betekenis | Dimensies |
|---|---|---|
| 🔴 ZELFDE BUG | preset overschreef beschikbare accurate scraped data | **Buttons** (opgelost) |
| 🟡 LATENT | accurate card gemapt maar (nog) geen render-surface | FORM_INPUT, STATUS_CHIP |
| 🟢 GEZOND | scraped wint, preset = fallback | typografie-fonts, type-scale, sectie/card-padding, kleuren, elevation/radius, product-card/nav/quote/feature-icon |
| ⚪ ARCHETYPE-ONLY | geen scraped equivalent — design-by-archetype (wél gevoelig voor mis-classificatie) | hero-layout (full-bleed vs solid), tekst-uitlijning/positie, image-strategy/placeholder, hover-style, label/eyebrow-font |

## Bevindingen

### 1. Buttons — 🔴 → OPGELOST
`tokens.button` werd afgeleid uit de ruwe `buttonProfile`-CSS (pakte de kleur-only
`.btn.state-primary`; geometrie verloren aan archetype-presets: radius 6 / sans /
600 i.p.v. de échte radius 0 / 700 / 2px-border). De accurate `StyleguideComponent`
BUTTON-card werd genegeerd. **Fix**: `reconcileButtonWithComponent` (card wint per
veld) + `resolveCtaVisual` (outline vs filled) + `contrastRatio`-normalisatie.

### 2. FORM_INPUT-card — 🟡 LATENT (zelfde klasse, wacht op surface)
`tokens.styleguideComponents.FORM_INPUT` wordt **gemapt maar nooit geconsumeerd**
door de renderer (0 usages). De LP rendert vandaag geen form/input, dus geen
zichtbare bug — maar zodra er een e-mail-capture/contactform in de LP komt, gebruikt
die generieke presets i.p.v. de scraped input-stijl. Better Brands HÉÉFT een
FORM_INPUT-card. **Aanbeveling**: bij het toevoegen van formulieren in de LP de
FORM_INPUT-card bedraden zoals BUTTON.

### 3. STATUS_CHIP — 🟡 geen surface → prima.

### 4. Hero-layout / image-strategy — ⚪ ARCHETYPE-ONLY (de échte resterende risico)
`heroLayout.background` (full-bleed vs solid-brand vs solid-surface),
tekst-uitlijning/verticale-positie, placeholder-stijl en hover-style komen uit
`computeBrandRenderHints(archetype)`. Er is **geen scraped equivalent** → dit is
design-by-archetype. MAAR: merken met een **null/verkeerd geclassificeerd archetype**
(bv. Napking, DTS Ede = archetype `null` → default-archetype) krijgen een generieke/
arbitraire hero-layout + hover + label-font. Dit is precies het "verkeerde
archetype-preset"-risico — geen data-genegeerd-bug, maar een classificatie-
afhankelijkheid. **Aanbeveling**: (a) archetype altijd classificeren (fallback-
heuristiek), en/of (b) de hero-image-strategy afleiden uit de aanwezigheid van
scraped `photographyStyle` / `visualLanguage.heroPattern` i.p.v. puur archetype.

### 5. Label/eyebrow-font — 🟡 klein
Eyebrows/meta gebruiken altijd `ds.typography.label.fontFamily` (preset); er is geen
scraped "label"-rol. Mogelijk klein mismatch. Lage prioriteit.

### 6. Interne hero/slot-CTA-consistentie — OPGELOST
De hero-CTA mengde bronnen (`hints.buttonStyle` voor gewicht/padding/letterspacing,
`tokens.button` voor radius). Nu volledig één bron (`tokens.button`) + gedeelde caps.

## Geverifieerd GEZOND (scraped wint, preset = fallback)
- Heading/body-font: `tokens.headingFont/bodyFont` (scraped) → preset alleen bij geen custom font.
- Type-sizes/weights: `tbr.* ?? preset`.
- Sectie- + card-padding: `tokens.sectionRhythm` (scraped-aware) overal.
- Kleuren: WCAG-gated scraped roles.
- Cards/nav/quote/feature-icon: `styleguideComponents.*` direct geconsumeerd.

## Conclusie
De **button** was het enige geval waar een preset een beschikbare accurate scraped
bron actief overschreef — nu opgelost. De resterende preset-afhankelijkheid is
**structureel** i.p.v. data-genegeerd: (1) FORM_INPUT is een latente herhaling die
wacht op een form-surface, en (2) de archetype-gedreven hero/hover/label-keuzes zijn
zo goed als de archetype-classificatie — null/verkeerd archetype → generieke presets.

## Open vervolg-tickets
- **AP-1** (M): FORM_INPUT-card bedraden zodra LP-formulieren bestaan.
- **AP-2** (M): archetype-fallback-classificatie zodat null-archetype-merken geen generieke hero/hover krijgen.
- **AP-3** (S): hero-image-strategy afleiden uit scraped photography/visualLanguage i.p.v. puur archetype.
- **AP-4** (S): overweeg een scraped "label/eyebrow"-typografie-rol.
