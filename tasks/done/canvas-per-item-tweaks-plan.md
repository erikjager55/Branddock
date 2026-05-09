---
id: canvas-per-item-tweaks-plan
title: Discovery + plan — item-specifieke inputvelden in Canvas wizard per content-type
fase: pre-launch
priority: now
effort: 1-2 dagen (discovery + plan); bouw separaat in te schatten
owner: claude-code
status: done
created: 2026-05-08
completed: 2026-05-08
related-adr: -
related-spec: docs/specs/content-studio.md (deels achterhaald — zie audit 2026-05-08-canvas-studio-state.md)
worktree: -
---

# Probleem

Per content-type in de Canvas-wizard ontbreken nu vaak relevante input-velden, waardoor de AI met te dunne briefing gegeneriek output produceert. Bv. een sales-email vereist andere inputs (offer-type, urgency, call-to-action-style) dan een blog-artikel (long-form structure, expertise-claim, citaten) of een TikTok-script (hook-stijl, scene-count, CTA-timing). Huidige wizard heeft een mix van generic + type-specifieke inputs maar dekking is ongelijk verdeeld over de 53 content-types in `docs/playbooks/testplan-content-items.md`.

Dit lost ook (deels) Erik's tweede generieke klacht op — "teksten zijn vaak generiek". Hypothese: betere per-item inputs leiden tot specifiekere prompts en concretere output. Als dat na bouw onvoldoende blijkt, spawnen we een aparte voice/prompt-versterking-taak.

# Voorstel

Discovery-task met als deliverable een gedetailleerde per-content-type input-gap-analyse + 1-3 concrete bouw-tasks (gegroepeerd per content-categorie zodat bouwwerk parallel kan).

**Stappen**:

1. **Per content-type input-mapping** — `medium-config-registry.ts` + `content-type-inputs.ts` + `medium-config-data.ts` doorlopen, per type tabellen wat er nu aan inputs is. Cross-check met testplan-content-items (10 categorieën à ~5 types).
2. **Gap-analyse per type** — wat ontbreekt aan type-specifieke inputs? Bv. heeft sales-email een `offerType` field? Heeft TikTok een `hookStyle`? Heeft blog een `expertiseAngle`? Output = matrix met "huidige inputs" / "voorgestelde toevoegingen" / "rationale".
3. **Categorisatie + bouw-task design** — gaten clusteren tot 1-3 bouwbare tasks (bv. `canvas-tweaks-social-content`, `canvas-tweaks-long-form`, `canvas-tweaks-commerce`). Per bouw-task: scope, effort, files-die-aangeraakt-worden, smoke-test-plan.
4. **Sanity-check tegen "generieke teksten" hypothese** — voor 2-3 gekozen types: zou een AI met de voorgestelde extra inputs concreter output produceren? Korte mental-model-walkthrough; als nee, herzien.

**Deliverable**: notitie `docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md` + 1-3 nieuwe `tasks/<id>.md` files (concrete bouw-tasks).

# Acceptatiecriteria

- [x] Notitie `docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md` met per-content-type input-mapping (matrix)
- [x] 1-3 nieuwe bouw-tasks aangemaakt in `tasks/`, geprioriteerd binnen pre-launch (3 tasks: conversion-shortform, longform-authority, structured-skeleton)
- [x] Hypothese-check op generieke-teksten: 3 voorbeelden uitgewerkt (sales-email / blog-post / TikTok-script) — sterke bevestiging voor 3 archetypen, wisselvallig voor 5 al-rijke types (geflagd voor follow-up)
- [ ] Roadmap NOW geüpdatet met de bouw-tasks (NIET door agent uitgevoerd — Erik integreert in main sessie volgens scope-boundary)
- [x] Geen code-wijzigingen in deze task — pure read + write

## Resultaat (2026-05-08)

- **Audit**: `docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md` — 53 types geanalyseerd, gap-matrix per type, 3-archetype clustering, hypothese-walkthrough
- **Bouw-tasks aangemaakt**:
  - `tasks/canvas-tweaks-conversion-shortform.md` (2-3 dagen, 12 types, sterke hypothese)
  - `tasks/canvas-tweaks-longform-authority.md` (2 dagen, 10 types, sterke hypothese)
  - `tasks/canvas-tweaks-structured-skeleton.md` (2 dagen, 13 types incl. 3 naked-fixes)
- **Open vragen voor Erik**: 4 punten in audit-sectie 5 (tag-vs-textarea / AI-derivation prio / volgorde / voice-follow-up)
- **Volgorde-aanbeveling**: 1 → 2 → 3 (conversion eerst — pilot-relevant + iteratie-snel)

# Bestanden die ik aanraak

- `docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md` (nieuw)
- `tasks/<bouw-task-1>.md`, `tasks/<bouw-task-2>.md`, eventueel `tasks/<bouw-task-3>.md` (nieuw)
- `tasks/canvas-per-item-tweaks-plan.md` (deze, status updates)
- `roadmap.md` (NOW-tabel update)

# Bestanden die ik NIET aanraak

- Code in `src/` — alleen lezen voor inventarisatie
- `medium-config-registry.ts`, `content-type-inputs.ts` — niet wijzigen, alleen analyseren
- `docs/specs/content-studio.md` — niet herschrijven (audit benoemt achterhaaldheid; rewrite is buiten scope)

# Smoke test plan

1. Lees notitie → input-mapping matrix moet per content-type 1 regel hebben (huidige + voorgesteld + rationale)
2. Open 1 bouw-task → scope is concreet en in 1-3 dagen uit te voeren
3. Sanity-check: zou AI met inputs X+Y+Z merkbaar concreter zijn dan met alleen generic? Antwoord moet "ja" zijn voor 2-3 voorbeelden

# Risico's

- **Discovery te oppervlakkig** → mitigatie: minimaal 10 content-types diep analyseren (1-2 per categorie), niet alleen high-level mapping
- **53 types is te veel om individueel te plannen** → mitigatie: clusteren per categorie (10 categorieën in testplan), bouw-task per cluster
- **Inputs voorstellen die UI cluttered maken** → mitigatie: principe "1 input toevoegen vereist sterke rationale"; out-of-scope velden expliciet benoemen
- **Hypothese "betere inputs → minder generieke output" blijkt niet voldoende** → mitigatie: in stap 4 expliciet checken; als zwak, separate voice/prompt-task voorstellen

# Out of scope

- Daadwerkelijk bouwen van per-content-type inputs (volgt uit deze task)
- Per-content-type previews (zit in optie b/c uit audit-vraag 1; kan later aparte plan-task worden indien nodig)
- Flow-divergentie per type (bv. blog skipt scene-editor) — kan binnen bouw-tasks meegenomen worden indien evident, anders separate task
- Tone-instructies per type (overlap met "generieke teksten") — meeneembaar binnen bouw-tasks indien evident; aparte task als blijkt dat dit cross-cutting is

# Notes

Erik's input 2026-05-08: "tweaks per item bedoel ik dat er item specifieke vragen / inputvelden moeten zijn die relevant zijn." Dit is de primary requirement. Generieke-teksten-fix volgt hier uit indien de hypothese bevestigt.

Cross-link: `tasks/canvas-image-briefing-plan.md` is parallelle plan-task voor image-zijde (apart traject zoals Erik aangaf).
