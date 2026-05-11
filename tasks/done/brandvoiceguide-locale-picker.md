---
id: brandvoiceguide-locale-picker
title: BrandVoiceguide.contentLocale picker UI in Voice DNA tab
fase: pre-launch
priority: now
effort: 3 uur
owner: claude-code
status: done
created: 2026-05-11
completed: 2026-05-11
related-adr: 2026-05-10-brand-language-auto-detect
related-spec: -
worktree: -
---

# Probleem

Gisteren gebouwd: `detectBrandLanguage(workspaceId)` helper + backfill-script + runtime mismatch-guard. Backfill heeft 13 workspaces gecorrigeerd, maar `BrandVoiceguide.contentLocale` blijft een server-only veld — geen UI om handmatig te overriden wanneer:

1. **Auto-detect verkeerd is** (false-positive of low-confidence)
2. **Multi-locale brand**: user wil expliciet `nl-BE` ipv default `nl-NL` voor België-content
3. **Workspace zonder brand-content** (techcorp-brand, wassink-groep — backfill skipped): user moet handmatig locale kunnen kiezen
4. **Drift wanneer brand evolueert**: na herpositionering van NL naar EN merk

ADR 2026-05-10 markeerde deze picker als out-of-scope voor v1 ("separate task wanneer pilot-feedback dit prioriteert"). Pilot start binnenkort; UI moet er zijn vóór user contentLocale wil veranderen zonder via DB-script.

# Voorstel

Vijf incrementele wijzigingen op bestaande Voice-guide infrastructuur:

1. **`GET /api/i18n/detect-suggested-locale`** — nieuwe route die `detectBrandLanguage(workspaceId)` aanroept. Returnt `{ locale, language, confidence, sourceCount }`. Read-only, geen DB-writes.

2. **`useSuggestedLocale()` TanStack hook** — wraps de GET-call met `staleTime: Infinity` (detection-resultaat is stabiel binnen sessie zolang voice-guide niet wijzigt; cache-invalidatie via mutation-flow).

3. **PATCH `/api/brandvoiceguide` schema-extension** — voeg `contentLocale: z.string().nullable().optional()` toe aan updateSchema. Whitelist gevalideerde waarden via `SUPPORTED_LOCALES` uit `locale-resolver.ts`. Bestaande `invalidateBrandContext` + `invalidateCache` chain dekt cache-refresh.

4. **`ContentLocaleField` sub-component** in `VoiceDnaSection.tsx` — dropdown met 4 BCP-47 locales (nl-NL, nl-BE, en-GB, de-DE). Toont "Auto-detected: ..." caption met confidence-badge. "Use suggested" knop appears als current value ≠ suggested. Integreert in `handleSave` payload.

5. **Smoke test + changelog + task-finalize loop.**

# Acceptatiecriteria

- [ ] `src/app/api/i18n/detect-suggested-locale/route.ts` (nieuw, ~60 regels) — workspace-scoped GET; tolerant voor `detectBrandLanguage` failure (returnt `{ locale: null, language: null, confidence: 'low', sourceCount: 0 }`)
- [ ] `src/hooks/useSuggestedLocale.ts` (nieuw, ~40 regels) — TanStack hook met `staleTime: Infinity` + `enabled: !!workspaceId`
- [ ] `src/app/api/brandvoiceguide/route.ts` (modify) — updateSchema accepteert `contentLocale?: string | null` met whitelist-validation tegen `SUPPORTED_LOCALES`
- [ ] `src/features/brandvoice/components/sections/VoiceDnaSection.tsx` (modify) — `ContentLocaleField` sub-component embedded vóór of na voice-description; locale-dropdown + auto-detected caption + "Use suggested" cta; participates in dirty-state + handleSave
- [ ] `src/features/brandvoice/api/voiceguide.api.ts` (modify) — `UpdateBrandVoiceguideBody` type extend met `contentLocale?: string | null`
- [ ] Bij locale-change: PATCH gaat door, brand-context cache invalidated, F-VAL pijler-3 gebruikt nieuwe pack vanaf volgende generation
- [ ] `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors
- [ ] Smoke-test `scripts/smoke-tests/locale-picker-api.ts` — verifieer GET endpoint + PATCH validation (4 valid locales accept, invalid rejected, null accept voor unset)
- [ ] Manual UX-smoke: LINFI Voice DNA tab toont current `nl-NL` + caption "Auto-detected: nl-NL (high)"; switch naar `nl-BE`, save → DB updated → next generate gebruikt nl-BE pack

# Bestanden die ik aanraak

**Server**:
- `src/app/api/i18n/detect-suggested-locale/route.ts` (nieuw) — GET endpoint
- `src/app/api/brandvoiceguide/route.ts` (modify) — updateSchema extend met contentLocale whitelist

**Client**:
- `src/hooks/useSuggestedLocale.ts` (nieuw) — TanStack hook
- `src/features/brandvoice/api/voiceguide.api.ts` (modify) — type-extend
- `src/features/brandvoice/components/sections/VoiceDnaSection.tsx` (modify) — `ContentLocaleField` component embedden

**Tests**:
- `scripts/smoke-tests/locale-picker-api.ts` (nieuw) — endpoint + validation tests

**Documentatie**:
- `tasks/brandvoiceguide-locale-picker.md` (deze)
- `docs/changelog.md` (entry #250 bij finalize)

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` — `BrandVoiceguide.contentLocale` veld bestaat al (nullable String)
- `src/lib/brand-fidelity/heuristics/locale-resolver.ts` — precedence-logic ongewijzigd; UI past de top-prio (voiceguide.contentLocale) handmatig aan
- `src/lib/i18n/detect-brand-language.ts` — helper ongewijzigd; we wrap hem in een GET-route
- `scripts/backfill-brand-language.ts` — backfill-script blijft als admin-tool naast UI
- Andere Voice-guide sub-tabs (Vocabulary / Channel Tones / References) — alleen Voice DNA krijgt de picker
- `src/lib/api/cache-keys.ts` — bestaande cache-keys ongewijzigd

