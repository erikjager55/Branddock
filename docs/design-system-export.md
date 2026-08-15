# Design System Export

> Universele export-pipeline die Branddock's brand-data naar alle gangbare AI-agent-formaten converteert.
> Geïntroduceerd april 2026 als reactie op Google Stitch's open-sourced `DESIGN.md` spec.

## Motivatie

Voor elke AI coding/design agent (Stitch, Claude Code, Cursor, v0, Figma, shadcn CLI) willen we één export-klik die het juiste bestand levert. In plaats van N exporters hebben we één canonical intern model + een emitter per format.

## Architectuur

```
DB (BrandStyleguide + BrandAsset + Persona + Competitor)
       ↓
Semantic Role Resolver          — src/lib/brandstyle/semantic-role-resolver.ts
       ↓  (persisteert in BrandStyleguide.semanticTokens)
Canonical Model builder         — src/lib/export/design-system/resolver.ts
       ↓
Emitters                        — src/lib/export/design-system/emitters/
  ├ designmd.ts                   → Google Stitch DESIGN.md
  ├ dtcg.ts                       → W3C Design Tokens tokens.json
  ├ tailwind.ts                   → Tailwind theme.extend fragment
  ├ shadcn.ts                     → globals.css CSS-variabelen
  ├ figma-variables.ts            → Figma Variables JSON
  ├ style-dictionary.ts           → Amazon Style Dictionary source
  └ brand-brief.ts                → AGENTS.md-style markdown brief
       ↓
Dynamic route                   — src/app/api/export/design-system/[format]/route.ts
       ↓
UI                              — src/features/brandstyle/components/DesignSystemSection.tsx
                                  — src/features/brandstyle/components/StyleguideHeader.tsx (dropdown)
                                  — src/features/brandstyle/components/SystemRolesSection.tsx (Colors tab)
                                  — src/features/brandstyle/components/SystemScalesSection.tsx (Visual System tab)
```

> **Let op — twee lagen, twee opdrachten.** `buildDesignSystemModel` (deze pijplijn) is de
> **ongegate** assembler voor exports die de gebruiker zelf start. Voor *consumptie* door AI en
> agents bestaat daarnaast `getBrandLibrary` (`src/lib/brand-library/`): dezelfde bron, maar met de
> publish- en save-for-AI-gates en marker-stripping erop. Nieuwe AI-consumers gaan altijd via de
> accessor — directe `prisma.brandStyleguide`-toegang is een lint-fout. Zie
> [`docs/adr/2026-08-14-brand-library-consumption.md`](adr/2026-08-14-brand-library-consumption.md).

## De Semantic Role Resolver

De analyzer detecteert ruwe kleuren/fonts/radii/spacing. De resolver maakt daar semantische rollen van die elk export-formaat kan verbruiken.

### Input (uit de DB)
- `StyleguideColor[]` met category-enum (PRIMARY/SECONDARY/ACCENT/NEUTRAL/SEMANTIC)
- `StyleguideComponent[]` met `extractedStyles` JSON (background, color, borderRadius, padding, ...)
- `BrandStyleguide.typeScale` (array met `level, size, weight, lineHeight`)
- `BrandStyleguide.cornerRadii / spacingScale / shadowSystem` JSON velden

