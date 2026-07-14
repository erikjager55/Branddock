---
id: video-chain-explainer-showcase
title: Multi-modal video chain — explainer-video full + lightweight video-ad/tiktok
fase: post-launch
priority: later
effort: ~4 dagen
owner: claude-code
status: open
created: 2026-05-12
completed: -
related-adr: -
related-spec: docs/specs/content-test-improvement-plan.md §3.0.5
worktree: -
---

> **Triage 2026-07-14 (doc-keeper-audit)**: (1) **Gate: de hele "Video & Audio"-
> categorie staat hidden** in de Add-Content-picker sinds 2026-05-19
> (`deliverable-types.ts`) — explainer-video/video-ad/tiktok-script zijn voor nieuwe
> deliverables onbereikbaar; bouw dit pas ná de re-enable-beslissing. (2) **Premisse
> deels ingehaald**: per-scene visuals bestaan al (scene-visual-split in
> `useCanvasStore`, `VideoSceneEditor.tsx`, `video-prompt-builder.ts` per-scene naar
> fal.ai) — alleen de script-chain (plan/coherence/assembly) ontbreekt; sluit daarop
> aan, niet greenfield. Modify-target `content-studio/.../video-output.tsx` is stale →
> `canvas/medium/Video*.tsx`.

# Probleem

Huidige Branddock: per video-type 1 prompt-call produceert script-tekst inclusief globale storyboard-descriptions. Geen aparte storyboard-image generatie, geen scene-level chain, geen script-storyboard coherence validation. Voor `explainer-video` (60-180s, 5-7 scenes) is single-prompt geen state-of-art aanpak.

Per beslissing 2026-05-12: explainer-video krijgt full 5-staps chain als showcase; video-ad + tiktok-script krijgen lightweight hook-focused chain; linkedin-video + promo-video deferred post-launch.

# Voorstel

## A. Explainer-video full chain (~2.5d)

5-staps chain per plan §3.0.5:

```
1. PLAN-stap: story-beat outline
   { acts: [{name, secondsBudget, beats: [{beat, emotionalArc}]}] }

2. EXECUTE-stap A (per scene, sequential):
   { sceneScript, vo, visualDirection }
   Met scene-N-1 als anchor voor consistency.

3. EXECUTE-stap B (per scene, parallel met A waar mogelijk):
   { frameDescription, cameraAngle, lighting, subjectAction }
   → Naar Gemini image-gen voor frame-render

4. VALIDATE-stap: coherence-check
   Pairs (script + frame) per scene
   { coherenceScore, mismatches: [{sceneN, issue}] }
   Bij low-coherence: re-prompt failing scene

5. ASSEMBLY-stap: shot-list + timing-strip
   Shooting-ready document
```

`coreAnalogy` field uit campaign-strategy.ts blijft de rode draad door alle scenes.

## B. Video-ad + tiktok-script lightweight chain (~1.5d)

Hook-focused 3-step chain (kortere video-formats hebben geen 5-staps overhead nodig):
- Hook-stap: pattern-interrupt opening (hookSecond 0:00-0:03)
- Middle-stap: payoff + demo (payoffMoment timing)
- CTA-stap: skip-deterrent + call-to-action

# Acceptatiecriteria

**Explainer-video**:
- [ ] `src/lib/ai/video-chain/explainer-chain.ts` — 5-staps orchestrator
- [ ] Story-beat outline schema (Zod)
- [ ] Script-per-scene + storyboard-per-scene parallel-generation
- [ ] Coherence-validate stap met re-prompt mechanism
- [ ] Assembly-output: structured doc met shot-list + timings
- [ ] SSE-events per stage zodat UI progress kan tonen

**Lightweight video-ad/tiktok**:
- [ ] `src/lib/ai/video-chain/hook-chain.ts` — 3-staps hook/middle/cta
- [ ] Type-bundle integratie (campaign-strategy.ts hookSecond/payoffMoment/skipDeterrent al gedefinieerd, hergebruik)

**UI updates**:
- [ ] Step 4 video-output toont per scene: script + frame thumbnail + timing
- [ ] Edit-per-scene mogelijkheid (regenerate enkele scene zonder andere te raken)

**Quality gates**:
- [ ] `npx tsc --noEmit` + `npm run lint` 0 errors
- [ ] Smoke-test op Goed-Bouw (heeft brand-content): genereer explainer-video → 5-7 scenes uitgekomen → script+frame coherent per scene
- [ ] Cost-impact: ~+50% per video-type (Plan + N execute calls) — accepteer voor expensive types

# Bestanden die ik aanraak (high-level)

**Nieuw**:
- `src/lib/ai/video-chain/explainer-chain.ts`
- `src/lib/ai/video-chain/hook-chain.ts`
- `src/lib/ai/video-chain/story-beat-schema.ts` (Zod schemas)
- `src/lib/ai/video-chain/coherence-validator.ts`

**Modify**:
- `src/lib/studio/prompt-templates/video-audio.ts` — chain-routing
- `src/lib/ai/canvas-orchestrator.ts` — video-chain dispatch
- `src/features/content-studio/components/canvas/video-output.tsx` (of equivalent) — per-scene UI

# Risico's, scope, notes

Zie plan-doc §3.0.5. **Dependency**: depends op compose-pipeline-gemini-migration voor storyboard-frame generation (Gemini > FAL Flux Pro Kontext per user-experience). **Sprint-fit**: parallel met #5.B chain-upgrades (zelfde patroon, andere modality).

**Linkedin-video + promo-video deferred** per beslissing 2026-05-12 — afhankelijk van pilot-vraag post-launch.
