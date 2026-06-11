# Prompt-audit Branddock — alle LLM-prompts, zes defect-families

> **Datum**: 2026-06-11 (gestart 2026-06-10)
> **Aanleiding**: tijdens een test bleek een prompt kapot — teksten werden afgebroken, gaven verkeerde opdrachten, waren niet volledig of stonden in de verkeerde volgorde. Daarnaast: output-kwaliteit moet structureel zeer hoogwaardig worden.
> **Methode**: 3 workflow-rondes met in totaal 132 subagents — 23 cluster-auditors over álle prompt-domeinen, adversariële verificatie van elke CRITICAL/HIGH-bevinding (incl. live API-tests en DB-queries), en een completeness-critic die zelf greppend gaten zocht (slotronde dichtte er 7).
> **Eindstand**: 409 bevindingen beoordeeld → **14 CRITICAL / 53 HIGH / 220 MEDIUM / 114 LOW** staand; 8 bevindingen adversarieel verworpen (waarvan 3 met live API-bewijs).
> **Volledige bevindingenlijst**: bijlage onderaan dit document (alle 409, per cluster, met file:line).

---

## 1. Managementsamenvatting

In gewone taal: de prompts zelf zijn inhoudelijk vaak goed geschreven (sterke frameworks, duidelijke rubrics), maar **het systeem eromheen breekt ze**. De vier geteste symptomen hebben elk een harde, bewezen oorzaak — en het zijn geen incidenten maar patronen die op tientallen plekken terugkomen. De kern: prompt, token-budget, output-schema en persist-laag worden los van elkaar onderhouden en spreken elkaar tegen.

| Symptoom uit de test | Bewezen hoofdoorzaak |
|---|---|
| **Teksten afgebroken** | `getMaxTokensForComponent` matcht geen enkel echt componentType → álle long-form bodies op 2.048 tokens; geen `stop_reason`-check in 3 van de 4 client-paden → afgekapte tekst wordt stil opgeslagen |
| **Verkeerde opdrachten** | 17+ content-types zonder component-groepen krijgen letterlijk *"components array MUST contain exactly 0 entries"*; prompts die zichzelf tegenspreken (ebook "3000-3500, niet 5000+" vs registry "Minimum 5000 — strictly adhere") |
| **Niet volledig** | Zod-schema dat juist bij góede model-output velden wegstript (coreMessage/proofPoints/reasonToAct); email-sequences van 5-7 mails geperst in één veld met 5.000-char cap |
| **Verkeerde volgorde** | `persistRegeneratedGroup` zet elke geregenereerde groep achteraan (order = maxOrder+1) — volgorde verschuift blijvend bij elke regenerate |

Twee systemische ontdekkingen die boven de symptomen uitstijgen:

1. **De F-VAL ad-judge-pijler beoordeelt altijd lege content** (datacontract-mismatch in `ad-validation/runner.ts`) — alle Ad Strength-scores zijn betekenisloos én worden gecachet.
2. **Configuratie-illusie**: het exploration-systeem heeft vijf promptkopieën waarvan de admin-bewerkbare `reportPrompt` (UI: *"Report prompt is required"*) **dood** is — het live rapport gebruikt een hardcoded Engelse prompt zonder brand-context. Admin-instellingen suggereren controle die niet bestaat.

---

## 2. Methode en betrouwbaarheid

- **Ronde 1** (16 clusters gepland, 12 voltooid): elke auditor las zijn prompt-domein integraal + call-sites, en toetste op 6 defect-families: truncation / instruction / schema / ordering / quality / infra.
- **Ronde 2**: de 4 gesneuvelde clusters + batch-verificatie van 64 ongeverifieerde CRITICAL/HIGH-bevindingen + completeness-critic.
- **Ronde 3**: 7 gap-auditors op wat de critic miste (geseedde exploration-prompts, raw-fetch persona-route, FAL-directe paden, enrichment-fragmenten, canvas-formatter-band, eval-judges/locale, prompt-injection) + verificatie.
- **Adversariële verificatie**: elke CRITICAL/HIGH is door een onafhankelijke skeptic herlezen in de code, met opdracht te wéérleggen. 8 bevindingen sneuvelden; 26 kregen een severity-correctie. Drie verificateurs deden **live API-tests** en **DB-queries**.

**Belangrijke empirische correctie op gotcha 2026-05-24**: `claude-sonnet-4-6` + `temperature` geeft vandaag **HTTP 200** (tweemaal onafhankelijk live getest); alleen `claude-opus-4-7` geeft de 400 *"temperature is deprecated"*. De DAM-auto-tagger werkt aantoonbaar (181 MediaAssets met aiDescription in de live DB). Drie als CRITICAL aangemelde "temperature breekt feature X"-bevindingen zijn daarom gedegradeerd naar **MEDIUM/latent** — de echte bevinding is dat de guard als twee gedupliceerde inline-regexes bestaat en op minstens 5 paden ontbreekt (de beloofde centrale `isTempDeprecatedModel`-helper is er nooit gekomen). Wie een workspace op Opus 4.7+ zet, raakt die paden wél.

---

## 3. De 14 CRITICAL-bevindingen

Alle geverifieerd (confidence high). Volgorde = aanbevolen fix-volgorde binnen Fase 0/1.

### Truncation (symptoom: afgebroken)

**C1 — Long-form bodies stil afgekapt op 2.048 tokens.** `src/lib/studio/component-prompt-builder.ts:137-151` — `getMaxTokensForComponent` checkt een Set met namen die geen enkel echt componentType matchen; alles valt terug op 2.048 (~1.500 woorden) terwijl prompts 1.000-4.000+ woorden eisen. Geen `stop_reason`-check → mid-zin afgebroken en stil gepersist. *Fix*: echte groepsnamen/registry-match + ≥8K voor body-groepen + truncatie-detectie in alle drie de clients.

**C2 — Week-themes kunnen nooit compleet**: `brief-week-theme-prompt.ts:21,74,167` — 6s timeout + 1.500 maxTokens vs "exactly N themes" voor campagnes > ~6 weken → permanent "Weekly themes unavailable" of afgekapte kalender. *Fix*: budget schalen met weeks + timeout koppelen, of async pre-genereren.

### Contract-gaten (symptoom: verkeerde opdrachten / niet volledig)

**C3 — 17 types genereren met "exactly 0 entries".** `canvas-orchestrator.ts:2366,2377` + `canvas-context.ts:229-291` + `component-templates-fallback.ts:33-100` — alle 4 sales-, 7 pr-hr- en 6 video-types hebben geen component-groepen; de prompt eist dan letterlijk een lege components-array terwijl de systemprompt een compleet document eist. Model verzint structuur of levert niets. **Dit is vrijwel zeker de geteste kapotte prompt.** *Fix*: fallback-templates per type (afgeleid van `constraints.requiredSections`) + guard op `textGroups.length === 0`.

**C4 — Email-sequences (5-7 mails, 3 varianten) in één body-veld met 5.000-char cap.** `email.ts:127,278,362`. *Fix*: sequence-groepen (`email-1-subject`/`email-1-body`/…) of `sequence_item` groupType (bestaat al in `component-registry.ts:139-144`).

**C5 — faq-page/comparison-page/microsite in landing-page-groepen geperst.** `canvas-context.ts:263-268` — geen slot voor Q&A's, matrix of pagina's; model dumpt in `benefits-list` of laat weg. *Fix*: eigen componentTemplates per website-type.

### Schema-mismatches (symptoom: niet volledig)

**C6 — Zod stript coreMessage/proofPoints/reasonToAct bij gehoorzame output.** `strategy-blueprint.types.ts:1245-1256` — velden ontbreken in `strategyFoundationSchema`; alleen bij Zod-FALEN (raw passthrough) overleven ze. Review-kaarten leeg, keyMessages leeg. *Fix*: 3 optionele velden toevoegen (ook in het Gemini-responseSchema r1572-1736).

**C7 — Ad-judges beoordelen altijd lege content.** `ad-validation/runner.ts:75-92` — drievoudig fout datacontract (query + map-key) → `ctx.groups` altijd leeg → judges zien "(empty)", scores betekenisloos, gecachet via contentHash. *Fix*: query/key-patroon van `canvas-orchestrator.ts:941-943` overnemen + guard die lege groups weigert + bestaande scores invalideren.

**C8 — SEO Step 6: markdown geëist, JSON afgedwongen.** `seo-pipeline.ts:470,484-489` — de draft-step loopt door de structured-JSON-caller: óf parse-crash op de hele pipeline, óf een JSON-blob als "draft" in steps 7/8. *Fix*: non-structured completion of expliciet `{ "draft": "..." }`-contract. (Variant B-generator heeft hetzelfde conflict — HIGH.)

**C9 — Claw mist `pageContext.contentType` in request-Zod.** `claw/chat/route.ts:54-77` — LP-edit-instructies worden nooit geïnjecteerd; system-prompt vertelt het model dat de pagina níet bewerkbaar is terwijl de #318-tools het tegendeel zeggen. *Fix*: één regel Zod.

**C10 — Alignment "Apply Fix" vernietigt frameworkData.** `alignment/fix-generator.ts:526-531` — dot-notation fix vervangt het hele Json-veld door een platte string; framework-UI van het asset breekt. *Fix*: read-modify-write op het sub-pad; tot die tijd frameworkData-writes weigeren.

### Orkestratie (symptoom: verkeerde volgorde / kapotte output)

**C11 — Silent auto-iterate dupliceert titel/meta/CTA de body in.** `canvas-orchestrator.ts:1550-1553,909,938-1002` — bij composite < 70 wordt een blob-rewrite van álle groepen in het langste component gepersist; titel verschijnt dubbel, CTA midden in de body, andere slots houden oude tekst. *Fix*: rewrite per-group of alleen de eigen content als baseline; minimaal skippen bij >1 text-group.

### Configuratie-illusie & export (nieuw in slotronde)

**C12 — Exploration-rapport: admin-prompt dood, Engels geforceerd, brand-context genegeerd.** `exploration-llm.ts:321-358` — het live rapport gebruikt een hardcoded prompt ("Write in English") en negeert `config.reportPrompt`/model/temperature volledig, terwijl de admin-UI de reportPrompt verplicht stelt. NL-exploratie → Engels rapport. Er bestaan **vijf** promptkopieën (prisma/seed.ts, scripts/seed-exploration-configs.ts, config-resolver defaults, hardcoded report-prompt, dead conversational prompts). *Fix*: één promptbron, config echt consumeren, locale-guard.

**C13 — Strategic implications als rauwe JSON-blob in klant-PDF's.** `exportPersonaPdf.ts:229-233` + `buildCompositeBrandPdf.ts:702-703` — persona-PDF en brand-kit-PDF renderen `[{"category":"Messaging",...}]` letterlijk. Bron-route (`strategic-implications/route.ts`) is bovendien een raw-fetch naar Anthropic buiten alle clients om, zonder brand-context en zonder locale-guard. *Fix*: parse → geformatteerde implicaties; route door `anthropicClient`.

**C14 — Style Transfer mapt vrije tekst naar enum-veld → 422 bij elk normaal gebruik.** `media/ai-images/optimize/route.ts:83-87`. *Fix*: prompt-veld vs target_style scheiden per provider-schema.

---

## 4. Systemische patronen (de rode draden door 53 HIGHs + 220 MEDIUMs)

**T1 — Truncatie-discipline ontbreekt structureel.** Geen `stop_reason`/`finish_reason`-check in `dispatch-completion.ts`, `ai-caller.ts` (alle 3 providers) en de Claw-loop; thinking-budget (5.000) wordt van maxTokens (6.000) afgetrokken → ~1.000 tokens netto; `resolveMaxTokens` mist types (linkedin-article/-newsletter); judge-input hard afgekapt op 12K chars zonder marker; CTA prompt-contract 80 chars vs storage-clamp 48. Het STEP_BUDGETS-patroon (maxTokens↔timeout gekoppeld) bestaat alleen in de SEO-pipeline.

**T2 — Prompt en component-contract worden los onderhouden.** Naast C3/C4/C5: tiktok-script medium-row zonder `isScriptedScene` overschrijft de werkende scene-fallback; linkedin-article op organic-post-groepen ("body max 3000 chars" vs "1000-2000 woorden" in dezelfde prompt); few-shot voorbeelden die hun eigen char-limits overschrijden (search-ad 105>90, facebook-ad 153>125).

**T3 — Validatie is warn-only of pervers.** `validateOrWarn` throwt nooit; `normalizeRubricResponse` zegt "Reject malformed" maar accepteert alles (malformed judge-JSON → stil composite 50 op de 45%-pijler); regen-pad doet strikte `.parse()` vóór de lenient normalisatie die juist moest repareren; auditor-output volledig ongevalideerd (fout enum crasht de audit-view permanent).

**T4 — Volgorde-defecten.** `persistRegeneratedGroup` (achteraan + mist het poll-char-cap-vangnet + markdown-instructie voor ≤30-char velden); hero-instructie achter een al-complete prompt geplakt (twee concurrerende Subjects, hero-info in de truncatiezone); kritieke instructies vóór 40K tekens framework-dump in strategy-prompts.

**T5 — Taal en jargon.** `locale-instruction.ts` kent maar 7 talen — elke andere workspace-taal krijgt stil géén taal-guard (fix-blocker voor alle "voeg taal-guard toe"-fixes); strategy-chain heeft geen output-taal-contract (quick-concept forceert zelfs Engels); exploration-rapport forceert Engels; voice-analyzer gebruikt `buildLocaleInstruction` niet; OBSERVED:/RECOMMENDED:-markers lekken via `getBrandContext` (r1328-1337) en `workspace-context-resolver` (rauwe `JSON.stringify` van photographyStyle, omzeilt de imagerySavedForAi-gate) in alle image/video-prompts — de stripAnalyzerMarkers-fix van 2026-06-10 dekt alleen het LP-brand-tokens-pad; Effie-jargon leeft nog in UI-labels en wordt via feedback-compilatie opnieuw geïnjecteerd.

**T6 — Configuratie-illusie.** Exploration (C12) is het ergste geval, maar ook: admin-configureerbare exploration model/temperature/maxTokens genegeerd; admin-prompt-routes zonder enige validatie; Prompt Registry dekt een subset van de prompts; user-settings (emailCount, pageCount, vraagaantal, duur) die hardcoded template-waarden tegenspreken of nergens geconsumeerd worden; `DELIVERABLE_TYPE_SETTINGS` heeft nul importers.

**T7 — Guard-inconsistentie.** Elke geleerde les is op één pad gefixt en op zusterpaden niet: temperature-guard (2 inline-regexes, ≥5 paden zonder), sanitizers (scrubStrategyLayer dekt niet het concept-pad), marker-stripping (alleen LP-pad), char-cap-vangnet (alleen linkedin-poll, niet bij regenerate), STEP_BUDGETS (alleen SEO). Raw-SDK/raw-fetch-paden omzeilen álle guards (photo-brief, dam-auto-tagger, strategic-implications, fal.subscribe-routes — incl. een no-op `negative_prompt` op het hele trained-LoRA-pad en guidance_scale 7,5 waar de endpoint-default 2,5 is).

**T8 — Eval/judge-integriteit.** Ad-judges scoren lege content (C7); de golden-sets "merge-gate" kan nooit falen (`|| echo` slikt de promptfoo-exit-code; 70%-threshold bestaat alleen als tekst); copy-image-coherence-judge dood op het hero-pad; geen schaal-afdwinging op creative-critic (gate neemt 0-100 aan). Wie de kwaliteit omhoog wil, moet eerst de meetlat repareren.

**T9 — Prompt-injection via gescrapete content (laag-risico, wel reëel).** Scraped bodyText gaat zonder delimiters/fencing in competitor-/scanner-prompts; een kwaadwillende externe site kan velden vervuilen die via `getBrandContext` álle content-prompts bereiken, en valse CATEGORY_REPOSITIONING MAJOR-events + e-mail triggeren. Beide MEDIUM (blast-radius beperkt, geen tool-access), maar fencing is goedkoop.

---

## 5. Verbeterplan

Gefaseerd; fase 0-2 adresseren de testklachten, fase 3-5 maken de kwaliteit structureel hoogwaardig. Effort-schattingen excl. review/smoke.

