# Prompt: Persona Versioning — Schema + API + UI

## Overzicht
Volledige versioning voor personas, gemodelleerd naar het bestaande `BrandAssetVersion` patroon. Bevat: Prisma model, migratie, API endpoints, TanStack Query hooks, en UI-componenten (VersionPill in header + VersionHistoryPanel in sidebar).

---

## Stap 1: Prisma Schema — PersonaVersion model

In `prisma/schema.prisma`, voeg een nieuw model toe NA het `PersonaResearchMethod` model:

```prisma
model PersonaVersion {
  id            String    @id @default(cuid())
  version       Int
  snapshot      Json      // Volledige persona data snapshot
  changeNote    String?
  changedById   String
  changedBy     User      @relation(fields: [changedById], references: [id])
  personaId     String
  persona       Persona   @relation(fields: [personaId], references: [id], onDelete: Cascade)
  createdAt     DateTime  @default(now())

  @@index([personaId])
  @@unique([personaId, version])
}
```

### Voeg relatie toe aan Persona model:

Zoek in het `Persona` model de relaties sectie (bij `researchMethods`, `aiAnalysisSessions`, etc.) en voeg toe:

```prisma
  versions              PersonaVersion[]
```

### Voeg relatie toe aan User model:

Zoek het `User` model en voeg toe bij de relaties:

```prisma
  personaVersions    PersonaVersion[]
```

### Draai de migratie:

```bash
npx prisma db push
```

Of als je een formele migratie wilt:

```bash
npx prisma migrate dev --name add-persona-version-model
```

---

## Stap 2: API Routes

### 2a. GET /api/personas/[id]/versions — Versie historie ophalen

