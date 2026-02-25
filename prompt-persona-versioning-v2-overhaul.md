# Prompt: Persona Versioning v2 — Overhaul (5 issues)

## Overzicht van de 5 problemen

| # | Probleem | Oplossing |
|---|----------|-----------|
| 1 | Restore mogelijk in locked mode | Restore knop verbergen als `isLocked`, API check toevoegen |
| 2 | Restore refresht UI niet | Restore API route + query invalidation + correct snapshot restore |
| 3 | Geen omschrijving van wijzigingen | Automatisch diff-gebaseerde changeNote genereren (welke velden gewijzigd) |
| 4 | Save/lock staan in logboek | Geen versie aanmaken bij lock/unlock, alleen bij inhoudelijke field changes |
| 5 | Avatar niet restoreerbaar | Avatar + avatarSource meenemen in snapshot + restore |

---

## Stap 1: PATCH handler — Slimme auto-versioning met changeNote + avatar

Vervang het volledige auto-versioning blok in `src/app/api/personas/[id]/route.ts`.

Zoek het blok dat begint met `// ── Auto-create version on update` (of `// Auto-create version`) en vervang het volledig. Als het er nog niet is, voeg het toe NA de `invalidateCache` calls maar VOOR de `return NextResponse.json`.

**Let op**: de `body` variabele en `existing` variabele moeten al beschikbaar zijn in de PATCH handler (existing is de persona VOOR de update, body is de request body).

```typescript
    // ── Smart auto-versioning: only for content changes, not lock/save actions ──
    try {
      const session = await getServerSession();
      const userId = session?.user?.id;

      if (userId) {
        // Define which fields are "content" fields (not lock/admin fields)
        const CONTENT_FIELDS = [
          'name', 'tagline', 'avatarUrl', 'avatarSource',
          'age', 'gender', 'location', 'occupation', 'education', 'income', 'familyStatus',
          'personalityType', 'coreValues', 'interests', 'goals', 'motivations',
          'frustrations', 'behaviors', 'strategicImplications',
          'preferredChannels', 'techStack', 'quote', 'bio',
          'buyingTriggers', 'decisionCriteria',
        ];

        // Check if any content field was actually changed
        const changedFields: string[] = [];
        for (const field of CONTENT_FIELDS) {
          if (data[field as keyof typeof data] !== undefined) {
            const oldVal = JSON.stringify((existing as any)[field] ?? null);
            const newVal = JSON.stringify(data[field as keyof typeof data] ?? null);
            if (oldVal !== newVal) {
              changedFields.push(field);
            }
          }
        }

        // Only create a version if content actually changed
        if (changedFields.length > 0) {
          const lastVersion = await prisma.personaVersion.findFirst({
            where: { personaId: id },
            orderBy: { version: "desc" },
            select: { version: true },
          });

          const nextVersion = (lastVersion?.version ?? 0) + 1;

          // Build human-readable changeNote from changed fields
          const fieldLabels: Record<string, string> = {
            name: 'Name', tagline: 'Tagline', avatarUrl: 'Avatar', avatarSource: 'Avatar',
            age: 'Age', gender: 'Gender', location: 'Location', occupation: 'Occupation',
            education: 'Education', income: 'Income', familyStatus: 'Family status',
            personalityType: 'Personality type', coreValues: 'Core values',
            interests: 'Interests', goals: 'Goals', motivations: 'Motivations',
            frustrations: 'Frustrations', behaviors: 'Behaviors',
            strategicImplications: 'Strategic implications',
            preferredChannels: 'Preferred channels', techStack: 'Tech stack',
            quote: 'Quote', bio: 'Bio', buyingTriggers: 'Buying triggers',
            decisionCriteria: 'Decision criteria',
          };

          // Deduplicate (avatarUrl + avatarSource both become "Avatar")
          const uniqueLabels = [...new Set(changedFields.map(f => fieldLabels[f] || f))];
          const changeNote = uniqueLabels.length <= 3
            ? `Updated ${uniqueLabels.join(', ')}`
            : `Updated ${uniqueLabels.slice(0, 2).join(', ')} +${uniqueLabels.length - 2} more`;

          // Complete snapshot including avatar fields
          const snapshot = {
            name: persona.name,
            tagline: persona.tagline,
            avatarUrl: persona.avatarUrl,
            avatarSource: persona.avatarSource,
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
            strategicImplications: persona.strategicImplications,
            preferredChannels: persona.preferredChannels,
            techStack: persona.techStack,
            quote: persona.quote,
            bio: persona.bio,
            buyingTriggers: persona.buyingTriggers,
            decisionCriteria: persona.decisionCriteria,
          };

          await prisma.personaVersion.create({
            data: {
              version: nextVersion,
              snapshot,
              changeNote,
              changedById: userId,
              personaId: id,
            },
          });
        }
      }
    } catch (versionError) {
      console.error("[PATCH /api/personas/:id] Version creation error:", versionError);
    }
    // ── End auto-versioning ──
```

