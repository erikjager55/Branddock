# Implementatieplan: Power-User Shortcuts voor Content Items

> **Status**: Concept, klaar voor review
> **Aangemaakt**: 2026-04-24
> **Aanleiding**: Kritische flow-analyse wees uit dat content-item creatie binnen een bestaande campagne niet wezenlijk te lang is (~7-10 clicks) maar dat ~3 daarvan pure bevestiging zijn voor power-users die dezelfde type content herhalen. Dit plan schrapt die friction zonder een parallel tweede entry-point te bouwen.
>
> Bonus-inzicht: de **Brand Assistant** (chat, code-naam `claw`) is al een volwaardige entry om campagnes/content te starten, maar wordt niet proactief onder de aandacht gebracht. Dit plan maakt die zichtbaar.

---

## Scope / filosofie

**Uitgangspunt**: de deep-path wizard blijft. De standaard flow is correct voor nieuwe users en strategische content. We voegen alleen **smart defaults en shortcuts toe** die triggeren wanneer we kunnen detecteren dat de user een vervolgitem maakt.

**Niet in scope**:
- Tweede "Quick Content" entry-point bouwen (eerder voorstel ingetrokken)
- Wizard verwijderen of drastisch inkorten
- Nieuwe content-type taxonomie

**In scope**: vijf micro-optimalisaties in Canvas/Campagne-modus + prominente Brand Assistant surfacing.

---

## Stap 1 — Auto-inherit settings van vorig deliverable (~2 dagen)

### Doel
Wanneer user een 2e/3e/Nde deliverable van **hetzelfde type in dezelfde campagne** maakt, erven Canvas Step 1 (Context) en Step 3 (Medium) automatisch de settings van het meest recente voltooide deliverable. Power-user klikt direct van Add → type → Variants.

### Mechanisme

**Detectie** (`CanvasPage.tsx` bij deliverable load):
```ts
const previousDeliverable = await findMostRecentCompletedInSameCampaign({
  campaignId,
  contentType,
  excludeId: currentDeliverableId,
});
```

Query: `prisma.deliverable.findFirst({ where: { campaignId, contentType, status: 'COMPLETED', id: { not } }, orderBy: { updatedAt: 'desc' } })`.

**Bij hit** — inherit:
- `settings.mediumConfig` → prefill Medium step
- `settings.contentTypeInputs` → prefill Context step
- `settings.brief` → prefill briefing overview

Per field dat ge-erfd wordt: mark als `inheritedFrom: previousDeliverable.id` in de store zodat UI kan labelen.

### UI

Bovenaan Canvas verschijnt een banner wanneer inheritance actief is:
```
✓ Settings inherited from "April Thought Leadership — Post #10"
  Context · Medium · Type-specific inputs all copied · [Change settings]
```

Step 1 en Step 3 krijgen status `inherited-complete` (groene check) — user kan erheen via banner's "Change settings" link of via accordion zelf. Step navigatie start op **Step 2 Variants** i.p.v. Step 1.

### Reset

User kan altijd overriden door naar Step 1 of 3 te gaan en wijzigingen te maken. Settings na wijziging propageren **niet** terug naar vorige deliverable (inheritance is eenrichtingsverkeer).

### Files
- `src/features/campaigns/components/canvas/CanvasPage.tsx` — inheritance detection + banner
- `src/features/campaigns/stores/useCanvasStore.ts` — `inheritedFrom` tracking, `setActiveStep` default naar `variants`
- `src/app/api/campaigns/[id]/deliverables/recent-completed/route.ts` — nieuwe lookup endpoint (of inline in detail fetch)

### Success criteria
- Post #11 in campagne "LinkedIn thought leadership" opent direct op Variants
- Banner toont welke post de settings leverde
- Click op "Change settings" navigeert naar Context step, banner verdwijnt
- Eerste post in campagne: geen inheritance, normale flow (Context is Step 1)

---

## Stap 2 — "Repeat last" knop in campagne-header (~1 dag)

