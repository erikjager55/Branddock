---
id: prompt-audit-fase-0-1
title: Prompt-audit Fase 0 (STOP-GATE quick wins) + Fase 1 (truncatie-discipline centraal)
fase: pre-launch
priority: now
effort: 5-7 dagen (audit-schatting; parallel uitgevoerd)
owner: claude-code
status: done
created: 2026-06-11
completed: 2026-06-11
related-adr: -
related-spec: docs/audits/2026-06-11-prompt-audit.md
worktree: branddock-feat-prompt-audit
---

# Probleem

De prompt-audit van 2026-06-11 (409 bevindingen, 14 CRITICAL) verklaarde alle vier de testklachten: teksten afgebroken, verkeerde opdrachten, onvolledig, verkeerde volgorde. Fase 0 en 1 van het verbeterplan (§5 van het rapport) adresseren de directe oorzaken: 9 kleine CRITICAL/HIGH-fixes met direct user-zichtbaar effect, plus de hoogste-hefboom-fix — centrale truncatie-detectie in alle AI-clients zodat elk toekomstig budget-defect zichtbaar wordt in plaats van stil.

# Voorstel

Elf file-disjuncte fix-clusters (A t/m K), parallel uitvoerbaar. Fase 0 = contract/schema/render-quick-wins (C2, C6, C8, C9, C10-stop, C13-render, C14, regen-cluster, LP-CTA). Fase 1 = stop_reason/finish_reason-detectie in de drie clients + dispatch + ai-caller, `getMaxTokensForComponent` op registry-basis, gedeelde budget-helper (timeout = maxTokens×10ms+30s) toegepast op week-themes/judges/inline-transform, thinking-budget bovenop output-budget.

# Acceptatiecriteria

- [x] C6: `strategyFoundationSchema` (+ Gemini-responseSchema) behoudt coreMessage/proofPoints/reasonToAct bij schema-conforme output (safeParse-test groen)
- [x] C9: `pageContext.contentType` bereikt de Claw system-prompt; LP-edit-instructies worden geïnjecteerd op LP-canvas (wiring naar `context-assembler.ts:497` geverifieerd)
- [x] C8: SEO step 6 (en variant B) levert markdown-draft zonder JSON-conflict (envelope-contract `{ "draft": ... }` + extractDraft, STEP_BUDGETS entry 6: 24K/240s)
- [x] C14: Style Transfer accepteert normale invoer zonder fal 422 (enum-validatie + duidelijke 400 met allowedStyles)
- [x] C2: week-themes compleet voor campagnes van 12+ weken (maxTokens schaalt met weeks + gekoppelde timeout)
- [x] C13: persona-PDF + brand-kit-PDF tonen geformatteerde implicaties, nooit een JSON-blob (echte shape `{category,title,description,priority}` + legacy-fallback)
- [x] C10: frameworkData.*-fixes vernietigen het Json-veld niet meer (read-modify-write op sub-pad)
- [x] C11: silent auto-iterate dupliceert geen titel/meta/CTA meer de body in (skip bij >1 text-group + structured warn)
- [x] Regenerate: behoudt component-volgorde, past poll-char-caps toe, geen markdown-instructie voor korte plain-text velden (`isPlainTextGroup` gedeeld via sanitizer)
- [x] LP-rewrite: hero/finalCta CTA-identiteit in prompt verankerd + genormaliseerd na parse
- [x] Fase 1: `stop_reason === 'max_tokens'` / `finish_reason === 'length'` / Gemini MAX_TOKENS gedetecteerd in anthropic-client, openai-client, ai-caller (text + beide structured OpenAI-paden); gemini-client throwde al; dispatch-completion propageert
- [x] C1: `getMaxTokensForComponent` matcht echte groepsnamen; body-achtige groepen ≥8192; linkedin-article (16K) / linkedin-newsletter (8K) in resolveMaxTokens
- [x] Thinking-budget komt bovenop het output-budget i.p.v. erbinnen
- [x] Budget-helper `src/lib/ai/call-budget.ts` (`timeoutForTokens`) toegepast op week-themes, ad-judge dispatcher, inline-transform, dispatch-completion (met oude buckets als vloer), generateAIResponse (vloer 120s); learning-loop judge-cap word-safe + truncatie-marker
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors op alle 33 gewijzigde files (2 pre-existing warnings, ook op origin/main)
- [x] Smoke-test uitgevoerd — zie Notes
- [x] Documentatie bijgewerkt (audit-rapport + data-JSON aan branch toegevoegd)

# Bestanden die ik aanraak (file-ownership per cluster)

- **A**: `src/lib/campaigns/strategy-blueprint.types.ts`
- **B**: `src/app/api/claw/chat/route.ts`
- **C**: `src/lib/ai/seo-pipeline.ts` (+ evt. `src/lib/ai/prompts/seo-prompts.ts`)
- **D**: `src/app/api/media/ai-images/optimize/route.ts` (+ evt. UI-veld voor target_style-keuze)
- **E**: nieuw `src/lib/ai/call-budget.ts`, `src/lib/campaigns/brief-week-theme-prompt.ts`, `src/lib/ad-validation/judge/dispatcher.ts`, `src/app/api/studio/[deliverableId]/inline-transform/route.ts`, `src/lib/learning-loop/fidelity-scorer.ts`
- **F**: `src/features/personas/utils/exportPersonaPdf.ts`, `src/features/brandstyle/utils/brand-kit/buildCompositeBrandPdf.ts`
- **G**: `src/lib/alignment/fix-generator.ts`, `src/lib/ai/prompts/brand-alignment.ts`
- **H**: `src/lib/ai/canvas-orchestrator.ts`, `src/features/campaigns/lib/variant-content-sanitizer.ts`
- **I**: `src/lib/landing-pages/variant-tell-rewrite.ts` (+ parse-normalisatie call-site)
- **J**: `src/lib/ai/anthropic-client.ts`, `src/lib/ai/openai-client.ts`, `src/lib/ai/gemini-client.ts`, `src/lib/ai/dispatch-completion.ts`, `src/lib/ai/exploration/ai-caller.ts`
- **K**: `src/lib/studio/component-prompt-builder.ts`

