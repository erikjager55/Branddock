---
id: campaign-weekly-calendar
title: Week-niveau-thematisering als zelfstandige feature (B1 uit A3-validatie)
status: dissolved
created: 2026-05-07
verdict: probably-don't-build (as standalone feature)
resolution: probleem-elementen verdeeld over 2 bestaande tracks + 1 nieuwe post-launch follow-up
---

# Probleemstelling (1 zin)

Branddock-output produceert binnen één campagne te-uniforme posts (te weinig onderscheid, "saai om te lezen") en heeft geen week-niveau briefing/coherentie waardoor een 7-weekse campagne als losse posts overkomt ipv. opbouwende narratief.

# Kort historisch

A3-validatie 2026-05-07 (`idea-campaign-brief-cowork-parity-validation.md`) identificeerde sectie 5 (content-kalender, 70% gap) als data-laag-zone, met voorgestelde follow-up `campaign-weekly-calendar` (nieuw `WeeklyTheme` Prisma-model + UI). Feature-planner discovery 2026-05-07 ontmantelde dit voorstel.

# Discovery-bevindingen (samengevat uit Ronde 1)

- **Bestaand calendar/timeline-werk substantieel**: 3566 regels in 4 bestanden (`ContentLibraryCalendarView` 771r, `ContentLibraryTimelineView` 1379r, `Step4Timeline` 870r, `calendar-cards` 546r). User bevestigt: bestaande granulariteit (deliverable-niveau) is prima.
- **Echte JTBD onthuld**: niet "ontbrekend datamodel" maar "te veel posts die te veel op elkaar lijken, saai om te lezen". Output-kwaliteits-issue, geen data-laag-issue.
- **User accepteerde tegenargument 2** (output-laag, prompt-only volstaat): week-thema's kunnen on-render-of-on-generation worden afgeleid, geen persistentie nodig.
- **User accepteerde tegenargument 3** (Brandclaw-conflict): zelflerend thematisering hoort post-launch in Measurement/Optimization-nodes.
- **User-eis "contextueel + actualiteit + relevant"** gesplitst: (a) statisch-contextueel volstaat pre-launch, (b) actualiteit-driven is mooi post-launch.

# Verdict — `probably-don't-build` (as standalone feature)

B1 als zelfstandig `WeeklyTheme`-datamodel-feature is **niet gerechtvaardigd**:
1. Geen JTBD voor data-persistentie (week-thema's zijn afgeleide content, geen user-typed data)
2. Bestaande deliverable-niveau-views volstaan voor display
3. ADR-investering disproportioneel voor wat een prompt-template kan oplossen
4. Riskeert Brandclaw-architectuur achterstevoren te bouwen (output-laag opslaan voor Strategy Analyst in te plaats van Measurement op te laten leren)

# Resolutie — distributie over 3 tracks

| # | Track | Wat erin gaat | Status |
|---|---|---|---|
| **1** | Nieuwe follow-up task `studio-siblings-context-variation` (post-launch quality enhancement) | **Siblings-context-injectie** in cascading-context-builder: bij generatie van post N krijgt de prompt een summary van naburige posts (vermijd repeat-frasing, repeat-structure, repeat-angle). Lost JTBD "saaie posts binnen 1 week" direct op. | `studio-content-generation-real-ai` is gemarkeerd done op 2026-05-07 (commit `fbc44d7`, multi-round hardening), zonder siblings-context. Wordt eigen task, niet edit op done-task. |
| **2** | `campaign-brief-output-mapper` (Fase A van Cowork-pariteit, NEXT) | **Week-thema-render-prompt** als sectie 5 van de brief: AI-call on-render genereert per-week-thema uit campaign-strategy + persona + asset-distributie. Geen persistentie. Statisch-contextueel (a). | Toegevoegd aan `idea-campaign-brief-cowork-parity.md` Fase A acceptatiecriteria. |
| **3** | `weekly-theme-actuality-driven` (LATER, post-launch) | **Actualiteit-driven thematisering** met externe signalen (Perplexity Sonar of equivalent) + zelflerend via Brandclaw Measurement→Optimization. Mooi post-launch maand 7-12. | Toegevoegd aan `roadmap.md` LATER. |

# Follow-up task spec voor `studio-siblings-context-variation`

> Studio-content-generation-real-ai is done (commit `fbc44d7`, 2026-05-07) zonder siblings-context. Onderstaande wordt eigen `tasks/<id>.md` als post-launch quality-enhancement.

**Probleem**: gegenereerde posts binnen 1 deliverable-set/week-batch lijken te veel op elkaar (repeat-frasing, repeat-structure, repeat-angle), wat "saaie campagnes" oplevert. JTBD-bevestiging in A3-validatie 2026-05-07.

**Voorstel**:
- Cascading-context-builder uitbreiden: bij generatie van post N voegt het builder-mechanisme een `siblings-summary` toe (3-5 zinnen samenvatting van naburige posts in dezelfde week-batch of deliverable-set)
- Prompt-instructie expliciet: vermijd herhaling in (a) frasing/woordkeuze, (b) structuur (intro/body/cta-volgorde), (c) invalshoek (zelfde-pijnpunt-zelfde-angle)
- Lexicale diversiteit-meting via Jaccard-distance op woord-tokens als acceptatie-validatie

**Acceptatiecriterium (key)**:
- [ ] generate-all output toont meetbare variatie tussen naburige posts (lexicale diversiteit > 0.6 over alle deliverables in een week-batch via Jaccard-distance)
- [ ] Geen breaking change op bestaande cascading-context-builder API
- [ ] Token-budget binnen bestaande 8K cap blijft

**Effort**: ½-1 dag schatting
**Fase**: post-launch (quality enhancement, geen pre-launch blocker)
**Brandclaw-impact**: geen (alleen output-quality; loop-architectuur ongemoeid)

# Niet-gepland follow-up

`weekly-theme-actuality-driven` (LATER):
- Externe data-signaal-injectie (Perplexity Sonar of equivalent)
- Zelflerend via Brandclaw Measurement-node (welke thema's converteerden) + Optimization-node (suggesties)
- Vereist: Brandclaw foundation + Measurement-pipeline (post-launch maand 7-9)

# Wat dit betekent voor backlog

- ❌ `campaign-weekly-calendar` als feature **verwijderd** uit Fase B follow-ups
- ✅ `campaign-budget-table`, `campaign-kpi-structure`, `campaign-risk-assessment` blijven Fase B follow-ups
- ✅ Fase A `campaign-brief-output-mapper` krijgt 1 extra acceptatiecriterium (week-thema-render-prompt)
- ✅ Nieuwe LATER item: `weekly-theme-actuality-driven`
- ✅ Nieuwe post-launch quality-enhancement task: `studio-siblings-context-variation` (½-1 dag, geen Brandclaw-impact)

# Lessen voor toekomstige feature-planner sessies

1. **Bestaande UI grep VOOR feature-planner Ronde 1 starten** (3566 regels calendar/timeline gemist tot Ronde 1 vraag 3) — nu standaard in workflow opnemen
2. **Output-laag-vs-data-laag onderscheid** in Ronde 3 expliciet bevragen; als output-laag volstaat = geen feature meer, alleen prompt-engineering
3. **Brandclaw-positie van data-flow** in Ronde 3: input vs. output van welke node? Verkeerd-om bouwen is grootste risico voor pre-launch features die loop raken