### Doel
Eén klik om een nieuwe deliverable van hetzelfde type + settings als de laatste post aan te maken, zonder Add Deliverable modal te openen.

### UI

In `ContentLibraryCampaignMode.tsx` actions-rij:
```
[Generate Drafts (N)]  [Export (N)]  [+ Add Deliverable]  [↻ Repeat last]
                                                                 ↑
                                                     alleen zichtbaar als er
                                                     ≥1 voltooide deliverable is
```

Bij hover toont een tooltip welk type + welke post er gekopieerd wordt: *"Repeat 'April Thought Leadership — Post #10' (linkedin-post)"*.

### Mechanisme

1. Vind meest recente voltooide deliverable in campagne (ongeacht type — we pakken wat user laatst maakte)
2. Creëer nieuwe deliverable via bestaande `createDeliverable` API met dezelfde settings
3. Navigeer direct naar Canvas met auto-inherit (Stap 1) al actief → opent op Variants
4. Trigger generatie automatisch

### Files
- `src/features/campaigns/components/content-library/ContentLibraryCampaignMode.tsx` — knop toevoegen
- Hergebruik bestaande Add Deliverable POST endpoint + inheritance logica uit Stap 1

### Success criteria
- Click op Repeat last → 3 seconden later in Canvas Step 2 Variants met nieuwe generatie lopend
- Werkt ook na delete van intermediate items (pakt altijd laatst voltooide)

---

## Stap 3 — "Duplicate" actie op bestaande deliverables (~1 dag)

### Doel
Rechtsklik / contextmenu op een content card → Duplicate. Voor "maak een variant van deze post, andere topic" scenario.

### UI

Op elke `CalendarCard` / `ContentCardGrid` card / list row: extend bestaand context menu (waar Delete / Rename al zitten) met Duplicate actie.

Duplicate:
- Kopieert `title` + " (copy)"
- Zelfde contentType + campaignId + settings + brief
- Leegt `generatedText`/`generatedImageUrls`/`generatedVideoUrl` zodat user verse generatie krijgt
- Zet status terug naar NOT_STARTED
- Opent Canvas op Variants via auto-inherit (Stap 1)

### Files
- `src/features/campaigns/components/content-library/ContentCardGrid.tsx` + `ContentCardList.tsx` + shared `calendar-cards.tsx` — Duplicate menu item
- `src/app/api/campaigns/[id]/deliverables/[did]/duplicate/route.ts` — nieuwe POST endpoint
- `src/features/campaigns/hooks/index.ts` — `useDuplicateDeliverable` hook

### Success criteria
- Duplicate creëert exacte kopie met unieke titel
- Generatie start automatisch na duplicate
- Original deliverable blijft onaangetast

---

## Stap 4 — Bulk generate met variants (~3 dagen)

### Doel
"Genereer 5 extra posts in deze campagne" in één actie. Voor batches content-planning.

### UI

In campagne-header naast Generate Drafts: `[⚡ Generate more ▾]` dropdown. Dropdown opent modal:

```
Generate more content
┌──────────────────────────────────┐
│ Type:       [linkedin-post ▾]    │
│ Quantity:   [5]                  │
│ Based on:   [April Post #10 ▾]   │
│             (settings inherited) │
│                                  │
│ Optional guidance:               │
│ [______________________________] │
│                                  │
│        [Cancel]  [Generate 5]    │
└──────────────────────────────────┘
```

### Mechanisme

1. Loop N keer: creëer deliverable met inherited settings + optional guidance in brief
2. Start `canvas-orchestrator` parallel voor alle N (respect rate limits via concurrent queue, max 3 tegelijk)
3. Toon live voortgang in een progress panel (zoals Generate Drafts al doet)
4. User krijgt N nieuwe drafts terug in Content Library — klikken opent Canvas Step 2 Variants

### Files
- `src/features/campaigns/components/content-library/BulkGenerateModal.tsx` — nieuw
- `src/features/campaigns/hooks/useBulkGenerate.ts` — bestaand, uitbreiden
- Rate-limit coordinator in bulk-generate route (bestaand)

