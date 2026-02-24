# Branddock Versioning System — Ontwerp & Fasering

## 1. Overzicht

Een universeel versioning systeem voor alle beheerde knowledge-onderdelen in Branddock. Elke significante wijziging wordt als snapshot opgeslagen. Gebruikers kunnen eerdere versies bekijken, vergelijken en terugdraaien.

### Scope — Welke modules

| Module | Model | Heeft Lock | Heeft al Versioning | Prioriteit |
|--------|-------|-----------|---------------------|------------|
| Brand Assets | `BrandAsset` | ✅ | ✅ `BrandAssetVersion` | Uitbreiden |
| Personas | `Persona` | ✅ | ❌ | Nieuw bouwen |
| Products | `Product` | ❌ (toe te voegen) | ❌ | Nieuw bouwen |
| Business Strategy | `BusinessStrategy` | ✅ | ❌ | Nieuw bouwen |
| Brand Styleguide | `BrandStyleguide` | ❌ (toe te voegen) | ❌ | Nieuw bouwen |
| Campaigns | `Campaign` | ❌ | ❌ `ContentVersion` bestaat | Later |

### Design Principes

1. **Universeel model** — Eén `ResourceVersion` tabel voor alle modules (polymorf)
2. **Automatische snapshots** — Bij elke save wordt een versie aangemaakt
3. **Lock-integratie** — Lock maakt automatisch een snapshot ("baseline")
4. **Vergelijken** — Diff-view tussen twee versies
5. **Terugdraaien** — Restore naar een eerdere versie (maakt zelf weer een nieuwe versie)
6. **Lightweight** — Alleen gewijzigde velden opslaan als JSON, niet hele records dupliceren

---

## 2. Database Ontwerp

### Nieuw model: `ResourceVersion`

```prisma
model ResourceVersion {
  id             String   @id @default(cuid())
  
  // Polymorf: welk type resource en welk record
  resourceType   ResourceType          // PERSONA, BRAND_ASSET, PRODUCT, STRATEGY, STYLEGUIDE
  resourceId     String                // ID van het specifieke record
  
  // Versie metadata
  version        Int                   // Auto-incrementing per resource
  label          String?               // Optioneel: "v1.0", "Pre-launch", "After workshop"
  changeNote     String?               // Wat is er gewijzigd
  changeType     VersionChangeType     // MANUAL_SAVE, AUTO_SAVE, LOCK_BASELINE, AI_GENERATED, RESTORE
  
  // Snapshot data
  snapshot       Json                  // Volledige JSON snapshot van alle velden
  diff           Json?                 // Optioneel: alleen de gewijzigde velden t.o.v. vorige versie
  
  // Audit
  createdById    String
  createdBy      User        @relation(fields: [createdById], references: [id])
  createdAt      DateTime    @default(now())
  
  // Workspace scoping
  workspaceId    String
  workspace      Workspace   @relation(fields: [workspaceId], references: [id])
  
  @@index([resourceType, resourceId])
  @@index([workspaceId])
  @@unique([resourceType, resourceId, version])
}

enum ResourceType {
  PERSONA
  BRAND_ASSET
  PRODUCT
  STRATEGY
  STYLEGUIDE
}

enum VersionChangeType {
  MANUAL_SAVE       // Gebruiker klikt save/done editing
  AUTO_SAVE         // Periodieke auto-save tijdens editing
  LOCK_BASELINE     // Automatisch bij lock
  AI_GENERATED      // AI heeft content gegenereerd
  RESTORE           // Teruggedraaid naar eerdere versie
  IMPORT            // Geïmporteerd van extern
}
```

### Migratie van bestaand `BrandAssetVersion`

Het bestaande `BrandAssetVersion` model wordt gemigreerd naar het universele `ResourceVersion` model:

```sql
-- Migratiescript: kopieer bestaande BrandAssetVersion records
INSERT INTO ResourceVersion (id, resourceType, resourceId, version, snapshot, changeNote, createdById, createdAt, workspaceId)
SELECT 
  bav.id,
  'BRAND_ASSET',
  bav.brandAssetId,
  bav.version,
  json_build_object('content', bav.content, 'frameworkData', bav.frameworkData),
  bav.changeNote,
  bav.changedById,
  bav.createdAt,
  ba.workspaceId
FROM BrandAssetVersion bav
JOIN BrandAsset ba ON ba.id = bav.brandAssetId;
```

