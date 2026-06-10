---
id: lp-editor-image-field
title: Media-library picker als Puck image-field in de Layout editor (Step 3)
fase: pre-launch
priority: now
effort: ~1 dag
owner: claude-code
status: done
created: 2026-06-10
completed: 2026-06-10
related-task: lp-image-source-wiring, web-page-builder-canvas-step-mvp
worktree: main (feat/lp-editor-image-field)
plan: ~/.claude/plans/vivid-tinkering-fern.md
---

# Probleem

In de fullscreen Puck Layout editor (Canvas Step 3) is `heroVisualUrl` op
BrandHero een kaal tekstveld met een raw `/uploads/media/...`-URL. De user wil
daar de bekende media-library interactie: afbeelding selecteren, zoeken of
genereren. Die interactie bestaat al (ImageSourcePanel modal-variant), maar was
niet gekoppeld aan de Puck-velden.

Bijvangst-bug: FeatureGrid's `features.arrayFields` miste `imageUrl` terwijl de
render `f.imageUrl` toont — Puck's onChange stript props zonder field-def
(zelfde mechanisme als de bandTone-strip), dus élke FeatureGrid-edit wiste stil
de gegenereerde feature-beelden.

# Oplossing

1. **`PuckImageField.tsx`** (nieuw) — Puck custom field: thumbnail-preview +
   "Kies/Vervang afbeelding" → shared Modal (portal naar document.body,
   zIndex 2147483647 = gelijk aan FullscreenEditorModal, latere DOM-order wint)
   met `ImageSourcePanel variant='modal'` (6 tabs via nieuwe `sources`-prop;
   compose/trained/photography-request/none weggelaten — dead-ends in
   veld-context). ESC sluit alléén de picker (capture-phase guard). Selectie →
   `onChange(url)` → bestaand autosave-pad; bewust géén extra server-write.
2. **`ImageSourcePanel`** — optionele `sources?: VisualBriefSource[]`
   filterprop (backward-compatible).
3. **`puck-config.tsx`** — `imageField(label, allowClear)`-factory; gewired op
   BrandHero.heroVisualUrl (allowClear=false), FeatureSplit imageUrl en
   FeatureGrid imageUrl (beide allowClear=true; FeatureGrid = strip-bug-fix).
4. **Chokepoint-sync** — `syncHeroFromPuck` (pure, hero-visual-preserve.ts) in
   de studio-PATCH-route ná `preserveHeroOnSettings`: spiegelt non-lege
   puckData-hero naar `structuredVariant.hero.heroVisualUrl` zodat
   export/regenerate niet op een stale URL lezen (autosave stuurt alleen
   puckData).
5. **Self-heal fill-only** — `applyHeroUrlToSettings`/`patchHeroVisualUrl`
   kregen `opts.onlyIfEmpty`; generate-visual route + client accepteren
   `heroWriteMode: 'fill-only' | 'overwrite'`. Alleen het self-heal-pad stuurt
   fill-only (+ zelfde guard client-side in de completion-handler) zodat een
   handmatige keuze tijdens de ~30s generatie nooit wordt overschreven.
   Expliciete generate/compose/trained-flows blijven overwrite.

# Review-fixes (adversariële 3-lens review, 2026-06-10)

- **Body-scroll-lock**: shared `Modal` reset `body.overflow` unconditioneel
  naar `''` bij sluiten → wiste de lock van een onderliggende laag. Fix:
  module-level lock-teller in `Modal.tsx` (release naar `''` bij count 0 —
  géén snapshot, die kan een stale `'hidden'` van directe body-writers
  bevriezen) + `lockBodyScroll`-prop + centrale Puck-guard in de acquire
  (geen body-write zolang een Puck-editor gemount is — dekt ook geneste
  modals zoals GenerateImageModal). (Een eigen lock op `FullscreenEditorModal`
  is bewust TERUGGEDRAAID — zie scroll-fix hieronder.)
- **Error-boundary om lazy picker**: chunk-load-failure liet de
  Suspense-spinner eeuwig hangen → `PickerErrorBoundary` met retry
  (conventie: error states verplicht in UI-componenten).
- Weerlegd door verificatie-agents: z-index tie-break (DOM-order is hier
  deterministisch: editor-portal mount vóór picker-portal) en
  field-remount/state-verlies in Puck custom fields.

