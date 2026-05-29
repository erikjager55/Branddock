# Brand-styling consistency + WCAG-compliance plan

> **Doel**: van "ongeveer brand-kleuren" naar klant-specifieke stijl-DNA-uitvoering die aan WCAG voldoet in alle gegenereerde landing-pages (en bij uitbreiding alle gegenereerde content).
>
> **Aanleiding**: browser-smoke LINFI 2026-05-26 toonde Step 3 landing-page render in goud-zwaar palet terwijl linfi.nl een minimalistisch wit-zwart premium look heeft. Plus contrast-issues — goud op wit faalt WCAG AA 4.5:1 voor body-text.
>
> **Status**: draft 2026-05-26. Spec voedt Sprint 1+ implementatie.

---

## §1 Diagnose — wat ging er mis bij LINFI

| Probleem | Locatie in render | Root-cause |
|---|---|---|
| Goud overal (headings, body, trust-strip, FAQ, impact-stats) | Hele Step 3 pagina | `primaryHex` zonder rol-differentiatie toegepast op tekst-elementen |
| Onleesbaar contrast — goud op wit voor body-text | Trust-strip, problem-bullets, feature-headings, FAQ-vragen, final-CTA | Goud (~3.5:1 op wit) faalt WCAG AA 4.5:1 voor normal text |
| Niet-minimalistische uitstraling — LINFI is wit-zwart premium | Hele pagina | Geen layout-stijl-extractie + render houdt geen rekening met brand-personality |
| Geen typografie-hierarchie matched site-rust | Headings | Font-family toegepast, font-weight/letter-spacing/line-height niet brand-specifiek |
| Hero-visual ontbreekt of generiek | Hero-card | Image-prompt houdt geen rekening met "premium minimal product-photography" |

**Conclusie**: probleem zit in **token-toepassing** (welke kleur waar), niet alleen in token-extractie. Plus ontbrekende layout-stijl als brand-dimensie.

---

## §2 LINFI quick-fix (Sprint 1, parallel met Fase A)

Vóór structureel werk, voor deze klant specifiek:

1. **Audit BrandStyleguide in DB** — verifieer welke kleur als PRIMARY staat gemarkeerd. Verwachting: goud is fout-getagd als PRIMARY terwijl het ACCENT zou moeten zijn. Of: PRIMARY staat correct op wit/zwart maar de render gebruikt verkeerde token. Query: `SELECT name, hex, category, contrastWhite, contrastBlack FROM "BrandColor" WHERE "styleguideId" IN (SELECT id FROM "BrandStyleguide" WHERE "workspaceId" = '<linfi-id>');`
2. **Token-mapping fix in puck-config.tsx** — body-text + headings gebruiken `secondaryHex` (donker) verplicht; `primaryHex` alléén voor CTA-fill + accent-borders. Als `secondaryHex` zelf in DB fout staat: handmatig overrulen.
3. **Per-component token-rules** (zie §3a) als snelle MVP voor de 5 PUCK-types.

Geschatte effort: 0.5 dag handmatige DB-audit + 0.5 dag puck-config refactor.

---

## §3 Structureel plan — 5 fases (cross-client)

### Fase A — Token-role-uitbreiding

Vervang `BrandTokens` met **role-based tokens** ipv kleur-naam-gebaseerd.

```typescript
interface BrandTokens {
  // Surface-roles (page background + tekst-op-page)
  surface: string;            // page background (meestal wit, soms zwart)
  onSurface: string;          // body-text op surface (≥7:1 contrast, AAA)
  surfaceMuted: string;       // sub-text/meta op surface (≥4.5:1, AA)
  surfaceBorder: string;      // dividers, card-borders (≥3:1 non-text)

  // Brand-roles (klant-eigen kleur)
  brand: string;              // primary brand color (CTA-fill, accent-borders)
  onBrand: string;            // text-op-brand (≥4.5:1 op brand)
  brandSubtle: string;        // brand-tint voor backgrounds (≥3:1 met surface)

  // Action-roles (kan == brand, maar niet altijd)
  action: string;             // CTA-fill (default = brand)
  onAction: string;           // CTA-tekst kleur (≥4.5:1 op action)

  // Accent (sparingly used)
  accent: string;              // hover/highlight only — nooit body-text

  // Typografie
  headingFont: string;
  bodyFont: string;
  displayFont: string;         // hero only — optioneel apart van heading
  headingWeight: number;       // 600-800
  bodyWeight: number;          // 400-500
  headingLineHeight: number;   // 1.1-1.3
  bodyLineHeight: number;      // 1.5-1.7
}
```

