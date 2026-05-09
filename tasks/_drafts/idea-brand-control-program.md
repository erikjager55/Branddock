---
id: brand-control-program
title: Brand Control Program — review-side capabilities + Strategy Analyst foundation
status: pending-tech
created: 2026-05-08
verdict: ready-to-build
scope: Multi-phase program (4 fasen + 4 kritieke voorlopers). Tech-planner promotion per fase, niet als één task. Pre-launch hard.
blocked-by: -
program-effort: 10-14 weken wall-clock pre-launch (49-68 werkdagen totaal, parallelisatie meegerekend)
related-research: deze sessie 2026-05-08 (audit + multilingual research + architectuur)
---

# Probleemstelling (1 zin)

Branddock kan vandaag uitsluitend **proactief** on-brand content produceren maar niet **reactief** bestaande tekst beoordelen — daarmee mist het platform pre-launch QC, audit-functionaliteit, onboarding-feedback voor externe content-makers, en de data-foundation voor de Brandclaw Strategy Analyst-node.

# Scope

**Multi-phase pre-launch programma**, één coherent geheel met vier fasen die individueel shippable zijn maar gezamenlijke architectuur delen. F-VAL wordt uitgebreid van content-generatie-engine naar generieke content-review-engine; Brand Alignment wordt umbrella-UI; Brand Assistant + PublishGate worden secundaire ingest-surfaces; Strategy Analyst-stub krijgt agent-architectuur die toekomstige Brandclaw-nodes (Campaign Builder, Measurement, Optimization) plug-and-play uitbreidt.

**Uitbreiding van pre-launch scope**: vandaag is pre-launch gedefinieerd als "content-flow blocker-vrij + observability live". Dit programma herdefinieert pre-launch naar "Branddock is een **brand-control instrument**, niet alleen een content-creatie tool" — een strategische product-positioneringskeuze die de pilot-start ±10 weken later legt maar de differentiator verstevigt waar Better Brands op gaat oordelen.

# WHO — Doelgebruiker

**Drie persona's, één feature-set**:

| Persona | Use-case binnen programma | Primaire surface |
|---|---|---|
| Brand strategist (intern of agency-zijde) | **Pre-launch QC** — laatste check vóór publicatie | Content Canvas → PublishGate (Δ-4) |
| Content-eigenaar | **Audit** — bestaande content (eigen site, e-mails, social-archief) doorlichten op drift | Brand Alignment Tab 3 — Content Review (Δ-1) |
| Onboardende content-maker (intern of freelance) | **Onboarding-feedback** — eerste werk laten beoordelen, gestructureerde feedback krijgen | Brand Assistant chat → `review_content` tool (Δ-1) |

**Schaal**: pilot-pipeline (Better Brands, Linfi, Nobox, WRA Juristen) = 4 workspaces voor smoke. Founder dogfooding levert N=1 voor Δ-1 vóór pilot-rollout.

**Acuut segment**: Better Brands eerst — heeft volledige `BrandVoiceguide` + `BrandPersonality` + `FidelityConfig STRICT`-mode; F-VAL pijler 1 levert Δ+24 punten met semantic centroid. Concrete demo-claim (Branddock vs vanille GPT-4o gap) is gevalideerd voor BB content.

## JTBD-narratief

> "Toen ik [pre-launch QC] een blog-post wilde controleren op brand-voice afwijkingen vóór publicatie, wilde ik gestructureerde feedback met locatie + ernst + voor/na-suggestie krijgen, maar Branddock had geen review-flow voor mijn al-geschreven tekst — F-VAL draait alleen tijdens generatie."

> "Toen ik [audit] de homepage van een acquisitie-doelwit wilde doorlichten op brand-drift over de laatste twee jaar, wilde ik per-pagina vlaggen + thematische samenvatting, maar moest ik tekst handmatig kopiëren naar ChatGPT en met losse prompts werken — geen historie, geen merk-baseline, geen severity-scoring."

> "Toen ik [onboarding] een freelance copywriter z'n eerste drie posts liet schrijven, wilde ik concrete feedback teruggeven die niet subjectief klinkt, maar moest zelf leessessies organiseren en commentaren in Google Docs zetten — niet schaalbaar over 5+ content-makers."

## Evidence

