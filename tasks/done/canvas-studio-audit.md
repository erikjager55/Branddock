---
id: canvas-studio-audit
title: Audit Canvas + Studio — feitelijke staat na recente sprints, basis voor herplanning
fase: pre-launch
priority: now
effort: 1 dag
owner: claude-code
status: done
created: 2026-05-08
completed: 2026-05-08
related-adr: -
related-spec: docs/specs/content-canvas.md, docs/specs/content-studio.md
worktree: -
---

# Probleem

Canvas + Studio specs (`docs/specs/content-canvas.md`, `docs/specs/content-studio.md`) zijn geschreven 27 maart 2026 en sindsdien zijn er meerdere sprints overheen gegaan. Specifiek hebben de net-afgeronde NOW-taken (studio-content-generation-real-ai, content-versioning-crud, brand-voice-content-integration, content-item-qa-gating, plus de 4 independent tracks) impact op Canvas/Studio code en data-modellen. Voordat we een nieuw plan maken voor (a) per-content-type tweaks aan de Canvas wizard (Stap 3 Medium / Stap 4 Planner) en (b) generieke Canvas-verbeteringen, moeten we de feitelijke staat kennen — anders plannen we tegen verouderde aannames.

# Voorstel

Drie-laagse audit met als deliverable één korte notitie (`docs/audits/2026-05-08-canvas-studio-state.md`):
1. **Recent gemerged** — distillaat van `docs/changelog.md` entries laatste ~2 weken + alle `tasks/done/*.md` met canvas/studio-impact (welke files geraakt, welke modellen veranderd, welke API-routes toegevoegd).
2. **Code-staat Canvas + Studio** — feitelijke inventarisatie van `src/features/campaigns/studio/`, Canvas-routing, en API-routes onder `src/app/api/canvas/` + `src/app/api/studio/`. Per kernfunctie (orchestrate / components / approval / publish / derive / wizard-stappen 1-4) één regel: bestaat / stub / mist.
3. **Gap-tabel** — spec-claim vs. code-staat vs. impact van recent werk. Markeer waar specs achterhaald zijn (bv. velden hernoemd, modellen uitgebreid, status-enums veranderd).

Output bevat ook een sectie "Open vragen voor Erik" (3-5 punten die ik niet uit code/docs kan beantwoorden) zodat jij de discovery kunt afronden voordat we plannen.

# Acceptatiecriteria

- [ ] Notitie `docs/audits/2026-05-08-canvas-studio-state.md` bestaat met de 3 lagen + open vragen
- [ ] Per kernfunctie (5 Canvas + 4 wizard-stappen) één duidelijke status: built / partial / stub / missing
- [ ] Gap-tabel benoemt minimaal: status-enum verschillen, model-velden uit recent werk, API-route staat, UI-component staat
- [ ] "Open vragen" sectie met 3-5 concrete keuzes voor Erik
- [ ] Geen code-wijzigingen in deze task — pure read + write notitie

# Bestanden die ik aanraak

- `docs/audits/2026-05-08-canvas-studio-state.md` (nieuw)
- `tasks/canvas-studio-audit.md` (deze, status updates)

# Bestanden die ik NIET aanraak

- Alle code in `src/` — alleen lezen
- `roadmap.md` — pas updaten ná audit + planningsessie met Erik
- Specs zelf (`docs/specs/content-canvas.md`, `docs/specs/content-studio.md`) — niet herschrijven; gap-tabel benoemt verschillen, herschrijven gebeurt later in dedicated task

# Smoke test plan

1. Lees notitie → check dat elke claim verifieerbaar is (file-pad + regelnummer of model-naam)
2. Open 1 willekeurige claim, verifieer in code → moet kloppen
3. Open vragen → toetsbaar door Erik in <10 min lezen

# Risico's

- **Scope-creep naar herschrijven van specs** — mitigatie: hard out-of-scope, alleen gap benoemen
- **Audit te oppervlakkig om bruikbaar plan te maken** — mitigatie: per kernfunctie minimaal file-pad + status, niet alleen "bestaat"
- **Audit te diep en levert geen plan op** — mitigatie: time-box op 1 dag, stop bij genoeg signaal voor planning

# Out of scope

- Herschrijven van Canvas/Studio specs (volgt later)
- Bouwen van per-item tweaks (Stap 3 Medium / Stap 4 Planner) — dat is volgende task na planningsessie
- Bouwen van generieke verbeteringen — Erik levert eerst zijn lijst aan
- Refactor van bestaande Canvas/Studio code

# Notes

Follow-up taken die uit deze audit zullen spawnen (placeholders, niet nu aanmaken):
- `canvas-per-item-tweaks-plan` — geconsolideerd plan voor Stap 3 Medium + Stap 4 Planner per content-type
- `canvas-generic-improvements-plan` — geconsolideerd plan voor Erik's losse verbeterpunten + bestaande NEXT items (`canvas-inline-edit-overlays`, `power-user-shortcuts`)

Erik levert vóór of tijdens planningsessie zijn lijst generieke verbeteringen aan — die mappen we tegen `tasks/canvas-inline-edit-overlays.md` + `tasks/power-user-shortcuts.md` om dubbel werk te voorkomen.