**Extractie-logica**:
- BrandColor met category=PRIMARY of category=ACCENT met hoogste-confidence → `brand`
- DARKEST kleur (lowest L in HSL) ongeacht category → `onSurface` (voorkomt body-text in brand-kleur)
- LIGHTEST kleur of #FFFFFF default → `surface`
- Brand-color met L>70 OF gemixt met surface → `brandSubtle`
- contrastWhite/contrastBlack uit DB → kies `onBrand` = wit-of-zwart met hoogste contrast

**Per-component token-do/don't matrix**:

| Component-prop | surface | onSurface | surfaceMuted | brand | onBrand | accent |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| BrandHero background | — | — | — | ✓ | — | — |
| BrandHero text | — | — | — | — | ✓ | — |
| BrandHero CTA fill | — | — | — | — | onBrand → wit/zwart inverse | — |
| FeatureGrid card-bg | ✓ | — | — | — | — | — |
| FeatureGrid heading | — | ✓ | — | — | — | — |
| FeatureGrid body | — | — | ✓ | — | — | — |
| Testimonial quote | — | ✓ | — | — | — | — |
| Testimonial author | — | — | ✓ | — | — | — |
| PricingTable border | — | — | — | ✓ (highlighted) | — | — |
| PricingTable text | — | ✓ | — | — | — | — |
| FAQ question | — | ✓ | — | — | — | — |
| FAQ answer | — | — | ✓ | — | — | — |
| BrandCTA fill | — | — | — | ✓ | — | — |
| BrandCTA text | — | — | — | — | ✓ | — |
| Links (in body) | — | — | — | ✓ | — | hover |
| Focus ring | — | — | — | — | — | ✓ |
| Footer text | — | — | ✓ | — | — | — |

**Resultaat voor LINFI**: goud (brand) verschijnt alléén op CTA-fills en focus-ring. Alle body-text/headings/FAQ in `onSurface` (donker) → leesbaar + on-brand minimalisme.

### Fase B — WCAG-gate

BrandColor.contrastWhite + contrastBlack staan al in DB (van scraper). Integreer:

1. **Pre-render validation** in `extractBrandTokensFromStyleguide`:
   - Voor elke role-mapping check `contrastRatio(token, target-bg) >= minRatio(role)`
   - Als brand-color faalt voor non-CTA use → fallback naar onSurface + log warning
2. **Runtime contrast-helper** (`src/lib/landing-pages/wcag.ts`):
   - `contrastRatio(fg: string, bg: string): number` — WCAG 2.1 formula via luminance
   - `meetsWCAG(fg, bg, opts: { level: 'AA' | 'AAA'; size: 'normal' | 'large' }): boolean`
   - Pure functie, smoke-testable
3. **F-VAL judge-dimensie 7 — WCAG-compliance** (uitbreiding op landing-page-quality §4d):
   - Score 0 = >2 elementen onder threshold
   - Score 50 = 1 element
   - Score 100 = 0 violations
   - Gewicht 10% — komt uit andere dimensies (anatomie-completeness 20% → 15%, hero-clarity 20% → 15%)
4. **Brand-onboarding UI** (Brandstyle settings):
   - Bij upload: waarschuwing als kleur < 3:1 op zowel wit als zwart
   - Suggestie: "Deze kleur lijkt op accent geschikt, niet als primary"
   - Mogelijkheid om kleur-rol handmatig te herclassificeren

### Fase C — Layout-style-presets

Vandaag heeft Branddock alleen `BrandPersonality` (archetype). Voeg toe:

**Nieuw veld** op BrandStyleguide:
```prisma
enum LayoutStyle {
  MINIMAL       // veel witruimte, weinig elementen, sterke typografie (Stripe / Linear / LINFI)
  EDITORIAL     // magazine-look, mixed-media, lange copy (Apple / Tesla product)
  COMMERCIAL    // dichte info-grid, conversion-focused (Bol.com / Coolblue)
  EXPERIENTIAL  // story-driven, scroll-animaties (Tony's Chocolonely / Patagonia)
  PLAYFUL       // kleurrijk, illustration-heavy (Notion-marketing)
}

model BrandStyleguide {
  // ...
  layoutStyle LayoutStyle @default(COMMERCIAL)
}
```

