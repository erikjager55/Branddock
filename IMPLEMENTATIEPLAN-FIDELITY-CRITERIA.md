# IMPLEMENTATIEPLAN — Fidelity Criteria Definitie

> Sessie-plan en uitvoeringsdoc voor het vergrendelen van pillar +
> sub-criteria definities voor `ContentFidelityScore` (cat 6 uit
> sessie-2 leerlus-werkstroom).
>
> Lees eerst: `FIDELITY-CRITERIA-AUDIT.md` — audit-input voor deze sessie.
>
> Laatst bijgewerkt: 5 mei 2026 [EJ]

---

## DOEL

Vergrendel de concrete fidelity-scoring-definities zodat fase 4 van het
leerlus-implementatieplan (`IMPLEMENTATIEPLAN-LEARNING-LOOP.md`) kan landen
zonder v0-placeholder.

Concreet uit deze sessie:
1. **3 pillar-namen + definities** (uniform over alle content-types)
2. **6 sub-criteria per content-type-categorie** (8 categorieën + per-type overrides waar nodig)
3. **Pillar + criteria weights** (samen 1.0, per pillar en per criterion)
4. **Source-tag** per sub-criterion: `deterministic` / `ai-judge` / `human`
5. **Composite-threshold** per content-type-categorie

Niet greenfield — refinement van bestaande `qualityCriteria` in
`src/features/campaigns/lib/deliverable-types.ts`. Audit toont 8
categorie-defaults + 4 type-overrides al aanwezig zijn.

---

## VOORAF

`FIDELITY-CRITERIA-AUDIT.md` ligt klaar met:
- Inventaris van 53 types × 5 criteria-sets (huidige staat is 5-niet-6)
- 8 terugkerende criterion-thema's geclusterd
- 3 pillar-mapping-voorstellen (`brand`/`audience`/`craft` vs `strategic`/`audience`/`execution`)
- Gap-analyse (8 gaps, G1-G8 met impact-matrix)
- 10 open beslis-vragen voor de sessie

Lees voordat de sessie start. Spaart audit-tijd in de sessie zelf.

---

## SESSIE-STRUCTUUR

Drie fases, ~90-120 min totaal.

### Fase 1 — Pillars + shape (~25 min)

