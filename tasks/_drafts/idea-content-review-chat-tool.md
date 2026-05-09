---
id: content-review-chat-tool
title: Δ-1 Surface D — Brand Assistant `review_content` chat-tool (add_review_findings)
status: pending-tech
created: 2026-05-09
verdict: needs-validation-first
---

# Probleemstelling (1 zin)

Brand Assistant kan vandaag content niet reviewen — moet user expliciet naar Brand Alignment Tab 3 sturen — terwijl een chat-native review (paste content in chat → krijg findings inline) een natuurlijker conversation-flow geeft voor pilot-merken die strategie-vragen stellen ZÓ uit een AI-pitch-discussie.

# WHO — Doelgebruiker

**Rol**: brand-strategist of agency-medewerker die mid-conversation met Brand Assistant content wil checken — bijvoorbeeld na "schrijf een LinkedIn-post over X" wil de output direct reviewen, of plakt klant-aangeleverde tekst tijdens een sparring-sessie.
**Schaal**: alle pilot-merken (n≈10), naar verwachting 5-15 chat-reviews per workspace per week.
**Acuut segment**: agency-medewerker die in pilot-week 1 met Brand Assistant aan een campagne-pitch werkt — voor hen is conversation-flow > tab-switching de UX-winst.

## JTBD-narratief

> "Toen ik in een Brand Assistant chat aan het brainstormen was over een LinkedIn-post, vroeg ik of de output 'on-brand' was. De assistent kon alleen subjectief antwoorden — geen F-VAL score, geen findings. Ik moest de output kopiëren, naar Brand Alignment Tab 3 navigeren, plakken, en dan terug naar de chat met de uitkomst om verder te brainstormen. Drie context-switches voor één review."

## Evidence