**Detectie-heuristieken** in brandstyle-scraper:
- **Density-score** (elementen per viewport-height) — laag = MINIMAL, hoog = COMMERCIAL
- **Color-count** in CSS — ≤3 = MINIMAL/EDITORIAL, ≥6 = PLAYFUL
- **Heading-to-body ratio** — >2x = EDITORIAL, ~1.4x = COMMERCIAL
- **Animation-frequency** (data-aos, framer-motion) — hoog = EXPERIENTIAL
- **White-space-ratio** (negative space % per viewport) — >40% = MINIMAL

**Render-impact** per layoutStyle:
| Element | MINIMAL | EDITORIAL | COMMERCIAL | EXPERIENTIAL | PLAYFUL |
|---|---|---|---|---|---|
| Section padding | 96-128px | 80px | 48-64px | 80px | 64px |
| Hero columns | 1 | 1-2 | 2 | 1 | 1 |
| Max features | 3 | 4 | 5 | 4 | 5 |
| Testimonials | 1-2, static | 1-2, illustrated | 3, grid | 1, fullscreen | 3-4, carousel |
| Pricing | optional | optional | bold + decoy | optional | colorful badges |
| Hero-visual | minimal | editorial-photo | product-shot | story-image | illustration |

### Fase D — Render-rules + auto-iterate integration

Compileer §3a (token-roles) + §3b (WCAG) + §3c (layout-style) in **deterministische render-rules**:

```typescript
type ComponentRenderRule = {
  component: 'BrandHero' | 'FeatureGrid' | 'Testimonial' | ...;
  textElements: Array<{
    prop: string;
    acceptableTokenRoles: Array<keyof BrandTokens>;
    wcagTargetRatio: number;
    fontSize: 'normal' | 'large';
  }>;
  layoutVariants: Record<LayoutStyle, Partial<ComponentProps>>;
};
```

Auto-iterate Phase 6 leest deze rules en evalueert rendered pagina. Bij rule-violation: rewrite-suggestie via Claude met expliciete fix-instructie.

### Fase E — AI brand-fit judge (v2)

Bovenop deterministische rules: **Claude vision-judge** op rendered screenshot.

- **Input**: screenshot van Puck-render + brand-reference (linfi.nl screenshot OR brand-tokens text-summary)
- **Vraag**: "Past dit visueel bij dit merk? 0-100 + 3 concrete pijnpunten als <80"
- **Werkt als 8e F-VAL dimensie** (gewicht 10%, samen met WCAG)
- **Triggert auto-iterate** als score <70

---

## §4 WCAG-integratie — cross-cutting checklist

| WCAG-criterium | Target | Implementatie |
|---|---|---|
| **1.4.3 Contrast (Minimum)** — normal text AA | 4.5:1 | Token-role-gate (§3a) + runtime helper |
| **1.4.3 Contrast (Minimum)** — large text AA | 3:1 | Same (text ≥18px regular of ≥14px bold) |
| **1.4.6 Contrast (Enhanced)** — AAA | 7:1 normal / 4.5:1 large | Optional per-workspace preference |
| **1.4.11 Non-text Contrast** | 3:1 | Border / icon / focus-ring gate |
| **2.4.7 Focus Visible** | ring zichtbaar bij keyboard-nav | Puck-component focus-style met `accent` (≥3:1) |
| **1.4.4 Resize Text** — 200% zoom | tekst leesbaar | Tailwind rem-based, geen absolute px voor text |
| **1.3.1 Info and Relationships** | semantische HTML | h1/h2/h3 hierarchy, sectie-tags |
| **2.5.5 Target Size (Enhanced)** | min 44×44px voor touch | CTA-buttons + nav-links |

**Pre-render gate** (server-side, in mapper):
```typescript
function validateWCAG(puckTree: SpikeData, tokens: BrandTokens): WCAGReport {
  const violations: Violation[] = [];
  // Voor elke text-component:
  //   - extract foreground + background uit render-context
  //   - check meetsWCAG(fg, bg, { level: 'AA', size: ... })
  //   - log violation als fail
  return { violations, level: violations.length === 0 ? 'AA' : 'FAIL' };
}
```