Na succesvolle migratie: `BrandAssetVersion` model deprecaten.

---

## 3. API Ontwerp

### Endpoints

```
POST   /api/versions                          # Maak snapshot (automatisch bij save)
GET    /api/versions?type=PERSONA&id={id}     # Lijst versies van een resource
GET    /api/versions/{versionId}              # Haal specifieke versie op
POST   /api/versions/{versionId}/restore      # Restore naar deze versie
GET    /api/versions/{v1}/diff/{v2}           # Vergelijk twee versies
PATCH  /api/versions/{versionId}              # Update label/changeNote
```

### Snapshot structuur per module

#### Persona Snapshot
```json
{
  "name": "Lisa Müller",
  "tagline": "The Creative UX Designer",
  "avatarUrl": "...",
  "age": "25-32",
  "gender": "Female",
  "location": "Berlin, Germany",
  "occupation": "Senior UX Designer",
  "education": "BA Interaction Design",
  "income": "€50,000-70,000",
  "familyStatus": "In relationship",
  "personalityType": "INFP",
  "coreValues": ["Creativity", "User empathy"],
  "interests": ["Design systems", "Typography"],
  "goals": ["Build a design system"],
  "motivations": ["Creating beautiful interfaces"],
  "frustrations": ["Inconsistent brand guidelines"],
  "behaviors": ["Reads design blogs daily"],
  "preferredChannels": ["LinkedIn", "Dribbble"],
  "buyingTriggers": ["Free trial available"],
  "strategicImplications": "...",
  "quote": "Good design is invisible",
  "bio": "Lisa is a passionate UX designer..."
}
```

#### BrandAsset Snapshot
```json
{
  "name": "Brand Purpose",
  "description": "...",
  "category": "CORE",
  "status": "VALIDATED",
  "content": { /* framework-specifiek */ },
  "frameworkType": "golden_circle",
  "frameworkData": { /* structured data */ }
}
```

#### Product Snapshot
```json
{
  "name": "Branddock Pro",
  "description": "...",
  "category": "...",
  "price": "...",
  "features": [...],
  "targetAudience": "..."
}
```

#### BusinessStrategy Snapshot
```json
{
  "name": "Growth Strategy 2026",
  "description": "...",
  "vision": "...",
  "rationale": "...",
  "keyAssumptions": [...],
  "objectives": [...],
  "focusAreas": [...]
}
```

---

## 4. Snapshot Helper (Server-side)

```typescript
// lib/versioning.ts

import { prisma } from '@/lib/prisma';
import type { ResourceType, VersionChangeType } from '@prisma/client';

interface CreateVersionOptions {
  resourceType: ResourceType;
  resourceId: string;
  snapshot: Record<string, unknown>;
  changeType: VersionChangeType;
  changeNote?: string;
  label?: string;
  userId: string;
  workspaceId: string;
}

export async function createVersion(opts: CreateVersionOptions) {
  // Bepaal volgende versienummer
  const lastVersion = await prisma.resourceVersion.findFirst({
    where: {
      resourceType: opts.resourceType,
      resourceId: opts.resourceId,
    },
    orderBy: { version: 'desc' },
    select: { version: true, snapshot: true },
  });

  const nextVersion = (lastVersion?.version ?? 0) + 1;

  // Bereken diff t.o.v. vorige versie
  const diff = lastVersion?.snapshot
    ? computeDiff(lastVersion.snapshot as Record<string, unknown>, opts.snapshot)
    : null;

  return prisma.resourceVersion.create({
    data: {
      resourceType: opts.resourceType,
      resourceId: opts.resourceId,
      version: nextVersion,
      snapshot: opts.snapshot,
      diff: diff,
      changeType: opts.changeType,
      changeNote: opts.changeNote,
      label: opts.label ?? `v${nextVersion}.0`,
      createdById: opts.userId,
      workspaceId: opts.workspaceId,
    },
  });
}

export async function restoreVersion(versionId: string, userId: string) {
  const version = await prisma.resourceVersion.findUniqueOrThrow({
    where: { id: versionId },
  });

  const snapshot = version.snapshot as Record<string, unknown>;

  // Restore het record
  switch (version.resourceType) {
    case 'PERSONA':
      await prisma.persona.update({
        where: { id: version.resourceId },
        data: snapshot as any,
      });
      break;
    case 'BRAND_ASSET':
      await prisma.brandAsset.update({
        where: { id: version.resourceId },
        data: snapshot as any,
      });
      break;
    // ... andere types
  }

  // Maak een RESTORE versie
  return createVersion({
    resourceType: version.resourceType,
    resourceId: version.resourceId,
    snapshot: snapshot,
    changeType: 'RESTORE',
    changeNote: `Restored to version ${version.version}`,
    userId,
    workspaceId: version.workspaceId,
  });
}

function computeDiff(
  previous: Record<string, unknown>,
  current: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};

  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);
  for (const key of allKeys) {
    const prev = JSON.stringify(previous[key]);
    const curr = JSON.stringify(current[key]);
    if (prev !== curr) {
      diff[key] = { from: previous[key], to: current[key] };
    }
  }

  return Object.keys(diff).length > 0 ? diff : {};
}
```

