---
id: pricing-credits-fase2-metering-wiring
title: Credit-billing Fase 2 — afboeking bedraden op alle generatie-sites incl. background-jobs
fase: launch
priority: now
effort: 3-5 dagen
owner: claude-code
status: in-progress
created: 2026-07-07
related-adr: docs/adr/2026-07-07-pricing-credits-launch.md
related-spec: tasks/pricing-credits-billing.md
worktree: branddock-feat-pricing-credits
---

# Probleem

De ledger-core (Fase 1) kan credits reserveren/afboeken, maar geen enkele generatie-site roept hem aan. Zolang de afboek-haak ontbreekt op een site, is die AI-actie gratis = margeverlies (het "metering-lek"-risico uit de umbrella). De ADR eist afboeking op **álle** generatie-sites, inclusief de **background-jobs** uit `serverless-hardening-jobs` (`handlers.ts`) — die draaien AI los van een request en moeten óók op het juiste account boeken.

# Voorstel

Bedraad de Fase-1-helpers op elke plek waar output-tokens of beeld/video worden geproduceerd, volgens één vast patroon: **pre-flight `reserveCredits` → genereer → `reconcileReservation` op werkelijk verbruik → `releaseReservation` in catch**. Gebruik één centrale `meterGeneration`-wrapper (thin) zodat elke site hetzelfde doet en er geen 6 varianten ontstaan. Sites: canvas-orchestrator, SEO-pipeline (`seo-generation-job`), agents (`run-agent`), persona-chat, en de beeld/video-routes. Voor **background-jobs** (`handlers.ts`) boekt elke AI-job op de `workspaceId` uit de payload → org. Chat/F-VAL/setup/exploratie blijven expliciet 0 (via `ZERO_COST_ACTIONS`). Sluit af met een **audit-grep** over alle AI-call-sites om lekken te vinden.

# Simplicity-noot — sub-batches (kandidaat voor split)

Dit is de breedste fase (veel sites). Om onder ~1 week te blijven, in sub-batches uitvoeren; elke batch los smoke-baar. Als de fase te groot blijkt, splits langs deze grenzen in aparte task-files:
- **2a — tekst-generatie**: canvas-orchestrator, SEO-pipeline, persona-chat (output-token-afboeking).
- **2b — agents**: `run-agent` (heeft al `totalOutputTokens` — dun aanhaken op de bestaande cost-tracking) + agent-deliverables.
- **2c — beeld/video**: de `media/ai-images`, `media/ai-videos`, `studio/[deliverableId]/*`-routes (per-generatie-count-afboeking, geen tokens).
- **2d — background-jobs**: `handlers.ts` (elke AI-job) + reservering-reaper.

# Acceptatiecriteria

