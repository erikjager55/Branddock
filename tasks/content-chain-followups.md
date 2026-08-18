---
id: content-chain-followups
title: Content-keten — drie beslissingen die na de accessor overbleven
fase: post-launch
priority: later
effort: klein per item (½-1 dag), maar elk vraagt eerst een keuze
owner: unassigned
status: open
created: 2026-08-18
completed: -
related-adr: docs/adr/2026-07-17-deliverable-content-accessor.md
related-spec: -
worktree: -
---

# Probleem

[`content-chain-accessor`](content-chain-accessor.md) is per 2026-08-18 afgerond:
alle 23 kruisingen lopen via `resolveDeliverableContent()` en er staat geen
`TODO(content-chain-accessor)`-disable meer in de codebase.

Drie punten bleven bewust liggen. Geen van drieën is een bug of onafgemaakt werk —
het zijn **keuzes** die buiten de scope van een leeslaag vielen. Ze staan hier omdat
restwerk in een task-file hoort en niet in een losse-eindjes-sectie (les 2026-08-16);
zonder eigen bestand verdwijnen ze bij de eerstvolgende START_HERE-resync.

# De drie punten

## 1. Dode code opruimen (kruising #12)

`buildCascadingComponentContext` in `src/lib/studio/context-builder.ts` heeft precies
één aanroeper — `compileComponentFeedback` — en díe heeft er nul. Het pad draait dus
nooit. Tijdens fase 3 is het bewust níet "gefixt": een keten-fix op dode code is
speculatief werk.

**De keuze**: verwijderen, of laten staan omdat er een plan mee is. Verwijderen is de
default; laat het staan, dan hoort er een comment bij waarom.

**Let op bij verwijderen**: controleer of `compileComponentFeedback` niet via een
dynamische import of een registry wordt aangeroepen — grep op de naam alleen dekt dat
niet. Zie de les van 2026-08-18 (een negatieve uitkomst is pas bewijs als je de check
hebt laten falen).

## 2. De schrijf-kant van keten B (kruisingen #6/#7)

`strict-rewrite/apply` en `auto-iterate/apply` gaven vóór 2026-08-16 de melding "geen
componenten" op een keten-B-pagina. Die melding is nu eerlijk — hij legt uit dat
herschrijven voor dit type nog niet kan — maar de **actie** ontbreekt: een web-page of
long-form GEO-pagina is nog steeds niet echt te herschrijven via die knoppen.

De accessor loste het lézen op. Schrijven naar `settings.structuredVariant` vraagt een
eigen laag: waar de leeslaag één bron kiest, moet de schrijfkant weten wélke
representatie leidend is en hoe `puckData` meebeweegt.

**De keuze**: bouwen we die schrijfkant, of blijft herschrijven bewust een
keten-A-functie? Dit raakt ook de schrijf-divergentie die in de ADR expliciet buiten
scope is gehouden.

## 3. Repurpose neemt geen bron-content mee (kruising #19)

`studio/[deliverableId]/derive` strip sinds 2026-08-16 de keten-B-velden. Dat moest:
de accessor leest `structuredVariant` als waarheid, dus zonder die strip gaf een
afgeleide post de tekst van de **bronpagina** terug.

Maar daarmee krijgt het afgeleide deliverable nu ook *helemaal* geen bron-content mee.
Voor "maak een LinkedIn-post van deze pillar-page" is dat waarschijnlijk niet wat je
wilt — de bron zou als **context** mee moeten, niet als inhoud.

**De keuze**: gaat de bron-tekst mee als briefing/context bij een derive, en zo ja in
welk veld? Dit is een productbeslissing over wat "afleiden" betekent, geen bugfix.

# Acceptatiecriteria

- [ ] Per punt een besluit vastgelegd (uitvoeren óf expliciet "bewust niet, want …")
- [ ] Bij uitvoeren: bewijs uit een echte run, niet alleen `tsc` — beide takken van deze
      keten compileren altijd

# Out of scope

- Storage normaliseren en `generatedText` droppen — aparte opruim-migratie, zie ADR.
- De benadering in `resolveDeliverableContentSignal`: de lijst-telling spiegelt
  `selectLiveComponents` niet en kan in een zeldzaam geval `ready` zeggen waar de
  volledige accessor `empty` geeft. Bewust gedocumenteerd in de docstring i.p.v.
  gefixt; heropen alleen met een echte vindplaats.
