---
id: content-review-chat-tool
title: Δ-1 Surface D — Brand Assistant `review_content` chat-tool
fase: pre-launch
priority: now
effort: 1 dag
owner: claude-code
status: done
created: 2026-05-09
completed: 2026-05-09
related-adr: 2026-05-08-fval-output-schema-bevindingen, 2026-05-08-locale-routing-brand-voice
related-spec: tasks/_drafts/idea-content-review-chat-tool.md
worktree: -
---

# Probleem

Brand Assistant kan vandaag content niet reviewen — moet user expliciet naar Brand Alignment Tab 3 sturen — terwijl een chat-native review (paste content in chat → krijg findings inline) een natuurlijker conversation-flow geeft. Idea-doc verdict was `needs-validation-first` (Surface C pilot-data + cheaper-alternatief test); user heeft expliciet ge-overruled met "ga door" om de chat-flow alsnog te bouwen vóór pilot-feedback.

# Voorstel

Eén nieuwe `analyze`-tool `review_content` in `claw-tools/analyze-tools.ts` die `runFidelityForExternalContent` engine aanroept (zelfde als Surface C POST endpoint) en een compact JSON teruggeeft met composite-score + threshold-status + top-3 findings. Output bevat `clientAction: 'review_findings_card'` marker zodat ChatArea een `ReviewFindingsCard` rendert ipv generieke "Data retrieved" badge. System-prompt addition met expliciete anti-over-trigger guidance.

# Acceptatiecriteria

