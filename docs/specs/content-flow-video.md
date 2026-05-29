# Content-flow analyse — Video & Audio

> **Status**: ingevuld 2026-05-29 · sub-sprint **#7.A** · methode: code-audit
> **Types (5, "Video & Audio")**: `explainer-video` · `testimonial-video` · `promo-video` · `webinar-outline` · `podcast-outline`
> Bron: `deliverable-types.ts:806-876` · template-registry `prompt-templates/video-audio.ts`
> ⚠️ **Hele categorie staat `hidden: true`** — wacht op video-generatie pipeline (§6). Bevestigd in werkstroom-notitie 2026-05-20 ("Video & Audio categorie weg").

## 1. Pipeline-doorloop — category-specific checkpoints

Standaard tekst-generatie pad (`canvas-orchestrator.ts:175`); video levert **scripts/outlines**, geen video-assets.

- **Scripted-scene override is de kern** (`canvas-orchestrator.ts` `isScriptedScene`, `:133-137`): script-types renderen hook/body/cta als scènes met exact één `[VISUAL: …]` per scène, optioneel `[B-ROLL]` + `[CAPTION]`, en de "cta" is een volledige Offer-beat scène (gesproken), niet korte buttontekst.
- Geen Plan-and-Solve, geen SEO. De gates draaien, maar er is **geen scène-coherentie/timing-gate** (geen check op looptijd of scène-balans) — category-specifieke blinde vlek.

## 2. Prompt-quality

- **Bestand**: `src/lib/studio/prompt-templates/video-audio.ts` — 531 regels, `PROMPT_VERSION 1.2.0`.
- **Alle 5 types hebben een dedicated template** (`explainer-video`, `testimonial-video`, `promo-video`, `webinar-outline`, `podcast-outline`) — geen generieke fallback.
- **Few-shot**: ≈5 example-referenties — mager voor een format met strikte scène-conventies.
- Gedeelde helper `buildVideoAudioUserPrompt`. Format-specifieke timing-guidance (60s vs 120s).

## 3. Output-format (geverifieerd)

`explainer-video`/`testimonial-video`/`promo-video`/`podcast-outline` Text (script/outline) · `webinar-outline` Text+PDF · export ondersteunt `srt` (`deliverable-types.ts:806-876`).

## 4. Asset-pattern

- **Video-script** (scène-structuur): `explainer-video`, `testimonial-video`, `promo-video`.
- **No-asset outline**: `webinar-outline`, `podcast-outline`.
- Geen daadwerkelijke video/audio-asset-generatie in de huidige pipeline — precies de reden voor de hidden-status.

## 5. Recente gotchas (categorie-relevant)

- Geen video-specifieke entry in `gotchas.md`. Het scripted-scene format is bewust geëngineerd (geen comma-list visuals); afwijking is het bekende risico. Cross-cutting F-VAL/effie van toepassing.

## 6. Friction-points

- **Categorie volledig hidden**: alle 5 types `hidden: true` — output is script-only, er is geen video-render-pipeline.
- **Multi-modal video-chain ontbreekt**: de volledige 5-staps chain (Plan/Script-per-scene/Storyboard/Coherence/Assembly) is gepland als `video-chain-explainer-showcase` (open Track A task) maar nog niet gebouwd.
- **Few-shot tekort** bij het meest format-gevoelige outputtype.
- *pending Ronde 1* — niet zinvol te testen zolang hidden.

## 7. Verbeter-aanbevelingen

1. **Hidden houden tot de video-pipeline staat** — niet activeren met script-only output. Koppel her-activatie aan `video-chain-explainer-showcase`. → cross-link.
2. **Scène-coherentie/timing-gate** toevoegen wanneer de categorie weer live gaat (totale looptijd + scène-balans als checkpoint).
3. **Few-shot uitbreiden** met sterke scène-anchors per script-type vóór her-activatie.

## 8. Cross-type patterns / DRY

- 5 types delen `buildVideoAudioUserPrompt`; scripted-scene-logica is gedeeld via de `isScriptedScene`-override (raakt ook `tiktok-script` in social en `video-ad`/`linkedin-video-ad` in advertising) → **cross-categorie gedeelde scène-engine**, beste DRY-voorbeeld in de codebase. Synthesis §D.
- **Noot**: `TYPE_TO_CATEGORY` noemt voor video nog `product-demo` (phantom, geen deliverable-type) en mist `testimonial-video`. Stale map; zie synthesis §C + ticket CF-4.

## Referenties (file:line)

- `canvas-orchestrator.ts:175`, `:133-137` (scripted-scene)
- `src/lib/studio/prompt-templates/video-audio.ts` (531r, v1.2.0, 5 templates)
- `deliverable-types.ts:806-876` (live hidden-flags)
- Track A task: `tasks/video-chain-explainer-showcase.md`
