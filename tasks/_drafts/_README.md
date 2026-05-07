# tasks/_drafts/

Staging-area voor PM-fase output uit `feature-planner` subagent. **Niet uitvoerbaar werk** — wel het probleem-statement + scope vóór technical design.

## Levenscyclus

```
1. User typt: "Ik heb een idee voor X"
2. feature-planner subagent draait
   ├─ 6-assen discovery (3 ronden, max 5 vragen per ronde)
   ├─ Anti-sycophancy stappen (3 redenen tegen, aannames lijst)
   ├─ 5-punts stop-conditie checklist
   └─ Red Team Review
3. Output: tasks/_drafts/idea-<id>.md  ← jij bent hier
4. User decisie: "promote naar uitvoerbare task?"
   ├─ JA → technical-planner subagent
   │   ├─ Phase -1 Gates (Simplicity / Anti-Abstraction / Integration-First)
   │   ├─ File-list, smoke-test, effort, risico's
   │   ├─ ADR-noodzaak detectie
   │   └─ Output: tasks/<id>.md (executable)
   ├─ NEE (verdict was needs-validation-first) → blijft hier als referentie
   └─ NEE (idee laten vallen) → blijft hier voor "we hebben dit overwogen" historie
```

## Wat staat hier

| Bestand | Doel |
|---|---|
| `_README.md` | Dit bestand |
| `_idea-template.md` | Format dat feature-planner volgt |
| `idea-<id>.md` | PM-output per geplande feature — read-only voor technical-planner |

## Conventies

- **Bestandsnaam**: `idea-<kebab-case-id>.md` (zelfde id als toekomstige task)
- **Status in frontmatter**: `pending-tech` / `needs-validation` / `dropped`
- **Niet uitvoeren** — geen code-changes, geen file-mutaties op basis van idea-files
- **Niet committen tijdens discovery** — pas committen wanneer idee minimaal status `pending-tech` heeft

## Voorbeeld-namen

- `idea-content-template-library.md`
- `idea-team-collaboration-comments.md`
- `idea-export-to-pdf.md`

## Niet hier

- Uitgewerkte taken (die horen in `tasks/<id>.md`)
- Architectuur-beslissingen (die horen in `docs/adr/`)
- Lange specs (die horen in `docs/specs/`)

## Cleanup

`idea-<id>.md` blijft staan totdat:
- Promoted naar `tasks/<id>.md` → idea-file blijft als historische referentie (link via `related-spec` in task)
- Verdict was `dropped` na 30 dagen → mag verplaatsen naar `docs/archive/dropped-ideas/`

Geen automatische cleanup — drafts zijn waardevol voor "we hebben dit overwogen, hier zijn de aannames die toen niet klopten".
