---
id: hng-invulboek-2026-08-14
title: Branddock HNG Invulboek verwerken in de Het Nieuwe Golfen-workspace
fase: post-launch
priority: now
effort: 3-4 uur
owner: claude-code
status: done
created: 2026-08-14
completed: 2026-08-14
related-adr: -
related-spec: ~/Downloads/Branddock_HNG_Invulboek.md
worktree: - (data-invoer + 2 nieuwe scripts, geen app-code gewijzigd)
---

# Probleem

De HNG-workspace draaide op een Engelse, deels gescrapete merkbasis: contenttaal `en`,
brand assets in het Engels of leeg, een voiceguide die "Birdy time!" aanbeval (Jester-toon,
vecht met het Hero/Outlaw-archetype), nul F-VAL-regels (`rulesEvaluated: 0`) en nul
personas/producten/concurrenten. Referentietekst C (off-brand mét merktermen) scoorde
79 en slaagde daardoor ten onrechte.

# Voorstel

Het complete invulboek (14-08-2026, besluiten D1-D5 zoals voorgesteld) programmatisch
verwerken via een fill-script, in de volgorde van blok 18: contenttaal → merkfundament
(blok 2-9) → voice guide/baseline/F-VAL-regels (blok 10-12) → hertest → typografie/kleur
(blok 13) → personas/producten/concurrenten (blok 14-16) → kennisbronnen (blok 17).

# Acceptatiecriteria

- [x] `Workspace.contentLanguage` = `nl`, `BrandVoiceguide.contentLocale` = `nl-NL`
- [x] 8 brand assets (essence, promise, missie&visie, archetype, kernwaarden,
      personality, story, social relevancy) volledig NL conform invulboek
- [x] Voiceguide volledig vervangen (geen "Birdy time"-richtlijnen meer); baseline-1-pager
      gevuld (toon-assen, top-10 voorkeurs-/vermijdtermen, stijlregels)
- [x] F-VAL-regels actief: 34 woord-regels (warning) + 8 anti-patterns (error) via
      voiceguide-sync + 10 handmatige regels (pijlerverwijzing, laddernamen, stijl)
- [x] Centroid-embedding berekend uit 5 writing-samples
- [x] Hertest: A=91 (nulmeting 89, slaagt) · B=61 (was 69, afgekeurd) · C=68 (was 79
      ten onrechte geslaagd → nu afgekeurd met findings op "LAATSTE KANS",
      "Mis dit niet", "Gegarandeerd", "gezelligheid", "Birdy time", "lespakket")
- [x] 3 personas (prestatiegolfer expliciet SLAPEND), 13 producten (prijzen 14-08),
      5 categorie-concurrenten; achterdeur-aanbod bewust NIET opgenomen (D5)
- [x] Kleuren (8) + ladderkleuren, voorlopige fontstacks (D3), vormtaal + fotografie
- [x] Kennisbronnen: MooiMerk Branddoc + Persona-document toegevoegd met volledige tekst
- [x] `npx tsc --noEmit` — 0 nieuwe errors (alleen pre-existing)
- [x] Verse prod-bundle: `scripts/migrate-brand-dna/bundles/het-nieuwe-golfen-2026-08-14.json`

# Smoke-test

`npx tsx scripts/score-hng-referentieteksten.ts` — verwacht: A ≥ 75, B < 75, C < 75
met concrete rule-findings op de vier kernovertredingen van tekst C.

# Out-of-scope / restpunten

- Prod-import (workspace `cmrxl41sm00230akjshqksl17`) draait Erik met prod-creds:
  dry-run + `--force` + `--confirm-host` + nazorg `--lang nl` (zie runbook in README
  migrate-brand-dna). Kennisbronnen zitten NIET in de bundle → op prod handmatig uploaden.
- Ontbrekende brondocumenten: "Schrijven voor het brein — HNG-context" en
  "HNG Sitemap & Priority Guide 2026" (niet lokaal gevonden).
- `Product_Ecosysteem_HNG_2026.xlsx` bewust niet toegevoegd (interne bijnamen +
  vervallen vierde tier) — eerst bijwerken.
- REQUIRED_PHRASE-regels Basis/Ontwikkel/Prestatie staan INACTIEF: de rule-engine kent
  geen onderwerp-scoping, actief zouden ze álle niet-ladder-content bestraffen.
  Handmatig activeren bij ladder-campagnes.
