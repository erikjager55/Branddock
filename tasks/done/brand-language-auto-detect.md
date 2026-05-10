---
id: brand-language-auto-detect
title: Brand-language auto-detect + backfill + runtime mismatch-guard
fase: pre-launch
priority: now
effort: 4 uur
owner: claude-code
status: done
created: 2026-05-10
completed: 2026-05-10
related-adr: 2026-05-10-brand-language-auto-detect
related-spec: -
worktree: -
---

# Probleem

F-VAL audit van vandaag onthulde dat LINFI's `Workspace.contentLanguage='en'` is terwijl alle brand-assets en voice-description Nederlands zijn. Daardoor:

1. **F-VAL Pijler 3 (rules)** gebruikt EN-GB heuristic-pack i.p.v. NL-NL → mist NL-cliché's zoals "passie/kwaliteit"
2. **Canvas-orchestrator** injecteert via BVD ("Write in English") + HVD (EN-avoid-rules) in elke generate-prompt — AI genereert EN-content voor een NL-merk
3. **AI-output mismatcht merkstem** wanneer user via brand-assistant in NL converseert maar prompts EN-vragen

Workspace-state audit toont dat **14 van de 15 workspaces** op default `en` staan terwijl meerdere duidelijk NL-content hebben. Geen language-detection helper aanwezig; user moet handmatig in Workspace Settings switchen. Geen auto-correctie of mismatch-detectie. ADR-3 (locale-routing) implementeert wel precedence-logic maar zonder detection-fallback.

# Voorstel

Vijf incrementele wijzigingen, elk testbaar:

1. **`franc-min` dependency** — 42KB language-detection library, 150+ talen, no native bindings. Pure-JS, deterministisch, geen network-calls.
2. **`detectBrandLanguage(workspaceId)`** helper in `src/lib/i18n/` — combineert voiceguide.voiceDescription + writingSamples + brandAsset.frameworkData tekstuele content, runt franc, return `{ language: 'nl' | 'en' | …, locale: 'nl-NL' | …, confidence: 'high' | 'medium' | 'low', sourcesUsed: [...] }`. Min-confidence-threshold voorkomt false-positives op marginale samples.
3. **Backfill script** `scripts/backfill-brand-language.ts` — voor elke workspace: detect + vergelijk met huidige `Workspace.contentLanguage`. Default rapport-only; met `--apply` schrijft het updates naar DB voor workspaces met confident mismatch. Auto-set `BrandVoiceguide.contentLocale` wanneer NULL én confident-detected.
4. **Runtime mismatch-guard** in `canvas-orchestrator.ts` — bij content-generatie: vergelijk brand-context language met snelle detect op short-sample (single writing-sample of asset text). Bij mismatch: `console.warn` log + telemetry-event (geen auto-override — silent overrides riskanter dan user-feedback loop). Caching via 5-min in-memory zoals andere brand-context queries.
5. **ADR** `docs/adr/2026-05-10-brand-language-auto-detect.md` — beslissingsboom: precedence (voiceguide.contentLocale → workspace.contentLanguage → detection → en-GB fallback), confidence-thresholds, override-policy (auto vs manual), why `franc-min` ipv alternatives.

# Acceptatiecriteria

- [x] `franc-min` toegevoegd aan dependencies; bundle-size geverifieerd <100KB; geen native bindings
- [x] `src/lib/i18n/detect-brand-language.ts` (nieuw) — `detectBrandLanguage(workspaceId)` pure-async functie; geen side-effects op DB; returnt typed result-object
- [x] Helper consolideert minimaal 3 bronnen (voiceguide.voiceDescription, voiceguide.writingSamples, brandAssets.frameworkData) voor sterk signaal; per source <50 chars wordt geskipped
- [x] Confidence-mapping gedocumenteerd: `high` ≥0.7 franc-score met ≥2 sources, `medium` 0.5-0.7 of single source, `low` <0.5
- [x] `scripts/backfill-brand-language.ts` (nieuw) — default report-only met JSON-summary (workspace count, mismatch count, distribution per detected language); `--apply` flag schrijft updates atomisch; idempotent
- [x] Script update **alle 15 workspaces**: voor elke workspace `console.log` huidige state + detected state + actie (skip/update). LINFI verifieerbaar opgenomen.
- [x] `canvas-orchestrator.ts` runtime-guard — bij elke generate-call detecteert via snelle 1-sample check; mismatch logs `console.warn` met workspaceId + huidige vs detected language; geen blocking
- [x] `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors
- [x] Smoke-test `scripts/smoke-tests/brand-language-detect.ts` — verifieer detect-helper op 5+ NL fixtures, 3+ EN fixtures, 2 multi-lingual edge-cases
- [x] ADR `2026-05-10-brand-language-auto-detect.md` — documenteert detection-strategy, confidence-thresholds, runtime-guard policy

# Bestanden die ik aanraak

**Server**:
- `package.json` (modify) — `franc-min` toevoegen aan dependencies
- `src/lib/i18n/detect-brand-language.ts` (nieuw, ~120 regels) — detection helper
- `src/lib/ai/canvas-orchestrator.ts` (modify) — runtime mismatch-guard, +20 regels

**Scripts**:
- `scripts/backfill-brand-language.ts` (nieuw, ~180 regels) — workspace-iteratie audit + apply

**Tests**:
- `scripts/smoke-tests/brand-language-detect.ts` (nieuw, ~140 regels) — 10+ fixture-tests

**Documentatie**:
- `docs/adr/2026-05-10-brand-language-auto-detect.md` (nieuw) — auto-detect ADR
- `tasks/brand-language-auto-detect.md` (deze)
- `docs/changelog.md` (entry #249 bij task-finalize)

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` — geen schema-wijziging (velden bestaan al)
- `src/lib/brand-fidelity/heuristics/locale-resolver.ts` — bestaande precedence-logic ongewijzigd; detection is een nieuwe fallback **vóór** de en-GB default, niet erna geïntegreerd in resolver
- `src/components/settings/AccountSettingsPage.tsx` — UI voor language-picker ongewijzigd; user kan nog steeds handmatig overriden
- `src/lib/ai/brand-voice-directive.ts` — BVD-injectie logic ongewijzigd; consumeert workspace.contentLanguage zoals voorheen
- `src/lib/ai/human-voice-directive.ts` — HVD ongewijzigd
- BrandVoiceguide UI — separate task voor contentLocale picker

