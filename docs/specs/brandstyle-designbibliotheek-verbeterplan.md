# Designbibliotheek → Brandstyle: verbeterplan

> **Datum**: 2026-08-07 (zelfde dag aangevuld met §1.3 — verdiepend bronnenonderzoek naar de
> bouwmethode van Claude Design) · **Status**: voorstel, nog niet gepland
> **Aanleiding**: Claude Design bouwde uit een Branddock brand-kit-export een designbibliotheek
> (`docs/experiments/DTS Ede Design System/`) die op meerdere punten structureel sterker is dan
> wat de brandstyle-sectie zelf oplevert. Dit plan analyseert die opbouw, vergelijkt met hoe
> andere applicaties brand-/designbibliotheken opbouwen, en vertaalt dat naar een geprioriteerd
> verbeterpad voor de brandstyle-sectie.
> **Verhouding tot bestaande plannen**: dit plan **vervangt niets**. Het bouwt voort op
> `docs/audits/2026-06-06-governed-token-layer-verbeterplan.md` (V1–V5 geïmplementeerd),
> `docs/specs/brandstyle-analyzer-improvement-plan.md` (fasen A–E grotendeels open),
> `docs/audits/2026-06-05-brandstyle-result-audit.md` en `docs/specs/brand-design-system.md`
> (Pad C). Waar overlap bestaat wordt ernaar verwezen in plaats van herhaald.

---

## 1. Onderzoek A — hoe de Claude Design-bibliotheek is opgebouwd

Bron: `docs/experiments/DTS Ede Design System/` — door Claude Design gegenereerd uit
`uploads/dts-ede-brand-book-2026-05-19.pdf` (Branddock brand-kit-export, 28 p.) plus verificatie
tegen de live site dtsede.nl. Aangevuld met de architectuur van claude.ai/design zelf
(design-system-projecten, `/design-sync`, preview-cards met render-checks).

### 1.1 Anatomie van de bibliotheek

```
README.md              ← merkboek-digest voor MENSEN: voice, visual foundations, iconografie
SKILL.md               ← manifest voor AGENTS: quick facts, harde regels, geflagde substituties
colors_and_type.css    ← werkende tokens: raw palette → semantische rollen, @font-face
fonts/                 ← gelicenseerde brand-fonts (volledige weight-ladder)
assets/                ← logo (crest, 200×200)
preview/               ← 17 zelfstandige HTML-specimen-kaarten (colors / type / spacing /
                          radii-shadows / buttons / form / badges / voice / imagery / logo / …)
ui_kits/website/       ← het merk toegepast op échte componenten, geverifieerd tegen de
                          live site (echte navigatie, echte headlines van mei 2026)
```

### 1.2 Wat deze opbouw structureel beter doet dan onze brandstyle

