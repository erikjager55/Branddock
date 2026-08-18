---
id: lp-section-image-autogen
title: "Automatische AI-generatie van sectiebeelden bij page-generate (kosten-gated)"
fase: post-launch
priority: later
effort: 1-2d
owner: unassigned
status: open
created: 2026-08-16
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md
related-task: tasks/done/lp-image-routes.md
worktree: -
---

# Probleem

Sinds `lp-image-routes` (PR #252) genereert de GEO-opdracht 2-3 bewijs-gedreven
`imageBrief`s per long-form-artikel en heeft elke artikel-sectie een beeldveld met
de volledige picker (Generate/Library/Upload/Stock). Maar de beelden zelf ontstaan
alleen (a) automatisch uit merkbeelden, of (b) handmatig per veld via de
Generate-tab. Merken zónder merkbeelden krijgen dus artikelen met lege beeldslots
tenzij de gebruiker per sectie klikt.

# Voorstel

Optionele automatische beeldgeneratie bij page-generate voor brief-gemarkeerde
secties zonder beeld, naar het patroon van de bestaande feature-visual-pipeline
(`feature-visual-gate.ts`): hard kosten-plafond (bv. max 2 gegenereerde beelden
per pagina), G4-coherence-judge hergebruiken, library-first (merkbeeld wint altijd
van AI-generatie).

# Gate (bewust — niet bouwen vóór deze beslissing)

Kostenkeuze door Erik: automatische generatie verhoogt de kostprijs per
gegenereerde pagina (~$0,13/beeld bij het huidige feature-visual-model). Opties:
altijd aan · per-workspace toggle · alleen bij ontbrekende merkbeelden.
Zelfde afweging die in `brand-images.ts` gedocumenteerd staat als "aparte
infra/kosten-beslissing".

# Acceptatiecriteria (na GO)

- [ ] Brief-gemarkeerde secties zonder beeld krijgen bij generate automatisch een
      AI-beeld, gecapt op het afgesproken plafond
- [ ] Merkbeelden behouden voorrang (library-first, geen regressie op lp-image-routes)
- [ ] Kosten zichtbaar/gelogd per generatie
- [ ] `npx tsc --noEmit` 0 errors + smoke op een merk mét en zonder merkbeelden
