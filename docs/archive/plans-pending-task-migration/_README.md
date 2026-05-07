# Plans Pending Task-Migration

Deze 3 IMPLEMENTATIEPLAN-* bestanden bevatten **open werk** dat nog niet gedistilleerd is naar het `tasks/<id>.md` template.

## Status

Deze documenten zijn **content-bron** voor toekomstige task-files, niet zelf het werkdocument. Tijdens **week 2 van de docs-migratie** (eigen task `tasks/docs-migration-week-2.md`) worden ze omgezet naar standaard task-format.

## Bestanden + bestemming

| Bron | Toekomstige task-file | Status content |
|---|---|---|
| `IMPLEMENTATIEPLAN-CAMPAIGN-DRAFTS.md` | `tasks/campaign-drafts-db-backed.md` | Plan goedgekeurd, niet uitgevoerd |
| `IMPLEMENTATIEPLAN-CLAW-PAGE-AWARENESS.md` | `tasks/claw-page-awareness.md` | Plan goedgekeurd, niet uitgevoerd |
| `IMPLEMENTATIEPLAN-POWER-USER-SHORTCUTS.md` | `tasks/power-user-shortcuts.md` | Concept, niet uitgevoerd |

## Hoe te distilleren

Per plan:
1. Lees originele plan
2. Maak `tasks/<id>.md` vanuit `tasks/_template.md`
3. Vul frontmatter (id, title, fase, priority, effort, status: open)
4. Distilleer "Probleem", "Voorstel", "Acceptatiecriteria", "Bestanden die ik aanraak", "Smoke test plan" naar de juiste secties
5. Plaats originele plan-doc als referentie in "Notes" sectie of laat hier staan met verwijzing
6. Originele bestand kan in `docs/archive/plans-superseded/` na succesvolle distillatie

## Waarom niet meteen verplaatst naar tasks/

De plan-docs hebben elk 200-500+ regels in een ander format dan `tasks/_template.md`. Direct verplaatsen zou inconsistente bestanden in `tasks/` opleveren. Beter: tijdelijke staging hier, distillatie als bewuste task in week 2.