**Beslissingen:**
- 5 of 6 sub-criteria per type? (audit-vraag #1)
- Pillar-namen (audit-vraag #2): Optie 1 (`brand`/`audience`/`craft`) of Optie 3 (`strategic`/`audience`/`execution`)?
- Conventie voor pillar-key naming (lowercase-snake-case enum)
- Welke gaps (G1-G8) committeren we voor v1? (audit-vraag #4)

**Output fase 1:**
- Pillar-enum vergrendeld
- Beslissing of constraint-compliance een 6e sub-criterion wordt (G6) of gate blijft

### Fase 2 — Per categorie: 6 sub-criteria mapping (~60-75 min)

Doorloop de 8 content-type-categorieën uit `deliverable-types.ts`:
1. Long-Form Content (7 types)
2. Social Media (13 types)
3. Advertising & Paid (6 types)
4. Email & Automation (5 types)
5. Website & Landing Pages (5 types)
6. Video & Audio (5 types)
7. Sales Enablement (4 types)
8. PR, HR & Communications (8 types)

Per categorie (~7-10 min):
- Vergrendel 6 sub-criteria
- Per sub-criterion: `key` (snake-case), `label`, `description` (1-2 zin), `pillar` (uit fase 1), `source` (deterministic/ai-judge/human)
- Beslis: gebruik bestaande criteria uit `deliverable-types.ts` of herzien?
- Beslis: type-overrides nodig binnen de categorie? (bijv. `linkedin-ad`, `tiktok-script`, `faq-page` als precedent)

**Output fase 2:**
- 8 × 6 = 48 sub-criteria gedefinieerd op categorie-niveau
- Plus per-type overrides waar besloten

### Fase 3 — Weights + thresholds (~15-20 min)

Per categorie (parallel verwerkbaar):
- Per pillar: gewicht binnen composite-score (samen 1.0)
- Per sub-criterion: gewicht binnen pillar (samen 1.0)
- Composite-threshold voor `thresholdMet: Boolean` (bijv. ≥70 publishable)

Bestaande weights uit `deliverable-types.ts` waar mogelijk hergebruiken.

**Output fase 3:**
- Volledige weights-matrix vergrendeld
- Thresholds vergrendeld

---

## DEFINITIEVE OUTPUTS

Wat de sessie oplevert, schema-ready:

### 1. TypeScript-types in `src/types/learning-loop.ts`

```typescript
export type FidelityPillarKey = 'brand' | 'audience' | 'craft'  // of optie 3

export interface FidelityPillarDefinition {
  key: FidelityPillarKey
  label: string
  description: string
  weight: number  // som over alle pillars = 1.0
}

export type FidelityCriterionSource = 'deterministic' | 'ai-judge' | 'human'

export interface FidelityCriterionDefinition {
  key: string           // bijv. 'tone-fit', 'conciseness'
  label: string
  description: string
  pillar: FidelityPillarKey
  source: FidelityCriterionSource
  weight: number        // som binnen pillar = 1.0
}

export interface ContentTypeFidelityConfig {
  contentTypeId: string                         // bijv. 'blog-post'
  category: string                              // bijv. 'Long-Form Content'
  pillars: FidelityPillarDefinition[]           // 3 stuks, uniform
  criteria: FidelityCriterionDefinition[]       // 6 stuks, per type
  compositeThreshold: number                    // 0-100
}
```

### 2. Definitie-bestand `src/features/campaigns/lib/fidelity-criteria.ts`

```typescript
import type { ContentTypeFidelityConfig } from '@/types/learning-loop'

export const PILLARS: FidelityPillarDefinition[] = [
  { key: 'brand', label: '...', description: '...', weight: 0.X },
  { key: 'audience', label: '...', description: '...', weight: 0.X },
  { key: 'craft', label: '...', description: '...', weight: 0.X },
]

export const CATEGORY_CRITERIA: Record<string, FidelityCriterionDefinition[]> = {
  'Long-Form Content': [/* 6 criteria */],
  'Social Media': [/* 6 criteria */],
  // ... 8 categorieën
}

export const TYPE_OVERRIDES: Record<string, Partial<ContentTypeFidelityConfig>> = {
  'linkedin-ad': {/* override */},
  'tiktok-script': {/* override */},
  'faq-page': {/* override */},
  // ... beslist in fase 2
}

export function getFidelityConfig(contentTypeId: string): ContentTypeFidelityConfig
```

### 3. Migratie van `deliverable-types.ts`

Twee opties (sessie-keuze):
- **A. Tagging:** bestaande `qualityCriteria` arrays krijgen `pillar` + `source` velden toegevoegd, blijven in `deliverable-types.ts`. Eenvoud.
- **B. Migratie:** `qualityCriteria` verhuist naar nieuw bestand, `deliverable-types.ts` verwijst alleen. Strakker, breekt geen downstream.

Aanbeveling: A nu, B later wanneer er meer leerlus-context bovenop komt.

### 4. Cross-references update in code

- `src/lib/studio/quality-scorer.ts` — leest pillar-tagging, scoort per pillar
- `src/lib/studio/improve-suggester.ts` — leest pillar/criterion definitions
- Eventueel: prompt-templates per type krijgen "scored on these pillars" sectie

### 5. Plan-doc bijwerken

- `IMPLEMENTATIEPLAN-LEARNING-LOOP.md` fase 4 — vervang "v0-placeholder" met verwijzing naar `fidelity-criteria.ts`
- Memory `branddock-learning-loop-decisions.md` — voeg beslissing 7 toe (de definities) als afgeronde sessie

---

## BUITEN SCOPE SESSIE

- **Implementatie van scoring** (= fase 4 leerlus-plan)
- **Concrete rule-engine logica** voor deterministic criteria (= sub-werk in fase 4)
- **AI-judge prompt-templates** voor ai-judge criteria (= sub-werk in fase 4)
- **Calibratie via test-content** (separate sessie wanneer fase 4 v1 deployable is)
- **Cross-customer benchmarks** (jaar 2 use-case)
- **Multi-judge orchestration UI** (capability is er, UI later)
- **Visual fidelity (G8)** — multimodaal scoren is eigen werkstroom

---

## VOLGENDE STAPPEN NA DE SESSIE

1. **Update memory** met beslissing 7 in `branddock-learning-loop-decisions.md`
2. **Schrijf** `src/types/learning-loop.ts` en `src/features/campaigns/lib/fidelity-criteria.ts`
3. **Tag bestaande** `qualityCriteria` in `deliverable-types.ts` met `pillar` + `source`
4. **Update** `IMPLEMENTATIEPLAN-LEARNING-LOOP.md` fase 4 verwijzing
5. **Plan content-strategy iteratie 2** — over 6 maanden, op basis van geleerde leerlus-data, herzie criteria

---

## RELATIE TOT ANDERE DOCUMENTEN

| Document | Rol |
|---|---|
| `FIDELITY-CRITERIA-AUDIT.md` | Audit-input — bestaande staat van qualityCriteria |
| `branddock-learning-loop-audit.md` (memory) | Sessie 1 audit — capture-categorieën inclusief cat 6 |
| `branddock-learning-loop-decisions.md` (memory) | Beslissing 3 — ContentFidelityScore architectuur |
| `IMPLEMENTATIEPLAN-LEARNING-LOOP.md` | Fase 4 wacht op deze definities |
| `src/features/campaigns/lib/deliverable-types.ts` | Bestaande `qualityCriteria` — migratie-bron |
| `CLAUDE.md` items 155, 141, 146, 170 | Context — S7-REST type-specific quality, EFFIE, MFE marketing-frameworks, CQP |

---

## OPEN AFHANKELIJKHEDEN

- Geen blokkades voor het voeren van de sessie zelf
- Wel blokkerend op fase 4 v1: zonder deze sessie kan fase 4 alleen v0-placeholder deployen

---

*Sessie start op verzoek user. Audit ligt klaar.*