---

## 5. Integratie met Lock/Unlock

### Lock → Automatische baseline snapshot

```typescript
// In de lock API route, na succesvolle lock:
await createVersion({
  resourceType: 'PERSONA', // of BRAND_ASSET etc.
  resourceId: id,
  snapshot: buildSnapshot(record),
  changeType: 'LOCK_BASELINE',
  changeNote: 'Locked — baseline snapshot',
  userId: session.user.id,
  workspaceId,
});
```

### Unlock → Geen snapshot (wijzigingen worden pas bij save/re-lock opgeslagen)

### Save during editing → `MANUAL_SAVE` snapshot

---

## 6. UI Ontwerp

### Version Indicator (Header)

Huidige `v1.0` placeholder wordt vervangen door een klikbare versie-pill:

```
[v3.0 ▾]  ← Klikbaar, opent version panel
```

Toont:
- Huidig versienummer
- Dropdown/panel met versiegeschiedenis

### Version History Panel (Sidebar of Modal)

```
┌─────────────────────────────────────┐
│  Version History                 ✕  │
├─────────────────────────────────────┤
│  ● v3.0 — Current                  │
│    Manual save • 5 min ago          │
│    Changed: name, location          │
│    [View] [Restore]                 │
│                                     │
│  ○ v2.0 — Locked baseline          │
│    Lock baseline • 2 hours ago      │
│    [View] [Compare] [Restore]       │
│                                     │
│  ○ v1.0 — AI Generated             │
│    AI generated • Yesterday         │
│    [View] [Compare] [Restore]       │
│                                     │
│  ○ v0.0 — Created                  │
│    Initial creation • 3 days ago    │
│    [View] [Compare]                 │
└─────────────────────────────────────┘
```

### Compare View (Modal)

Side-by-side diff van twee versies:

```
┌──────────────────────────────────────────────────┐
│  Compare v1.0 → v2.0                          ✕  │
├────────────────────┬─────────────────────────────┤
│  v1.0 (Before)     │  v2.0 (After)              │
├────────────────────┼─────────────────────────────┤
│  Name              │  Name                       │
│  Lisa Müller       │  Lisa Müller                │
│                    │                              │
│  Location          │  Location                   │
│  Berlin, Germany   │  ██ Amsterdam               │ ← groen = gewijzigd
│                    │                              │
│  Occupation        │  Occupation                 │
│  UX Designer       │  ██ Marketing Manager       │ ← groen = gewijzigd
│                    │                              │
│  Goals             │  Goals                      │
│  - Build system    │  - Build system             │
│  ██ - Publish blog │  + Lead team                │ ← rood/groen
└────────────────────┴─────────────────────────────┘
```

### Restore Confirmation Dialog

```
┌─────────────────────────────────────┐
│  Restore to v1.0?                   │
│                                     │
│  This will revert all fields to     │
│  their state at v1.0. A new version │
│  (v4.0) will be created as backup.  │
│                                     │
│  ⚠ This cannot be undone.          │
│                                     │
│  [Cancel]  [Restore to v1.0]        │
└─────────────────────────────────────┘
```

---

## 7. Fasering

### Fase 1: Database & Core Library (Dag 1)

**Doel:** Fundament leggen

- [ ] Prisma schema: `ResourceVersion` model + enums toevoegen
- [ ] `npx prisma migrate dev --name add-resource-versioning`
- [ ] `lib/versioning.ts` — createVersion, restoreVersion, computeDiff
- [ ] `lib/snapshot-builders.ts` — buildPersonaSnapshot, buildBrandAssetSnapshot, etc.
- [ ] Unit tests voor computeDiff

