---
id: web-page-builder-canvas-step-spike
title: Spike — PuckPageBuilder als Step 3 Medium-renderer voor `landing-page` type valideren
fase: post-launch (spike — pre-launch fill-in)
priority: next
effort: 1-2 dagen
owner: claude-code
status: open
created: 2026-05-22
related-adr: docs/adr/2026-05-22-landing-page-builder-architectuur.md
related-spec: tasks/_drafts/idea-landing-page-builder.md
worktree: branddock-spike-puck-canvas
---

# Probleem

De web-page-builder idea-doc identificeert Pattern B (Puck als Step 3 Medium-renderer voor `web-page` category) als minimal-invasive integratie-pad maar heeft vijf onbewezen aannames die een 6-8 weken MVP-commit blokkeren:

- **A1**: Puck's `external` field-type ondersteunt custom React-renderers voor brand-aware field-pickers (`<PersonaSelector>` uit `contextStack.personas`)
- **A2**: Puck-editor laat zich schoon inbouwen in Canvas Step 3 zonder state-conflicten met `useCanvasStore` of stepper-mount-cycle issues
- **A4**: `variantToPuckData()` seed-mapper levert bruikbare initial-tree uit Step 2 variant-output (≥ 80% van gevallen zonder hand-correctie)
- **A6**: Drag-drop DX in Puck v0.21 voelt voldoende marketer-grade aan in Branddock's stepper-context
- **A8**: Dual-render Puck-component (current props vs proposed props) in een diff-preview-modal is performance-haalbaar en visueel coherent voor user — bewijs voor de Optie B edit-paradigma-keuze (diff-preview verplicht voor alle AI-changes)

Zonder spike-validatie is het risico te hoog dat we 6-8 weken bouwen op een aanpak die op een van deze punten breekt — dan staan we voor fallback-keuze (Puck-in-iframe, per-type custom componenten zonder mapper, JSON-diff-only preview ipv visual dual-render, of buy-route Plasmic Enterprise). Een 1-2 dagen PoC voor één type (`landing-page`) + één edit-flow (component-level AI-edit met diff-preview) geeft go/no-go evidence.

# Voorstel

Bouw in een aparte worktree (`branddock-spike-puck-canvas`) een minimal-werkende `PuckPageBuilder` component dat als Step 3 Medium-renderer voor `landing-page` content-type wordt gewired + een minimal diff-preview-modal voor component-level AI-edit. Doel is NIET productie-klare code maar A1+A2+A4+A6+A8 evidence. Concreet:

1. **`PuckPageBuilder` component** in `src/features/campaigns/components/canvas/medium/PuckPageBuilder.tsx` — ontvangt `contextStack` + `variantContent` + `deliverable` props, rendert Puck-editor inline
2. **2 brand-aware Puck components**: `<BrandHero>` + `<BrandCTA>` met inline render-functies die `contextStack.brand.style` consumeren
3. **1 custom field-type test**: `<PersonaSelector>` als `external` field die `contextStack.personas` lijst toont (concrete A1-test)
4. **`variantToPuckData()` mapper-functie** — zet Step 2 variant-output om naar initial Puck-data-tree (A4-test)
5. **Step 3 dispatcher patch** in `preview-map.ts` — alleen voor `landing-page` type (4 andere web-page types blijven `LandingPagePreview` in spike-scope)
6. **Auto-save naar `deliverable.settings.puckData`** elke 30s + hydratatie bij re-mount
7. **Component-level AI-edit + diff-preview modal** (A8-test):
   - Context-menu actie "Maak korter" op `<BrandHero>` instance
   - API-route `/api/spike/component-edit` die `anthropicClient` aanroept met current props
   - Modal opent met **side-by-side dual-render**: links `<BrandHero {...currentProps} />`, rechts `<BrandHero {...proposedProps} />`
   - Edit-distance badge ("AI wil X% wijzigen") via bestaande `src/lib/auto-iterate/edit-distance.ts`
   - Accept-button update puckData; Reject sluit modal zonder change
   - Minimal styling, geen polish — bewijs dat dual-render visueel werkt
8. **Geen publish-laag** — spike eindigt bij Step 3 + diff-preview; publish/middleware/render-route zijn MVP-werk
9. **Geen page-level diff-preview** — te complex voor 1-2 dagen (dual `<Puck.Preview>` met per-component accept). MVP-werk.
10. **Bundle-size meting** via Next.js bundle analyzer — concrete A5-data (observeerbaar tijdens spike, niet hard-blocker)

