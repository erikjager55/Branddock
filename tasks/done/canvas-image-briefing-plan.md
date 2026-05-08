---
id: canvas-image-briefing-plan
title: Discovery + plan — image-briefing flow op Canvas (type-keuze, stijl, briefing, content-koppeling)
fase: pre-launch
priority: now
effort: 1 dag (discovery + plan); bouw separaat in te schatten
owner: claude-code
status: done
created: 2026-05-08
completed: 2026-05-08
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Visuele content op Canvas heeft drie samenhangende kwaliteitsproblemen volgens Erik:

1. **Beeld ↔ content-mismatch** — gegenereerde beelden slaan vaak niet terug op de tekstuele content (image-prompt is te ver afgeleid of mist content-context)
2. **Default-foto bias** — systeem produceert standaard een foto, terwijl per content-type/situatie een andere stijl beter past (productshot voor commerce, illustratie voor blog-hero, getraind model voor brand-consistente social, infographic voor data-content, etc.)
3. **Geen briefing-laag** — er is geen UX die vóór generatie de gebruiker laat kiezen welk type beeld + stijl + concrete briefing past

Infrastructuur is paradoxaal genoeg rijk: 8 visual-routes (`generate-visual`, `generate-visual-trained`, `generate-visual-compose`, `hero-image`, `select-library-visual`, `compose-video`, `generate-video`, `vanilla-baseline`) + 4 picker-componenten (`LibraryAssetPicker`, `ComposePicker`, `TrainedStylePicker`, `InsertImageModal`) + visual-fidelity-scoring (`VisualFidelityBadge`/`Detail`). Het probleem is niet "te weinig features", het is "geen samenhangende briefing-flow die de juiste route + parameters kiest".

Pilot-blocker: Better Brands wordt afgeschoten als beelden zwak/off-brand zijn.

# Voorstel

Discovery-task met als deliverable een UX-flow + technische plan + 2-4 concrete bouw-tasks.

**Stappen**:

1. **Inventarisatie bestaande infra** — per visual-route: welke parameters accepteert het, welke generator (DALL-E / FLUX / Imagen / Recraft / Ideogram / trained model), wat is de typische output, wat is het use-case. Per picker-component: welke route triggert het, welke UX biedt het. Output = mapping-tabel.
2. **UX-flow design** — concept voor "image briefing modal" die vóór generatie 3 keuzes uitlokt: (a) **type beeld** (foto / productshot / illustratie / infographic / getraind model / library-asset / hero-composite), (b) **stijl** (per type relevante opties — bv. foto: editorial/commercial/lifestyle), (c) **briefing-tekst** (vrij veld + AI-suggestie afgeleid van content). Mockup-niveau (ASCII of korte beschrijving), geen pixel-perfect.
3. **Content↔image-prompt-koppeling** — hoe wordt huidige content automatisch in image-prompt opgenomen? Welke content-velden (subject / hero-message / personas / product) zouden moeten meelopen? Default-prompt-template per type-beeld voorstellen.
4. **Per content-type defaults** — welke type+stijl is logische default per content-type (LinkedIn-post → editorial photo OF illustration, sales-email → productshot, blog-hero → illustration, etc.)? Default-mapping voorstellen zodat user niet altijd elke keuze hoeft te maken.
5. **Bouw-task design** — clustering tot 2-4 tasks: (a) UX briefing-modal, (b) prompt-engineering voor content-coupled image-prompts, (c) per-type-default mapping + routing naar juiste visual-route, (d) optioneel: visual-fidelity-uitbreiding voor content-relevance-score.

**Deliverable**: notitie `docs/audits/2026-05-08-canvas-image-briefing-plan.md` + 2-4 nieuwe `tasks/<id>.md` files.

# Acceptatiecriteria

- [x] Notitie `docs/audits/2026-05-08-canvas-image-briefing-plan.md` met: infra-mapping, UX-flow concept, content↔image-koppeling voorstel, per-content-type defaults
- [x] 3 nieuwe bouw-tasks aangemaakt in `tasks/`: `canvas-image-briefing-defaults`, `canvas-image-content-coupling`, `canvas-image-briefing-textarea`
- [x] ASCII-schets van VisualBriefSection-uitbreiding in audit Laag 5 (geen aparte modal — verrijking van bestaande sectie)
- [x] Defaults-tabel: 23 content-types met default-image-type + default-stijl + onderbouwing
- [ ] Roadmap NOW update — overgelaten aan Erik (boundary: roadmap.md niet wijzigen)
- [x] Geen code-wijzigingen in deze task — pure read + write

# Bestanden die ik aanraak

- `docs/audits/2026-05-08-canvas-image-briefing-plan.md` (nieuw)
- `tasks/<bouw-task-1>.md`, `tasks/<bouw-task-2>.md`, etc. (nieuw)
- `tasks/canvas-image-briefing-plan.md` (deze, status updates)
- `roadmap.md` (NOW-tabel update)

# Bestanden die ik NIET aanraak

- Code in `src/` — alleen lezen voor infra-inventarisatie
- Bestaande visual-routes — niet wijzigen, alleen analyseren
- Visual-fidelity scoring — alleen evalueren of uitbreiding nodig is

# Smoke test plan

1. Lees notitie → infra-mapping moet per visual-route 1 regel hebben (parameters + generator + use-case)
2. UX-flow concept → 3 keuzes (type/stijl/briefing) duidelijk uitgelegd, met voorbeeld voor 2 content-types
3. Defaults-tabel → 10 content-types met onderbouwde default
4. Sanity-check: zou een Better Brands LinkedIn-post met de voorgestelde flow een betere visual genereren dan de huidige default-foto-flow? Antwoord moet onderbouwd "ja" zijn

# Risico's

- **UX te complex** (3 verplichte keuzes voor elke image-generatie schrikt af) → mitigatie: per content-type defaults zodat user kan accepteren of overrulen
- **Discovery raakt te diep in specifieke generator-vergelijking** → mitigatie: focus op flow + briefing, generator-keuze is een routing-detail per type
- **Trained-model integratie heeft eigen complexiteit** (Replicate LoRA training-flow) → mitigatie: trained-model is één van de type-keuzes; implementatie kan in fase-2 indien voor pilot niet kritisch
- **Visual-fidelity-scoring uitbreiden voor content-relevance is open scope** → mitigatie: optioneel sub-task, niet blokkerend voor primary briefing-flow

# Out of scope

- Daadwerkelijk bouwen van briefing-modal of prompt-engineering (volgt uit deze task)
- Trained-model training-flow zelf (Replicate LoRA setup) — separate spec indien voor pilot kritisch
- Video-briefing — alleen image; video-flow heeft eigen complexiteit (compose-video / generate-video) en kan separate plan-task worden
- Library-asset-management UX — bestaande LibraryAssetPicker blijft, alleen geïntegreerd in flow als type-keuze

# Notes

Erik's input 2026-05-08: "Hier zou een apart plan voor gemaakt moeten worden. De beelden die bij de content gegenereerd worden slaan vaak niet terug op de content. Daarnaast is het standaard een foto waarbij er vooraf een keuze / suggestie gemaakt moeten worden wat voor een beeld, welke stijl (foto, productshot, illustratie, getraind model, etc) het beste zou passen bij de foto en hoe de foto eruit zou moeten zien."

Pilot-relevantie: Better Brands wordt afgeschoten als beelden off-brand of irrelevant zijn — primary pre-launch concern.

Cross-link: `tasks/canvas-per-item-tweaks-plan.md` is parallelle plan-task voor tekst-zijde van per-content-type tweaks.
