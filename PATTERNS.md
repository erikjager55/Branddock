# BRANDDOCK — PATTERNS.md
# ⚠️ LEES DIT BESTAND BIJ ELKE SESSIE VOORDAT JE CODE SCHRIJFT

## VERPLICHTE IMPORTS

Alle pagina-componenten MOETEN deze primitives gebruiken:

```tsx
import { PageShell, PageHeader, StatGrid, FilterBar } from '@/components/ui/layout';
import { SectionCard, GradientBanner, DetailHeader } from '@/components/ui/layout';
import { FavoriteButton, WizardStepper, SelectionCard } from '@/components/ui/layout';
import { ContentSidebarLayout, IssueCard } from '@/components/ui/layout';
import { Button, Badge, Card, Modal, EmptyState, Skeleton, StatCard, ProgressBar, SearchInput, Select, Input } from '@/components/shared';
import { DESIGN_TOKENS } from '@/lib/constants/design-tokens';
```

---

## VERBODEN PATRONEN (❌ NOOIT GEBRUIKEN)

```tsx
// ❌ Losse page wrappers
<div className="p-6 bg-gray-50 min-h-full">
<div className="h-full overflow-auto bg-background">

// ✅ Gebruik ALTIJD PageShell
<PageShell maxWidth="7xl">{children}</PageShell>

// ❌ Handmatige sticky headers
<div className="sticky top-0 bg-background/95 backdrop-blur-sm ...">

// ✅ Gebruik ALTIJD PageHeader
<PageHeader moduleKey="personas" title="Personas" subtitle="..." actions={...} />

// ❌ Hardcoded gradients
<div className="bg-gradient-to-br from-teal-500 to-teal-600">
<div className="bg-gradient-to-br from-[#5252E3] to-purple-600">

// ✅ Gebruik moduleKey of DESIGN_TOKENS
<PageHeader moduleKey="brand-foundation" ... />
<GradientBanner moduleKey="personas" ... />

// ❌ Hardcoded spacing
className="px-6 py-4"  // FOUT: moet px-8 zijn
className="p-6 bg-gray-50"  // FOUT: moet bg-background zijn

// ❌ Icon spacing met mr-
<Plus className="h-4 w-4 mr-2" />

// ✅ gap-2 op Button, nooit mr-* op icons
<Button className="gap-2"><Plus className="h-4 w-4" />Label</Button>

// ❌ Plus teken in button label
<Button>+ Nieuwe Persona</Button>

// ✅ Plus icon, geen "+" tekst
<Button className="gap-2"><Plus className="h-4 w-4" />Nieuwe Persona</Button>

// ❌ Teal Tailwind classes voor primary
className="text-teal-600 bg-teal-50"

// ✅ CSS variables of exacte hex
className="text-primary bg-primary/10"
// In gradients: from-[#1FD1B2]
```

---

## STANDAARD PAGINASTRUCTUUR

### Overview pagina
```tsx
export function ModulePage() {
  return (
    <PageShell>
      <PageHeader
        moduleKey="module-name"
        title="Module Titel"
        subtitle="Beschrijving"
        actions={<Button className="gap-2"><Plus className="h-4 w-4" />Actie</Button>}
      />
      <StatGrid>
        <StatCard label="..." value={...} icon={...} />
      </StatGrid>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        filters={[...]}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cards */}
      </div>
    </PageShell>
  );
}
```

### Detail pagina
```tsx
export function DetailPage() {
  return (
    <PageShell maxWidth="5xl">
      <DetailHeader onBack={...} title="Naam" badges={[...]} actions={...} />
      <div className="space-y-8">
        <SectionCard icon={Target} title="Sectie" impactBadge="high">
          {/* Content */}
        </SectionCard>
      </div>
    </PageShell>
  );
}
```