Spike-output = **go/no-go memo** in `docs/audits/2026-05-XX-landing-page-builder-puck-spike.md` met per-aanname verdict, DX-observaties, screenshots van Step 3 met Puck én diff-preview-modal.

# Acceptatiecriteria

- [ ] Worktree `branddock-spike-puck-canvas` aangemaakt vanuit `main` (parallel met andere tracks)
- [ ] `@puckeditor/core` geïnstalleerd, geen TypeScript-conflicten met React 19 / Next.js 16 (escalate in memo bij wel-conflicten)
- [ ] `PuckPageBuilder` component bestaat in `src/features/campaigns/components/canvas/medium/` en compileert
- [ ] `preview-map.ts` dispatcht `landing-page` type naar `PuckPageBuilder` (alleen dit type, geen impact op andere 4 web-page-types of overige 48 content-types)
- [ ] `<BrandHero>` rendert in Puck-editor met `contextStack.brand.style.primaryColor` als achtergrond en `headingFont` als font — zonder dat user iets kiest (validatie van prop-based context-pattern)
- [ ] `<PersonaSelector>` external field-type toont workspace's personas als selectable lijst, selectie wordt correct opgeslagen in `puckData` JSON (A1-evidence)
- [ ] `variantToPuckData()` produceert valid Puck-data-tree uit 3 verschillende Step 2 variant-fixtures (A4-evidence) — fixtures geleverd door spike, hoeven niet AI-gegenereerd in spike
- [ ] Auto-save naar `deliverable.settings.puckData` werkt: verlaat Step 3, herlaad, page-state is bewaard
- [ ] **Geen regressie** op Step 3 voor non-`landing-page` types — verifieer met `linkedin-post` + `product-page` (laatste mag oude `LandingPagePreview` blijven gebruiken in spike)
- [ ] **A8 component-level diff-preview werkt**: rechtsklik op `<BrandHero>` → "Maak korter" → API call → modal opent met side-by-side dual-render van current vs proposed `<BrandHero>` (zelfde brand-tokens, andere headline-text) + edit-distance badge + Accept/Reject werkt (A8-evidence)
- [ ] **Dual-render performance acceptable**: modal opent binnen 300ms na API-response; geen visueel jank tijdens render
- [ ] Bundle-analyzer rapport: editor-delta + publieke render-route delta gemeten in KB gzipped
- [ ] **Go/no-go memo** geschreven in `docs/audits/2026-05-XX-landing-page-builder-puck-spike.md` met:
  - A1-verdict (custom field DX adequate?) ✅/⚠️/❌ + 2-3 zinnen motivatie
  - A2-verdict (state-co-existence met `useCanvasStore`?) ✅/⚠️/❌
  - A4-verdict (variant→Puck mapper bruikbaar?) ✅/⚠️/❌
  - A6-verdict (drag-drop DX-rating 1-5 met concrete frictie-momenten)
  - A8-verdict (dual-render diff-preview visueel + performance) ✅/⚠️/❌
  - Bundle-delta (acceptable / borderline / blocking)
  - 3 onverwachte vondsten (positief of negatief)
  - 3-4 screenshots: Step 3 met `PuckPageBuilder` actief + diff-preview-modal in actie
  - Aanbeveling: ready-for-MVP / fix-X-first-then-MVP / abort-Puck-en-fallback-naar-Y
- [ ] `npx tsc --noEmit` 0 errors in spike-files
- [ ] Worktree-cleanup: spike-code blijft in branch, NIET gemerged in main; alleen memo + idea-doc-updates landen op main

# Bestanden die ik aanraak

> Allemaal in worktree `branddock-spike-puck-canvas`, geen impact op `main`.

