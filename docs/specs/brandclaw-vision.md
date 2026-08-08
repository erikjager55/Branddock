# Brandclaw-visie — het zelflerende merkteam

> **Status**: voorstel (toekomstvisie, ambitie-verhoging) — ter bespreking met Erik.
> **Datum**: 2026-08-08.
> **Context**: dit bestand was aangekondigd in `docs/specs/_README.md` (migratie visie-deel uit `docs/archive/old-lists/BRANDCLAW-ROADMAP.md`) maar nooit geschreven. Deze versie vervangt de archief-visie niet 1-op-1: hij absorbeert het eindbeeld daaruit, verwerkt de herijking van `docs/reports/p36-brandclaw-herijking-2026-07-17.md`, en vergroot de ambitie op twee assen: **autonomie** en **zelflerend**.
> **Onderbouwing**: codebase-audit van de agents/Brandclaw-motor (2026-08-08) + docs-sweep van alle learning-loop-, autonomie- en gate-documentatie + extern onderzoek naar state-of-the-art zelflerende agent-systemen.

---

## 1. De kern in één zin

**Brandclaw wordt het eerste marketingplatform dat aantoonbaar je merk léért: elk mensbesluit en elke gepubliceerde uitkomst maakt de agents meetbaar beter, en autonomie is geen instelling maar een status die agents per taak verdienen met hun track-record.**

De bestaande differentiatie-claim ("onze agents bewijzen dat hun werk on-brand is" — F-VAL) krijgt daarmee een tweede, zwaardere verdieping die niemand kan kopiëren zonder jaren aan loop-data: **"onze agents bewijzen dat ze je merk leren."**

---

## 2. Waarom nu — wat het onderzoek zegt

### 2.1 De bouwstenen zijn af, maar de lus is open

De audit van 2026-08-08 bevestigt de P3.6-conclusie ("Brandclaw is een orkestratie-project") en scherpt hem aan: de loop is rond gemáákt (BC-1 draait), maar hij is **niet gesloten**. Concreet:

| Wat er is | Wat er aantoonbaar ontbreekt |
|---|---|
| 10 agents op één motor, propose→confirm, artefacten, scheduling, inbox | Accept/reject wordt alleen als timestamp opgeslagen — **geen enkele agent leest ooit terug wat de mens besloot of waarom** |
| pgvector `AgentMemory` met decay, confidence, access-reinforcement | Memory-write vereist dubbele menselijke actie → in de praktijk vrijwel leeg; recall is opt-in modelgedrag, geen gegarandeerde injectie; decay-job wordt nooit geënqueued |
| `LearningEvent`, `AICallTrace`, `ContentFidelityScore`, diff/edit-classificatie draaien in productie | Capture zonder terugkoppeling — het learning-loop-plan zei het zelf al: "agent-loops die zelfstandig optimaliseren" is bewust buiten scope gehouden |
| F-VAL scoort elke content-output | Een lage score verandert niets aan prompt, model, tool-keuze of geheugen van de agent — meetpunt, geen leersignaal |
| `AgentRun.totalCostUsd`, PostHog-events, `AdMetricSnapshot` | Geen budget-model, geen hard-stop, geen kill-switch, geen generieke proposal-cap; `AgentMemoryType.OUTCOME` bestaat als enum-lid zonder één schrijver |
| NodeType-enum met 4 loop-rollen | 3 van de 4 (`campaign_builder`, `measurement_eval`, `optimization`) zijn lege enum-leden |

De leerlus is dus **asymmetrisch gebouwd: waarnemen is af, leren bestaat nog niet.** Dat is geen achterstand — het is precies de volgorde die de eigen gates voorschreven. Maar het betekent dat de volgende ambitie-sprong niet "meer agents" is, maar **de lus sluiten**.

### 2.2 De werkelijke bottleneck is signaal-schaarste

De gedocumenteerde faalpaden (Gartner: >40% agentic-projecten geannuleerd vóór 2027; Deloitte: kosten-onvoorspelbaarheid + onbewezen waarde) zijn afgedekt met gates. Maar de pilots onthullen een faalpad dat de plannen niet voorzagen: **leer-infrastructuur zonder data om van te leren**. Layer-3-regression: 0 rejected/edited-events. Vera-triggers: 0 `IN_REVIEW`-transities in 8 weken. Iris: ships-dormant. Een zelflerend systeem dat wacht op organisch signaal leert nooit. De visie moet signaal-acquisitie daarom als eersteklas doel behandelen, niet als bijproduct.

### 2.3 De markt bevestigt de richting én het gat

