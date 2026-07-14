# Architecture Decision Records (ADRs)

Eén bestand per beslissing. Format: lichtgewicht MADR.

## Wanneer ADR schrijven

- Architectuur-keuze (bv "Hybride SPA i.p.v. App Router routing")
- Library-keuze (bv "Prisma 7 boven Drizzle")
- Pattern-keuze (bv "polymorphic ResourceVersion i.p.v. per-module versie tabel")
- Workflow-beslissing (bv "task-finalize skill als verplichte review-loop")

## Wanneer GEEN ADR

- Bugfixes — `gotchas.md` is de juiste plek
- Refactor zonder design-keuze — commit message volstaat
- Tijdelijke workarounds — zet TODO in code

## Conventies

- **Bestandsnaam**: `YYYY-MM-DD-kebab-case-id.md`
- **Status flow**: `proposed` → `accepted` → `superseded` (verwijs dan naar opvolger)
- **Format**: zie `_template.md`
- **Y-statement vereist**: "In context van [X], facing [Y], I decided [Z] to achieve [W], accepting tradeoff [V]"

## Voorbeelden

Zie de gedateerde ADR-bestanden in deze map (2026-05 t/m heden).
- Better Auth + organization plugin
- Prisma 7 + pg adapter
- Hybride Next.js SPA architectuur
- F-VAL 3-pijler scoring
- task-finalize skill als verplichte review-flow
- AGENTS.md migratie zelf (deze)