- `package.json` (toevoegen `@puckeditor/core` als dep)
- `src/features/campaigns/components/canvas/medium/PuckPageBuilder.tsx` — nieuwe component
- `src/features/campaigns/components/canvas/medium/persona-selector-field.tsx` — custom field-renderer
- `src/features/campaigns/components/canvas/medium/variant-to-puck-data.ts` — seed-mapper utility
- `src/features/campaigns/components/canvas/medium/puck-components.tsx` — `<BrandHero>` + `<BrandCTA>` definitions
- `src/features/campaigns/components/canvas/medium/ComponentDiffPreviewModal.tsx` — A8 diff-preview modal stub
- `src/app/api/spike/component-edit/route.ts` — A8 AI-edit endpoint
- `src/features/campaigns/components/canvas/previews/preview-map.ts` — conditional dispatch (alleen `landing-page` type)
- `src/features/campaigns/stores/useCanvasStore.ts` — `puckData` slice toevoegen met auto-save action
- `prisma/schema.prisma` — geen wijzigingen nodig in spike (gebruikt bestaande `Deliverable.settings` jsonb)
- `docs/audits/2026-05-XX-landing-page-builder-puck-spike.md` — go/no-go memo

# Bestanden die ik NIET aanraak

- `src/middleware.ts` — publish/render-routing is MVP-werk, niet spike
- `src/lib/ai/canvas-context.ts` — `assembleCanvasContext` blijft ongewijzigd; spike consumeert resultaat via prop
- `src/lib/workspace-resolver.ts` — hergebruiken via import, niet wijzigen
- `src/lib/ai/anthropicClient.ts` — niet relevant voor spike (geen AI-generation in spike-scope; Step 2 variants worden als fixtures gemockt)
- Andere 4 web-page-types (`product-page`, `faq-page`, `comparison-page`, `microsite`) — blijven `LandingPagePreview` in spike-scope
- Alle 48 non-web-page content-types — geen impact in dispatch-patch (conditional op alleen `landing-page`)
- `marketing-site-pricing.md` — losse track, geen scope-coupling
- Publish/Export-step UI — MVP-werk, niet spike

# Smoke test plan

**Setup**:
1. `git worktree add ../branddock-spike-puck-canvas spike-puck-canvas` vanuit branddock-app
2. `npm install @puckeditor/core` in worktree
3. `npm run dev` op port 3000

**Stap 1 — A1 custom field-type validatie**:
1. Open een bestaande `landing-page` deliverable in Canvas (workspace met ≥ 2 personas)
2. Navigeer naar Step 3
3. Verifieer: `PuckPageBuilder` rendert (niet `LandingPagePreview`)
4. Sleep `<BrandHero>` op canvas
5. Klik op het `personaId`-field — verifieer: dropdown toont workspace's personas correct
6. Selecteer een persona — verifieer: opgeslagen in puckData JSON (inspect via React DevTools of console.log)

**Stap 2 — A2 state-co-existence validatie**:
1. Wijzig iets in Puck-editor (drag component)
2. Navigeer naar Step 2 (variants) en terug naar Step 3
3. Verifieer: Puck-state is bewaard (hydratatie werkt vanuit `deliverable.settings.puckData`)
4. Klik Puck's undo (`Cmd+Z`) — verifieer: werkt zonder conflict met stepper-navigation
5. Navigeer naar andere deliverable in workspace — verifieer: Puck-state correct gereset

**Stap 3 — A4 variant→Puck mapper validatie**:
1. Test met 3 fixture-variants (verschillende content):
   - Variant 1: korte hero + 3 features + CTA
   - Variant 2: lange hero + 6 features + 2 CTA's
   - Variant 3: alleen hero + 1 CTA
2. Voor elke fixture: roep `variantToPuckData()` aan, verifieer output is valid Puck-data-tree
3. Render in Puck — verifieer: tree is editable, components zijn correct ingevuld, geen blank canvas

**Stap 4 — A6 drag-drop DX subjective rating**:
1. Voer 5 concrete acties uit en rate 1-5 met frictie-notities:
   - Component op canvas slepen
   - Component verplaatsen binnen canvas
   - Component verwijderen
   - Field-waarde wijzigen (text-field)
   - Custom field-waarde wijzigen (persona-selector)
2. Noteer drie wrijvings-momenten of plezier-momenten

**Stap 5 — auto-save + hydratatie**:
1. Maak een edit in Puck
2. Wacht 30s
3. Inspect DB: `Deliverable.settings.puckData` bevat de nieuwe state
4. Refresh browser
5. Verifieer: Step 3 hydrateert met laatst-opgeslagen state

**Stap 6 — regressie-check non-web-page types**:
1. Open een `linkedin-post` deliverable in Canvas
2. Navigeer naar Step 3
3. Verifieer: bestaande renderer (niet `PuckPageBuilder`) — geen impact
4. Open een `product-page` deliverable
5. Verifieer: `LandingPagePreview` blijft renderen (in spike-scope; MVP zou dit ook naar PuckPageBuilder gaan)