### Belangrijk: `existing` referentie
De variabele `existing` moet de persona zijn VOOR de update (al aanwezig in de PATCH handler voor de lock check). De variabele `persona` is het resultaat NA de update. Controleer dat beide beschikbaar zijn:

```typescript
// existing = persona VOOR update (al aanwezig)
const existing = await prisma.persona.findFirst({ where: { id, workspaceId } });

// ... later ...

// persona = resultaat NA update
const persona = await prisma.persona.update({ where: { id }, data: { ... } });
```

---

## Stap 2: Avatar versioning bij generatie

In `src/app/api/personas/[id]/avatar/route.ts`, voeg auto-versioning toe na de avatar update.

Zoek de regel `invalidateCache(cacheKeys.prefixes.personas(workspaceId));` en voeg ERNA toe:

```typescript
    // ── Auto-version for avatar change ──
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

        // Fresh snapshot with NEW avatar
        const fullPersona = await prisma.persona.findUnique({ where: { id } });
        if (fullPersona) {
          const snapshot = {
            name: fullPersona.name,
            tagline: fullPersona.tagline,
            avatarUrl: fullPersona.avatarUrl,
            avatarSource: fullPersona.avatarSource,
            age: fullPersona.age,
            gender: fullPersona.gender,
            location: fullPersona.location,
            occupation: fullPersona.occupation,
            education: fullPersona.education,
            income: fullPersona.income,
            familyStatus: fullPersona.familyStatus,
            personalityType: fullPersona.personalityType,
            coreValues: fullPersona.coreValues,
            interests: fullPersona.interests,
            goals: fullPersona.goals,
            motivations: fullPersona.motivations,
            frustrations: fullPersona.frustrations,
            behaviors: fullPersona.behaviors,
            strategicImplications: fullPersona.strategicImplications,
            preferredChannels: fullPersona.preferredChannels,
            techStack: fullPersona.techStack,
            quote: fullPersona.quote,
            bio: fullPersona.bio,
            buyingTriggers: fullPersona.buyingTriggers,
            decisionCriteria: fullPersona.decisionCriteria,
          };

          await prisma.personaVersion.create({
            data: {
              version: nextVersion,
              snapshot,
              changeNote: "Updated Avatar",
              changedById: userId,
              personaId: id,
            },
          });
        }
      }
    } catch (versionError) {
      console.error("[PATCH /api/personas/:id/avatar] Version creation error:", versionError);
    }
```

Voeg `getServerSession` import toe als die er nog niet is:
```typescript
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
```

---

## Stap 3: Restore API Route

