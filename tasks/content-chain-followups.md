---
id: content-chain-followups
title: Content-keten — drie beslissingen die na de accessor overbleven
fase: post-launch
priority: later
effort: klein per item (½-1 dag), maar elk vraagt eerst een keuze
owner: unassigned
status: in-progress
created: 2026-08-18
completed: -
related-adr: docs/adr/2026-07-17-deliverable-content-accessor.md
related-spec: -
worktree: branddock-content-chain-dode-code
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

### ✅ Uitgevoerd 2026-08-19 — en het was groter dan kruising #12

Verwijderd volgens de default. Maar bij het uitzoeken bleek **zes van de zeven exports**
dood te zijn, niet twee. `context-builder.ts` ging van 314 naar 38 regels.

| Export | Externe verwijzingen |
|---|---|
| `GenerationContext` | **10** — blijft staan |
| `buildGenerationContext` | 0 |
| `buildCascadingComponentContext` | 0 |
| `compileComponentFeedback` | 0 |
| `CampaignStrategyData` | 0 |
| `DeliverableBriefData` | 0 |
| `CascadingContextOptions` | 0 |

Plus drie private helpers die alleen door de bovenstaande werden aangeroepen.

**Waarom het bestand blijft bestaan**: `GenerationContext` wordt door drie bestanden
geïmporteerd (`quality-scorer`, `prompt-templates/helpers`,
`scripts/voice-research/ws3/score-voice-quality`) — alle drie als *type*, nooit als
waarde. Er is dus geen producent meer van dat type; het is een kaal contract geworden.
Dat staat als zodanig in de kop-comment.

**De herkomst is de studio-cleanup.** Dit is een restant van de oude Content Studio (UI weg
op 2026-04-09, dode store/lib/routes op 2026-06-24). De levende generatieketen loopt via
`canvas-orchestrator` + `studio/prompt-templates` — die map is wél volledig in gebruik.

**Bewijs, met de detector gekalibreerd** (les 2026-08-18/19):
- geen dynamische `import()`/`require()` van dit pad
- geen string-referentie naar een symboolnaam (registry/reflectie)
- geen barrel- of re-export
- ⚠️ mijn eerste sweep zocht alleen op `@/lib/studio/context-builder` en miste daarmee
  **relatieve** imports; twee van de drie gebruikers kwamen pas boven met
  `from ['\"](\.{1,2}/)*.*context-builder`. Zonder die correctie had ik `GenerationContext`
  voor dood aangezien en een type verwijderd dat tien keer wordt gebruikt.
- de detector is gekalibreerd op `GenerationContext` zelf: die gaf 10 treffers, dus hij
  vindt gebruik wél. Een sweep die overal nul vindt, is verdacht.
- **`npm run build` volledig geslaagd** — niet alleen `tsc`, zoals het acceptatiecriterium
  eist; een build pikt dynamische imports op die typecheck laat lopen. Plus
  `typecheck:scripts`, `lint` 0 errors, en de gate 37/37.

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

### 📊 Gemeten 2026-08-19 — om de keuze goedkoop te maken

| | lokaal | prod |
|---|---|---|
| Deliverables totaal | 322 | 13 |
| Waarvan keten B (`settings.structuredVariant`) | **41 (12,7%)** | **2** |
| Keten-B-content-types | 7 | 1 |

Lokaal is keten B dus een reële minderheid maar geen randgeval; op prod gaat het om
**twee** items. Verdeling lokaal: `landing-page` 29, `faq-page` 2, `blog-post` 2,
`microsite` 2, `product-page` 2, `comparison-page` 1.

**Wat dit betekent voor de keuze**: de schrijfkant bouwen is vandaag werk voor twee
productie-items. Dat pleit voor uitstellen — maar met een *trigger* in plaats van stilte,
want 12,7% lokaal laat zien dat het aandeel groeit zodra landingspagina's echt in gebruik
raken. Voorstel voor de trigger: **≥10 keten-B-deliverables op prod, of één klantverzoek
om een landingspagina te herschrijven.** De melding is sinds 16-08 eerlijk, dus niemand
loopt tegen een stille muur; dat maakt uitstellen verdedigbaar.