- [ ] `src/lib/billing/credits/meter-generation.ts` (nieuw): `withCreditMetering(orgCtx, action, estimate, async () => result)` — reserveert vooraf, draait de generatie, reconcileert op `result.outputTokens` (tekst) of `result.count` (beeld/video), en released bij throw. Eén wrapper, overal hergebruikt.
- [ ] **Tekst-sites** (2a) bedraad: `canvas-orchestrator.ts`, `seo-generation-job.ts` (+ evt. `seo-pipeline.ts`), `persona-chat.ts` — output-tokens uit de AI-response gevoed aan `reconcileReservation`. Persona-chat = `action:'chat'` = **0 credits** (alleen `AiUsageRecord`, geen afboeking) — geverifieerd.
- [ ] **Agents** (2b): `run-agent.ts` haakt aan op de al-bestaande `totalOutputTokens`/`totalInputTokens` (regels ~205-219) → `action:'agent-deliverable'` (3 cr pre-flight, output-token-settle). Géén wijziging aan het agent-loop-gedrag zelf (ADR: alleen een afboek-haak).
- [ ] **Beeld/video** (2c): de generatie-routes (`media/ai-images/generate`, `media/ai-videos/generate`, `studio/[deliverableId]/{generate-visual*,generate-video,compose-video,hero-image,generate-voiceover,edit-image}`, `personas/[id]/generate-image`, `products/[id]/images`, `consistent-models/[id]/generate`, `landing-pages/*generate*`) boeken per **generatie-count** (`image:2`, `video-clip:20`) via `withCreditMetering` met `action` i.p.v. tokens.
- [ ] **Background-jobs** (2d): elke AI-draaiende handler in `handlers.ts` (`ALIGNMENT_SCAN`, `TREND_RESEARCH`, `WEBSITE_SCAN`, `BRANDVOICE_ANALYZE_URL`, `BRANDSTYLE_ANALYZE_URL/PDF`, `DAM_AUTO_TAG`, `BUG_REPORT_ANALYZE`, `CHAT_FEEDBACK_ANALYZE`, `SEO_GENERATE`) boekt op de `workspaceId` uit `job.payload`. **Let op de ADR-nuance**: recurring achtergrond-AI (competitor-monitoring, alignment-scans, trend-radar) is deels **floor-gedekt** en dus 0 credits — bepaal per job-type of het credit-kostend output produceert (bv. `SEO_GENERATE` = ja) of floor-gedekte achtergrond-analyse is (bv. `ALIGNMENT_SCAN` = 0). Leg de keuze per job-type expliciet vast in de handler-comment + registry.
- [ ] Reservering-reaper: `RESERVATION_REAP` job-type + handler die stale reserveringen (> N min) vrijgeeft (voorkomt lek bij gecrashte runs).
- [ ] **Audit-grep** uitgevoerd: een grep op alle `anthropicClient`/`openaiClient`/`geminiClient`/`falClient`-call-sites vs. de bedrade sites; elk credit-kostend gat gedocumenteerd of gedicht. Resultaat als checklist in Notes.
- [ ] Merkcontext-input kost 0 credits op elke site (geverifieerd — de context-assemblage heeft geen afboek-haak).
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd per sub-batch (zie plan)

# Bestanden die ik aanraak

- `src/lib/billing/credits/meter-generation.ts` (nieuw) — `withCreditMetering`-wrapper. Risico: medium.
- `src/lib/ai/canvas-orchestrator.ts` — afboek-haak rond de content-generatie. Risico: medium.
- `src/lib/ai/seo-generation-job.ts` (+ evt. `seo-pipeline.ts`) — afboek-haak op de long-form-output. Risico: medium.
- `src/lib/ai/persona-chat.ts` — `action:'chat'` = 0 credits (alleen analytics). Risico: laag.
- `src/lib/agents/registry/run-agent.ts` — afboek-haak op de bestaande output-token-tracking. Risico: medium (raakt de duurste sites).
- Beeld/video-routes: `src/app/api/media/ai-images/generate/route.ts`, `src/app/api/media/ai-videos/generate/route.ts`, `src/app/api/studio/[deliverableId]/{generate-visual,generate-visual-compose,generate-visual-trained,generate-feature-visuals,generate-video,compose-video,hero-image,generate-voiceover,edit-image}/route.ts`, `src/app/api/personas/[id]/generate-image/route.ts`, `src/app/api/products/[id]/images/route.ts`, `src/app/api/consistent-models/[id]/generate/route.ts`, `src/app/api/landing-pages/generate-page/route.ts`. Risico: medium (veel bestanden, repetitief).
- `src/lib/agents/jobs/handlers.ts` — per AI-job een afboek-haak op de payload-workspace; nieuw `RESERVATION_REAP`-handler. Risico: medium.
- `prisma/schema.prisma` — `RESERVATION_REAP` toevoegen aan `enum AgentJobType` (kleine additieve enum-change → Neon `db push`). Risico: laag.

# Bestanden die ik NIET aanraak

- `getBrandContext` / merk-context-assemblage — input blijft gratis, géén metering-haak (ADR D2 + umbrella "NIET aanraak").
- F-VAL-pipeline (`fidelity-runner.ts` e.d.) — scoring blijft credit-vrij; geen haak.
- `run-agent` agent-loop-gedrag — alleen een afboek-haak, geen gedragswijziging.
- `cost-calculator.ts` — COGS blijft gescheiden; niet als klant-afboeking hergebruiken.
- Ledger-core zelf (`ledger.ts`/`reservation.ts`) — af in Fase 1; hier alleen consumeren.

# Smoke test plan

