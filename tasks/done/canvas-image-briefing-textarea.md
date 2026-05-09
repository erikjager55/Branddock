---
id: canvas-image-briefing-textarea
title: Briefing-textarea + AI-suggestie in Visual Brief — concrete subject-omschrijving
fase: pre-launch
priority: now
effort: 1 dag
owner: claude-code
status: done
created: 2026-05-08
completed: 2026-05-08
related-adr: -
related-spec: -
worktree: -
---

# Probleem

`VisualBriefSection` heeft nu alleen een `styleDirectionFreeText` veld (audit Laag 5 schets). Dat doet dubbel werk: het is bedoeld voor stijl-uitzonderingen ("not too saturated", "avoid blue") maar wordt ook gebruikt voor subject-omschrijving ("Sarah in coworking space"). Dat splijt de mentale flow.

Plan-task vraagt om drie keuzes: type beeld + stijl + **concrete briefing**. Een dedicated briefing-textarea + AI-suggestie-knop maakt dit expliciet en geeft de gebruiker een 1-klik manier om uit campaign-context een concrete subject-omschrijving te genereren ("vat de content samen tot wat het beeld moet tonen").

Audit-bronpaper: `docs/audits/2026-05-08-canvas-image-briefing-plan.md` Laag 5 (UX-flow concept).

# Voorstel

Nieuwe veld `briefingText: string | null` toevoegen aan `VisualBrief` type. UI-veld in `VisualBriefSection` boven `styleDirectionFreeText`. Naast textarea een knop "Suggest from content" die een nieuwe API-route `/api/studio/[id]/suggest-visual-briefing` aanroept (Claude Sonnet, single-turn) — krijgt de complete CanvasContextStack en retourneert 1-2 zinnen subject-omschrijving.

`buildVisualBriefImagePrompts()` consumeert `briefingText` als alternatief subject-seed (overrules keyMessage als ingevuld). Builder logic: `subjectSeed = briefingText ?? subject.keyMessage ?? ...`.

# Acceptatiecriteria

- [ ] `VisualBrief` type uitgebreid met `briefingText: string | null` in `src/lib/ai/canvas-context.ts`
- [ ] `parseVisualBrief()` leest het veld; backward-compat null-default
- [ ] Nieuwe textarea in `VisualBriefSection` (Step1Context.tsx) — label "Briefing", placeholder "Beschrijf wat het beeld moet tonen — wie, wat, waar"
- [ ] Knop "Suggest from content" (sparkles icon) → fire `/api/studio/[id]/suggest-visual-briefing` POST → vult textarea met response (instant, niet streaming voor pilot)
- [ ] Loading state op knop tijdens fetch (~2s typische response)
- [ ] Nieuwe route `/api/studio/[deliverableId]/suggest-visual-briefing/route.ts`:
  - `assembleCanvasContext` ophalen
  - Claude-call met system-prompt: "Vat samen wat het beeld voor deze content moet tonen in 1-2 zinnen. Geef concrete details: wie, waar, wat, sfeer."
  - Return `{ briefing: string }`
  - AI-rate-limit middleware
  - Cache invalidation na PATCH naar deliverable
- [ ] Builder `buildVisualBriefImagePrompts()` consumeert `briefingText` als subject-seed (overrules keyMessage)
- [ ] Persistence via bestaande debounced PATCH naar `/api/studio/[id]` (settings.visualBrief.briefingText)
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors

# Bestanden die ik aanraak

- `src/lib/ai/canvas-context.ts` (VisualBrief type + parser)
- `src/lib/ai/visual-brief-prompts.ts` (builder gebruikt briefingText als subject-seed)
- `src/features/campaigns/components/canvas/accordion/Step1Context.tsx` (nieuwe textarea + button in VisualBriefSection)
- `src/features/campaigns/stores/useCanvasStore.ts` (action `setVisualBriefBriefingText`, mark visualBriefModified flag)
- `src/app/api/studio/[deliverableId]/suggest-visual-briefing/route.ts` (nieuw)

# Bestanden die ik NIET aanraak

- 4 visual-routes — gebruiken al `assembleCanvasContext` die `briefingText` levert via VisualBrief; builder leest het transparant
- `InsertImageModal.tsx` — bypass-laag, niet relevant
- Defaults-helper uit task `canvas-image-briefing-defaults` — orthogonale UI-laag