### Success criteria
- 5 posts gegenereerd in <2 minuten
- Geen rate-limit errors op provider
- Alle posts erven settings correct (zichtbaar via banner wanneer user ze opent)

---

## Stap 5 — Publish shortcuts vanuit Content Library (~1 dag)

### Doel
Goedkeuren + publiceren/schedulen van een draft **zonder Canvas te openen**. Voor de "ik scan snel een lijst drafts en keur ze één voor één goed" workflow.

### UI

Hover op content card → quick action overlay:
```
┌────────────────────────────────┐
│  ⚡ Approve + Schedule at [time]│
│  ⚡ Approve now                 │
│  📅 Schedule same as last      │
└────────────────────────────────┘
```

Alleen zichtbaar als item status = DRAFT en isPublishReady = false. Met één klik:
- **Approve now**: PATCH deliverable `approvalStatus: APPROVED`, `status: COMPLETED`, geen schedule
- **Approve + Schedule**: opent klein date-time picker inline op de card; default = volgende werkdag 10:00
- **Schedule same as last**: kopieert tijd-van-dag van meest recente scheduled post + 1-dag offset

### Files
- `src/features/campaigns/components/content-library/ContentCardGrid.tsx` + `ContentCardList.tsx` — quick-action overlay
- Hergebruik bestaande approval + schedule API endpoints
- `src/features/campaigns/lib/publish-scheduler.ts` — "next business day 10:00" helper

### Success criteria
- Approve-only → card verandert naar Ready state binnen 500ms (optimistic update)
- Geen Canvas navigatie nodig voor goedkeuring
- Werkt ook vanuit Timeline view

---

## Stap 6 — Brand Assistant als prominente express entry (~2 dagen)

### Doel
De Brand Assistant (chat, `claw`) is al een volwaardige express entry voor content creatie — via de bestaande write-tools (`create_campaign`, `create_deliverable`, `update_*`) kan een gebruiker met één zin "Maak een LinkedIn thought leadership post over AI in marketing, koppel aan campagne X" een volledig content-item aanmaken. Dit wordt nu niet proactief zichtbaar gemaakt.

### Huidige staat

- `ClawOverlay` is globaal beschikbaar (gerenderd in `App.tsx`)
- Write-tools bestaan voor campagnes + deliverables (via `create_campaign`, `create_deliverable`, `update_deliverable`)
- Page-awareness + field-filling zijn geïmplementeerd (IMPLEMENTATIEPLAN-CLAW-PAGE-AWARENESS.md, done)
- **MAAR**: geen tooltip, geen contextuele suggesties, geen "Start met de assistant" CTA in relevante contexten

### Voorgestelde surfacing-lagen

#### A. CTA op Content Library empty state
Wanneer een campagne nog geen deliverables heeft:
```
┌─────────────────────────────────────────────┐
│   No content yet                            │
│                                             │
│   [+ Create Content]  or                    │
│   [💬 Ask the Brand Assistant]              │
│                                             │
│   → "Write a LinkedIn post for our Q2 launch"
│   → "Generate 5 social posts for this campaign"
│   → "Turn our whitepaper into 3 blog posts" │
└─────────────────────────────────────────────┘
```

Drie voorgestelde prompts dienen als **examplars** — user ziet meteen wat ze kunnen vragen.

#### B. Inline hint in de Add Deliverable modal
Bovenaan de modal:
```
Quick tip: you can also ask the Brand Assistant —
"Create a linkedin-post about [topic]"  [Open Assistant →]
```

#### C. Slash-command op Canvas
Op elke Canvas-tab: een floating "?" knop die de Brand Assistant opent, voorgeladen met paginacontext:
```
💬 Ask about this deliverable
   • "Rewrite in a more formal tone"
   • "Shorten to 200 words"
   • "Make it more direct"
```

Hergebruikt de bestaande `claw` page-awareness (weet welke deliverable open is) + write-tools (kan `update_deliverable`).