### Output (`BrandStyleguide.semanticTokens` JSON)
```ts
{
  resolved: {
    colors: {
      primary: "#0D9488",        // meest-voorkomende button-bg met hoog contrast
      "on-primary": "#FFFFFF",   // WCAG-safe tekstkleur boven primary
      surface: "#FBF4BC",
      "on-surface": "#1A1C1E",
      outline: "#D1D5DB",
      error: "#DC2626",
      // ... tertiary, secondary, surface-variant, success, warning, info
    },
    typography: {
      "headline-display": { fontFamily, fontSize, fontWeight, lineHeight },
      "headline-lg": {...}, "body-md": {...}, "label-sm": {...},
      // 8-10 roles, deterministisch gemapped uit typeScale
    },
    rounded: { sm: 4, md: 8, lg: 16, full: 9999 },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 48 },
    elevation: { "1": "0 1px 2px rgba(...)", "2": "...", ... },
    componentVariants: {
      "cmoXXX...": "button-primary",
      "cmoYYY...": "button-ghost",
    }
  },
  overrides?: { colors: { primary: "#0D8B7F" } },  // user-set via System Roles UI
  diagnostics: {
    source: { primary: "button-bg 3x", surface: "neutral L=94", ... },
    wcagWarnings: [],
    unresolvedRoles: []
  },
  resolvedAt: "2026-04-24T12:34:56.789Z",
  resolverVersion: "1.0.0"
}
```

### Resolver fases

1. **Color roles**: Frequentie-analyse op component backgrounds → primary. Lichtste NEUTRAL → surface. Contrast-berekening voor on-* pairs.
2. **Typography**: Sorteer typeScale desc op fontSize; top → `headline-display/lg/md/sm`, mid → `body-lg/md/sm`, onder → `label-*`.
3. **Rounded scale**: Cluster observed radii in vaste buckets (none=0, sm=1-5, md=6-10, lg=11-18, xl=19-48, full≥100).
4. **Spacing scale**: Mode-clustering uit component paddings + bestaand `spacingScale` JSON.
5. **Elevation**: Groepeer shadowSystem entries op intensiteit; lege set = border-based site.
6. **Component variants**: Vergelijk button-bg's met primary/secondary/tertiary resolved colors → `button-primary/secondary/tertiary/ghost`.
7. **Diagnostics**: Bron-attributie per rol, WCAG-warnings, lijst unresolved required roles.

## Canonical Model

`src/lib/export/design-system/canonical.ts` definieert `DesignSystemModel` — de superset die alle emitters consumeren:

```ts
interface DesignSystemModel {
  meta: { name, description?, workspaceId, workspaceSlug, generatedAt, resolvedAt?, resolverVersion? };
  colors: Partial<Record<SemanticColorRole, ColorToken>>;
  typography: Partial<Record<TypeRole, TypographyToken>>;
  rounded: Partial<Record<RoundedScale, DimensionToken>>;
  spacing: Partial<Record<SpacingScale, DimensionToken>>;
  elevation: Partial<Record<ElevationLevel, ElevationToken>>;
  components: Record<string, ComponentToken>;
  prose: { overview?, colors?, typography?, layout?, elevation?, shapes?, components?, dosDonts? };
  extensions: {
    voice?:           { principles, writingGuidelines, doSayPhrases, dontSayPhrases };
    imagery?:         { photographyStyle?, photographyGuidelines, illustrationGuidelines, donts };
    iconography?:     { style?, strokeWeight?, cornerRadius?, sizing?, colorUsage? };
    brandFoundation?: {
      assets:      BrandFoundationAssetSummary[];  // alle 12 brand assets
      personas:    PersonaSummary[];                // naam + tagline + traits + goal + quote
      competitors: CompetitorSummary[];             // naam + tier + positioning + differentiators
    };
  };
}
```

## Export endpoints

```
GET /api/export/design-system/designmd         → text/markdown
GET /api/export/design-system/dtcg             → application/json (W3C Design Tokens)
GET /api/export/design-system/tailwind         → application/json (Tailwind theme fragment)
GET /api/export/design-system/shadcn-css       → text/css (globals.css :root block)
GET /api/export/design-system/figma-variables  → application/json (Figma Variables)
GET /api/export/design-system/style-dictionary → application/json (Style Dictionary source)
GET /api/export/design-system/brand-brief      → text/markdown (AGENTS.md brief)

# Intern
GET /api/export/design-system/_model           → canonical model JSON (UI preview)
GET /api/export/design-system/_lint            → LintReport (UI linter panel)
```

Content-Disposition response headers triggeren browser-download met workspace-slug als filename prefix.

