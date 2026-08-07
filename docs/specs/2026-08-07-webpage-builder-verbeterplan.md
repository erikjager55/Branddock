# Webpage-builder verbeterplan — van statische editor naar prompt-first bouwen op de design-library

> **Datum**: 2026-08-07
> **Aanleiding**: user-feedback op de Puck-editor voor de web-page content-types: *"de regels per type website zijn goed, maar de editor voelt te statisch — nieuwe tools bouwen puur op prompts en de design-library."*
> **Scope**: de content-items die webpagina's bevatten (`landing-page`, `product-page`, `faq-page`, `comparison-page`, `microsite` + long-form GEO via `isPuckRenderable`).
> **Methode**: code-audit van de volledige builder-keten (Step 1 → publish) + doorlichting van alle gerelateerde specs/ADR's/tasks + benchmark van de prompt-first toolgeneratie (v0/Lovable, Relume, Figma Make, Puck upstream).
> **Verhouding tot bestaande besluiten**: dit plan werkt **binnen** ADR `2026-05-22-landing-page-builder-architectuur` (Puck blijft de renderer; de edit-architectuur met verplichte diff-preview + locks blijft). Het adresseert re-evaluation-trigger 4 uit dat ADR ("editor te dev-oriented") zonder van stack te wisselen. `tasks/web-page-builder-acceptance-rest.md` wordt door Fase A geabsorbeerd.

---

## 1. Diagnose — waarom voelt de editor statisch?

De flow (Step 2 structured variants → keuze → Step 3 preview-first Puck-render) is functioneel compleet, maar het **interactiemodel** stamt uit het formulier-tijdperk terwijl de markt naar prompt-first is bewogen. De audit laat bovendien zien dat een flink deel van de oplossing al gebouwd is — maar nooit aan de UI is gehangen.

### 1.1 Bewerken is een modus, geen gesprek
De hoofdview van Step 3 is een read-only `<Render>` (`PuckPageBuilder.tsx:596`). Elke aanpassing vereist óf de fullscreen "Bewerk layout"-modal (`FullscreenEditorModal`, `PuckPageBuilder.tsx:738` — een context-switch naar een dev-achtige editor met sidebar-formuliervelden), óf een alles-of-niets Auto-iterate-run. Inline tekst-editing op het canvas — in het MVP-plan beloofd als "Laag 1" en sinds Puck 0.21 native beschikbaar — is nooit aangezet: er is geen `contentEditable` in `puck-config.tsx`.

### 1.2 De prompt-laag bestaat server-side, maar heeft geen UI (wees-code)
Dit is de opvallendste auditbevinding — het gat zit niet in de backend maar in de bedrading:

| Gebouwd | Bestand | Status |
|---|---|---|
| **Strict-rewrite**: pagina-rewrite op een vrije gebruikersinstructie ("never skips") | `api/landing-pages/strict-rewrite/route.ts` | ✅ route af — **geen UI-knop** |
| **Generate-page**: vrije prompt → complete Puck-tree | `api/landing-pages/generate-page/route.ts` + `lib/content/headless-webpage.ts` | ✅ route af — **geen UI-knop** |
| **Component-edit**: AI-rewrite per sectie met lock-respect + edit-distance | `api/landing-pages/component-edit/route.ts` | ✅ route af — **geen caller** |
| **ComponentDiffPreviewModal**: side-by-side sectie-diff | `canvas/medium/ComponentDiffPreviewModal.tsx` (258 regels) | ✅ af — **nergens geïmporteerd** |
| Vaste AI-instructies (shorten/formal/casual/alternatives) | `lib/landing-pages/ai-edit-instructions.ts` | wees — in Phase 6.6 uit de UI verwijderd |

De component-AI is destijds verwijderd omdat 4 vaste knoppen weinig toevoegden. De juiste conclusie was: *vaste knoppen* zijn te star. De getrokken conclusie was: *component-AI weg* — en er kwam geen vrij promptveld voor terug. Ondertussen belooft het code-comment op `PuckPageBuilder.tsx:48` nog altijd "Generate-from-prompt" als page-actie die niet bestaat.