# Smoke test plan

1. Maak deliverable `blog-post` met keyMessage + persona + product
2. Step 1 → VisualBriefSection: nieuwe Briefing textarea zichtbaar
3. Klik "Suggest from content" → button shows spinner → ~2s later vult textarea met bv. "37-year-old brand director in coworking space, considering brand strategy, morning light"
4. Optioneel: edit briefing-tekst handmatig
5. Wacht 500ms → debounced PATCH fires (network-tab `PATCH /api/studio/{id}` met `settings.visualBrief.briefingText`)
6. Klik Generate visual op Step 2 → final prompt heeft Subject = briefingText, niet keyMessage
7. Refresh → briefingText blijft bewaard

# Risico's

- **Claude-call kost ~$0.005 per suggestie** → mitigatie: AI-rate-limit middleware via bestaande `withAiRateLimit`. Geen aparte budget; valt onder workspace's bestaande limit.
- **Briefing-tekst overrules keyMessage zonder waarschuwing** → mitigatie: hint-tekst onder textarea: "Subject voor het beeld. Overrules je keyMessage als ingevuld."
- **AI-suggestie zonder context (lege brief / geen persona)** → mitigatie: fallback "Beschrijf wat je wil zien" — niet AI fire — voorkomt slechte prompts. Disable button als context onvoldoende (geen keyMessage + geen persona).

# Out of scope

- Streaming response — instant fetch is genoeg voor pilot
- Briefing-tekst regenereren met variations — knop "Regenerate" kan later
- Briefing-tekst auto-fill on canvas-open — alleen on-click; user agency belangrijk
- Vertalingen (briefing in Nederlands vs Engels) — laat aan model over, system-prompt vraagt taal van content

# Notes

API-route schets:

```ts
// /api/studio/[deliverableId]/suggest-visual-briefing/route.ts
const stack = await assembleCanvasContext(deliverableId, workspaceId);
const result = await anthropicClient.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 200,
  system: `Vat samen wat het beeld voor deze content moet tonen in 1-2 concrete zinnen.
Geef WIE, WAAR, WAT, SFEER. Schrijf zoals iemand een fotograaf zou briefen.`,
  messages: [{
    role: 'user',
    content: `Brand: ${stack.brand.brandName}
Personas: ${stack.personas.map(p => p.serialized).join('; ')}
Products: ${stack.products.map(p => `${p.name} - ${p.description}`).join('; ')}
Key message: ${stack.brief?.keyMessage}
Campaign theme: ${stack.concept?.creativePlatform}
Style chip: ${stack.visualBrief?.styleDirection ?? 'none'}`
  }],
});
return { briefing: result.content[0].text };
```

Builder-update simpel:

```ts
// visual-brief-prompts.ts buildVisualBriefImagePrompts:
const subjectSeed = brief.briefingText?.trim()
  ?? subject.keyMessage?.trim()
  ?? subject.objective?.trim()
  ?? `Brand visual for ${brand.brandName}`;
```

## Decisions 2026-05-08 (Erik gedelegeerd)

- **Briefing-textarea SPLITSEN van `styleDirectionFreeText`**: bevestigd. Twee aparte velden in UI, twee aparte velden in payload, twee aparte rollen in image-prompt:
  - `styleDirectionFreeText` (bestaand) — **stijl-hints** ("editorial photography, warm tones, shallow DoF")
  - `imageBriefing` (nieuw) — **content-instructie** ("vrouw rond de 35 in een café, laptop open, koffie in beeld")
  - In de image-prompt-builder: subject-seed komt van `briefingText`, stijl-modifiers van `styleDirectionFreeText`. AI behandelt ze apart in plaats van één lange string te moeten parseren.
- **AI-suggestie via Claude (in scope task)**: nieuw endpoint `/api/studio/[deliverableId]/suggest-visual-briefing` met Claude Haiku-call die op brief + concept + persona + product een 1-3 zin briefing suggereert. Knop "Suggest from content" naast de textarea. Conservative: bij parse-error of empty result → laat veld leeg, geen fallback-tekst.