## UI integratie

### Colors tab — System Roles
Bovenaan de Colors tab verschijnt een **System Roles** card die de resolved semantic colors toont met:
- Swatch + role-naam + hex + bron-attributie
- WCAG-warning badge als on-pair onder 4.5:1 valt
- "Override" knop per rol → opent `SystemRoleOverrideModal` met color-picker + contrast preview + revert-knop
- ReviewDraftPanel voor `system-roles` review-sectie

### Typography tab — Role labels
Elke type scale row krijgt een subtle teal badge met de DESIGN.md role (`headline-display`, `body-md`, `label-sm`). Mapping komt uit `buildTypeRoleMap()` in `utils/semantic-tokens.ts`.

### Visual System tab — Named scales
Bovenaan een **System Scales** card met drie horizontale strips:
- **Rounded**: visuele hoek-previews per level (none → full)
- **Spacing**: proportioneel gevulde blocks per level (xs → xl)
- **Elevation**: shadow-previews op witte cards per level

### Components tab — Variant grouping
Button-componenten worden gegroepeerd per variant (Primary / Secondary / Tertiary / Ghost / Other). Elke kaart toont een teal badge met de DESIGN.md variant-naam.

### Design System tab (nieuw, 8e tab)
Ontwikkelaar-gerichte overview:
- Canonical model stats (6 kaarten: colors/typography/rounded/spacing/elevation/components counts)
- **Linter panel** met severity-badges + klikbare findings die deep-linken naar bron-tab
- **Export panel** met alle 7 formaten als download + copy-to-clipboard
- **Resolver diagnostics** (collapsible) met WCAG warnings en unresolved roles

### Header dropdown
De "Export" knop in `StyleguideHeader` is uitgebreid met alle 7 DESIGN.md-formats onder een gescheiden sub-sectie, naast de bestaande Styleguide-PDF en Brand Kit ZIP.

## Hoe gebruik je dit?

### Voor een AI coding agent (Cursor / Claude Code / Copilot)
1. Download `brand-brief.md` → plaats als `BRAND.md` in je repo-root
2. Download `designmd.md` → plaats als `DESIGN.md` ernaast
3. Agents lezen beide automatisch als context

### Voor Stitch
1. Download `designmd.md`
2. Importeer via Stitch MCP of plak in het prompt

### Voor Tailwind + shadcn
1. Download `tailwind.theme.json` → merge in `tailwind.config.ts` onder `theme.extend`
2. Download `globals.css` → plaats als `app/globals.css` (of merge het `:root` block)

### Voor Figma
1. Download `figma-variables.json`
2. Gebruik een Figma-plugin (Tokens Studio, variables2css) om te importeren

### Voor Style Dictionary
1. Download `style-dictionary.json`
2. Gebruik als source in je SD config: `source: ['path/to/style-dictionary.json']`

## Troubleshooting

**"System roles not yet resolved"** → De styleguide is geanalyseerd voordat Sprint 0 live was. Re-analyze via "New analysis" in de header.

**`missing-primary` error in linter** → Geen button component bevatte een gekleurde background. Voeg een override toe via Colors tab → System Roles → Override primary.

**WCAG contrast warning** → De resolver heeft een on-* auto-gekozen op basis van WCAG AA. Als je een specifieke kleur wilt forceren, gebruik de override-modal.

**Export geeft lege velden** → Controleer of de bronmodules data hebben: tone of voice (voor `## Brand Voice` sectie), photography style (voor `## Imagery`), 12 brand assets (voor `## Brand Foundation`).

## Toekomstige uitbreidingen

- Dark mode resolver (tweede analyzer-pass op dark variant)
- Motion / animation tokens (niet in DESIGN.md-spec, wel waardevol als extension)
- MCP endpoint zodat Stitch/Claude Code rechtstreeks kunnen verbinden
- Visual Language extension in DESIGN.md body (corners/shadows/density als prose)
