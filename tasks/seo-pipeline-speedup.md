---
id: seo-pipeline-speedup
title: SEO 8-staps-pipeline versnellen (kwaliteit behouden)
fase: pre-launch
priority: now
owner: claude-code
status: in-progress
created: 2026-07-06
worktree: branddock-seo (feat/seo-pipeline-speedup)
---

## Doel
De SEO-pipeline (~11 min, 8 sequentiële AI-calls) versnellen naar ~5-7 min, met de
**harde randvoorwaarde** dat de draft-kwaliteit niet daalt.

## Kernprincipe (uit de dependency-analyse)
- **Kwaliteit-kritisch** (de prose zélf): stap 6 First Draft + 7 Editorial Review + 8
  Publication Prep → **premium model** (`canvas-text-generate` = Opus 4.7).
- **Mechanisch** (structured research/planning): stap 1-5 → **snel model**.
- **Parallel mogelijk**: alleen stap 2 & 3 (beide hangen enkel aan stap 1). 4-8 strikt
  sequentieel (elk heeft de vorige nodig).

## Geïmplementeerd (deze PR)
- **Fase 0 — Meten**: `SeoPipelineState.timings[]` + per-stap `console.log` (ms + welk
  model). Data leeft in het `SeoGenerationJob.state`-record + de Vercel-logs.
- **Fase 1 — Model-tiering**: nieuwe feature-key `canvas-seo-research` (Sonnet 4.6,
  per-workspace overridebaar). Stap 1-5 draaien hierop; 6-8 op premium. Verwachte
  winst ~-150s zonder kwaliteitsverlies (structured JSON is nauwelijks gevoelig).
- **Fase 2 — Parallellisatie**: de loop is een **wave-executor** geworden
  (`[[1],[2,3],[4],[5],[6],[7],[8]]`); stap 2 & 3 draaien parallel (`Promise.all`).
  Resumable-checkpoint + tiering geïntegreerd; deterministische accumulatie-volgorde.

## Bewust uitgesteld (measurement-gated — na deploy + meten)
- **Fase 3 — Context-trim**: de accumulatedContext groeit elke stap; late calls krijgen
  redundante context (stap 8 krijgt zowel de stap-6-draft als de stap-7-revisie). Trimmen
  is vooral een **kosten-optimalisatie** (input-tokens) met **marginale latency-winst**
  (generatie wordt door output-tokens gedomineerd), en veilig trimmen vraagt per-stap
  context-restructuring wat rond de kwaliteit-kritische late stappen risicovol is.
  → Uitgesteld tot de Fase-0-timing bewijst dat het de moeite/risico waard is.
- **Fase 4 — Stappen mergen/conditioneel**: stap 8→7 samenvoegen of stap 7 overslaan bij
  hoge F-VAL. Raakt de kwaliteit-kritische stappen → **eerst de Fase-0-data van de deploy
  nodig** + een F-VAL-A/B vóór we dit veilig kunnen doen. Niet blind.

## Kwaliteitsborging
- Draft/editorial/prep blijven **non-negotiable op premium**.
- Gegenereerde content krijgt sowieso F-VAL-scoring in de Canvas → dat is de kwaliteitsgate
  bij de smoke (vergelijk score vs een baseline-generatie).
- Tiering is **per-workspace terugdraaibaar** (WorkspaceAiConfig override naar Opus).

## Verificatie (deploy-smoke)
1. Genereer een long-form SEO-deliverable → meet de totale tijd (verwacht ~5-7 min).
2. Check `SeoGenerationJob.state.timings` (of Vercel-logs) → per-stap-latency → bevestig
   dat de research-stappen sneller zijn + waar de resttijd zit (input voor Fase 4).
3. Vergelijk de F-VAL-score + een handmatige lezing vs de ~19K-tekens-baseline van de
   eerdere smoke → kwaliteit moet standhouden.
