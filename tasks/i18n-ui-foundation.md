---
id: i18n-ui-foundation
title: UI-i18n runtime (i18next) + Display-language selector (per gebruiker) + CI-guard
fase: pre-launch
priority: now
effort: 2-3 weken (foundation ~1 wk + chrome-extractie + selector)
owner: claude-code
status: in-progress
created: 2026-06-28
completed: -
related-adr: docs/adr/2026-06-28-multilingual-i18n-and-multi-market-content.md
related-spec: -
worktree: -
---

# Probleem

De product-UI is volledig hardcoded Engels na de NL→EN-migratie; er is geen vertaallaag. Een per-user UI-taalvoorkeur (`AppearancePreference.language`) bestaat al end-to-end maar wordt door niets geconsumeerd, en de bijbehorende settings-schermen zijn dode code. De levende 'Appearance'-tab (`src/features/settings/components/SettingsPage.tsx`) is een "coming soon"-placeholder. Gebruikers kunnen hun eigen interface-taal dus niet kiezen.

# Voorstel

Zet een client-side i18next-runtime op (provider in `src/app/page.tsx` wrappend `<AuthGate>`), geseed uit een non-httpOnly cookie `branddock-ui-locale` en gereconcilieerd naar `AppearancePreference.language` post-login. Bouw een echte **Display-language**-selector in de Appearance-tab. Extraheer als eerste de app-chrome (sidebar, top-nav, PageShell/PageHeader, AuthPage) naar getypeerde `common`/`navigation`-namespaces. Lock de baseline met een CI-guard die nieuwe hardcoded strings blokkeert. `en` blijft de single source of truth; niet-Engelse bundles komen uit de AI-pipeline (zie `[[i18n-ai-translation-pipeline]]`).

# Acceptatiecriteria

- [ ] `<I18nProvider>` mount in `src/app/page.tsx` wrappend `<AuthGate>`; de **SSR'd login-chrome** geen flash doordat `src/app/layout.tsx` (server-component) de `branddock-ui-locale`-cookie via `next/headers cookies()` leest en de locale als prop doorgeeft (een client-only detector alléén = gegarandeerde hydration-mismatch voor non-en gebruikers op het login-scherm); `<html lang>` volgt de UI-locale.
- [ ] Display-language wijzigen in Settings → Appearance flipt `i18n.language` live (geen reload), persisteert naar `AppearancePreference.language` + cookie, en overleeft reload + device-wissel (DB-backed).
- [ ] Display-language wijzigen raakt **niet** `Workspace.contentLanguage` of enige generatie-output (separation-smoke groen: `getBrandContext()` byte-identiek ongeacht UI-locale; `src/lib/ai/**` importeert geen `AppearancePreference`).
- [ ] App-chrome (sidebar/top-nav/PageShell/PageHeader/AuthPage) rendert via `t()` met getypeerde keys; `en`-bundle + één demonstratie-locale (nl) om de live-switch te bewijzen. **Dep-noot**: de nl-chrome-bundle komt uit `[[i18n-ai-translation-pipeline]]` — de en↔nl-smoke draait ná die generatie (niet strikt parallel).
- [ ] Locale-aware `Intl`-formatters (`src/lib/ui-i18n/format.ts`) gebonden aan de UI-locale; de ~171 `toLocale*`-datum/getal-sites (107 files) gemigreerd; CI-guard vlagt ook rauwe `toLocale*`/`Intl.*Format`-calls (anders ziet een NL-gebruiker nog Engels-geformatteerde datums).
- [ ] CI-guard (`no-restricted-syntax`/`eslint-plugin-i18next`) faalt op nieuw-geïntroduceerde hardcoded JSX-tekst / onvertaalde toast / zod-string.
- [ ] `npx tsc --noEmit` 0 errors (geen `any`, getypeerde keys)
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd
- [ ] Documentatie bijgewerkt indien van toepassing

# Bestanden die ik aanraak