### 1.3 Eén vaste layout per paginatype
De 18 componenten en de per-type starter-/structured-templates (`puck-templates/*.ts`) zijn statische trees; de generator produceert alleen **copy** binnen die vaste botten. De rijke design-library die er al is — `BrandTokens` (+per-token provenance), `DesignSystem` per LayoutStyle, `brand-render-rules.ts` (hero-patterns, button/card/typografie-picks), `render-constraints.ts` (per brand-archetype) — stuurt **styling**, geen **structuurvariatie**. Gevolg: elke landing-page van elk merk heeft dezelfde sectie-anatomie; alleen kleuren, fonts, hero-pattern en band-ritme verschillen. Dat is de kern van het "statische" gevoel — en van het "IKEA-meubels in een andere kleur"-probleem dat `idea-brand-domain-specific-components` al signaleerde.

### 1.4 Generatie is een black box van 30-90 seconden
`LandingPageGenerateBlock` toont een spinner met ETA; geen streaming, geen sectie-voor-sectie opbouw. Variantkeuze is one-shot; structuur verversen loopt via het destructieve `regenerate-puck-data`-endpoint (wist handmatige Puck-edits; de geplande confirm-modal is nooit bedraad). `diff-merge.ts` bestaat maar wordt hier niet benut.

### 1.5 De sectie is wél de eenheid van de regels, niet van de UI (in Step 3)
Step 2 heeft per-sectie regenerate + inline `EditableField`-editing in de variant-kaart (`auto-iterate-variant` met `section`-scope). Step 3 — waar de gebruiker het langst zit — heeft niets op sectieniveau: geen hover-toolbar (verplaats/verwijder/regenereer/prompt), geen "wissel deze sectie naar een ander patroon".

### 1.6 Puck-versie loopt achter op de features die dit oplossen
Gepind op `@puckeditor/core` 0.21.2. Sindsdien upstream: 0.22 (theming via CSS custom properties; `external`-field-fix → ontgrendelt de persona-picker die nu een statische `select` is), 0.23 (soepelere drag-drop, minder layout-shift, draggable outline). De upgrade-overweging stond al in `web-page-builder-acceptance-rest.md`.

### 1.7 Bijvangst van de audit — de keten eindigt in een doodlopend pad
De publish-flow (`/api/landing-pages/publish` → `LandingPage`-snapshot → `<workspace>.branddock.app/<slug>` via `src/proxy.ts` + `/p/[slug]`) is backend-compleet, maar **heeft geen enkel UI-startpunt**: Step 4's `PublishGate` roept de generieke `/api/studio/[id]/publish` aan, die géén `LandingPage` aanmaakt. De actie "Publiceer als webpagina" uit het MVP-acceptatiecriterium is nooit gebouwd. Een levendigere editor heeft weinig waarde zolang het resultaat de app niet uit kan — dit hoort bij elk verbeterplan voor deze content-items.

---

## 2. Wat expliciet blijft (het fundament is goed)