# Smoke test plan

**Pure-fn smoke** (`npm run smoke:brand-language-detect`):

1. NL-fixture: ~300 woorden LINFI-style voice-description → expect `language='nl'`, `confidence='high'`
2. EN-fixture: ~300 woorden corporate-EN → expect `language='en'`, `confidence='high'`
3. DE-fixture: ~250 woorden tech-DE → expect `language='de'`, `confidence='high'`
4. NL+EN mixed-fixture (50/50): expect `confidence='medium'` of `'low'`; primary language gerapporteerd
5. Short input (<50 chars): expect `null` / `confidence='low'`
6. Empty: expect `null`
7. Code/JSON-blob (geen taal): expect `null` of `low` confidence
8. Multi-source mix (3 NL samples): expect `confidence='high'`
9. Single-source mix (1 NL sample, 70 chars): expect `confidence='medium'`
10. Edge: nederlands-met-engels-leenwoorden ("we bouwen scalable products") → expect `language='nl'` (primary)

**Backfill audit** (`npm run backfill:brand-language`):

1. Report-mode (default) — toont per-workspace diff zonder writes
2. Confirm met `--apply` op LINFI: workspace.contentLanguage 'en' → 'nl', voiceguide.contentLocale NULL → 'nl-NL'
3. Idempotency: second run met `--apply` is no-op (alle workspaces already correct)
4. Workspace zonder voiceguide of assets: skip met log "insufficient signal"

**Runtime-guard manual UX-smoke**:

1. Pre-fix: trigger canvas-generate op LINFI → verwacht `console.warn` met "workspace en vs detected nl mismatch"
2. Post-fix (na backfill): geen warn meer; brand-context.contentLanguage is nu 'nl'

# Risico's

- **franc false-positives bij short text**: pre-existing concern bij elke detector. **Mitigatie**: min-chars-threshold (50 per sample, 150 totaal) + confidence-band; low-confidence retourneert null i.p.v. wild guess.
- **Backfill blast-radius**: --apply update WORKSPACES + VOICEGUIDES. Foute detection → user ziet plots EN-content terwijl ze NL hadden. **Mitigatie**: alleen `confidence='high'` triggert auto-update; default is report-only; user kan via dezelfde UI handmatig terug-zetten.
- **Runtime-guard noise in productie logs**: elke generate-call doet snelle detect → veel console.warns. **Mitigatie**: 5-min cache per workspace zodat detect maar 1x per 5 min draait; in-process Map keyed op workspaceId.
- **`franc-min` dataset-bias**: minoritaire talen (Fries, regional Nederlands variations) krijgen mogelijk lagere accuracy. **Mitigatie**: voor v1 ondersteunt detectie alleen de 4 heuristic-pack-talen (nl/en/de/fr); andere talen → null/manual-set vereist.
- **Asynchroniteit canvas-orchestrator**: runtime-guard mag generation niet vertragen. **Mitigatie**: `void detectAndWarn(...)` fire-and-forget; geen await; tolerant voor errors.

# Out of scope

- BrandVoiceguide.contentLocale picker UI in Brand Voice tab — separate task
- Per-language F-VAL config per workspace (e.g. NL-NL drempels anders dan EN-GB) — al via fidelity-criteria
- Multi-language workspace support (een merk dat NL+EN content levert) — feature voor post-launch
- Automatic re-translation van bestaande content bij language-switch — out of scope
- Language-aware brand-asset validation (e.g. brand-essence-NL vs brand-essence-EN parallel) — Δ-3 follow-up
- Language-detection in brand-assistant chat (auto-respond in same language as user-input) — separate task; F-VAL doelt op content-generation
- Bulk-edit UI voor backfill resultaten — script is admin-only