1. **Tekst (2a)**: genereer een long-form artikel via canvas → pre-flight reserveert ~80 cr → artikel voltooit → `reconcileReservation` boekt de werkelijke output-token-credits af (bv. 62); saldo daalt exact; `CreditTransaction` toont `action:'long-form'` + `outputTokens`.
2. **Gratis-pad**: draai een F-VAL-scoring en een persona-chat-turn → 0 credits afgeboekt (alleen `AiUsageRecord`); merkcontext-injectie op de long-form kostte 0.
3. **Agents (2b)**: draai een agent-deliverable → afboeking op basis van de al-getrackte `totalOutputTokens`; agent-gedrag/output ongewijzigd t.o.v. vóór de wiring.
4. **Beeld/video (2c)**: genereer 1 beeld → 2 cr; genereer 1 videoclip → 20 cr; count-gebaseerd, niet token-gebaseerd.
5. **Background-job (2d)**: trigger een `SEO_GENERATE`-job → boekt credits op het juiste account (org uit payload-workspace); trigger een floor-gedekte `ALIGNMENT_SCAN` → 0 credits (per keuze). Cross-instance: job draait via cron, boeking landt op het account, niet op de request-user.
6. **Crash/reaper**: onderbreek een reservering (kill mid-run) → `RESERVATION_REAP` geeft de reservering na N min vrij; saldo hersteld.
7. **Idempotentie**: dubbel-gedispatchte job boekt één keer (idempotency-key uit Fase 1).
8. **Audit**: grep-lijst van AI-call-sites vs. bedrade sites is compleet; geen ongedekt credit-kostend gat.
9. `npx tsc --noEmit` + `npm run lint` groen.

# Risico's

- **Metering-lek** (waarschijnlijkheid: hoog zonder discipline, impact hoog): één vergeten site = gratis AI. Mitigatie: centrale `withCreditMetering`-wrapper (één patroon), de audit-grep als acceptatiecriterium, en smoke per site.
- **Dubbeltelling op agents** (medium): `run-agent` heeft al cost-tracking (`totalCostUsd`) — dat is COGS, niet de klant-afboeking. Mitigatie: de credit-haak leest `totalOutputTokens` maar schrijft naar de ledger, niet naar `AgentRun.totalCostUsd`; gescheiden houden (risico uit de umbrella).
- **Verkeerde org-attributie op background-jobs** (medium): een job zonder `workspaceId` in payload kan op de verkeerde/geen org boeken. Mitigatie: elke AI-handler valideert `workspaceId` (gooit al bij ontbreken); `resolveOrgForWorkspace` doet de pooling.
- **Floor-vs-credit-keuze per achtergrond-job is een beslissing** (medium): de ADR zegt dat recurring achtergrond-AI floor-gedekt is (0 cr), maar sommige jobs produceren user-facing output. Mitigatie: expliciete per-job-type-keuze in de registry + handler-comment; default conservatief (credit-kostend) tenzij duidelijk floor-gedekt.
- **Mid-run afkappen mag nooit** (ADR D7): bij een tekort tijdens generatie de output tóch afmaken (reservering is pre-flight; reconcile mag saldo tot 0 brengen). Mitigatie: reconcile blokkeert nooit; de guard zit vóór de run (pre-flight), niet erin.
- **Deze omgeving kan tsc/app niet volledig draaien**: verificatie = lint per file + CI-tsc/build + deploy-smoke; beeld/video/agents lokaal beperkt testbaar (echte AI-calls nodig).

# Out of scope

- Auto-topup-uitvoering bij tekort — Fase 3 (hier alleen de pre-flight-guard uit Fase 1).
- Trial-grant / dag-28-lock — Fase 4.
- UI-weergave van "dit kost ~N credits" — Fase 6 (deze fase levert wél de schatting-API die Fase 6 toont).
- Nieuwe generatie-features — alleen bestaande sites bedraden.

# Notes

