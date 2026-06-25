---
id: brandstyle-calibration-report
title: Brandstyle kalibratie-/asks-rapport (één geconsolideerde "wat heb ik nodig"-surface)
fase: pre-launch
priority: next
effort: 1-1.5 dag
owner: claude-code
status: done
created: 2026-06-24
completed: 2026-06-25
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Na een brandstyle-analyse zit de informatie over extractie-kwaliteit verspreid: per-kleur `confidence` (high/medium/low) in ColorsSection, `OBSERVED:/RECOMMENDED:`-prefixes los in VoiceDna/Imagery/VisualSystem, ontbrekende logo-varianten impliciet in de logo-tab, en gedetecteerde fonts zonder font-bestand. Er is **geen enkele surface** die zegt: "dit is laag-vertrouwen, dit ontbreekt, en dít heb ik van je nodig (echt logo-vector, font-files, bevestig deze aannames)." De gebruiker moet zelf alle tabs aflopen om te zien wat onbetrouwbaar is. Dit is precies de "honest calibration / explicit asks"-move uit de Claude-Design-werkwijze (lesson L6 uit de brandstyle-vergelijking 2026-06-24) die Branddock mist — terwijl alle onderliggende data al bestaat.

# Voorstel

Eén geconsolideerd kalibratie-rapport, in drie lagen opgebouwd:

1. **Pure aggregatie-functie** (`src/lib/brandstyle/calibration-report.ts`) — neemt de reeds-opgehaalde styleguide-onderdelen (colors/fonts/logos/guidelines/typeScale) en geeft een getypeerd `BrandstyleCalibrationReport` terug: lijst van `CalibrationAsk`s met severity (critical/suggestion/review), sectie-anker en uitleg. Zero IO, volledig testbaar.
2. **API/consumer** — surface het rapport waar de styleguide al wordt gelezen (detail-route of een dunne `GET .../calibration` endpoint).
3. **UI-panel** — een "Calibratie / Wat heb ik nodig"-blok bovenaan de styleguide (of in een review-context) dat de asks toont met deep-links naar de juiste tab.

Deze task levert laag 1 nu (gestart); laag 2+3 volgen na plan-akkoord (UI = plan-gate).

# Acceptatiecriteria

- [x] Pure functie `buildBrandstyleCalibrationReport()` met getypeerde input/output, geen `any`
- [x] Dekt: ontbrekend primair logo (critical), ontbrekende donker/licht-variant (suggestion), laag-confidence kleuren (review), gedetecteerde fonts zonder bestand (suggestion), lege type-scale (review), RECOMMENDED-only richtlijnen (review)
- [x] Rapport beschikbaar in de UI — **client-side berekend** uit reeds-geladen styleguide-data (geen extra fetch/route nodig; pure functie heeft geen server-imports)
- [x] UI-panel met deep-links naar de betreffende tab + severity-styling (Tailwind-purge-veilige classes geverifieerd)
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors (gewijzigde files)
- [x] Unit-smoke (pure functie, 2 fixtures) groen
- [x] Browser-render-smoke groen — Playwright `e2e/tests/brandstyle/styleguide.spec.ts`: paneel rendert + deep-link schakelt naar Colors-tab (`1 passed`)
- [x] Documentatie: changelog #344 + deze task

# Bestanden die ik aanraak (as-built)

- `src/lib/brandstyle/calibration-report.ts` — pure aggregatie (nieuw)
- `src/features/brandstyle/components/BrandstyleCalibrationPanel.tsx` — paneel (nieuw, client-side berekening)
- `src/features/brandstyle/components/BrandStyleguidePage.tsx` — mount + deep-link via `setActiveTab`
- `e2e/tests/brandstyle/styleguide.spec.ts` — Playwright-smoke
- `prisma/seed.ts` — één seed-kleur op `confidence: "low"` voor deterministische smoke
- `e2e/global-setup.ts` — Prisma-7.4 `db push`-fix (deblokkeert e2e-suite)
- Géén API-route gebouwd (laag 2 niet nodig — pure functie draait client-side)

# Bestanden die ik NIET aanraak

- `src/lib/ai/brand-context.ts` — visuele identiteit wordt hier al correct geïnjecteerd (L2 bleek al gebouwd); niet aanraken voor dit rapport
- De bestaande per-sectie confidence/RECOMMENDED-rendering — niet refactoren, alleen aggregeren

# Smoke test plan

1. Roep `buildBrandstyleCalibrationReport()` aan met een fixture die: geen PRIMARY-logo, 2 low-confidence kleuren, 1 DETECTED font zonder fileUrl, en 1 RECOMMENDED-richtlijn heeft.
2. Verwacht: 1 critical (logo), 1 suggestion (font), 2 review-asks (kleuren-groep + richtlijn), `clean === false`.
3. Tweede fixture met volledige, high-confidence data → `clean === true`, `asks` leeg.
4. (Na UI) open een echte workspace-styleguide → panel toont de asks met werkende deep-links.

# Risico's

- **Ruis/overwhelm** als het rapport te veel asks toont → mitigatie: groepeer per sectie, cap severity-buckets, toon critical eerst.
- **Pre-launch off-critical-path**: dit ligt niet op het `vercel-deployment`-pad → bewust klein gehouden (laag 1 is zero-risk additive); UI achter plan-gate.

# Out of scope

- Auto-genereren van ontbrekende logo-varianten (dat is lesson L5 — aparte task)
- Het daadwerkelijk oplossen van de asks (upload-flows bestaan al per sectie)
- Confidence-scores door de gebruiker laten overschrijven

# Notes

- Komt voort uit de brandstyle ↔ Claude-Design-werkwijze-vergelijking (2026-06-24), lesson L6.
- L2 (visuele tokens → AI-context) bleek tijdens root-cause-tracing al volledig geïmplementeerd (`brand-context.ts:1242-1445` + `formatBrandContext` + LP/canvas/video-consumers) — niet opnieuw gebouwd.
- **As-built architectuur (2026-06-25)**: geen API-route gebouwd. `calibration-report.ts` is een pure functie zonder server-imports, dus `BrandstyleCalibrationPanel` (`src/features/brandstyle/components/`) importeert 'm direct en berekent het rapport client-side uit de al-geladen `BrandStyleguide` (via `useStyleguide`). Voordeel: geen extra round-trip, geen cache-invalidatie-verplichting.
- **Mount**: bovenaan `BrandStyleguidePage` (boven de ReviewSummaryHeader + tabs). Deep-link via bestaande `setActiveTab`-pattern (`onJumpToTab`), identiek aan `BrandOnboardingWizard`.
- **Sectie→tab-map**: logo→`brand_assets`, colors→`colors`, typography→`typography`, imagery→`imagery`, design-language→`visual_system`.
- **Tailwind-4 purge**: alle severity-/layout-classes vooraf geverifieerd in `src/index.css`. Vermeden (purged): `py-2.5`, `h-3.5`, `w-3.5`, `px-1.5`, `py-0.5`, `mt-0.5`.
- **Resterend**: browser-render-smoke (panel zichtbaar + deep-link schakelt tab) op een workspace met geanalyseerde styleguide.
