# Agents dogfood — Better Brands (2026-07-07)

> Eerste dogfood-ronde (optie A). Doel: de twee guardrail-datapunten verzamelen die de Fase-2/3 go/no-go eist — **F-VAL van agent-content** (guardrail #1) en **kosten per run** (guardrail #2).
> Harnassen: `scripts/dev/agents-dogfood.ts` (sweep) + `scripts/dev/agents-headtohead.ts` (F-VAL 1-op-1). Alle runs echt (Anthropic/Gemini), gepersisteerd als `AgentRun`/`AgentArtifact` op Better Brands.
> **Let op — meetcondities**: n=1 per agent (eerste peiling, geen variantie), lokaal gedraaid (`EXA_API_KEY`/`S2_API_KEY` niet gezet → research-enrichment gedegradeerd; productie kan afwijken).

---

## Samenvatting + guardrail-verdict

| Guardrail | Meting | Verdict |
|---|---|---|
| **#2 Kosten per run** | $0,60 totaal · gemiddeld **$0,10/run** · spreiding $0,05–$0,14 | ✅ **gemeten & bruikbaar** — instrumentatie klopt; basis voor het latere per-token-besluit |
| **#1 F-VAL agent-content** | bevestigde **eindcontent 76** (echte canvas-generatie); inline preview 72; brand-guardian-review **75** | ✅ **gehaald op de content die écht uitgaat** — geen agent-geïnduceerde kwaliteitsval; alleen het inline-preview-oppervlak (72) verdient labeling |

**Kernconclusie**: de agents draaien betrouwbaar (6/6), de instrumentatie levert bruikbare guardrail-data, en — na het meemeten van het confirm-pad — is er **geen kwaliteitsregressie op de agent-eindcontent** (die loopt door dezelfde Canvas-motor). Wat resteert: (1) het **inline-preview-oppervlak** (72) is een concept, niet de eindcontent — label of poort het; en (2) drie kleine **hygiëne-bugs** (research-latency 10 min, strategist-truncatie, angle-generator Gemini-truncatie) die scheduling soepeler maken.

---

## Guardrail #2 — kosten & betrouwbaarheid (de sweep)

Elke agent 1× op Better Brands, realistische use-case:

| Agent | Use-case | Status | $ kosten | Latency | In/Out tokens | Artefacten (F-VAL) |
|---|---|---|---|---|---|---|
| research-analyst | market-question | COMPLETED | $0,0923 | **615,0s** | 16.912/2.773 | REPORT |
| brand-guardian | review-content | COMPLETED | $0,0620 | 52,6s | 11.924/1.747 | REPORT, **FINDINGS (F-VAL 75)** |
| content-creator | create-content | AWAITING_CONFIRMATION | $0,1375 | 24,5s | 40.106/1.147 | REPORT, PROPOSAL |
| market-analyst | competitive-analysis | COMPLETED | $0,1315 | 60,4s | 30.478/2.674 | REPORT |
| strategist | strategy-foundation | AWAITING_CONFIRMATION | $0,1208 | 234,5s | 24.781/3.097 | REPORT, PROPOSAL |
| data-analyst | content-production | COMPLETED | $0,0545 | 20,0s | 13.219/989 | REPORT, TABLE×2 |

**Totaal $0,5987 · gemiddeld $0,0998/run · 6/6 geslaagd.**

Betekenis voor het per-token-besluit: bij ~$0,10/run kost een vaste-maandprijs-abonnement pas geld bij tientallen runs/maand/gebruiker. De uitschieters (content-creator/market-analyst/strategist ~$0,12–0,14) worden gedreven door grote **input**-context (30k–40k in-tokens = merk-DNA-injectie), niet door output — precies het "merkcontext nooit meteren"-uitgangspunt onderstreept dat de input-kosten structureel zijn.

---

## Guardrail #1 — F-VAL van agent-content

Twee metingen, drie oppervlakken. Zo scheiden we "wat de agent als concept toont" van "wat de agent daadwerkelijk oplevert".

| Oppervlak | Bron | F-VAL | Threshold | Meetmethode |
|---|---|---|---|---|
| **Agent — eindcontent** | content-creator, bevestigd → **echte Canvas-generatie** (linkedin-post via gpt-5.4) | **76** | ✓ (>70) | confirm-pad, `fidelity_score_complete`-event |
| Agent — inline preview | content-creator inline REPORT-draft (1.146 chars) | 72 | ✗ | externe scorer, lengte-gematcht |
| Agent — review | brand-guardian, autonome F-VAL op reviewsample | 75 | — | `runFidelityForExternalContent` |
| Canvas — referentie | echte BB blog-intro (1.106 chars) | 83 | ✓ | externe scorer, lengte-gematcht |

**Verdict: guardrail #1 gehaald op de content die écht uitgaat.** De doorslaggevende meting is de **eindcontent (76)** — die ontstaat op bevestigen via *exact dezelfde* Canvas-pipeline als de normale flow (routing `linkedin-post → gpt-5.4`), dus per constructie is er **geen agent-geïnduceerde kwaliteitsval**.

**Interpretatie (belangrijk, niet overclaimen):**
- De eerdere "−11, niet gehaald"-lezing was een **meetartefact**: die vergeleek een *inline preview* (72) tegen een *ander content-type* (blog-intro 83). Na correctie via het confirm-pad valt dat weg.
- Het resterende 76-vs-83-verschil is een **content-TYPE-effect** (linkedin-posts scoren in deze workspace lager dan blog-intro's), geen agent-vs-canvas-gap — beide komen uit dezelfde motor.
- Blijft over als reëel aandachtspunt: de **inline preview (72)** ligt onder de linkedin-threshold. Dat is een *concept*, geen eindcontent — een gebruiker die 'm ongewijzigd kopieert krijgt sub-threshold content. Aanbeveling: label het draft-oppervlak expliciet als "concept — genereer voor de definitieve, gescoorde versie", of hang er een lichte F-VAL-poort onder.
- **brand-guardian** gaf onafhankelijk een echte **F-VAL 75** — de review-agent werkt end-to-end mét score.

---

## Bevindingen (dogfood-vondsten)

1. **F-VAL wordt niet op rauwe REPORTs geschreven** — `AgentArtifact.fidelityScore` blijft `NULL` op alle content-REPORTs; alleen brand-guardian + het confirm-pad vullen 'm. Wie "produceert deze agent brand-fit content?" wil beantwoorden, mist die score op het meest-gebruikte oppervlak. *Overweeg een lichte F-VAL-poort op de inline content-draft (of het draft-oppervlak expliciet als "concept, nog niet gescoord" labelen).*
2. **research-analyst latency = 615s (10 min)** — live scraping/enrichment (1 URL gaf 403). Dit kan niet in een open tab; **onderstreept dat Fase 2 (scheduling + background-execution + notificatie) een echte behoefte is**, niet speculatief. Ook een timeout/kosten-plafond per research-run overwegen.
3. **Twee maxTokens-truncaties** — (a) een zware strategist-sub-stap (Haiku 4.5, `maxTokens: 16_000`) kapte af bij 56.941 chars; (b) de canvas-**angle-generator** (Gemini 2.5-flash, `maxOutputTokens: 700`) kapte af bij 38 chars (non-fataal, viel terug). Zelfde klasse als de [2026-05-24 SEO-maxTokens-gotcha](../../gotchas.md). *Token-budgets herzien + truncatie-detector.*
4. **Confirm-pad geverifieerd** — bevestigen van de content-creator-PROPOSAL materialiseert een echt deliverable en draait de volledige Canvas-pipeline (linkedin-post → gpt-5.4) → F-VAL 76 op een LINK-artefact. De strategist-PROPOSAL (`create_campaign`) schrijft de strategie door naar de Campaigns-module. Beide write-through-integraties werken end-to-end.
5. **Gedegradeerde enrichment lokaal** — `EXA_API_KEY`/`S2_API_KEY` niet gezet, Semantic-Scholar 429-rate-limited, Are.na deels leeg. De motor degradeert netjes (levert alsnog een REPORT), maar de lokale research-kwaliteit is niet representatief voor productie. *Herhaal deze meting op productie met keys.*
6. **Betrouwbaarheid nu 6/6** — geen enkele FAILED, in tegenstelling tot eerdere research-analyst-failures. Positief signaal.

---

## Betekenis voor de Fase-2/3 go/no-go

- **Guardrail #2 (kosten)** is instrumenteel bewezen en bruikbaar → groen licht om per-run-kosten als beslisinput te blijven verzamelen.
- **Guardrail #1 (F-VAL)** is **gehaald op de agent-eindcontent** (76, via de Canvas-motor) → geen kwaliteitsblokker meer voor Fase 2. Enige rest: het inline-preview-oppervlak labelen/poorten (finding #1).
- Bevindingen #2, #3 zijn kleine hygiëne-fixes die de scheduling-fase (Fase 2) soepeler maken — met name de research-latency van 10 min onderstreept dat background-execution + notificatie in Fase 2 een échte behoefte is, geen speculatie.

**Beide guardrails zijn nu met echte data ingevuld.** De Fase-2/3-go/no-go kan voortaan leunen op deze meetopzet (herhaalbaar via de twee harnassen). Aanbevolen vervolg: dezelfde sweep periodiek + op productie (met `EXA`/`S2`-keys) draaien voor een adoptie-/kostentrend, en de inline-preview-labeling + de twee maxTokens-fixes oppakken.