Maak `src/app/api/personas/[id]/versions/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

    const [versions, total] = await Promise.all([
      prisma.personaVersion.findMany({
        where: { personaId: id },
        orderBy: { version: "desc" },
        take: limit,
        select: {
          id: true,
          version: true,
          changeNote: true,
          createdAt: true,
          changedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.personaVersion.count({ where: { personaId: id } }),
    ]);

    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        version: v.version,
        changeNote: v.changeNote,
        createdAt: v.createdAt.toISOString(),
        changedBy: v.changedBy,
      })),
      total,
    });
  } catch (error) {
    console.error("[GET /api/personas/:id/versions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 2b. Auto-version bij persona updates

In `src/app/api/personas/[id]/route.ts`, zoek de PATCH handler. Voeg na de `prisma.persona.update()` call maar vóór de return een auto-version aan:

```typescript
// Auto-create version on update
try {
  const session = await getServerSession();
  const userId = session?.user?.id;
  if (userId) {
    const lastVersion = await prisma.personaVersion.findFirst({
      where: { personaId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (lastVersion?.version ?? 0) + 1;

    // Snapshot all persona fields (excluding relations)
    const { researchMethods, aiAnalysisSessions, chatSessions, linkedProducts, brandAnalysisSessions, versions, createdBy, lockedBy, workspace, ...snapshotData } = updated as any;

    await prisma.personaVersion.create({
      data: {
        version: nextVersion,
        snapshot: snapshotData,
        changeNote: body.changeNote ?? null,
        changedById: userId,
        personaId: id,
      },
    });
  }
} catch (versionError) {
  // Don't fail the update if versioning fails
  console.error("[PATCH /api/personas/:id] Version creation error:", versionError);
}
```

**Let op**: `updated` is het resultaat van `prisma.persona.update()`. De destructuring verwijdert relaties zodat alleen scalaire velden in de snapshot komen. Pas de destructuring aan op basis van wat je in de `include` of `select` van de update call hebt staan. Als de update geen `include` gebruikt, is `updated` al puur scalair en kan je de destructuring versimpelen naar:

```typescript
await prisma.personaVersion.create({
  data: {
    version: nextVersion,
    snapshot: updated as any,
    changeNote: body.changeNote ?? null,
    changedById: userId,
    personaId: id,
  },
});
```

Voeg `getServerSession` import toe als die er nog niet is:
```typescript
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
```

---

## Stap 3: API client functies

In `src/features/personas/api/personas.api.ts`, voeg toe:

```typescript
// ─── Versions ─────────────────────────────────────────

export interface PersonaVersionSummary {
  id: string;
  version: number;
  changeNote: string | null;
  createdAt: string;
  changedBy: { id: string; name: string | null; email: string };
}

export async function fetchPersonaVersions(
  personaId: string,
  limit = 20
): Promise<{ versions: PersonaVersionSummary[]; total: number }> {
  const res = await fetch(`/api/personas/${personaId}/versions?limit=${limit}`);
  if (!res.ok) return { versions: [], total: 0 };
  return res.json();
}
```

---

## Stap 4: TanStack Query hooks

In `src/features/personas/hooks/index.ts`, voeg toe:

### 4a. Query key:

Voeg in het `personaKeys` object toe:

```typescript
versions: (id: string) => [...personaKeys.all, id, "versions"] as const,
```

### 4b. Hook:

```typescript
// ─── usePersonaVersions ────────────────────────────────

export function usePersonaVersions(personaId: string | undefined) {
  return useQuery({
    queryKey: personaKeys.versions(personaId ?? ""),
    queryFn: () => api.fetchPersonaVersions(personaId!),
    enabled: !!personaId,
    staleTime: 30_000,
  });
}
```

### 4c. Invalideer versions bij updates:

Zoek `useUpdatePersona` en voeg toe aan `onSuccess`:

```typescript
qc.invalidateQueries({ queryKey: personaKeys.versions(id!) });
```

---

## Stap 5: UI — VersionPill in header

Maak `src/features/personas/components/detail/VersionPill.tsx`:

```tsx
'use client';

import { Clock } from 'lucide-react';
import { usePersonaVersions } from '../../hooks';

interface VersionPillProps {
  personaId: string;
}

export function VersionPill({ personaId }: VersionPillProps) {
  const { data } = usePersonaVersions(personaId);
  const total = data?.total ?? 0;
  const latest = data?.versions?.[0];

  if (total === 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
      <Clock className="w-3 h-3" />
      <span className="font-medium">v{latest?.version ?? 1}</span>
      {total > 1 && (
        <span className="text-gray-400">· {total} versions</span>
      )}
    </div>
  );
}
```

### Integreer in PersonaDetailHeader:

In `src/features/personas/components/detail/PersonaDetailHeader.tsx`:

1. Import toevoegen:
```tsx
import { VersionPill } from './VersionPill';
```

2. Plaats de pill naast de persona naam of bij de metadata. Zoek het gedeelte waar `persona.name` getoond wordt en voeg erna toe:

```tsx
<VersionPill personaId={persona.id} />
```

---

## Stap 6: UI — VersionHistoryPanel in sidebar

Maak `src/features/personas/components/detail/sidebar/VersionHistoryCard.tsx`:

```tsx
'use client';

import { Clock, User } from 'lucide-react';
import { usePersonaVersions } from '../../../hooks';

interface VersionHistoryCardProps {
  personaId: string;
}

export function VersionHistoryCard({ personaId }: VersionHistoryCardProps) {
  const { data, isLoading } = usePersonaVersions(personaId);
  const versions = data?.versions ?? [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Version History</h3>
        {data?.total != null && data.total > 0 && (
          <span className="text-xs text-gray-400">({data.total})</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
          ))}
        </div>
      ) : versions.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">
          No versions yet. Versions are created automatically when you save changes.
        </p>
      ) : (
        <div className="space-y-0">
          {versions.slice(0, 5).map((v, index) => (
            <div
              key={v.id}
              className="flex gap-2.5 py-2.5 border-b border-gray-50 last:border-0"
            >
              {/* Version badge */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    index === 0
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  v{v.version}
                </div>
                {index < Math.min(versions.length, 5) - 1 && (
                  <div className="w-px flex-1 bg-gray-100 mt-1" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-900 truncate">
                  {v.changeNote ?? `Version ${v.version}`}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
                  <User className="w-2.5 h-2.5" />
                  <span>{v.changedBy?.name ?? 'Unknown'}</span>
                  <span>·</span>
                  <span>
                    {new Date(v.createdAt).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Show more indicator */}
          {(data?.total ?? 0) > 5 && (
            <p className="text-[10px] text-gray-400 pt-2 text-center">
              +{(data?.total ?? 0) - 5} more versions
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

### Export toevoegen:

In `src/features/personas/components/detail/sidebar/index.ts`:

```tsx
export { VersionHistoryCard } from './VersionHistoryCard';
```

### Integreer in PersonaDetailPage sidebar:

In `src/features/personas/components/detail/PersonaDetailPage.tsx`:

1. Import:
```tsx
import { ProfileCompletenessCard, ResearchSidebarCard, QuickActionsCard, StrategicImplicationsSidebar, VersionHistoryCard } from './sidebar';
```

2. Voeg toe in de sidebar (na `StrategicImplicationsSidebar`):

```tsx
<VersionHistoryCard personaId={personaId} />
```

---

## Stap 7: Verwijder de oude /api/versions call

De detail page roept momenteel `GET /api/versions?type=PERSONA&resourceId=...` aan. Zoek in de codebase waar deze call gemaakt wordt en verwijder of deactiveer hem. Dit kan zijn:
- Een `useVersionHistory` hook ergens
- Een fetch call in een useEffect
- Een TanStack Query hook met queryKey `['versions', ...]`

Zoek met: `grep -r "api/versions" src/features/personas/` en `grep -r "useVersionHistory" src/features/personas/`

Als je een hook vindt die `/api/versions` aanroept, verwijder de import en het gebruik ervan uit de persona detail page.

---

## Verificatie
- [ ] `npx prisma db push` — geen fouten, tabel aangemaakt
- [ ] `npx tsc --noEmit` — geen TypeScript errors
- [ ] Open persona detail → geen 500 errors in console
- [ ] Edit een persona veld + Save → check `/api/personas/:id/versions` (moet 1 versie bevatten)
- [ ] Edit opnieuw + Save → nu 2 versies
- [ ] VersionPill in header toont "v2 · 2 versions"
- [ ] VersionHistoryCard in sidebar toont timeline met change notes
- [ ] Nieuwe persona (geen edits) → geen VersionPill, empty state in sidebar card
- [ ] Bestaande personas (Sarah Chen, Marcus Thompson) → tonen versies na eerste edit

## Git
```bash
git add -A && git commit -m "feat(personas): full versioning system — schema, API, hooks, VersionPill + VersionHistoryCard" && git push origin main
```