| # | Patroon | Wat Claude Design doet | Wat Branddock nu doet |
|---|---|---|---|
| 1 | **Tweeledig publiek** | Eén bron, twee representaties: README (mens) + SKILL.md (agent, direct invocabel met quick facts) | Sectie-data in DB + `brand-brief.ts`-emitter, maar geen gecureerd agent-manifest; context-injectie is een concatenatie van velden |
| 2 | **Harde regels ("never-rules")** | "Never invent accent colors", "No gradients in UI chrome", "Flat cards, no drop shadow" — verbodsregels als eersteklas onderdeel | Alleen `*Donts: String[]` vrije-tekstvelden per sectie; niets dat F-VAL of renderers afdwingbaar consumeren |
| 3 | **Provenance & geflagde substituties** | Elke aanname die niet uit het merkboek komt is expliciet gemarkeerd ("Lucide is een substitutie — vervang bij voorkeur-set") | Provenance bestaat in data (`confidence`, `detectorSource`, token-provenance sidecar) maar bereikt de gebruiker nauwelijks en de agent-context niet |
| 4 | **Twee token-lagen in werkende code** | `--dts-royal-blue` (raw) → `--bg-page`, `--fg1`, `--brand-focus-ring` (semantisch), incl. `@font-face` | `semanticTokens` JSON + emitters bestaan; geen door de gebruiker leesbare "werkende CSS"-representatie in de UI |
| 5 | **Specimens + toegepaste kit** | Preview-kaarten per groep én een UI-kit die het merk op echte content toepast — extractiefouten worden meteen zichtbaar | Swatch-grids en component-screenshots; `fixtureSamples` bestaat maar er is geen "zo ziet jouw merk er toegepast uit"-preview in de brandstyle-sectie zelf |
| 6 | **Secties die wij missen** | States (hover/press/focus/disabled), motion, backgrounds/scrims, imagery-ratio's (60/40), casing-regels, vocabulaire-do's/don'ts met échte voorbeelden van de site | `motionProfile`/`buttonProfile` worden (deels) gescrapet maar niet gerenderd als richtlijn; states/backgrounds ontbreken als sectie |
| 7 | **Grounding in werkelijkheid** | Verbatim headlines en navigatie van de live site als bewijs ("zo klinkt de toon in de praktijk") | `fixtureSamples` + `color-usage-verifier` bestaan — de grounding is er deels, maar wordt niet als bewijs bij de richtlijn getoond |

### 1.3 De bouwmethode: hoe Claude Design de bibliotheek stap voor stap construeert

Verdiepend onderzoek (2026-08-07) op basis van primaire bronnen: de officiële Anthropic-skills
(`anthropics/skills`: frontend-design, brand-guidelines, theme-factory), de volledige
`/design-sync`-skillteksten en DesignSync-tooldefinities (community-mirrors, niet door Anthropic
bevestigd maar letterlijke productprompts), het canonieke DESIGN.md-formaat
(VoltAgent/awesome-design-md) en support.claude.com-artikelen. De methode in zeven principes:

**M1. Bronhiërarchie: "pick the source closest to shipped code".** Code > Figma > screenshots >
brand-PDF; één bron volstaat om te starten, combineren maakt het rijker. Bij een repo geldt een
verplichte volgorde: éérst theme-/token-bestanden (`tokens.css`, `_variables.scss`), dan
componenten, dan globale stylesheets — met de doctrine *"lift exact values — hex codes, spacing
scales, font stacks, border radii"* en een expliciet verbod om uit trainingsgeheugen te bouwen.
Alleen bij lacunes mag geharmoniseerd worden (oklch-afgeleiden van het bestaande palet), "avoid
inventing new colors from scratch". → Branddock-vertaling: live CSS > PDF > screenshots, met
dezelfde exacte-waarden-doctrine; onze audits (verzonnen gradients, framework-kleuren als merk)
zijn precies overtredingen van dit principe.

**M2. Foundations eerst, dan componenten — in vaste groepen.** De bibliotheek wordt gelaagd
opgebouwd (kleur → typografie → spacing → componenten → brand), zichtbaar in de vaste
review-tab-groepen **Type / Colors / Spacing / Components / Brand**. Elke groep krijgt
specimen-kaarten; componenten komen pas als de foundations staan.