### Fase 0 — STOP-GATE quick wins (~2-3 dagen)
Kleine fixes met direct user-zichtbaar effect; allemaal ≤ ~1 uur per stuk:
- C6 (3 Zod-velden), C9 (1 regel Zod), C8 (step-6 routing), C14 (prompt/target_style), C2 (budget×weeks), C13-render (JSON→tekst in 2 PDF-builders), C10-stop (frameworkData-writes weigeren tot read-modify-write er is).
- Regen-pad: `persistRegeneratedGroup` order behouden + poll-cap + plain-text-instructie voor korte velden (3 HIGHs in één file-cluster).
- LP-rewrite CTA-identiteit: één zin in `VARIANT_REWRITE_SYSTEM_PROMPT` + normalisatie na parse.

### Fase 1 — Truncatie-discipline centraal (~3-4 dagen)
1. **Truncatie-detectie in de clients** (`anthropic-client`, `openai-client`, `gemini-client`, `dispatch-completion`, `ai-caller`): `stop_reason`/`finish_reason` checken → onderscheiden error (structured) of retry-met-verdubbeld-budget (tekst). Dit is de hoogste-hefboom-fix van de hele audit: hij maakt élk toekomstig budget-defect zichtbaar i.p.v. stil.
2. C1: `getMaxTokensForComponent` op registry-basis; VIDEO/long-form-sets completeren (linkedin-article/-newsletter).
3. STEP_BUDGETS-patroon generaliseren naar een gedeelde helper `{ maxTokens, timeoutMs }` (vuistregel timeout = maxTokens×10ms+30s) en toepassen op week-themes, judges (5s vs 2K-budget), inline-transform (1.024 vs 5.000-char selecties).
4. Thinking-budget bovenop, niet binnen, het output-budget.
5. Per-segment budgettering bij elke join-then-truncate in prompt-assembly (formatter-band canvas-orchestrator, judge-input 12K-cap → word-safe + marker).

### Fase 2 — Component-contract-laag dichten (~4-5 dagen)
1. C3: fallback-componentTemplates voor alle 17 types + harde guard op `textGroups.length === 0` (error i.p.v. "exactly 0 entries").
2. C4: sequence-groepen voor welcome/nurture/re-engagement; C5: eigen templates voor faq/comparison/microsite; linkedin-carousel-row seeden; tiktok-script `isScriptedScene` herstellen.
3. Contract-consistentie-test (deterministisch, CI): voor elk type in het registry — heeft het component-groepen, matchen de prompt-limits de seed-limits, overschrijden few-shots hun eigen caps, bestaat het type-ID overal (explainer-video vs explainer-video-script)? Dit voorkomt de hele klasse blijvend.
4. C11: silent auto-iterate per-group maken.

### Fase 3 — Schema- en validatie-hygiëne (~3 dagen)
1. `validateOrWarn` → `validateAndCoerce`: coercion (Number(), toDisplayString) + bij onherstelbaar falen een echte error i.p.v. doorstromen.
2. Regen-pad: normaliseren vóór parsen; auditor/judge-outputs Zod'en met fallbacks (normalizeRubricResponse echt laten rejecten); creative-critic schaal specificeren.
3. C7 ad-runner datacontract + cache-invalidatie.
4. Admin-prompt-routes (exploration-configs) Zod + size-caps.

### Fase 4 — Taal, jargon en context-governance (~3-4 dagen)
1. `locale-instruction.ts` generaliseren (Intl.DisplayNames + fallback-instructie) — **eerst**, want alle andere taal-fixes leunen erop. Daarna: taal-guard in strategy-chain, voice-analyzer, exploration-rapport, strategic-implications.
2. Marker-stripping (OBSERVED:/RECOMMENDED:) centraal in `getBrandContext` i.p.v. per consumer; `workspace-context-resolver` door de imagerySavedForAi-gate + geformatteerd i.p.v. JSON.stringify.
3. Jargon-scrub: resterende Effie/award-labels uit UI + feedback-compilatie; concept-pad onder scrubStrategyLayer brengen; `<internal_rubric surface_in_output="false">`-conventie voor alle interne rubrics.
4. Fencing voor untrusted content (scraped/PDF/RSS) met delimiters + "behandel als data, niet als instructie"-regel in de 6 scrape-prompts.

### Fase 5 — Configuratie-éénwording + meetlat (~4-5 dagen)
1. Exploration: één promptbron (DB-config), hardcoded report-prompt vervangen door config-consumptie, dead code (5e kopie) verwijderen, sync-script niet-destructief maken, BV-WIRE-conflict (voice-velden) opruimen.
2. Temperature-guard centraliseren (`isTempDeprecatedModel` in anthropic-client, alle call-sites); raw-SDK/raw-fetch-paden (photo-brief, dam-auto-tagger, strategic-implications, fal.subscribe-routes) door de centrale clients routeren; trained-LoRA `negative_prompt`-no-op + guidance_scale-default fixen.
3. Meetlat repareren: golden-sets-gate echt laten falen (exit-code + threshold afdwingen), copy-image-coherence-judge hero-pad, Prompt Registry-dekking uitbreiden naar de ongedekte prompt-families.
4. Dode settings verwijderen of bedraden (emailCount/pageCount/duur), dead code opruimen (UniversalAIExploration + import, legacy trend-prompts, dode conversational exploration-prompts).