- `package.json` (i18next + react-i18next + i18next-browser-languagedetector + i18next-resources-to-backend [+ i18next-icu])
- `src/lib/ui-i18n/` (nieuw) — `config.ts`, `i18n.ts`, `I18nProvider.tsx`, `format.ts` (Intl-formatters), `locales/{en,nl}/common.ts`, `locales/{en,nl}/navigation.ts`
- `src/types/react-i18next.d.ts` (nieuw) — module-augmentation voor getypeerde keys
- `src/app/page.tsx` (provider mount), `src/app/layout.tsx` (dynamische `<html lang>` via cookie)
- `src/features/settings/components/SettingsPage.tsx` (vervang placeholder), `src/features/settings/components/SettingsSubNav.tsx`
- nieuw `AppearanceTab` (port de LanguageRegion-kaart uit de orphan `src/components/settings/AppearanceSettingsPage.tsx:207-265`)
- `src/app/api/settings/appearance/route.ts` (zod `language` → `z.enum(SHIPPED_LOCALES)`)
- `src/components/EnhancedSidebarSimple.tsx`, `src/components/TopNavigationBar.tsx` (optionele Globe-quickswitch), `src/components/ui/layout/*`, `src/components/auth/AuthPage.tsx`
- `eslint.config.mjs` (evolueer de bestaande NL-guard naar de structurele hardcoded-string-guard)
- `scripts/smoke-tests/ui-content-locale-separation.ts` (nieuw)

# Bestanden die ik NIET aanraak

- `src/lib/i18n/*` — dat is het CONTENT-locale-systeem (franc-min), géén UI-i18n. Naamcollisie strikt vermijden.
- `src/components/settings/AppearanceSettingsPage.tsx` / `AccountSettingsPage.tsx` — orphaned dead code; alleen als port-bron lezen, niet reanimeren.
- Content-generatiepaden (`src/lib/ai/brand-context.ts`, canvas-orchestrator) — UI-locale raakt content nooit.

# Smoke test plan

1. Start app; zet cookie `branddock-ui-locale=nl` → eerste paint chrome in NL, geen flash, `<html lang="nl">`.
2. Login → Settings → Appearance → wissel Display language en↔nl: sidebar/top-nav/PageShell/AuthPage her-renderen live; reload behoudt keuze.
3. Genereer een deliverable met UI op NL en `Workspace.contentLanguage=en`: output blijft Engels (separation-smoke).
4. Voeg in een component een rauwe `<Button>Save</Button>` toe → `npm run lint` faalt op de guard.

# Risico's

- `<html lang>` dynamisch maken opt de shell uit static rendering — acceptabel voor een ingelogde app; verifieer geen caching-regressie.
- Hydration-flash als de cookie niet synchroon vóór eerste render gelezen wordt — statisch bundelen van `common` + synchrone detector-init mitigeert.
- Lazy namespaces kunnen rauwe keys flashen — preload actieve namespace bij navigatie of wrap in Suspense met de AuthGate-spinner.

# Out of scope

- De automatische AI-vertaal-pipeline zelf → `[[i18n-ai-translation-pipeline]]`.
- Feature-namespace-extractie buiten de chrome (campaigns/settings/personas/…) → eigen extractie-werkstroom binnen de pipeline-task.
- Content-locale / multi-markt → `[[content-locale-foundation]]`.
- De inerte theme/accent/fontSize-appearance-settings DOM-applier (hergebruik het patroon pas als bewust mee-scoped).
- Server-side string-oppervlakken (transactionele e-mails, persisted `Notification`-copy, ~10 `export*Pdf.ts`-utilities) — niet gedekt door de JSX-CI-guard; geadresseerd via de server-catalog in `[[i18n-ai-translation-pipeline]]` resp. een eigen sub-task. RTL (ar/he) out-of-scope; migratiedoel = logical-properties + `html dir`.

# Notes

- Runtime-keuze (i18next) en de twee-assen-scheiding zijn vastgelegd in de ADR. De `t()`/provider-grens bewust wisselbaar houden.
- Auto-detect uit `navigator.language` is een eenmalige seed (nooit ongoing override).
- Optie-set van deze selector = de set geshipte UI-bundles, los van de content-talenlijst.

# Status 2026-06-30 — increment 1 geland (branch `feat/i18n-ui-foundation`)

**✅ Gedaan**: i18next-runtime (`src/lib/ui-i18n/`), provider in `layout.tsx` (server-seed via cookie → `initialLocale`, `useState`-lazy-instance, geen hydration-flash), `LocaleReconciler` (DB-pref na login), **Display-language**-selector (`AppearanceTab`, vervangt placeholder), zod `z.enum(SHIPPED_LOCALES)` + read-time-normalisatie, getypeerde keys, en↔nl chrome live vertaald (SettingsSubNav 9 tabs + TopNav + sidebar Settings/Help), scoped ESLint-guard (bewezen), separation-smoke 3/3, dode `AppearanceSettingsPage.tsx` verwijderd. tsc 0 / lint 0 / build groen. Ge-finalized via 2-ronde 2-subagent review-loop (0 CRITICAL; 4 WARNING totaal gefixt). Changelog #351.

