# Branddock Dashboard — leidend stuurdocument

> **Besluit Erik 2026-08-10**: dit dashboard is **leidend voor alle vervolgstappen**.
> Niet de roadmap-header, niet een losse takenlijst — déze pagina bepaalt wat er nu toe doet.

## Wat is het

Eén pagina met vijf blokken:

- **A · Live-stand** — wat draait er (app, billing, credits, pilot, agents, omzet-stand)
- **B · Kritiek pad** — de genummerde stappen die er nú toe doen (volgorde = betekenis)
- **C · Open taken in drie klassen** — A: nu cruciaal · B: moat-werk (merk-graph / bewijs / leerlus) · C: bevroren/gegate
- **D · Brandclaw-lijn** — groeistadia, BC-uitvoeringsstand, ontwerp-agenda (visie §10)
- **E · Besluiten bij Erik** — direct spelend + strategisch

Bron: [`branddock-dashboard.html`](branddock-dashboard.html) (dit is de source of truth).
Gepubliceerde weergave (artifact, privé): https://claude.ai/code/artifact/10805dd2-ff12-4fe0-8f07-5b7f24e9e576

## Het bijwerk-ritueel (verplicht)

1. **Elke sessie die iets afrondt of besluit** werkt het dashboard bij: peildatum, live-stand, status-pills, afgeronde items eruit, nieuwe besluiten erin. Klein houden — het is een stuurpagina, geen logboek.
2. **Herpubliceren naar dezelfde URL**: vanuit een Claude-sessie het bijgewerkte bestand publiceren met de bestaande artifact-URL als `url`-parameter (anders ontstaat een nieuwe URL). De URL hierboven blijft dus stabiel.
3. **Vrijdagretro**: volledige verificatie — kloppen alle pills nog met `tasks/` en de werkelijkheid? Verlopen gates (datums) expliciet herzien.
4. **Klasse-verschuivingen zijn besluiten**: een taak van C naar A/B verplaatsen (of andersom) gebeurt alleen met reden in de commit-message; nieuwe taken krijgen bij aanmaak een klasse.

## Verhouding tot de andere documenten

| Document | Rol vanaf 2026-08-10 |
|---|---|
| **Dit dashboard** | Leidend: wat doen we nu, in welke volgorde, wat is bevroren |
| `roadmap.md` | Detail + historie per initiatief (sanering staat als kritiek-pad stap 5) |
| `START_HERE.md` | Sessie-entrypoint — verwijst naar dit dashboard |
| `tasks/<id>.md` | Uitvoeringsdetail per taak (ongewijzigd) |
| `docs/specs/brandclaw-vision.md` | Het waarom-eindbeeld boven blok D |

Bij tegenspraak tussen dashboard en een ander document: het dashboard wint voor prioritering; het detail-document wint voor inhoudelijke feiten — en de tegenspraak zelf is een doc-sync-actie.
