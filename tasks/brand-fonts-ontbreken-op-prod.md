---
id: brand-fonts-ontbreken-op-prod
title: Geen enkel merk op productie heeft een fontbestand — alles rendert in Inter
fase: post-launch
priority: next
effort: 2-4 uur code + per merk ~15 min upload (afhankelijk van licenties)
owner: claude-code + user (licenties + bestanden)
status: open
created: 2026-08-18
completed:
related-adr: docs/adr/2026-06-05-typography-font-canonicalization.md
related-spec: -
worktree: -
---

# Probleem

De storage-URL-audit tegen Neon-productie (2026-08-18, `scripts/dev/storage-url-audit.ts`)
laat zien dat `StyleguideFont.fileUrl` **44 van de 44 keer leeg is**. Er staat op productie
dus géén enkel fontbestand.

Gevolg: élke merkfont valt terug op het metric-substituut. In de Typography-tab staat overal
*"Previewing with Inter — a metric substitute"*, en dat substituut werkt door in méér dan een
preview: de tab zegt het zelf — *"needed for accurate previews, PDF exports, and AI-generated
content"*.

**Dit is geen bug en geen ontbrekende functionaliteit.** Het upload-pad bestaat volledig:
`FontUploadModal.tsx`, `POST /api/brandstyle/fonts`, en daarnaast Adobe-Fonts-kit-ondersteuning
per workspace (`Workspace.adobeFontsKitId`). De D4-fallback doet precies wat hij hoort te doen
en meldt eerlijk dat hij een substituut toont. Het gat is puur: er is nooit iets geüpload.

Waarom het toch opgelost moet worden: we verkopen merkconsistentie. Een klant die zijn eigen
styleguide opent en overal Inter ziet — terwijl er "Neue Haas Grotesk Display" boven staat —
ziet het product zijn eigen belofte niet waarmaken. Bij een demo is dat het eerste wat opvalt.

# Voorstel

Twee sporen, los van elkaar uit te voeren.

**A — de data (jij, per merk).** Voor elk merk met gedetecteerde fonts: óf het `.woff2`-bestand
uploaden, óf een Adobe-Fonts-kit-id op de workspace zetten. Dit vereist een geldige licentie —
zie Open vragen.

**B — de zichtbaarheid (code).** Vandaag moet je pér merk de Typography-tab openen om te zien
dat er niets staat. Er is geen overzicht en geen signaal. Voorstel: het bestaande
`dataQuality`-mechanisme in `BrandOnboardingWizard` (dat al een `tab === "typography"`-filter
heeft) laten meetellen dat een gedetecteerde font zónder bestand een openstaand punt is, zodat
het in de merk-gereedheid opduikt in plaats van onzichtbaar te blijven.

# Acceptatiecriteria

- [ ] Per merk op prod vastgelegd: fontbestand geüpload, Adobe-kit gezet, of expliciet
      "bewust niet — licentie ontbreekt"
- [ ] Minstens één merk toont in de Typography-tab de échte merkfont (geen substituut-melding)
- [ ] Een gedetecteerde font zonder bestand telt mee in de merk-gereedheid/`dataQuality`
- [ ] Her-run van `scripts/dev/storage-url-audit.ts` op prod toont een niet-leeg
      `StyleguideFont.fileUrl`
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd — `scripts/dev/typography-tab-browser-smoke.ts` op een merk mét
      een geüpload bestand: de computed `font-family` is dan de merkfont, niet `inter`
- [ ] Documentatie bijgewerkt indien van toepassing

# Bestanden die ik aanraak

- `src/features/brandstyle/components/BrandOnboardingWizard.tsx` — dataQuality-signaal (spoor B)
- `src/features/brandstyle/components/brand-assets/FontsGrid.tsx` — indien het signaal daar
  ook moet landen
- `scripts/dev/typography-tab-browser-smoke.ts` — assertie uitbreiden zodra er een echt
  bestand is om tegen te testen

# Smoke test plan

1. Upload op één merk (lokaal) een `.woff2` via de Fonts-kaart.
2. Draai `SMOKE_WORKSPACE_ID=<dat merk> npx tsx scripts/dev/typography-tab-browser-smoke.ts`.
3. Verwacht: de computed `font-family` is de merkfont in plaats van `inter`, en de
   substituut-melding is weg.

Let op: de smoke asserteert vandaag alléén dat Type Scale en In Context *hetzelfde* renderen.
Dat blijft groen met een substituut — die check bewijst consistentie, niet echtheid. Voor dit
onderwerp is een aparte assertie nodig.

# Risico's

- **Licenties.** `Neue Haas Grotesk Display` en `Suisse Int'l` (Het Nieuwe Golfen) zijn
  commercieel. Een `.woff2` uploaden zonder webfont-licentie is een juridisch probleem, geen
  technisch. De UI labelt ze niet voor niets als *"Commercial — upload"*.
- **Het substituut is soms de juiste uitkomst.** Voor een merk zónder licentie is Inter met een
  eerlijke melding beter dan een 404 of een stille mismatch. Spoor B moet dat kunnen uitdrukken
  ("bewust niet") en niet elk merk eeuwig als incompleet markeren.

# Out of scope

- Fonts automatisch downloaden van de klantsite — dat is precies de licentie-val hierboven.
- De D4-substituut-logica zelf; die werkt en meldt eerlijk wat hij doet.

# Open vragen

1. Voor welke merken hébben we een webfont-licentie? Dat bepaalt of dit een upload-actie is of
   een "bewust niet"-registratie.
2. Is de Adobe-Fonts-kit-route (`Workspace.adobeFontsKitId`) een reëel alternatief voor de
   pilot-merken? Die is al bedraad maar wordt nergens gebruikt.
3. Moet een merk zonder fontbestand een zichtbare waarschuwing krijgen richting de klant, of
   alleen intern in de gereedheids-meting?
