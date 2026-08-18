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

## Doorpraten per item (werkend sinds 2026-08-10)

Elke taak klapt uit naar detail (toelichting, rust-reden, open vragen) met twee routes:

1. **"Praat hierover door met Claude"** — één klik. Opent een nieuw claude.ai-gesprek met een voorgevuld, **zelfvoorzienend** startbericht (titel, status, toelichting, rust-reden en vragen reizen mee in het bericht — het gesprek heeft geen repo-toegang nodig). Het prompt stuurt op kritisch sparren en eindigt bij een besluit met één concreet actiepunt voor Claude Code.
2. **"of kopieer voor Claude Code"** — kopieert een repo-bewust startbericht (leest CLAUDE.md/gotchas/START_HERE, mag bestanden inzien en het dashboard bijwerken) om te plakken in een nieuwe Claude Code-sessie.

> Achtergrond: chat ín de dashboard-pagina zelf kan niet met de huidige artifact-capabilities (geen in-page AI-completion); de claude.ai/new-link is het werkende alternatief. Herzie dit wanneer de artifact-runtime een completion-capability krijgt.

## Het bijwerk-ritueel (verplicht)

1. **Elke sessie die iets afrondt of besluit**: werk `stuurdata.json` bij (status-overrides weg bij afronding, nieuwe vragen/besluiten erin, kritiek pad herzien, peildatum), verplaats done-taken naar `tasks/done/`, run `node scripts/dev/dashboard-build.mjs`, en herpubliceer het artifact naar de **vaste URL** hierboven (zelfde-sessie: zelfde file-path volstaat; andere sessie: geef de URL mee als `url`-parameter).
2. **Nieuwe taak** = task-file volgens template **plus** een klasse-entry in `stuurdata.json` (het script signaleert het als je hem vergeet).
3. **Open vragen horen bij het item**: vragen over een taak gaan in `stuurdata.json` → `taken.<id>.vragen`, niet in losse notities — dan staan ze op het dashboard bij het item én in het doorpraat-prompt.
4. **Vrijdagretro**: volledige verificatie — script draaien, doc-sync-afwijkingen wegwerken, klassen herzien, verlopen gates expliciet herzien.
5. **Klasse-verschuivingen zijn besluiten**: C→A/B (of andersom) alleen met reden in de commit-message.

## Roadmap-sanering — ✅ uitgevoerd 2026-08-10

`roadmap.md` is herschreven tot **initiatieven-index** (status, gates en verwijzingen per initiatief; prioriteringskader = dashboard-banen + moat-toets + RICE). De oude roadmap incl. volledige log staat in `docs/archive/old-lists/roadmap-pre-sanering-2026-08-10.md`. De 13 done-taken zijn naar `tasks/done/` verplaatst en `open-acties-2026-07-23.md` is afgeschaft — de nog-open punten leven als besluiten in `stuurdata.json`. Regel voortaan: wacht-op-Erik-punten gaan direct in `stuurdata.json`, nooit meer in losse open-acties-bestanden.

## Verhouding tot de andere documenten

| Document | Rol vanaf 2026-08-10 |
|---|---|
| **Dit dashboard** | Leidend: wat doen we nu, in welke volgorde, wat is bevroren |
| `stuurdata.json` | De redactie-laag achter het dashboard (enige hand-bewerkte deel) |
| `roadmap.md` | Initiatieven-index: status, gates en verwijzingen per initiatief (gesaneerd 2026-08-10) |
| `START_HERE.md` | Sessie-entrypoint — verwijst naar dit dashboard |
| `tasks/<id>.md` | Uitvoeringsdetail per taak — bron van de feiten |
| `docs/specs/brandclaw-vision.md` | Het waarom-eindbeeld boven blok D |

Bij tegenspraak: dashboard wint voor prioritering; het detail-document wint voor inhoudelijke feiten — en de tegenspraak zelf is een doc-sync-actie (het script vangt de meest voorkomende automatisch).
