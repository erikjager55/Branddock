# Prompt: Create Persona → Instant Create + Detail Page Edit Mode + Save Buttons

## Concept
In plaats van een aparte Create Persona pagina met eigen formulieren, gebruiken we nu:
1. **"+ Create Persona" knop** → maakt direct een blanco persona aan via API (`POST /api/personas` met alleen `name: "New Persona"`)
2. **Redirect naar detail page** in edit mode (unlocked, `isEditing: true`)
3. **Detail page IS de editor** — zelfde pagina voor zowel aanmaken als bewerken
4. **Save/Cancel knoppen** zichtbaar in edit mode

Dit elimineert de dubbele formulieren en houdt create + edit altijd in sync.

## Stap 1: Vervang CreatePersonaPage door een instant-create redirect

Vervang de VOLLEDIGE inhoud van `src/features/personas/components/create/CreatePersonaPage.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/ui/layout";
import { useCreatePersona } from "../../hooks";

interface CreatePersonaPageProps {
  onBack?: () => void;
  onCreated?: (personaId: string) => void;
}

/**
 * CreatePersonaPage — instantly creates a blank persona and redirects to detail page.
 * The detail page in edit mode serves as the actual editor.
 */
export function CreatePersonaPage({ onBack, onCreated }: CreatePersonaPageProps) {
  const createMutation = useCreatePersona();
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    createMutation.mutate(
      { name: "New Persona" },
      {
        onSuccess: (result) => {
          onCreated?.(result.persona.id);
        },
        onError: () => {
          // If creation fails, go back to overview
          onBack?.();
        },
      },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageShell maxWidth="5xl">
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
        <p className="text-sm text-gray-500">Creating persona...</p>
      </div>
    </PageShell>
  );
}
```

## Stap 2: Update PersonaDetailPage — accept initialEditing prop + Save/Cancel

In `src/features/personas/components/detail/PersonaDetailPage.tsx`:

### 2a. Voeg `initialEditing` prop toe aan de interface:

```tsx
interface PersonaDetailPageProps {
  personaId: string;
  onBack: () => void;
  onNavigateToAnalysis: () => void;
  initialEditing?: boolean; // NEW — start in edit mode (for newly created personas)
}
```

### 2b. Gebruik `initialEditing` in de state initialisatie:

Zoek de `isEditing` state declaration en wijzig:

```tsx
// Oud:
const [isEditing, setEditing] = useState(false);

// Nieuw:
const [isEditing, setEditing] = useState(initialEditing ?? false);
```

### 2c. Voeg een handleSave functie toe:

Voeg deze functie toe naast de andere handlers (na `handleStartMethod` of vergelijkbaar):

```tsx
const handleSave = () => {
  setEditing(false);
  toast.success('Persona saved successfully');
};

const handleCancelEdit = () => {
  setEditing(false);
  // If this is a brand new persona with default name, optionally navigate back
  if (persona.name === 'New Persona' && !initialEditing) {
    // Already saved inline edits, just exit edit mode
  }
};
```

Importeer `toast` uit `sonner` als dat nog niet geïmporteerd is, en `Save, X` uit `lucide-react`.

### 2d. Update de PersonaDetailHeader call:

Voeg `onSave` en `onCancelEdit` toe aan de header props:

```tsx
<PersonaDetailHeader
  persona={persona}
  isEditing={isEditing}
  lockState={lockState}
  visibility={visibility}
  onEditToggle={() => setEditing(!isEditing)}
  onSave={handleSave}
  onCancelEdit={handleCancelEdit}
  onChat={() => setChatModalOpen(true)}
/>
```

## Stap 3: Update PersonaDetailHeader — Save/Cancel buttons in edit mode

In `src/features/personas/components/detail/PersonaDetailHeader.tsx`:

### 3a. Voeg props toe:

```tsx
interface PersonaDetailHeaderProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  lockState: UseLockStateReturn;
  visibility: LockVisibility;
  onEditToggle: () => void;
  onSave: () => void;        // NEW
  onCancelEdit: () => void;  // NEW
  onChat: () => void;
}
```

Destructureer ze:

```tsx
export function PersonaDetailHeader({
  persona,
  isEditing,
  lockState,
  visibility,
  onEditToggle,
  onSave,
  onCancelEdit,
  onChat,
}: PersonaDetailHeaderProps) {
```

### 3b. Voeg Save/Cancel/Edit knoppen toe

