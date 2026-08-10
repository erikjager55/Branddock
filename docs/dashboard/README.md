# Branddock Dashboard — leidend stuurdocument

> **Besluit Erik 2026-08-10**: dit dashboard is **leidend voor alle vervolgstappen**.
> Niet de roadmap-header, niet een losse takenlijst — déze pagina bepaalt wat er nu toe doet.

## Hoe het werkt (data-pipeline sinds 2026-08-10)

Het dashboard wordt **gegenereerd**, niet met de hand bijgehouden:

```
tasks/*.md  (frontmatter = feiten: title, status, effort, fase)
     +
docs/dashboard/stuurdata.json  (redactie: klasse A/B/C, kritiek pad, live-stand, open vragen, besluiten)
     |
     v
node scripts/dev/dashboard-build.mjs
     |
     v
docs/dashboard/branddock-dashboard.html  (uit template.html — NIET met de hand bewerken)
     |
     v
artifact herpubliceren naar de vaste URL
```

- **Feiten** (status, effort, titel) komen altijd uit de task-files — die blijven de bron.
- **Redactie** (klasse-indeling, kritiek pad, vragen, besluiten, live-stand) staat in `stuurdata.json` — dat is het enige bestand dat een sessie inhoudelijk bijwerkt.
- **Doc-sync-detectie**: het script signaleert automatisch afwijkingen (taak op `done` maar nog in `tasks/`, taak zonder klasse, stuurdata-entry zonder bestand) en zet ze bovenaan het dashboard. Eerste run (2026-08-10) ving direct 13 done-taken die nog in `tasks/` lagen.
- **Virtuele items**: voorstellen zonder task-file (bv. BC-1.5, ontwerp-agenda) staan in `stuurdata.json` onder `virtueleTaken` — zo zijn ook nog-aan-te-maken taken zichtbaar en bespreekbaar.

Gepubliceerde weergave (artifact, privé): https://claude.ai/code/artifact/10805dd2-ff12-4fe0-8f07-5b7f24e9e576

## Doorpraten per item

Elke taak op het dashboard klapt uit naar detail (titel, effort, gate, open vragen, bronbestand) met een knop **"Kopieer start-prompt voor doorpraten"**. Dat prompt opent in een nieuwe Claude Code-sessie het gesprek mét alle context van dat item (leest CLAUDE.md/gotchas/START_HERE, vat het item samen, stelt verdiepingsvragen, en werkt bij besluit het dashboard bij).

> Onderzocht 2026-08-10: chat ín de dashboard-pagina zelf is met de huidige artifact-capabilities (alleen `downloads` + `mcp`-connectors) niet mogelijk — er is geen in-page AI-completion. Het kopieer-prompt-patroon is het beste werkende alternatief; herzie dit wanneer de artifact-runtime een completion-capability krijgt.

## Het bijwerk-ritueel (verplicht)

1. **Elke sessie die iets afrondt of besluit**: werk `stuurdata.json` bij (status-overrides weg bij afronding, nieuwe vragen/besluiten erin, kritiek pad herzien, peildatum), verplaats done-taken naar `tasks/done/`, run `node scripts/dev/dashboard-build.mjs`, en herpubliceer het artifact naar de **vaste URL** hierboven (zelfde-sessie: zelfde file-path volstaat; andere sessie: geef de URL mee als `url`-parameter).
2. **Nieuwe taak** = task-file volgens template **plus** een klasse-entry in `stuurdata.json` (het script signaleert het als je hem vergeet).
3. **Open vragen horen bij het item**: vragen over een taak gaan in `stuurdata.json` → `taken.<id>.vragen`, niet in losse notities — dan staan ze op het dashboard bij het item én in het doorpraat-prompt.
4. **Vrijdagretro**: volledige verificatie — script draaien, doc-sync-afwijkingen wegwerken, klassen herzien, verlopen gates expliciet herzien.
5. **Klasse-verschuivingen zijn besluiten**: C→A/B (of andersom) alleen met reden in de commit-message.

## Roadmap-verbeterplan (kritiek-pad stap 5 — uit te voeren bij sanering)

Onderzoeksconclusie 2026-08-10: `roadmap.md` is een logboek geworden (3000-woorden-header, NOW vol ✅-regels, aanbevelingen van een maand oud). Sanering:

1. **Header-log → `docs/changelog.md`** (daar hoort historie); roadmap-header wordt 3 regels (peildatum + fase + link naar dashboard).
2. **NOW-sectie vervangen** door één verwijzing naar dit dashboard — geen dubbele prioritering meer.
3. **Roadmap wordt initiatieven-index**: per initiatief (Agents, Meertaligheid, Brandclaw, …) een korte sectie met status, gates en links naar tasks/ADR's — detail en historie, geen dagelijkse sturing.
4. **Klasse + moat-toets** (uit visie §5) opnemen in het prioriteringskader naast RICE.
5. **`open-acties-*.md`-bestanden afschaffen** — wacht-op-Erik-punten leven voortaan als vragen/besluiten in `stuurdata.json` (blok E van het dashboard).

## Verhouding tot de andere documenten

| Document | Rol vanaf 2026-08-10 |
|---|---|
| **Dit dashboard** | Leidend: wat doen we nu, in welke volgorde, wat is bevroren |
| `stuurdata.json` | De redactie-laag achter het dashboard (enige hand-bewerkte deel) |
| `roadmap.md` | Detail + historie per initiatief (sanering: zie hierboven) |
| `START_HERE.md` | Sessie-entrypoint — verwijst naar dit dashboard |
| `tasks/<id>.md` | Uitvoeringsdetail per taak — bron van de feiten |
| `docs/specs/brandclaw-vision.md` | Het waarom-eindbeeld boven blok D |

Bij tegenspraak: dashboard wint voor prioritering; het detail-document wint voor inhoudelijke feiten — en de tegenspraak zelf is een doc-sync-actie (het script vangt de meest voorkomende automatisch).