# Smoke test plan

**Server-side smoke** (`npm run smoke:locale-picker-api` na seed):

1. GET `/api/i18n/detect-suggested-locale` met LINFI sessie → 200 met `{ locale: 'nl-NL', confidence: 'high', sourceCount: 15 }`
2. GET met workspace zonder content (techcorp-brand) → 200 met `{ locale: null, confidence: 'low', sourceCount: 0 }`
3. PATCH `/api/brandvoiceguide` met `contentLocale: 'nl-BE'` op LINFI → 200, DB updated
4. PATCH met invalid `contentLocale: 'fr-FR'` → 400 (whitelist-validation)
5. PATCH met `contentLocale: null` → 200 (reset naar workspace-default fallback)

**Manual UX-smoke** (user-action vóór live productie):

1. Open Brand Voice tab in LINFI → Voice DNA sub-tab
2. Verifieer ContentLocaleField toont: current `nl-NL` + "Auto-detected: nl-NL (high confidence, 15 sources)"
3. Geen "Use suggested" knop want current === suggested
4. Switch naar `nl-BE`, klik save → DB persisted, refresh page → locale staat op nl-BE
5. "Use suggested" knop verschijnt nu (suggested nl-NL ≠ current nl-BE), klik → terug naar nl-NL
6. F-VAL paste-test op LINFI → heuristic-pack switcht naar/van NL-BE (BE-extra-flags zoals `marktconform` worden actief)

# Risico's

- **NL-BE pack mismatch**: NL-BE pack heeft extra flags maar mist BE-specifieke heuristics. Switching kan onverwacht "marktconform" als always-flag activeren waar NL-NL het als context-flag had. **Mitigatie**: documenteer pack-verschillen in caption ("nl-BE: extra flags voor BE-context").
- **Cache-window**: na PATCH-update zit `getBrandContext` cache 5min, F-VAL kan kort oude pack gebruiken. **Mitigatie**: PATCH-route invalidates al via `invalidateBrandContext`; manual smoke valideert.
- **Validation drift**: API whitelist vs UI dropdown — moeten gesynchroniseerd blijven. **Mitigatie**: beide importeren `SUPPORTED_LOCALES` uit locale-resolver.ts.
- **Workspaces zonder voiceguide**: BrandVoiceguide-row bestaat niet → PATCH moet upsert. Bestaande route doet al upsert (zie audit), maar verifieer voor wassink-groep / techcorp-brand pad.

# Out of scope

- Auto-detect re-trigger button (refresh detection na voice-guide edit) — pilot-feedback eerst
- Locale-specifieke F-VAL config (per-locale threshold overrides) — Δ-2 task
- Workspace-level contentLanguage syncing wanneer voiceguide.contentLocale wijzigt (e.g. nl-BE → werkspace ook 'nl') — beide blijven onafhankelijk per precedence-ADR
- Multi-locale support per content-piece (één deliverable in nl, een in en) — post-launch
- New locale-packs (es-ES, pt-PT, it-IT, fr-FR) — separate task per pack
- UI voor `Workspace.contentLanguage` aanpassen vanuit Brand Voice tab — AccountSettings dekt dat al
- Bulk-update voor agency-context (alle workspaces in één org switchen) — separate admin-tool

# Notes

**Phase -1 Gates resultaat**:
- Simplicity Gate: PASS (5 files: 1 nieuwe API + 1 nieuwe hook + 1 schema-extend + 1 UI-modify + 1 smoke-test; geen abstracties)
- Anti-Abstraction Gate: PASS (`ContentLocaleField` is inline-component in VoiceDnaSection — geen separate file-organisatie tot het hergebruikt moet worden)
- Integration-First Gate: PASS (PATCH-route bestaat al + cache-invalidatie chain; we voegen alleen één optionele schema-veld toe)

**ADR-noodzaak**: NEE
- Geen schema-wijziging (contentLocale veld bestaat al)
- Geen nieuwe `src/lib/<module>/` directory
- Geen nieuwe library-install
- Pattern-extensie op bestaande Voice-guide section UI

**Cross-links**:
- ADR-1 locale-routing: `docs/adr/2026-05-08-locale-routing-brand-voice.md`
- ADR brand-language auto-detect: `docs/adr/2026-05-10-brand-language-auto-detect.md`
- Detect helper: `src/lib/i18n/detect-brand-language.ts`
- VoiceguidePage orchestrator: `src/features/brandvoice/components/BrandVoiceguidePage.tsx`
- VoiceDnaSection: `src/features/brandvoice/components/sections/VoiceDnaSection.tsx`
- SUPPORTED_LOCALES: `src/lib/brand-fidelity/heuristics/locale-resolver.ts`
