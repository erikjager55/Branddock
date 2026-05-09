# Pending bootstrap migrations

Schema-deltas die via `npx prisma db push` zijn toegepast op dev-DB, maar nog niet zijn opgenomen in `prisma/migrations/`. Het project gebruikt sinds februari 2026 `db push` als primary schema-sync (laatste echte migration is `20260213204936_add_persona_models`).

## Waarom hier?

`prisma/migrations/0_baseline/migration.sql` heeft een vervuilde eerste regel (`Loaded Prisma config from prisma.config.ts.`) die elke shadow-DB validatie van nieuwe migrations breekt. Ook is er drift tussen schema en `prisma/migrations/` sinds februari. Beide moeten worden opgelost in een eigen `migration-bootstrap` task wanneer Vercel + Neon-deployment wordt opgepakt.

Tot dan parkeren we hier de SQL die `prisma migrate diff --from-config-datasource --to-schema` produceert vóór `db push`. Productie-deploys op Vercel/Neon kunnen niet vertrouwen op `db push` — die hebben een echt migration-pad nodig.

## Wat moet er gebeuren tijdens migration-bootstrap?

1. Fix `0_baseline/migration.sql` (verwijder eerste regel) of regenereer de baseline volledig.
2. Run `prisma migrate diff` tussen het laatste-applied schema-state en het huidige schema → één grote bootstrap-migration.
3. Mark hem als applied via `prisma migrate resolve` op productie zodra schema gesynced is.
4. Vanaf dat punt: alle nieuwe schema-wijzigingen via `prisma migrate dev` (genereert files), niet meer via `db push`.

## Index van pending bootstrap deltas

| Datum | File | Beschrijving |
|---|---|---|
| 2026-05-08 | `2026-05-08_competitor_snapshot_models.sql` | Competitor historie — Snapshot/Activity/ContentItem modellen + 5 nieuwe Competitor-velden + 6 enums. ADR `2026-05-08-competitor-snapshot-historie`. |

## Hoe gebruik je deze bestanden?

- Voor lokale dev: niets doen — `db push` heeft het al toegepast.
- Voor verse dev-DB van een teamlid: `psql -d branddock -f <file>.sql` na `db push` van de baseline; OR gewoon `db push` van het volledige schema.
- Voor Vercel/Neon: zie migration-bootstrap task wanneer die wordt opgepakt.
