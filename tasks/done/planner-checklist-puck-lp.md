---
id: planner-checklist-puck-lp
title: Planner-checklist false negatives voor Puck web-pages (title/hero) + SEO-wipe hardening
fase: pre-launch
priority: now
effort: ~0.5 dag
owner: claude-code
status: done
created: 2026-06-10
completed: 2026-06-11
related-adr: -
related-spec: -
worktree: - (main working tree, geen commit zonder user-trigger)
---

# Probleem

De Publication Checklist in Canvas Step 4 (Planner) toont voor Puck-based
web-pages (landing-page e.a.) gegarandeerde false negatives op "Title or
headline is set" en "Hero image added". Diagnose (multi-agent, 2026-06-10,
Napking LP `cmq8i7bla…`):

1. `has-title` checkt alleen of een `DeliverableComponent`-tekstgroep letterlijk
   `title`/`headline`/`subject` heet (`Step4Timeline.tsx:137-139`); de Puck-flow
   persisteert de headline in `settings.structuredVariant.hero.headline` +
   `puckData` en maakt nooit zo'n tekstgroep aan.
2. `has-image` leest uitsluitend de store-slice `heroImage`, die alleen uit een
   `variantGroup='hero-image'`-rij hydrateert (`CanvasPage.tsx:337-354`). Die rij
   wordt alleen door de handmatige picker (POST /hero-image) geschreven — de
   AI-hero-flows patchen settings + schrijven `visual`-rijen, nooit `hero-image`.
3. Verzwarend: de SEO-pipeline deed `deleteMany` op ÁLLE component-rijen
   (`seo-pipeline.ts`), waardoor ook hero/visual-rijen van eerdere flows
   verdwenen.

# Voorstel

1. **Step4Timeline.tsx** — voor `isPuckWebpageType(contentType)` vallen
   `has-title` / `has-image` / `has-body` / `has-cta` terug op de al-gehydrateerde
   `structuredVariant`-store-slice (hero.headline / hero.heroVisualUrl /
   hero.primaryCta / sectie-items). `has-meta` valt (alle types) terug op
   `contentTypeInputs.metaDescription` (door SEO-pipeline teruggeschreven).
2. **publish-timing.ts** — Puck-specifieke checklist-branch (analoog aan
   poll/search-ad) met passende labels voor de 5 PUCK_WEBPAGE_TYPES.
3. **Hardening**:
   a. `seo-pipeline.ts` deleteMany beperken tot niet-image-rijen zodat
      hero/visual-rijen een SEO-rerun overleven.
   b. `patch-hero-visual.ts` — bij geslaagde hero-patch ook de
      `hero-image`-rij upserten (pariteit met POST /hero-image), zodat de
      store/checklist hem ziet. Dekt alle 3 AI-routes via het chokepoint.

# Bestanden die ik aanraak

- `src/features/campaigns/components/canvas/accordion/Step4Timeline.tsx`
- `src/features/campaigns/lib/publish-timing.ts`
- `src/lib/ai/seo-pipeline.ts`
- `src/lib/deliverable/patch-hero-visual.ts`
- `src/app/api/studio/[deliverableId]/hero-image/route.ts` (review-ronde 2:
  POST atomair gemaakt — was de andere helft van de upsert-race)
- `scripts/smoke-tests/web-page-builder-phase68-hero-url-wiring.ts`
  (puckPatched-contractdekking)
- `tasks/planner-checklist-puck-lp.md` (deze file)

# Acceptatiecriteria

- [x] Napking LP (`cmq8i7bla…`) toont in Planner: title + hero + body + CTA groen
      (browser-geverifieerd), zonder dat data gewijzigd is.
      → Playwright 2026-06-11: alle 5 items groen (incl. meta via
      contentTypeInputs), warning-regel afwezig, 0 console-errors,
      screenshot `/tmp/planner-checklist-after-fix.png`.
- [x] Niet-Puck types: checklist-gedrag ongewijzigd (geen nieuwe signalen die
      vals-positief kunnen zijn — alle fallbacks zijn additief/disjunctief).
      → Inline-review: puckSignals is null buiten PUCK_WEBPAGE_TYPES; klassieke
      (pre-Puck) landing-pages krijgen identieke required-vlaggen, alleen het
      label wijzigt. has-meta contentTypeInputs-signaal kan niet vals-positief
      zijn (veld bestaat alleen indien gezet).
- [x] SEO-pipeline-rerun verwijdert geen media-rijen meer.
      → `componentType` is non-nullable → `notIn: ['image','video','voiceover']`
      sluitend (zelfde conventie als canvas-orchestrator); order-duplicaten
      onschadelijk (consumers sorteren per variantGroup op variantIndex).
- [x] AI-hero-generatie (alle 3 routes) levert een `hero-image`-rij op wanneer
      de settings-patch slaagt; fill-only-semantiek blijft intact
      (patched=false → geen row-write → handmatige keuze onaangetast).
- [x] `npx tsc --noEmit` 0 errors + eslint clean op de geraakte files
      (3 pre-existing warnings, niet door deze diff).

# Review-verloop (task-finalize 2026-06-11)

- **Ronde 1** (2 verse subagents): 0 critical, 3 warnings → gefixt:
  `puckPatched`-gate (fill-only heal overschreef handmatige keuze-rij niet
  meer), atomaire upsert op compound-unique (P2002-slik weg), stale
  `visualBrief` gewist bij row-update. + minor: deleteMany naar
  `notIn ['image','video','voiceover']` (orchestrator-conventie).
- **Ronde 2** (2 verse subagents): 0 critical, 4 warnings → gefixt:
  puckSignals prefereert nu `contextStack.puckData` (volgt editor-edits na
  refetch; structuredVariant-snapshot alleen als fallback), `has-meta`
  contentTypeInputs-signaal puck-gated (WordPress-excerpt van blog-article
  leest alleen de tekstgroep), POST /hero-image atomair (andere helft van de
  upsert-race), phase68-smoke dekt het `puckPatched`-contract (30/30).
- **Ronde 3**: subagent-limiet (reset 12:50) → inline geverifieerd:
  `CanvasContextStack.puckData` gedeclareerd + gevuld op mount
  (canvas-context.ts:192/513), BrandHero-propnamen kloppen
  (headline/heroVisualUrl/ctaLabel), chrome-blocks (BrandNav/StickyCtaBar)
  uitgesloten van body-telling, non-Puck-gedrag bit-for-bit identiek.
  Browser-herverificatie ná de rework: 5/5 groen, warning afwezig,
  0 console-errors.
- Deferred minors: `ai-generated` vs `ai_generated` vocab-drift,
  `WEBSITE_DELIVERABLE_TYPES`↔`PUCK_WEBPAGE_TYPES` duplicaat, order-dup bij
  gelijktijdige writers (pre-existing), in-sessie has-meta-lag tot refetch.

# Out-of-scope

- `has-meta` hydratie uit `settings.seoChecklist` (alleen contentTypeInputs-pad).
- DELETE /hero-image die ook puckData cleart (bestaande asymmetrie).
- Atomische jsonb-writes voor de settings-blob (bekende beperking, gedocumenteerd
  in patch-hero-visual.ts).

# Smoke-test

- tsc + lint + bestaande `npm run smoke:*` relevant voor web-page-builder.
- Browser: Napking LP Step 4 checklist-status vóór/na.