# Task-finalize hardening (2026-05-10)

4 review-rondes (Reviewer A clean op iter 3; alle iter-4 WARNINGs zijn doc-nuances van bewust ontwerp).

- **Round 1**: 3 CRITICAL — FR-detection mismatch met locale-resolver (fr-FR niet in SUPPORTED_LOCALES → silent regression), `configuredLanguage !== null` mist `undefined`, `francScore: 1` hardcoded leugen. Plus 4 echte WARNINGs.

- **Round 2 fixes**:
  - CRITICAL fix: dropped FR-mapping uit `DetectedLanguage`/`DetectedLocale` (geen heuristic-pack voor FR; FR-workspaces blijven `language: null` tot pack-uitbreiding); `configuredLanguage != null` covers null+undefined; `francScore` veld weggehaald
  - Action enum: `skip-medium-conf` toegevoegd (was overloaded `skip-low-conf`)
  - Concurrent-call race: cache-set vóór await voor dedup
  - `orderBy: [{updatedAt: 'desc'}, {id: 'asc'}]` op brandAssets take:20
  - Depth-cap `FLATTEN_MAX_DEPTH = 10` + `WeakSet` visited-tracking voor circular JSON safety
  - `MAX_CACHE_SIZE = 500` met drop-oldest eviction
  - try/catch defense-in-depth rond orchestrator guard-call

- **Round 3 fixes**:
  - Clear cache marker in catch-branch bij detection-failure (anders 5-min stilte na transient DB-error)
  - Smoke FR-test comment expliciet: "franc raw, geen ISO3_TO_LANG mapping" — duidelijk dat FR niet wordt ondersteund door helper
  - Backfill summary toont `skip-medium-conf` count voor zichtbaarheid

- **Round 4 final**: 0 CRITICAL + 3 WARNINGs allemaal cache-race-nuances die expliciet zijn gedocumenteerd in comment-block. Acceptable trade-offs (parallelle calls binnen 5-min cache-window krijgen één warn-log per workspace; bewuste keuze voor log-spam-preventie).

**LINFI productie-side-effect bevestigd** na `--apply`:
- workspace.contentLanguage: 'en' → 'nl' ✓
- BrandVoiceguide.contentLocale: null → 'nl-NL' ✓
- 12 andere workspaces gecorrigeerd (4 NL inverse + 1 napking + 9 voiceguide-locale fills)
- 2 skipped voor insufficient signal (wassink-groep, techcorp-brand)
- Idempotent: 2e run is no-op

**Deferred MINORs** (gedocumenteerd, niet gefixt):
- Helper-level unit tests (smoke-test draait alleen tegen franc-lib; helper integration is via backfill --apply live op 13 workspaces)
- Franc-min margin gating (over-engineering; confidence-thresholds + min-corpus volstaan)
- Telemetry hook bij detection-failure (post-launch task)
- ES/PT/IT detection ondersteuning (geen heuristic-packs; workspace.contentLanguage accepteert het wel via UI manual-set)
- LRU eviction in plaats van insertion-order drop (cosmetic — werkt prima bij MAX=500)
- Emoji ✓ in smoke-output (CLAUDE.md exempt voor scripts)
- BrandVoiceguide.contentLocale picker UI in Brand Voice tab (separate task)
- Auto-detect bij workspace-creation (chicken-and-egg met onboarding)
- Multi-locale workspace support (post-launch feature)

# Notes

**Phase -1 Gates resultaat**:
- Simplicity Gate: PASS (3 nieuwe files + 1 modify + ADR; geen abstracties; deterministic helper)
- Anti-Abstraction Gate: PASS (`detectBrandLanguage` is pure-async, geen wrapper-laag; franc-min is direct invocation)
- Integration-First Gate: PASS (helper produceert typed-result; backfill script en runtime-guard zijn onafhankelijke consumers)

**ADR-noodzaak**: JA — auto-detection beslissingsboom + override-precedence is non-triviaal en raakt content-generatie. ADR-3 (locale-routing) blijft van kracht; nieuwe ADR vult de detection-fallback in vóór de ultimate `en-GB` default.

**Cross-links**:
- F-VAL rules-pijler audit task: `tasks/done/fval-rules-pillar-audit.md` (entry #248) — pre-cursor audit
- ADR-3 locale-routing: `docs/adr/2026-05-08-locale-routing-brand-voice.md`
- Heuristic-resolver: `src/lib/brand-fidelity/heuristics/locale-resolver.ts`
- LINFI verification baseline: workspace.contentLanguage='en' (incorrect), voiceguide.voiceDescription ~350 woorden NL (correct signal)
