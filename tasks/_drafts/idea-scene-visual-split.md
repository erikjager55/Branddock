---
id: scene-visual-split
title: Per-scene Visual sectie — split VisualVariantsBlock voor scene-aware video-script types
fase: pre-launch (afhankelijk van pilot-prioriteit) of post-launch
priority: needs-triage
effort: ~3-5d totaal (3 fasen)
owner: tbd
status: draft
created: 2026-05-19
related-task: content-items-test-coverage
related: tasks/_drafts/idea-linkedin-ad-formats-followups.md (F3 variant-strategy)
---

# Probleem

Voor video-script content-types (`tiktok-script`, `linkedin-video-ad`, `video-script`, `explainer-video-script`, `brand-video-script`, etc.) genereert het prompt-systeem een scene-breakdown met `hook` / `body` / `cta` (en variaties) als aparte tekst-groepen. De per-scene video-generatie pipeline (`VideoSceneEditor` + `generate-video` route) vereist per-scene een **source-image** als startframe.

Huidige situatie:
- **Eén workspace-level Visual sectie** (`VisualVariantsBlock` in `Step2ContentVariants.tsx:724`) levert 1-N `imageVariants` voor het hele content-item
- **Eén `heroImage`** in canvas-store wordt door alle scenes gedeeld
- Auto-trigger in `VideoSceneEditor` (commit `a18ce53f`) gebruikt `heroImage.url ?? imageVariants[0].url` als default `sourceImage` voor **álle drie** de scenes → alle scenes starten van dezelfde frame
- Result: video-clips zijn visueel uniform; geen scene-specifieke compositie (bv. Hook = wide-shot, Body = medium product-detail, CTA = closing brand-frame)

User-feedback 2026-05-19: *"Ik wil per scene een visual genereren, selecteren of video selecteren. Doe dit vanuit hetzelfde principe als de visual sectie zoals die nu in stap 2 staat. Niet iets nieuws bouwen, maar een split."*

# Aanpak

`VisualVariantsBlock` parameteriseren met een optionele `sceneId` zodat dezelfde component zowel workspace-level (huidige niet-video flows) als per-scene (video flows) kan draaien. State + API + storage uitbreiden met scene-scoping.

**Hergebruik = leidend**. Geen nieuwe component. Alle 8 source-tabs (generate / library / upload / url / stock / compose / trained / photography-request) plus reuse-detection + refine-flow blijven werken per scene.

# Drie fasen

## Fase 1 — Data-laag scene-scoping (~1-1.5d)

**Doel**: state-management + API ondersteunt per-scene image-variants zonder bestaande workspace-level flow te breken.

**State (canvas-store)**:
- Nieuwe veld `sceneImageVariants: Map<SceneId, CanvasImageVariant[]>` parallel aan bestaande `imageVariants`
- Nieuwe veld `sceneHeroImage: Map<SceneId, CanvasHeroImage | null>` parallel aan `heroImage`
- Selectors: `getSceneImageVariants(sceneId)`, `setSceneImageVariants(sceneId, variants)`, `setSceneHeroImage(sceneId, hero)`
- Backwards-compat: bestaande `imageVariants` en `heroImage` blijven voor non-scene flows; scene-aware flow gebruikt nieuwe Map

**Persistence**:
- `Deliverable.settings.scenes`: `Record<SceneId, { imageVariants?: CanvasImageVariant[]; heroImage?: CanvasHeroImage | null; visualBriefSource?: VisualBriefSource }>`
- Hydration in `CanvasPage` op mount: lees `settings.scenes` en vul `sceneImageVariants` Map
- Persist op variant-generation / source-switch / hero-set

**API routes — accept `sceneId`**:
- `POST /api/studio/[id]/generate-visual` accept optional `sceneId` in body
- `POST /api/studio/[id]/generate-visual-compose` idem
- `POST /api/studio/[id]/generate-visual-trained` idem
- `POST /api/studio/[id]/select-library-visual` idem
- Backend persistence: schrijf variants naar `settings.scenes[sceneId].imageVariants` ipv top-level `settings.imageVariants` als sceneId set is

**Acceptance**:
- Bestaande tiktok-script / linkedin-video-ad zonder scene-image kan nog steeds workspace-level visual gebruiken (fallback)
- Nieuwe per-scene API calls schrijven naar scene-scoped persistence
- TSC clean, geen breaking changes voor non-video types

## Fase 2 — UI split: VisualVariantsBlock per scene (~1.5-2d)

