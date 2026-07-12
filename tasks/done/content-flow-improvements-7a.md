---
id: content-flow-improvements-7a
title: Content-flow verbeteringen — friction-tickets uit #7.A flow-analyse
fase: pre-launch
priority: next
effort: "gemengd — zie per ticket"
owner: claude-code
status: done
created: 2026-05-29
completed: 2026-07-12
related-adr: docs/adr/2026-07-12-type-category-derivation-plan-and-solve.md
related-spec: docs/specs/content-flow-synthesis.md
worktree: branddock-content-flow-7a (feat/content-flow-7a)
---

> **Verificatie-sweep 2026-07-12** (autonome sessie): alle 9 tickets zijn eerst
> tegen de actuele main geverifieerd — ze dateren van 2026-05-29 en een flink
> deel bleek intussen geland via andere werkstromen (Puck-paradigma,
> prompt-audit Fase 2, Track 5 F-VAL-wiring, hidden-flags-besluit). Verdicts
> per ticket hieronder; uitgevoerd werk in commits `9adf77dd` (CF-1/3/4 +
> smoke-sectie g + ADR) en `eaff014d` (CF-5/8).

# Probleem

De #7.A flow-analyse (8 categorie-rapporten + `docs/specs/content-flow-synthesis.md`) heeft concrete, code-bevestigde frictie blootgelegd die geen documentatie maar code-werk vraagt. Dit bestand bundelt die tickets zodat #7.A puur analyse blijft (geen autonome code-fixes). Er bestond nog geen `code-debt-pre-launch-cleanup.md`, vandaar een eigen task-file.

# Voorstel

Per ticket een afgebakende fix; aanpakken in prio-volgorde (HIGH eerst). HIGH-items raken merkbare output-kwaliteit pre-launch.

# Tickets

## HIGH
- [x] **CF-1 — 5 untemplated kerntypes → generieke prompt.** ✅ **GROTENDEELS VERVALLEN + rest geland** (2026-07-12): alle 55 canonieke types bleken inmiddels een dedicated template te hebben (whitepaper/ebook/article in `long-form.ts` — incl. de ebook-verbeterplan-prompt-fixes, `newsletter` in `email.ts`, `microsite` in `website.ts`). Rest-scope geland in `9adf77dd`: `console.warn` op de generic-fallback-hit + smoke-sectie (g) die afdwingt dat élk canoniek type een template heeft en houdt.
- [x] **CF-2 — `twitter-thread` afmaken.** ✅ **VERVALLEN** (2026-07-12): al volledig bedraad op main — template in `social-media.ts`, `XThreadPreview` in `preview-map.ts:112`, fallback-entry in `component-templates-fallback.ts:150`, inputs in `content-type-inputs.ts:134`. Type is zichtbaar en passeerde Ronde 1 (23/24 passed, alleen ebook-bug).