⚠️ **Bijvangst uit dezelfde meting**: `contentType` kent zowel `landing-page` (29) als
`Landing Page` (3). Dezelfde soort, twee schrijfwijzen — elke query, filter of
`switch` op dat veld telt er één van de twee. Niet onderzocht hoe dat is ontstaan of
wat het raakt; wel het vermelden waard voordat iemand op dat veld gaat groeperen.

## 3. Repurpose neemt geen bron-content mee (kruising #19)

`studio/[deliverableId]/derive` strip sinds 2026-08-16 de keten-B-velden. Dat moest:
de accessor leest `structuredVariant` als waarheid, dus zonder die strip gaf een
afgeleide post de tekst van de **bronpagina** terug.

Maar daarmee krijgt het afgeleide deliverable nu ook *helemaal* geen bron-content mee.
Voor "maak een LinkedIn-post van deze pillar-page" is dat waarschijnlijk niet wat je
wilt — de bron zou als **context** mee moeten, niet als inhoud.

**De keuze**: gaat de bron-tekst mee als briefing/context bij een derive, en zo ja in
welk veld? Dit is een productbeslissing over wat "afleiden" betekent, geen bugfix.

### 📊 Gemeten 2026-08-19 — de functie wordt de facto niet gebruikt

| | lokaal | prod |
|---|---|---|
| Deliverables met een `derivedFromId` | **1** | **0** |
| Waarvan vanaf een keten-B-bron | **0** | **0** |

Er is dus **geen enkel geval** waarin dit probleem zich heeft voorgedaan — niet lokaal en
niet op productie. De strip van 16-08 heeft aantoonbaar niets kapotgemaakt, want er is
niets dat erdoor geraakt wordt.

**Wat dit betekent voor de keuze**: dit hoort niet in "Later" maar in "geblokkeerd op een
trigger", naar het model van
[`lp-turnstile-form-endpoint`](lp-turnstile-form-endpoint.md). Ontwerpen wat "afleiden"
betekent zonder één waargenomen gebruik is raden naar de behoefte van een gebruiker die er
nog niet is. **Trigger: de eerste derive vanaf een keten-B-bron** — toetsbaar met de SQL
hierboven. Tot dan is de huidige strip het veilige gedrag: liever geen bron-content dan de
verkeerde.

# Acceptatiecriteria

- [~] Per punt een besluit vastgelegd (uitvoeren óf expliciet "bewust niet, want …")
      - **Punt 1** ✅ uitgevoerd 2026-08-19 (verwijderd, en breder dan gedacht)
      - **Punt 2** ⏭️ meting ligt er, het besluit is aan Erik — voorstel: uitstellen mét
        trigger (≥10 keten-B op prod, of één klantverzoek)
      - **Punt 3** ⏭️ meting ligt er, het besluit is aan Erik — voorstel: blokkeren op een
        trigger (de eerste derive vanaf een keten-B-bron), niet ontwerpen zonder gebruik
- [x] Bij uitvoeren: bewijs uit een echte run, niet alleen `tsc` — ✅ **`npm run build`
      volledig geslaagd** na de verwijdering, plus `tsc`, `typecheck:scripts`, `lint`
      (0 errors) en de bewakers-gate 37/37. De build is hier het relevante bewijs: die
      pikt dynamische imports op die een typecheck laat passeren.

# Out of scope

- Storage normaliseren en `generatedText` droppen — aparte opruim-migratie, zie ADR.
- De benadering in `resolveDeliverableContentSignal`: de lijst-telling spiegelt
  `selectLiveComponents` niet en kan in een zeldzaam geval `ready` zeggen waar de
  volledige accessor `empty` geeft. Bewust gedocumenteerd in de docstring i.p.v.
  gefixt; heropen alleen met een echte vindplaats.