**Post-render audit** (optional, dev-only):
- Integreer `axe-core` of `@axe-core/react` in dev-mode
- Niet runtime in productie — alleen ontwikkel-tool

---

## §5 Implementatie-fasering

### Sprint 1 — LINFI quick-fix + Fase A foundation (~1 week)

| Deliverable | Bestanden | Acceptatie |
|---|---|---|
| LINFI DB-audit + handmatige category-corrections | DB (handmatig) | LINFI category-tagging klopt met linfi.nl |
| BrandTokens v2 interface (role-tokens) | `src/lib/landing-pages/brand-tokens.ts` | Type compileert; smoke 10 fixtures |
| extractBrandTokensFromStyleguide v2 | Same file | Returns role-tokens vanuit BrandStyleguide |
| Per-component token-rules in puck-config | `puck-config.tsx` | LINFI render: goud alleen op CTA |
| Smoke phase12 — token-role-rendering | `scripts/smoke-tests/web-page-builder-phase12-token-roles.ts` | 20+ asserts, 0 FAIL |
| Backwards-compat fallback voor oude trees | brand-tokens.ts | Trees zonder role-tokens renderen met defaults |

### Sprint 2 — WCAG-gate + Fase B (~1 week)

| Deliverable | Bestanden | Acceptatie |
|---|---|---|
| Contrast-helper utility | `src/lib/landing-pages/wcag.ts` | Pure fn, 30+ smoke asserts |
| Pre-render WCAG-validation in extractor | brand-tokens.ts | Logged + token fallback bij fail |
| F-VAL judge dimensie 7 | `landing-page-quality.ts` | Composite incorporates WCAG-score |
| Brand-onboarding waarschuwing UI | Brandstyle settings page | Banner bij upload met low-contrast |
| Smoke phase13 — WCAG-gate | `web-page-builder-phase13-wcag.ts` | Tests met failing + passing color-pairs |

### Sprint 3 — Layout-style-presets + Fase C (~1.5 weken)

| Deliverable | Bestanden | Acceptatie |
|---|---|---|
| Prisma migration BrandStyleguide.layoutStyle | schema.prisma | Migration groen, default COMMERCIAL |
| Scraper-detection heuristieken | brandstyle-scraper code | LINFI detect = MINIMAL, Better Brands = ? (manual verify) |
| Layout-variant config per Puck-component | puck-config.tsx | 5 variants × 8 components rendered correct |
| Brand-onboarding UI: layoutStyle override | Brandstyle settings | User kan auto-detected override |
| Smoke phase14 — layout-variants | `web-page-builder-phase14-layout-style.ts` | 40+ asserts, MINIMAL render anders dan COMMERCIAL |

### Fase D + E

V2-werk na pilot-validation van A-C. Documenteer als follow-up task-files:
- `tasks/_drafts/render-rules-auto-iterate.md`
- `tasks/_drafts/ai-brand-fit-vision-judge.md`

---

## §6 Effort + risico

| Fase | Effort | Risico | Mitigatie |
|---|---|---|---|
| A — Token-roles | 1 week | Backward-compat van bestaande puck-data-trees | Fallback in extractor — oude trees krijgen v1 tokens |
| B — WCAG-gate | 1 week | Performance — Color.js library voegt ~30KB toe | Eigen lichte implementatie van WCAG-formula (~2KB) ipv Color.js |
| C — Layout-style | 1.5 week | Scraper-detection accuracy bij ambiguous sites | User-override in onboarding-UI als safety-net |
| D — Render-rules | 1-2 weken | Auto-iterate Claude-calls cost | Rate-limit per workspace + cost-budget alerts |
| E — AI brand-fit | 1 week | Vision-API kosten + latency | Optional opt-in per workspace; alleen voor pilot-klanten |

---

## §7 Cross-references

- **Spec**: voedt deze fases via `docs/specs/web-page-types/landing-page.md` §4d (F-VAL dimensies)
- **Idea-doc**: `tasks/_drafts/brand-styling-consistency-implementation.md` (te schrijven na approval)
- **ADR-kandidaat**: `docs/adr/2026-05-XX-brand-token-role-architecture.md` voor Fase A
- **WCAG-referentie**: [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- **Brandstyle-scraper huidige scope**: `src/lib/brandstyle/analysis-engine.ts`
- **Bestaande F-VAL composite**: `src/lib/brand-fidelity/fidelity-runner.ts`