Maak `src/app/api/personas/[id]/versions/[versionId]/restore/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

type RouteParams = {
  params: Promise<{ id: string; versionId: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, versionId } = await params;

    // Must be unlocked to restore
    const lockResponse = await requireUnlocked("persona", id);
    if (lockResponse) return lockResponse;

    // Verify persona exists in workspace
    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Find the version to restore
    const version = await prisma.personaVersion.findUnique({
      where: { id: versionId },
    });
    if (!version || version.personaId !== id) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const snapshot = version.snapshot as Record<string, any>;

    // Restore ALL content fields from snapshot (including avatar!)
    await prisma.persona.update({
      where: { id },
      data: {
        name: snapshot.name ?? persona.name,
        tagline: snapshot.tagline ?? null,
        avatarUrl: snapshot.avatarUrl ?? null,
        avatarSource: snapshot.avatarSource ?? "NONE",
        age: snapshot.age ?? null,
        gender: snapshot.gender ?? null,
        location: snapshot.location ?? null,
        occupation: snapshot.occupation ?? null,
        education: snapshot.education ?? null,
        income: snapshot.income ?? null,
        familyStatus: snapshot.familyStatus ?? null,
        personalityType: snapshot.personalityType ?? null,
        coreValues: snapshot.coreValues ?? [],
        interests: snapshot.interests ?? [],
        goals: snapshot.goals ?? [],
        motivations: snapshot.motivations ?? [],
        frustrations: snapshot.frustrations ?? [],
        behaviors: snapshot.behaviors ?? [],
        strategicImplications: snapshot.strategicImplications ?? null,
        preferredChannels: snapshot.preferredChannels ?? undefined,
        techStack: snapshot.techStack ?? undefined,
        quote: snapshot.quote ?? null,
        bio: snapshot.bio ?? null,
        buyingTriggers: snapshot.buyingTriggers ?? undefined,
        decisionCriteria: snapshot.decisionCriteria ?? undefined,
      },
    });

    // Create a new version recording the restore action
    const lastVersion = await prisma.personaVersion.findFirst({
      where: { personaId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    await prisma.personaVersion.create({
      data: {
        version: nextVersion,
        snapshot, // Same snapshot as the version being restored
        changeNote: `Restored from v${version.version}`,
        changedById: session.user.id,
        personaId: id,
      },
    });

    invalidateCache(cacheKeys.prefixes.personas(workspaceId));

    return NextResponse.json({
      restored: true,
      restoredFromVersion: version.version,
      newVersion: nextVersion,
    });
  } catch (error) {
    console.error("[POST /api/personas/:id/versions/:versionId/restore]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## Stap 4: API Client + Hook

### 4a. In `src/features/personas/api/personas.api.ts`, voeg toe:

```typescript
export async function restorePersonaVersion(
  personaId: string,
  versionId: string
): Promise<{ restored: boolean; restoredFromVersion: number; newVersion: number }> {
  const res = await fetch(`/api/personas/${personaId}/versions/${versionId}/restore`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to restore" }));
    throw new Error(err.error || "Failed to restore version");
  }
  return res.json();
}
```

### 4b. In `src/features/personas/hooks/index.ts`, voeg toe:

```typescript
// ─── useRestorePersonaVersion ──────────────────────────────

export function useRestorePersonaVersion(personaId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => api.restorePersonaVersion(personaId!, versionId),
    onSuccess: () => {
      // Invalidate detail (refreshes page content) + versions (refreshes timeline)
      qc.invalidateQueries({ queryKey: personaKeys.detail(personaId!) });
      qc.invalidateQueries({ queryKey: personaKeys.versions(personaId!) });
      qc.invalidateQueries({ queryKey: personaKeys.list() });
    },
  });
}
```

---

## Stap 5: VersionHistoryCard — Lock-aware + Confirm fix + changeNote

Vervang het volledige bestand `src/features/personas/components/detail/sidebar/VersionHistoryCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Clock, User, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { usePersonaVersions, useRestorePersonaVersion } from '../../../hooks';

interface VersionHistoryCardProps {
  personaId: string;
  isLocked: boolean;
}

