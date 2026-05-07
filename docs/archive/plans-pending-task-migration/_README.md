# Plans Pending Task-Migration

Deze 3 IMPLEMENTATIEPLAN-* bestanden bevatten **open werk** dat nog niet gedistilleerd is naar het `tasks/<id>.md` template.

## Status

✅ **Gedistilleerd naar tasks/** op 2026-05-07 (week 2 dag 1 van docs-migratie). Originele plan-docs blijven hier als referentie voor implementatie-detail; task-files dragen het werkbare format.

## Bestanden + bestemming

| Bron | Task-file | Status |
|---|---|---|
| `IMPLEMENTATIEPLAN-CAMPAIGN-DRAFTS.md` | [`tasks/campaign-drafts-db-backed.md`](../../../tasks/campaign-drafts-db-backed.md) | ✅ gedistilleerd, plan blijft als gedetailleerde referentie |
| `IMPLEMENTATIEPLAN-CLAW-PAGE-AWARENESS.md` | [`tasks/claw-page-awareness.md`](../../../tasks/claw-page-awareness.md) | ✅ gedistilleerd, plan blijft als gedetailleerde referentie |
| `IMPLEMENTATIEPLAN-POWER-USER-SHORTCUTS.md` | [`tasks/power-user-shortcuts.md`](../../../tasks/power-user-shortcuts.md) | ✅ gedistilleerd, plan blijft als gedetailleerde referentie |

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
