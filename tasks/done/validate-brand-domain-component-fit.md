---
id: validate-brand-domain-component-fit
title: Validatie — pipeline-fit van merk-/domein-specifieke web-page componenten
fase: post-launch
priority: later
effort: 1-2 dagen (analyse) + optioneel 1 dag (wizard-of-oz)
owner: claude-code
status: done
created: 2026-06-24
completed: 2026-08-19
related-adr: -
related-spec: tasks/_drafts/idea-brand-domain-specific-components.md
worktree: branddock-brand-domain-fit  # geclaimd door sessie 78a1d49f, 2026-08-19
---

# Probleem

De web-page-builder (Puck, Canvas Step 3) rendert voor elk merk dezelfde gesloten set generieke blokken (inmiddels 11, o.a. `BrandHero`, `FeatureGrid`, `PricingTable`, `FAQ`, `Footer`, `StickyCtaBar`, `StatsBlock`, `BrandNav` — zie de README in `canvas/medium/`), alleen render-time gethematiseerd uit tokens. Het idee `idea-brand-domain-specific-components` stelt voor om merk-/domein-specifieke componenten te genereren (bijv. een `UnitCard`/`SpecList` voor een opslagbedrijf). De feature-planner-discovery (verdict: **needs-validation-first**) legde de dragende, **onbewezen** aanname bloot: dat een betekenisvol deel van de Branddock-pipeline een merk met een "gestructureerd, herhaald aanbod-object" betreft. Het enige bewijs is nu een extern voorbeeld (Nèjbox), geen Branddock-(pilot)data. Bouwen vóór dit gemeten is = risico op "bouwen voor onszelf".

# Voorstel

Meet de aanname vóórdat er component-architectuur wordt aangeraakt. Twee stappen, oplopend in kosten:

1. **Pipeline-fit-telling + afkeur-analyse** — inventariseer de bestaande gegenereerde web-pages/LP-deliverables: welk aandeel betreft een merk/branche met een gestructureerd aanbod-object (units, panden, menu-items, SKU's, abonnementen) waarvoor `FeatureGrid`/`PricingTable` aantoonbaar wringt? Segmenteer per branche/archetype.
2. **(Optioneel) Wizard-of-oz / prompt-only experiment** — toets ~70% van de waarde zónder de component-architectuur te raken: laat de bestaande generieke blokken via een aangepaste prompt een aanbod-object beter presenteren, en beoordeel of de output al "goed genoeg" is. Als prompt-only het gat grotendeels dicht, is een nieuw blok-type niet de goedkoopste oplossing.

Output is een go/no-go met cijfers, niet code. Bij groen (+ post-launch) promoten naar `technical-planner`.

# Drempel — VOORAF vastgelegd, 2026-08-19

> Acceptatiecriterium 3 eist dat dit vóór de meting staat, niet erna. Vastgelegd
> in dezelfde commit als de claim, vóórdat er ook maar één cijfer is opgevraagd.

**Promoten naar `technical-planner` als beide waar zijn:**

1. **≥ 30%** van de gegenereerde web-page-/landingspagina-deliverables betreft een merk
   met een gestructureerd, herhaald aanbod-object (units, panden, menu-items, SKU's,
   abonnementen) — iets wat `FeatureGrid`/`PricingTable` niet natuurlijk weergeeft.
2. **≥ 3 verschillende workspaces/klanten** vertonen dat patroon. Eén merk is een
   anekdote, ook als het er veel pagina's van zijn.

**Waarom deze twee getallen.** Onder de 30% bouw je voor een minderheid terwijl elke
nieuwe blok-soort de generieke set duurder maakt om te onderhouden. Minder dan drie
klanten is geen patroon maar toeval — precies de fout die het idee nu al maakt door
op één extern voorbeeld (Nèjbox) te leunen.

**Vooraf erkende uitkomst die géén go is**: te weinig data om de vraag te beantwoorden.
Dat is een geldig antwoord en geen reden om de drempel te verlagen. De risico-sectie
hieronder voorzag dit expliciet.

# Acceptatiecriteria

- [x] Telling — **niet uitvoerbaar, en dát is de bevinding**: 0 van de 13 deliverables
      is een web-page (8 blog-post, 3 pillar-page, 2 linkedin-post) en er is 1
      `LandingPage`. De noemer bestaat niet. Bron: `branddock-prod`/`production`.
- [x] Afkeur-analyse — via proxy op de `Product`-tabel (47 producten, 12 workspaces).
      Eén casus waar de bestaande blokken aantoonbaar wringen: **Linfi**,
      vloerluik-varianten met prijs als functie van afmetingen en specificaties.
      Bij HNG en DTS Ede is het aanbod wél gestructureerd maar past het gewoon in
      `PricingTable`.
- [x] Drempel vooraf vastgelegd — commit `c775fff0`, vóór de eerste query. ≥30% én
      ≥3 workspaces. Uitkomst: **1 van 12 (8%)**, dus onder beide.
- [ ] Wizard-of-oz — niet uitgevoerd; zinloos zolang de directe meting geen noemer
      heeft. Aanbevolen als eerste stap wanneer dit terugkomt.
- [x] Go/no-go geschreven in `tasks/_drafts/idea-brand-domain-specific-components.md`
- [x] Bewijs = de telling zelf (queries reproduceerbaar op de prod-DB)

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

# Uitkomst 2026-08-19 — NO-GO (voorlopig)

De dragende aanname haalt zijn eigen drempel niet, en de directe meting is
onuitvoerbaar. Beide onafhankelijk van elkaar genoeg voor een no-go.

⚠️ **De interessantste bevinding zit niet in het percentage.** Het idee neemt aan dat
een gestructureerd aanbod om een nieuw bloktype vraagt. Bij twee van de drie
kandidaten (HNG, DTS Ede) is het aanbod wél gestructureerd en herhaald — maar het ís
een prijstabel, en dat blok bestaat al. De aanname verwart *"gestructureerd aanbod"*
met *"aanbod dat de huidige blokken niet aankunnen"*. Alleen bij Linfi vallen die
samen, omdat de prijs een functie is van afmetingen en niet in een kolom past.

**Hermeten bij ≥20 web-page-deliverables over ≥5 workspaces.** Tot die tijd no-go.

# Out of scope

- Het bouwen van een nieuw blok-type of het typed slot-contract (dat is de vervolg-task ná groen verdict)
- Vrije LLM-component-synthese, blok-bibliotheek, vervanging van bestaande blokken

# Notes

- Komt voort uit de feature-planner-discovery 2026-06-24 (verdict needs-validation-first + post-launch).
- Timing: kritieke pad blijft `vercel-deployment`; deze validatie heeft pas zin met pilot-data, dus realistisch post-launch.