## MED
- [x] **CF-3 — Plan-and-Solve generaliseren.** ✅ geland in `9adf77dd`, gewijzigd t.o.v. ticket-scope: eligibility = long-form-categorie + `EXTRA_PLAN_AND_SOLVE_TYPES` (`proposal-template`, `impact-report`). **Website-types bewust uitgesloten** — sinds het Puck-paradigma lopen alle 5 `PUCK_WEBPAGE_TYPES` via de structured-variant-flow; Plan-and-Solve's single-body-markdown zou dat contract breken. NB: `usePlanAndSolve` heeft geen UI-toggle (dormant pad). ADR: `2026-07-12-type-category-derivation-plan-and-solve`.
- [x] **CF-4 — `TYPE_TO_CATEGORY` synchroniseren.** ✅ geland in `9adf77dd`: map wordt afgeleid uit de 8 template-collecties (kan niet meer divergeren). Werkelijke delta: 9 phantoms + 11 ontbrekende (waaronder `facebook-ad`/`linkedin-video-ad`, niet in het ticket genoemd). Runtime-blast-radius bleek klein: `getPromptVersionForType` had 0 call-sites; enige consumer was de dormante Plan-and-Solve-check. Smoke-sectie (g) bewaakt de dekking (293/293 PASS na de review-fix-ronde).
- [x] **CF-5 — Few-shot uitbreiden advertising + email.** ✅ advertising-helft geland in `eaff014d`: tweede anchor in een contrasterende branche voor de 6 **zichtbare** ad-types (search/social/display/native-ad + linkedin-ad/facebook-ad) + expliciete niet-kopiëren-instructie (anti example-bleed — alle bestaande anchors waren brand-strategy-SaaS; zelfde leak-klasse als de Effie-gotcha 2026-05-17). 41 velden programmatisch binnen hun character-limits gevalideerd. Versions: advertising 1.3.0, social-media 2.1.0, registry gesynct. **Email-helft SKIP**: hele email-categorie staat `hidden: true` — uitbreiden bij re-enable. Hidden ad-types (retargeting-ad, video-ad) idem.
- [ ] **CF-6 — Email sequence-coherentie-pass.** ⏸️ **SKIP** (2026-07-12): `welcome-sequence`/`nurture-sequence` staan `hidden: true` — onbereikbaar via de picker. Oppakken bij email-categorie-re-enable, samen met `studio-siblings-context-variation` (post-launch).
- [ ] **CF-7 — Elevated review public-facing pr.** ⏸️ **SKIP** (2026-07-12): `press-release` + `impact-report` staan `hidden: true`, én het mechanisme is per-workspace DB-config (`WorkspaceContentTypeThreshold` via Settings → Validation), geen code-defaults — preventief tunen zonder pilot-data is tegen projectbeleid (zelfde rationale als CF-10 en de Δ-4-verplaatsing).
- [x] **CF-8 — Categorie-grens ad/long-form templates.** ✅ geland in `eaff014d`: gekozen voor **documenteren, niet verplaatsen** — headers van `social-media.ts` + `advertising.ts` + toelichting in `prompt-version-registry.ts`. Verplaatsen zou de afgeleide prompt-versie-categorie flippen zonder baat; model-routing volgt toch al de UI-categorie via `getDeliverableTypeById`.
- [x] **CF-9 — landing-page Step 2 brand-fidelity wiring verifiëren.** ✅ **VERVALLEN** (2026-07-12): wiring staat op main — `LandingPageGenerateBlock.tsx` heeft `scoreVariantFidelity` (fire-and-forget F-VAL, Track 5 uit plan zippy-twirling-feigenbaum) + per-variant score-toggle; `Step2ContentVariants.tsx:398` rendert `FidelityScoreBar` voor content-deliverables.

## LOW / defer
- [ ] **CF-10 — Per-categorie F-VAL threshold-profielen** — uitstellen tot pilot-data (geen preventieve tuning).

# Bestanden die ik aanraak

Per ticket verschillend — zie inline file-refs in de categorie-rapporten. Géén bulk-refactor.

# Out of scope

- Video-categorie her-activeren (hangt op `video-chain-explainer-showcase`).
- Carousel multi-slide pipeline (eigen task).

# Review-ronde (2026-07-12)

Twee parallelle code-reviewer subagents op de branch-diff: **0 CRITICAL, 4 WARNINGs
(waarvan 1 dubbel gerapporteerd), alle gefixt** in de review-fix-commit:
- Smoke sectie (g) testte de collecties, niet het echte lookup-pad → nu via nieuwe
  export `hasDedicatedTemplate()` tegen het werkelijke `TEMPLATE_REGISTRY` (vangt een
  weggevallen spread-regel).
- Geen guard op cross-collectie key-collisions (drievoudig stil last-wins) → assert
  som-van-collectie-keys === unieke keys.
- Fallback-warn vuurde misleidend op het legacy-pad met lege contentType (2× per
  generatie op het hot path) → alleen warnen bij truthy id + once-per-type throttle.
- Minors: `Record<string, PromptTemplate>`-typing, consistente lokale
  `deliverableTypeId`, RDA-voorbeeld-image 200/200 → ~178 chars marge, ADR-Y-statement
  gepreciseerd ("effectief gelijkblijvend; enige delta facebook-ad dormant").

Beide reviewers bevestigden onafhankelijk: 23/24 zichtbare types byte-identiek gedrag;
enige delta is facebook-ad's dormante Plan-and-Solve-eligibility (bedoelde bugfix);
geen import-cycles; geen client-side prompt-IP-lek (0 client-imports van registry én
studio-templates). Gates na fixes: tsc 0 errors · lint 0 errors (966 pre-existing
warnings codebase-breed) · prompt-contracts **293/293 PASS**.

**Follow-up (optioneel, niet blokkerend)**: (a) versie-map en type→categorie-map
splitsen zodra een derde lichte consumer de registry importeert (~380KB
template-strings in de serverless bundle van 2 API-routes — gedocumenteerde tradeoff
in de ADR); (b) eslint `no-restricted-imports`-guard tegen toekomstige client-import
van de registry.

# Notes

Bron: `docs/specs/content-flow-synthesis.md` §F. Friction-secties (§6) in de categorie-rapporten zijn deels *pending Ronde 1* — nieuwe tickets kunnen hier bijkomen zodra het handmatige testplan vordert.