| Laag | Bestanden | Waarom behouden |
|---|---|---|
| **Per-type contentregels** | `page-type-schemas.ts` (Zod-contracten: verplichte secties, min/max-aantallen, tekencaps, cross-field-invarianten zoals single-CTA-discipline), `docs/specs/website-page-types-implementatieplan.md` + `docs/specs/web-page-types/*` (research-backed sectie-anatomie), `webpage-types.ts` (gates) | Door de user expliciet als sterk benoemd. Wordt de **vangrail** waarbinnen prompt-edits mogen bewegen: elke AI-mutatie valideert server-side tegen het type-schema. |
| **Brand-design-library** | `brand-tokens.ts` (+provenance), `brand-tokens-v4-mappers.ts` (Tier 1 scraped / Tier 2 archetype / Tier 3 defaults), `design-system.ts`, `brand-render-rules.ts`, `render-constraints.ts`, `color-distribution.ts`, `spacing-grid.ts`, `wcag.ts`, `a11y-styles.ts` | Dit ís de design-library waar de nieuwe tools op bouwen — hij bestaat al en wordt alleen niet generatief benut (Fase C). |
| **Kwaliteitspoorten** | `lp-fidelity-judge.ts`, `visual-brand-fit-judge.ts` (F-VAL dim 8), F-VAL composite, verplichte diff-preview + locks (ADR §Edit-architectuur), `component-lock.ts`, hero-preserve chokepoints | Branddock's onderscheidend vermogen t.o.v. v0/Lovable: output wordt tegen merk én type-regels gescoord. Geen prompt-first concurrent heeft dit. |
| **Publish-keten (backend)** | `publish-page.ts`, `LandingPage`-snapshot (immutable), `/p/[slug]` (ISR + JSON-LD + sitemap/llms.txt), host-router | Werkt; mist alleen de UI (→ A0). |
| **Claw-assistent-tools** | `read_landing_page_content` / `update_landing_page_content` (pad-gevalideerde, tekst-only edits met `COPY_KEYS`-allowlist) | Bewezen kiem voor conversational editing; Fase B bouwt hierop voort. |

**Niet doen** (bewust uit scope): wisselen van editor-stack (Puck blijft — de ADR-re-evaluation-triggers zijn niet geraakt); arbitrary code/HTML-generatie à la v0 (de brand-aware componentenset + patterns blijven de vocabulaire — dat garandeert brand-conformiteit, RSC-veiligheid en publish-veiligheid); Puck Cloud AI (gesloten dienst zonder merkcontext; de eigen Anthropic-stack heeft de context al).

---

## 3. Benchmark — wat de prompt-first generatie doet die wij missen

| Tool | Interactiemodel | Wat wij ervan overnemen |
|---|---|---|
| **v0 / Lovable / Bolt** | Prompt → streaming live-preview; itereren via chat + element-selectie ("select and tell") | Vrije prompt als primaire edit-interface; streaming opbouw; klik-op-element → gerichte instructie |
| **Relume** | AI kiest + vult uit een bibliotheek van honderden geteste sectie-patronen | Sectie-patroonbibliotheek als generatieve bouwsteen (bij ons: gefilterd op brand-archetype) |
| **Figma Make / Onlook** | Direct-manipulatie + prompt naast elkaar, geen modus-switch | Inline bewerken in de preview zelf; modal alleen voor power-layoutwerk |
| **Puck upstream (0.21+)** | Inline rich-text op canvas, plugin rail, Puck AI (beta, cloud) | Upgrade + inline editing in de hoofdview; Puck AI zelf niet (cloud, geen merkcontext) |

**Branddock's positie**: die tools genereren mooi maar merk-loos en regel-loos. Wij hebben merk-DNA, per-type regels en F-VAL — maar een statisch interactiemodel. De strategie is dus niet "v0 nabouwen", maar **hun interactiemodel enten op onze vangrails**: prompt-first UX × design-library × per-type contracten. Die combinatie biedt geen van de genoemde tools.

---

## 4. Doelbeeld (noordster)

> **"Praat met je pagina, binnen de vangrails van je merk en paginatype."**

1. **Elke wijziging kan via een prompt** — op pagina-, sectie- of elementniveau. Vaste knoppen blijven als shortcuts; de vrije prompt is het primaire pad.
2. **De design-library is een generatieve bouwsteen** — generatie en "wissel layout" kiezen per sectie uit brand-toegestane patronen i.p.v. één vaste template.
3. **De per-type regels zijn de vangrails** — elke AI-mutatie wordt server-side gevalideerd tegen het type-schema (Zod) + W-regels + F-VAL-drempels. Een prompt kan een FAQ-pagina nooit z'n contact-escape afnemen.
4. **Direct bewerken in de preview** — tekst inline, secties via hover-acties; de fullscreen editor blijft voor power-layoutwerk.
5. **Generatie is zichtbaar** — secties streamen in terwijl ze gegenereerd worden.
6. **De keten eindigt live** — publiceren als webpagina is een zichtbare actie, geen dood endpoint.