- [x] Tool execute draait succesvol op Better Brands workspace (paste-input fluff-tekst → composite-score + findings)
- [x] Workspace-isolation via `ctx.workspaceId` op zowel `runFidelityForExternalContent` als findings-fetch
- [x] Zod input afwijst content < 50 chars met leesbare error
- [x] URL met private-IP (169.254.x.x) → render-friendly error met `failureReason: 'ingest_failed'` + `clientAction` marker behouden
- [x] Top-3 findings sorted HIGH-eerst via expliciete SEVERITY_RANK (Prisma's enum-orderBy is alfabetisch)
- [x] FE: `ReviewFindingsCard` rendert met score + threshold-badge + 3 findings + "View all X findings" deep-link naar Tab 3 (`?tab=review&reviewLogId=...`)
- [x] FE error-variant met `role="status"` voor SR-friendly announce
- [x] System-prompt: anti-over-trigger guidance (alleen op user review-intent, geen auto-trigger op assistent-output)
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors in nieuwe files
- [x] Smoke-test `scripts/smoke-tests/claw-review-tool.ts` — 11/11 pass
- [x] Manual chat-smoke (6 prompts in Brand Assistant) — uitgevoerd door user 2026-05-10 op LINFI workspace; alle 6 paden gevalideerd (zie post-finalize live-test sectie)

# Bestanden die ik aanraak

**Server**:
- `src/lib/claw/tools/analyze-tools.ts` (extend) — nieuwe `review_content` tool, ~120 regels toegevoegd
- `src/lib/claw/context-assembler.ts` (modify) — system-prompt sectie "Content review contract", +14 regels

**Client**:
- `src/features/claw/components/ReviewFindingsCard.tsx` (nieuw) — chat-card render, ~165 regels
- `src/features/claw/components/ChatArea.tsx` (modify) — clientAction routing voor `review_content` tool-result, +20 regels

**Tests**:
- `scripts/smoke-tests/claw-review-tool.ts` (nieuw) — 4 scenarios live tegen BB workspace, ~165 regels

**Documentatie**:
- `tasks/content-review-chat-tool.md` (deze, status updates)
- `docs/changelog.md` (entry #244 bij task-finalize)

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` — geen schema-wijziging nodig (engine + persistence al aanwezig)
- `src/lib/brand-fidelity/external-content-runner.ts` — engine ongewijzigd
- `src/lib/alignment/external-content-ingest.ts` — ingest helpers ongewijzigd
- `src/app/api/alignment/review-external/[reviewLogId]/route.ts` — Surface C GET-endpoint, hergebruikt voor "View all X findings" deep-link
- `src/app/api/claw/chat/route.ts` — chat-route generic tool_use handler, geen nieuwe handler nodig (clientAction marker volstaat)

# Smoke test plan

**Server-side smoke** (`npm run smoke:claw-review-tool` na seed):

1. Paste-input — fluff-rijke NL-tekst → composite-score, top-3 findings, juiste shape
2. Zod-validatie — content < 50 chars geweigerd
3. Workspace-isolation — review uit workspace A onzichtbaar via workspace B filter
4. URL met private-IP → render-friendly error met `failureReason: 'ingest_failed'`

**Manual chat-smoke** (user-action vóór live productie):

1. Open Brand Assistant chat, plak ~200 chars NL fluff-tekst, vraag "is dit on-brand?" → tool fires + `ReviewFindingsCard` rendert
2. Anti-over-trigger: vraag "wat is mijn brand voice?" → tool mag NIET aangeroepen worden
3. URL-test: plak Better Brands publieke URL met "review deze pagina"
4. "View all X findings" deep-link: opent Tab 3 met reviewLogId URL-param
5. Assistent commentariëert kort op findings in eigen voice (niet card-content verbatim herhalen)

# Risico's

- **Over-triggering**: assistent reviewt op user-output zelfs zonder expliciet review-intent → AI-budget verspilling. **Mitigatie**: expliciete anti-over-trigger guidance in system-prompt; manual smoke-test stap 2 valideert.
- **Latency 3-5s blokkeert chat**: F-VAL run-time is langer dan typische chat-respons. User ziet "tool running..." spinner. **Mitigatie**: Anthropic SDK toont al spinner; documenteren in pilot-onboarding.
- **Deep-link Tab 3 niet expliciet geïmplementeerd**: `?tab=review&reviewLogId=...` URL-param wordt niet door BrandAlignmentPage geparsed. **Mitigatie**: graceful fallback (Tab 3 opent leeg), follow-up task voor URL-param parser indien gebruikers deep-link veelvuldig gebruiken.
- **Cost per chat-conversation**: ~$0,03-0,05 per review-call. Bij 25% chat-coverage = $0,20/workspace/maand — verwaarloosbaar in pilot.

# Out of scope

- File-upload via chat-tool (PDF/DOCX) — Tab 3 B-2 follow-up
- Suggestion-application via chat ("apply fix 3") — Δ-1 v2
- Multi-document compare — Δ-1 v2
- Auto-review op elke assistent-output — anti-pattern
- Streaming partial findings tijdens F-VAL run — Anthropic SDK constraint
- Persistente "review-history" sidebar in chat — context-switch is OK voor pilot
- Per-locale override-input — system kiest via BrandVoiceguide.contentLocale
- Custom thresholds via chat-tool — gebruikt runner-default
- URL-param parser in BrandAlignmentPage voor deep-link pre-load — separate task
- Cheaper-alternatief test (system-prompt link naar Tab 3 zonder tool) — kan post-launch alsnog overwogen worden

# Task-finalize hardening (2026-05-09)

5 review-rondes (twee parallelle code-reviewer subagents per ronde, fresh-eyes per ronde) leverden 1 CRITICAL + meerdere WARNINGs op die in-task gefixt zijn:

- **C.1 (round 1)**: deep-link `?tab=review&reviewLogId=...` was broken — Tab 3 leest URL-param niet. Vervangen door instructie-tekst zonder click-target. URL-param parser blijft separate task voor wanneer pilot-feedback aantoont dat deep-link veel gebruikt wordt.
- **W.1 (round 1)**: Zod-schema werd alleen advertised, niet runtime-validated — chat-route forwards `block.input` zonder safeParse. Defense-in-depth `safeParse` toegevoegd aan tool-execute entry; parse-fail returnt zelfde render-friendly error-shape als IngestError.
- **W.2 (round 1)**: `take: 50` op findings-fetch was silent correctness issue (Prisma's enum-orderBy is alfabetisch, dus DB-side cap kon top-3-by-severity missen). Eerst gedropt, in ronde 3 weer toegevoegd als `take: 200` runaway-guard.
- **W.3 (round 1)**: anti-over-trigger system-prompt soft spot — review-intent zonder paste-content kon tool laten falen. Wording aangescherpt naar "ALL of these are true" inclusief "paste-content of URL in dezelfde turn".
- **W.5 (round 1)**: top-3 findings worden gestringified en round-trippen naar Anthropic in elke vervolg-turn — verbose F-VAL output kon mid-conversation token-budget opvreten. `TOP_FINDINGS_TEXT_CAP = 280` toegevoegd.
- **W.6 (round 1)**: smoke-test 3 (workspace-isolation) was tautologisch (FK-cascade voorkomt al cross-workspace findings op DB-niveau). Refactor naar echte tool-level test: roep `tool.execute` aan met andere `ctx.workspaceId` + verifieer dat resulterende reviewLogId nieuw is en findings tot otherWs behoren.
- **W.A2 (round 4)**: `failureReason: 'ingest_failed'` was semantisch fout voor Zod-fail. Type-union uitgebreid naar `'ingest_failed' | 'invalid_input'`; safeParse-pad gebruikt `'invalid_input'`.
- **Round 3**: Zod issues join (alle messages, niet alleen `[0]`); deterministic `orderBy: { id: 'asc' }` op smoke-test workspace-lookups; tweede fixture-string `FLUFF_TEXT_B` voor otherCtx-run om toekomstige content-hash dedup niet vals positief te laten passen.

**Deferred MINORs** (niet fix-waardig binnen Surface D scope):
- `clientAction` marker round-trip in Anthropic chat-history (theoretisch hallucination-risk)
- `requiresConfirmation: false` voor 3-5s + paid run (MVP design-keuze; system-prompt anti-trigger volstaat)
- Severity visual divergence Surface C (CRITICAL/WARNING/SUGGESTION) vs D (HIGH/MEDIUM/LOW)
- `ReviewFindingsCard` lazy-loading via `next/dynamic`
- ReviewErrorCard differentieert (nog) niet tussen `ingest_failed` vs `invalid_input` copy
- SSRF redirect-chain coverage gap in smoke-test (engine-level concern, niet tool-level)
- Smoke-test pollution via persisted reviewLogs (audit-log retention 90 dagen via cron — bekend)

# Post-finalize live-test (2026-05-10 op LINFI workspace)

Manual chat-smoke onthulde 3 productie-issues die buiten de 5-round
finalize-loop zijn gefixt:

1. **Schema-conversie bug** (`e20d238`) — Anthropic rejecteerde tools-payload met `tools.40.custom.input_schema.type: Input should be 'object'`. Onze minimal `zodToJsonSchema` converter (`src/lib/claw/tools/registry.ts`) heeft geen handler voor `discriminatedUnion` → viel door naar string-fallback. Schema vervangen door flat `z.object` met optional content/url + cross-field check in execute.

2. **Verbatim-paste extractie** (`91a4d8d`) — model passte de gebruikers-verzoek-zin (~32 chars) als `content` ipv de geplakte tekst eronder. Tool-description aangescherpt: "copy the USER'S PASTED TEXT VERBATIM and IN FULL"; system-prompt restate.

3. **Content-quality gatekeeping** (`91a4d8d` soft + `1c6e856` hard) — model weigerde tool aan te roepen op generieke fluff omdat "deze tekst lijkt niet over jullie merk te gaan". F-VAL is juist bedoeld om elke tekst tegen brand-profiel te scoren — een lage score op generieke copy is het signaal. Eerst soft anti-gatekeep regel; toen model bleef weigeren, vervangen door directieve prompt met concrete voorbeelden + lijst van 5 verboden NL-zinnen ("of moet je nog de eigenlijke tekst delen", "lijkt niet over [brand] te gaan", etc.) + CORRECT/WRONG voorbeeld-paragraaf.

**6 manual smoke-tests gevalideerd**:

| # | Path | Resultaat |
|---|------|-----------|
| 1 | Paste fluff-NL (~350 chars) | 63/100, top-findings cliché-VOICE + buzzwords |
| 2 | Review-intent zonder paste | Tool niet fires, vraagt om paste/URL |
| 3 | Brand-vraag zonder review | BrandVoiceguide context, geen tool-call |
| 4 | Te korte paste (<50 chars) | Model self-route naar `analyze_brand_completeness` (Zod-pad latent verified, model semantic-gating intercepts eerst) |
| 5 | URL linfi.nl homepage | 70/100, "luxe" anti-pattern overtreding gedetecteerd — productie-actionable |
| 6 | Private IP 169.254.169.254 | Model-laag refusal (cloud IMDS recognized), tool-laag SSRF dekkend via server-smoke |

**Layered defense bevestigd**: model self-routes via semantische intent-detectie BEFORE Zod min(50) of SSRF-engine getriggerd worden. Defense-in-depth guards aanwezig maar zelden bereikt — productie-flow is robuuster dan verwacht.

**Bonus productie-insight**: LINFI's eigen homepage scoort 70/100 door "luxe" 3x te gebruiken (staat in voice-guide anti-pattern lijst). Direct actionable copy-fix voor user.

# Notes

**Phase -1 Gates resultaat**:
- Simplicity Gate: PASS (5 files, geen nieuwe dirs, geen abstractielagen)
- Anti-Abstraction Gate: PASS (directe primitives — `runFidelityForExternalContent`, `ingestPaste`, `ingestUrl`, bestaand `ClawToolDefinition` pattern)
- Integration-First Gate: PASS (tool-result-shape mock-bare; FE en server-tool ontwikkelbaar onafhankelijk via JSON-contract)

**ADR-noodzaak**: NEE
- Geen Prisma schema-wijziging
- Geen nieuwe `src/lib/<module>/` directory
- Geen nieuwe library-install
- Geen pattern-introductie buiten conventies (volgt analyze-tools + clientAction patterns)

**Verdict-override**: idea-doc verdict was `needs-validation-first` met twee voorwaarden (Surface C pilot-data + cheaper-alternatief test). User heeft expliciet "ga door" gezegd zonder pre-build validatie. Risico: indien pilot-data toont dat chat-flow weinig wordt gebruikt, is Surface D wasted-effort. Mitigatie: build is klein (1 dag), live-deploy + observatie kan signalen leveren binnen 30 dagen.

**Cross-links**:
- Idea-doc: `tasks/_drafts/idea-content-review-chat-tool.md`
- Surface C task: `tasks/done/content-review-tab-3-ui.md` (entry #243)
- Δ-1 sub-cluster A+B engine: changelog entry #239
- ADR-1 BrandReviewFinding model: `docs/adr/2026-05-08-fval-output-schema-bevindingen.md`

**Volgende stap na done**: Surface E (PublishGate findings-block) idea-doc + technical-planner promotion, of defer tot pilot-feedback over Surface C+D.
