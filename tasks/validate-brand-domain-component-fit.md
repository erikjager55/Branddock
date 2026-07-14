---
id: validate-brand-domain-component-fit
title: Validatie — pipeline-fit van merk-/domein-specifieke web-page componenten
fase: post-launch
priority: later
effort: 1-2 dagen (analyse) + optioneel 1 dag (wizard-of-oz)
owner: claude-code
status: open
created: 2026-06-24
completed: -
related-adr: -
related-spec: tasks/_drafts/idea-brand-domain-specific-components.md
worktree: -
---

# Probleem

De web-page-builder (Puck, Canvas Step 3) rendert voor elk merk dezelfde gesloten set generieke blokken (inmiddels 11, o.a. `BrandHero`, `FeatureGrid`, `PricingTable`, `FAQ`, `Footer`, `StickyCtaBar`, `StatsBlock`, `BrandNav` — zie de README in `canvas/medium/`), alleen render-time gethematiseerd uit tokens. Het idee `idea-brand-domain-specific-components` stelt voor om merk-/domein-specifieke componenten te genereren (bijv. een `UnitCard`/`SpecList` voor een opslagbedrijf). De feature-planner-discovery (verdict: **needs-validation-first**) legde de dragende, **onbewezen** aanname bloot: dat een betekenisvol deel van de Branddock-pipeline een merk met een "gestructureerd, herhaald aanbod-object" betreft. Het enige bewijs is nu een extern voorbeeld (Nèjbox), geen Branddock-(pilot)data. Bouwen vóór dit gemeten is = risico op "bouwen voor onszelf".

# Voorstel

Meet de aanname vóórdat er component-architectuur wordt aangeraakt. Twee stappen, oplopend in kosten:

1. **Pipeline-fit-telling + afkeur-analyse** — inventariseer de bestaande gegenereerde web-pages/LP-deliverables: welk aandeel betreft een merk/branche met een gestructureerd aanbod-object (units, panden, menu-items, SKU's, abonnementen) waarvoor `FeatureGrid`/`PricingTable` aantoonbaar wringt? Segmenteer per branche/archetype.
2. **(Optioneel) Wizard-of-oz / prompt-only experiment** — toets ~70% van de waarde zónder de component-architectuur te raken: laat de bestaande generieke blokken via een aangepaste prompt een aanbod-object beter presenteren, en beoordeel of de output al "goed genoeg" is. Als prompt-only het gat grotendeels dicht, is een nieuw blok-type niet de goedkoopste oplossing.

Output is een go/no-go met cijfers, niet code. Bij groen (+ post-launch) promoten naar `technical-planner`.

# Acceptatiecriteria

- [ ] Telling: % bestaande web-page-deliverables met een gestructureerd aanbod-object, gesegmenteerd per branche/archetype, met absolute aantallen + databron benoemd
- [ ] Afkeur-analyse: concrete voorbeelden waar `FeatureGrid`/`PricingTable` het aanbod aantoonbaar slecht weergeeft (met deliverable-referenties)
- [ ] Expliciete baseline + drempel vooraf vastgelegd ("promoten als ≥ X% én ≥ N klanten") — niet achteraf gefit
- [ ] (Indien uitgevoerd) wizard-of-oz-uitkomst: dekt prompt-only de waarde, ja/nee + voorbeelden
- [ ] Go/no-go-verdict geschreven terug in `tasks/_drafts/idea-brand-domain-specific-components.md`
- [ ] Smoke-test: n.v.t. (analyse-task, geen code) — bewijs = de telling-data zelf

# Bestanden die ik aanraak

- `tasks/_drafts/idea-brand-domain-specific-components.md` — verdict-update met meetresultaten
- (mogelijk) een throwaway analyse-script in `scripts/dev/` voor de telling — niet productie

# Bestanden die ik NIET aanraak

- `src/features/campaigns/components/canvas/medium/puck-config.tsx` — geen component-werk in de validatiefase
- `src/lib/landing-pages/*` — niet wijzigen; alleen lezen voor de telling

# Smoke test plan

N.v.t. (analyse). Verificatie = de telling-dataset + afkeur-voorbeelden zijn reproduceerbaar uit de DB/deliverables.

# Risico's

- **Te weinig productiedata pre-launch** om de telling betekenisvol te maken → mitigatie: voer dit pas uit ná de eerste pilot-klanten (post-launch), of beperk tot een kwalitatieve afkeur-analyse op de bestaande test-workspaces met expliciet voorbehoud.
- **Confirmation bias** in de afkeur-analyse → mitigatie: drempel + segmentatie vooraf vastleggen (acceptatiecriterium 3).

# Out of scope

- Het bouwen van een nieuw blok-type of het typed slot-contract (dat is de vervolg-task ná groen verdict)
- Vrije LLM-component-synthese, blok-bibliotheek, vervanging van bestaande blokken

# Notes

- Komt voort uit de feature-planner-discovery 2026-06-24 (verdict needs-validation-first + post-launch).
- Timing: kritieke pad blijft `vercel-deployment`; deze validatie heeft pas zin met pilot-data, dus realistisch post-launch.
