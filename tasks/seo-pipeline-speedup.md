---
id: seo-pipeline-speedup
title: SEO 8-staps-pipeline versnellen (kwaliteit behouden)
fase: pre-launch
priority: now
owner: claude-code
status: open
created: 2026-07-06
worktree: "- (branddock-seo opgeruimd; heropen bij Fase 3/4)"
---

> **Doc-sync 2026-07-12**: alle geplande code is **gemerged op `main`** via PR #83
> (merge `78e802b6`, 2026-07-06) — Fase 0 timings + Fase 1 model-tiering
> (`canvas-seo-research`) + Fase 2 wave-executor — plús een **round 2** die verder
> ging dan dit plan (`3be8f487`: checklist-only stap 8, variant B op het snelle
> model, outline-cap). Er wordt níet meer actief gebouwd; status → `open` omdat de
> rest **meting-gated** is: de deploy-meting (Fase-0-timings + F-VAL-vergelijk, nu
> onderdeel van [`pre-launch-browser-smoke-batch`](pre-launch-browser-smoke-batch.md))
> is de go/no-go voor Fase 3 (context-trim) en Fase 4 (stappen mergen/conditioneel).

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

## Meting (deploy-smoke 2026-07-13 — de go/no-go-gate is gedraaid)

Databronnen: 6 voltooide pilot-runs op prod (6-7 juli, ná de Fase-1/2-deploy) + 1 verse
smoke-run op de actuele deploy (13 juli, smoke-account `erik+claude-smoke-7e@`). Per-stap
uit `SeoGenerationJob.state.timings` (prod-DB), wall-clock uit `startedAt→completedAt`.

**Per-stap (gemiddeld over 6 pilot-runs; verse run vergelijkbaar):**

| Stap | gem. | spreiding | model |
|---|---|---|---|
| 1 kickoff | 16,8s | 12,7-22,9 | snel |
| 2 ‖ 3 (parallel) | 61,6s effectief | — | snel |
| 4 | 43,6s | 35,2-48,3 | snel |
| 5 | 100,4s | 86,2-118,3 | snel |
| 6 first draft | 109,7s | 93,1-123,4 | premium |
| 7 editorial | 102,1s | 82,4-116,4 | premium |
| 8 publication prep | 73,3s | **42,4-130,0** | snel (checklist-only, correctie 4a: stond hier onterecht als premium) |

**Totalen**: wall-clock gem. **10,9 min** (pilot; verse run 12,0 min) vs effectieve
AI-tijd **~7,5-8,5 min** → **2,4-4,5 min niet-AI-overhead** per run (cron-pickup,
checkpoint-persist, context-opbouw, en vermoedelijk de F-VAL-judge ná stap 8 — die valt
búiten de 8 getimede stappen). **Kwaliteit**: F-VAL op de pilot-runs 92,0 en 90,0,
beide threshold-met.

**Verdict (go/no-go per fase):**
- **Doel 5-7 min is nog NIET gehaald** (9-13 min in de praktijk).
- **NIEUW — grootste hefboom: de niet-AI-overhead (2,4-4,5 min).** Eerst uitzoeken waar
  die zit (instrumenteer buiten de stap-calls: context-opbouw, checkpoint-saves,
  F-VAL-judge, queue-gaps) — potentieel gratis winst zonder kwaliteitsrisico. → **Fase 3b
  (overhead-analyse), vóór alles.**
- **Fase 4 (stap 7/8 mergen of conditioneel skippen): GO** — 7+8 kost gem. 2,9 min
  premium-tijd; de stap-8-spreiding (42-130s) suggereert bovendien dat het
  checklist-only-pad niet altijd actief is. Vereist de geplande F-VAL-A/B.
- **Fase 3 (context-trim): NO-GO als latency-maatregel** — de stappen zijn
  output-gedomineerd, precies zoals voorspeld. Hooguit later als kosten-optimalisatie.

**Bijvangst job-queue-smoke (zelfde sessie)**: alle 7 gemigreerde job-types draaiden
end-to-end op de deploy (WEBSITE_SCAN 6m, TREND_RESEARCH 7m, BRANDSTYLE_ANALYZE_URL 3m,
BRANDVOICE_ANALYZE_URL 3m, BUG_REPORT_ANALYZE, CHAT_FEEDBACK_ANALYZE, SEO_GENERATE 12m —
allemaal COMPLETED via de minuut-cron, cross-instance). Kanttekeningen: de
status-GET-routes van brandstyle/brandvoice gaven 404 tegen het smoke-account (jobs
zelf COMPLETED — routegedrag checken bij de eerstvolgende UI-run); DAM auto-tag en
alignment-scan niet gesmoked (vereisen media-upload resp. gevuld merk-DNA).

## Fase 4a uitgevoerd (2026-07-13) — stap 8 ∥ staart

Taak `seo-fase4a-tail-parallel`: stap 8 (checklist-only, snel model) draait nu concurrent
met de variant-B/GEO-staart — beide hingen alleen aan de stap-7-output, de oude volgorde
was pure dependency-graph-verspilling. Verwachte winst: de volledige stap-8-duur
(42-130s) verdwijnt achter de staart. Events/checkpoint/resume-semantiek ongewijzigd
(8-stappen-tracker intact). Bewuste input-delta: variant B ziet de accumulatedContext
zonder het stap-8-checklist-JSON (mechanische ruis over variant A). Samen met de
#388-kick (enqueue→start 2s i.p.v. tot 3 min): verwachte wall-clock ~12 min → ~8 min.
Validatie-run + step:0/9-uitlezing volgen na deploy — resultaat wordt hier bijgeschreven.

**Fase 4b blijft open en gegate op een F-VAL-A/B**: checklist in stap 7 mergen (spaart de
resterende stap-8-call) óf stap 7 conditioneel skippen (~102s premium) — beide raken de
kwaliteit-kritische keten.