---

## 5. Fasering

### Fase A — Bedraad wat er al is + frictie weg (~1-1,5 week, geen ADR nodig)

Grotendeels wiring van bestaande routes/modals — daarom goedkoper dan het lijkt.

| # | Taak | Wat | Effort |
|---|---|---|---|
| A0 | `lp-publish-ui` | **"Publiceer als webpagina"** in Step 4/Export: slug-kiezer + status + live-URL, POST naar de bestaande `/api/landing-pages/publish`; re-publish bij latere edits (snapshot-model bestaat). Sluit het MVP-acceptatiecriterium alsnog. | 1-2d |
| A1 | `puck-upgrade-023` | `@puckeditor/core` 0.21.2 → 0.23.x. Changelog-review op breaking changes; daarna persona-picker naar `external`-field (async fetch/search), Puck-theming via CSS custom properties (vervangt de `--puck-color-azure-*`-hack), DnD-verbeteringen gratis mee. Regressie: `smoke:web-page-builder` (45 phase-scripts, ~1500 assertions) + browser-smoke 5 types. Neem de bundle-split-meting `/p/[slug]` mee (208 KB gz vs 100 KB target — editor-chunk lekt naar de publieke route). | 1,5-2,5d |
| A2 | `lp-page-prompt-action` | **Vrij promptveld op paginaniveau** ("Beschrijf wat je wilt aanpassen") naast Auto-iterate: bedraad de bestaande `strict-rewrite`-route → uitkomst door de bestaande `PageDiffPreviewModal`. Lost het beloofde "Generate-from-prompt" (`PuckPageBuilder.tsx:48`) in. | ~1d |
| A3 | `lp-inline-text-edit` | **Inline tekst bewerken in de preview-first view** (MVP "Laag 1" alsnog): klik op tekstveld → contentEditable overlay → autosave via bestaand debounce-pad. `collectEditableTextFields`/`COPY_KEYS` is de whitelist van bewerkbare paden. Geen modal meer voor een typo. | 2-3d |
| A4 | `lp-section-hover-actions` | **Sectie-hover-toolbar in de preview**: verplaats ↑↓, dupliceer, verwijder, "regenereer deze sectie", "✏️ prompt op deze sectie". Herbedraad de wees-code: `component-edit`-route accepteert naast de 4 vaste instructies ook vrije tekst; `ComponentDiffPreviewModal` wordt de voorstel-weergave. Schema-guard: verwijderen van een verplichte sectie (per type-schema) wordt geweigerd met uitleg. Per-component lock-toggle (lib bestaat: `component-lock.ts`) terug in deze toolbar. | 2-3d |

**Parallel hygiëne-cluster** (fill-in, ~1d totaal): (a) orchestrate-dubbelpad voor PUCK-types daadwerkelijk gaten — W1 koos Optie A maar de audit vond geen bewijs dat het dode Step 1-pad is afgesloten → dubbele generatiekosten; (b) `canvas/medium/README.md` doc-sync (zegt 11 componenten, het zijn er 18; beschrijft de verwijderde component-AI-flow); (c) beslissing vaste-instructie-registry: `ai-edit-instructions.ts` wordt shortcut-preset naast het vrije veld óf gaat weg.

**Acceptatie Fase A**: een gebruiker publiceert een pagina vanuit de UI naar `<workspace>.branddock.app/<slug>`; past tekst, sectie-volgorde en een sectie-rewrite via eigen prompt aan zonder de fullscreen modal te openen; alle 5 types; `npx tsc --noEmit` 0 errors; smoke-suite groen.