Zoek waar de Edit knop staat in de header (bij de actions naast Chat). Vervang dat blok met een conditie:

```tsx
{/* Edit / Save / Cancel */}
{visibility.showEditButton && (
  isEditing ? (
    <>
      <Button
        variant="cta"
        size="sm"
        onClick={onSave}
        className="flex items-center gap-1.5"
      >
        <Save className="h-3.5 w-3.5" />
        Save
      </Button>
      <button
        onClick={onCancelEdit}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
        Cancel
      </button>
    </>
  ) : (
    <button
      onClick={onEditToggle}
      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
    >
      <Pencil className="h-3.5 w-3.5" />
      Edit
    </button>
  )
)}
```

Importeer `Save` en `X` uit `lucide-react` bovenaan als dat nog niet is gedaan.

## Stap 4: Update routing in App.tsx

Zoek in `src/App.tsx` de case voor `persona-create` en de case voor persona detail. De navigatie flow moet zijn:

1. `persona-create` → CreatePersonaPage → `onCreated` → navigeer naar persona detail met `initialEditing: true`

Zoek het bestaande routing patroon. In het `PersonasSection` component (of waar de routing zit), zorg dat `onCreated` navigeert naar de detail page. 

De PersonasSection (of App.tsx) heeft waarschijnlijk een `onNavigate` callback die `persona-create` afhandelt. Update de `onCreated` callback zodat die:
1. `setSelectedPersonaId(id)` aanroept
2. `setActiveSection('persona-detail')` aanroept  
3. Een manier heeft om `initialEditing: true` door te geven

De eenvoudigste aanpak: voeg een `isNewPersona` state toe in App.tsx (of de personas section orchestrator):

```tsx
const [isNewPersona, setIsNewPersona] = useState(false);
```

Bij de create flow:
```tsx
case 'persona-create':
  return <CreatePersonaPage 
    onBack={() => handleSetActiveSection('personas')}
    onCreated={(id) => {
      setSelectedPersonaId(id);
      setIsNewPersona(true);
      handleSetActiveSection('persona-detail');
    }}
  />;
```

Bij de detail rendering:
```tsx
case 'persona-detail':
  return <PersonaDetailPage
    personaId={selectedPersonaId!}
    onBack={() => {
      setIsNewPersona(false);
      handleSetActiveSection('personas');
    }}
    onNavigateToAnalysis={...}
    initialEditing={isNewPersona}
  />;
```

**BELANGRIJK:** Reset `isNewPersona` naar `false` wanneer de gebruiker navigeert weg van de detail page (in de `onBack` callback).

**LET OP:** De routing kan ook via een `PersonasSection` orchestrator component lopen ipv direct in App.tsx. Zoek waar `persona-create` en `persona-detail` worden gerenderd en pas daar de logica toe.

## Stap 5: Opruimen (optioneel maar aanbevolen)

Voeg een deprecation comment toe aan de bestanden die niet meer actief nodig zijn maar bewaard worden voor referentie:

```
src/features/personas/components/create/PersonaFormTabs.tsx    → @deprecated
src/features/personas/components/create/OverviewTab.tsx        → @deprecated
src/features/personas/components/create/PsychographicsTab.tsx  → @deprecated
src/features/personas/components/create/BackgroundTab.tsx       → @deprecated
```

De `PersonaImageGenerator.tsx` en `RepeatableListInput.tsx` worden WEL nog gebruikt door de detail page secties, dus die blijven actief.

## Verificatie
- [ ] `npx tsc --noEmit` — geen TypeScript errors
- [ ] Klik "+ Create Persona" op overview → kort loading screen → direct op detail page in edit mode
- [ ] Detail page toont "New Persona" als naam, alle velden zijn bewerkbaar
- [ ] Save knop is zichtbaar in edit mode → klik Save → edit mode sluit, toast "Persona saved"
- [ ] Cancel knop is zichtbaar → klik Cancel → edit mode sluit
- [ ] Normaal een bestaande persona openen → NIET in edit mode (tenzij je op Edit klikt)
- [ ] Edit knop op bestaande persona → Save/Cancel verschijnen, Edit verdwijnt
- [ ] Alle inline edits op de detail page (demographics, psychographics, goals, etc.) werken nog zoals voorheen

## Git
```bash
git add -A && git commit -m "refactor(personas): instant-create flow + save/cancel buttons in detail page edit mode" && git push origin main
```
