# Web-page builder — component author guide

Hoe je een nieuw brand-aware Puck-component toevoegt aan de Branddock
landing-page builder. Volgt het patroon van de 8 bestaande components
in `puck-config.tsx` (BrandHero / BrandCTA / FeatureGrid / Testimonial /
PricingTable / FAQ / Footer / RichText).

Doelgroep: Branddock-developer die de builder wil uitbreiden met een
nieuw component-type. Werk in `branddock-feat-web-page-builder-canvas`
worktree of opvolger.

---

## 5-stappenplan voor een nieuw component

### 1. Definieer de props-type (`puck-config.tsx`)

Voeg bovenaan `puck-config.tsx` een prop-interface toe:

```ts
export type StatBlockProps = {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'flat';
};
```

Voeg het toe aan `SpikePuckProps`:

```ts
export type SpikePuckProps = {
  BrandHero: SpikeBrandHeroProps;
  // ... bestaande components
  StatBlock: StatBlockProps;
};
```

### 2. Schrijf de component-builder-functie

Onder de bestaande `richTextComponent` voeg toe:

```tsx
function statBlockComponent(tokens: BrandTokens) {
  return {
    fields: {
      label: { type: 'text' as const },
      value: { type: 'text' as const },
      trend: {
        type: 'select' as const,
        options: [
          { label: 'Stijgend', value: 'up' },
          { label: 'Dalend', value: 'down' },
          { label: 'Stabiel', value: 'flat' },
        ],
      },
    },
    defaultProps: {
      label: 'Metric',
      value: '100',
      trend: 'flat' as const,
    },
    render: ({ label, value, trend }: StatBlockProps) => (
      <div
        style={{
          padding: 24,
          textAlign: 'center',
          fontFamily: tokens.bodyFont,
        }}
      >
        <div
          style={{
            fontFamily: tokens.headingFont,
            fontSize: 36,
            color: tokens.primaryHex,
            fontWeight: 700,
          }}
        >
          {value}
        </div>
        <div style={{ color: tokens.neutralHex, fontSize: 14 }}>
          {label}
          {trend === 'up' ? ' ↑' : trend === 'down' ? ' ↓' : ''}
        </div>
      </div>
    ),
  };
}
```

**Convention**:
- Component-functie heet `<lowercaseName>Component(tokens)`.
- Brand-tokens via closure-capture — nooit als prop (Puck's field-types
  ondersteunen geen complex-object inputs schoon).
- Inline styling via `style={{...}}` (Tailwind 4 purge issue + custom
  per-component sizing). Geen utility-classes.
- Persona/Product-pickers: gebruik `type: 'select'` met
  `personaOptions` array (niet `type: 'external'` — bug in Puck v0.21.2,
  zie `docs/audits/puck-external-field-typing-issue.md`).

### 3. Registreer in `buildSpikePuckConfig`

In het `components: { ... }` object onderaan:

```tsx
return {
  components: {
    BrandHero: brandHeroComponent(tokens),
    // ... bestaande
    StatBlock: statBlockComponent(tokens),
  },
};
```

### 4. Voeg toe aan AI-text-fields registry (optioneel)

Als je component tekstvelden heeft die door component-level AI-edit
(shorten/formal/casual/alternatives) bewerkbaar moeten zijn, voeg toe
aan `TEXT_FIELDS_BY_TYPE` in `src/app/api/landing-pages/component-edit/route.ts`:

```ts
const TEXT_FIELDS_BY_TYPE: Record<string, string[]> = {
  BrandHero: ['headline', 'sub', 'ctaLabel'],
  // ... bestaande
  StatBlock: ['label'], // value + trend zijn config, geen rewrite
};
```

Alleen velden in deze lijst worden door de Claude-rewrite endpoint
aangeroepen. Config-velden (select / number) blijven onaangeroerd.

### 5. Voeg toe aan template(s) (optioneel)

Als je component standaard in een per-type template moet zitten, voeg
toe aan `puck-templates/<type>.ts` + `template-helpers.ts`:

```ts
// template-helpers.ts
export function defaultStatBlock(_f: FilledFields) {
  return instance('StatBlock', {
    label: 'Tevreden klanten',
    value: '500+',
    trend: 'up',
  });
}

// puck-templates/landing-page.ts (bv. tussen FeatureGrid en CTA)
export function buildLandingPageTemplate(filled, ctx) {
  return {
    root: { props: {} },
    content: [
      defaultBrandHero(filled),
      defaultFeatureGrid(filled),
      defaultStatBlock(filled),  // ← nieuw
      defaultBrandCta(filled, ctx),
      defaultFaq(filled),
      defaultFooter(filled, ctx),
    ],
  } as SpikeData;
}
```

---

## Smoke-test toevoegen

Phase-2 smoke (`scripts/smoke-tests/web-page-builder-phase2.ts`) heeft
een `expected` array van component-names — voeg `'StatBlock'` toe + een
render-check in `testRenderInjections`:

```ts
{
  name: 'StatBlock',
  props: { label: 'Klanten', value: '500+', trend: 'up' },
  expectedSubstrings: ['Klanten', '500+', tokens.primaryHex],
},
```

Run de suite:
```bash
npm run smoke:web-page-builder
```

Alle 7 phase-smokes moeten groen blijven (totaal nu 279 + jouw nieuwe
assertions).

---

## Wat te vermijden

| Fout | Reden |
|---|---|
| `style={{ minHeight: 0 }}` ipv `min-h-0` class | Tailwind 4 purge weert deze; inline-styling is workaround per CLAUDE.md |
| Brand-tokens lezen via React context | `buildSpikePuckConfig` doet al closure-capture — geen extra hook nodig |
| `<img>` zonder `loading="lazy"` | Render-route is ISR-cached; alle off-screen images moeten lazy |
| Tailwind utility-classes in render | Render moet werken in zowel Puck-editor als publieke Render-route; bundle bevat geen Tailwind-runtime |
| `any` type in props | TypeScript strict — gebruik discriminated-union of `unknown` |
| `external` field-type voor pickers | Bug in Puck v0.21.2; gebruik `select` of vraag een wrap-component aan |

---

## Bestand-overzicht

```
medium/
├── puck-config.tsx              # Component registry + render functions
├── puck-templates/              # Per-type starter trees
│   ├── index.ts                 # resolveTemplateBuilder dispatcher
│   ├── template-helpers.ts      # default<Component> factories
│   ├── landing-page.ts          # 5-component starter
│   ├── product-page.ts          # 6-component starter
│   ├── faq-page.ts              # 4-component starter
│   ├── comparison-page.ts       # 6-component starter
│   └── microsite.ts             # 7-component starter
├── PuckPageBuilder.tsx          # Main component (Step 3 Medium-renderer)
├── ComponentDiffPreviewModal.tsx # Component-level diff-preview (Laag 2)
├── PageDiffPreviewModal.tsx     # Page-level diff-preview (Laag 3)
└── variant-to-puck-data.ts      # Step 2 → SpikeData seed-mapper
```

Cross-refs:
- ADR: [`docs/adr/2026-05-22-landing-page-builder-architectuur.md`](../../../../../../docs/adr/2026-05-22-landing-page-builder-architectuur.md)
- MVP task: [`tasks/web-page-builder-canvas-step-mvp.md`](../../../../../../tasks/web-page-builder-canvas-step-mvp.md)
- Brand-tokens util: [`src/lib/landing-pages/brand-tokens.ts`](../../../../../lib/landing-pages/brand-tokens.ts)
- AI-instruction registry: [`src/lib/landing-pages/ai-edit-instructions.ts`](../../../../../lib/landing-pages/ai-edit-instructions.ts)