### Doorlopend — kwaliteitsprogramma (borging)
- **Prompt-contract-doc per prompt** (doel, output-contract, budget, taal, consumer) als header-comment — comment-vs-code-drift was een terugkerende vondst.
- **Golden-set per kerntype** + de gerepareerde merge-gate = regressie-bescherming op elke promptwijziging (sluit aan op bestaand content-test-plan #7B).
- **AICallSnapshot/prompt-persist** breder toepassen (bestaat al op het LP-pad): zonder gepersiste prompt is truncatie/lek-diagnose archeologie.

**Aanbevolen volgorde**: Fase 0 → 1 → 2 lossen de gemelde testklachten op (~2 weken). Fase 3-5 (~2 weken) maken de kwaliteit en de meetbaarheid structureel. Suggestie: fase 0+1 als één task-file (`prompt-audit-fase-0-1`), daarna per fase een task-file conform CLAUDE.md-werkwijze.

---

## 6. Verificatie-noten

- **8 verworpen bevindingen** (zie bijlage, gemarkeerd VERWORPEN), o.a.: de drie "temperature breekt sonnet-4-6"-CRITICALs (live API 200 + 181 getagde MediaAssets in DB), "UniversalAIExploration is nep-AI" (component wordt nergens gerenderd — dead code, geen productie-misleiding), Veo duration-type (fal coerceert), vanilla-baseline-truncatie (live gpt-4o-test).
- **26 severity-correcties** door verificateurs zijn in de bijlage verwerkt (de gecorrigeerde severity staat vermeld).
- **Gotcha-correctie**: de regel uit 2026-05-24 ("Opus 4.7+/Sonnet 4.6+ accepteren geen temperature") klopt vandaag alleen voor Opus 4.7+; de guard mag blijven (skippen is harmless) maar "gegarandeerd 400 op sonnet-4-6" is geen geldige severity-onderbouwing meer.
- Werkboom-context: `src/lib/ai/dam-auto-tagger.ts` had tijdens deze audit ongecommitte wijzigingen van een parallelle sessie — bevindingen op dat file zijn tegen de werkboom-versie gelezen.

---

## 7. Bijlage — alle 409 bevindingen per cluster

Severity zoals vastgesteld ná adversariële verificatie (✓geverifieerd = door een onafhankelijke skeptic bevestigd). VERWORPEN-items staan erbij voor traceerbaarheid.

### templates-social-ads

- **[HIGH/schema]** linkedin-carousel resolves naar 0 component groups — prompt eist letterlijk "exactly 0 entries" — `src/lib/ai/canvas-context.ts + src/lib/ai/canvas-orchestrator.ts:canvas-context.ts:233, canvas-orchestrator.ts:149-156 + 2377` ✓geverifieerd
- **[HIGH/instruction]** linkedin-article (1000-2000 woorden) en linkedin-newsletter (800-1500) gemapt op organic-post medium met body max 3000 chars — `src/lib/studio/prompt-templates/social-media.ts:664, 699` ✓geverifieerd
- **[HIGH/truncation]** resolveMaxTokens mist linkedin-article/linkedin-newsletter → 6000-token cap voor 2×1000-2000 woorden; OpenAI-pad detecteert truncatie niet — `src/lib/ai/canvas-orchestrator.ts:1401-1423` ✓geverifieerd
- **[HIGH/quality]** Few-shot voorbeelden overschrijden hun eigen HARD character limits (search-ad 105>90, facebook-ad 153>125, display-ad image 287>200) — `src/lib/studio/prompt-templates/advertising.ts + social-media.ts:advertising.ts:93 + 286` ✓geverifieerd
- **[HIGH/schema]** Server-side char-limit vangnet bestaat alleen voor linkedin-poll — alle andere hard platform-limits zijn warn-only of ongecontroleerd — `src/lib/ai/canvas-orchestrator.ts:3210-3223` ✓geverifieerd
- **[MEDIUM/truncation]** Anthropic-fallback-leg: thinking-budget 5000 binnen maxTokens 6000 laat ~1000 output-tokens over voor multi-group ads — `src/lib/ai/canvas-orchestrator.ts:1915-1923`
- **[MEDIUM/instruction]** Regeneration-pad: plain-text-branch herkent genummerde/named groups niet → markdown aangemoedigd in ≤30-char ad-velden — `src/lib/ai/canvas-orchestrator.ts:2447-2453 + 2444` ✓geverifieerd
- **[MEDIUM/schema]** Scene-fallback voor tiktok-script/video-ad wordt overschreven door tiktok/video medium-row zonder isScriptedScene (comment ≠ code) — `src/lib/ai/component-templates-fallback.ts + canvas-orchestrator.ts:component-templates-fallback.ts:13-15` ✓geverifieerd
- **[MEDIUM/instruction]** instagram-post hashtag-aantal is drievoudig tegenstrijdig: 3-5 (skeleton) vs 10 (few-shot) vs 8-15 (guidance) vs 20-30 (seed best-practices) — `src/lib/studio/prompt-templates/social-media.ts + prisma/seed.ts:social-media.ts:732, 763, 797`
- **[MEDIUM/instruction]** twitter-thread: "NEVER use hashtags in threads" botst met de verplichte hashtags-groep en "0-3 hashtags"-instructie in dezelfde prompt — `src/lib/studio/prompt-templates/social-media.ts:871 vs 814+837+896`
- **[MEDIUM/quality]** CF-1 bevestigd open: article/ebook/microsite/newsletter/whitepaper vallen stil terug op de generieke prompt die settings grotendeels negeert — `src/lib/studio/prompt-templates/index.ts:52-75`
- **[MEDIUM/schema]** Geen post-generatie validatie dat required groups aanwezig zijn — ontbrekende groepen blijven stil leeg — `src/lib/ai/canvas-orchestrator.ts:645-658`
- **[MEDIUM/instruction]** formatAdditionalSettings interpoleert interne settings-keys (o.a. targetPersonas cuid-array) als specificatie in de prompt — `src/lib/studio/prompt-templates/helpers.ts:186-206`
- **[MEDIUM/instruction]** 'length'-setting (short/medium/long) wordt in alle 19 social/ads-templates stilzwijgend genegeerd — `src/lib/studio/prompt-templates/social-media.ts + advertising.ts:social-media.ts:13-33`
- **[MEDIUM/schema]** TYPE_TO_CATEGORY mist facebook-ad en linkedin-video-ad → fallback 'long-form' beïnvloedt Plan-and-Solve-dispatch en promptVersion-tracking — `src/lib/ai/prompt-version-registry.ts:87-107 + 151-153`
- **[MEDIUM/quality]** FORMULA_LIBRARY modelleert verzonnen statistieken en few-shots fabriceren klant-claims — geen anti-fabricage-guard in ad-templates — `src/lib/studio/prompt-templates/helpers.ts + advertising.ts:helpers.ts:143+177`
- **[MEDIUM/instruction]** Organic-post 'cta'-group: orchestrator dwingt 8-woorden buttontekst af terwijl linkedin-post/event/video een open CTA-vraag eisen — `src/lib/ai/canvas-orchestrator.ts + social-media.ts + seed.ts:canvas-orchestrator.ts:2311-2316`
- **[MEDIUM/instruction]** social-ad en linkedin-ad delen de linkedin/ad medium-row met onverenigbare groottes en variant-structuur — `src/lib/studio/prompt-templates/advertising.ts + social-media.ts + canvas-context.ts:advertising.ts:162-172+216`
- **[LOW/instruction]** Studio-componentpad injecteert multi-group output-contracten ("emit EXACTLY these groups") in een single-component opdracht — `src/lib/studio/component-prompt-builder.ts + social-media.ts:component-prompt-builder.ts:89-90 + 61-67` ✓geverifieerd
- **[LOW/infra]** PROMPT_VERSION drift: social-media.ts zegt 1.3.0, registry tracked 1.2.0; file-constants zijn dode exports — `src/lib/studio/prompt-templates/social-media.ts + src/lib/ai/prompt-version-registry.ts:social-media.ts:8`
- **[LOW/instruction]** buildBaseSystemPrompt zegt "Do NOT wrap your output in code fences or JSON" terwijl de canvas-orchestrator JSON-only eist — `src/lib/studio/prompt-templates/helpers.ts:89`
- **[LOW/infra]** isTempDeprecated-regex gedupliceerd in twee files i.p.v. de beloofde centrale helper — `src/lib/ai/exploration/ai-caller.ts + src/lib/ai/anthropic-client.ts:ai-caller.ts:403`
- **[LOW/quality]** search-ad few-shot leert pijl-symbolen ("Start Free Trial →") aan in Google-ad-velden — `src/lib/studio/prompt-templates/advertising.ts:92, 94`
- **[LOW/instruction]** social-carousel: verplichte 'caption'-group uit de instagram/carousel seed heeft nul guidance in het systemprompt — `src/lib/studio/prompt-templates/social-media.ts + prisma/seed.ts:social-media.ts:1115-1199`

### templates-longform-email-web

- **[CRITICAL/truncation]** getMaxTokensForComponent matcht geen enkel echt componentType → alle long-form bodies op 2048 tokens, stil afgekapt — `src/lib/studio/component-prompt-builder.ts:137-151` ✓geverifieerd
- **[CRITICAL/schema]** Email-sequence templates (5/7 emails, 3 varianten) passen structureel niet in het single-newsletter componentcontract — `src/lib/studio/prompt-templates/email.ts:127, 278, 362` ✓geverifieerd
- **[CRITICAL/schema]** faq-page/comparison-page/microsite worden in landing-page-groepen geperst — geen slot voor Q&A's, matrix of 5 pagina's — `src/lib/ai/canvas-context.ts:263-268` ✓geverifieerd
- **[HIGH/instruction]** Ebook-woordaantal driedubbel tegenstrijdig: prompt eist 3000-3500 ('niet 5000+'), registry-injectie eist 'Minimum words: 5000 — Strictly adhere' — `src/lib/studio/prompt-templates/long-form.ts:279, 323` ✓geverifieerd
- **[HIGH/quality]** Fidelity word-targets (registry-midpoint) staan haaks op de prompt-targets — ×0.6 lengte-penalty voor ebook/whitepaper/pillar, ×0.85 voor email-sequenties — `src/lib/brand-fidelity/fidelity-runner.ts:206-215` ✓geverifieerd
- **[HIGH/instruction]** Component-pad pillar-page: 'Target Length: 1000-1500 words' en 'Minimum 2000 words' in dezelfde user prompt; blog 'short' (500-800) onder minWords 800 — `src/lib/studio/prompt-templates/long-form.ts:459-471, 497` ✓geverifieerd
- **[HIGH/instruction]** Hardcoded e-mail-aantallen (5 welcome / 7 nurture) spreken de emailCount-setting (default 4 / 5) tegen — `src/lib/studio/prompt-templates/email.ts:113-127, 265-278` ✓geverifieerd
- **[HIGH/quality]** Landing-page template dwingt gefabriceerde testimonials/metrics af én verbiedt placeholders tegelijk — `src/lib/studio/prompt-templates/website.ts:74-76, 119` ✓geverifieerd
- **[HIGH/ordering]** Cascading-context zoekt op componentTypes die nooit voorkomen ('body_text','subject_line') → consistentie-context stil leeg — `src/lib/studio/context-builder.ts:219-226` ✓geverifieerd
- **[MEDIUM/instruction]** Pillar-page TOC-contradictie: 'clickable anchors to every H2' geëist terwijl guardrail #10 in dezelfde systemprompt anchor-TOC's verbiedt — `src/lib/studio/prompt-templates/long-form.ts:94, 102` ✓geverifieerd
- **[MEDIUM/schema]** validateContentConstraints én ebook-validation hebben nul callers — alle registry-constraints zijn onafgedwongen — `src/lib/studio/content-validator.ts:369-389`
- **[MEDIUM/instruction]** Zelfde systemprompt zegt 'Use --- for section dividers' én 'NEVER --- horizontal rules', en 'Do NOT wrap output in JSON' binnen een JSON-only canvas-prompt — `src/lib/studio/prompt-templates/helpers.ts:87-89, 175`
- **[MEDIUM/truncation]** Anthropic thinking-budget (5000) telt mee in maxTokens: website/promotional/re-engagement types houden ~1000 output-tokens over — `src/lib/ai/canvas-orchestrator.ts:1916-1923, 1401-1424`
- **[MEDIUM/schema]** requiredSections-vocabulaire matcht de template-secties niet en wordt als 'Strictly adhere' geïnjecteerd — `src/features/campaigns/lib/deliverable-types.ts:307, 355, 787`
- **[MEDIUM/infra]** PROMPT_VERSION-drift: long-form.ts staat op 1.3.0, de authoritative registry op 1.2.0; file-constantes worden nergens geïmporteerd — `src/lib/ai/prompt-version-registry.ts:39-44`
- **[MEDIUM/instruction]** re-engagement: gekozen stijl-setting (1 van 3) botst met template-eis van álle 3 varianten — `src/lib/studio/prompt-templates/email.ts:345-349, 362, 397`
- **[LOW/instruction]** Drie verschillende subject/preheader-limieten in één assembled prompt (50/60/78 en 90/100/110 chars) — `src/lib/studio/prompt-templates/email.ts:55-56`
- **[LOW/instruction]** Checklists eisen 'SEO meta tags present' bij landing-page en microsite terwijl hun skeletons nergens om meta-tags vragen — `src/lib/studio/prompt-templates/website.ts:116, 498`
- **[LOW/instruction]** Hoge setting-waarden botsen met hardcoded ranges: newsletter sectionCount tot 8 vs '3-5 content sections', FAQ questionCount tot 25 vs '8-12 Q&As', ebook chapterCount tot 12 vs '5 chapters' — `src/features/campaigns/lib/deliverable-type-settings.ts:426-429, 504, 121`
- **[VERWORPEN/instruction]** Microsite hardcoded '5 pages' vs pageCount-setting default 3; Length-pill voor microsite/newsletter is een dode knop — `src/lib/studio/prompt-templates/website.ts:433-469, 508` ✓geverifieerd — Weerlegd op beide impact-poten. (1) pageCount default 3 staat uitsluitend in deliverable-type-settings.ts:525, maar dat bestand heeft NUL importers (grep op 'DE
- **[VERWORPEN/instruction]** Component-pad heeft géén output-taal-enforcement en géén brand-voice-directive — alleen het canvas-pad past de taalregel toe — `src/lib/studio/component-prompt-builder.ts:61-72` ✓geverifieerd — Kernclaim weerlegd. Het component-pad HEEFT expliciete taal-enforcement: alle drie de component-routes (generate/regenerate/generate-all) bouwen generationConte

### templates-prhr-sales-video

- **[CRITICAL/schema]** Alle 17 cluster-types genereren zonder component-groepen: prompt eist letterlijk 'exactly 0 entries' en model verzint eigen structuur — `src/lib/ai/canvas-orchestrator.ts (+ canvas-context.ts, component-templates-fallback.ts):2366, 2377` ✓geverifieerd
- **[HIGH/instruction]** Templates eisen complete documenten/meerdere versies terwijl het generatiecontract per-groep JSON met exact 1-2 varianten eist; studio-pad zegt 'Generate ONLY the X' naast 'Format: 3 media pitch email variations' — `src/lib/studio/prompt-templates/pr-hr.ts + sales.ts + video-audio.ts vs canvas-orchestrator.ts + component-prompt-builder.ts:pr-hr.ts:117,169` ✓geverifieerd
- **[HIGH/truncation]** Studio-componentpad persisteert afgebroken teksten stil: geen stop_reason/finish_reason-check in anthropic- en openai-client + 2048-token default — `src/lib/ai/anthropic-client.ts + src/lib/studio/component-prompt-builder.ts:anthropic-client.ts:91-133` ✓geverifieerd
- **[HIGH/quality]** Anti-fabricage-gat: checklists eisen overal specifieke metrics terwijl few-shots verzonnen statistieken voordoen en er geen 'alleen cijfers uit context'-guard bestaat — `src/lib/studio/prompt-templates/sales.ts (+ pr-hr.ts, helpers.ts):sales.ts:84,122-123,139` ✓geverifieerd
- **[MEDIUM/instruction]** User-settings spreken hardgecodeerde template-skeletten direct tegen (vraagaantal, duur, format, verplichte secties met uit-toggle) — `src/lib/studio/prompt-templates/video-audio.ts + sales.ts + pr-hr.ts vs deliverable-type-settings.ts/content-type-inputs.ts:video-audio.ts:141,218,327,409` ✓geverifieerd
- **[MEDIUM/truncation]** Canvas-tokenbudget structureel te krap: 6000 maxTokens minus 5000 thinking-budget laat ~1000 output-tokens; impact-report/proposal-template (max 5000 woorden) passen nooit in 8000 bij 2-variant fallback — `src/lib/ai/canvas-orchestrator.ts:1400-1424, 1915-1923, 1395` ✓geverifieerd
- **[MEDIUM/schema]** Dubbele type-ID's ('explainer-video' vs 'explainer-video-script'): per ID breekt een andere helft van de pipeline; alias-normalisatie bestaat alleen voor input-velden — `src/lib/studio/prompt-templates/video-audio.ts vs deliverable-types.ts / content-type-inputs.ts / video-prompt-builder.ts / component-templates-fallback.ts:video-audio.ts:35` ✓geverifieerd
- **[MEDIUM/instruction]** Samengestelde system prompt spreekt zichzelf tegen: 'Do NOT wrap your output in … JSON' vs 'respond with valid JSON only', en 'Use --- for section dividers' vs 'NEVER use horizontal rules (---)' — `src/lib/studio/prompt-templates/helpers.ts vs src/lib/ai/canvas-orchestrator.ts:helpers.ts:87,89,175`
- **[MEDIUM/ordering]** Geen validatie van groep-volledigheid of -volgorde: persist volgt letterlijk de emissie-volgorde van het model en ontbrekende groepen blijven stil leeg — `src/lib/ai/canvas-orchestrator.ts:645-658, 3226-3245`
- **[MEDIUM/infra]** TYPE_TO_CATEGORY in prompt-version-registry is stale: 10 cluster-types ontbreken (vallen terug op 'long-form') en 8 phantom-ids bestaan nergens — `src/lib/ai/prompt-version-registry.ts:123-145, 151-153`
- **[MEDIUM/instruction]** Award-/agency-/methodologie-jargon in personas en methodologie-blokken zonder leak-guard (zelfde vector als de eerdere 'effie-waardig'-leak) — `src/lib/studio/prompt-templates/video-audio.ts + sales.ts:video-audio.ts:225`
- **[MEDIUM/instruction]** FORMULA_LIBRARY is volledig Nederlands binnen verder Engelse system prompts en is niet gekoppeld aan workspace-contentLanguage — `src/lib/studio/prompt-templates/helpers.ts:129-160`
- **[MEDIUM/instruction]** 'length' en 'targetAudience' uit settings worden in alle drie de cluster-prompt-builders stil weggegooid (dubbel gefilterd) — `src/lib/studio/prompt-templates/pr-hr.ts + sales.ts + video-audio.ts + helpers.ts:pr-hr.ts:19`
- **[MEDIUM/infra]** video-prompt-builder error-pad stuurt rauwe scripttekst (slice 0-400) als fal.ai-prompt — schendt stil zijn eigen regels — `src/lib/studio/video-prompt-builder.ts:140`
- **[MEDIUM/infra]** Temperature-deprecation-regel inconsequent toegepast: generateAIResponse stuurt temperature onvoorwaardelijk naar Anthropic; regex 2x gedupliceerd, centrale helper bestaat niet — `src/lib/ai/exploration/ai-caller.ts:97-105`
- **[LOW/quality]** Copy-paste checklists in sales.ts sturen verkeerde CTA en irrelevante eisen voor product-description — `src/lib/studio/prompt-templates/sales.ts:284-292`

### canvas-orchestrator-chains

- **[CRITICAL/schema]** Silent auto-iterate persisteert multi-group blob-rewrite in één enkel component → titel/meta/CTA worden in de body gedupliceerd — `src/lib/ai/canvas-orchestrator.ts:1550-1553, 909, 938-1002` ✓geverifieerd
- **[HIGH/truncation]** dispatchTextCompletion: geen truncation-detectie op anthropic/openai-paden — afgekapte component-teksten worden stil gepersist — `src/lib/ai/dispatch-completion.ts:48-82` ✓geverifieerd
- **[HIGH/ordering]** persistRegeneratedGroup plaatst de geregenereerde groep achteraan (order = maxOrder+1) — component-volgorde verandert blijvend na elke regenerate — `src/lib/ai/canvas-orchestrator.ts:3313-3323` ✓geverifieerd
- **[MEDIUM/infra]** Plan-and-Solve default-model 'claude-sonnet-4-5-20251001' bestaat niet — hele chain faalt vermoedelijk op elke aanroep en valt stil terug — `src/lib/ai/chains/plan-and-solve.ts:229` ✓geverifieerd
- **[MEDIUM/quality]** Plan-and-Solve assembly injecteert letterlijke placeholder '[Antwoord volgt — content-team vult in]' in user-zichtbare content — `src/lib/ai/chains/plan-and-solve.ts:188-197` ✓geverifieerd
- **[MEDIUM/truncation]** Angle-generator: 700 maxTokens op gemini-2.5-flash zonder thinkingBudget=0 → thinking-tokens eten het budget op, MAX_TOKENS-throw, stille fallback naar quasi-identieke varianten — `src/lib/ai/canvas-angle-generator.ts:141-151` ✓geverifieerd
- **[MEDIUM/ordering]** Group-volgorde bij initiële persist = model-output-volgorde; prompt eist geen volgorde en niets valideert tegen componentTemplate-volgorde — `src/lib/ai/canvas-orchestrator.ts:2275-2280, 3186-3245`
- **[MEDIUM/schema]** Plan-and-Solve output wordt naar één 'body'-group gemapt — alle andere template-groups (title/meta/cta/headline) blijven leeg in de UI — `src/lib/ai/canvas-orchestrator.ts:442-457` ✓geverifieerd
- **[MEDIUM/quality]** Plan-and-Solve prompts krijgen géén brand-voice-directive, voiceguide, persona-detail of brand context — alleen 7 kale brief-velden — `src/lib/ai/canvas-orchestrator.ts:407-432` ✓geverifieerd
- **[MEDIUM/instruction]** EXECUTE system prompt spreekt zichzelf tegen: 'Geen JSON, geen wrapper' direct gevolgd door 'Return JSON: { content }' — `src/lib/ai/chains/plan-and-solve.ts:118, 278`
- **[MEDIUM/instruction]** PLAN-prompt verwijst naar 'doel-woordaantal (uit content-type constraints)' maar het doel-woordaantal wordt nooit in de prompt geïnjecteerd — `src/lib/ai/chains/plan-and-solve.ts:43, 76-94`
- **[MEDIUM/instruction]** Plan-and-Solve heeft geen output-taal-guard: execute-stap krijgt de taal helemaal niet te zien — `src/lib/ai/chains/plan-and-solve.ts:80, 149-152`
- **[MEDIUM/instruction]** Drie verschillende CTA-limieten in dezelfde prompt: '8 words AND 80 characters' vs '2-6 words (max ~48 characters)' — `src/lib/ai/canvas-orchestrator.ts:2311, 2381, 2444`
- **[MEDIUM/infra]** Geen timeoutMs gekoppeld aan tokenbudget in canvas-hoofdgeneratie: Gemini-primary (ads) 60s en OpenAI-fallback (long-form) 120s zijn te krap — STEP_BUDGETS-regel niet toegepast — `src/lib/ai/canvas-orchestrator.ts:1918-1923, 2101-2106`
- **[MEDIUM/truncation]** Auto-iterate rewrite: 4096 output-tokens zonder stop_reason-check — lange blobs worden stil afgekapt — `src/lib/ai/auto-iterate-integration.ts:33-35, 302-333`
- **[MEDIUM/schema]** ToT EVALUATE: koppeling via angleIndex zonder 0-based validatie en zonder responseSchema — misattributie van scores mogelijk — `src/lib/ai/chains/tree-of-thoughts-angles.ts:350-366, 374-391`
- **[MEDIUM/ordering]** mergeAngleResults: groep die alleen in call B voorkomt belandt op variantIndex 0 → angle-misattributie t.o.v. settings.variantAngles en Variant A/B-tabs — `src/lib/ai/canvas-orchestrator.ts:1477-1500, 1441-1455`
- **[MEDIUM/schema]** LinkedIn-poll char-caps (question 140 / option 30) alleen in persistVariants, niet in persistRegeneratedGroup — `src/lib/ai/canvas-orchestrator.ts:3216-3224 vs 3325-3351`
- **[LOW/instruction]** Angle-prompts en formatAngleInstruction zijn hardcoded Nederlands — ook voor niet-NL workspaces — `src/lib/ai/canvas-angle-generator.ts:39-46, 63, 177-204`
- **[LOW/instruction]** Dead code: best-of-N pad (emphasis-varianten + Haiku-ranking-prompt) wordt nergens meer aangeroepen — `src/lib/ai/canvas-orchestrator.ts:1734-1882`
- **[LOW/quality]** Image-regeneratie: dangling feedback-interpolatie, prompt-duplicatie tot 3 identieke beelden en generieke fallback-prompt — `src/lib/ai/canvas-orchestrator.ts:2004-2014`
- **[LOW/infra]** isTempDeprecated-regex gedupliceerd i.p.v. centrale helper; en contentLanguage-checks inconsistent ('=== nl' vs startsWith('nl')) — `src/lib/ai/auto-iterate-integration.ts:272`
- **[LOW/instruction]** Regenerate verliest angle-labels: text_complete event en persist zetten geen angleLabel, settings.variantAngles blijft stale — `src/lib/ai/canvas-orchestrator.ts:2134-2156, 3154-3176`
- **[LOW/infra]** Plan-and-Solve error-stage-detectie via message.includes('runExecuteStage') werkt vrijwel nooit — `src/lib/ai/chains/plan-and-solve.ts:372-381`

### campaign-strategy-prompts

- **[CRITICAL/schema]** strategyFoundationSchema mist coreMessage/proofPoints/reasonToAct — Zod stript ze juist bij GELDIGE output — `src/lib/campaigns/strategy-blueprint.types.ts:1245-1256` ✓geverifieerd
- **[HIGH/truncation]** buildConceptDrivenStrategy: thinking-budget 12k binnen maxTokens 16k laat ~4k tokens over voor volledige strategie+architectuur — `src/lib/campaigns/strategy-chain.ts:1969-1978` ✓geverifieerd
- **[HIGH/schema]** Regen-pad: strikte fullVariantSchema.parse THROWT vóór de lenient normalizeArchitectureLayer ooit draait — `src/lib/campaigns/strategy-chain.ts:907-911` ✓geverifieerd
- **[HIGH/schema]** Hoofdpad-architectuur wordt NIET genormaliseerd en mist de EXACT-veldnamen-waarschuwingen → letterlijk "undefined" fase-namen in de asset-planner prompt — `src/lib/campaigns/strategy-chain.ts:2002-2005 + 643` ✓geverifieerd
- **[HIGH/schema]** assetPlanResponseSchema beperkt contentTypeInputs tot een leeg object terwijl de prompt 40+ regels type-specifieke velden eist — `src/lib/campaigns/strategy-blueprint.types.ts:1520` ✓geverifieerd
- **[MEDIUM/instruction]** Effie-jargon leeft nog in UI-labels en wordt via feedback-compilatie OPNIEUW in ongeguarde downstream-prompts geïnjecteerd — `src/features/campaigns/lib/compile-structured-feedback.ts:18` ✓geverifieerd
- **[MEDIUM/instruction]** Creative-critic prompt specificeert geen schaal voor overallCreativeScore terwijl de quality-gate 0-100 aanneemt — `src/lib/ai/prompts/campaign-strategy-agents.ts:361` ✓geverifieerd
- **[MEDIUM/schema]** PersonaValidationResult wordt door geen enkele live prompt meer geproduceerd — confidence verliest permanent 20% en persona-feedback-UI blijft leeg — `src/lib/campaigns/strategy-chain.ts:1908 + 914` ✓geverifieerd
- **[MEDIUM/truncation]** OpenAI-pad detecteert truncatie niet: finish_reason 'length' wordt nooit gecheckt (Claude/Gemini wél) — `src/lib/ai/exploration/ai-caller.ts:696-712`
- **[MEDIUM/truncation]** Timeouts niet gekoppeld aan tokenbudget en inconsistent tussen identieke call-sites; withStepContext-labels wijken af van echte timeouts — `src/lib/campaigns/strategy-chain.ts:666 vs 976`
- **[MEDIUM/instruction]** 7 prompt-builders zijn dead code (oude 3-variant/debate-pipeline) — guard-fixes en schema-waarschuwingen leven alleen nog in dode kopieën — `src/lib/ai/prompts/campaign-strategy.ts:369-825`
- **[MEDIUM/instruction]** Output-taal inconsistent gespecificeerd: alleen quick-mode forceert Engels; alle live CQP-prompts en improveBriefing zwijgen erover — `src/lib/ai/prompts/campaign-strategy.ts:1670`
- **[MEDIUM/instruction]** Sanitizer-dekking incompleet: scrub alleen op strategy-laag en alleen op 'effie'-tokens; live leap/quick-prompts noemen 'Cannes Lions' zonder guard — `src/lib/ai/sanitize-strategy-output.ts:19-27`
- **[MEDIUM/infra]** Settings-knoppen 'Strategy Foundation' en 'Briefing Validation' worden genegeerd: calls hardcoden andere keys/modellen — `src/lib/campaigns/strategy-chain.ts:1283 + 1086 + 1161`
- **[MEDIUM/infra]** selectCreativeMaterials accepteert 2 templates maar generateCreativeConcepts indexeert blind templates[0..2] → derde concept-variant faalt stil — `src/lib/campaigns/ai-creative-selector.ts:172-176`
- **[MEDIUM/quality]** intentRatio verschilt per mode: quick-concept gebruikt 80/20-20/80, standaardpad 60/40-40/60 ('per Binet & Field') — `src/app/api/campaigns/wizard/strategy/quick-concept/route.ts:26-31`
- **[LOW/instruction]** Single-content-mode: directe contradictie tussen 'Do not plan multiple deliverables' en 'Produce 8-15 deliverables / elke fase ≥2' — `src/lib/ai/prompts/campaign-strategy.ts:84 vs 1045-1074` ✓geverifieerd
- **[LOW/instruction]** buildJourneyPhasesPrompt nestelt '## Creative Briefing' onder een extra '## Briefing'-kop en kan een lege kop achterlaten — `src/lib/ai/prompts/campaign-strategy.ts:873-876`
- **[LOW/quality]** Insight-autoselectie beloont lengte terwijl de prompt max 40 woorden eist — model dat de cap respecteert verliest — `src/lib/campaigns/strategy-chain.ts:1549-1564`
- **[LOW/truncation]** Debate previousRoundContext kapt critique-JSON hard af op 2000 chars midden in de structuur — `src/lib/campaigns/strategy-chain.ts:1735-1737`
- **[LOW/truncation]** Reference Materials: cap per source (4000 chars) maar geen cap op het aantal sources — `src/lib/ai/prompts/campaign-strategy.ts:55-71`
- **[LOW/infra]** Warn-only validateOrWarn direct gevolgd door unguarded property-access op de gevalideerde output — `src/lib/campaigns/strategy-chain.ts:637-638 + 670-671`

### strategy-chain

- **[CRITICAL/truncation]** Week-themes: 6s timeout + 1500 maxTokens kan 'exactly N themes' voor normale campagneduur nooit leveren — `src/lib/campaigns/brief-week-theme-prompt.ts:21,74,167` ✓geverifieerd
- **[HIGH/schema]** strategyFoundationSchema mist coreMessage/proofPoints/reasonToAct — Zod stript ze juist op het happy path — `src/lib/campaigns/strategy-blueprint.types.ts:1245-1256` ✓geverifieerd
- **[HIGH/ordering]** regenerateBlueprintLayer: strikte fullVariantSchema.parse VÓÓR normalizeArchitectureLayer — normalisatie kan nooit repareren — `src/lib/campaigns/strategy-chain.ts:907-911` ✓geverifieerd
- **[HIGH/instruction]** Geen output-taal-contract in de hele strategy-chain; improveBriefing kan NL user-briefing naar Engels herschrijven, quick-concept forceert zelfs expliciet Engels — `src/lib/campaigns/strategy-chain.ts:1119-1156` ✓geverifieerd
- **[MEDIUM/instruction]** buildBriefingValidationPrompt accepteert campaignType/selectedContentType maar injecteert ze nergens — single-content briefings worden als full campagne beoordeeld — `src/lib/ai/prompts/campaign-strategy.ts:1108-1160`
- **[MEDIUM/schema]** validateBriefing stuurt de bestaande briefingValidationResponseSchema niet mee — constrained decoding ongebruikt, alleen warn-only vangnet — `src/lib/campaigns/strategy-chain.ts:1084-1091`
- **[MEDIUM/schema]** buildConceptDrivenStrategy: nul validatie en geen normalizeArchitectureLayer — 'undefined' fasenamen kunnen letterlijk als eis in de asset-planner-prompt belanden — `src/lib/campaigns/strategy-chain.ts:1983-2005`
- **[MEDIUM/truncation]** elaborateJourney token/timeout-budgetten niet uit registry: journey-phases 8K/60s (grootste object, kleinste budget), asset-planner 120s vs 180s in regen-pad — `src/lib/campaigns/strategy-chain.ts:597,633,666,976`
- **[MEDIUM/schema]** Debate quality-gate leest overallCreativeScore zonder coercion — string-score wordt 0 → UI toont 'Score 0/100' en debat draait altijd 3 volle rondes — `src/lib/campaigns/strategy-chain.ts:1771-1776`
- **[MEDIUM/ordering]** Keten-breuk foundation → insights: Phase 2-foundation wordt nooit aan insight-mining/creative-leap/strategy-build gevoed ondanks expliciete prompt-belofte — `src/lib/campaigns/strategy-chain.ts:1377-1399`
- **[MEDIUM/truncation]** previousRoundContext: pretty-printed critique geslice'd op 2000 chars — snijdt precies de actionable staart (elevationSuggestions/overallCreativeScore) af — `src/lib/campaigns/strategy-chain.ts:1735-1737`
- **[MEDIUM/infra]** generateCreativeConcepts indexeert templates[2] unconditioneel terwijl selectCreativeMaterials met 2 templates kan terugkeren (angles wél gepad, templates niet) — `src/lib/campaigns/strategy-chain.ts:1612-1616`
- **[LOW/instruction]** Zeven dode prompt-builders (variant B/C, persona-validator, synthesizer, critic/defense/persona-panel) delen schema-fragmenten met levende prompts — `src/lib/ai/prompts/campaign-strategy.ts:369-825`
- **[LOW/instruction]** withStepContext timeout-labels wijken af van werkelijke timeouts — foutmelding toont verkeerde seconden aan user — `src/lib/campaigns/strategy-chain.ts:1084-1088,1519-1525`
- **[LOW/instruction]** Comment-vs-code-drift: debat-gate gedocumenteerd als ≥75, code gebruikt 70 — `src/lib/campaigns/strategy-chain.ts:1699,1711`
- **[LOW/instruction]** buildJourneyPhasesPrompt produceert dubbele/lege briefing-koppen ('## Briefing' direct gevolgd door '## Creative Briefing') — `src/lib/ai/prompts/campaign-strategy.ts:873-876`
- **[LOW/schema]** improveBriefing valideert veldtypes niet — object-waarden passeren de ||-fallback en belanden als '[object Object]' in het briefing-formulier — `src/lib/campaigns/strategy-chain.ts:1167-1174`
- **[LOW/schema]** ai-review: schema dwingt de 5 beloofde dimensies niet af en accepteert score 0 waar de prompt 1-10 zegt — `src/app/api/strategies/[id]/ai-review/route.ts:11-21`
- **[LOW/quality]** Insight auto-selectie is een tekstlengte-proxy; string-i.p.v.-array proofPoints domineert de score ×20 — `src/lib/campaigns/strategy-chain.ts:1548-1564`

### seo

- **[CRITICAL/instruction]** Step 6 (First Draft) eist pure markdown maar loopt door de structured-JSON caller die JSON afdwingt én JSON.parse't — `src/lib/ai/seo-pipeline.ts:470, 484-489` ✓geverifieerd
- **[HIGH/instruction]** Variant B-generator heeft hetzelfde markdown-vs-JSON-conflict; faalpad maakt Variant B stilletjes (bijna) identiek aan Variant A, succespad kan JSON-blob als user-zichtbare variant opleveren — `src/lib/ai/seo-pipeline.ts:585, 599-617, 222-244` ✓geverifieerd
- **[HIGH/quality]** Step 3 'live SERP-analyse' is gebouwd op een verkeerd geframede zoekopdracht + onkenbare velden → gefabriceerde wordCounts/dominantLength die Step 6 als lengte-anker MOET volgen — `src/lib/ai/gemini-client.ts:208` ✓geverifieerd
- **[HIGH/infra]** Route maxDuration=300s is structureel te krap voor de 8-staps pipeline (som geconfigureerde timeouts ≈ 33 min) — `src/app/api/studio/[deliverableId]/orchestrate/route.ts:9-10` ✓geverifieerd
- **[MEDIUM/truncation]** Variant B-context `slice(-20000)` snijdt exact het SEO-research (steps 1-4) weg en houdt twee redundante paginakopieën over — `src/lib/ai/seo-pipeline.ts:594-595` ✓geverifieerd
- **[MEDIUM/truncation]** 2026-05-24 default-maxTokens-fix alleen op het Claude-pad toegepast: OpenAI-pad default 8K, Gemini-pad 4K — STEP_BUDGETS-comment ('caller defaults 16K') klopt alleen voor Anthropic — `src/lib/ai/seo-pipeline.ts:385-396, 434, 489` ✓geverifieerd
- **[MEDIUM/truncation]** STEP_BUDGETS-timeouts liggen onder de eigen vuistregel (timeout = maxTokens × 10ms + 30s) — `src/lib/ai/seo-pipeline.ts:402-406`
- **[MEDIUM/schema]** Step 8 output wordt zonder veldvalidatie geconsumeerd: parsed.finalContent kan undefined zijn en stroomt door naar text_complete + Prisma-persist; parse-faal is warn-only — `src/lib/ai/seo-pipeline.ts:207-219, 250-254, 270-289`
- **[MEDIUM/instruction]** Step 2 bevat twee strijdige taalregels: 'keywords in de taal van het primary keyword' (system) vs 'ALL output in de Brand Voice Directive-taal' (user) — `src/lib/ai/prompts/seo-prompts.ts:114 vs 47`
- **[MEDIUM/instruction]** accumulatedBlock-instructie 'do not repeat it' staat haaks op de step 7/8 kerntaak om de complete pagina (die in dat blok zit) herschreven terug te geven — `src/lib/ai/prompts/seo-prompts.ts:40 vs 327`
- **[MEDIUM/quality]** Interne Engelse placeholder-markers ([internal link: …], [QUOTE: …], [CASE STUDY: …]) zijn expliciet onderdeel van de 'publication-ready' eindtekst — `src/lib/ai/prompts/seo-prompts.ts:351-352`
- **[MEDIUM/quality]** settings.seoChecklist wordt gepersisteerd maar door geen enkel UI-component of route gelezen — step 8 checklist-budget is dode output — `src/lib/ai/seo-pipeline.ts:330-334`
- **[MEDIUM/infra]** SEO-pipeline omzeilt de F29 per-content-type modelrouting (Website → Sonnet 4.6) én draait Opus 4.7 zonder thinking, terwijl de F28-kwaliteitsclaim op thinking gebaseerd is — `src/lib/ai/seo-pipeline.ts:91`
- **[MEDIUM/ordering]** Regeneratie-branch draait vóór de SEO-branch: regenereren van een SEO-deliverable gaat door het generieke pad zonder SEO-research — `src/lib/ai/canvas-orchestrator.ts:329-352`
- **[MEDIUM/infra]** Geen centrale isTempDeprecatedModel-helper: temperature-guard bestaat alleen inline in createClaudeStructuredCompletion; generateAIResponse in dezelfde module stuurt temperature onvoorwaardelijk naar Anthropic — `src/lib/ai/exploration/ai-caller.ts:97-105 vs 399-404`
- **[LOW/instruction]** Step 3 is de enige step zonder outputLanguageInstruction én zonder brand context — `src/lib/ai/prompts/seo-prompts.ts:169-177`
- **[LOW/quality]** User-opgegeven competitorUrls worden nooit gefetcht maar wel ter 'analyse' aangeboden; types-comment belooft fallback-semantiek die niet bestaat — `src/lib/ai/prompts/seo-prompts.ts:174-176`
- **[LOW/schema]** Title-tag (max 60) en meta-description (max 155) limieten worden nergens gevalideerd of afgekapt — `src/lib/ai/seo-pipeline.ts:326-328`
- **[LOW/quality]** Aggregate-steps krijgen de ongesnoeide volledige accumulated dump: step 8 ontvangt de pagina twee keer integraal (draft + revisie) — `src/lib/ai/seo-pipeline.ts:171`
- **[LOW/instruction]** Lege voiceDirective-edge: outputLanguageInstruction retourneert '' waardoor steps 4/5/7/8 géén enkele taal-guard hebben — `src/lib/ai/prompts/seo-prompts.ts:43-49`

### landing-pages

- **[HIGH/instruction]** Rewrite-prompt staat CTA-label-wijziging expliciet toe terwijl de validator finalCta==hero CTA-identiteit hard afdwingt — `src/lib/landing-pages/variant-tell-rewrite.ts:36-43` ✓geverifieerd
- **[HIGH/schema]** Section-scoped merge zonder hervalidatie breekt single-CTA-discipline en corrumpeert de variant voor alle vervolg-calls — `src/app/api/landing-pages/[deliverableId]/auto-iterate-variant/route.ts:67, 228-230` ✓geverifieerd
- **[HIGH/quality]** Eén landing-page-specifieke prompt bedient alle 5 PUCK-webpage-types (faq-page/comparison-page/microsite krijgen LP-opdracht en LP-structuur) — `src/app/api/landing-pages/[deliverableId]/generate-structured-variant/route.ts:120-127` ✓geverifieerd
- **[MEDIUM/instruction]** Kritische regel 4 zegt 'Features 3-5 items' terwijl schema-blok en Zod maximaal 4 toestaan — `src/lib/landing-pages/variant-generator.ts:341 vs 318` ✓geverifieerd
- **[MEDIUM/truncation]** strict-rewrite heeft vaste maxTokens 2400 + 30s default-timeout terwijl het de hele Puck-tree moet echoën — exact de afkap-bug die auto-iterate al fixte — `src/app/api/landing-pages/strict-rewrite/route.ts:75`
- **[MEDIUM/ordering]** Comment claimt dat de variant-axis 'EISEND in de output-regels' herhaald wordt, maar de KRITISCHE REGELS bevatten geen axis/angle-herhaling — divergentie-instructie verdrinkt vóór ~1500 tokens schema — `src/lib/landing-pages/variant-generator.ts:228-236 vs 337-353`
- **[MEDIUM/instruction]** formatAngleInstruction injecteert blog-structuur-directieven als HARD CONSTRAINT in een prompt die een vast JSON-sectie-schema eist — `src/lib/ai/canvas-angle-generator.ts:197-200`
- **[MEDIUM/truncation]** anthropicClient.createChatCompletion detecteert max_tokens-truncatie niet en exposeert stop_reason niet; tracking schrijft gefabriceerd 'end_turn' + latencyMs 0 — `src/lib/ai/anthropic-client.ts:125-132`
- **[MEDIUM/infra]** Live auto-iterate route (en orphan strict-rewrite/component-edit) hebben geen auth/membership-check — ongeauthenticeerde betaalde LLM-calls — `src/app/api/landing-pages/auto-iterate/route.ts:57-69`
- **[MEDIUM/schema]** component-edit TEXT_FIELDS_BY_TYPE dekt 5 van de beloofde 8 componenten — docblock claimt FeatureGrid/PricingTable/FAQ-support die niet bestaat — `src/app/api/landing-pages/component-edit/route.ts:22-24 vs 37-43`
- **[MEDIUM/schema]** trust.items[].mediaUrl wordt door de renderer als zichtbare kaart-description getoond, terwijl de prompt het model niet verbiedt URLs te verzinnen — `src/lib/landing-pages/variant-generator.ts:309`
- **[MEDIUM/instruction]** Engelse rewrite-systemprompts zonder output-taal-guard op het live auto-iterate-pad (en 3 orphan-routes), terwijl het structured-pad locale zorgvuldig afdwingt — `src/app/api/landing-pages/auto-iterate/route.ts:47-55`
- **[LOW/truncation]** generate-page: 30s default-timeout bij 2400 maxTokens + stille heuristic-fallback levert junk-pagina zonder fout — `src/app/api/landing-pages/generate-page/route.ts:110, 117-119`
- **[LOW/instruction]** HVD-taalkeuze inconsistent: variant-generator prefix-matcht, auto-iterate-variant geeft contentLanguage rauw door aan een exact-match — `src/app/api/landing-pages/[deliverableId]/auto-iterate-variant/route.ts:193`
- **[LOW/instruction]** HVD-uitzonderingsclausule verwijst naar 'de Brand Voice sectie hierboven' die in de rewrite-paden niet bestaat — `src/lib/studio/human-voice-directive.ts:80`
- **[LOW/infra]** Vision-judge tracking gebruikt placeholder workspaceId 'vision-judge' — FK naar Workspace faalt, learning-loop-tracking is stil dood — `src/lib/landing-pages/visual-brand-fit-judge.ts:147`
- **[LOW/quality]** Silent-iterate rewrite mist HVD én vocab-rails die het auto-iterate-variant-pad wél meestuurt — `src/app/api/landing-pages/[deliverableId]/generate-structured-variant/route.ts:347-371`
- **[LOW/quality]** brandVoiceguide wordt ongelimiteerd in de generator-user-prompt geïnjecteerd (elders geldt een 2500-char cap) — `src/lib/landing-pages/variant-generator.ts:375`
- **[LOW/instruction]** Comment-vs-gedrag-drift in batch-generator: recovery-temp 0.7→0.55 daalt i.p.v. '+0.1..0.15 buffer', header belooft validation-error-feedback-retry die niet bestaat, log print axis terwijl angles actief zijn — `src/lib/landing-pages/variant-generator.ts:639-643, 21-22 vs 530, 712`
- **[LOW/schema]** hero.eyebrow wordt door schema en renderer ondersteund (incl. footer-tagline-voorkeur) maar nooit door de prompt gevraagd — feature de-facto dood — `src/lib/landing-pages/variant-generator.ts:298-306`
- **[LOW/quality]** Testimonial-template plakt zelf een em-dash in de author-regel terwijl de hele pipeline em-dashes uitbant — `src/features/campaigns/components/canvas/medium/puck-templates/landing-page-from-structured.ts:117`
- **[LOW/truncation]** component-edit 'alternatives': vaste 600 maxTokens voor 3 rewrites per veld + label belooft 3 alternatieven maar levert er 1 — `src/app/api/landing-pages/component-edit/route.ts:118`
- **[LOW/instruction]** lp-fidelity-judge docblock + isLpFidelityEnabled claimen een env-gate die de route expliciet verwijderd heeft — `src/lib/landing-pages/lp-fidelity-judge.ts:18-19, 51-53`

### judges-fval

- **[CRITICAL/schema]** Ad-quality runner laadt componenten met drievoudig fout datacontract — alle 6 ad-judges beoordelen altijd '(empty)' content — `src/lib/ad-validation/runner.ts:75-92` ✓geverifieerd
- **[HIGH/truncation]** STRICT-rewrite heeft geen max_tokens-truncatiedetectie — afgekapte herschrijving wordt gepersisteerd en aan de gebruiker getoond — `src/lib/brand-fidelity/fidelity-runner.ts:749-793` ✓geverifieerd
- **[MEDIUM/schema]** Copy-image-coherence judge is dood op het hero-image-pad: sibling-text query op componentType 'text' matcht nul rijen — `src/lib/brand-fidelity/visual-fidelity-scorer.ts:452-478` ✓geverifieerd
- **[MEDIUM/truncation]** Ad-judge timeout 5000ms staat los van het 2000-token budget — STEP_BUDGETS-vuistregel (maxTokens×10ms+30s = 50s) niet toegepast — `src/lib/ad-validation/judge/dispatcher.ts:13-15, 30-36` ✓geverifieerd
- **[MEDIUM/schema]** normalizeRubricResponse zegt 'Reject malformed' maar accepteert alles: malformed judge-JSON wordt stil composite 50 op de 45%-pijler — `src/lib/brand-fidelity/g-eval-rubric.ts:286-323` ✓geverifieerd
- **[MEDIUM/truncation]** Learning-loop judge leest content hard afgekapt op 12.000 chars zonder marker — judge scoort een mid-zin eindigend fragment — `src/lib/learning-loop/fidelity-scorer.ts:290-303` ✓geverifieerd
- **[MEDIUM/infra]** runRubricJudge zonder try/catch én zonder timeout: één judge-fout doodt de hele 3-pijler composite, een hangende call blokkeert de SSE-stream tot 10 min — `src/lib/brand-fidelity/composition-engine.ts:400-416`
- **[MEDIUM/instruction]** Google-search-judge interpoleert placeholder '(none specified)' in de scoringsinstructie en laat lege velden als kale lege strings zien — `src/lib/ad-validation/judge/google-search-judge.ts:37-49, 78`
- **[MEDIUM/instruction]** Visual-judge dimensie 'subject-identity' verwijst naar source-images die nooit in de prompt worden meegestuurd — `src/lib/brand-fidelity/visual-ai-judge.ts:124, 144-186`
- **[MEDIUM/truncation]** Coherence-judge kapt de te-beoordelen copy af op 1500 chars vóór de judge hem gelezen heeft — `src/lib/brand-fidelity/copy-image-coherence-judge.ts:85-87, 121`
- **[MEDIUM/instruction]** Geen output-taal-guard in alle judge-prompts terwijl rationales/summaries user-zichtbaar zijn — NL/EN-mengtaal in prompts maakt output-taal onvoorspelbaar — `src/lib/brand-fidelity/visual-ai-judge.ts (+ ad-judges, g-eval-rubric):visual-ai-judge.ts:103-128`
- **[MEDIUM/instruction]** Trend-judge: interne tegenstrijdigheid in approve-drempel én fabricage-check tegen evidence die de prompt niet meelevert — `src/lib/ai/prompts/trend-analysis.ts:277-309`
- **[MEDIUM/schema]** Trend-judge clampScore coerced geen numerieke strings — '85' wordt stil 50; inconsistent met de andere judges — `src/lib/trend-radar/trend-judge.ts:222-225`
- **[MEDIUM/truncation]** Visual-judge checkt stop_reason niet — bij max_tokens-truncatie faalt hij stil naar color-only score — `src/lib/brand-fidelity/visual-ai-judge.ts:172-198, 230-236`
- **[MEDIUM/schema]** Twee score-schalen (1-10 en 0-100) landen in dezelfde ContentFidelityScore.subCriteriaScores-kolom zonder schaal-marker — `src/lib/brand-fidelity/fidelity-runner.ts:432-443`
- **[LOW/quality]** Header-comment visual-ai-judge beschrijft 5 dimensies met weight 0.2 terwijl de code er 6 heeft à 1/6 — `src/lib/brand-fidelity/visual-ai-judge.ts:2-18 vs 27-34, 223-226`
- **[LOW/instruction]** G-Eval rubric-rommel: dode ternary met hardcoded '30', 'hieronder' wijst de verkeerde kant op, en overlappende detector-banden op 30/50 — `src/lib/brand-fidelity/g-eval-rubric.ts:216, 91-96, 211-247`
- **[LOW/quality]** AdQualityDrawer toont rauwe interne dimension-keys ('buzzfeed-principle', 'past-customer-novelty') als user-facing labels — geen label-map zoals bij visual-dimensies — `src/features/campaigns/components/canvas/ad-quality/AdQualityDrawer.tsx:150-169`
- **[LOW/infra]** AICallTrace-payloads claimen model/params die afwijken van de echte call en loggen 0 tokens — `src/lib/brand-fidelity/visual-fidelity-scorer.ts:123-131, 188-196`

### brandstyle-vision

- **[HIGH/instruction]** OBSERVED:/RECOMMENDED:-rubric-markers worden door de Voice-prompt in persisted velden gebakken; de 2026-06-10 stripAnalyzerMarkers-fix is alleen op het LP-pad toegepast, niet op brand-context/consistent-models/fidelity-judge — `src/lib/brandstyle/analysis-prompts.ts:325-345` ✓geverifieerd
- **[MEDIUM/instruction]** typeScale eist exacte lineHeight/weight uit CSS die nooit wordt aangeleverd + voorbeeld bevat placeholder-waarden 'calculated'/'estimated' die naar UI lekken — `src/lib/brandstyle/analysis-prompts.ts:115, 199-204, 255` ✓geverifieerd
- **[MEDIUM/truncation]** PDF-pad: één gecombineerde call met maxTokens 6000 voor output waar het URL-pad 3×4096 voor budgetteert — truncation laat de héle analyse falen — `src/lib/brandstyle/analysis-engine.ts:1213-1227` ✓geverifieerd
- **[MEDIUM/instruction]** Voorbeeld-JSON pint letterlijk "typeScale": [] terwijl een latere bullet vraagt hem te vullen — directe interne tegenspraak — `src/lib/brandstyle/analysis-prompts.ts:245 vs 254`
- **[MEDIUM/truncation]** fontSizes.slice(0, 20) kapt in CSS-bronvolgorde — heading-sizes die laat in gecompileerde CSS staan vallen buiten het venster — `src/lib/brandstyle/analysis-prompts.ts:199-204`
- **[MEDIUM/schema]** Visual-language-resultaat wordt ongevalideerd gespread en gepersisteerd — ontbrekende promptFragment/summary verdwijnen stil — `src/lib/brandstyle/visual-language-analyzer.ts:125-149`
- **[MEDIUM/quality]** Component-vision 'notes' worden op het selector-veld gepiggybackt maar nooit gepersisteerd — StyleguideComponent heeft geen selector-kolom — `src/lib/brandstyle/component-vision-enricher.ts:168-174`
- **[MEDIUM/infra]** Drie raw-SDK vision-calls draaien op default temperature 1.0 voor precisie-extractietaken — `src/lib/brandstyle/logo-vision-detector.ts:93-129`
- **[MEDIUM/truncation]** claude-vision-analyzer checkt stop_reason niet — max_tokens-truncatie verschijnt als misleidende JSON-parse-error; geen retry — `src/lib/consistent-models/claude-vision-analyzer.ts:137-159, 177-200`
- **[MEDIUM/instruction]** Geen output-taal-guard in de drie analyse-prompts; Voice-prompt mixt Engelse en Nederlandse instructies door elkaar — `src/lib/brandstyle/analysis-prompts.ts:299-350`
- **[MEDIUM/schema]** PDF-prompt vraagt nooit om vocabularyDo/Dont, voiceSample, fixtureSamples en designPhilosophy — PDF-merken missen structureel features die het URL-pad wél levert — `src/lib/brandstyle/analysis-prompts.ts:384-447`
- **[MEDIUM/infra]** Gefaalde/lege pixel-pass downgradet álle kleuren naar low-confidence — de 'kon-niet-meten ≠ bewezen-ongebruikt'-guard is alleen op de palette-filter toegepast, niet op de confidence-downgrade — `src/lib/brandstyle/analysis-engine.ts:474-487 vs 749-757`
- **[MEDIUM/infra]** Comment claimt dat malformed-JSON 'zelfs na retries' faalt, maar parse-fouten worden nooit geretried — één slechte sample = permanent lege voice-sectie — `src/lib/brandstyle/analysis-engine.ts:545-563`
- **[MEDIUM/infra]** Temperature-deprecation-guard bestaat alleen als inline regex in createClaudeStructuredCompletion; generateAIResponse in hetzelfde bestand stuurt temperature onvoorwaardelijk mee — `src/lib/ai/exploration/ai-caller.ts:97-105 vs 399-404`
- **[LOW/instruction]** Hero-pattern-prompt vraagt VIDEO_BG-classificatie uit een statische PNG — onkenbaar onderscheid; alleen `pattern` wordt gevalideerd — `src/lib/brandstyle/hero-pattern-detector.ts:47, 82-89`
- **[LOW/schema]** Illustration-prompt schrijft `| null` voor waar TS optionele (undefined) velden verwacht; moodTags ongeguard in generateStylePrompts — `src/lib/ai/prompts/illustration-analysis.ts:82, 92, 102, 122, 134-135, 239`
- **[LOW/quality]** Design-language-sectie 'CSS Design Variables (spacing, radius, grid, shadow, gradient)' wordt gevoed uit een kleur-gefilterde variabelenlijst — header belooft data die er structureel niet in zit — `src/lib/brandstyle/analysis-prompts.ts:484-488`
- **[LOW/quality]** Gemini-fallback: gehallucineerde logoUrl/fonts worden zonder validatie als detectie gepersisteerd — logo kan PRIMARY-slot krijgen — `src/lib/brandstyle/analysis-engine.ts:2593-2637`
- **[LOW/instruction]** Rule 7 noemt letterSpacing als verplicht-exact veld, maar geen enkele output-spec vraagt het — terwijl PDF-exporters het veld wél lezen — `src/lib/brandstyle/analysis-prompts.ts:115 vs 245-255`
- **[LOW/quality]** Logo-crop-padding is 8% van de volledige image-afmetingen i.p.v. van de bbox — kleine logo's krijgen omliggende nav-chrome in de PRIMARY-logo-asset — `src/lib/brandstyle/logo-vision-detector.ts:194-198`

### brandvoice-alignment

- **[CRITICAL/schema]** frameworkData dot-notation fix vervangt het hele Json-veld door een platte string — `src/lib/alignment/fix-generator.ts:526-531` ✓geverifieerd
- **[HIGH/infra]** Apply Fix faalt stil: issue wordt FIXED zonder enige wijziging, of blijft OPEN zonder feedback — `src/lib/alignment/fix-generator.ts:231-252 en 466-473` ✓geverifieerd
- **[HIGH/truncation]** Voice-corpus bevat alle subpagina's dubbel, mislabeld als [homepage], en de 18K-slice snijdt precies de voice-rijke subpagina's af — `src/lib/brandvoice/voice-analyzer-engine.ts:107-124` ✓geverifieerd
- **[HIGH/instruction]** Voice-analyzer heeft geen output-taal-guard: contentLocale/buildLocaleInstruction bestaat maar wordt niet gebruikt — `src/lib/brandvoice/voice-analysis-prompts.ts:22-41 en 65-103` ✓geverifieerd
- **[HIGH/schema]** Auditor-output volledig ongevalideerd: ontbrekend assetAssessments crasht de audit, fout impact/effort-enum crasht de audit-view permanent — `src/lib/alignment/auditor.ts:117-130 en 140-157` ✓geverifieerd
- **[MEDIUM/schema]** Scanner persisteert severity/counts ongevalideerd in één all-or-nothing nested create — één afwijkende enum-waarde faalt de hele scan — `src/lib/alignment/scanner.ts:165-174 en 244-289`
- **[MEDIUM/instruction]** Locale-instructie ('Do NOT mix languages... outranks any guidance below') conflicteert met verplichte Engelse enum-literals in scanner- en fix-prompts — `src/lib/ai/locale-instruction.ts:36-44`
- **[MEDIUM/instruction]** Fix-prompt krijgt de gevonden violation onvolledig door: recommendation, severity en modulePath worden weggelaten — `src/lib/ai/prompts/brand-alignment.ts:132-147`
- **[MEDIUM/quality]** AVOID-WINT vocab-dedupe-regel niet toegepast op het voice-analyzer accept-pad; prompt verbiedt overlap ook niet — `src/lib/brandvoice/voice-analyzer-engine.ts:186-188`
- **[MEDIUM/truncation]** Scanner-prompt dumpt module-data ongecapt (JSON.stringify zonder limiet) tegen een 60s-timeout onder de vuistregel; geen STEP_BUDGETS — `src/lib/ai/prompts/brand-alignment.ts:44`
- **[MEDIUM/infra]** Faal-paden fabriceren scores en persisteren ze als echt resultaat: module-fail/leeg → 75, audit-fail → 50 — `src/lib/alignment/scanner.ts:129-137 en 175-190`
- **[MEDIUM/truncation]** Auditor-input snijdt items mid-JSON af op 800 chars en toont max 20 items terwijl de header het volle aantal claimt — `src/lib/alignment/auditor.ts:197-205`
- **[MEDIUM/schema]** Fix-optie-keys ongevalideerd gecast en positionele padding kan dubbele keys produceren — `src/lib/alignment/fix-generator.ts:117-149`
- **[MEDIUM/instruction]** Audit-prompt mist de locale-instructie die scanner/fix wél krijgen — gemengde talen tussen alignment-surfaces — `src/lib/alignment/auditor.ts:197-247`
- **[LOW/instruction]** Optie C belooft 'document the intentional divergence' maar er wordt niets gedocumenteerd — `src/lib/alignment/fix-generator.ts:198-218`
- **[LOW/instruction]** Hardcoded Engelse fallback-teksten mengen met Nederlandse AI-output op NL-workspaces — `src/lib/alignment/fix-generator.ts:133-149`
- **[LOW/instruction]** Dode prompt-parameter: industry wordt nooit door de route meegegeven — `src/lib/brandvoice/voice-analyzer-engine.ts:70 en 149`
- **[LOW/schema]** Prompt-header claimt counts en server-validatie die niet bestaan; writingSamples-slice wijkt af van prompt-instructie — `src/lib/brandvoice/voice-analysis-prompts.ts:8-19`
- **[LOW/infra]** Voice-analyse-resultaat leeft alleen in een in-memory map — server-restart gooit een betaalde Claude-call weg — `src/lib/brandvoice/voice-analyzer-engine.ts:36 en 195-204`
- **[LOW/instruction]** Route-documentatie eist '3+ samples', zod-schema accepteert er 1 — die vervolgens op de 200-char-drempel strandt — `src/app/api/brandvoiceguide/analyze/url/route.ts:5-6 en 24-32`

### claw-personas

- **[CRITICAL/schema]** pageContext.contentType ontbreekt in Zod-requestSchema → LP-tekst-edit-instructies worden NOOIT geïnjecteerd; model krijgt het tegenovergestelde commando — `src/app/api/claw/chat/route.ts:54-77` ✓geverifieerd
- **[HIGH/truncation]** buildClaudeMessages dropt tool_result-berichten en toolCalls/toolResults uit de historie — Claude weet nooit of een mutatie is toegepast of afgewezen — `src/app/api/claw/chat/route.ts:407-428` ✓geverifieerd
- **[HIGH/infra]** Assistant-message met lege content wordt naar Anthropic teruggestuurd → 400 op élke volgende beurt; gesprek permanent kapot — `src/app/api/claw/chat/route.ts:422-424` ✓geverifieerd
- **[HIGH/truncation]** Geen stop_reason==='max_tokens'-detectie in de Claw agent-loop — afgekapte antwoorden worden als compleet getoond en gepersisteerd — `src/app/api/claw/chat/route.ts:188-194, 341-343` ✓geverifieerd
- **[MEDIUM/instruction]** temperature onconditioneel doorgegeven op Anthropic-pad van persona-chat (en insight-generator) — prior-art temperature-deprecation-guard (2026-05-24) niet toegepast; geen centrale helper — `src/lib/ai/persona-chat.ts:91-97` ✓geverifieerd
- **[MEDIUM/infra]** Anthropic→OpenAI-fallback in streamPersonaChat is dood voor API-fouten — errors worden binnen de stream opgegeten — `src/lib/ai/persona-chat.ts:303-326`
- **[MEDIUM/truncation]** Brandclaw agent-loop: stop_reason nooit gecheckt + truncated-flag niet gepersisteerd — afgebroken run is onzichtbaar als 'succesvolle run met 0 observaties' — `src/lib/brandclaw/orchestrator/agent-loop.ts:144-174, 277, 349-359`
- **[MEDIUM/ordering]** Persona-chat history laadt de OUDSTE 40 berichten i.p.v. de laatste 40 — recente beurten vallen uit de prompt — `src/app/api/personas/[id]/chat/route.ts:174-183`
- **[MEDIUM/schema]** zodToJsonSchema dropt alle `.optional().describe()`-beschrijvingen en collapsed unions naar string — Claude ziet een uitgekleed/strijdig tool-schema — `src/lib/claw/tools/registry.ts:46-123`
- **[MEDIUM/truncation]** System-prompt join-then-truncate op 48k chars (mid-woord, attachments eerst weg) + attachments dubbel geïnjecteerd met verschillende truncatie — `src/lib/claw/context-assembler.ts:57-66, 602-609`
- **[MEDIUM/quality]** AI-titel-upgrade is dead code: vergelijking `title === initialTitle` matcht turn-1-titel tegen turn-3-bericht — `src/app/api/claw/chat/route.ts:357-383`
- **[MEDIUM/instruction]** buildLocaleInstruction bestaat centraal maar ontbreekt in persona-insight-generator en titel-prompt — Engelse output in NL-workspaces, persistent in DB — `src/lib/ai/persona-insight-generator.ts:49-72, 88`
- **[MEDIUM/instruction]** Quick-action prompts zijn hardcoded Engels terwijl de system prompt 'Respond in the same language the user writes in' afdwingt — NL-merken krijgen Engelse veldwaarden voorgesteld — `src/lib/claw/quick-actions.ts:24-158`
- **[MEDIUM/infra]** Claw chat while-loop heeft geen max-iteraties of max-tool-calls-guard (de Brandclaw-orchestrator wél) — `src/app/api/claw/chat/route.ts:187, 323-343`
- **[LOW/instruction]** Dode route /api/personas/chat met afwijkend prompt-systeem en fragiel JSON-contract (raw-JSON fallback naar de UI) — `src/app/api/personas/chat/route.ts:22-28, 111-127`
- **[LOW/quality]** estimateContextTokens lowballt de system-identity (400 vs ~1.700 tokens) — UI-tokenindicator structureel te laag — `src/lib/claw/context-assembler.ts:72-80`
- **[LOW/instruction]** Identity zegt 'assistant for Brandclaw' (interne transformatienaam) en persona-groet is hardcoded Engels — `src/lib/claw/context-assembler.ts:84`
- **[LOW/infra]** Geen request-timeouts op Claw-chat en persona Anthropic/OpenAI-streams; prior-art vuistregel (timeout = maxTokens×10ms+30s) alleen elders toegepast — `src/lib/ai/persona-chat.ts:91-97, 160-167 vs 253`
- **[LOW/instruction]** Strategy Analyst prompt: '3-7 observations' (header) vs 'Max 5-7 observations per run' (scope rules) — innerlijk strijdige aantallen — `src/lib/brandclaw/nodes/strategy-analyst/system-prompt.ts:33 vs 85, 98`
- **[LOW/truncation]** Claw-conversatiehistorie zonder windowing: volledige messages-array gaat elke beurt mee — `src/app/api/claw/chat/route.ts:130, 150, 407-428`

### competitors-trends-scanner

- **[HIGH/truncation]** Content-classifier batch-budget en 5s-timeout te krap voor 25-URL batches — alle ambigue URLs vallen dan stil weg — `src/lib/competitors/content-discovery/content-classifier.ts:20, 96, 153` ✓geverifieerd
- **[MEDIUM/schema]** Gemini responseSchema met lege properties dwingt socialLinks en demographics ALTIJD naar {} — prompt vraagt wat het schema verbiedt (empirisch geverifieerd) — `src/lib/website-scanner/content-extractor.ts:23, 50` ✓geverifieerd
- **[MEDIUM/instruction]** Output-taal volgt browser Accept-Language van de toevallige requester; AI-classifier heeft geen vertaal-guard → taal-flip produceert valse CATEGORY_REPOSITIONING MAJOR-events + e-mail — `src/lib/competitors/ai-classifier.ts:100-105` ✓geverifieerd
- **[MEDIUM/schema]** BRAND_FOUNDATION_B-prompt vraagt uitgebreid 'brandVoiceguide'-blok dat nergens geconsumeerd wordt (interface, mapper en apply-route kennen de key niet) — `src/lib/ai/prompts/website-scanner.ts:285-299, 383`
- **[MEDIUM/truncation]** Apify-fallback levert ongelimiteerde bodyText die ongetrunceerd de competitor-refresh-prompt in gaat (direct-scrape en Gemini-fallback cappen wél op 8000) — `src/app/api/competitors/[id]/refresh/route.ts:120-126`
- **[MEDIUM/infra]** Geen centrale isTempDeprecatedModel-helper: regex zit inline in createClaudeStructuredCompletion, maar generateAIResponse stuurt temperature onvoorwaardelijk naar Anthropic — `src/lib/ai/exploration/ai-caller.ts:97-105`
- **[MEDIUM/instruction]** Volledige trend-pipeline heeft geen output-taal-contract, terwijl sibling-prompts in dit cluster wél via Accept-Language lokaliseren — `src/lib/ai/prompts/trend-analysis.ts:129-262, 270-364`
- **[MEDIUM/instruction]** Judge krijgt opdracht gefabriceerde datapunten te flaggen, maar heeft geen output-veld ervoor én krijgt het bewijsmateriaal niet te zien — `src/lib/ai/prompts/trend-analysis.ts:309`
- **[MEDIUM/schema]** synthesizeTrends crasht op trend zonder title — één malformed item gooit de hele batch weg — `src/lib/trend-radar/trend-analyzer.ts:210, 234`
- **[MEDIUM/quality]** Competitor-prompt vraagt hasBlog/hasCareersPage/socialLinks terwijl de scraper nav/footer/header verwijdert en maar één pagina (8K chars) levert — `src/lib/ai/prompts/competitor-analysis.ts:60-62`
- **[LOW/schema]** Audience&Products-prompt eist product-images 'uit de extractie-data', maar de user-prompt-builder stuurt nooit imageUrls mee — `src/lib/ai/prompts/website-scanner.ts:438-441, 453` ✓geverifieerd
- **[LOW/quality]** Judge-IMPROVE vervangt user-zichtbare title/description/howToUse zonder jargon-scrub of taalbewaking — `src/lib/trend-radar/trend-judge.ts:146-157`
- **[LOW/schema]** Discover-ranking: tier en relevanceScore uit model-output ongevalideerd doorgegeven aan de UI — `src/app/api/competitors/discover/route.ts:237-239, 282-284`
- **[LOW/instruction]** Classifier-rationale (Engels) + '[low-confidence]'-prefix lekken als user-zichtbare activity-summary — `src/lib/competitors/ai-classifier.ts:212-216, 110`
- **[LOW/quality]** Vier dode legacy-trend-prompts blijven geëxporteerd naast de actieve pipeline — drift/herbruik-risico — `src/lib/ai/prompts/trend-analysis.ts:366-507`
- **[LOW/schema]** Persona 'companySize' en product 'targetAudience' worden door de prompt gevraagd maar door de mapper-whitelist stil weggegooid — `src/lib/website-scanner/data-mapper.ts:9-25`

### image-video-prompts

- **[HIGH/schema]** Media AI-studio prompt bevat rauwe JSON.stringify van photographyStyle (incl. markers) en negeert de imagerySavedForAi-gate — `src/lib/consistent-models/workspace-context-resolver.ts:107-119, 216` ✓geverifieerd
- **[HIGH/ordering]** Hero-instruction wordt ACHTER een al-complete basisprompt geplakt: twee concurrerende Subject-instructies + hero-inhoud in de tail-truncatiezone — `src/app/api/studio/[deliverableId]/generate-visual/route.ts:334-337` ✓geverifieerd
- **[MEDIUM/instruction]** OBSERVED:/RECOMMENDED: analyzer-jargon lekt nog steeds in alle image/video-prompts via getBrandContext — de 2026-06-10 stripAnalyzerMarkers-fix is alleen op het brand-tokens-pad toegepast — `src/lib/ai/brand-context.ts:1328-1337` ✓geverifieerd
- **[MEDIUM/truncation]** quote-text-chip routeert naar Ideogram (800-char cap) terwijl onbegrensde brand-identity VÓÓR de quote staat — de te renderen quote kan volledig wegvallen — `src/lib/ai/visual-brief-prompts.ts:242-253, 354-365` ✓geverifieerd
- **[MEDIUM/instruction]** Photo-brief output is hardcoded Nederlands, negeert brand contentLanguage — inconsistent met suggest-visual-briefing — `src/app/api/studio/[deliverableId]/photo-brief/route.ts:19-30, 88`
- **[MEDIUM/truncation]** Video-prompt fallback stuurt rauw script (mid-woord op 400 chars geknipt, incl. dialoog/[VISUAL]-tags) als videoprompt naar fal — stil — `src/lib/studio/video-prompt-builder.ts:140`
- **[MEDIUM/instruction]** Compose-prompt bevat twee subjects: de compose-instruction wordt geprepend maar de chip-subject-seed uit de basisprompt blijft staan — `src/app/api/studio/[deliverableId]/generate-visual-compose/route.ts:237-245`
- **[MEDIUM/instruction]** Refine-hint 'remove ALL text' is niet chip-aware en de refine-prompt nest zichzelf bij een tweede iteratie — `src/lib/ai/image-quality/refine-loop.ts:49-50, 126-131`
- **[LOW/truncation]** suggest-visual-briefing detecteert geen max_tokens-afkap (geen stop_reason-check op 200-token budget) — `src/app/api/studio/[deliverableId]/suggest-visual-briefing/route.ts:83, 146-178`
- **[LOW/ordering]** Duplicate-retry plakt de CRITICAL-differentiatie-instructie achteraan terwijl low-coherence (terecht) prepend gebruikt — `src/lib/landing-pages/feature-visual-prompts.ts:196-209`
- **[LOW/instruction]** Legacy/no-brief feature-pad kan 'for a landing-page about: ' met lege headline interpoleren (pageHeadline optioneel) — `src/app/api/studio/[deliverableId]/generate-feature-visuals/route.ts:119-124`
- **[LOW/quality]** Persona-avatar income-heuristiek matcht op losse substrings ('50', '100', '150') en misclassificeert valuta-notaties — `src/app/api/personas/[id]/generate-image/route.ts:243-252`
- **[LOW/schema]** buildVideoPromptFromScript vertrouwt ongevalideerde JSON: non-string videoPrompt (object/number) stroomt door naar fal en DB — `src/lib/studio/video-prompt-builder.ts:123-140`
- **[VERWORPEN/infra]** photo-brief stuurt temperature naar claude-sonnet-4-6 via rauwe SDK — per eigen guard-regel een gegarandeerde 400 → elke photo-brief-klik 500't — `src/app/api/studio/[deliverableId]/photo-brief/route.ts:90-97` ✓geverifieerd — Weerlegd met live API-bewijs. Het citaat klopt letterlijk (route.ts:90-97: rauwe new Anthropic + claude-sonnet-4-6 + temperature:0.4) en de guard-comment bestaa
- **[VERWORPEN/infra]** dam-auto-tagger stuurt temperature 0.2 naar claude-sonnet-4-6 — elke vision-call 400't, catch slikt het stil: DAM auto-tagging is feature-breed dood — `src/lib/ai/dam-auto-tagger.ts:81-101, 133-139` ✓geverifieerd — Dubbel empirisch weerlegd. (1) Live API-test met exact de dam-auto-tagger-shape (claude-sonnet-4-6 + temperature:0.2 + system) → HTTP 200. (2) Live DB bewijst d

### studio-microtools-exploration

- **[HIGH/instruction]** Admin-configureerbare exploration reportPrompt + model/temperature/maxTokens worden volledig genegeerd door het rapport-pad; rapport mist ook brandContext en forceert Engels — `src/lib/ai/exploration/config-resolver.ts:176-197` ✓geverifieerd
- **[MEDIUM/infra]** generateAIResponse mist de temp-deprecation-guard — beloofde centrale isTempDeprecatedModel-helper bestaat niet; regel is op 2 van 4 anthropic-paden toegepast — `src/lib/ai/exploration/ai-caller.ts:97-105` ✓geverifieerd
- **[MEDIUM/truncation]** inline-transform: maxTokens 1024 te krap voor toegestane selecties tot 5000 chars — lange selecties falen gegarandeerd — `src/app/api/studio/[deliverableId]/inline-transform/route.ts:65-67, 126-138` ✓geverifieerd
- **[MEDIUM/infra]** Workshop-rapport: half-gepersiste state + permanente lock bij malformed AI-output (geen transactie, 409-guard blokkeert retry) — `src/app/api/workshops/[workshopId]/generate-report/route.ts:36-38, 84-120` ✓geverifieerd
- **[MEDIUM/schema]** persona-check: prompt eist personaId die het model nooit krijgt; relevanceScore 0 wordt 50; wrapper-instructie 'JSON object' spreekt prompt-eis 'JSON array' tegen — endpoint is bovendien dead — `src/app/api/studio/[deliverableId]/components/[componentId]/persona-check/route.ts:77-91, 144-156`
- **[MEDIUM/instruction]** tone-check heeft geen output-taal-guard en geen enum-validatie op alignment — Engels feedback voor NL-merken, inconsistent met inline-transform — `src/app/api/studio/[deliverableId]/tone-check/route.ts:201-216, 254`
- **[MEDIUM/quality]** tone-check accepteert onbegrensde, ongesanitizeerde content — sanitizer-regel inconsistent toegepast binnen dezelfde studio-routes — `src/app/api/studio/[deliverableId]/tone-check/route.ts:62-66, 197-199`
- **[MEDIUM/quality]** brand-asset regenerate: nul brand-context, user-instructions rauw in SYSTEM prompt, en prose overschrijft gestructureerde Json-content zonder shape-contract — `src/app/api/brand-assets/[id]/regenerate/route.ts:48-67`
- **[MEDIUM/ordering]** Exploration answer-route resolvet dimensies live uit config i.p.v. de sessie-snapshot — mid-sessie config-edits verschuiven vraag-volgorde en dimensionKeys — `src/app/api/exploration/[itemType]/[itemId]/sessions/[sessionId]/answer/route.ts:78-80, 185-206`
- **[MEDIUM/infra]** /api/ai/completion is een ongebruikte kale passthrough zonder sanitization of size-caps, met silente 1024-token truncatie — `src/app/api/ai/completion/route.ts:40-45, 85-90, 104-111`
- **[MEDIUM/schema]** improve-suggester: parser-drempel (≥5 chars) spreekt prompt-regel (≥10 chars verbatim) tegen en verifieert nooit dat currentText echt in de content staat — `src/lib/studio/improve-suggester.ts:41, 234-241`
- **[MEDIUM/quality]** quality-scorer degradeert silent: ontbrekende JSON-keys worden score 50 zonder uitleg, totale failure toont misleidend 'No content available for scoring' met overall 0 — `src/lib/studio/quality-scorer.ts:323-326, 198-201, 357-377`
- **[LOW/quality]** consistency-check: dead endpoint met onbegrensde sibling-join en redundant Label-veld — `src/app/api/studio/[deliverableId]/components/[componentId]/consistency-check/route.ts:67-70, 96-97`
- **[LOW/quality]** bug-analysis stuurt screenshot-URL als tekst naar een model dat hem niet kan bekijken — nodigt uit tot gefabriceerde 'screenshot-based' analyse — `src/lib/bug-analysis/analyze-bug.ts:136`
- **[LOW/instruction]** Dode exploration-llm functies (generateNextQuestion/generateFeedback) met Engels-only taalbeleid dat haaks staat op het live feedback-prompt — herwiring-valkuil — `src/lib/ai/exploration/exploration-llm.ts:175, 231`
- **[LOW/instruction]** Exploration feedback hergebruikt het vraag-georiënteerde systemPrompt ('Ask ONE question at a time') voor een taak die expliciet géén vraag mag stellen — `src/app/api/exploration/[itemType]/[itemId]/sessions/[sessionId]/answer/route.ts:123-129 i.c.m. config-resolver.ts:156-174`
- **[VERWORPEN/infra]** Exploration-rapport faalt structureel: temperature wordt altijd naar default-model claude-sonnet-4-6 gestuurd → 400 → silent fallback-rapport met afgekapte teksten en lege fieldSuggestions — `src/lib/ai/exploration/exploration-llm.ts:104-119, 363-377, 476-486` ✓geverifieerd — Code-chain klopt (exploration.api.ts:30-33 POST zonder body → analyze/route.ts:59-67 modelId=null → resolveModelConfig(null) → sonnet-4-6; callLLM stuurt temper
- **[VERWORPEN/quality]** UniversalAIExploration is nep-AI: gesimuleerde progress + template-output gepresenteerd als 'AI-Powered Strategic Analysis' — `src/components/strategy-tools/UniversalAIExploration.tsx:801-850, 1645-1685` ✓geverifieerd — Code-beschrijving klopt letterlijk (fake stage-progressbar r801-830, mockContent = generateContentForTool r832-840, '*This ... was generated using AI-powered st

### infra-clients-registry

- **[HIGH/truncation]** generateAIResponse heeft geen truncation-detectie, geen retry en geen timeout op alle drie provider-paden — `src/lib/ai/exploration/ai-caller.ts:106, 115, 121, 135-149, 167-179` ✓geverifieerd
- **[MEDIUM/infra]** DAM auto-tagger stuurt temperature mee op claude-sonnet-4-6 — elke media-upload-analyse faalt stil met 400 — `src/lib/ai/dam-auto-tagger.ts:81-85, 133-135` ✓geverifieerd [gedegradeerd: live API-test weerlegt 400 op sonnet-4-6 — latent risico, guard-inconsistentie blijft]
- **[MEDIUM/infra]** Photo-brief route: claude-sonnet-4-6 + temperature 0.4 → deterministische 400→500 voor de gebruiker — `src/app/api/studio/[deliverableId]/photo-brief/route.ts:91-96` ✓geverifieerd [gedegradeerd: live API-test weerlegt 400 op sonnet-4-6 — latent risico, guard-inconsistentie blijft]
- **[MEDIUM/infra]** Exploration-rapport: default-model claude-sonnet-4-6 + onvoorwaardelijke temperature → elke run valt terug op generiek placeholder-rapport — `src/lib/ai/exploration/exploration-llm.ts:50, 104, 113-119, 375-378, 463-487` ✓geverifieerd [gedegradeerd: live API-test weerlegt 400 op sonnet-4-6 — latent risico, guard-inconsistentie blijft]
- **[MEDIUM/infra]** generateAIResponse (ai-caller) mist de temperature-guard — workspace-instelbare Sonnet 4.6/Opus 4.7-modellen breken 5 features — `src/lib/ai/exploration/ai-caller.ts:97-105` ✓geverifieerd
- **[MEDIUM/truncation]** createClaudeStructuredCompletion: default maxTokens 16K maar default timeout 90s — schendt de eigen timeout-koppel-regel (190s) — `src/lib/ai/exploration/ai-caller.ts:397, 406, 489` ✓geverifieerd
- **[MEDIUM/infra]** Geen centraal isTempDeprecatedModel-helper — regex 2× gedupliceerd, in ≥3 Anthropic-call-paden afwezig — `src/lib/ai/anthropic-client.ts:100`
- **[MEDIUM/truncation]** Cross-provider default-budget-asymmetrie in generiek createStructuredCompletion: 16K (Claude) / 8K (OpenAI) / 4K (Gemini) — `src/lib/ai/exploration/ai-caller.ts:397, 654`
- **[MEDIUM/truncation]** anthropicClient.createChatCompletion en alle openaiClient-methodes hebben géén truncation-detectie — `src/lib/ai/anthropic-client.ts:125-132`
- **[MEDIUM/infra]** 15 directe AI-SDK-imports buiten src/lib/ai omzeilen alle centrale guards (verboden patroon) — `src/app/api/claw/chat/route.ts:2`
- **[MEDIUM/infra]** Prompt Registry dekt slechts een subset: tracking is opt-in (~35 van 64 helper-files) en 15 direct-SDK-paden ontbreken volledig, maar de UI claimt 'all AI prompt-templates' — `src/features/settings/components/prompt-registry/PromptRegistryTab.tsx:18-19, 38-41`
- **[MEDIUM/instruction]** Exploration-rapport hardcodet 'Write in English' zonder locale-guard — veldsuggesties voor NL-merken landen in het Engels in brand-velden — `src/lib/ai/exploration/exploration-llm.ts:333`
- **[MEDIUM/truncation]** Claw-chat agentic loop checkt stop_reason alleen op 'end_turn' — max_tokens-afkap wordt stil als assistent-bericht gepersisteerd — `src/app/api/claw/chat/route.ts:188-193, 341-344`
- **[LOW/schema]** parseReportJSON maskeert ontbrekende/misvormde velden met placeholder-strings i.p.v. te falen (validateOrWarn-patroon) — `src/lib/ai/exploration/exploration-llm.ts:432-457`
- **[LOW/schema]** openaiClient.createStructuredCompletion: maxTokens/timeout default op CHAT (1024 tok/30s) maar temperature op STRUCTURED — JSON-truncation-val (latent, geen callers) — `src/lib/ai/openai-client.ts:198-211`
- **[LOW/schema]** createGeminiStructuredCompletion JSON-extractie ondersteunt alleen top-level objects — top-level array van objects wordt stil gecorrumpeerd — `src/lib/ai/gemini-client.ts:365-369`
- **[LOW/infra]** Inconsistente retry-policies: openai/anthropic-client retryen ALLES behalve 400/401/403; ai-caller retryt alleen transient; Gemini-search retryt niets — `src/lib/ai/anthropic-client.ts:54-56`
- **[LOW/infra]** splitSystemFromMessages dropt multipart (array) message-content stil naar lege string — `src/lib/ai/anthropic-client.ts:76-81`
- **[LOW/infra]** Prompt-registry lijst-route labelt _max.createdAt als firstSeenAt — `src/app/api/admin/prompt-registry/route.ts:33, 113`
- **[LOW/quality]** generateNextQuestion en generateFeedback in exploration-llm zijn dead code met fout-maskerende fallbacks — `src/lib/ai/exploration/exploration-llm.ts:180-249`

### gap-exploration-seed-drift

- **[CRITICAL/instruction]** Alle reportPrompts (geseed + admin-bewerkt) zijn dode config — live rapport gebruikt een hardcoded Engels prompt zonder brand context — `src/lib/ai/exploration/exploration-llm.ts:321-358` ✓geverifieerd
- **[HIGH/infra]** Drie prompt-bronnen drijven structureel uiteen en het sync-script overschrijft live rijke prompts wholesale met generieke — `scripts/seed-exploration-configs.ts:16, 419-444` ✓geverifieerd
- **[HIGH/quality]** Live geseedde brand-personality config exploreert en suggereert voice-velden die BV-WIRE W-5 heeft gedeprecate'd — `prisma/seed.ts:4552-4559` ✓geverifieerd
- **[MEDIUM/schema]** Admin exploration-config POST/PUT: geen Zod, geen size-caps, geen temperature/maxTokens-grenzen, geen dimensions-shape-check — `src/app/api/admin/exploration-configs/[id]/route.ts:48-73` ✓geverifieerd
- **[MEDIUM/instruction]** Feedback-call krijgt tegenstrijdige instructies: systemPrompt eist 'Ask ONE question at a time' terwijl feedbackPrompt 'Never ask a follow-up question' eist — `src/app/api/exploration/[itemType]/[itemId]/sessions/[sessionId]/answer/route.ts:123-140`
- **[MEDIUM/instruction]** Config-knoppen grotendeels dood: maxTokens en contextSources hebben nul runtime-effect, model/provider/temperature gelden alleen voor feedback — `src/app/api/exploration/[itemType]/[itemId]/sessions/[sessionId]/answer/route.ts:144-151`
- **[MEDIUM/truncation]** Report-pad: callLLM zonder stop_reason-check en elke failure wordt stil gemaskeerd door een placeholder-fallback-rapport zonder fieldSuggestions — `src/lib/ai/exploration/exploration-llm.ts:113-121`
- **[MEDIUM/infra]** Derde ongeguarde inline temperature-pad: exploration-llm callLLM stuurt altijd temperature mee op default-model claude-sonnet-4-6 — `src/lib/ai/exploration/exploration-llm.ts:104-119`
- **[MEDIUM/ordering]** Answer route indexeert de live config op answeredDimensions i.p.v. de sessie-snapshot die analyze juist daarvoor opslaat — `src/app/api/exploration/[itemType]/[itemId]/sessions/[sessionId]/answer/route.ts:73-80, 174-176, 186-205`
- **[MEDIUM/quality]** Geseedde persona-prompts missen {{customKnowledge}}/{{assetKnowledge}} placeholders — knowledge wordt stil genegeerd — `prisma/seed.ts:4165-4172`
- **[LOW/quality]** Sessietaal gemengd: intro en alle vragen zijn hardcoded Engels, alleen feedback volgt de taal van de user — `src/app/api/exploration/[itemType]/[itemId]/analyze/route.ts:75-81`
- **[LOW/infra]** Vijfde prompt-kopie als dead code in exploration-llm met tegengestelde taalregels — `src/lib/ai/exploration/exploration-llm.ts:151-249`
- **[LOW/schema]** Complete-route accepteert voortijdige afronding en forceert 100% — `src/app/api/exploration/[itemType]/[itemId]/sessions/[sessionId]/complete/route.ts:54-56 + 87-96`

### gap-persona-routes

- **[CRITICAL/quality]** AI-gegenereerde strategic implications worden als rauwe JSON-blob in klant-PDF's gerenderd — `src/features/personas/utils/exportPersonaPdf.ts:229-233 + src/features/brandstyle/utils/brand-kit/buildCompositeBrandPdf.ts:702-703` ✓geverifieerd
- **[HIGH/quality]** Strategic implications gegenereerd zonder enige brand-/productcontext — `src/app/api/personas/[id]/strategic-implications/route.ts:88-97` ✓geverifieerd
- **[HIGH/schema]** Campagne-prompts eisen persona-ID-toewijzing die het model niet kán maken: buildSelectedPersonasContext bevat geen ID's en heeft geen orderBy — `src/lib/ai/persona-context.ts:131, 333-339 + src/lib/ai/prompts/campaign-strategy.ts:318/334/1268` ✓geverifieerd
- **[MEDIUM/instruction]** Prompt vraagt om Channel Strategy maar onthoudt het model juist preferredChannels (en buyingTriggers/decisionCriteria/bio/quote) — `src/app/api/personas/[id]/strategic-implications/route.ts:16-40 vs 92-97` ✓geverifieerd
- **[MEDIUM/ordering]** buildSelectedPersonasContext: geen orderBy → persona-volgorde in prompt is niet-deterministisch en negeert selectievolgorde — `src/lib/ai/persona-context.ts:333-339`
- **[MEDIUM/truncation]** buildSelectedPersonasContext ongecapt terwijl 3 strategy-chain-sites bij lege selectie ALLE workspace-persona's invoeren — `src/lib/ai/persona-context.ts:327-347 + src/lib/campaigns/strategy-chain.ts:781-784, 1052-1055, 1196-1199`
- **[MEDIUM/instruction]** Inconsistente persona-fallback binnen één wizard-flow: foundation ziet álle persona's, CQP-creatiefases zien er géén — `src/lib/campaigns/strategy-chain.ts:1423 vs 1052-1055/1196-1199`
- **[MEDIUM/schema]** Route slaat per-item ongevalideerde implicaties op; persona-context crasht downstream op ontbrekende priority en breekt álle generaties van de workspace — `src/app/api/personas/[id]/strategic-implications/route.ts:115-127 + src/lib/ai/persona-context.ts:219`
- **[MEDIUM/schema]** Parse-fail-gedrag: directe JSON.parse zonder fence-stripping of JSON-extractie-fallback — `src/app/api/personas/[id]/strategic-implications/route.ts:117-125`
- **[MEDIUM/infra]** Rauwe fetch naar api.anthropic.com met hardcoded legacy-model claude-sonnet-4-20250514, buiten alle centrale infrastructuur — `src/app/api/personas/[id]/strategic-implications/route.ts:75-84`
- **[MEDIUM/instruction]** System-instructie in user-role i.p.v. system-parameter — `src/app/api/personas/[id]/strategic-implications/route.ts:85-101`
- **[MEDIUM/quality]** Geen locale-instructie: Engelse implicaties in NL-workspaces, lekt door naar alle content-prompts — `src/app/api/personas/[id]/strategic-implications/route.ts:88-100`
- **[MEDIUM/infra]** buildPersonaChatSystemPrompt + MODE_INSTRUCTIONS zijn dood: derde parallelle persona-chatsysteem met gedivergeerde mode-taxonomie — `src/lib/ai/persona-context.ts:230-272, 393-491`
- **[MEDIUM/truncation]** Cascading context knipt sibling-teksten mid-zin op 200/500 chars en presenteert ze als consistentie-referentie — `src/lib/studio/context-builder.ts:220-227, 249-254`
- **[LOW/truncation]** 1024 max_tokens zonder stop_reason-check op 5-implicaties-JSON: clipping → harde 500 zonder retry — `src/app/api/personas/[id]/strategic-implications/route.ts:84, 112-125` ✓geverifieerd
- **[LOW/schema]** asStringArray cast Json-velden blind naar string[] → '[object Object]' in prompts mogelijk — `src/lib/ai/persona-context.ts:112-115`
- **[LOW/infra]** regenerateBlueprintLayer bouwt personaProfiles maar gebruikt het nooit — de enige id+naam-parende formatter is dood werk — `src/lib/campaigns/strategy-chain.ts:798, 805`
- **[LOW/infra]** Mutatie-route zonder invalidateCache (schendt repo-conventie) — `src/app/api/personas/[id]/strategic-implications/route.ts:128-131`

### gap-fal-image-paths

- **[CRITICAL/schema]** Style Transfer: vrije-tekst-prompt wordt naar enum-veld target_style gemapt → elke normale invoer faalt met 422 — `src/app/api/media/ai-images/optimize/route.ts:83-87` ✓geverifieerd
- **[HIGH/schema]** Hele trained-LoRA-pipeline: negative_prompt is een stille no-op — fal-ai/flux-2/lora heeft dat inputveld niet — `src/app/api/studio/[deliverableId]/generate-visual-trained/route.ts:240-242, 276-278` ✓geverifieerd
- **[HIGH/quality]** consistent-models/[id]/generate: guidance_scale default 7.5 op FLUX-2 (endpoint-default 2.5) + LoRA-scale wordt gereset zodra user guidance zet — `src/app/api/consistent-models/[id]/generate/route.ts:117-126` ✓geverifieerd
- **[MEDIUM/quality]** generate-references stuurt géén negative prompt: NEGATIVE_PROMPT_DEFAULTS ontbreken precies waar trainingdata wordt gemaakt — `src/app/api/consistent-models/[id]/generate-references/route.ts:111-113`
- **[MEDIUM/quality]** AI Studio generate (fal-pad): negative-kanaal volledig onbenut; donts alleen als zwakke positive-text 'AVOID:' — `src/app/api/media/ai-images/generate/route.ts:227-230`
- **[MEDIUM/quality]** Video-route negeert het negative-prompt-systeem terwijl Kling én Veo het native ondersteunen — `src/app/api/media/ai-videos/generate/route.ts:73-78`
- **[MEDIUM/schema]** Video-route valideert duration/aspect_ratio niet tegen eigen provider-registry; zod-default 5 is bij geen enkele provider toegestaan; registry zelf stale — `src/app/api/media/ai-videos/generate/route.ts:20-21 i.c.m. fal-video-providers.ts r61,76,91,106,121`
- **[MEDIUM/injection]** extractBrandTags laat OBSERVED/RECOMMENDED-markers als 'visuele tags' door naar prompts en UI-prefill — `src/lib/consistent-models/reference-prompt-builder.ts:68-73, 101-124`
- **[MEDIUM/quality]** Workspace-resolver vult brandDesignLanguage/toneOfVoice met letterlijke placeholder-strings — echte design-language bereikt image-prompts nooit — `src/lib/consistent-models/workspace-context-resolver.ts:121-126`
- **[MEDIUM/instruction]** Generieke STYLE/BRAND_STYLE/ILLUSTRATION reference-builders schrijven 21 onderling conflicterende kunststijlen voor — voor een model dat juist stijl-consistentie moet leren — `src/lib/consistent-models/reference-prompt-builder.ts:262-291, 386-416`
- **[MEDIUM/truncation]** applyNegativePromptStrategy: budget-floor van cap*0.5 heropent precies de staart-truncatie van de directive die de fix moest voorkomen (latent) — `src/lib/integrations/fal/fal-client.ts:388-391`
- **[LOW/truncation]** runFalGeneration past geen enkele prompt-cap toe — alle drie LoRA-routes omzeilen truncatePromptForModel volledig — `src/lib/integrations/fal/fal-client.ts:239-258`
- **[LOW/instruction]** consistent-models/[id]/generate gebruikt statische TRIGGER_WORDS-map i.p.v. het in DB opgeslagen model.triggerWord — `src/app/api/consistent-models/[id]/generate/route.ts:92-93`
- **[LOW/quality]** Illustration-template-snippets zijn 230-260 chars, niet de geclaimde ~150 — budgetclaim in cap-redenering klopt niet — `src/lib/ai/image-quality/illustration-templates.ts:30-44`
- **[VERWORPEN/schema]** Veo 3.1: duration als nummer gestuurd waar endpoint string-enum '4s'|'6s'|'8s' eist → elke Veo-call 422 — `src/app/api/media/ai-videos/generate/route.ts:72-78` ✓geverifieerd — Kernclaim empirisch weerlegd: fal's Veo-app coerceert numerieke durations naar 'Ns'-strings vóór enum-validatie. Live test op fal-ai/veo3.1/fast/image-to-video 

### gap-enrichment-fragments

- **[MEDIUM/injection]** Concept-pad (creative leap + defense) heeft geen jargon-guard en output wordt nooit gescrubd — bekende Effie-leak-klasse open op het pad dat campaignTheme bepaalt — `src/lib/ai/prompts/campaign-strategy-agents.ts:399-455` ✓geverifieerd
- **[MEDIUM/ordering]** Framework-dumps bezetten de recency-positie van elke strategy-prompt (laatste ~13K chars) zonder afsluitende taakherhaling — `src/lib/ai/prompts/campaign-strategy.ts:1277-1295`
- **[MEDIUM/injection]** effieCannesPotential wordt nog steeds in een live prompt geïnterpoleerd als 'Award potential: …' en de scrubber dekt dit niet — `src/lib/campaigns/strategy-chain.ts:379`
- **[MEDIUM/quality]** Gefabriceerde voorbeeld-statistieken in BCT-applicationHints worden in prompts geïnjecteerd terwijl de prompt om 'specific and verifiable' proofPoints vraagt — `src/lib/bct/goal-bct-mapping.ts:134, 148, 164, 201, 231`
- **[MEDIUM/quality]** Beroemde campagne-oneliners van andere merken zitten in 4 live prompts zonder niet-hergebruik-instructie — `src/lib/ai/prompts/campaign-strategy.ts:236-239, 1342-1346, 1447-1450`
- **[MEDIUM/instruction]** Inconsistent taalbeleid: quick mode forceert Engels, deep mode heeft géén taalinstructie — zelfde wizard, andere outputtaal — `src/lib/ai/prompts/campaign-strategy.ts:1670`
- **[MEDIUM/infra]** ~1.500 regels dode prompt-massa naast levende evenknieën, met divergente guards — fixes missen aantoonbaar paden — `src/lib/ai/prompts/campaign-strategy.ts:369-825`
- **[LOW/schema]** arena-queries goal-type-mapping gebruikt verouderde vocabulaire: 7 niet-bestaande keys, 8 van de 16 canonical goal types missen — `src/lib/arena/arena-queries.ts:187-206`
- **[LOW/quality]** Exa/Are.na queries plakken rauwe (potentieel NL) brand-waarden aan Engelse thema's — incoherente zoekqueries voor NL-merken — `src/lib/exa/exa-queries.ts:87-98`
- **[LOW/quality]** 'Beste insight'-autoselectie scoort puur op tekstlengte — beloont wolligheid in de eerste stap van de creatieve pipeline — `src/lib/campaigns/strategy-chain.ts:1549-1564`

### gap-canvas-formatters

- **[HIGH/truncation]** CTA prompt-contract (80 chars) vs storage-clamp (48 chars): legitieme CTA's worden stil afgebroken zonder ellipsis — `src/features/campaigns/lib/variant-content-sanitizer.ts:36 + 121-129` ✓geverifieerd
- **[HIGH/instruction]** Video-duration '30s' loopt door de podcast-branch: '- Target duration: 30s minutes.' + '- Video duration: 30s seconds.' in hetzelfde prompt — `src/lib/ai/canvas-orchestrator.ts:2654-2656 + 2697-2703` ✓geverifieerd
- **[HIGH/instruction]** Regeneration-prompt instrueert markdown ('## headings', 'geen walls of text') voor linkedin-poll groups question/option-1..4 — `src/lib/ai/canvas-orchestrator.ts:2447-2453` ✓geverifieerd
- **[HIGH/truncation]** persistRegeneratedGroup mist het linkedin-poll char-cap-vangnet volledig (geen contentTypeId-param) — `src/lib/ai/canvas-orchestrator.ts:3290-3298 + 3325-3352` ✓geverifieerd
- **[MEDIUM/instruction]** Medium-config guard-keys laten afhankelijke user-settings stil wegvallen uit het prompt — `src/lib/ai/canvas-orchestrator.ts:2625-2629, 2638-2644, 2654-2661, 2673-2694, 2702-2707, 2845-2851`
- **[MEDIUM/instruction]** Conflicterende headline-limieten in één prompt: ad-format-blok zegt max 70 chars, FORMATTING RULES zeggen 120-140 — `src/lib/ai/canvas-orchestrator.ts:2682 vs 2307`
- **[MEDIUM/instruction]** formatConstraintsForPrompt emit globale 'Maximum characters: N' zonder scoping voor multi-group/multi-variant output — `src/lib/ai/canvas-orchestrator.ts:2862-2876`
- **[MEDIUM/injection]** Stale/onbekende visual-style chip interpoleert letterlijk 'undefined' in de image-prompt-instructie — `src/lib/ai/canvas-orchestrator.ts:3462-3464`
- **[MEDIUM/quality]** withBrandContext slikt errors → stil merkloze generatie; lege context emit alsnog '## Brand Context' + orphan-richtlijn — `src/lib/ai/middleware.ts:84-90`
- **[MEDIUM/instruction]** /api/ai/completion: eigen system-message van caller onderdrukt brand-context-injectie stil, ondanks includeBrandContext=true — `src/app/api/ai/completion/route.ts:84-88`
- **[LOW/infra]** src/lib/studio/output-parser.ts is dead code — nul consumers voor de 'parser van alle template-outputs' — `src/lib/studio/output-parser.ts:169-236`
- **[LOW/schema]** Dubbele '## Brand Context'-heading in beide canvas-prompts; locale-instructie ingeklemd tussen de twee headings — `src/lib/ai/canvas-orchestrator.ts:2252-2253`
- **[LOW/quality]** formatBrandContextTier comment-vs-code drift: 'medium' belooft 'visual' maar rendert alleen brandColors; 'light' truncate mid-woord — `src/lib/ai/prompt-templates.ts:189 vs 293-299`
- **[LOW/ordering]** persistVariants compacteert gefaalde images: overgebleven beeld schuift naar variantIndex 0 + isSelected, prompt↔variant-koppeling verschuift — `src/lib/ai/canvas-orchestrator.ts:3250-3261`
- **[LOW/quality]** Legacy tone-key rendert dubbel: social-blok én long-form-blok emitten beide een Tone-regel uit hetzelfde config.tone — `src/lib/ai/canvas-orchestrator.ts:2587-2588 vs 2718-2727`
- **[LOW/instruction]** evidencePieces rich-render dropt regels ≤4 tekens stil (bv. afkortingen/bronnamen) — `src/lib/ai/canvas-orchestrator.ts:2986`

### gap-eval-baseline-locale

- **[MEDIUM/infra]** Golden-sets 'merge-gate' kan nooit falen: promptfoo-exit-code wordt weggeslikt met || echo — `.github/workflows/golden-sets.yml:59-62, 111` ✓geverifieerd
- **[MEDIUM/instruction]** 7-talen-whitelist met silent-''-fallback is single point of language-enforcement voor 14 feature-surfaces; drie gedupliceerde taallijsten — `src/lib/ai/locale-instruction.ts:10-18, 30-34, 51-55`
- **[MEDIUM/infra]** Anti-bias judge is shelfware: CI draait alleen mock-smoke, JUDGE_SYSTEM_PROMPT wordt nergens echt gebruikt; echte gate gebruikt promptfoo-rubric zónder position-swap — `scripts/eval/position-swap-judge.ts:87-103`
- **[MEDIUM/quality]** Position-swap JUDGE_SYSTEM_PROMPT mitigeert alleen position bias: geen verbosity/self-preference-instructie en geen 'beide onvoldoende'-uitkomst — `scripts/eval/position-swap-judge.ts:87-103`
- **[MEDIUM/schema]** blog-post.yaml llm-rubric dicteert een eigen JSON-outputcontract dat botst met promptfoo's grader-contract; threshold 'Pass: totalScore >= 4.0' is voor promptfoo betekenisloze prose — `tests/content-golden-sets/long-form/blog-post.yaml:81-95`
- **[MEDIUM/quality]** Drift-judge: 1-10 schaal-ankers zijn uitsluitend in brand-match-termen geformuleerd maar gelden ook voor de twee brand-onafhankelijke dimensies (naturalness/fluency) — `scripts/fidelity/judge-prompts.ts:19-24 vs 46-50`
- **[MEDIUM/instruction]** Drift-judge krijgt de verwachte output-taal niet mee: volledig verkeerde-taal-output scoort hoge fluency (alleen 'partial' mixing wordt bestraft) — `scripts/fidelity/judge-prompts.ts:49, 53-92`
- **[MEDIUM/schema]** Judge-runner fabriceert default-score 5 bij ontbrekende/onparsebare dimensies en bij lege Sonnet-respons ('{}'-fallback) — gefabriceerde 5.0-composieten worden als echte meting weggeschreven — `scripts/fidelity/judge.ts:129-133, 139, 190`
- **[MEDIUM/quality]** Vanilla baseline taal-asymmetrie: Engelse scaffolding + geen locale-instructie vs harde locale-enforcement aan Branddock-zijde — uplift voor NL-workspaces deels taal-artefact — `src/lib/brand-fidelity/vanilla-baseline.ts:41-43, 54-77`
- **[LOW/quality]** Vanilla baseline overige fairness: licht TE sterke brief (conservatief, ok) maar doc-comment noemt baseline ten onrechte 'ceiling' — `src/lib/brand-fidelity/vanilla-baseline.ts:45-52, 66-75, 84-86, 103`
- **[LOW/instruction]** buildLocaleSystemFragment is production-dead: geen enkel system-prompt draagt de taal-instructie; enforcement rijdt uitsluitend mee in het context-blok — `src/lib/ai/locale-instruction.ts:51-58`
- **[LOW/truncation]** Position-swap judge: geen stop_reason-check + greedy JSON-regex — truncated respons crasht hard i.p.v. degradeert — `scripts/eval/position-swap-judge.ts:150-157, 170-182`
- **[LOW/quality]** Tie-break-regel 'Bij gelijke kwaliteit: kies de eerste variant' injecteert bewust positie-bias als tie-detector — werkt, maar is ongedocumenteerd en verlaagt sensitiviteit bij near-ties — `scripts/eval/position-swap-judge.ts:93`
- **[VERWORPEN/truncation]** Vanilla baseline: max_tokens 4096 vs woordtargets tot 30.000 — gegarandeerde mid-sentence-truncatie voor long-form, finish_reason ongecontroleerd — `src/lib/brand-fidelity/vanilla-baseline.ts:75, 102, 110-113` ✓geverifieerd — De codefeiten kloppen (r75 woordrange uit echte constraints — ebook 5000-30000, whitepaper 2500-10000; r102 max_tokens 4096; r110-113 alleen empty-check), maar 

### gap-prompt-injection

- **[MEDIUM/injection]** Malicious competitor site → extracted fields → getBrandContext → injected unsanitized into ALL content-generation prompts (second-order injection) — `src/lib/ai/brand-context.ts:1437-1452` ✓geverifieerd
- **[MEDIUM/injection]** Injected competitor content can force a false CATEGORY_REPOSITIONING (MAJOR) event → email + in-app notification to all workspace users — `src/lib/competitors/ai-classifier.ts:190-204` ✓geverifieerd
- **[MEDIUM/injection]** Raw scraped bodyText concatenated with forgeable plaintext delimiters in competitor/website analysis prompts; competitiveScore manipulable — `src/lib/ai/prompts/competitor-analysis.ts:86-113`
- **[MEDIUM/injection]** Attacker-controlled PDF text and PDF metadata (author/title) injected raw into product-analysis prompt — `src/lib/ai/prompts/product-analysis.ts:96-117`
- **[LOW/injection]** RSS/sitemap item titles injected raw into theme-tagger prompt and into activity-feed summaries — `src/lib/competitors/content-discovery/content-classifier.ts:152 + src/lib/competitors/diff-engine.ts:398`
- **[LOW/injection]** Persona field values + knowledge context injected into persona-chat system prompt with a no-break-character directive and no isolation — `src/lib/ai/context/persona-serializer.ts:64-81`