Extern onderzoek (zie §10): het bewezen gebruikspatroon is draft→approve (91-97% van marketeers redigeert AI-output), auto-publish boven de comfortgrens is een gedocumenteerde flop-categorie, en tegelijk is "self-improving loops" hét onderscheid tussen 2026-agents en 2024-automation — memory-gedreven agents laten meetbare kwaliteitswinst zien, en gesloten optimalisatielussen (meten → leren → herallokeren) zijn de norm aan het worden in performance-marketing. Niemand combineert echter **merk-DNA + fidelity-bewijs + verdiende autonomie + per-merk-leren**. Dat kwadrant is open.

---

## 3. Het eindbeeld (horizon ~2029)

Een workspace-eigenaar opent maandagochtend Brandclaw:

- **Bo** heeft het weekend gedraaid binnen zijn verdiende envelope: 4 LinkedIn-posts en 1 blog gepubliceerd (autonomie-tier "bounded" voor die twee types — verdiend na 14 weken 90%+ accept-rate), 2 voorstellen buiten de envelope staan in de inbox.
- De **weekdigest** opent niet met "wat ik heb gedaan" maar met "wat ik heb geléérd": "Carrousels met een vraag-hook presteren 2,3× beter bij persona 'Operations Manager' — ik heb dit als playbook-regel voorgesteld; 3 memories geconsolideerd; F-VAL-drempel voor case-studies met 2 punten verhoogd op basis van jullie edits."
- Het **trust-dashboard** toont per agent het track-record: accept-rate-trend, F-VAL-verloop, outcome-uplift per cyclus, kosten binnen budget, incidenten (0). Naast elke autonomie-schuif staat het bewijs waarom die stand gerechtvaardigd is — of wat er nog ontbreekt om een trede hoger te mogen.
- De **retro-agent** heeft afgelopen vrijdag de cyclus geëvalueerd: 2 hypothesen bevestigd, 1 verworpen, playbook bijgewerkt, en één experiment voorgesteld voor komende week ("test langere captions bij persona X — confidence LOW, dus alleen als voorstel").
- Elke geleerde les is **inspecteerbaar, cureerbaar en verwijderbaar** — het merkgeheugen is van de klant, niet van het model.

De mens is geen operator meer maar **bestuurder**: hij keurt geen individuele posts goed, hij bestuurt envelopes, leest lessen, en corrigeert richting. Menselijke minuten per gepubliceerd on-brand item dalen elke maand — en het systeem kan die daling bewijzen.

---

## 4. De vijf pijlers

### Pijler 1 — Sluit de lus: elk mensbesluit is een leersignaal

Elke accept, reject en edit wordt een gestructureerd feedback-record dat agents bij hun volgende run **gegarandeerd** meekrijgen:

- **Feedback-ledger**: `dismissReason` + optionele vrije-tekst-reden op élk artefact/proposal (nu alleen op `StrategyObservation`, ongebruikt). Eén klik, geen frictie — maar wat er is wordt teruggevoerd.
- **Edits als soft-signaal**: de bestaande diff/edit-classificatie (`src/lib/learning-loop/edit-classifier.ts`) wordt teruggekoppeld: `editDistance > 0.20` op een agent-output = impliciete correctie, automatisch als OUTCOME-memory geschreven.
- **Automatische memory-vorming**: het dubbel-menselijk-gegate `remember_agent_memory` blijft voor agent-inzichten, maar **feitelijke outcomes** (voorstel geaccepteerd/afgewezen/geëdit, F-VAL-score, publicatiestatus) worden systeem-geschreven — dat zijn feiten, geen agent-meningen, dus geen confirm nodig. `AgentMemoryType.OUTCOME` krijgt eindelijk zijn schrijver.
- **Deterministische memory-injectie**: top-N relevante memories worden in de system-prompt geïnjecteerd in plaats van via opt-in `recall_agent_memory` gehoopt. Recall-tool blijft voor diepere vragen.

### Pijler 2 — Verdiende autonomie: de trust-ladder

Dit is de ambitie-verhoging die consistent blijft met de eigen governance-lijn (die over tijd bewust strénger werd — geen auto-confirm-sluiproutes). De herformulering: **autonomie is niet het doel maar het gevolg van aantoonbaar leren.**