**Doel**: in SceneBreakdown render 3 VisualVariantsBlock-instances (één per scene), niet de workspace-level versie.

**VisualVariantsBlock signature uitbreiden**:
```tsx
function VisualVariantsBlock({
  deliverableId,
  sceneId,                    // ← nieuw, optional (workspace-level wanneer undefined)
  onGenerate,
  status,
  errorMessage,
}: VisualVariantsBlockProps) {
  // sceneId === undefined → leest imageVariants + heroImage (huidige flow)
  // sceneId === 'hook'|'body'|'cta' → leest sceneImageVariants[sceneId] + sceneHeroImage[sceneId]
  // ...
}
```

**Step2ContentVariants render-logica**:
- `hasSceneGroups` (video-type met scene-breakdown) → render workspace-level VisualVariantsBlock NIET; rendert SceneBreakdown waarin per scene een VisualVariantsBlock-instantie nested zit
- Non-video / non-scene types → render workspace-level VisualVariantsBlock (huidige flow)

**SceneBreakdown rendering**:
```tsx
{SCENE_CONFIG.map(({ id, label, ... }) => (
  <div key={id} className="rounded-lg p-3" style={{...}}>
    <Icon /> {label}
    {/* Spoken text + visual + caption flow (huidige) */}
    {parsedSegments...}

    {/* NIEUW: per-scene Visual section */}
    <VisualVariantsBlock
      deliverableId={deliverableId}
      sceneId={id}
      onGenerate={() => generatePerScene(id)}
      status={...}
      errorMessage={...}
    />
  </div>
))}
```

**Extra source-tab voor video-types**: bestaande tabs blijven (generate / library / upload / url / stock / compose / trained / photography-request), plus voor video-types extra "Video URL" tab waar gebruiker een externe video kan selecteren (matched met huidige `SceneCard.videoUrl` source-mode in VideoSceneEditor — daar bestaat het al).

**Acceptance**:
- Voor linkedin-video-ad / tiktok-script / etc.: zie 3 Visual-sections binnen scene-breakdown blocks (hook / body / cta)
- Per scene werkt alle 8 source-tabs + nieuwe Video URL tab
- Generate-button is scene-specific (kost 3× zo veel API-calls voor full coverage — user kan ook selectief 1 scene genereren)
- Workspace-level Visual sectie verdwijnt uit Step 2 voor video-types (vermijdt duplicate)

## Fase 3 — Video-gen pipeline gebruikt per-scene source (~0.5-1d)

**Doel**: `VideoSceneEditor` + auto-trigger gebruiken per-scene visual ipv workspace-level fallback.

**VideoSceneEditor wijzigingen**:
- Replace `const defaultSourceImage = heroImage?.url ?? imageVariants[0]?.url` met per-scene resolve:
  - `getSourceImageForScene(sceneId) = sceneHeroImage[sceneId]?.url ?? sceneImageVariants[sceneId]?.[0]?.url ?? heroImage?.url ?? imageVariants[0]?.url`
- Auto-kick loop: per scene een specifieke source. Skip auto-kick voor scene waarbij user "video URL" heeft geselecteerd (gebruiker heeft externe video, geen gen nodig).
- SceneCard's `sourceMode` selector + URL-paste blijft werken (geen breaking change).

**Acceptance**:
- Hook-video gebruikt scene-hook-image als startframe
- Body-video gebruikt scene-body-image
- CTA-video gebruikt scene-cta-image
- Wanneer scene geen eigen image heeft → fallback naar workspace-level (graceful)
- Wanneer scene een externe video-URL heeft → skip video-gen; gebruik direct

# Concrete bestanden geraakt

**Fase 1**:
- `src/features/campaigns/stores/useCanvasStore.ts` — nieuwe sceneImageVariants Map + selectors
- `src/features/campaigns/types/canvas.types.ts` — scene-scoped types
- `src/app/api/studio/[deliverableId]/generate-visual/route.ts` — accept sceneId param
- `src/app/api/studio/[deliverableId]/generate-visual-compose/route.ts` — idem
- `src/app/api/studio/[deliverableId]/generate-visual-trained/route.ts` — idem
- `src/app/api/studio/[deliverableId]/select-library-visual/route.ts` — idem
- `src/features/campaigns/components/canvas/CanvasPage.tsx` — hydration van scene-scoped state

**Fase 2**:
- `src/features/campaigns/components/canvas/accordion/Step2ContentVariants.tsx`:
  - `VisualVariantsBlock` accept optional `sceneId` prop, conditional state-read
  - `SceneBreakdown` render per-scene VisualVariantsBlock
  - Step2 root: hide workspace-level VisualVariantsBlock wanneer `hasSceneGroups`
