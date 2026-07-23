---
id: workspaces-online-migratie
title: Offline (lokaal-only) workspaces naar prod migreren
fase: launch
priority: next
effort: "~30-45 min per workspace (Claude prept bundle, Erik draait prod-import)"
owner: claude-code
status: in-progress
created: 2026-07-23
completed: -
related-adr: -
related-spec: scripts/migrate-brand-dna/README.md
worktree: -
---

# Probleem

Er staan meerdere klant-/prospect-workspaces alleen **lokaal** (org "Branddock Agency",
lokale DB) en nog niet op **prod**. Importscripts laden `.env.local` en schrijven per
definitie lokaal (zie [[adullam-workspace-split]]), dus lokaal-gevulde workspaces verschijnen
niet vanzelf online. Erik wil de resterende offline workspaces "zonder teveel gedoe" live
hebben.

**Onderzoek 2026-07-23** (lokale DB-telling; prod-kant kon niet live geverifieerd worden —
de Branddock-connector-token was verlopen, prod-status komt uit de memory-trail):

**Al op prod (bevestigd, NIET migreren):** Adullam · Better Brands · Branddock HQ · Gemeente Barneveld.

**Offline — rijk merk-DNA (personas + producten + voice + style), kandidaten om online te zetten:**

| Workspace | Taal | Personas | Producten | Concurrenten |
|---|---|---|---|---|
| Linfi | nl | 7 | 4 | 4 |
| DTS Ede | en | 3 | 5 | 4 |
| People Masterminds | nl | 3 | 5 | 3 |
| Nobox | en | 3 | 4 | 1 |
| Zwarthout | nl | 3 | 3 | 3 |
| Napking | nl | 3 | 3 | 1 |
| Goed-Bouw | nl | 4 | 3 | 0 |
| QonnecQt.ai | en | 3 | 1 | 2 |
| PartnerSelect | en | 3 | 1 | 3 |

**Offline — dun gevuld (assets + style, weinig/geen personas — check of migreren de moeite waard is):**
Het Nieuwe Golfen (en) · Lookaal (en) · WRA Juristen (nl) · Wassink Groep (en, ook geen voice).

**Demo (overslaan):** Branddock Demo.

> ⚠️ Erik kiest welke van deze hij daadwerkelijk online wil — niet alle namen zijn per se
> actieve klanten. Deze taak levert de bundles voor de gekozen set.

# Voorstel

Per gekozen workspace de bewezen **migrate-brand-dna**-flow draaien (`scripts/migrate-brand-dna/`,
zelfde als Adullam/Barneveld/BB). Taakverdeling houdt het gedoe voor Erik minimaal:

- **Claude doet (lokaal + R2, geen prod-creds nodig):** per workspace `export.ts` → bundle JSON
  in `scripts/migrate-brand-dna/bundles/<slug>-2026-07-xx.json`, daarna `upload-images.ts` zodat
  logo's/styleguide-beelden op prod resolven. Levert kant-en-klare bundles op.
- **Erik doet (prod-creds; Claude heeft géén prod-DB-toegang, zie [[prod-access-and-keys-state]]):**
  per workspace de prod-workspace aanmaken (registreren of in-app aanmaken → auto-provisioning
  maakt org+workspace+11 lege assets), dan dry-run + echte import met `--confirm-host` + `--workspace-id`.

# Acceptatiecriteria