## Implementation summary 2026-05-08

**Files changed**:
- `src/lib/ai/canvas-context.ts` — `VisualBrief` type uitgebreid met optional `briefingText: string | null`. `parseVisualBrief()` leest het veld; backward-compat null-default voor oude payloads (zonder veld).
- `src/lib/ai/visual-brief-prompts.ts` — `buildVisualBriefImagePrompts()` controleert nu eerst `brief.briefingText?.trim()`. Als ingevuld: gebruikt het verbatim als subject-seed. Anders: chip-aware fallback via `buildSubjectByChip()` (uit task #2).
- `src/features/campaigns/stores/useCanvasStore.ts` — nieuwe action `setVisualBriefBriefingText(text)` met `visualBriefModified: true` flag voor autosave.
- `src/features/campaigns/components/canvas/accordion/Step1Context.tsx` — Briefing-textarea + "Suggest from content" knop boven Source-radio. Loading/error state. Disabled wanneer geen deliverableId. Niet auto-applied — user-agency.
- `src/app/api/studio/[deliverableId]/suggest-visual-briefing/route.ts` (new) — `POST` met `assembleCanvasContext` + Claude Haiku call (`claude-haiku-4-5-20251001`, max 200 tokens, temp 0.7). System-prompt: "Je bent een art-director... WIE / WAAR / WAT / SFEER... maximaal 2 zinnen, geen marketing-jargon". 422 bij onvoldoende context (geen keyMessage + geen persona + geen product). 502 bij empty AI response. AI-rate-limit middleware. Return `{ briefing: string }`.
- `scripts/smoke-tests/image-briefing-textarea.ts` (new) + `npm run smoke:image-briefing`

**Quality gates**:
- ✅ `npx tsc --noEmit` 0 errors
- ✅ `npm run lint` 0 errors (962 warnings, baseline ongewijzigd)
- ✅ `npm run smoke:image-briefing` 10/10 passed

**Smoke-test bewijs (subject-seed prioriteit)**:
- WITH `briefingText: "Vrouw rond de 35 in een café, laptop open, koffie in beeld, ochtendlicht"` + persona Maria + product Brand Voice Analyzer → Subject = briefingText verbatim, GEEN persona-naam, GEEN product-naam
- WITHOUT briefingText (null/undefined/whitespace) → fallback naar chip-aware via persona+product (task #2 mechanisme intact)
- Backwards-compat: oude payloads zonder `briefingText` veld werken ongewijzigd

**UI hand-test handover**:
1. Start dev (zie memory-tip voor zombie-recovery indien nodig)
2. Open Canvas voor `blog-post` met persona + product → Step 1 → VisualBriefSection
3. Verwacht: Briefing-sectie boven Source met textarea + violet "Suggest from content" knop (Sparkles icon)
4. Klik "Suggest from content" → spinner ~2s → textarea vult met fotograaf-style briefing in NL
5. Edit handmatig → debounce-PATCH fires → refresh page → briefingText blijft bewaard
6. Klik Generate Visual op Step 2 → network-tab response `variants[].prompt` heeft Subject = briefingText, niet meer persona/product
7. Edge: deliverable zonder context → "Suggest" geeft 422 + UI toont error "Insufficient context"

**Out-of-scope items die ik bewust niet aanraakte**:
- Streaming response (instant fetch is genoeg voor pilot)
- Regenerate-knop voor variations
- Auto-fill on canvas-open (alleen on-click; user-agency)
- Vertalingen — system-prompt vraagt taal van content, model handelt

## Image-track VOLLEDIG AFGEROND

3 van 3 image-bouw-tasks gemerged:
- ✅ #1 `canvas-image-briefing-defaults` — 25 type-defaults + suggestie-strook (20/20)
- ✅ #2 `canvas-image-content-coupling` — persona+product+cta+concept+platform in image-prompts (25/25)
- ✅ #3 `canvas-image-briefing-textarea` — dedicated briefing + Claude-suggestie route (10/10)

Erik's image-pijler ("beelden slaan vaak niet terug op content") is nu structureel geadresseerd via 3 lagen: defaults nudgen het uitgangspunt, content-coupling injecteert relevant context, briefing geeft user de ultieme override.