export function VersionHistoryCard({ personaId, isLocked }: VersionHistoryCardProps) {
  const { data, isLoading } = usePersonaVersions(personaId);
  const restoreMutation = useRestorePersonaVersion(personaId);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const versions = data?.versions ?? [];

  const handleRestore = (versionId: string, versionNumber: number) => {
    restoreMutation.mutate(versionId, {
      onSuccess: () => {
        toast.success(`Restored to v${versionNumber}`);
        setConfirmingId(null);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to restore version');
        setConfirmingId(null);
      },
    });
  };

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
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Restore — only for non-latest versions AND only when unlocked */}
                {index > 0 && !isLocked && (
                  <div className="mt-1.5">
                    {confirmingId === v.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-amber-600">Restore?</span>
                        <button
                          onClick={() => handleRestore(v.id, v.version)}
                          disabled={restoreMutation.isPending}
                          style={{ backgroundColor: '#d97706', color: '#ffffff' }}
                          className="px-2 py-0.5 text-[10px] font-medium rounded transition-opacity hover:opacity-90"
                        >
                          {restoreMutation.isPending ? '...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="text-[10px] text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(v.id)}
                        className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-amber-600 transition-colors"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        Restore
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

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

---

## Stap 6: Pass `isLocked` prop door naar VersionHistoryCard

In `src/features/personas/components/detail/PersonaDetailPage.tsx`, zoek waar `<VersionHistoryCard` gebruikt wordt en voeg de `isLocked` prop toe:

```tsx
<VersionHistoryCard personaId={personaId} isLocked={lockState.isLocked} />
```

---

## Stap 7: Export VersionHistoryCard interface update

In `src/features/personas/components/detail/sidebar/index.ts`, controleer dat de export correct is:

```tsx
export { VersionHistoryCard } from './VersionHistoryCard';
```

---

## Samenvatting wijzigingen per file

| File | Wijziging |
|------|-----------|
| `src/app/api/personas/[id]/route.ts` | Smart auto-versioning: diff check, changeNote, skip lock changes |
| `src/app/api/personas/[id]/avatar/route.ts` | Auto-version bij avatar generatie (incl. "Updated Avatar" note) |
| `src/app/api/personas/[id]/versions/[versionId]/restore/route.ts` | **NIEUW** — Restore API met lock check + avatar restore |
| `src/features/personas/api/personas.api.ts` | `restorePersonaVersion()` client functie |
| `src/features/personas/hooks/index.ts` | `useRestorePersonaVersion` hook met triple invalidation |
| `src/features/personas/components/detail/sidebar/VersionHistoryCard.tsx` | Lock-aware, Confirm inline style fix, changeNote display |
| `src/features/personas/components/detail/PersonaDetailPage.tsx` | Pass `isLocked` prop naar VersionHistoryCard |

## Verificatie

- [ ] **Lock check**: Open persona in locked mode → GEEN Restore knoppen zichtbaar in version history
- [ ] **Unlock + restore**: Unlock persona → Restore knoppen verschijnen → klik Restore → Confirm knop is AMBER (niet wit!)
- [ ] **UI refresh na restore**: Na restore → persona naam/tagline/demographics updaten op de pagina
- [ ] **Avatar restore**: Genereer avatar → maak change → restore naar versie met avatar → avatar verschijnt weer
- [ ] **ChangeNote**: Edit naam → save → version history toont "Updated Name"
- [ ] **Multi-field edit**: Edit naam + tagline + age → save → toont "Updated Name, Tagline, Age"
- [ ] **Geen lock versies**: Lock/unlock persona → GEEN nieuwe versie in history
- [ ] **Restore note**: Na restore → nieuwe versie met "Restored from v2" (of welk versienummer)

## Git
```bash
git add -A && git commit -m "feat(personas): versioning v2 — smart changeNotes, lock-aware restore, avatar versioning" && git push origin main
```
