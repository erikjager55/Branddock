---
id: 2026-08-07-puck-exit-sectie-editor
title: Puck-exit — eigen sectie-gebaseerde editor + render-loop; JSON-datamodel en componenten blijven
status: accepted
date: 2026-08-07
supersedes: -
superseded-by: -
---

# Context

**Aanleiding**: user-voorstel 2026-08-07 om van Puck (`@puckeditor/core`) af te stappen, volgend op de feedback dat de webpage-editor "te statisch" aanvoelt naast de nieuwe generatie prompt-first tools (v0/Lovable, Relume, Figma Make). Daarmee is re-evaluation-trigger 4 uit ADR `2026-05-22-landing-page-builder-architectuur` ("Marketer-DX onvoldoende — Puck-editor voelt te dev-oriented") de facto geraakt: de founder is de eerste pilot-gebruiker.

**Footprint-meting (audit 2026-08-07, zie `docs/specs/2026-08-07-webpage-builder-verbeterplan.md`)** — Branddock gebruikt Puck opvallend oppervlakkig:

- **Runtime**: 1× `<Puck>` (de fullscreen `FullscreenEditorModal`), ~6× `<Render>` (Step 3-preview, Step 2-variant-previews, beide diff-modals, `/p/[slug]`, screenshotter-pad), 1× `puck.css`.
- **Geen enkel geavanceerd editor-API**: geen `DropZone`/slots (content is een platte sectie-array), geen `usePuck`, geen plugins, geen `AutoField`.
- **Veldtypes**: alleen `text` (47), `textarea` (11), `array` (15), `select` (3), `radio` (2), `number` (1), `custom` (1 — de eigen `PuckImageField`).
- **16 bestanden importeren uitsluitend het `Data`-type** (templates, mappers, flatten-helpers) — een mechanische swap.
- Alle AI-routes (strict-rewrite, auto-iterate, component-edit, Claw-tools) opereren op de JSON zelf, niet op Puck-API's.

**Structurele dependency-frictie** (gedocumenteerd in code en incidenten):

1. `external`-field-bug in 0.21.2 → persona-picker zit op een statische `select` (`docs/audits/puck-external-field-typing-issue.md`).
2. Stapel workarounds in `PuckPageBuilder.tsx`: z-index `2147483647`-portal, `--puck-color-azure-*`-theming-remap, hoogte-override op `_PuckLayout_` (hardcoded `100dvh` upstream), body-attribute-mirroring die scroll-locks de iframe in spiegelt (Playwright-diagnose 2026-06-10).
3. **Prod-incident 2026-07-16**: Pucks CSS `@import`'t het Inter-font van rsms.me → ChunkLoadError achter de CSP tot een allow werd toegevoegd (`security-headers.ts:23`).
4. Editor-chunk lekt naar de publieke render-route: `/p/[slug]` weegt 208 KB gz (target 100) — bundle-split stond al als restpunt open.
5. Upgrade-treadmill: 0.21.2 gepind, 0.22/0.23 wachten met breaking-change-review; release-cadans van het Puck-team bepaalt ons regressierisico (expliciet benoemd als tradeoff in het 2026-05-22-ADR).
6. De component-level AI-edit is destijds verwijderd omdat Pucks form-in-sidebar-interactiemodel er niet bij paste — het interactiemodel van de dependency stuurde de productkeuze, andersom dan gewenst.

**Productrichting**: het verbeterplan (2026-08-07) verlegt de primaire interactie naar prompt-first bewerken (pagina/sectie/element) + sectie-hover-acties + inline tekst-edit + generatieve pattern-keuze, met de per-type W-regels als server-side vangrails. In dat model is een generieke vrije-vorm-editor een vestigial orgaan: de W-regels definiëren juist sectie-volgorde- en verplichte-sectie-contracten die een generieke drag-drop-editor **niet** afdwingt, terwijl een eigen sectie-lijst-editor ze by construction kan afdwingen.

# Decision

Gefaseerde exit van `@puckeditor/core` (spoor E1→E3 in het verbeterplan §5); het JSON-datamodel en alle 18 brand-aware componenten blijven ongewijzigd:

1. **Eigen `PageData`-type** — structureel identiek aan de huidige `puckData`-JSON (`{ root: { props }, content: [{ type, props }] }`). **Geen datamigratie**; bestaande deliverables en `LandingPage`-snapshots blijven byte-voor-byte geldig.
2. **Eigen `<PageRender>`-loop** (E1) — vervangt Pucks `<Render>` op alle ~6 call-sites: registry-lookup + render-functie-aanroep over de platte sectie-array. De bestaande component-builder-functies (closure-captured brand-tokens) blijven 1-op-1.
3. **Eigen sectie-editor** (E2) — vervangt de fullscreen `<Puck>`-modal: verticale sectie-lijst met reorder (dnd-kit of pijl-acties), toevoegen uit de pattern-bibliotheek, dupliceren/verwijderen (met verplichte-sectie-guard per type-schema), props-paneel op de bestaande `ConfigFieldRenderer`-patronen + `PuckImageField` (blijft as-is), undo/redo via een snapshot-stack op de bestaande autosave. **Bewust géén vrije-vorm/nested drag-drop** — de sectie is de eenheid, conform de W-regels.
4. **Dependency-verwijdering** (E3) — `@puckeditor/core` + `puck.css` + CSP-allow rsms.me + de workaround-stapel weg; bundle-doel `/p/[slug]` is daarmee by construction gehaald.
5. Editing is primair **prompt-first + inline + sectie-toolbar** (verbeterplan Fase A-C); de eigen sectie-editor is de "power-modus", niet het hoofdpad.

# Y-statement

In de context van **de webpage-builder voor de 5 Puck-content-types, waar een footprint-audit aantoont dat Puck alleen als platte render-loop plus een achter een knop verstopte modal-editor wordt gebruikt**, facing **user-feedback dat de editor statisch/dev-oriented aanvoelt én structurele dependency-frictie (CSP-prod-incident, veldtype-bug, workaround-stapel, bundle-lek naar de publieke route, upgrade-treadmill)**, I decided **`@puckeditor/core` gefaseerd te vervangen door een eigen sectie-gebaseerde editor en render-loop op het ongewijzigde JSON-datamodel** to achieve **een interactiemodel dat 1-op-1 past bij prompt-first bewerken binnen per-type regels, zonder vendor-frictie en zonder editor-bundle op publieke pagina's**, accepting tradeoff **dat we editor-voorzieningen (reorder, props-paneel, undo/redo, viewport-preview) zelf bouwen en onderhouden, toekomstige gratis Puck-features (rich-text WYSIWYG, plugin rail, virtualization) verliezen en vrije-vorm/nested layouts buiten scope plaatsen**.

# Consequences

## Positief

- **Frictie-inventaris verdwijnt integraal**: external-field-bug, theming-remap, z-index/hoogte/body-mirror-hacks, rsms.me-CSP-allow, upgrade-treadmill — allemaal weg bij E3.
- **Bundle-doel publieke route gehaald by construction** — `/p/[slug]` rendert via een eigen loop zonder editor-code; het openstaande bundle-split-restpunt vervalt.
- **De editor dwingt de regels af** die de gebruiker juist waardeert: verplichte secties zijn niet verwijderbaar, volgorde-guards per type-schema zitten in de editor zelf i.p.v. alleen in de AI-validatielaag.
- **Eén interactiemodel**: prompt-first, inline en sectie-acties op één render-surface — geen modus-breuk meer tussen preview en fullscreen-editor.
- **Volledige UX-controle**: editor-chrome in Branddock-designtaal (tokens, Lucide, emerald-states) i.p.v. Puck-theming-overrides.
- **Exit is goedkoop door het oppervlakkige gebruik**: type-swap mechanisch (16 bestanden), render-loop ~1-2d, alle AI-routes en de publish-keten raken Puck-API's niet aan.
- **Geen vendor op het kritieke pad** van de kern-feature meer (zelfde motivatie als de oorspronkelijke keuze tégen Plasmic Enterprise).

## Negatief / tradeoffs

- **Zelf bouwen en onderhouden**: sectie-reorder, props-paneel, undo/redo-stack, viewport-preview-toggles (~4-6d E2, +0,5-1d E3, tegenover 1,5-2,5d voor het upgrade-pad — netto ~+4-7d).
- **Pariteitsrisico in de overgangsfase**: tot E2 af is draait de oude modal naast de nieuwe surface; visuele regressies moeten door de bestaande smoke-suite (45 phases, ~1500 assertions) + screenshot-vergelijk gevangen worden.
- **Toekomstige Puck-features komen niet meer gratis**: rich-text WYSIWYG (0.21), plugin rail, virtualization voor grote pagina's, Puck AI. Rich-text/inline-edit bouwen we sowieso zelf (verbeterplan A3); virtualization is pas relevant bij ≥50 secties (nooit waargenomen).
- **Community-leverage weg**: 12.7k-stars-project loste editor-randgevallen voor ons op; die verantwoordelijkheid is nu van ons.

## Neutraal

