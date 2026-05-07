# Specs

Feature specifications. Bevat zowel toekomstig werk (specs voor ongebouwde features) als referentie-specs (`built-features/`) voor wat al gebouwd is.

## Structuur

| Pad | Inhoud |
|---|---|
| `_README.md` (dit bestand) | uitleg |
| `built-features/` | specs van gebouwde features — referentie wanneer je later het patroon hergebruikt |
| `<feature-spec>.md` | ongebouwde of in-uitvoering specs |

## Verschil met ADR

- **Spec**: *wat* moet er gebouwd worden — functionele en technische requirements
- **ADR**: *waarom* een bepaalde keuze gemaakt is — tradeoff vergrendeld in tijd

Een spec mag verwijzen naar één of meer ADRs. ADR mag verwijzen naar een spec.

## Aanwezig na week 1 dag 4

- `content-canvas.md` (van `CONTENT-CANVAS-SPEC.md` op root)
- `content-studio.md` (van `CONTENT-STUDIO-SPEC.md` op root)
- `dynamic-context-system.md` (van `DYNAMISCH-CONTEXT-SYSTEEM.md`)
- `fidelity-criteria-audit.md` (van `FIDELITY-CRITERIA-AUDIT.md`)
- `brandclaw-vision.md` (visie-deel uit oude `BRANDCLAW-ROADMAP.md`)

## In `built-features/`

- `lock-unlock-fasering.md`
- `feature-persona-enrichment.md`
- `versioning-system-design.md`