### Fase B — Prompt-first editing als hoofdinteractie (~2-3 weken, ADR-aanvulling op §Edit-architectuur)

| # | Taak | Wat | Effort |
|---|---|---|---|
| B1 | `lp-chat-dock` | **Chat-dock in Step 3** (rechterpaneel, geen modal): conversationeel bewerken op de bestaande Claw-agent-loop. Write-tools uitbreiden van tekst-only naar **structureel**: `add_section` / `remove_section` / `reorder_sections` / `set_section_props` / `swap_section_pattern` (Fase C). Elke tool valideert server-side tegen per-type Zod + W-regels + locks; wijzigingen verzamelen in één batch-diff (bestaand `diff-merge`-mechanisme) die de gebruiker accepteert/afwijst. Multi-turn: "maak de hero urgenter" → voorstel → "iets minder schreeuwerig" → verfijning. Consolideert Claw-tools en component-edit-route op één server-side validatielaag. | 5-7d |
| B2 | `lp-streaming-generation` | **Streaming sectie-voor-sectie generatie** in Step 2: structured output streamen (partial-JSON parsing), secties renderen zodra compleet. De 30-90s spinner wordt een pagina die zich opbouwt. Variant-B start na variant-A (perceived speed). | 3-4d |
| B3 | `lp-select-and-tell` | **Element-selectie + contextuele promptbar**: klik op element in de preview → zwevende promptbar → gerichte edit met inline diff. Verfijnt A4's sectie-targeting naar veld-/elementniveau (paden uit `collectEditableTextFields` + props). | 3-4d |
| B4 | `lp-variant-merge` | **Edit-behoud bij structuur-refresh**: three-way merge via `diff-merge.ts` rond het destructieve `regenerate-puck-data`-endpoint + de nooit-gebouwde confirm-modal. Handmatige edits (incl. gekozen beelden) overleven een variantwissel; conflicten tonen in de diff-modal. | 2-3d |
| B5 | `lp-quality-dimensions-live` | **De per-type kwaliteitsregels echt laten draaien**: `landing-page-quality.ts` (6 LP-dimensies, 440 regels — nu alleen door een smoke aangeroepen) in het productie-pad van auto-iterate/strict-rewrite; beslissing F-VAL deep-score default (`AUTO_ITERATE_DEEP_SCORE`) o.b.v. latency-meting. Sluit aan op wat de user al waardeert: de regels — die moeten dan ook echt scoren. | 1-2d |

**Acceptatie Fase B**: de primaire edit-flow loopt via prompt (chat-dock of select-and-tell); elke AI-mutatie passeert schema-validatie + diff-accept; generatie streamt; accept-ratio per bron wordt gemeten (§6).

### Fase C — Design-library als generatieve bouwsteen (~3-4 weken, ADR nodig voor C3)