#### D. Onboarding-tooltip (eenmalig)
Eerste keer dat een user Content Library opent, toon een dismissible tooltip:
```
Did you know? You can create content via the Brand Assistant.
Try: "Write a LinkedIn post about [your topic]"
[Try it now]  [Not now]
```

Persisteer dismiss in `UserProfile.preferences.brandAssistantTipDismissed`.

### Write-tools uitbreiding (als nodig)

Check of bestaande `create_deliverable` tool:
- ✅ Accepteert contentType, campaignId
- ✅ Triggert canvas-orchestrator voor text/image generatie
- ⚠️ Retourneert een URL om direct naar Canvas te navigeren (moet toegevoegd worden als mis)

Mogelijk nieuwe tool:
- `generate_content_batch` — "create N deliverables of type X in campaign Y" in één call

### Files
- `src/features/campaigns/components/content-library/ContentLibraryPage.tsx` — empty-state met Brand Assistant CTA
- `src/features/campaigns/components/shared/AddDeliverableTypeModal.tsx` — inline hint
- `src/features/campaigns/components/canvas/CanvasPage.tsx` — floating "?" knop
- `src/features/claw/components/OnboardingTooltip.tsx` — nieuw component
- `src/lib/claw/tools/write-tools.ts` — check `create_deliverable`, eventueel `generate_content_batch` toevoegen
- `prisma/schema.prisma` — `UserProfile.preferences.brandAssistantTipDismissed: boolean`

### Success criteria
- User die voor het eerst Content Library opent: ziet Brand Assistant optie in empty state
- Voorgestelde prompts werken daadwerkelijk en leiden tot content creatie
- Floating "?" op Canvas geeft contextuele hulp
- Dismiss-preference persisteert per user

---

## Roll-out volgorde + impact

Totaal: **~10 dagen** gespreid over 2 sprints.

| Sprint | Stap | Tijd | Clicks bespaard | Target user |
|---|---|---|---|---|
| **Sprint A** (snel winst) | 1. Auto-inherit | 2d | ~3 per vervolgitem | Power user |
| | 2. Repeat last knop | 1d | ~5 per repeat | Power user |
| | 3. Publish shortcuts | 1d | ~5 per approve-only | Reviewer |
| **Sprint B** (grotere features) | 4. Duplicate actie | 1d | ~3 per variant-op-bestaand | Power user |
| | 5. Bulk generate | 3d | ~5 × N per batch | Content-marketeer |
| | 6. Brand Assistant surfacing | 2d | N/A (nieuwe awareness) | Alle users |

Na Sprint A is de **power-user workflow structureel 4-5 clicks per content item** (vs huidige 7-10). Na Sprint B is de **chat-entry expliciet** en kunnen users content genereren via natuurlijke taal zonder door UI te navigeren.

---

## Wat niet in dit plan zit

- **Canvas herorder** (Medium vóór Variants) — apart voorstel uit flow-analyse, hoort in aparte refactor
- **Setup/Canvas duplicaat opruimen** — apart, hoort bij de "content-specifieke inputs alleen in Canvas" principe
- **"Planner" → "Publish" rename** — micro-fix, kan mee in één van deze sprints
- **Templates per content type** — ingetrokken
- **Parallel tweede entry-point** — expliciet ingetrokken na flow-analyse
- **Content generation quality plan** — apart document, hoort niet thuis in een UX-shortcuts plan (zie roll-out notitie onderaan)

---

## Success metrics (te meten 2 weken na rollout)

- **Time-to-first-variant-selection** voor repeat-scenarios: <30 seconden (was ~90s)
- **Canvas-step dropoff** op Step 1 en Step 3: naar <5% (was ~15-20%)
- **Brand Assistant usage rate** voor content-creation prompts: >10% van alle content creaties
- **Gemiddelde tijd Add → Published** voor approve-only items: <15 seconden

---

*Laatst bijgewerkt: 2026-04-24*