- `tasks/done/content-review-tab-3-ui.md` — Surface C is gemerged 2026-05-09 (entry #243). Engine + API zijn klaar; Surface D is dezelfde engine via andere consumer.
- `src/lib/claw/tools/write-tools.ts:66` — bestaande `writeTools[]` array met `update_asset_content`, `update_persona`, etc. is precies de plek voor een nieuwe tool.
- `src/app/api/claw/chat/route.ts:212` — chat-route handelt al `tool_use` blocks via Anthropic SDK; `tool_result` rendering is al gewired.
- `tasks/done/content-review-tab-3-ui.md` Notes-sectie + Red Team Review — scope-trim aanbeveling: na Surface C pilot-feedback bouwen, niet upfront.

# WHAT — Probleem (niet oplossing)

Drie waarneembare gebreken vandaag:

1. **Context-switching tax**: review-actie vereist 3 stappen (kopieer → tab-switch → paste). Voor mid-conversation-review onnatuurlijk.
2. **Geen chat-history van reviews**: review-resultaten leven in Tab 3 (per-session) — chat heeft geen reference dat user X'e content reviewde tijdens deze conversation. Latere "wat zei je over die LinkedIn-post?" werkt niet.
3. **Brand Assistant kan eigen output niet self-checken**: nu user vraagt "is dit on-brand?", antwoordt assistent subjectief. Met `review_content` tool kan assistent objectief score + findings teruggeven, in eigen voice gepresenteerd.

# WHY-NOW

- **Surface C is live** — engine + API + UI liggen op `origin/main` (entry #243). Surface D is goedkope incremental delivery (één extra consumer op dezelfde endpoint).
- **Pilot-positionering**: chat-native review-flow is een sterk demo-argument tegenover "Tab 3 alleen" — onderscheidt Branddock van plain F-VAL-tools.
- **claw-page-awareness foundation** is op main (entry #237) — `fill_form_fields` patroon laat zien hoe chat-tools UI-state kunnen muteren; review-tool kan analoog werken (geen mutate maar render-injection).

Triggers:
- Surface C is gemerged en wacht op pilot-smoke
- Bestaande Δ-1 engine + ingest is workload-getest (POST /review-external)
- Red Team Review aanbeveling: scope-trim = idea-doc nu OK, bouw na pilot-feedback

# SUCCESS METRICS

**Primaire metric**: % chat-conversations met minstens één `review_content` tool-call binnen 30 dagen na livegang. Doel: ≥25% (kwart van conversations gebruikt review-flow).

**Secundair**:
- Average findings-count per chat-review (proxy voor review-kwaliteit; te laag = false-positief-arm, te hoog = noise)
- Tool-call success-rate ≥95% (HTTP 200 + parsed JSON)
- Chat-followup-rate na review (welk % van reviews leidt tot een vervolg-prompt zoals "verbeter sectie 2") — duidt op productieve flow

**Counter-metric** (mag NIET kapotgaan):
- Chat-respons-latency p95 ≤ 8s (F-VAL run + chat-stream-overhead). Surface D kan blokkerend voelen anders.
- AI-cost per chat-conversation ≤ huidige + €0,05/conversation (één review per conversation gemiddeld)
- Workspace-isolation: 0 cross-workspace lookups via tool-call

# CONSTRAINTS

## Hard
- **Workspace-isolation**: tool execute moet via `ctx.workspaceId` filteren — Anthropic SDK krijgt geen direct DB-access. Path: `tool execute → server-side runFidelityForExternalContent → workspace-scoped findings`.
- **Cost-budget**: 1 F-VAL run = ~$0,03-0,05 (Anthropic Sonnet judge call). Bij 25% chat-coverage = ~5 reviews/workspace/week × $0,04 = $0,20/workspace/maand. Verwaarloosbaar binnen pilot.
- **Latency**: F-VAL run is 3-5s typisch. Chat blokkeert tijdens tool_use. Geen streaming-mid-toolcall mogelijk via Anthropic SDK; user ziet "tool running..." spinner.
- **Tijd**: pre-launch — 2-3 dagen MVP wanneer Surface C pilot-feedback positief is.

## Soft
- Hergebruik bestaande `runFidelityForExternalContent` engine
- Output-format compact JSON (top-N findings, niet alle)
- Volg `update_*` tool-conventie (Zod input + ctx-scoped execute)
- Voor render-laag: chat-message receives findings-JSON, render via existing markdown of custom Card component

## Must NOT do
- Geen file-upload via chat-tool (out-of-scope, blijft Tab 3 voor B-2)
- Geen multi-turn refinement binnen één tool-call ("review opnieuw met andere locale" wordt nieuwe tool-call, geen state)
- Geen automatic suggestion-application (alleen surfacing — user beslist)
- Geen URL-fetching in tool zonder server-side ingest-laag (SSRF-mitigatie zit in `external-content-ingest.ts`)
- Geen findings-storage **buiten** ContentReviewLog (gebruik dezelfde persistentie als Surface C)
- Geen real-time streaming van findings tijdens F-VAL run (overhead te groot)

# SCOPE

## In-Scope (MVP, 2-3 dagen)

**Tool-laag** (`src/lib/claw/tools/`):
- Nieuwe `review_content` (of `add_review_findings`) tool in `write-tools.ts` of nieuwe `analyze-tools.ts`-entry
- Zod-input: `{ content: string (50-50000 chars) | url: string }` discriminated union
- Execute: roept `runFidelityForExternalContent` aan met `sourceType: 'paste'` of `'url'`, returnt `{ reviewLogId, compositeScore, thresholdMet, findingsCount, topFindings: [...3-5 most severe] }`
- Workspace-isolation via `ctx.workspaceId`
- Output-format: compact (top-3 of top-5 findings only, full set blijft via `GET /[reviewLogId]` opvraagbaar)

**Chat-route extension** (`src/app/api/claw/chat/route.ts`):
- Tool-result handler render-spec — als `toolName === 'review_content'`, voeg een `clientAction: 'review_findings_card'` toe naast de standaard tool_result, zodat de FE een card kan tonen ipv plain JSON
- (Of: laat assistent zelf de output naturally renderen in markdown)

**FE chat-card** (`src/features/claw/components/`):
- Nieuwe `ReviewFindingsCard.tsx` component die compact score + top-N findings rendert
- Mount-trigger via `clientAction === 'review_findings_card'` handler (zelfde patroon als `MutationConfirmCard`)
- Optionele "View full findings →" link naar Tab 3 met reviewLogId pre-loaded

**System-prompt addition** (`src/lib/claw/context-assembler.ts`):
- Surface deze tool aan AI via system-prompt: "Use review_content when the user asks if their content is on-brand, wants F-VAL feedback, or pastes copy with implicit review-intent."
- Prompt-engineering: avoid over-triggering (assistent mag NIET elke output zelf reviewen — alleen op user-request)

## Out-of-Scope (expliciet NIET)

- File-upload via chat (PDF/DOCX) — Tab 3 B-2 blijft de plek
- Suggestion-application via chat ("apply fix 3") — separate task
- Multi-document compare via chat — Δ-1 v2
- Auto-review on every assistant-output — over-trigger risico
- Streaming partial findings during F-VAL run — Anthropic SDK constraint
- Persistente "review-history" sidebar in chat — context-switch is OK voor pilot
- Per-locale override-input via chat-tool (system kiest via BrandVoiceguide.contentLocale)
- Custom thresholds via chat-tool — uses runner-default
- Multi-turn "now check the same with judge=false" — separate tool-calls
- Cross-workspace review (e.g. "review competitor X content") — out

> Out-of-Scope > In-Scope: ✓ (10 vs 4)

# AANNAMES

- **A1** — Pilot-users vragen genoeg "is dit on-brand?" om ≥25% chat-coverage te halen — bewijs: ervaring uit andere AI-tools (ChatGPT-style copy-review prompts zijn populair). Onbewezen voor Branddock-specifieke pilot. **Validatie via Surface C pilot-data**: telling van "review-intent" prompts in chat-history vóór D-build. Indien <10% van chat-conversations review-intent prompts bevat → Surface D heeft lage ROI, defer.
- **A2** — Compact top-N findings (3-5) is genoeg voor chat-context — bewijs: chat-output-budget ~2K tokens, full findings-JSON kan 5-10K zijn. Onbewezen of users top-3 voldoende vinden of altijd "View full" willen. Validatie post-launch.
- **A3** — Workspace-isolation via `ctx.workspaceId` is voldoende — bewijs: bestaand pattern in `update_*` tools. Onbewezen alleen indien een nieuw bug-pad ontstaat. Smoke-test verplicht.
- **A4** — F-VAL latency 3-5s blokkerend is acceptabel in chat — bewijs: chat verwacht "thinking" pauzes; Brand Assistant heeft al langere AI-call latencies. Verifieer via UX-test in pilot.
- **A5** — `clientAction: 'review_findings_card'` patroon werkt analoog aan bestaande `fill_form_fields` flow — bewijs: claw-page-awareness foundation (entry #237). Onbewezen voor non-form context. Validatie via build-time smoke.

# ACCEPTATIECRITERIA (MVP)

- [ ] Given een chat-conversation in Brand Assistant, When user plakt 200 chars NL-tekst en zegt "is dit on-brand?", Then assistent roept `review_content` aan en chat toont `ReviewFindingsCard` met composite-score + top-3 findings
- [ ] Given een chat-tool-call met content uit andere workspace (poging tot lekken), When tool execute draait, Then tool retourneert "no permission" zonder findings te lekken
- [ ] Given een tool-call met >50000 chars content, When execute draait, Then tool retourneert leesbare error "content too long" zonder F-VAL run te starten
- [ ] Given een tool-call met url die intern/private IP is, When ingest faalt, Then tool retourneert "URL geblokkeerd: {reason}" + suggestie voor user
- [ ] Given een succesvolle review, When user klikt "View full findings →" in card, Then Brand Alignment Tab 3 opent met reviewLogId pre-loaded (URL-param)
- [ ] Given assistent gebruikt review_content tool, When prompt-engineering test draait (synthetische 30-prompt set), Then false-positive-rate <15% (assistent reviewt niet ongevraagd op output zonder user-intent)
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors in nieuwe files
- [ ] Smoke-test `scripts/smoke-tests/claw-review-tool.ts` simuleert tool-call + verifieert output-shape + workspace-isolation
- [ ] Manual chat-smoke: 5 prompts in Brand Assistant — review-intent triggert tool, andere prompts niet

# EERSTE TAAK (morgen startbaar)

**Pilot-priority-check** (out-of-code, ~30 min): vraag 2-3 pilot-leads:
1. Hoe vaak vragen ze "is dit on-brand?" in een typische sessie?
2. Zou Tab 3 vs chat-flow voor hun gevoel materieel verschil maken?
3. Welke vorm van findings willen ze: compact (top-3) of volledig?

Bij positieve respons (≥2 leads waarderen chat-flow): door naar feature-planner promotion → technical-planner build.

Direct daarna pre-build technical: small spike op `clientAction: 'review_findings_card'` pattern — verifieer dat MutationConfirmCard-architectuur werkt voor non-mutation render-only cards (~1u prototype in claw-tools).

---

# Red Team Review

## Zwakste schakel

**A1 — pilot-users vragen genoeg "is dit on-brand?"** Als Surface C pilot-data toont dat reviews zelden in een chat-conversation thuishoren (bv. omdat strategy-discussions strikt afgescheiden zijn van content-creation in user-mental-model), dan is Surface D een nice-to-have die geen ROI heeft. Hele build-investment kan verspilling worden. Validatie pre-build is essentieel.

## Pleidooi tegen dit plan

**Surface C is dezelfde feature in een andere wrapper**. Engine, API, persistence, findings-format zijn 100% identiek. Surface D is ~50% UX-werk (chat-card + tool-naming + system-prompt-tweak) bovenop ~50% claw-architectuur-touchpoints (chat-route handler, registry, FE-action-routing). Voor een pilot waar Tab 3 al werkt, is "kun je niet gewoon een link in chat plakken naar Tab 3?" genoeg om context-switch-tax te halveren — geen nieuwe tool nodig. Plus: Brand Assistant chat-context is duurder (extra Anthropic-call per review) dan direct Tab 3 hit.

Cheaper alternatief: in Brand Assistant system-prompt instrueren "wanneer user copy paste'd om te reviewen, geef link naar `/brand-alignment?tab=review&content=<url-encoded>`". Geen nieuwe tool, geen chat-card, geen FE-action — alleen prompt-engineering. Test eerst dat met pilot voordat je Surface D bouwt.

## Wat zouden we leren door NIET te bouwen

Door Surface C alleen draaien voor 30 dagen leren we:
- Hoe vaak users daadwerkelijk willen reviewen
- Wat de gemiddelde review-volume is per workspace
- Of users vragen "kan ik dit ook in chat doen?" (signaal van waarde) of niet
- Of de cheaper-alternatief (link in chat) genoeg is

Risico van uitstel: Brand Assistant blijft conversation-incomplete voor review-flow. Maar pilot-users hebben WEL Tab 3 — niet kapot, alleen suboptimaal.

## Verdict van de planner

**needs-validation-first** — twee voorwaarden vóór technical-planner promotion:

1. **Pilot-data van Surface C eerst** — minimaal 30 dagen of 5 pilot-merken aktief gebruik. Telling van review-volume + signal-strength voor "chat-versie zou helpen". Bij <10% chat-conversations met review-intent: defer of cancel.
2. **Cheaper-alternatief getest** — voor we Surface D bouwen, probeer system-prompt "verwijs naar Tab 3 met pre-fill" oplossing. Als die genoeg blijkt: Surface D cancellable.

Bij beide groen: technical-planner kan promoten met scope zoals hierboven. MVP-effort 2-3 dagen.

# 5-Punts Stop-Conditie

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (≥25% chat-coverage met review_content)
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (10 vs 4)
- [x] MVP-acceptance-criteria concreet (Given/When/Then)
- [x] Eerste taak morgen startbaar (pilot-priority-check, out-of-code)

# Volgende stap

Wachten op Surface C pilot-data (≥30 dagen of ≥5 merken). Tussentijds: cheaper-alternatief in Brand Assistant system-prompt testen. Bij beide signalen positief: technical-planner promoten naar uitvoerbare task.