**Stap 7 — A8 diff-preview-modal validatie**:
1. In Puck-editor, sleep `<BrandHero>` op canvas en vul een headline in (bv. "Welkom bij onze beste deal van het jaar — alleen deze week beschikbaar voor early access klanten")
2. Rechtsklik op de component → context-menu "Maak korter"
3. Verifieer in Network-tab: POST naar `/api/spike/component-edit` met current props
4. Verifieer: response binnen 3-5s met proposed props (kortere headline)
5. Verifieer: modal opent automatisch met side-by-side dual-render
   - Links: `<BrandHero>` met current props (lange headline)
   - Rechts: `<BrandHero>` met proposed props (korte headline)
   - Beide met zelfde brand-tokens (primaryColor + headingFont)
6. Verifieer: edit-distance badge toont realistisch percentage (verwacht 40-60%)
7. Klik "Reject" → modal sluit, puckData ongewijzigd, page-state intact
8. Herhaal flow, klik "Accept" → puckData update, `<BrandHero>` in editor toont nieuwe headline
9. **DX-rating** (1-5): is de side-by-side preview duidelijk? Voelen Accept/Reject natuurlijk? Visueel jank?

**Stap 8 — bundle-meting**:
1. `npm run build` → bundle-analyzer output
2. Vergelijk met baseline (pre-Puck commit): noteer Step 3 mount-delta per route
3. Documenteer in memo

**Stap 9 — go/no-go memo schrijven**:
Per assumptie A1/A2/A4/A6/A8 verdict ✅/⚠️/❌ met motivatie + screenshots (incl. diff-preview-modal) + 3 onverwachte vondsten + aanbeveling.

# Risico's

- **Puck-versie-conflict met React 19 / Next.js 16** — release 0.21.2 vermeldt expliciet React 19-support niet; mogelijk peer-dependency-waarschuwingen. Mitigatie: `--legacy-peer-deps` flag, of forceer alpha-build. Bij hard breken: spike afronden met React 18-test indien mogelijk, escaleer in memo.
- **Dual-render performance valt tegen** — twee `<BrandHero>` instances in modal kunnen visueel laggen bij interactieve preview. Mitigatie: render beide statisch (geen Puck-overlay), gebruik React.memo. Bij A8-rood: documenteer in memo, MVP fallback = JSON-diff-only modal of incremental rendering.
- **Puck's internal state botst met `useCanvasStore` of stepper-navigation** — Puck heeft eigen undo/redo, mogelijk eigen mount/unmount lifecycle. Mitigatie: bij A2-blokker → onderzoek `<Puck.Preview>` ipv volledige `<Puck>`, of wrap Puck in iframe-isolation (UX-loss maar isolatie gewonnen).
- **`variantToPuckData()` blijkt brittle** bij variant-variatie — Step 2 levert mogelijk inconsistente structure per content-type. Mitigatie: spike gebruikt 3 hand-gekozen fixtures; MVP zal mapper-strenger maken met defensive defaults.
- **Custom field DX is async-only** — Puck's `external` field-type kan async-only zijn (verwacht fetchList callback), wat voor lijst-uit-contextStack onnatuurlijk voelt. Mitigatie: probeer alternatief Puck-field-pattern (custom rendering binnen field), documenteer in memo.
- **Bundle-explosie bij Step 3 mount** — Puck pulls in tiptap, immer, react-dnd, etc. — possibly >500KB. Mitigatie: lazy-load `PuckPageBuilder` via `dynamic import`, accepteer als initial Canvas-bundle ongewijzigd blijft.
- **Spike timing-overrun** — als 1-2 dagen niet voldoende is, stop bij dag 2 en schrijf memo met partial-validation status (welke aannames groen/geel/ongetest). Geen scope-creep.
- **Spike vindt iets dat ADR omver werpt** — bv. Pattern B blijkt onhaalbaar maar Pattern A (parallel Canvas step) werkt wel. Mitigatie: memo bevat ADR-amendment-voorstel; we updaten ADR conform spike-bevinding voor MVP-task.

# Out of scope