**⏳ Resterend (status blijft `in-progress`)**: data-driven `SIDEBAR_NAV`-labels (gedeelde constant), `AuthPage`, per-pagina `PageHeader`-titels, `format.ts` + ~171 `toLocale*`-sites, feature-namespace-extractie, de AI-vertaalpipeline (`[[i18n-ai-translation-pipeline]]`). MINOR-polish uit de review: `tKey`-union-typing, expliciete query-error-state, `doneRef` cross-user-switch-edge.

# Status 2026-07-02 — Fase 1 follow-ups grotendeels geland (branch `feat/i18n-fase1-followups`, 8 commits, changelog #352)

**✅ Gedaan**: `SIDEBAR_NAV` render-edge + `AuthPage` (`common:auth`) + `format.ts` (`useFormat`) [`96938871`] · lazy feature-namespace runtime (`i18next-resources-to-backend`) [`23e5ad38`] · **feature-extractie waves 1-4** (~35 namespaces, en+nl door de extractie-agents zelf gegenereerd, AI-gedreven) [`9b6ced14`/`81420d63`/`2c944ca3`/`a4491867`] · **toLocale-sweep** (~130 sites → `useFormat`) [`34cf8111`]. Elke wave per-commit gate-groen (tsc 0 / lint 0 / separation-smoke 3/3 / build groen). De app switcht nu naar nl over vrijwel alle schermen.

**Bewust uitgesloten / gedocumenteerd** (blijven Engels, geen bug): `puck-config.tsx` (server-safe — hook breekt de `/p/[slug]`-SSR), `canvas/previews/*` (social-mock-chrome, ambigu), losse top-level `src/components/*.tsx`, `ai-studio`/`ai-trainer`-shells, `.ts` lib/services-formattering, `.toFixed`-bedragen.

**⏳ Resterend**: ESLint-guard-allowlist bewust NIET verbreed (migrated files houden opzettelijk-gelaten enum/data-strings → guard zou false-positives geven; blijft scoped op appearance+TopNav — nieuwe files toevoegen zodra volledig clean) · de aparte AI-vertaalpipeline (`[[i18n-ai-translation-pipeline]]`, voor onderhoud/regeneratie op schaal) · `task-finalize` (review-loop + status→done) door user te triggeren · handmatige browser-smoke (nl↔en over de hoofdschermen).

# Status 2026-07-03 — REMEDIATION (waves 1-5) — changelog #353

Na een user-melding ("veel nog Engels") vond een multi-agent audit twee structurele oorzaken die de JSXText-extractie niet kón raken: **data-gedreven constant-registries** (render via `{item.name}`) en **gemiste `src/components/*`-clusters** (waves liepen op `src/features/*`). Opgelost met het **render-edge-patroon** (constant blijft en-bron + stabiele key; `t('ns:key', {defaultValue})`) in 5 waves:

- **Wave 1** — campagne-registries (stepper/goal-types/pipeline-config/content-type-inputs-726/deliverables). `4fd49c44`+`9889d73b`
- **Wave 2** — Brand Foundation (component-migratie `src/components/brand-foundation`+`brand-assets`+`asset-content` + `canonical-brand-assets` op slug). `239ab790`
- **Wave 3** — gedeelde AI-exploration-chat + 17 merk-DNA-registry-groepen (234 keys). `f082554e`
- **Wave 4** — resterende live-pagina's + shared/lock/billing/versioning/impact + brandstyle review-sections + auth-chrome. `1259d798`
- **Wave 5** — long-tail met **liveness-verificatie**: products/media/consistent-models/trends-personas/claw-content (~328 keys); research-bundles/strategy-tools/business-strategy geskipt (DB-backed/dood/enum). `0cd3d4c4`

Waves 1-4 gemerged via **PR #70** (op `main`). Wave 5 op branch `feat/i18n-wave5-longtail` (PR openstaand). **Browser-smoke geslaagd** (login nl↔en + `<html lang>`, geautomatiseerd via Playwright). Elke wave per-commit gate-groen (tsc 0 / lint 0 / smoke 3/3 / build groen).

**Verify-then-skip (gedocumenteerd, níet vertaald)**: dode 0-import files (PurchaseModal, BundleDetailsPage, settings/*-duplicaten, StyleGuideViewer, e.a.), demo-routes (ValidationMethodDemo, TransformativeGoalsDashboard), `MODULE_META` dead export, en de PDF-export-utils (aparte track). Plus AI-gegenereerde/user-editable merk-content + AI-prompt-strings (bewust merk-content, geen chrome).