- Autonomie wordt granulair: per **agent × taaktype × workspace**, niet één platte schuif. Tiers: `suggest` → `auto_publish_approved` (BC-2) → `bounded` (BC-3) → `bounded+experiment` (BC-4+).
- Een tier wordt nooit stilzwijgend actief: het systeem **solliciteert** — "Bo heeft 12 weken ≥90% accept-rate op LinkedIn-posts, gemiddeld F-VAL 84, 0 incidenten. Envelope voorstellen: max 4/week, alleen linkedin-post, F-VAL ≥ 80, budget €X." De mens zet aan.
- **Automatische de-escalatie**: incident (off-brand-publicatie, budget-touch, F-VAL-dip onder drempel, accept-rate-val) → tier zakt automatisch één trede en de eigenaar hoort waarom. Vertrouwen is verdiend én verliesbaar.
- Harde randen blijven onaantastbaar: kill-switch per workspace en platform-breed, budget-hard-stop, generieke server-afgedwongen proposal-caps (nu alleen Ada's lokale constante), digest-plicht, geen auto-confirm-na-tijd — ooit.

### Pijler 3 — Van genereren naar experimenteren

Content wordt hypothese. De loop wordt een experimenteermachine:

- Elke loop-cyclus formuleert expliciete hypothesen ("vraag-hooks werken voor persona X"), genereert varianten, en **bandit-allocatie** verdeelt publicatie-aandacht: winnaars krijgen meer, verliezers sterven snel (multi-armed bandit i.p.v. klassiek A/B — sneller lerend bij klein volume, cruciaal voor MKB-workspaces).
- **Outcome-attributie**: gepubliceerde items worden teruggekoppeld aan de run/het voorstel dat ze voortbracht (`AgentOutcome`: proposal → deliverable → publicatie → performance uit PostHog/GA4/social/Ads). De Measurement-node uit het archiefontwerp krijgt hiermee zijn concrete vorm.
- De **retro-agent** (de Evaluation-node, herboren): een wekelijkse systeem-run die de cyclus evalueert — hypothesen bevestigen/verwerpen, memories consolideren tot lessen (Reflexion-patroon: talige zelfreflectie in persistent geheugen), en het playbook bijwerken. Dit is tevens de memory-consolidatie die nu ontbreekt (dedupe, samenvatting, promotie van herhaalde observaties; decay-job eindelijk geactiveerd).

### Pijler 4 — Het merk-playbook: gedistilleerde, cureerbare kennis

Losse memories zijn ruis; gedistilleerde lessen zijn kapitaal. Naar het Voyager-skill-library-patroon:

- Bevestigde patronen promoveren van memory → **playbook-regel**: een leesbaar, per-workspace document ("wat werkt voor dit merk") dat agents als context krijgen en dat de mens kan lezen, bewerken en verwijderen.
- Dit volgt het bestaande governance-principe uit de localization-draft: geleerde kennis die de pipeline stuurt hoort in **cureerbare merk-data**, niet onzichtbaar in agent-geheugen. De agent stelt playbook-regels voor; de mens (of een verdiend tier) bekrachtigt.
- Playbook-regels voeden óók F-VAL: een geleerde regel kan een workspace-specifiek fidelity-criterium worden — het merkbewijs wordt scherper naarmate het systeem langer draait. Dit activeert het al geplande `fval-iteratie-3` (data-gedreven pillar-weight-re-tuning) als terugkerend zelfkalibratie-mechanisme in plaats van eenmalige exercitie.
- Zelfde mechaniek op systeemniveau: de prompt-registry (bestaat, mét usage-dashboard) plus `agentVersion`/`promptVersion`-stempels (bestaan) maken **prompt-A/B over cycli** mogelijk — de lessen verbeteren niet alleen wát agents weten maar hoe ze redeneren.

### Pijler 5 — Bewijsbare autonomie als product én claim

Governance wordt geen rem maar het verkoopbare oppervlak:

- **Trust-dashboard** per agent: track-record, kosten, incidenten, geleerde lessen, autonomie-status + het bewijs erachter. De bestaande audit-fundamenten (immutable `DataSnapshot`, versioned runs, toolCallTrace) zijn hier al voor ontworpen — ze krijgen een gezicht.
- De marketing-lijn evolueert met de werkelijkheid mee, conform het wig-besluit ("autopilot pas claimen als het waar is"): eerst *"een AI-marketingteam dat je merk écht kent — en dat kan bewijzen"*, daarna *"— en dat aantoonbaar elke week beter wordt"*, en pas bij BC-3+ *"— en dat je met bewijs autonomie kunt geven."*
- Dit lost ook het signaal-schaarste-probleem deels op als moat: hoe langer een klant draait, hoe meer het platform over zíjn merk geleerd heeft — **switching cost wordt geleerd kapitaal**, niet lock-in.

---

## 5. Architectuur-delta's (op hoofdlijnen)

Alles additief op de bestaande motor; geen herbouw. Indicatief, definitieve besluiten per ADR:

| Delta | Bouwt op |
|---|---|
| `AgentFeedback` (reden bij dismiss/reject, edit-koppeling) + `agent_output_dismissed`-event | bestaand confirm-pad, `edit-classifier.ts` |
| `AgentOutcome` (proposal → publicatie → performance-attributie) | `LearningEvent`, `AICallTrace`, PostHog, `AdMetricSnapshot` |
| Systeem-geschreven OUTCOME-memories + deterministische memory-injectie + consolidatie/decay-job in de cron | `AgentMemory` (pgvector), `MEMORY_DECAY`-handler (bestaat, nooit geënqueued) |
| `WorkspaceAgentConfig` (autonomie-tier per agent × taaktype) + `AgentBudget` (hard-stop) + generieke proposal-cap + kill-switch | BC-2/BC-3-fasering, `AgentSchedule.enabled`, advisory-lock-lane |
| Retro-agent als systeem-run (Evaluation-node) + `measurement_eval`-node op de bestaande orchestrator | lege NodeType-enum-leden, `runAgentLoop` |
| Bandit-allocatie op deliverable-varianten + hypothese-veld op loop-proposals | Bo's loop, bestaande variant-generatie |
| `BrandPlaybook` (cureerbare regels, propose→confirm) + koppeling naar F-VAL-criteria | `BrandLocaleProfile`-governance-patroon, `fidelity-config` |
| Trust-dashboard (agent-detail-uitbreiding) | `AgentRun`-metrics, pilot-metrics-queries |
| Strategy Analyst uit zijn dood-eind-pad: naar de catalogus, op `AgentRun`/`AgentArtifact` | convergentie-epic item 1 (bestaand plan) |

---

## 6. Fasering — de bestaande trap verlengd

De BC-trap blijft; er komen treden bij. Elke trede houdt zijn gate; geen enkele gate wordt versoepeld.

| Trede | Wat | Gate |
|---|---|---|
| **BC-1** ✅ | Loop met mens-goedkeuring (Bo) | — (done 2026-07-18) |
| **BC-1.5** *(nieuw — kan nú, geen autonomie-risico)* | Lus sluiten aan de leerkant: feedback-ledger, systeem-OUTCOME-memories, memory-injectie, decay-job aan, generieke caps + budget-hard-stop + kill-switch | Geen — dit is leren + veiligheid, geen autonomie |
| **BC-2** | Goedgekeurd = gepubliceerd; outcome-attributie start (publicatie = meetbaar signaal) | P3.5-kanaal + credentials (bestaand) |
| **BC-2.5** *(nieuw)* | Retro-agent + hypothesen + bandit-varianten; trust-dashboard v1; eerste playbook-regels (propose-only) | ≥4 weken BC-2-outcome-data |
| **BC-3** | Bounded autonomy — nu **verdiend** per agent × taaktype o.b.v. track-record, met automatische de-escalatie | De bestaande 4 go-criteria + go-besluit Erik (ongewijzigd) |
| **BC-4** *(nieuw)* | Zelfkalibratie: F-VAL-re-tuning op outcomes, prompt-A/B over cycli, experiment-autonomie binnen envelope | BC-3 ≥ een kwartaal incidentvrij bij ≥5 workspaces |
| **BC-5** *(nieuw — jaar-2-ambitie uit het learning-loop-plan)* | Cross-workspace patronen binnen segment (strikt opt-in, geanonimiseerd): "wat werkt in jouw branche" als koud-start-versneller voor nieuwe workspaces | Apart privacy/opt-in-ADR + expliciet go-besluit |

**Volgorde-rationale**: BC-1.5 vóór BC-2 — de leerlus moet dicht zijn vóórdat het publicatievolume stijgt, anders verdampt het kostbaarste signaal (vroege outcomes) onopgeslagen. Het is bovendien het antwoord op signaal-schaarste: accept/reject/edit-signaal bestaat nú al bij elke inbox-interactie en wordt vandaag weggegooid.

---

## 7. Noordster en meetbaarheid

**Noordster**: *menselijke minuten per gepubliceerd on-brand item, dalend per maand per workspace* — het enige getal dat autonomie én leren én waarde tegelijk meet.

Ondersteunend, per workspace op het trust-dashboard:
1. **Accept-rate-trend** per agent per taaktype (leert het systeem wat de mens wil?)
2. **F-VAL-verloop** van agent-output over cycli (wordt het on-brand-er zonder menselijke correctie?)
3. **Outcome-uplift per cyclus** (presteren publicaties beter dan de vorige cyclus / de vanilla-baseline?)
4. **Verdiende autonomie-graad** (aandeel gepubliceerde items zonder per-item-goedkeuring, binnen envelope, zonder incident)
5. **Kosten per geaccepteerd item** (Deloitte-faalpad, permanent bewaakt)

Elke metric heeft al een databron in productie; geen enkele vergt nieuwe capture — alleen terugkoppeling.

---

## 8. Wat we expliciet NIET doen

De strenger-geworden lijn blijft de lijn:

- **Geen auto-confirm-sluiproutes** — geen "auto-approve na X dagen", geen batch-confirm-all als default, geen confidence-gestuurde auto-approve buiten een verdiende, expliciet aangezette envelope (het 48u-timeout-ontwerp uit het archief blijft verworpen).
- **Geen budget-autonomie op advertising** — Ada signaleert, mens beslist over geld. Ook in BC-4.
- **Geen onzichtbaar leren** — elke les die gedrag stuurt is inspecteerbaar en verwijderbaar (playbook-principe). Geen model-finetuning op klantdata in deze horizon.
- **Geen cross-workspace-leren zonder opt-in** — BC-5 is gated achter een eigen privacy-ADR; merkgeheugen is van de klant.
- **Geen autonomie-marketing vóór de werkelijkheid** — het wig-besluit blijft van kracht; elke claim volgt op bewijs.
- **Geen nieuwe orchestrator-frameworks** — de eigen motor (ADR 2026-05-08, Alt D verworpen) volstaat aantoonbaar; de treden hierboven zijn orkestratie en schema-werk, geen platform-wissel.

---

## 9. Open besluiten (voor Erik)

1. **BC-1.5 als eerstvolgende Brandclaw-increment?** Het is autonomie-risicovrij en maakt elk later increment waardevoller. Kandidaat om vóór BC-2 te trekken.
2. **Convergentie-epic herijken op deze fasering** — `tasks/agents-brandclaw-convergentie.md` dekt items die hier in BC-1.5/BC-2.5/BC-3 landen; de go/no-go-gate van dat epic blijft, maar de indeling verschuift.
3. **Systeem-geschreven memories zonder confirm** — feiten (outcomes) wél, agent-inzichten níet: akkoord met die scheidslijn? Dit raakt het huidige propose-only-memory-principe en verdient een eigen ADR.
4. **Noordster bekrachtigen** — "menselijke minuten per gepubliceerd on-brand item" als de metric waarop Brandclaw wordt afgerekend.
5. **Dit document canoniek maken** — bij akkoord: verwijzing vanuit `roadmap.md` en het convergentie-epic; de archief-roadmap blijft archief.

---

## 10. Bronnen

**Intern** (belangrijkste): `docs/reports/p36-brandclaw-herijking-2026-07-17.md` · `docs/adr/2026-05-08-brandclaw-agent-architectuur.md` · `docs/adr/2026-07-05-agents-architectuur.md` · `docs/archive/implementatieplannen/IMPLEMENTATIEPLAN-LEARNING-LOOP.md` · `docs/archive/old-lists/BRANDCLAW-ROADMAP.md` (§F) · `docs/reports/agents-diepte-analyse-en-plan-2026-07-05.md` · `docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md` · `docs/marketing/launch-wig-besluit.md` · `docs/specs/content-test-improvement-plan.md` · `tasks/agents-brandclaw-convergentie.md` · `tasks/done/bc1-loop-pilot.md` · codebase-audit `src/lib/agents/**`, `src/lib/brandclaw/**`, `src/lib/learning-loop/**` (2026-08-08).

**Extern** (state-of-the-art, geraadpleegd 2026-08-08): Reflexion/verbal self-reflection en memory-gedreven self-improving loops als productiepatroon; Voyager-stijl skill-libraries als persistente, cureerbare geleerde vaardigheden; Mem0/agent-memory-frameworks met meetbare kwaliteitswinst (~26% boven kale vector-recall); multi-armed-bandit-allocatie voor content-varianten (o.a. LOLA, LLM-assisted online learning); closed-loop optimalisatie als 2026-norm in performance-marketing; agentic-AI-governance met autonomie-tiers en HITL-gates (IAPP three-tiered guardrails; FINRA 2026: autonomy/scope-creep/auditability als kernrisico's). URL-lijst in de sessie-samenvatting bij dit document.