### Selectie-pagina (wizard stap, content type keuze)
```tsx
// ❌ Losse divs met onClick en border-primary
<div onClick={...} className={selected ? "border-2 border-primary" : "border"}>

// ✅ Gebruik ALTIJD SelectionCard
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <SelectionCard
    icon={FileText}
    title="Blog Post"
    subtitle="Long-form articles"
    selected={type === 'blog'}
    onSelect={() => setType('blog')}
  />
</div>
```

### Pagina met sidebar (Custom Validation etc.)
```tsx
<PageShell>
  <PageHeader moduleKey="research" ... />
  <ContentSidebarLayout sidebar={<ValidationPlanSidebar />}>
    {/* Main content */}
  </ContentSidebarLayout>
</PageShell>
```

### Issue/alert lijst (Brand Alignment etc.)
```tsx
// ❌ Handmatige severity cards met hardcoded kleuren
// ✅ Gebruik IssueCard
<IssueCard
  severity="critical"
  title="Persona contradicts Brand Positioning"
  subtitle="Personas → Tech-Savvy Millennial"
  description="Your brand positioning emphasizes..."
  conflictsWith={['brand-positioning', 'brand-promise']}
  recommendation="Consider adjusting the persona..."
  actions={<><Button variant="ghost">View Persona</Button><Button>Fix →</Button></>}
/>
```

---

## MODULE KEYS

```
dashboard        → from-[#1FD1B2] to-emerald-500     (LayoutDashboard)
brand-foundation → from-[#5252E3] to-purple-600      (Building2)
business-strategy → from-blue-500 to-indigo-600       (Target)
brandstyle       → from-purple-500 to-pink-600        (Palette)
personas         → from-[#5252E3] to-[#1FD1B2]       (Users)
products         → from-orange-500 to-amber-600       (Package)
market-insights  → from-green-500 to-emerald-600      (TrendingUp)
knowledge        → from-blue-500 to-indigo-600        (BookOpen)
brand-alignment  → from-[#1FD1B2] to-emerald-500     (Shield)
campaigns        → from-[#5252E3] to-purple-600       (Megaphone)
content-library  → from-purple-500 to-pink-600        (FileText)
research         → from-green-500 to-emerald-600      (FlaskConical)
settings         → from-gray-500 to-gray-600          (Settings)
help             → from-blue-500 to-indigo-600        (HelpCircle)
```

---

## DESIGN TOKEN SAMENVATTING

### Spacing
| Context | Waarde |
|---------|--------|
| Page padding | `px-8 py-8` (32px, via PageShell) |
| Header | `px-8 py-6` (via PageHeader) |
| Card padding | `p-6` |
| Grid gap | `gap-4` |
| Section margin | `mb-8` |

### Typography
| Element | Classes |
|---------|---------|
| Page title | `text-3xl font-semibold` |
| Section title | `text-xl font-semibold` |
| Card title | `text-lg font-semibold` |
| Body | `text-base` |
| Caption | `text-xs text-muted-foreground` |

### Icons
| Context | Size | Regel |
|---------|------|-------|
| Button | `h-4 w-4` | `gap-2` op parent |
| Card | `h-6 w-6` | — |
| Header container | `h-6 w-6 text-white` | In `h-12 w-12 rounded-xl` |

### Max-Width
| Type | Class |
|------|-------|
| Overview | `max-w-7xl` (default) |
| Detail | `max-w-5xl` |
| Strategy Hub | `max-w-[1800px]` |

---

## CHECKLIST PER PAGINA

- [ ] Gebruikt `<PageShell>` wrapper
- [ ] Gebruikt `<PageHeader moduleKey="...">` 
- [ ] Achtergrond = `bg-background` (niet `bg-gray-50`)
- [ ] Padding = `px-8` (niet `px-6`)
- [ ] Primary via `text-primary` (niet `text-teal-*`)
- [ ] Buttons: `gap-2` + `h-4 w-4` icons (niet `mr-2`)
- [ ] Geen "+" tekst in labels
- [ ] Cards: `rounded-xl` + `p-6`
- [ ] Stats horizontaal via `<StatGrid>`