**M3. Plan-first, twee passen (frontend-design-skill).** Vóór er iets gebouwd wordt: een compact
tokenplan — palet als **4-6 benoemde hexwaarden**, typefaces voor **2+ rollen**, layoutconcept
als één zin + ASCII-wireframe, en één **"signature element"** waaraan het ontwerp herkenbaar is.
Dat plan wordt éérst tegen de brief gereviewd op generiekheid ("als dit het default-antwoord is
dat je voor élke vergelijkbare pagina zou geven — herzie het en zeg wat je veranderde") en pas
daarna uitgevoerd, waarbij elke kleur- en typebeslissing uit het plan wordt afgeleid. De skill
kalibreert expliciet tegen drie herkenbare "AI-looks" die als default gelden, niet als keuze.

**M4. Verificatie als eersteklas pijplijnstap.** Twee lagen: (a) een **machine-check** — headless
render van elke specimen-kaart naar een `.render-check.json` met kwaliteitstags per component
(`blank`, `thin`, `variantsIdentical`, `collapsed`, `fallbackCard`, …) die een self-heal-loop
aansturen ("fix → rebuild → re-validate, tot `bad` leeg is of 3 iteraties"); (b) een
**absolute rubric** voor menselijke/agent-beoordeling: *Styled* (tokens/fonts zichtbaar),
*Complete* (geen missende children), *Plausible* (realistische content, "never foo/test").
In de app draait een aparte verifier-subagent na elke oplevering — "silent on pass". De mens
blijft de final oracle via de review-tab: kaarten hebben status
`needs-review / approved / changes-requested`, en **her-registratie reset de reviewstatus**.

**M5. Radicale eerlijkheid over gaten.** Wat niet geëxtraheerd kon worden wordt nooit verdoezeld:
een **"Known Gaps"-sectie** in het manifest, **"floor cards"** voor niet-geauthorde previews
("honest, not broken"), placeholder boven fake ("a placeholder is better than a bad attempt at
the real thing" — maar nooit dummy-content om een ontwerp te vullen), en **substituties alleen
met expliciete user-OK, vastgelegd in NOTES.md** (`[FONT_MISSING]` is "action required, not a
footnote"). Regels die niet verifieerbaar bestaan zijn erger dan geen regels: "a conventions
file that names things which don't exist is worse than none".

**M6. Token + regel + rationale in één document.** Het DESIGN.md-formaat combineert een
machine-laag (YAML front matter: ±25 benoemde kleurtokens inclusief state-varianten
`primary-active`/`primary-disabled`, typografierollen met volledige specs, `{token.refs}` in
component-definities — nooit inline hex) met een mens-laag in vaste volgorde (Overview → Colors →
Typography → Layout → Elevation → Shapes → Components → **Do's & Don'ts** → Responsive →
**Iteration Guide** → **Known Gaps**). De Iteration Guide bevat instructies áán de agent
("Focus on ONE component at a time", "Never document hover — default and active only") en harde
merkregels in memorabele formuleringen ("Cream + coral + dark navy is the trinity. Don't
introduce a fourth surface tone"). Het *waarom* staat naast het *wat*, zodat de agent ook
on-system blijft in gevallen die de tokens niet dekken.

**M7. Incrementele sync met hash-anker, nooit wholesale.** `/design-sync` synchroniseert
"one component at a time, never as a wholesale replace": een `_ds_sync.json` met content-hashes
bepaalt wat gewijzigd is; ongewijzigde componenten worden overgeslagen; uploads volgen een
atomair patroon ("sentinel first, anchor last" — het anker mag alleen instaan voor een volledig
toegepaste staat); een expliciete plan-grens (`finalize_plan`) laat de gebruiker één keer de
exacte set wijzigingen goedkeuren. Elk artefact heeft één consument: runtime-bundle voor de
renderer, stijl-closure voor de look, `.d.ts` als API-contract, prompt-referentie voor de agent,
previewkaart (met `@dsCard`-marker) voor de mens. Flankerend beveiligingsprincipe: opgehaalde
bestanden en webcontent zijn **data, geen instructies**.

## 2. Onderzoek B — hoe andere applicaties dit doen

Volledige bevindingen + bronnen: zie de bronnenlijst onderaan. De overdraagbare kern:

**Brand asset management (Frontify, Bynder, Brandfolder)**
- Blok-gebaseerde guides: secties zijn samenstelbare content-blokken (kleurblok, typeblok,
  **Do & Don't-blok** met titel + beschrijving + visueel voorbeeld), tot 4 navigatieniveaus.
- Assets dragen hun regels bij zich (logo = bestand + clear space + minimumformaat + verboden
  gebruik); wijzigt de asset, dan wijzigt de guide mee.
- Quick-downloads/entry-points bovenaan: de meeste bezoekers komen voor één ding (hex kopiëren,
  logo downloaden).
- Frontify positioneert zich inmiddels expliciet op **machine-leesbare brand governance** —
  guidelines die agents kunnen lezen en afdwingen.

**Design tokens (W3C DTCG, Figma, Supernova, Specify, Project Wallace)**
- DTCG-spec is sinds oktober 2025 **stabiel**: `$value`/`$type`/`$description`, met drie tiers
  primitive → semantic → component en aliassen daartussen.
- Figma-variables-patroon: collections + **modes** (light/dark, density, multi-brand) als dimensie
  in het datamodel, niet als aparte guide.
- Specify's mentale model: **sources → single source of truth → destinations**. Voor Branddock:
  scrape/PDF/assets = sources, styleguide = truth, AI-calls/exports/Brandclaw = destinations.
- Project Wallace parseert CSS deterministisch naar DTCG-tokens **met frequentietellingen** —
  een bewijspijler naast LLM-interpretatie.

**AI brand-kit tools (Canva, Brandfetch, Adobe Express, Looka, Relume)**
- Canva Brand Kit Builder: extractie uit URL/PDF is een **head start, nooit een eindstation** —
  elke sectie blijft reviewbaar/bewerkbaar (ons kalibratie-paneel + review-flow zit al op deze lijn).
- Brandfetch-rollenschema als de-facto-norm: logo `type × theme × formats[]`, kleur
  `hex + rol (brand/accent/dark/light) + brightness`, font `name + rol (title/body) + origin +
  weights[]`. Positionering: "the brand layer for products **and AI agents**".
- Relume: geëxtraheerde stijl wordt **direct toegepast op een voorbeeldpagina** getoond
  ("Design View") — fouten zijn meteen zichtbaar.

**Best practices levende brand guides**
- Canonieke secties: fundament, logo, kleur (mét gebruiksratio's ~60-30-10 en WCAG-paren),
  typografie, spacing/grid, imagery (goed- én afgekeurde voorbeelden), iconografie, **motion**,
  voice & tone, applicaties/do's & don'ts.
- De AI-les van 2025-2026: 95% van bedrijven heeft guidelines, 81% worstelt met off-brand
  content — omdat guidelines voor mensen zijn geschreven. De beweging is naar **uitvoerbare
  constraints** ("zinnen < 20 woorden, geen passief") in plaats van vage kwalificaties
  ("onze voice is conversational"). Dat is exact de brug naar F-VAL's rules-pijler (20%).

## 3. Gap-analyse — waar de brandstyle-sectie nu staat

Sterk (en behouden): de extractie-pijplijn is diep (14,5k regels, 4 AI-fasen, vision,
usage-verificatie), er is een snapshot/diff-systeem, per-sectie review + kalibratie-paneel
(#344), een canonical model met 7 export-emitters (incl. DTCG en brand-brief), en sinds de
governed token layer (V1–V5) token-provenance in de data-laag.

De gaps, gerangschikt naar de onderzoekslessen:

| Gap | Bewijs |
|---|---|
| **G1. Geen agent-manifest.** De styleguide is data, geen gecureerd "zo ontwerp je met dit merk"-document. Context-injectie (`brand-context.ts:1272-1472`) concateneert velden; harde regels, quick facts en substituties ontbreken. | DTS `SKILL.md` vs `ai-context/route.ts` |
| **G2. Do's & don'ts zijn tweederangs.** Vrije-tekst `String[]` per sectie; geen structuur (titel/beschrijving/visueel voorbeeld/afdwingbare regel), geen doorvoer naar F-VAL of renderers. | `schema.prisma:1797-1976` `*Donts`-velden |
| **G3. Provenance stopt bij de data-laag.** `confidence`/`detectorSource`/token-provenance bereiken UI-badges en agent-context niet; "observed vs recommended" is alleen een prefix-marker die vóór injectie wordt gestript (`analyzer-markers.ts`). | governed-token-layer-verbeterplan §1; `brand-context.ts:26` |
| **G4. Ontbrekende secties**: states (hover/focus/disabled), motion als richtlijn, backgrounds/scrims, kleur-gebruiksratio's. Data is er deels (`motionProfile`, `buttonProfile`, `observedColorPairs`) maar wordt niet als richtlijn gerenderd of geïnjecteerd. | analyzer-improvement-plan fasen A3/A4/C open |
| **G5. Geen toegepaste preview.** Swatches en losse component-screenshots, maar geen "jouw merk op een voorbeeldpagina"-view in de brandstyle-sectie; extractiefouten blijven abstract. | Relume/DTS-patroon; `fixtureSamples` ongebruikt in brandstyle-UI |
| **G6. Re-scrape is destructief op scriptniveau.** `rescrape-brand.ts:44-48` wist het record incl. reviews/edits; de engine kan inmiddels partial-upsert met `*Override`-bescherming, maar het script en de UX ("levende guide" met drift-melding) benutten dat niet. | `scripts/rescrape-brand.ts`; snapshots bestaan wél |
| **G7. Ingest is single-shot.** URL óf PDF; losse assets (logo-upload, fonts) bestaan, maar screenshots/extra bronnen verrijken het systeem niet incrementeel zoals bij Claude Design/Canva. | `analyze/url` + `analyze/pdf` routes |
| **G8. Zware extractie staat default uit.** Alle 6 `BRANDSTYLE_*`-flags default uit én ontbreken in `.env.example` — een out-of-the-box analyse draait zonder multi-page, headless, screenshots en vision. | `analysis-engine.ts`; gotchas |
| **G9. Publish zonder gate.** `finalize/route.ts:13-15` publiceert expliciet zonder completeness-check en wist reviews; de publish-gate in `brand-context.ts` maakt de kwaliteit van dat moment dus bepalend voor álle AI-output. | code-observatie |

## 4. Verbeterplan

Vijf werkstromen, geordend op leverage. W1 is de keystone (zelfde rol als provenance in het
governed-token-plan): de andere stromen leveren er hun output aan.

### W1 — Brand Manifest: één gecureerd, tweeledig eindproduct *(keystone)*

Het DTS-patroon naar Branddock brengen: elke workspace-styleguide produceert naast de secties
een **Brand Manifest** — één gegenereerd, door de gebruiker te cureren document in twee
representaties uit dezelfde bron:

1. **Mens**: een "README"-achtige digest-view (nieuwe tab of vervanging van de Design System-tab):
   quick facts-tabel, per sectie de richtlijn mét bewijs (verbatim voorbeelden van de site,
   frequenties), harde regels prominent.
2. **Agent**: een SKILL.md-achtig manifest dat `getBrandContext` als primaire bron injecteert:
   quick facts, harde regels, geflagde substituties/onzekerheden (uit provenance), semantische
   tokens, vocabulaire. De bestaande `brand-brief.ts`-emitter is het startpunt maar wordt
   gepromoveerd van export-optie naar kern-artefact met eigen DB-veld + regeneratie bij
   sectie-wijziging.

- **Scope**: nieuw veld `BrandStyleguide.brandManifest Json?` (+ `manifestGeneratedAt`),
  generator in `src/lib/brandstyle/manifest-builder.ts` (deterministische assemblage uit
  bestaande velden — géén extra AI-call nodig voor v1), injectie in `brand-context.ts` (manifest
  eerst, veld-concatenatie als fallback), digest-view in de brandstyle-UI.
- **Formaat-conventies** (naar DESIGN.md-model, §1.3 M5/M6): token + regel + *rationale* in één
  document; state-token-varianten (`primary-active`, `primary-disabled`) waar geobserveerd; een
  **Iteration Guide**-blok met instructies aan de consumerende agent; en een verplichte
  **Known Gaps**-sectie die eerlijk benoemt wat niet geëxtraheerd is (voedt tegelijk het
  kalibratie-paneel). Alleen regels opnemen die verifieerbaar uit data komen — "a conventions
  file that names things which don't exist is worse than none".
- **Acceptatie**: voor een geanalyseerde workspace bevat de AI-context een manifest met ≥1 harde
  regel, quick facts en ≥1 provenance-vlag; `ai-context/route.ts` toont hetzelfde document dat
  de gebruiker in de digest-tab ziet ("what you see is what the AI gets").
- **Effort**: ~4-6 dagen. **Out-of-scope**: nieuwe extractie.

### W2 — Harde regels & Do/Don'ts als eersteklas datatype

- Nieuw model `StyleguideRule` (per sectie): `kind: DO | DONT | HARD_RULE`, titel, beschrijving,
  optioneel visueel voorbeeld (asset-ref), optioneel **afdwingbare constraint** (gestructureerd:
  bv. `{ property: 'gradient', allowed: false }` of een testbare tekstregel), `source:
  observed | recommended | user`. Migratie: bestaande `*Donts`-arrays worden geïmporteerd als
  `DONT`-records met `source: observed`.
- AI-fase 3 (Design Language) en de Visual Language-analyzer krijgen de opdracht om per vage
  kwalificatie 2-3 concrete, testbare regels mee te genereren (de "operationaliseer vaagheid"-les).
- Doorvoer: harde regels → W1-manifest → F-VAL rules-pijler (20%) en de Puck-renderers
  (bv. `gradients: false` betekent écht geen gradient in gegenereerde LP's).
- **Acceptatie**: een regel "geen ronde hoeken" op een testworkspace resulteert aantoonbaar in
  radius 0 in een gegenereerde landing-page én een F-VAL-deduction bij overtreding.
- **Effort**: ~5-8 dagen (schema + migratie + prompt-uitbreiding + F-VAL-koppeling).

### W3 — Provenance & bewijs zichtbaar (UI + agent)

- Badges in alle sectie-UI's: `observed` (met bewijs: "button-bg 3×", pixel-verificatie,
  frequentie) / `recommended` (AI-suggestie) / `user` (override — heilig). De data bestaat
  (`confidence`, `detectorSource`, token-provenance, `usageEvidence`) — dit is doorverbinden,
  geen nieuwe extractie.
- In het W1-manifest: substituties/onzekerheden expliciet ("Icon-set is een aanname — merk
  specificeert er geen"), naar DTS-voorbeeld. Substituties (bv. font-vervanger wanneer het
  merkfont commercieel is) worden pas definitief na expliciete user-bevestiging en blijven
  daarna als `user`-provenance bewaard — het `[FONT_MISSING]`-patroon uit §1.3 M5: "action
  required, not a footnote".
- Kleur-gebruiksratio's afleiden uit bestaande frequentie-/usage-data (`observedColorPairs`,
  usage-verifier) en als richtlijn tonen ("~60% surface, ~30% secundair, ~10% accent").
- **Acceptatie**: Zwarthout-workspace toont geen enkele "recommended" waarde meer als feit;
  de gradient-inventie uit de result-audit (§6d) is als "Recommended" gebadged of gedropt.
- **Effort**: ~4-6 dagen. Overlapt bewust met result-audit fase 6d — die subfase wordt hierin
  opgelost.

### W4 — Toegepaste preview & ontbrekende secties

- **Brand Preview-tab**: de geëxtraheerde stijl live toegepast op één voorbeeldlayout
  (hero + kaarten + form + footer), gevuld met `fixtureSamples` (echte headlines/CTA's) —
  het Relume/DTS-patroon. Technisch: hergebruik van de bestaande Puck-render met BrandTokens;
  geen nieuwe render-engine.
- Nieuwe richtlijn-secties uit bestaande/geplande data: **States** (uit `buttonProfile`
  hover/active), **Motion** (uit `motionProfile`, analyzer-plan fase A4), **Backgrounds &
  overlays**. Render als richtlijntekst + specimen, naar DTS-voorbeeld.
- Specimen-kaarten per sectie (zelfstandige previews i.p.v. alleen swatches) — herbruikbaar
  in de PDF-export (`buildCompositeBrandPdf`).
- **Machine-validatie van specimens** (§1.3 M4): render elke specimen-kaart headless en toets op
  de render-check-tags (`blank`, `thin`, `variantsIdentical`) vóór tonen; een kaart die niet
  door de check komt wordt een eerlijke "floor card" ("preview nog niet beschikbaar") in plaats
  van een kapotte of misleidende preview. Beoordelingsrubric voor de vision-enricher:
  *Styled / Complete / Plausible* (realistische content uit `fixtureSamples`, nooit lorem).
- **Reviewstatus-reset**: wanneer een sectie door re-analyse inhoudelijk wijzigt, gaat de
  bijbehorende `StyleguideReview` terug naar `PENDING` (het her-registratie-patroon uit de
  Claude Design review-tab) — een goedkeuring hoort bij een specifieke versie van de data.
- **Acceptatie**: na analyse van een nieuwe workspace toont de Preview-tab binnen dezelfde flow
  een herkenbare merkpagina; een extractiefout (verkeerde primary) is daar in één oogopslag
  zichtbaar.
- **Effort**: ~6-9 dagen. Afhankelijkheid: analyzer-plan fasen A3/A4 voor volle diepte, maar
  v1 kan op al-gescrapete profielen draaien.

### W5 — Levende bibliotheek: incrementele ingest & niet-destructieve refresh

- `rescrape-brand.ts` vervangen door een **refresh-pad** dat de bestaande partial-upsert +
  `*Override`-bescherming gebruikt en altijd eerst een snapshot maakt; destructief wissen wordt
  een expliciete `--hard`-vlag.
- **Drift-detectie**: periodieke (of on-demand) re-scrape → snapshot-diff → melding in het
  kalibratie-paneel ("website is veranderd: 2 kleuren wijken af van de styleguide").
- **Incrementele bronnen**: een tweede bron (PDF na URL, screenshot-upload, extra pagina)
  verrijkt het bestaande systeem i.p.v. het te vervangen — het Claude Design-ingestmodel, met
  de bronhiërarchie uit §1.3 M1 (live CSS > brand-PDF > screenshots) als conflictregel bij
  merge. v1-scope: PDF-analyse mag een bestaande URL-analyse aanvullen (merge per sectie met
  provenance-stempel) i.p.v. de huidige óf-óf.
- **Hash-anker voor incrementaliteit**: `BrandstyleSnapshot.tokensHash`/`scrapeHash` bestaan al
  en doen hash-dedupe; promoveer ze tot sync-anker naar §1.3 M7 — per sectie bepalen wat écht
  gewijzigd is, alleen dat updaten (en alleen dáár de reviewstatus resetten), en de snapshot
  pas wegschrijven als de volledige update is toegepast ("anchor last").
- Flankerend: de 6 `BRANDSTYLE_*`-flags documenteren in `.env.example` en de aanbevolen set
  default aan (kost/latency-afweging per flag expliciet maken); `finalize` krijgt een zachte
  gate (waarschuwing bij kritieke kalibratie-issues, geen harde blokkade).
- **Acceptatie**: re-scrape van een workspace met user-edits behoudt alle overrides en reviews;
  een gewijzigde site-primary levert een zichtbare drift-melding op.
- **Effort**: ~5-8 dagen.

### Volgorde & samenhang

```
W1 Manifest ──────────► injectie + digest (keystone, eerst)
W2 Regels ────┐
W3 Provenance ┼──────► voeden het manifest en F-VAL
W4 Preview ───┘
W5 Levend systeem ───► houdt alles actueel (parallel aan W2-W4 te starten)
```

Aanbevolen eerste sprint: **W1 + W3** (samen ~2 weken) — grootste zichtbare kwaliteitssprong
voor zowel gebruiker als AI-output, zonder nieuwe extractie-risico's. W2 daarna (raakt F-VAL),
W4/W5 parallel of erna. De open fasen uit het analyzer-improvement-plan (A2-A4, C, D) blijven
het extractie-spoor; dit plan is het curatie-/presentatie-/consumptie-spoor daarbovenop.

### Doorkijkje naar het render-spoor (Pad C / LP-fidelity)

Buiten de scope van dit plan, maar één methodisch inzicht uit §1.3 M3 verdient een plek in het
render-spoor: het "elke RULER+MINIMAL-workspace ziet er identiek uit"-probleem
(analyzer-improvement-plan §1) is exact wat de frontend-design-skill bestrijdt met **plan-first +
anti-default-kalibratie**: eerst een compact, merk-specifiek tokenplan (benoemde kleuren,
typerollen, wireframe, één signature element), dat plan expliciet toetsen op "zou ik dit voor
élk vergelijkbaar merk genereren?", en pas dan renderen — waarbij elke beslissing uit het plan
komt in plaats van uit een archetype-preset. Dat patroon (plan → generiekheids-check → build)
is direct inzetbaar in de LP-generatie- en auto-iterate-flow en sluit aan op F-VAL als
critique-stap.

### Expliciet out-of-scope

- Multi-brand modes / sub-brand-theming (Figma-modes-patroon) — waardevol voor agencies,
  maar pas na de basis; apart idea-draft waard.
- Publieke deel-/portal-functionaliteit (Frontify-portal) — post-launch.
- Volledige Storybook-achtige componentdocumentatie — het `StyleguideComponent`-model volstaat
  voorlopig.
- De Voiceguide-mirror gelijktrekken (review/snapshot/lock ontbreken daar) — bekend, apart.

## 5. Bronnen

**Intern**: `docs/experiments/DTS Ede Design System/` (README.md, SKILL.md, colors_and_type.css,
preview/, ui_kits/) · `docs/audits/2026-06-05-brandstyle-result-audit.md` ·
`docs/audits/2026-06-06-governed-token-layer-verbeterplan.md` ·
`docs/specs/brandstyle-analyzer-improvement-plan.md` · `docs/specs/brand-design-system.md` ·
`docs/design-system-export.md` · `gotchas.md` (brandstyle-entries).

**Extern** (selectie; volledige lijst in het onderzoeksrapport van 2026-08-07):
- Claude Design-methode (§1.3): github.com/anthropics/skills (frontend-design,
  brand-guidelines, theme-factory — officieel) · Piebald-AI/claude-code-system-prompts
  (/design-sync-skillteksten + DesignSync/ClaudeDesign-tooldefinities — community-mirror van
  productprompts, niet door Anthropic bevestigd) · elder-plinius/CL4R1T4S
  (Claude Design-systeemprompt — idem) · VoltAgent/awesome-design-md (canoniek
  DESIGN.md-voorbeeld) · getdesign.md · designsystemscollective.com walkthroughs
- Claude Design algemeen: anthropic.com/news/claude-design-anthropic-labs · support.claude.com
  "Set up your design system in Claude Design" · explainx.ai design-sync-update
- BAM: help.frontify.com (structure, sections, Do & Don't-block) · frontify.com/en/blog/
  the-future-of-brand-governance-is-machine-readable · bynder.com/en/guides/guide-to-brand-guidelines
- Tokens: w3.org/community/design-tokens (stabiele DTCG-spec 2025-10-28) · Figma variables
  playbooks · specifyapp.com · projectwallace.com/design-tokens
- AI brand kits: canva.com/help/brand-kit-builder · docs.brandfetch.com/brand-api ·
  relume.ai/style-guide · helpx.adobe.com (Express brand kits) · looka.com/brand-kit
- AI-leesbare guidelines: brandcontextprotocol.com · sameness.co/blog/why-brand-guidelines-unreadable-ai