- De naam `puckData` (in `Deliverable.settings` en `LandingPage`) kan blijven of later cosmetisch hernoemen naar `pageData` — losse opruimtaak, geen migratienoodzaak.
- ADR `2026-05-22-landing-page-builder-architectuur` blijft voor het overige **van kracht**: Canvas Step 3-integratiepatroon (beslissing 1), Vercel-hosting + middleware-routing (3), CNAME custom domains (4) en persistentie (5) veranderen niet. Alleen beslissing 2 (editor-stack) wordt herzien.
- De fasen A-D van het verbeterplan blijven de inhoudelijke roadmap; de exit verweeft er als spoor E1-E3 doorheen.

# Alternatives considered

- **Blijven op Puck + upgraden naar 0.23 (verbeterplan v1, taak A1)**: laagste korte-termijn-kosten (1,5-2,5d) en de DnD/theming-verbeteringen komen gratis. Niet gekozen omdat de frictie structureel is (elke upgrade opnieuw breaking-change-review; de workaround-stapel en de CSP-koppeling blijven), de modal-editor een vreemd lichaam blijft naast prompt-first, en het bundle-lek alsnog een aparte split vergt. De trigger-4-klacht ("dev-oriented") wordt er niet mee geadresseerd — hooguit verzacht.
- **Zwaardere vendor-editor (Plasmic Enterprise / GrapesJS Studio SDK)** — de suggesties uit trigger 4 van het 2026-05-22-ADR: niet gekozen; de audit toont dat we *minder* generieke editor nodig hebben, niet meer. De oorspronkelijke bezwaren (AGPL-risico, niet-publieke pricing, vendor op kritiek pad, geen merkcontext-injectie) gelden onverminderd.
- **Puck alleen als render behouden, editor verwijderen**: halveert de frictie (modal + hacks weg), maar houdt de dependency, `puck.css`, de CSP-allow en de type-koppeling in stand voor wat een triviale render-loop is. De eigen `<PageRender>` (~1-2d) is goedkoper dan de blijvende koppeling.
- **Big-bang verwijdering in één taak**: niet gekozen; de gefaseerde route (E1 render → E2 editor → E3 dependency) houdt de app op elk moment werkend en maakt elke stap apart smoke-baar en terugdraaibaar.

# Notes

- **Marktonderzoek 2026-08-07 bevestigt en verzwaart dit besluit** (`docs/reports/webpage-bouw-en-publicatie-marktonderzoek-2026-08-07.md`, 4 sporen / ~20 producten): (a) het sectie+token-model is overal het winnende bouwmodel — zelfs code-generatoren (Lovable, v0) dwingen hun AI door token-regels, en alle platform-AI-features genereren binnen een constrained design-system, nooit vrije HTML; (b) de registry-als-contract (stabiele type-id's + typed schema's) is het convergente patroon bij Builder/Makeswift/Plasmic/Storyblok en dubbelt als AI-tool-definitie; (c) **E1's render-loop krijgt een tweede, zwaardere rol als compiler-kern**: zonder Pucks `<Render>` op het publieke pad wordt compile-to-static-bij-publish (het Webflow/Framer-kamp) bereikbaar — de 18 componenten zijn daar al server-safe voor gebouwd. Zie verbeterplan v3 Spoor P.
- **Uitvoering**: exit-spoor E1-E3 met effort en volgorde in `docs/specs/2026-08-07-webpage-builder-verbeterplan.md` §5 (v3). Elke E-stap een eigen task-file + worktree conform CLAUDE.md.
- **Geaccepteerd 2026-08-12** (user-opdracht "voer het plan volledig uit" na het marktonderzoek). Herziet uitsluitend beslissing 2 van `2026-05-22-landing-page-builder-architectuur`; dat ADR heeft een verwijzende aantekening in Notes gekregen (geen volledige `superseded`-status — beslissingen 1/3/4/5 blijven geldig).
- **Nieuwe re-evaluation-triggers**:
  1. Pilot-klanten eisen aantoonbaar vrije-vorm/nested layouts (buiten de sectie-patronen om) → heroverweeg een generieke editor op dat moment, met deze footprint-meting als startpunt.
  2. E2 overschrijdt 2 weken effort → stop-and-ask; het upgrade-pad (alternatief 1) is dan alsnog open, want E1/E3 zijn er niet van afhankelijk in omgekeerde richting.
  3. Rich-text-behoefte groeit voorbij inline contentEditable (tabellen, embeds) → aparte evaluatie (ProseMirror-lijn bestaat al elders in de app).
- **Datapunten uit de audit**: footprint-meting 2026-08-07 (grep op `@puckeditor`, DropZone/usePuck/plugins/AutoField = 0 hits; veldtype-telling); prod-incident CSP/rsms.me `security-headers.ts:21-27`; bundle-meting 208 KB gz uit `tasks/web-page-builder-acceptance-rest.md`.