- **Dependencies**: hangt aan **Fase 1** (ledger-helpers) en dus aan **Fase 0**. Hangt óók aan **`serverless-hardening-jobs`** (status: A1 compleet — de background-jobs staan al op de queue, dus de afboek-haak kan erin). Sequentieel na Fase 1. Kan **parallel** met Fase 5 (payments/tax raakt andere bestanden), maar coördineer het `schema.prisma`-touchpoint (beide fasen kunnen enum/velden willen pushen — één Neon `db push` per merge).
- **Integration-First**: consumeert de Fase-1-contracten (`reserveCredits`/`reconcileReservation`/`withCreditMetering`). Als die signatures nog niet vastliggen, eerst Fase 1 afronden.
- **Simplicity**: bij dreigende >1 week → splits langs 2a/2b/2c/2d in eigen task-files (zie sub-batch-noot). Aanbevolen volgorde: 2a → 2d (de background-jobs zijn het grootste lek-risico) → 2b → 2c.
- Hergebruik: `run-agent` trackt al output-tokens; de background-jobs staan al op de queue (`serverless-hardening-jobs`) — dit is aanhaken, geen from-scratch.
- **Verificatie-noot**: deze omgeving kan de app/AI-calls niet volledig draaien; verificatie = lint per file + CI-tsc/build + deploy-smoke (Stripe niet nodig voor deze fase, wél echte AI-calls voor de eind-smoke).

## Voortgang 2026-07-07 (branch `feat/pricing-credits-fase0`) — audit-checklist

Aanpak: centrale `withCreditMetering`/`chargeAfter`-wrapper (`meter-generation.ts`), dan de hoogwaardige + schoon-insertbare sites bedraad. tsc 0 (tracked) + eslint 0 per batch.

**✅ Gemeterd (credit-kostend):**
- **Long-form / SEO-content** → `seo-generation-job.ts` op COMPLETED (vaste 80 cr, idempotent per job; token-accuraat = latere refinement). Dekt óók de `SEO_GENERATE`-background-job.
- **Agents** → `run-agent.ts` post-hoc op `totalOutputTokens` (`agent-deliverable`).
- **AI-beeld** → `media/ai-images/generate` (2 cr, count). **AI-video** → `media/ai-videos/generate` (20 cr, count). = referentie-implementatie.
- Reservering-**reaper** (`RESERVATION_REAP` + `reapStaleReservations`).