# Bestanden die ik NIET aanraak

- `src/lib/ai/exploration/exploration-llm.ts` — C12 (exploration-éénwording) is Fase 5, eigen task
- `src/app/api/personas/[id]/strategic-implications/route.ts` — route-herbouw door anthropicClient is Fase 5; alleen de PDF-render (F) is nu in scope
- `src/lib/ai/dam-auto-tagger.ts` — parallelle sessie werkt hieraan; temperature-kwestie is bovendien latent (zie gotcha 2026-06-11)
- `prisma/seed.ts` / component-templates-fallback (C3/C4/C5) — Fase 2, eigen task
- `src/lib/ai/locale-instruction.ts` — Fase 4

# Smoke test plan

1. `npx tsc --noEmit` + `npx eslint` op alle gewijzigde files → 0 errors
2. Bestaande smoke-suites die de geraakte paden dekken draaien (`npm run smoke:*` voor canvas/web-page-builder waar aanwezig)
3. Gericht: unit-niveau verificatie per fix via `npx tsx` script waar zinvol (schema-parse met coreMessage; sanitizer-clamp met ellipsis; budget-helper formule)
4. 2-subagent review-pass over de volledige diff vóór oplevering

# Risico's

- **Truncatie-detectie maakt voorheen stille truncaties tot zichtbare errors** — gewenst gedrag, maar call-sites met structureel te krappe budgetten kunnen nu falen i.p.v. stil afkappen. Mitigatie: budgetten in dezelfde task verhoogd (C1, resolveMaxTokens-tiers); review-pass checkt op call-sites die een graceful pad nodig hebben.
- **Parallelle sessie op main** — deze worktree is van origin/main `206dcde5` afgetakt; merge-volgorde afstemmen bij landing.
- **H raakt het drukste bestand (canvas-orchestrator)** — één agent is eigenaar van het hele bestand om edit-races te voorkomen.

# Out of scope

- Fase 2 (component-contract-laag: 17 types fallback-templates, sequences, website-types)
- Fase 3-5 (validatie-hygiëne, taal/jargon, configuratie-éénwording, meetlat)
- Doorlopend kwaliteitsprogramma (golden-sets, prompt-contract-docs)

# Notes

- Bron: `docs/audits/2026-06-11-prompt-audit.md` §3 (CRITICALs) + §5 (plan) + data-JSON voor exacte file:line per bevinding.
- Live-API-feit: sonnet-4-6 + temperature = 200 OK; alleen opus-4-7 400't (gotcha 2026-06-11) — temperature-guard-centralisatie is Fase 5, niet hier.

## Uitvoering 2026-06-11

- **Gebouwd via 11 parallelle file-disjuncte agents (A-K) + 2-reviewer pass.** Review: 3 unieke MAJORs + 8 MINORs, alle 11 verwerkt:
  - MAJOR tweet-newlines: `stripMarkdown(_, preserveLineBreaks)` — tweet-*/cta-tweet behouden regeleindes (X rendert die), andere plain-text groepen blijven single-line.
  - MAJOR chat-budgetten vs truncatie-throws: `MAX_TOKENS.CHAT` 1024→2048 + `TIMEOUT_MS.CHAT/STRUCTURED` 50s (config.ts); exploration-feedback 512→1024.
  - MAJOR timeout-vloer: `generateAIResponse` op `max(timeoutForTokens, 120s)` (Opus-klasse ~30 tok/s); dispatch-completion houdt oude buckets (60s/180s) als vloer.
  - MINORs: formule-consolidatie naar `timeoutForTokens`-import, `finish_reason==='length'`-check op beide OpenAI-structured-paden, stabiele secundaire orderBy-keys (`[order, variantIndex, id]`) op 6 DeliverableComponent-reads, structured console.warn-payloads (dispatcher + tell-rewrite), EN-foutmelding optimize-route, audit-rapport aan branch toegevoegd.
- **Afwijkingen agents** (gedocumenteerd, akkoord): K — `body_text` zat al in de Set (registry-pad had al 8192; canvas-groepen niet — kern C1 bleef geldig). J — gemini-client throwde al, dispatch slikte niets in. H — `isPlainTextGroup` bestond al in sanitizer; daar verbreed i.p.v. gedupliceerd. I — normalisatie op de 2 route-call-sites (variant-generator.ts is gedeeld met generatie-pad en buiten scope).
- **Gates**: tsc 0 errors; eslint 0 errors (33 files); smokes: web-page-builder volledig groen (338 PASS), lp-text-quality 49/49, lp-assistant-edits 32/32, ad-creative-validation 15/15, longform-tweaks 9/9, studio compleet ([OK] alle 5 tests, incl. live generatie door het nieuwe dispatch-pad), structured-tweaks 12/13 — de ene fail (carousel slide-titles verbatim, live-LLM check) faalt óók op origin/main (3/5 vs 1/5): pre-existing + model-stochastisch, niet door deze diff.
- **Worktree-gotcha bevestigd**: verse worktree heeft `.env` + `.env.local` kopie nodig voor DB/AI-smokes (tsx laadt geen .env.local; `set -a; source` werkt).
- **Risico-aandachtspunt voor browser-smoke**: B-fix maakt de #318 LP-edit-tools voor het eerst bereikbaar via de system-prompt op alle 5 Puck-webpage-types — de mutation_proposal→confirm-flow verdient een handmatige check.