- `src/features/campaigns/components/canvas/ImageSourcePanel.tsx` — toevoegen 'video-url' source-tab voor video-types
- `src/features/campaigns/hooks/useCanvasOrchestration.ts` — generate-visual call doorgeven sceneId

**Fase 3**:
- `src/features/campaigns/components/canvas/medium/VideoSceneEditor.tsx`:
  - Per-scene source-image resolver
  - Auto-kick gebruikt scene-specifieke source
- `src/features/campaigns/hooks/useVideoGeneration.ts` — geen wijziging nodig (sceneId al param)

# Out of scope

- **Video-URL als visual-bron voor non-video-script types** — video-source-tab alleen voor VIDEO_ADJACENT_TYPES
- **Compose-mode per scene met cross-scene references** — compose-pipeline blijft binnen één scene scope
- **Auto-translate scene-spoken-text naar scene-image-prompt** — gebruiker schrijft/edits het visual-brief per scene (zoals nu workspace-level werkt). Future enhancement: auto-suggest visual brief per scene via existing "Suggest setup from content" pattern (Step 1 chip)
- **Scene-image consistency-checker** — visueel coherence-check tussen 3 scene-images (zelfde brand-style anchors al via F40 brand-style-anchors, ~80% sufficient pre-launch)

# Risico's

- **State-migration legacy deliverables**: bestaande tiktok-script deliverables hebben workspace-level imageVariants + geen scene-scoped data. Hydration moet graceful zijn: lees workspace-level + dupliceer optioneel naar Map[sceneId='hook'] als initial value. Of accept dat oude items workspace-level blijven en alleen nieuwe items per-scene gebruiken. Aanbeveling: optie 2 (geen migration) — minder breaking risk, user kan handmatig refresh genereren per scene.
- **API-cost 3× bij full generate**: gebruiker kan kiezen om 1 of meerdere scenes te genereren (huidige UX); auto-kick op Step 3 doet één call per scene → 3× FAL/Gemini-calls. Cost-transparent in UI (e.g. show count + estimated cost per scene-generate-button).
- **UI density**: 3 VisualVariantsBlock-instances + 3 SceneCards + 3 video-player-areas in Step 3 = veel info. Collapse-friendly per scene by default (open hook, body/cta gecollapsed) zou helpen.
- **Backwards-compat met bestaande non-video flow**: VisualVariantsBlock zonder sceneId prop moet 100% identiek werken aan huidige versie. Type-narrowing op sceneId verplicht.

# Phasing & dependencies

Sequentieel:
1. **Fase 1** moet eerst — data-laag is fundament
2. **Fase 2** afhankelijk van Fase 1 (UI leest van scene-scoped state)
3. **Fase 3** afhankelijk van Fase 2 (video-gen gebruikt scene-state)

Mogelijke parallelle work-splits:
- Fase 1 schema + API kan parallel met Fase 2 UI als interface contract vast staat

# Acceptatiecriteria — end-to-end

Tester maakt nieuwe linkedin-video-ad:
1. **Step 1**: vult content brief in (zoals nu)
2. **Step 2**: zie scene-breakdown met 3 cards (Hook/Body/CTA). Onder elke scene-card een **Visual sectie** (zelfde UI als huidige Step 2 workspace-Visual: 8+1 source-tabs, generate-button, variant-grid, refine-flow)
3. Genereert image voor Hook (scene-image-1) en Body (scene-image-2); selecteert library-asset voor CTA (scene-image-3)
4. **Confirm Step 2** → Step 3 opent
5. Auto-trigger video-gen kicks per scene met scene-specifieke source-image
6. 3 video-clips geproduceerd met visueel onderscheid per scene
7. Compose-video stitcht 3 clips samen tot final ad
8. Step 4 publish-checklist passes

# Volgende stappen voor promote

Wanneer je deze idea wilt uitvoeren:
1. Promote naar `tasks/scene-visual-split-fase-1.md` (data-laag)
2. Plus `tasks/scene-visual-split-fase-2.md` (UI split)
3. Plus `tasks/scene-visual-split-fase-3.md` (video-gen wiring)
4. Schedule bij sprint #6 of #7 — afhankelijk van linkedin-video-ad pilot-priority
5. Coördineer met `idea-linkedin-ad-formats-followups.md` F3 variant-strategy (overlapping scene-aware logic)