- Productie-klare LandingPage Prisma model (komt in MVP-task)
- DomainMapping table + Vercel Domains API (komt in v2)
- Andere 4 web-page-types in dispatch (spike doet alleen `landing-page`)
- Overige 6 brand-aware components (spike doet alleen `<BrandHero>` + `<BrandCTA>`)
- Per-type templates (MVP-werk)
- Publish-flow + Export-step uitbreiding (MVP-werk)
- Middleware-routing voor subdomain (MVP-werk)
- F-VAL judge-integratie op Puck-output (MVP-werk)
- **Page-level diff-preview met dual `<Puck.Preview>` + per-component accept** — te complex voor 1-2 dagen; component-level dual-render is wel in scope (A8)
- **Auto-iterate page-level integratie** — hergebruik van `/api/auto-iterate/trigger` voor Puck-data is MVP-werk; spike valideert alleen component-level
- **Lock-toggle UI per component** — MVP-werk; spike valideert alleen basis-edit-flow
- **Strict-rewrite page-level** — MVP-werk
- **Regenerate via Step 2 confirm-modal** — MVP-werk; spike kan via expliciete dev-reset
- AI-generation prompt-tuning in Step 3 — spike gebruikt 1 prompt ("Maak korter") als proof-of-concept; meer prompts (formal/3-alternatieven) zijn MVP-werk
- Bundle-optimalisatie tuning (alleen meten + rapporteren in spike)
- E2E Playwright-tests (alleen handmatige smoke in spike)
- Pre-launch sprint-integratie — spike is fill-in werk, geen kritiek-pad-impact

# Notes

**Worktree-strategie**: gebruik `git worktree add ../branddock-spike-puck-canvas spike-puck-canvas` vanuit `/Users/erikjager/Projects/branddock-app` zodat `main` ongemoeid blijft. Spike-code wordt NIET gemerged; alleen memo + idea-doc/ADR-updates landen op main.

**Conditional dispatch-pattern voor spike** (in `preview-map.ts`):

```typescript
// SPIKE: alleen voor landing-page type, andere 4 web-page-types blijven LandingPagePreview
const CONTENT_TYPE_PREVIEW_OVERRIDE: Record<string, React.ComponentType<any>> = {
  'landing-page': PuckPageBuilder, // ← spike-override
};

export function resolvePreviewComponent(platform, format, contentType) {
  if (CONTENT_TYPE_PREVIEW_OVERRIDE[contentType]) {
    return { component: CONTENT_TYPE_PREVIEW_OVERRIDE[contentType], label: 'Landing Page Builder (spike)' };
  }
  // ... bestaande logica
}
```

Dit isoleert de spike-wijziging — non-`landing-page` types raken niet. MVP zou later alle 5 web-page types overriden.

**Bekend onbekend**:
- React 19 + Next.js 16 + Puck v0.21.2 combinatie is niet expliciet getest in Puck-release notes per mei 2026
- `external` field-type docs zijn beperkt; mogelijk vereist het een specifieke `fetchList` callback-shape die de DX-flow stroef maakt
- Hoe Puck zich gedraagt binnen een React-component die zelf Zustand-store consumeert (onze stepper-context) — geen public bekende voorbeelden

**Decisie-doorlooptijd post-spike**:
- Spike groen → idea-doc verdict update naar `ready-to-build` → technical-planner promotion naar `tasks/web-page-builder-canvas-step-mvp.md` (post-launch positionering)
- Spike geel (1 aanname breekt) → idea-doc verdict blijft `needs-validation-first` + tweede spike-iteratie voor de specifieke blocker
- Spike rood → ADR-amendment: switch naar Plasmic Enterprise (sales-call) of Puck-in-iframe (UX-loss accepteren) of per-type custom componenten (geen mapper)

**Cross-references**:
- ADR: [`docs/adr/2026-05-22-landing-page-builder-architectuur.md`](../../docs/adr/2026-05-22-landing-page-builder-architectuur.md)
- Idea-doc: [`tasks/_drafts/idea-landing-page-builder.md`](idea-landing-page-builder.md)
- Canvas-architectuur-audit bron: gesprek 2026-05-22 + Explore-agent rapport
- Step 3 dispatcher target: `src/features/campaigns/components/canvas/previews/preview-map.ts`
- Canvas-context source: `src/lib/ai/canvas-context.ts` (`assembleCanvasContext`)
- Bestaande renderer (te vervangen voor `landing-page`): `LandingPagePreview` in `src/features/campaigns/components/canvas/previews/`
- Pre-launch fill-in slot: kan parallel met Track A/C werk, geen kritiek-pad impact