**✅ Floor-gedekt = 0 cr (bewust, gedocumenteerd in `handlers.ts`):**
- Achtergrond-analyse: `ALIGNMENT_SCAN`, `TREND_RESEARCH`, `DAM_AUTO_TAG`, `BUG_REPORT_ANALYZE`, `CHAT_FEEDBACK_ANALYZE`.
- Merk-DNA-setup: `WEBSITE_SCAN`, `BRANDVOICE_ANALYZE_URL`, `BRANDSTYLE_ANALYZE_URL/PDF`.
- `persona-chat` = `chat` (ZERO_COST). F-VAL + merkcontext-input = 0 (geen haak). Geen AI: MEMORY_DECAY/HEARTBEAT/AGENT_TASK/*_CLEANUP.

**⏳ RESTEREND — credit-kostend maar nog niet bedraad (mechanische follow-up, zelfde patroon):**
1. **canvas-orchestrator non-SEO content** (short/medium, ~5 cr): diepe SSE-generator; het output-token-punt is niet-triviaal + niet lokaal testbaar. Vereist een getest insertiepunt bij de generatie-completion (of een post-hoc `chargeAfter` per content-type op een run-scoped idempotency-key). **Grootste resterende gat qua aggregaat-volume.**
2. **Secundaire beeld/video-routes — GECLASSIFICEERD** (belangrijke bevinding 2026-07-07: níet alle "visual"-routes genereren; sommige composen/uploaden → afboeken zou **dubbel-chargen**). Wél bedraad deze batch: **`edit-image`** (Nano Banana = nieuw beeld) + **`consistent-models/[id]/generate`** (count = werkelijk gegenereerde beelden). Status per route:
   - **BILLABLE — ✅ NU BEDRAAD** (2026-07-07, met per-route pad-guards zodat alleen echte generatie boekt): `generate-visual` + `generate-visual-trained` (count = `successful.length`), `generate-feature-visuals` (count = slots met `source==='generated'`; library-prefill telt niet), `generate-video` (alleen het echte-gen-pad; het `existingVideoUrl`-hergebruik-pad skipt), `personas/[id]/generate-image` (alleen het gemini-pad; fallback-avatars skippen), `landing-pages/generate-page` (actie `short`, alleen als `source==='ai'`; heuristic-fallback skipt).
   - **SKIP — NIET chargen** (compositie/upload; inputs zijn al belast óf geen AI-gen): `compose-video` (stitcht al-gegenereerde scene-video's), `hero-image` (zet/vervangt een bestaand beeld als component), `products/[id]/images` (upload), `generate-visual-compose` (compositie — verifieer of 'ie intern gen't; zo niet: skip), `generate-voiceover` (audio — nog geen credit-actie in de taxonomie; aparte `audio`-actie = follow-up).
   - **Les**: classificeer elke route **generate-vs-compose-vs-upload** vóór bedrading (grep op de gen-client is een heuristiek, geen bewijs — `personas/generate-image` matchte niet maar genereert wél). Nooit blind een `chargeAfter` op een "visual"-route plakken.
3. **Pre-flight route-guards** (`enforceCreditBalance`) op de generatie-routes — nu alleen post-hoc afboeking; de blokkade-bij-leeg-saldo hoort op de route-boundary (Fase 1 leverde `enforceCreditBalance`, nog niet overal aangeroepen).
4. **RESERVATION_REAP cron-scheduling** (Vercel Cron) + **deploy-smoke** (echte AI-calls nodig): de hele fase is lokaal niet end-to-end testbaar.

Status `in-progress`: de duurste paden (long-form, agents) + primaire beeld/video zijn afgedekt; het resterende is mechanisch (het patroon + de referentie-routes staan) maar vereist deploy-smoke. Kandidaat om af te splitsen als `pricing-credits-fase2-rest` als je 'm los wilt finaliseren.

## T-review 2026-07-07 (2 code-reviewers, 2 rondes) — Fase-3-gates vóór billing-ON

De hele credit-branch is adversarieel gereviewd. **Ronde 1** vond 2 CRITICAL (gefixt: agent-charge boekte gratis-agents af → `def.billable`-gate; reconcile/release TOCTOU → atomaire `WHERE status='RESERVED' RETURNING`-claim) + WARNINGs (gefixt: subscription-sync STARTER/GROWTH-mapping, reconcile-failure-swallow, chargeAfter-logging, SEO-charge-vóór-COMPLETED). **Ronde 2**: beide reviewers 0 CRITICAL; 1 WARNING gefixt (agent-charge alleen op `COMPLETED`, niet op FAILED/AWAITING_CONFIRMATION-proposal). Smoke 8/8, tsc/lint groen.

**Harde gates die dicht MOETEN vóór `NEXT_PUBLIC_BILLING_ENABLED=true`** (nu veilig omdat billing OFF is; de reviewers bevestigen "safe to merge als scaffolding zolang billing uit blijft"):
1. **Pre-flight-guard bedraden** — `enforceCreditBalance` wordt nergens aangeroepen; alle sites gebruiken post-hoc `chargeAfter({force:true})`. Zonder guard kan het saldo onbegrensd negatief. Bedraad op de generatie-routes.
2. **Credit-grants bedraden** — `grantCredits` heeft geen live caller: geen trial-grant (300cr) en geen maand-plan-grant. Bij billing-ON heeft élke org 0 credits. (Fase 4 trial + Fase 3 plan/topup.)
3. **Billable-agent-content chargen bij confirm** — content-creator eindigt op AWAITING_CONFIRMATION; de echte levering + charge horen ná goedkeuring in de confirm-route, niet op de proposal (nu gated op COMPLETED, dus dormant).
4. **grant/deduct idempotent op P2002** — bij dubbele Stripe-webhook gooit `grantCredits` nu een unique-error i.p.v. idempotent te returnen (saldo is wél veilig via rollback).
5. **RESERVATION_REAP-cron** inplannen zodra het reserve-pad bedraad is (anders lekt `reserved` bij crash).
6. **Ongewirede reserve-edges**: `reserveCredits`-idempotency-stale + `resolveActual` bij `estimate=0` — fixen bij het bedraden van `withCreditMetering`.
7. **Neon `db push`** (alle credit-modellen + enum-waarden) vóór billing-ON.
8. **Resterende billable generatie-routes** bedraden (zie hierboven, met de generate-vs-compose/cache-hit-nuances).

Deferred MINORs (dormant): AGENCY-limietverlaging (15ws/10seats) verifiëren bij cutover; token-accurate SEO-charge i.p.v. vaste 80; `PrismaTx`-cast.