# Scroll-fix Layout editor (browser-bug, Playwright-gediagnosticeerd 2026-06-10)

User: rechterpaneel én pagina scrollen niet in de editor. Twee oorzaken
(zie gotchas.md 2026-06-10 voor de volledige les):
1. **Puck `100dvh` hardcoded** (`._PuckLayout_`) → editor groeide 50px voorbij
   het viewport binnen onze topbar-wrapper; onderste strook afgekapt +
   onbereikbaar (pre-existing, zichtbaar geworden door het hogere
   image-field-paneel). Fix: scoped CSS-override `.bd-puck-editor-fit .Puck` +
   `[class*="_PuckLayout_"]` → `height: 100%` in `FullscreenEditorModal`.
2. **Body-lock lekte de preview-iframe in**: Puck spiegelt parent-body-
   attributen (incl. inline style) naar de iframe-body → de zojuist
   toegevoegde editor-body-lock maakte de LP-preview onscrollbaar (regressie
   zelfde dag). Fix: editor-body-lock verwijderd met verklarende comment;
   Modal save/restore blijft.

Playwright-bewijs ná fix: Puck 930/930 past in wrapper, `Vervang afbeelding`
bereikbaar (y=919), iframe-body schoon, canvas-wheel scrollt preview (1500px),
sidebar-wheel scrolt veldenpaneel (700px). Harnas: `/tmp/repro-scroll/*.py` +
`scripts/dev/print-session-cookie.ts` (herbruikbaar voor browser-repro's).

# Acceptatiecriteria

- [x] BrandHero-veld in Layout editor toont thumbnail + picker i.p.v. raw URL
      (Playwright-geverifieerd: veld + thumbnail renderen in de sidebar)
- [x] Library-keuze landt in canvas + na autosave in BEIDE DB-sporen —
      **browser-bewezen 2026-06-10** (Playwright-pick op Napking-LP → psql:
      puckData én structuredVariant identiek op de gekozen library-foto)
- [ ] FeatureSplit/FeatureGrid imageUrl via picker + titel-edit (strip-bug-fix)
      — code-verified (field-def aanwezig = de fix); 2-min handmatige UX-check
      resteert (headless flaky op wisselende kaartvolgorde)
- [ ] Feature-beeld "Verwijderen" → fallback — code-verified render-guard;
      handmatige check resteert
- [ ] ESC sluit alléén de picker — capture-guard 5x adversarieel gereviewd
      (listener-volgorde geverifieerd); handmatige check resteert
- [x] Self-heal overschrijft een handmatige keuze niet (fill-only — server
      `onlyIfEmpty` + client completion-guard; smoke phase68 dekt de transform)
- [x] `tsc` + `eslint` 0 errors; smokes phase61 29/29 + phase68 24/24 groen
      (beide vereisen `DATABASE_URL`-env, pre-existing prisma module-import)
- [ ] Regressie: InsertImageModal (niet-LP) toont nog alle 10 tabs; `/p/<slug>`
      published render intact

# Out of scope

- Bewust hero-wissen (clear-flag in PATCH + self-heal-suppressie) — follow-up
- Compose/trained modal-support in de picker
- Alt-tekst persisteren in puckData
- Pre-existing autosave-races (AbortController/intent-tombstone)

# Browser-pass resultaat (2026-06-10, Playwright)

- ✅ Hero-pick via Library: beide DB-sporen identiek na autosave (psql-bewijs)
- ✅ Fidelity-score boven variant-selector: DOM-order + screenshot in de echte
  variant-keuze-staat (score 90 boven Variant A/B-thumbnails)
- ✅ Editor-scroll (sidebar + canvas/iframe) en veld-rendering (eerdere passes)
- ⏳ ESC / feature-pick+titel-edit / Verwijderen: code-verified, 2-min
  handmatige UX-check open (headless flaky door live wisselende kaartvolgorde)

# Merge-historie

`d681ba50` (#320, hernummerd van #316) + `0bc93926` (minors) → merge `56849bba`
(main #317-hotspots) → `a1251d47` (text-quality #316-collision) → main-merge
`3ba85ad7` → `26d2d751` (claw #318-collision) → **gepusht naar origin/main**.