- **Methodology-document 2026-05-08** (deze sessie) — extern document met gestructureerde brand-review werkwijze die Branddock vandaag niet ondersteunt
- **F-VAL bestaande implementatie** — `src/lib/brand-fidelity/` heeft 3-pijler scoring maar wordt alleen aangeroepen vanuit content-generation-flow
- **Brand Alignment bestaande UI** — `src/features/brand-alignment/` + `src/components/brand-alignment/BrandAlignmentPage.tsx` heeft umbrella-surface (2 tabs: Internal Scan + Brand Audit) waarop een derde tab (Content Review) natuurlijk landt
- **`docs/changelog.md` BV-WIRE entries** — semantic centroid-pad in F-VAL Pillar 1 toonde Δ+24 punten regression voor Better Brands (entry #218 e.v.)
- **Online research 2026-05-08** (deze sessie) — geciteerde bronnen: Plain English Campaign A-Z, Onze Taal modern-taalgebruik, Schrijfvis 21-schrap-woorden, Werf& jeukwoorden, Hohenheimer Verständlichkeitsindex, Karrierebibel Floskeln 40 Beispiele, ZigZag HR + Robert Walters BE, Wikipedia Signs of AI Writing — totaal ~25 authoritative bronnen voor heuristiek-pakketten
- **Geen pilot-klant heeft hier expliciet om gevraagd** — eerlijk: dit is product-positionering-gedreven, niet ticket-gedreven

# WHAT — Probleem (niet oplossing)

De methodology beschrijft een review-flow met drie principes (lees-vanaf-bron, expliciete-baseline, vlag-met-suggestie) en levert output in een vast format (samenvatting + bevindingen-tabel + voor/na voor top-issues). Branddock heeft de scoring-engine (F-VAL), de baseline-data (BrandVoiceguide), de heuristiek-infrastructuur (BrandRule-tabel + Pijler 3), maar geen ingest-flow voor externe tekst, geen bevindingen-tabel-output (alleen composite-score), geen heuristiek-pakketten per taal (alleen 12 spam-phrases), geen samengeperste voice-werkkader-view, geen second-opinion in PublishGate, en geen data-foundation voor de Strategy Analyst-node die deze data straks moet aggregeren.

**Vier afzonderlijke gaten** vormen samen één coherent gat: zonder review-output-schema kan Δ-1 niet shippen; zonder taal-routering kan Δ-2 niet shippen voor pilot-mix (Linfi NL, hypothetische BE/DE-klanten); zonder voice-werkkader produceren prompts losse-velden-rommel; zonder second-opinion vertrouwt PublishGate op één numeriek signaal met blind-spots; zonder data-collection-foundation moet Analyst-node ad-hoc joins maken die niet schaalbaar zijn naar Campaign Builder/Measurement.

# WHY-NOW

Geen scherpe externe deadline-trigger. Drijfveer: **strategische product-positioneringskeuze** vóór pilot-livegang. Better Brands wordt eerste echte klant — als zij Branddock zien als "AI content-generator met scoring" verschilt het positioneel weinig van Jasper/Copy.ai/Writer; als zij het zien als "brand-control instrument met generatie + review + audit + drift-detection", versterkt dat de premium-positionering die Brandclaw-roadmap (autonomous marketing-loop) later verzilvert.

Triggers:
- Founder ervaart de review-side-pijn deze sessie tijdens methodology-evaluatie — concrete dogfood-validatie
- Pre-launch fase loopt door tot vercel-deployment + pilot-onboarding-better-brands; tijdvenster om scope te verbreden voordat externe klant z'n eerste indruk krijgt
- Brandclaw Strategy Analyst stond op maand 3-4 post-launch — robuuste agent-architectuur nu bouwen voorkomt dat we maand 3 een ad-hoc view-laag bouwen die later weer afgebroken moet
- Multilingual-pilots (BE, DE) zijn theoretisch mogelijk in launch-fase; zonder taal-routering nu = drempel om die markten te benaderen

Niet-trigger:
- Geen pilot-klant heeft expliciet om review-feature gevraagd
- Geen revenue-impact aantoonbaar pre-launch
- Vercel-deployment + Stripe-billing zijn niet door dit programma versneld

# SUCCESS METRICS

**Primaire metric** (één): **% van pilot-content dat een gebruiker zonder edits naar publicatie doorzet** — stijgt met minimaal **20 procentpunt** binnen 60 dagen na livegang van Δ-1 + Δ-4 in vergelijking met huidige PublishGate-baseline. Meting via bestaande PostHog `content_published` event + nieuwe events `brand_review_marked_ready`, `publish_gate_overridden`, `publish_gate_passed`.

**Secundaire metric** (richtinggevend, niet hard): aantal externe content-reviews per workspace per week (Δ-1 audit-use-case adoptie) — doel ≥3 reviews/week voor Better Brands binnen eerste 30 dagen.

**Counter-metric** (mag NIET kapotgaan): generation-flow latency. Δ-2 + Δ-3 + Δ-4 raken F-VAL judge-prompt; uitbreidingen mogen p95-latency van content-generation niet meer dan 15% verhogen. Meting via bestaande Sentry/PostHog observability.

**Counter-metric** (kosten): Anthropic API-cost per content-publish stijgt door Δ-4 second-opinion. Doel: ≤2× pre-Δ-4 cost (één extra judge-call). Meting via OpenAI/Anthropic cost-tracking dashboards die opgeleverd worden in `learning-loop-dashboard-usage` (synergistic post-launch task).

# CONSTRAINTS

## Hard
- **Tijd**: 10-14 weken wall-clock pre-launch. Vercel-deployment + Stripe-billing-live + pilot-onboarding-better-brands schuiven door met dezelfde duur — pilot-start verplaatst van "+/- nu" naar "+10-14 weken"
- **Tech (F-VAL backwards-compat)**: `ContentFidelityScore` numeric-contract moet werken voor alle bestaande consumers (PublishGate, fidelity-runner.ts, learning-loop). Schema-uitbreiding additief, geen breaking changes
- **Tech (BrandRule-tabel)**: heuristiek-pakketten worden via bestaande `brand-rule-sync.ts` engine + per-language seed-route in Prisma getrokken; geen tweede paralleel rule-systeem
- **Tech (locale)**: BE-routing kan niet via `Workspace.contentLanguage` alleen — er bestaat geen `be` of `nl-BE`-waarde vandaag. Schema-uitbreiding nodig óf per-workspace `BrandVoiceguide.contentLocale` veld
- **Data (Brandclaw foundation)**: Strategy Analyst stub vereist immutable-snapshot-discipline. Bestaande Branddock-modellen muteren live; observation-input moet via `DataSnapshot`-laag die point-in-time leesbaar is
- **Legal/privacy**: paste-in content kan klant-data of confidentiële tekst bevatten. F-VAL judge-prompt naar Anthropic stuurt content; reviewlog-persistence mag niet langer dan 90 dagen tenzij workspace expliciet retention-toggle aan zet (privacy-toggle in workspace settings — bestaat dit al? — verifiëren in Phase 0)

## Soft
- Solo-dev capaciteit; parallelisatie vereist worktrees + DB-isolatie + port-isolatie (zie `tasks/_README.md`)
- Founder-bias: programma is N=1 founder-gevalideerd; pilot-klant kan andere prio hebben — mitigatie via fase-1 smoke met Better Brands voor Δ-1 + Δ-4
- Cost-budget: 4 talen × 5 categorieën × ~30-60 entries = ~600 BrandRule-seeds. Online research is gedaan, native review niet (per user-keuze 2026-05-08) — false-positive risico geaccepteerd, mitigatie via pilot-feedback in eerste 30 dagen

## Must NOT do
- F-VAL output-schema breken (numeric composite-score moet blijven werken)
- Strategy Analyst autonomy/actuation in stub-versie (alleen read+suggest, geen apply-knop)
- BE/DE-pakketten productie zonder smoke-test op echte BE/DE-content (mitigatie via 2 referentie-stukken per taal in Phase 1)
- Pilot-onboarding-better-brands starten vóór programma af is (anders ervaart eerste klant Branddock zonder de differentiator die dit programma juist levert — strategische keuze van user)
- Data-collection-foundation bouwen zónder ADR (raakt Brandclaw-loop architectuur, vereist expliciete documentatie)

# SCOPE

## In-Scope (programma)

**Phase 0 — Foundation** (3-5 dagen, must land first)
- `tech-debt-any-types` — 91 resterende `: any` in API/hooks opruimen vóór schema-uitbreiding (L2 auto-mode kandidaat)
- `claw-page-awareness` — pageContext + `inspect_current_entity` + `fill_form_fields` voor Brand Assistant chat-integratie van Δ-1

**Phase 1 — F-VAL extension** (8-11 dagen, parallelliseerbaar tot ~7d wall-clock)
- `bv-wire-w1-full-centroid` — semantic centroid switch in F-VAL Pijler 1 (4-6u, harness staat klaar)
- **Δ-2 Heuristiek-pakketten NL/EN/BE/DE** — directory `src/lib/brand-fidelity/heuristics/<lang>/` met 5 categorieën per taal (corporate-fluff, superlatieven, vulwoorden, vage-kwaliteitsclaims, riskante-comparatieven) + EN AI-tells als zesde categorie. ~600 entries totaal met provenance-tag per entry. Routing via `BrandVoiceguide.contentLocale` (nieuw veld; null = workspace-fallback)
- **Δ-3 Voice Baseline 1-pager** — afgeleide view uit `BrandVoiceguide` (3-5 voice-attributen op spectrum, top-10 preferred + avoid termen, 3 style-rules), zichtbaar in Brand Alignment header + geïnjecteerd in F-VAL judge-prompts + Strategy Analyst-context

**Phase 2 — Review surfaces** (13-17 dagen, parallelliseerbaar tot ~10d wall-clock)
- **Δ-1 Content Review** — drie ingest-surfaces, één engine:
  - Brand Alignment Tab 3 (paste-in tekst / URL / .docx / .pdf via `pandoc`/`unpdf`/`WebFetch`)
  - Brand Assistant chat-tool `review_content` (read-tool, geen MutationConfirmCard)
  - Bevindingen-tabel UI (severity + locatie + voor/na) + persistence in nieuwe `ContentReviewLog`-model
- **Δ-4 PublishGate second-opinion** — tweede onafhankelijke Anthropic-call zonder F-VAL-score-context; verschillen → expliciete vlag in PublishGate UI + audit-trail
- `canvas-inline-edit-overlays` — synergistische UX-glue voor Δ-4 (apply-suggestion direct in preview)

**Phase 3 — Strategy Analyst foundation** (20-27 dagen)
- `brandclaw-data-collection` — DataSource-registry + time-window queries + `DataSnapshot`-model voor immutable point-in-time inputs
- **Strategy Analyst stub (robust agent-architecture)** — Anthropic tool-use vanaf v1, `StrategyObservation`-model versioned met agentVersion + promptVersion, confidence-flag per observation, evidence-attached, geen actuation. UI als Brand Alignment Tab 4 "Insights"

## Out-of-Scope (expliciet NIET, ook al verleidelijk)

- **Strategy Analyst autonomy of actuation** — geen "Apply suggestion" knop op Insights-tab; suggesties alleen lezen, manueel handelen blijft buiten scope (Brandclaw maand 5-12)
- **Campaign Builder / Measurement / Optimization nodes** — toekomstige Brandclaw-nodes; programma legt foundation maar implementeert ze niet
- **Live re-publishing/auto-correctie** — Δ-4 vlagt afwijkingen, werkt niet zonder gebruiker-actie
- **Visuele review** (logo, kleur, layout) — methodology §12 noemt dit expliciet als aparte discipline; Brand Alignment Internal Scan + Brand Audit doen dit deels al
- **Engagement / performance-correlatie** — methodology §12 noemt; vereist publicatie + meting + bijsturing-loop, dat is Brandclaw Measurement-node post-launch maand 7-9
- **Multi-tenant cross-workspace benchmarks** — `cross-workspace-benchmarks` LATER-roadmap-item, geraakt door Strategy Analyst maar niet geïmplementeerd in stub
- **Native BE/DE content-strateeg-review van heuristiek-pakketten** — user-keuze 2026-05-08: false-positive risico geaccepteerd, post-launch pilot-feedback corrigeert
- **`weekly-report-email-via-resend` als re-review-distributie** — synergistic, blijft post-launch
- **Workspace-niveau privacy-retention-toggle voor ContentReviewLog** — zou apart privacy/DPA-werk vereisen; minimal scope = vaste 90-dagen retention, evt. workspace-toggle in Privacy/DPA later (`privacy-dpa-hooks` LATER-roadmap)
- **PWA / mobile-app voor Brand Assistant chat** — desktop-first
- **OAuth-scoped review** (LinkedIn-post review die direct via OAuth wordt opgehaald) — Channel Activation LATER-roadmap
- **Refactor van bestaand F-VAL judge-prompt** — alleen uitbreiden met heuristiek-context + bevindingen-output-schema, geen herschrijving
- **HIX-implementatie voor DE** (Hohenheimer Verständlichkeitsindex als scoring-component) — academische schaal genoemd in research; out-of-scope voor v1-pakket, mogelijk Phase 3 follow-up

> Out-of-Scope > In-Scope is een goed teken — hier is dat het geval (12 out vs 5 in-scope-blokken).

# AANNAMES

Aannames die WAAR moeten zijn voor dit programma te slagen:

- **A1 — F-VAL is uitbreidbaar tot externe content** zonder grote refactor. Bewijs: `fidelity-runner.ts` accepteert content-string + workspace-id; `contentMetadata` (brief-to-content lineage) is optioneel of moet nullable gemaakt worden. **Onbewezen — Phase 0 verificatie nodig** (lees `fidelity-runner.ts` + relevante callers, identificeer hard-aannames over generation-context).
- **A2 — Brand Assistant tool-use kan een chat-card retourneren** die een tabel rendert. Bewijs: bestaand `MutationConfirmCard`-patroon voor write-tools. **Hoogwaarschijnlijk waar** — read-tool returns volgen vermoedelijk hetzelfde patroon, te verifiëren in Phase 0.
- **A3 — Heuristiek-woordlijsten in 4 talen leveren meetbare gain in Pijler 3** zonder onaanvaardbare false-positive-rate. Bewijs: research is degelijk (25+ bronnen), drie-laagse flagging (always/context/soft) reduceert ruis, provenance-tagging maakt iteratie mogelijk. **Onbewezen — pilot-feedback in eerste 30 dagen post-Δ-2 valideert**.
- **A4 — `BrandVoiceguide` data is rijk genoeg voor de 1-pager** afleiding zonder handmatige curatie. Bewijs: BV-0/1/2/3/5 bestaan voor Better Brands; voice-attributen + wordsWeUse/Avoid + antiPatterns aanwezig. **Hoogwaarschijnlijk waar voor BB; onbewezen voor Linfi/Nobox/WRA** — Phase 1 smoke-test op alle 4 pilot-workspaces.
- **A5 — Robuste Analyst-architectuur is later additief uit te breiden** met Campaign Builder + Measurement-nodes zonder herontwerp. Bewijs: tool-use pattern is industry-standard (Anthropic + OpenAI); StrategyObservation-model is dimension-agnostisch. **Onbewezen — vereist ADR-2 om expliciet te beargumenteren**.
- **A6 — Better Brands accepteert pilot-start +10-14 weken** vergeleken met oorspronkelijk planning. **Aanname — afhankelijk van user-communicatie naar BB**. Mitigatie: parallel-track communicatie ("we voegen review-feature toe vóór livegang") of expliciete pilot-pauze tot programma af.
- **A7 — F-VAL judge-prompt-uitbreiding voor bevindingen-output** levert beter dan free-form output zonder excessieve token-cost. Bewijs: structured-output via Zod-schema werkt al in Branddock voor strategy-chain. **Hoogwaarschijnlijk waar**, te valideren in Phase 1.

> Onbewezen aannames vereisen validatie VOOR build. A1 + A4 + A6 + A7 zijn de zwaarste; A1 + A7 worden in Phase 0/1 vroeg geverifieerd, A4 valideert via Phase 1 smoke, A6 is een user-conversatie buiten dit doc.

# ACCEPTATIECRITERIA — programma-niveau

Per-fase Given/When/Then-criteria worden uitgewerkt in de respectieve `tasks/<id>.md`-bestanden door technical-planner. Programma-niveau:

- [ ] **Programma is functioneel klaar** wanneer een gebruiker (a) een blog-post kan plakken in Brand Alignment Tab 3 en bevindingen-tabel + voor/na ziet binnen 30s, (b) op Content Canvas vóór publish een second-opinion-vlag krijgt naast F-VAL composite-score, (c) in Brand Assistant chat een URL kan opgeven voor review en findings inline ziet, (d) per-taal correct geflagd wordt (NL flagt "leuk" niet, BE flagt het wel; "job" wordt geflagd in NL maar niet in BE), (e) Brand Alignment Tab 4 toont 3-5 Strategy Observations binnen 60s na trigger
- [ ] **Geen regressie**: bestaande `ContentFidelityScore` consumers werken ongewijzigd; PublishGate composite-score-gate functioneert; F-VAL latency p95 stijgt ≤15%
- [ ] **3 ADR's geschreven** vóór respectieve fase-start (zie ADR-sectie hieronder)
- [ ] **Multilingual smoke**: 1 review per taal (NL/EN/BE/DE) op echt referentiestuk, bevindingen handmatig gevalideerd door founder (geen native reviewers per user-keuze)
- [ ] **`npx tsc --noEmit`**: 0 errors over hele programma. **`npm run lint`**: 0 errors. **`npm run test:e2e --grep critical-flow`**: groen
- [ ] **Documentatie**: `docs/specs/brand-control-program.md` opgeleverd met architectuur-overzicht; `gotchas.md` aangevuld met lessons learned per fase
- [ ] **Pilot-readiness**: Better Brands content vertoont meetbare F-VAL-score-stabiliteit pre/post programma (geen onbedoelde regressie); demo-flow "review external content" werkt op BB

# ARCHITECTUUR-OVERZICHT

```
Brand Alignment (umbrella UI — bestaand, uitbreiden)
├── Tab 1: Internal Scan         ← bestaand
├── Tab 2: Brand Audit           ← bestaand
├── Tab 3: Content Review        ← Δ-1 NIEUW
│   └── Paste-in / URL / .docx / .pdf → F-VAL → bevindingen-tabel + voor/na
├── Tab 4: Insights              ← Phase 3 NIEUW (read-only Strategy Observations)
└── Voice Baseline 1-pager       ← Δ-3 NIEUW (header-component, hergebruikt overal)

Content Canvas (bestaand, uitbreiden)
└── PublishGate
    ├── Composite-score-gate     ← bestaand
    ├── Bevindingen-tabel        ← Δ-1 output-format hergebruik
    └── Second-opinion-vlag      ← Δ-4 NIEUW

Brand Assistant chat (bestaand, uitbreiden)
├── Read-tool: review_content    ← Δ-1 NIEUW (paste / URL / file)
├── Read-tool: inspect_current_entity ← claw-page-awareness (Phase 0)
└── Write-tool: fill_form_fields ← claw-page-awareness (Phase 0)

F-VAL engine (bestaand, uitbreiden — kernarchitectuur)
├── Pijler 1 (style 35%)         ← bestaand + bv-wire-w1-full-centroid
├── Pijler 2 (judge 45%)         ← bestaand + bevindingen-output-schema (Δ-1) + second-opinion-mode (Δ-4)
├── Pijler 3 (rules 20%)         ← uitbreiden met Δ-2 heuristiek-pakketten + locale-routing
└── External-content mode        ← Δ-1 nullable contentMetadata

Brandclaw foundation (NIEUW)
├── DataSource registry          ← brandclaw-data-collection
├── DataSnapshot model           ← immutable point-in-time inputs
├── Tool-orchestrator            ← shared tussen Analyst + toekomstige nodes
├── StrategyObservation model    ← versioned (agentVersion + promptVersion)
└── StrategyObservationRun       ← run-metadata (cost, latency, agent-tool-use-trace)
```

# ADR's vooraf — drie noodzakelijk

| ADR | Onderwerp | Status | Beslissingen |
|---|---|---|---|
| **ADR-1** | F-VAL output-schema-uitbreiding | ✅ Geschreven 2026-05-08 → [`docs/adr/2026-05-08-fval-output-schema-bevindingen.md`](../../docs/adr/2026-05-08-fval-output-schema-bevindingen.md) | Separate `BrandReviewFinding` Prisma-model met 1-N relation naar `ContentFidelityScore`; nullable `findingsCount`-aggregatie-veld; `FindingCategory` enum (VOICE/TERMINOLOGY/CLAIMS/STYLE/BUSINESS/AI_TELL). Backwards-compat: 7+ bestaande consumers ongewijzigd. |
| **ADR-2** | Brandclaw agent-architectuur | ✅ Geschreven 2026-05-08 → [`docs/adr/2026-05-08-brandclaw-agent-architectuur.md`](../../docs/adr/2026-05-08-brandclaw-agent-architectuur.md) | Anthropic tool-use vanaf v1, versioned `StrategyObservation` (agentVersion + promptVersion), immutable `DataSnapshot` input-laag, no-autonomy-in-stub. Schema-extension in 3 nieuwe Prisma-modellen (additief). Upgrade-pad naar Campaign Builder + Measurement + Optimization vergrendeld; alternatives A-E afgewezen incl. external orchestrators. |
| **ADR-3** | Locale-routing in Brand Voice / F-VAL | ✅ Geschreven 2026-05-08 → [`docs/adr/2026-05-08-locale-routing-brand-voice.md`](../../docs/adr/2026-05-08-locale-routing-brand-voice.md) | `BrandVoiceguide.contentLocale` (nieuw optioneel veld, IETF BCP 47: `nl-NL` / `nl-BE` / `en-GB` / `de-DE`) als source-of-truth; workspace-fallback via mapping; `nl-BE` extends `nl-NL` programmatisch maar consumeert als bevroren hard-switch unit. Resolver `getHeuristicsForBrand(workspaceId)`. |

ADR-skill (`adr-create`) genereert de doc-templates; user reviewt vóór commit.

# CROSS-CUTTING CONCERNS

Eén keer hier vastleggen, niet per fase herhalen:

- **`BrandVoiceguide.contentLocale` migratie** — Prisma-veld toevoegen, default null, fallback `Workspace.contentLanguage`. Migration-script seed voor bestaande workspaces (BB = `nl-NL`, alle anderen = workspace-fallback). Phase 0 of begin Phase 1.
- **`ContentReviewLog` model** — nieuwe Prisma-model in Phase 2 met velden `{id, workspaceId, userId, sourceType, sourceContent (encrypted/hashed), sourceUrl, language, fidelityScoreId, findingsJson, durationMs, retainUntil, createdAt}`. Indexed op `(workspaceId, createdAt)`. Retention-job (cron) ruim 90 dagen oude rijen op tenzij workspace-toggle (toggle out-of-scope, default 90 dagen).
- **F-VAL `contentMetadata` nullable** — `fidelity-runner.ts` mag content-string accepteren zonder brief-to-content lineage. Phase 0 verificatie + Phase 1 nullable-pad implementeren. Bestaande generation-callers blijven contentMetadata doorgeven; review-callers laten weg.
- **Embedding-cache** — Δ-2 + Δ-3 + bv-wire-w1-full-centroid lezen alle drie BrandVoiceguide-embeddings. Centraliseer in `getCachedVoiceguideCentroid(workspaceId)` met 5-min cache (consistent met `getBrandContext` patroon) om dubbele OpenAI-cost te vermijden.
- **Provenance-tagging** — elke heuristiek-entry in `src/lib/brand-fidelity/heuristics/<lang>/<category>.ts` heeft `{term, citationKey, severity, contextFlag?}`. Citation-keys worden gerouteerd via `src/lib/brand-fidelity/heuristics/citations.ts` register (URL + bron-naam). Geheime sauce: review-output kan future-proof "geflagd op basis van bron X" tonen.
- **PostHog events**: `brand_review_started`, `brand_review_completed`, `brand_review_marked_ready`, `publish_gate_second_opinion_disagreed`, `publish_gate_second_opinion_agreed`, `strategy_observation_viewed`, `strategy_observation_dismissed`. Implementatie consistent met bestaande tracking-conventies (workspace-id + user-id + duration).
- **i18n voor UI-tekst**: vandaag heeft Branddock geen i18n-framework (custom). UI-strings in nieuwe componenten blijven Nederlands consistent met `docs/playbooks/working-flow.md`. Heuristiek-pakketten zijn voor *content-taal* (NL/EN/BE/DE), niet UI-taal.

# HEURISTIEK-PAKKETTEN — directory-layout

Geseed via online research deze sessie (~25 bronnen). Volledige wordlijsten in subagent-output 2026-05-08; samenvatting hier voor architectuur:

```
src/lib/brand-fidelity/heuristics/
├── citations.ts                 ← bronnen-register (URL + naam per citation-key)
├── shared/
│   ├── risky-comparatives-detector.ts  ← 2-step rule (comparative + comparand-check)
│   └── ai-tells-en.ts          ← AI-generated content telltales (alleen EN, structureel + lexicaal)
├── nl-NL/
│   ├── corporate-fluff.ts      ← ~120 entries (NL + extensions: toekomstbestendig, purpose-driven, verbinden, borgen, etc.)
│   ├── superlatives.ts         ← ~25 entries
│   ├── fillers.ts              ← Schrijfvis 21-schrap + Onze Taal
│   ├── vague-quality.ts        ← ~30 entries (alleen flag bij ontbrekende substantiatie)
│   └── risky-comparatives.ts   ← seed-set voor 2-step detector
├── nl-BE/
│   ├── corporate-fluff.ts      ← extends nl-NL minus whitelist (job/onthaal/verlof/dossier/kinesist/hospitalisatie/werf/zetel/schepen) + BE-specifieke (familiale sfeer, marktconform salaris)
│   ├── superlatives.ts         ← extends nl-NL + BE intensifiers (straf, machtig)
│   ├── fillers.ts              ← extends nl-NL + BE-specifiek (eigenlijk-overgebruik, awel, enfin, seffens)
│   ├── vague-quality.ts        ← extends nl-NL + klantvriendelijk
│   ├── risky-comparatives.ts   ← extends nl-NL + straffer/machtiger
│   ├── nl-words-whitelisted.ts ← lijst NL-woorden die in BE NIET geflagd worden
│   ├── address-form-rule.ts    ← u-form default; je-vorm flag in zakelijk; gij/ge flag in formele copy
│   └── nl-jargon-extra-flag.ts ← pinpas/tosti/gaaf/leuk/cool extra-flag in BE
├── de-DE/
│   ├── corporate-fluff.ts      ← Karrierebibel + Caesar Caesar + Cobalt: ~50 entries (nachhaltig, ganzheitlich, Synergie, Mehrwert, etc.)
│   ├── superlatives.ts         ← führend, marktführend, einzigartig, etc. (~25)
│   ├── fillers.ts              ← Füllwörter standard-list (~35)
│   ├── vague-quality.ts        ← hochwertig, professionell, etc. (~25)
│   ├── risky-comparatives.ts   ← schneller/besser/effizienter etc.
│   ├── denglisch.ts            ← Anglicisms (committed, leverage, Manpower, Kickoff, alignen, etc.) — tunable per brand
│   └── nominalization-detector.ts  ← Phase 3 follow-up (HIX-inspired; out-of-v1)
├── en-GB/  (en-US deelt grotendeels)
│   ├── corporate-fluff.ts      ← Plain English Campaign A-Z (~50 entries)
│   ├── superlatives.ts         ← best/leading/world-class/etc.
│   ├── fillers.ts              ← Strunk & White + PEC overlap
│   ├── vague-quality.ts        ← quality/premium/professional (vague-without-substantiation)
│   ├── risky-comparatives.ts   ← seed-set
│   └── ai-tells.ts             ← imports shared/ai-tells-en.ts
└── index.ts                    ← locale-router: getHeuristics(locale) → categories
```

Provenance: elke entry heeft `{term, citationKey, severity, contextFlag?}`. Severity-niveaus: `always-flag`, `context-flag`, `soft-flag`. Context-flag-entries vereisen substantiatie-check in F-VAL Pijler 3 — woord OK in zelfde paragraaf met cijfer/specifiek-substantief, anders flag.

# EFFORT + SEQUENCING — bijgewerkt totaal

| Fase | Items | Effort (werkdagen) | Wall-clock met parallelisatie |
|---|---|---|---|
| **Phase 0** | tech-debt-any-types, claw-page-awareness | 3-5 | ~3-5d (sequentieel kan, parallelisatie moeilijk vanwege type-impact) |
| **Phase 1** | bv-wire-w1-full-centroid, Δ-2, Δ-3 | 8-11 | ~7d (Δ-2 + Δ-3 parallel; centroid 1d insertion) |
| **Phase 2** | Δ-1, Δ-4, canvas-inline-edit-overlays | 13-17 | ~10d (Δ-1 hoofdspoor; Δ-4 + canvas-inline parallel) |
| **Phase 3** | brandclaw-data-collection, Strategy Analyst stub | 20-27 | ~20-27d (foundation eerst, dan stub; weinig parallelisatie) |
| **Bestaand pre-launch open** | content-styling-migratie, campaign-brief-output-mapper | 5-8 | ~5-8d (parallel met Phase 0/1 mogelijk) |
| **Totaal werk** | | **49-68** | |
| **Wall-clock totaal** | | | **~10-14 weken pre-launch** |

Aansluitend launch-fase (parallel mogelijk vanaf Phase 2): vercel-deployment + stripe-billing-live + pilot-onboarding-better-brands.

# BESLISPUNTEN — vastgelegd 2026-05-08

User akkoord op alle 5 aanbevelingen.

1. **Pricing-impact**: Δ-1 paste-in onder **DIRECT-plan** (1 review ≈ 1 AI call); Δ-1 bulk-audit (10+ reviews/URL-scanning) + Strategy Analyst Insights onder **AGENCY-plan**. `stripe-billing-live` task absorbeert dit in plan-features-mapping.
2. **Pilot-rollout-volgorde heuristiek-pakketten**: **`nl-NL` eerst** (Better Brands Phase 1 smoke) → **Linfi `nl-NL`** → **`en-GB`** (founder-marketing-content-dogfood of 3e pilot) → **`nl-BE` + `de-DE` alleen on-demand** wanneer pilot-klant zich aandient. Voorkomt premature productie-uitrol van onbeproefde pakketten.
3. **Strategy Analyst observation-distributie**: **In-app banner default** in Brand Alignment Tab 4 "Insights" — read-only Strategy Observations met severity + evidence. Weekly-digest pas activeren wanneer `weekly-report-email-via-resend` post-launch landt (synergistic, niet pre-launch).
4. **Default retention `ContentReviewLog`**: **90 dagen vaste retention v1**, workspace-toggle pas in `privacy-dpa-hooks` LATER-task. Cron ruimt rijen >90 dagen op.
5. **Worktree-strategie**: **één worktree per fase-hoofdspoor** (`branddock-program-p0`, `-p1`, `-p2`, `-p3`); parallel-streams binnen fase via separate branches. DB-naming `branddock_p<N>`, port-allocatie 3000-3003. Schema-migraties per fase rebasen op main na merge — voorkomt 4 parallelle schema-conflicten.

# EERSTE TAAK — morgen startbaar

**`tech-debt-any-types`** in L2 supervised auto-mode. Concrete actie: `cd /Users/erikjager/Projects/branddock-app && grep -rn ": any" src/ -l | head -20` voor file-list, dan cluster-voor-cluster fix tot `: any`-count = 0 in src/api/ + src/features/*/hooks/ + src/lib/ai/. Per cluster: tsc-check + commit. Stop wanneer cluster-fix > 60 min — herevalueer scope.

Reden eerst: schema-extension werk in Phase 1+ (BrandVoiceguide.contentLocale, ContentReviewLog, StrategyObservation) raakt API-routes en hooks die vandaag `: any` bevatten. Bestaande typeschuld vergroot risico op runtime-bugs tijdens schema-evolution. L2 auto-mode (zie CLAUDE.md "Workflow modes") is hier ideaal: deterministisch, hooks-bewaakt, geen externe service-calls.

---

# Red Team Review

> Onafhankelijke kritiek vanuit perspectief ervaren PM.

## Zwakste schakel

**A6 (Better Brands accepteert pilot-start +10-14 weken)** is het zwaarste enkele falen-punt. Als BB niet wil wachten of een concurrent kiest in tussentijd, verliest het programma z'n pre-launch-rationale. Mitigatie: parallel-track communicatie naar BB ("we voegen review-feature toe als pilot-killer-feature") en/of pilot-pauze-formele-afspraak.

**Sub-zwakke schakel**: A1 (F-VAL is uitbreidbaar zonder grote refactor). Als `fidelity-runner.ts` heel diep met brief-to-content lineage verweven is, kan Phase 0/1 verificatie 5-7 dagen extra werk opleveren of zelfs ADR-1 fundamenteel herzien (composite-engine herontwerp i.p.v. additieve uitbreiding). Phase 0 verificatie is daarom hard pre-Phase-1.

## Pleidooi tegen dit plan

"Branddock is pre-launch een content-creatie tool met zwakke pilot-pijplijn (1 actief gevalideerd: BB). Een 10-14 weken programma uitvoeren zonder pilot-feedback betekent 10-14 weken bouwen op founder-intuïtie + N=1 dogfood. Dat is hetzelfde anti-pattern dat de campaign-brief-cowork-parity-validatie 2026-05-07 net wist te vermijden (B1 weekly-calendar werd dissolved op basis van werkelijke gebruikers-pijn-analyse). Je zou eerst BB onboarden met huidige feature-set, een echte review-side-pijn observeren, en pas dán dit programma starten — anders bouw je een review-tool die niemand vraagt voor merken die niet bestaan. Daarnaast: de 'robust + future-proof' Strategy Analyst-keuze is een oversizing voor een stub die maand 3 post-launch eigenlijk pas relevant wordt. Een view-laag van 3-5 dagen die maand 3 vervangen wordt door de echte agent-architectuur is goedkoper en pragmatischer."

## Wat zouden we leren door NIET te bouwen

- BB pilot-feedback in week 4-8: welke review-side-pijn is *echt* acuut vs. theoretisch?
- BB content-mix-data: hoeveel paste-in vs. generation? Hoeveel multilingual? Validatie of NL-NL-only voldoende is voor v1
- Alternatief experiment: één-week feature-spike "paste-in mode in PublishGate" zonder Brand Alignment-tab + zonder Brand Assistant-tool + zonder heuristiek-pakketten. Levert Δ-1-light op in ~5 dagen. Pilot-feedback erop bepaalt of full-programma waarde levert
- Strategie risico: Brandclaw-roadmap maand 3 Strategy Analyst zou met 3-5 dagen view-laag prima werken; "robust foundation" claim is alleen waar als Campaign Builder + Measurement écht maand 5-9 landen — als dat schuift, was de architectuur-overhead gratuit

## Verdict van de planner

**ready-to-build met expliciete user-acknowledgment van scope**

Reden: alle 5 stop-condities zijn afgevinkt. User heeft expliciet "alle 4 deltas pre-launch hard" + "robust + toekomstvast Analyst" + "geen native review BE/DE" gekozen — drie scope-vergroot-keuzes die normaal feature-planner-pushback zouden krijgen, maar hier strategisch bewust zijn (positionering + agent-foundation + tempo-acceptatie). Zwakste schakels A1 + A6 zijn geadresseerd: A1 via Phase 0 verificatie, A6 via user-communicatie buiten dit doc. Red team-zorg "10 weken bouwen zonder pilot-feedback" is geldig maar door user expliciet geaccepteerd als trade-off voor product-positioneringskeuze. Programma kan naar technical-planner.

Aanbeveling planner: **technical-planner-promotion per fase, niet alle vier tegelijk**. Fase Phase 0 + Phase 1 nu; Phase 2 + Phase 3 promoten ná Phase 1 smoke om eventuele architectuur-leerpunten te verwerken. ADR-1 + ADR-3 schrijven vóór Phase 1; ADR-2 vóór Phase 3.

# 5-Punts Stop-Conditie

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (% pilot-content zonder edits naar publicatie, +20pp binnen 60 dagen)
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (12 vs 5 — ruim)
- [x] MVP-acceptance-criteria concreet (Given/When/Then per fase, programma-niveau bovendien)
- [x] Eerste taak morgen startbaar (`tech-debt-any-types` in L2 auto-mode)

# Volgende stap

Klaar voor technical-planner — **per fase**, niet als één uitvoerings-task. Volgorde:

1. **ADR-1 + ADR-3 schrijven** (`adr-create` skill) vóór Phase 1 start
2. **Technical-planner Phase 0** (`tech-debt-any-types` + `claw-page-awareness`) → 2 task-files in `tasks/`
3. **Technical-planner Phase 1** (`bv-wire-w1-full-centroid` is al klaar als task-file; **Δ-2** + **Δ-3** nieuwe task-files) → 2 nieuwe task-files
4. **Phase 1 smoke** op Better Brands NL-NL — waypoint: leerpunten worden in deze idea-doc onder een "Phase 1 lessons" sectie bijgevoegd vóór Phase 2 promotion
5. **ADR-2 schrijven** + **technical-planner Phase 2 + Phase 3** → 4-5 task-files
6. **Programma-archief**: idea-doc verplaatst naar `docs/specs/brand-control-program.md` na Phase 3 done

User-bevestiging gevraagd op 5 open beslispunten (pricing-impact, pilot-rollout-volgorde, observation-distributie, retention-default, worktree-strategie) vóór technical-planner Phase 0 start.