- [ ] Erik bevestigt welke workspaces online moeten (subset van de lijst hierboven)
- [ ] Per gekozen workspace: bundle geëxporteerd + beelden naar R2 geüpload (Claude)
- [ ] Per gekozen workspace: prod-import gedraaid, `get_brand_context` toont gevuld merk-DNA (Erik)
- [ ] `contentLanguage` op de prod-workspace correct gezet (val #411: bundle bevat 'm niet — bij `en`-merken handmatig zetten)
- [ ] Styleguide gepubliceerd op prod (anders voedt hij `getBrandContext` niet)
- [ ] Documentatie bijgewerkt indien van toepassing

# Bestanden die ik aanraak

- `scripts/migrate-brand-dna/bundles/<slug>-2026-07-xx.json` (nieuw, per workspace)

# Bestanden die ik NIET aanraak

- `scripts/migrate-brand-dna/*.ts` — tooling is af (gehard tijdens Adullam/Barneveld), niet refactoren

# Smoke test plan

1. Export: `DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" npx tsx scripts/migrate-brand-dna/export.ts "<Workspace>" <slug>.json`
2. Controleer de rij-count + beeld-referenties in de output.
3. R2-upload: `npx tsx scripts/migrate-brand-dna/upload-images.ts <slug>.json` (vereist R2-creds in `.env.local`).
4. Erik: prod-workspace-id ophalen → dry-run (`--dry-run`) → echte import (`--confirm-host <db-host> --workspace-id <id>`).
5. Verwacht: `mcp__claude_ai_Branddock__list_brands` / `get_brand_context` toont het merk gevuld op prod.

# Risico's

- **Werkstaal-val (#411/Adullam)**: `Workspace.contentLanguage` zit bewust niet in de bundle → bij `en`-merken handmatig zetten, anders toont de UI "English" terwijl generatie NL doet. De import waarschuwt sinds PR #239 bij een taalverschil.
- **Beelden resolven niet** zonder `upload-images.ts` + `R2_PUBLIC_URL` (anders signed-URLs die na ~1u verlopen).
- **Fresh-workspace-guard** weigert een prod-workspace met bestaand merk-DNA zonder `--force` — opzet; alleen bij een verse workspace zonder `--force` draaien.
- Claude kan de prod-import niet zelf draaien (geen prod-DB-toegang) — de import blijft mensstap.

# Out of scope

- Content/campagnes/media-historie migreren (de tooling migreert bewust alléén het merk-fundament).
- De dun-gevulde workspaces automatisch meenemen — eerst Eriks keuze of ze de moeite waard zijn.

# Bundles geprept 2026-07-23 (Claude) — klaar voor prod-import

Erik koos 8 workspaces (6 + 2 nabesteld). Alle bundles geëxporteerd + beelden naar R2 geüpload.
Liggen in `scripts/migrate-brand-dna/bundles/<slug>-2026-07-23.json`:

| Workspace | Slug | Taal | Rijen | Beelden | contentLanguage op prod zetten? |
|---|---|---|---|---|---|
| Linfi | linfi | nl | 145 | ⚠️ 1/19 (zie noot) | **ja → nl** |
| Napking | napking | nl | 96 | 9/9 ✓ (incl. voice-mp3) | **ja → nl** |
| Zwarthout | zwarthout | nl | 65 | 9/9 ✓ | **ja → nl** |
| DTS Ede | dts-ede | en | 64 | 3/3 ✓ | nee (en = default) |
| PartnerSelect | partnerselect | en | 63 | 4/4 ✓ | nee (en = default) |
| Goed-Bouw | goed-bouw | nl | 50 | geen | **ja → nl** |
| WRA Juristen | wra-juristen | nl | 41 | geen | **ja → nl** |
| Het Nieuwe Golfen | het-nieuwe-golfen | en | 35 | geen | nee (en = default) |

> ⚠️ **Linfi-noot**: 18 van 19 beeld-refs ontbraken op schijf — állemaal `2026/05/`
> styleguide-**preview**-artefacten (component-screenshots, hero, 1 AI "vision"-logo). Cosmetisch:
> de 7 échte Linfi-logo's zijn externe `linfi.nl`-URLs (resolven prima) en alle kleuren/fonts/
> rules/personas/producten zijn intact. Op prod zijn alleen de component-preview-thumbnails leeg
> tot een herextractie. Zelfde klasse als de Adullam/Barneveld missing-image-gotcha.

## Import — één commando (Erik draait dit; Claude heeft geen prod-DB-toegang)

Er is een all-in-one wrapper die de bewezen `import.ts` over álle 8 bundles loopt + de nazorg
(contenttaal + styleguide publiceren) doet: **`scripts/migrate-brand-dna/import-all-2026-07-23.sh`**.

**Vooraf, in de app (geen terminal):** maak de 8 workspaces aan (namen als in de tabel; de app
leidt de slug van de naam af). Matcht een slug niet, dan meldt de dry-run dat en zet je het
prod-workspace-id in de `ROWS`-mapping bovenin het script (`ref`-veld dat met `cm` begint).

```bash
export PROD_URL="postgresql://<user>:<pw>@<host>/<db>?sslmode=require"   # DIRECTE (unpooled) Neon-URL
bash      scripts/migrate-brand-dna/import-all-2026-07-23.sh            # 1) DRY-RUN — schrijft niets
GO=1 bash scripts/migrate-brand-dna/import-all-2026-07-23.sh            # 2) ECHT — import + taal + publish
```

De wrapper leidt de `--confirm-host` automatisch af uit `PROD_URL`, zet `contentLanguage=nl`
voor de nl-workspaces en publiceert elke styleguide (`nazorg.ts`). Verse prod-workspaces →
**geen `--force` nodig**. Ketst de ECHTE run af op een host-mismatch, draai dan met
`CONFIRM_HOST=<host-uit-dry-run>` ervoor. Zorg dat het prod-schema actueel is (`prisma db push`)
vóór de eerste import.

**Nazorg-matrix** (doet de wrapper automatisch): styleguide publiceren nodig voor 7 (alleen
Linfi staat lokaal al op `published=true`); `contentLanguage→nl` voor Linfi/Napking/Zwarthout/
Goed-Bouw/WRA Juristen (DTS Ede/PartnerSelect/Het Nieuwe Golfen zijn `en` = default).

### Handmatig alternatief (één workspace)
```bash
DATABASE_URL="<prod-DIRECT>" npx tsx scripts/migrate-brand-dna/import.ts \
  scripts/migrate-brand-dna/bundles/<slug>-2026-07-23.json --workspace-id <id> --confirm-host <db-host>
DATABASE_URL="<prod-DIRECT>" npx tsx scripts/migrate-brand-dna/nazorg.ts --workspace-id <id> --lang nl --publish
```

# Notes

- Runbook-detail: `scripts/migrate-brand-dna/README.md` (stappen 0-5).
- Prod-status niet live te verifiëren zolang de connector-token verlopen is — Erik moet de
  Branddock-connector opnieuw autoriseren, dan kan `list_brands` de prod-inventaris tonen.
- Verwante migraties als referentie-flow: [[adullam-workspace-split]], [[barneveld-workspace]], [[pilot-brand-dna-migrated-prod]].
