---
name: adr-create
description: Use when user signals "schrijf een ADR voor X", "documenteer deze beslissing", of vóór uitvoering van een non-triviale architectuur/library/pattern keuze. Genereert nieuw ADR-bestand in docs/adr/ volgens MADR-template met Y-statement. Vraagt user om context, decision, alternatives, consequences als die niet expliciet zijn meegegeven.
---

# ADR Create

Architectural Decision Record schrijven volgens MADR-format met Y-statement. Vergrendelt "waarom we voor X kozen" zodat het over 6 maanden traceerbaar is.

## Wanneer wel

- Architectuur-keuze (bv "Hybride SPA i.p.v. App Router")
- Library-keuze (bv "Stryker boven mutmut voor mutation testing")
- Pattern-keuze (bv "polymorphic ResourceVersion i.p.v. per-module versie tabel")
- Workflow-beslissing (bv "task-finalize skill als verplichte review-flow")
- Wijziging van eerder vergrendelde beslissing (markeer oude ADR `superseded`)

## Wanneer NIET

- Bugfixes — `gotchas.md` is de juiste plek
- Refactor zonder design-keuze — commit message volstaat
- Tijdelijke workarounds — zet TODO in code met datum + reden
- Tactische task-keuze — zet in `tasks/<id>.md` Notes sectie

## Stappen

### 1. Verzamel context

Als user incomplete info gaf, vraag:
- **Context**: welke situatie/probleem leidde tot deze beslissing?
- **Decision**: wat is besloten? Concreet en kort.
- **Alternatives**: welke andere opties overwogen + waarom niet gekozen?
- **Consequences**: positief, negatief, neutraal?

Geen ADR zonder al deze info — een ADR zonder Y-statement of zonder alternatives is geen ADR.

### 2. Genereer ID

Format: `YYYY-MM-DD-<kebab-case-id>`
- Datum: vandaag
- ID: korte beschrijvende naam, geen jargon, lowercase, kebab-case
- Verifieer geen botsing: `ls docs/adr/ | grep <id>`

### 3. Schrijf bestand

Gebruik template `docs/adr/_template.md` als basis. Verplichte secties:
- **Frontmatter** met `id`, `title`, `status: accepted`, `date`, `supersedes` (mag `-`), `superseded-by` (mag `-`)
- **Context** — 2-5 paragrafen
- **Decision** — concreet, kort
- **Y-statement** — exact format: "In de context van **<situatie>**, facing **<concern>**, I decided **<beslissing>** to achieve **<doel>**, accepting tradeoff **<wat geven we op>**."
- **Consequences** — Positief / Negatief / Neutraal subsecties
- **Alternatives considered** — minstens 2 alternatieven met reden waarom niet gekozen
- **Notes** — optionele extra context, links

### 4. Cross-reference

Als ADR verband houdt met bestaande:
- Update `tasks/<id>.md` `related-adr` frontmatter veld
- Update relevante spec in `docs/specs/` met "see ADR <id>"
- Als deze ADR een eerdere superseded: update oude ADR `status: superseded`, `superseded-by: <new-id>`

### 5. Niet committen, alleen aanmaken

Skill schrijft het bestand maar commit het niet. User kiest committen via `pre-commit` skill of bij `task-finalize`. Reden: ADR wordt vaak in batch met implementatie gecommit.

### 6. Final report

```
✅ ADR created: docs/adr/<id>.md

Title: <title>
Status: accepted
Y-statement: <quote>

Cross-references updated:
- tasks/<id>.md (related-adr field)
- (geen anders)

Niet gecommit — gebruik pre-commit skill of task-finalize wanneer klaar.
```

## Stop conditions

- User kan geen Y-statement formuleren — beslissing is mogelijk niet helder genoeg, vraag of er wel een echte tradeoff is
- Geen alternatives benoembaar — als enige optie, is het geen architectuur-beslissing maar een procedure → schrijf playbook i.p.v. ADR
- Conflict met bestaande ADR niet ge-adresseerd — vraag user of dit superseded is van eerdere

## Notes

Voorbeelden van goede ADRs in `docs/adr/`:
- `2026-02-12-better-auth-organization.md` — library-keuze met 4 alternatives
- `2026-05-05-fval-three-pillar.md` — architectuur-keuze met empirische onderbouwing
- `2026-05-07-tasks-as-files.md` — pattern-keuze met workflow-impact

MADR-format referentie: https://adr.github.io/madr/
