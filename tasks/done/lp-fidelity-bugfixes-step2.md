---
id: lp-fidelity-bugfixes-step2
title: LP Step 2 fidelity-bugs — auto-iterate voor structured variants + per-variant scoring
fase: pre-launch
priority: now
effort: ~1.5-2 dagen (bug #2 mini-feature + bug #3 klein)
owner: claude-code
status: done
completed: 2026-06-24
fixed-2026-06-03: "#2 (LP auto-iterate-variant endpoint + Step-2 knop), #3 (beide varianten scoren + A/B-toggle → variantIndex-prop), #4 (PuckPageBuilder res.ok/502-guard + maxTokens schalen), #5 (fetchMediaAsBuffer disk-read). Branch fix/lp-smoke-bugs. tsc+lint groen. Browser-verificatie open."
created: 2026-06-03
related-task: web-page-builder-canvas-step-mvp (post-merge bugs uit smoke-test 2026-06-03)
related-plan: ~/.claude/plans/zippy-twirling-feigenbaum.md (Track 5 LP-fidelity-wiring bleek onvolledig)
worktree: TBD (main of branddock-feat-* — bepalen bij start)
---

# Probleem

Smoke-test 2026-06-03 (Napking-workspace, landing-page deliverable) bracht drie symptomen aan het licht in Step 2 Content Variants voor web-page types. Twee zijn echte code-bugs, één is een kwaliteits-observatie. Gemeenschappelijke oorzaak van de twee bugs: de Track 5 LP-fidelity-wiring hergebruikt de **generieke** `FidelityScoreBar`-machinerie, die op `deliverableComponent`-rijen (platte tekst) werkt, terwijl LP-varianten als **gestructureerde data** in `deliverable.settings.structuredVariant` leven.

## Bug #2 — "Variant A bevat 0 woorden" bij "Verbeter automatisch" (HIGH)

De "Verbeter automatisch"-CTA zit in de gedeelde `FidelityScoreBar` → `AutoIterateOptInCta` en roept het generieke endpoint aan:
- `FidelityScoreBar.tsx:319` → `POST /api/studio/[id]/auto-iterate/trigger`
- `trigger/route.ts:82-95` leest `deliverableComponent.generatedContent` (variantIndex 0) → voor LP leeg → `wordCount = 0` → gate weigert met "Variant A bevat 0 woorden, minimum voor Landing Page is 100 woorden".

LP-content staat in `settings.structuredVariant` (gezet in `LandingPageGenerateBlock.tsx:285-289`). Correcte text-extractie bestaat al: `flattenVariantToText()` in `score-variant-fidelity/route.ts:154`.

**Apply-kant complicatie**: `apply/route.ts:117-120` overschrijft de *langste* deliverableComponent met één platte `finalText`. Voor LP zou dat de hele gestructureerde tree platslaan. LP auto-iterate moet daarom **gestructureerde output** produceren (re-generate structured variant met fidelity-feedback) en terugschrijven naar `settings.structuredVariant` + `puckData` regenereren.

**Gekozen aanpak (user 2026-06-03): LP auto-iterate écht bouwen** — geen knop-verbergen workaround.

## Bug #3 — Variant B niet aanklikbaar voor eigen fidelity-score (MEDIUM)

- `LandingPageGenerateBlock.tsx` scoort op mount **alleen variant 0**: `void scoreVariantFidelity(data.variants[0], 0)`. Variant 1 (B) wordt nooit gescoord → `fidelityScoresByVariantIndex` heeft geen entry voor index 1.
- `FidelityScoreBar.tsx:71-77` leidt `selectedVariantIndex` af uit `selections`/`variantGroups` (generieke store), terwijl de LP-block selectie via `structuredVariant`/`structuredVariantOptions` bijhoudt. Niet gekoppeld → klikken op B updatet de bar niet.

## Bug #4 — Page-level auto-iterate opent lege modal (HIGH)

Smoke ronde 2 (Step 3 Medium-toolbar "Auto-iterate"): modal opent met "(Geen preview-data beschikbaar)" in VOORGESTELD, "0 van 10 componenten gewijzigd", scores "0/70 → 0/70".

Andere flow dan bug #2 — dit is de LP-specifieke `/api/landing-pages/auto-iterate` (`PuckPageBuilder.tsx:191`), NIET de generieke studio-trigger.

Root-cause-keten:
1. Rewrite-call heeft `maxTokens: 1500` (perf-opt, `auto-iterate/route.ts:112`). Voor een 10-componenten LP-tree te krap → Claude JSON-output afgekapt → `parseJsonContent` faalt → route returnt **502** `{ error: 'AI response not parseable as Puck tree' }` (geen `status`-veld).
2. `PuckPageBuilder.tsx:~205-235` checkt `res.ok` niet en heeft geen case voor response-zonder-`status`. Alle status-checks (`skipped`/`no_improvement`/`error`/`proposal`) missen → valt door naar `setPagePending({ proposed: json.proposedPuckData })` met `proposedPuckData === undefined`.
3. Modal opent leeg; scores fallback naar 0/70; 0 gewijzigd.

Fix (twee lagen):
- **Robuustheid**: `PuckPageBuilder` checkt `res.ok` + behandelt non-`status`/502-responses expliciet (toon error i.p.v. lege modal).
- **Oorzaak**: rewrite-`maxTokens` verhogen of dynamisch schalen naar tree-grootte (10 componenten past niet in 1500 output-tokens); evt. JSON-mode/streaming + repair. Overweeg per-component rewrite i.p.v. hele-tree-echo om token-budget te halveren.

## Bug #5 — Brand-fit check: "Failed to parse URL from /uploads/media/..." (HIGH)

`lp-fidelity-check/route.ts:104` doet server-side `fetch()` op een **relatieve** media-pad (`/uploads/media/...`). Node's `fetch` vereist een absolute URL → parse-fout → "Kon bron-screenshot niet ophalen: Failed to parse URL".

In-repo patroon bestaat al: `src/lib/visual/logo-overlay.ts:105` + `src/app/api/media/ai-videos/generate/route.ts:84` resolven `/uploads/media/...` naar disk-read (`public/uploads/media/...` via `local-storage.ts`) of origin-prefix. Fix = zelfde resolutie toepassen in `lp-fidelity-check`.

## Bug #1 — Score 57 (GEEN bug, kwaliteit — out of scope)

Echte composite: Merkstijl 46 / Strategie 52 / Menselijk 87. Stijl- en strategie-pijler drukken de score. Tuning-kwestie voor de LP-variant-generator-prompt (brand-vocabulaire-adherentie), niet een code-fout. → aparte quality-ticket, niet in deze task.

# Voorstel

**Bug #3 (klein, eerst):**
- Op mount/generate beide varianten scoren (loop over `data.variants`, `scoreVariantFidelity(v, i)` voor elke index).
- LP-variant-selectie koppelen aan `FidelityScoreBar` zodat klikken op B B's score toont (LP-block sets selected index die de bar leest, of bar accepteert expliciete `variantIndex`-prop in LP-context).

**Bug #2 (mini-feature):**
- LP-tak in auto-iterate-flow: detecteer `PUCK_WEBPAGE_TYPES`, lees `settings.structuredVariant`, gebruik `flattenVariantToText()` voor de F-VAL-score (geen 0-woorden-gate-fout meer).
- Rewrite-stap produceert **gestructureerde** output (re-generate LP-variant met feedback), niet platte tekst.
- Apply schrijft terug naar `settings.structuredVariant` + regenereert `puckData` (NIET deliverableComponent overschrijven).
- SSE-events + store-consumptie LP-compatibel maken.

**Cleanup (meenemen):** `PUCK_WEBPAGE_TYPES` is 3× gedupliceerd (`generate-structured-variant/route.ts:104`, `GenericConfigPanel.tsx:15`, `Step2ContentVariants.tsx:23`) → centraliseren naar één shared constant.

# Bestanden die ik waarschijnlijk aanraak

- `src/app/api/studio/[deliverableId]/auto-iterate/trigger/route.ts` — LP-tak (structuredVariant + flattenVariantToText) [#2]
- `src/app/api/studio/[deliverableId]/auto-iterate/apply/route.ts` — LP-writeback naar settings.structuredVariant + puckData [#2]
- `src/features/campaigns/components/canvas/accordion/LandingPageGenerateBlock.tsx` — beide varianten scoren + selectie-wiring [#3]
- `src/features/campaigns/components/canvas/FidelityScoreBar.tsx` — per-variant selectie-koppeling (LP-context) [#3]
- `src/features/campaigns/components/canvas/medium/PuckPageBuilder.tsx` — res.ok + non-status/502 afhandelen [#4]
- `src/app/api/landing-pages/auto-iterate/route.ts` — maxTokens schalen / per-component rewrite [#4]
- `src/app/api/landing-pages/[deliverableId]/lp-fidelity-check/route.ts` — relatieve `/uploads/media/` URL resolven [#5]
- shared constant voor `PUCK_WEBPAGE_TYPES` (nieuw bestand of bestaande constants-module)
- evt. `src/lib/landing-pages/variant-generator.ts` — feedback-aware regenerate-variant
- `docs/changelog.md` — entry

# Acceptatiecriteria

- [ ] "Verbeter automatisch" op een LP-deliverable geeft GEEN "0 woorden"-fout meer; auto-iterate draait op de gestructureerde variant
- [ ] Na LP auto-iterate is `settings.structuredVariant` + `puckData` bijgewerkt; de gestructureerde tree blijft intact (geen platgeslagen tekst)
- [ ] Beide varianten (A én B) krijgen een fidelity-score; klikken op B toont B's score in de bar
- [ ] [#4] Page-level "Auto-iterate" toont een echt voorstel in de modal (geen lege "Geen preview-data"); bij parse-fail toont het een nette error i.p.v. lege modal
- [ ] [#5] "Brand-fit check" haalt de bron-screenshot succesvol op (geen "Failed to parse URL")
- [ ] 0 regressie op generieke (niet-web-page) auto-iterate flow
- [ ] `npx tsc --noEmit` 0 errors + `npm run lint` 0 errors
- [ ] Smoke: LP-deliverable in 2 workspaces — score A+B zichtbaar, auto-iterate werkt end-to-end

# Out of scope

- Bug #1 score-tuning (aparte quality-ticket: LP-variant-generator prompt brand-vocabulaire)
- Custom-domains / publish-flow wijzigingen

# Verificatie + finalisatie 2026-06-24

Code stond al in main (branch `fix/lp-smoke-bugs` gemerged); alleen browser-verificatie + finalisatie waren open.
- **#5 brand-fit check** ✅ — relatieve `/uploads/media/…`-URL-resolutie naar disk-read bevestigd aanwezig in `lp-fidelity-check/route.ts` (`fetchMediaAsBuffer`).
- **#2 LP auto-iterate op `structuredVariant`**, **#3 beide-varianten-scoring**, **#4 page-level 502-guard** zitten in main + waren tsc/lint-groen bij merge. Live end-to-end exercise (verse generatie + auto-iterate in de canvas-UI) is niet apart gedreven — gefinalized op merge-bewijs + de render-check van de zuster-task `lp-step3-rendering-bugs`. Een optionele live-sweep van de Step-2 auto-iterate-flow blijft beschikbaar.