**Files:**
```
prisma/schema.prisma              # ResourceVersion model
src/lib/versioning.ts             # Core versioning logic
src/lib/snapshot-builders.ts      # Per-module snapshot builders
```

### Fase 2: API Routes (Dag 1-2)

**Doel:** CRUD endpoints voor versies

- [ ] `POST /api/versions` — Maak snapshot
- [ ] `GET /api/versions` — Lijst per resource (query params: type, resourceId)
- [ ] `GET /api/versions/[id]` — Specifieke versie
- [ ] `POST /api/versions/[id]/restore` — Restore
- [ ] `GET /api/versions/[v1]/diff/[v2]` — Diff endpoint

**Files:**
```
src/app/api/versions/route.ts
src/app/api/versions/[id]/route.ts
src/app/api/versions/[id]/restore/route.ts
src/app/api/versions/[v1]/diff/[v2]/route.ts
```

### Fase 3: Automatische Snapshots (Dag 2)

**Doel:** Snapshots bij save, lock, AI generatie

- [ ] Persona update API: snapshot bij PATCH
- [ ] Lock API: snapshot bij lock (`LOCK_BASELINE`)
- [ ] AI generation APIs: snapshot na AI content (`AI_GENERATED`)
- [ ] Throttle: max 1 auto-save per 5 minuten per resource

**Integratiepunten:**
```
src/app/api/personas/[id]/route.ts          # Bij PATCH
src/app/api/personas/[id]/lock/route.ts     # Bij lock
src/app/api/personas/[id]/generate-*/        # Na AI generatie
src/app/api/brand-assets/[id]/route.ts      # Bij PATCH
src/app/api/brand-assets/[id]/lock/route.ts # Bij lock
```

### Fase 4: Persona Versioning UI (Dag 2-3)

**Doel:** Versioning werkend in Personas module

- [ ] `useVersionHistory` hook (TanStack Query)
- [ ] Version pill component (klikbaar, toont huidige versie)
- [ ] Version History Panel (sidebar)
- [ ] Integratie in PersonaDetailHeader (vervang statische "v1.0")

**Files:**
```
src/hooks/useVersionHistory.ts
src/components/versioning/VersionPill.tsx
src/components/versioning/VersionHistoryPanel.tsx
src/components/versioning/VersionItem.tsx
src/features/personas/components/detail/PersonaDetailHeader.tsx  # Update
```

### Fase 5: Compare & Restore UI (Dag 3)

**Doel:** Diff-view en restore functionaliteit

- [ ] Compare modal component
- [ ] Diff renderer (gewijzigde velden highlighten)
- [ ] Restore confirmation dialog
- [ ] Restore handler met optimistic updates

**Files:**
```
src/components/versioning/CompareModal.tsx
src/components/versioning/DiffRenderer.tsx
src/components/versioning/RestoreDialog.tsx
```

### Fase 6: Uitrol naar andere modules (Dag 4-5)

**Doel:** Versioning in Brand Assets, Products, Strategy, Styleguide

Per module:
- [ ] Snapshot builder maken
- [ ] API integratie (save → snapshot)
- [ ] UI integratie (VersionPill + VersionHistoryPanel in detail page)

**Volgorde:**
1. Brand Assets (heeft al `BrandAssetVersion` → migreren)
2. Business Strategy
3. Products
4. Brand Styleguide

### Fase 7: Migratie & Cleanup (Dag 5)

**Doel:** Opruimen

- [ ] Migreer bestaande `BrandAssetVersion` records naar `ResourceVersion`
- [ ] Deprecate `BrandAssetVersion` model
- [ ] Migreer bestaande `ContentVersion` (campaigns) indien gewenst
- [ ] Performance optimalisatie: cleanup oude versies (max 50 per resource)
- [ ] Documentatie update in CLAUDE.md

---

## 8. Technische Overwegingen

### Storage

- Snapshots zijn JSON, gemiddeld 2-5KB per versie
- Met 50 versies per resource en 100 resources: ~25MB — verwaarloosbaar
- Cleanup policy: bewaar max 50 versies per resource, verwijder oudste

### Performance