| # | Taak | Wat | Effort |
|---|---|---|---|
| C1 | `lp-section-pattern-library` | **Sectie-patroonbibliotheek**: generaliseer het hero-pattern-mechanisme (`HeroPatternKey`, `pickHeroLayout`) naar de andere sectietypes: FeatureGrid (grid/alternerend/tabs/bento), Testimonial (single-quote/wall/logo's+quote), CTA (banner/split/card), FAQ (accordion/two-column), Stats (row/cards). Elk pattern: render-variant in `puck-config.tsx` + metadata (archetype-fit, content-eisen). Patterns filteren op `render-constraints.ts`. Neem de drie ontbrekende anatomie-componenten uit de LP-spec mee (`TrustStrip`, `PainBullets`, `ImpactStats` — spec §4a). Constraint: render-functies **RSC-safe** (geen `'use client'` — puck-config draait server-side voor screenshotter + `/p/[slug]`). | 5-7d |
| C2 | `lp-pattern-swap-ui` | **"Wissel layout" per sectie**: pattern-kiezer met live thumbnails in de sectie-hover-toolbar (A4) — alleen brand-toegestane patterns; instant client-side re-render (props blijven, pattern-prop wijzigt; geen AI-call). | 3-4d |
| C3 | `lp-generative-pattern-choice` | **Pattern-keuze in de generatie**: de variant-generator kiest per sectie een pattern (nieuw veld in de structured output, gevalideerd tegen de per-type + archetype-toegestane set). Twee varianten in Step 2 verschillen dan ook in **layout**, niet alleen in copy — de kern van "niet meer statisch". W-regels blijven de harde volgorde/verplicht-contracten. ADR nodig (schema-wijziging raakt fidelity-scoring, templates en `variant-to-puck-data`-dispatch). | 4-5d |
| C4 | `brand-domain-specific-components` | **(Gated)** merk-/domein-specifieke componenten — bestaand draft-idee achter de bestaande gate (`validate-brand-domain-component-fit`, pilot-data vereist). Dit plan wijzigt die gate niet; C1's pattern-registry is er de natuurlijke landingsplek voor. | na gate |

**Acceptatie Fase C**: twee generaties van dezelfde brief leveren zichtbaar verschillende maar beide merk-conforme layouts; patterns wisselbaar zonder AI-call; visual-brand-fit-judge scoort pattern-varianten ≥ huidige baseline; pattern-spreiding wordt gemeten.

### Fase D — Verdieping (post-pilot, go/no-go op meetdata)

- **D1** Meerdere layout-richtingen per generatie ("toon 3 design-richtingen") met visual-brand-fit-judge als panel — pas als C3-data laat zien dat pattern-variatie geaccepteerd wordt.
- **D2** Puck-tree-bewuste versiehistorie met named snapshots + restore (uitbreiding van het bestaande `VersionHistorySidebar`-patroon, dat nu niet Puck-aware is).
- **D3** A/B-publicatie van twee varianten op één slug (bouwt op het `LandingPage`-snapshot-model).
- **D4** Upstream-herbeoordeling: Puck AI / plugin rail zodra de eigen chat-editing draait (verwachting: niet nodig — merkcontext blijft de moat).

---

## 6. Meting & go/no-go's

| Metriek | Bron | Drempel |
|---|---|---|
| **Accept-ratio AI-voorstellen** (per bron: auto-iterate / page-prompt / chat / sectie-prompt) | diff-modal accept/reject events | <30% = kwaliteitsprobleem (prompt-tuning); >90% = preview-frictie versoepelen (auto-apply + undo) — conform ADR-trigger 6 |
| **Prompt-adoptie** | % bewerkte pagina's met ≥1 vrije-prompt-edit | doel: >50% na Fase B bij pilot-gebruikers |
| **Modal-vermijding** | % edit-sessies zonder fullscreen-editor-open | stijgend = A3/A4 werken |
| **Time-to-first-publish** | deliverable created → eerste `LandingPage`-publish | meetbaar vanaf A0; dalend na B2 |
| **Fidelity-delta** | F-VAL/visual-fit vóór en na prompt-edits | prompt-edits mogen de score niet structureel verlagen; zo wel → strakkere guards |
| **Pattern-spreiding** (Fase C) | verdeling gekozen patterns per sectie-type | monocultuur (>80% zelfde pattern) = C3-prompt bijstellen |

Credits: prompt-edits en sectie-regeneraties zijn output-metered conform ADR `2026-07-07-pricing-credits-launch` (kleine gerichte calls — goedkoper dan hele-pagina auto-iterate); instrumenteer per actie vanaf dag 1.

---

## 7. Risico's & mitigaties

| Risico | Mitigatie |
|---|---|
| Puck-upgrade breekt bestaande pagina's/editor | Changelog-review vooraf; smoke-suite (45 phases, ~1500 assertions) + browser-smoke 5 types; puckData is portable JSON — render-regressie is zichtbaar, niet destructief; pin exacte versie na test |
| AI-edit breekt het type-contract (verplichte sectie weg, schema-mismatch) | Alle mutaties server-side door per-type Zod + W-regel-guard (weigering mét uitleg terug de chat in); don't-shrink/minWords-guards hergebruiken (gotchas 2026-05-17); AI-JSON altijd Zod defense-in-depth (gotcha 2026-03-20) |
| Chat-editing wordt traag/duur | Targeted tool-calls op sectie-/veldniveau i.p.v. hele-pagina rewrites; hele-pagina alleen op expliciete vraag; latency-budget per tool-call in de ADR-aanvulling |
| Diff-preview-moeheid bij kleine edits | Inline tekst-edits (A3) en pattern-swaps (C2) zijn direct + undo-baar (geen AI = geen diff-modal); de verplichte diff blijft alleen voor AI-mutaties; heroverweeg bij >90% accept-ratio |
| Nieuwe render-varianten breken de publieke route of de screenshotter | Alle componenten/patterns RSC-safe (geen `'use client'` in render-functies — eerdere breuk gedocumenteerd in het domain-components-draft); phase-smoke per pattern |
| Scope-creep richting v0-kloon (arbitrary code-gen) | Harde lijn: componentenset + patterns zijn de vocabulaire; nieuwe visuele vrijheid via patterns (C1) en gated custom components (C4), nooit via vrije HTML |
| Twee edit-paden (Claw-tools vs component-edit-route) divergeren | B1 consolideert beide op één server-side validatielaag (schema-guard + lock-check + diff-build); geen tweede waarheid |
| Orphaned publish-UI raakt de generieke studio-publish | A0 laat `/api/studio/[id]/publish` (deliverable-status) intact; `LandingPage`-publish is additief ernaast, zoals het snapshot-model bedoelt |

---

## 8. Volgorde & afhankelijkheden

```
A0 (publish-ui) — onafhankelijk, kan direct
A1 (upgrade) ──→ A3/A4 (bouwen op 0.23-gedrag)
A2 (page-prompt, wiring) — onafhankelijk, kan direct
A4 ──→ B3 (select-and-tell verfijnt sectie-targeting)
A2+A4 ──→ B1 (chat-dock hergebruikt dezelfde server-validatielaag)
B1 ──→ C3 (generatieve pattern-keuze via dezelfde tool-schema's)
C1 ──→ C2 ──→ C3
B5 — onafhankelijk, kan elk moment (klein)
```

Aanbevolen start: **A0 + A2 parallel** (beide pure wiring, verschillende files, eigen worktrees conform CLAUDE.md), direct daarna A1, dan A3/A4. De Fase B-beslissing valt op de eerste accept-ratio-data uit A2/A4.

Elke taak krijgt een eigen task-file (`tasks/<id>.md`) volgens template, eigen worktree, en doorloopt task-finalize. ADR-momenten: aanvulling op ADR 2026-05-22 §Edit-architectuur bij B1 (tool-vocabulaire + guardrails chat-editing); nieuw ADR bij C3 (pattern-keuze in structured output).

---

## 9. Samenvatting voor de retro

Het fundament (per-type regels, brand-design-library, kwaliteitspoorten, publish-backend) is sterk en blijft ongemoeid. De audit laat zien dat een flink deel van de prompt-laag al gebouwd is maar nooit bedraad (strict-rewrite, generate-page, component-edit + diff-modal, publish-UI) — Fase A is daarom vooral wiring. Wat daarna verandert is het **interactiemodel**: van formulier-in-modal + vaste AI-knoppen naar prompt-first bewerken (pagina/sectie/element) met streaming generatie, en van één vaste template per type naar generatieve pattern-keuze uit de eigen design-library — telkens met de bestaande regels als server-side vangrails. Daarmee krijgt Branddock de UX van de nieuwe prompt-tools zónder hun zwakte (geen merkcontext, geen regels, geen validatie) over te nemen.