- Index op `[resourceType, resourceId]` voor snelle lookups
- Unique constraint op `[resourceType, resourceId, version]`
- Lazy loading: versiegeschiedenis alleen laden als panel geopend wordt
- Diff berekening server-side, niet client-side

### Concurrency

- Optimistic locking: check dat version nog steeds de hoogste is bij save
- Race condition preventie: gebruik database transaction voor version increment

### Snapshot Consistentie

- Snapshots bevatten ALLEEN het main record, niet relaties
- Relaties (zoals `PersonaResearchMethod`) worden apart beheerd
- Bij restore: alleen het hoofdrecord wordt teruggezet

---

## 9. Snapshot Builder Specificatie

Per module een pure function die een Prisma record omzet naar een snapshot:

```typescript
// lib/snapshot-builders.ts

export function buildPersonaSnapshot(persona: Persona): Record<string, unknown> {
  return {
    name: persona.name,
    tagline: persona.tagline,
    avatarUrl: persona.avatarUrl,
    age: persona.age,
    gender: persona.gender,
    location: persona.location,
    occupation: persona.occupation,
    education: persona.education,
    income: persona.income,
    familyStatus: persona.familyStatus,
    personalityType: persona.personalityType,
    coreValues: persona.coreValues,
    interests: persona.interests,
    goals: persona.goals,
    motivations: persona.motivations,
    frustrations: persona.frustrations,
    behaviors: persona.behaviors,
    preferredChannels: persona.preferredChannels,
    buyingTriggers: persona.buyingTriggers,
    strategicImplications: persona.strategicImplications,
    quote: persona.quote,
    bio: persona.bio,
  };
}

export function buildBrandAssetSnapshot(asset: BrandAsset): Record<string, unknown> {
  return {
    name: asset.name,
    description: asset.description,
    category: asset.category,
    status: asset.status,
    content: asset.content,
    frameworkType: asset.frameworkType,
    frameworkData: asset.frameworkData,
  };
}

export function buildStrategySnapshot(strategy: BusinessStrategy): Record<string, unknown> {
  return {
    name: strategy.name,
    description: strategy.description,
    type: strategy.type,
    status: strategy.status,
    vision: strategy.vision,
    rationale: strategy.rationale,
    keyAssumptions: strategy.keyAssumptions,
    startDate: strategy.startDate,
    endDate: strategy.endDate,
  };
}

export function buildProductSnapshot(product: Product): Record<string, unknown> {
  return {
    name: product.name,
    description: product.description,
    category: product.category,
    status: product.status,
    // ... product-specifieke velden
  };
}
```

---

## 10. Relatie met Lock/Unlock Systeem

```
┌───────────────────────────────────────────────┐
│                    FLOW                        │
├───────────────────────────────────────────────┤
│                                               │
│  Create Persona ──→ v1.0 (MANUAL_SAVE)        │
│       │                                       │
│  Edit fields ──→ v2.0 (MANUAL_SAVE)           │
│       │                                       │
│  AI Generate ──→ v3.0 (AI_GENERATED)          │
│       │                                       │
│  🔒 Lock ──→ v4.0 (LOCK_BASELINE)            │
│       │     "Baseline before lock"             │
│       │                                       │
│  🔓 Unlock                                    │
│       │                                       │
│  Edit fields ──→ v5.0 (MANUAL_SAVE)           │
│       │                                       │
│  ⏪ Restore v2.0 ──→ v6.0 (RESTORE)          │
│       "Restored to v2.0"                       │
│                                               │
└───────────────────────────────────────────────┘
```

---

## 11. Acceptatiecriteria

### Must Have (MVP)
- [ ] Automatische snapshots bij save en lock
- [ ] Versie-indicator in header met versienummer
- [ ] Versiegeschiedenis panel met lijst van versies
- [ ] Restore naar eerdere versie
- [ ] Werkt voor Personas en Brand Assets

### Should Have
- [ ] Compare/diff view tussen twee versies
- [ ] Custom labels op versies ("Pre-launch", "After workshop")
- [ ] Change notes bij versies
- [ ] Uitrol naar Products en Business Strategy

### Nice to Have
- [ ] Auto-save throttling (max 1 per 5 min)
- [ ] Bulk restore (meerdere velden selectief terugdraaien)
- [ ] Export versiegeschiedenis als PDF/JSON
- [ ] Notificaties bij restore door andere teamleden
- [ ] Branching (experimentele versies parallel)
