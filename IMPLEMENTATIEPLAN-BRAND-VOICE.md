# IMPLEMENTATIEPLAN — Brand Voice Module Extractie

> Voorbereidende plan voor extractie van voice-data uit de Brand Personality
> canonical asset naar een dedicated Brand Voice module. Mirror-architectuur
> van Brandstyle (visueel) maar dan voor verbal identity.
>
> **Status**: BV-0 ✅ + BV-1 ✅ + BV-2 ✅ + BV-3 ✅ + BV-5 ✅. BV-4 (fidelity rewire) en alle overige consumers staan in `IMPLEMENTATIEPLAN-BV-WIRE.md`.
> **Naam-collision**: `BrandVoice` model bestaat al als ElevenLabs TTS voice-record.
> Nieuwe model heet `BrandVoiceguide` (mirror van `BrandStyleguide` voor verbal identity).
> **Memory-context**: zie `brand-voice-future-extraction.md`.
> **Wiring research**: zie `IMPLEMENTATIEPLAN-BV-WIRE.md` voor de cutover-plan van alle consumers (composition-engine, BVD, alignment, etc.).
> **Volledige protocol-context**: `docs/voice-fingerprinting-ws2-protocol.md` v0.5 §6.7-6.8
>
> Laatst bijgewerkt: 6 mei 2026 [EJ]

---

## DOEL EN SCOPE

Brand Voice wordt een nieuwe module **parallel aan Brandstyle**:
- Brandstyle = visuele identity (colors, fonts, components, visual-language)
- Brand Voice = verbale identity (samples, vocabulary, channel-tones, anti-patterns, voice-DNA)

Mirror van Brandstyle Analyzer-flow:
1. **Analyzer**: long-form text scan extension van bestaande `multi-page-scraper`
2. **Voiceguide UI**: 5-tab pagina (References / Vocabulary / Channel-Tones / Anti-Patterns / Voice DNA)
3. **Export formats**: PDF + JSON
4. **Save-for-AI per sectie** (parallel aan Brandstyle's `*SavedForAi` boolean pattern)
5. **Database-resident** met workspace-scoped record (1:1 zoals BrandStyleguide)

**Wat niet:** geen replacement voor Brand Personality. Personality blijft in canonical asset (psychografisch). Brand Voice is voice-only en verrijkend, niet vervangend.

---

## EXTRACTIE-TABEL (uit memory)

Welke `BrandPersonalityData` velden migreren naar Brand Voice:

| Veld | Migreer? | Redenering |
|---|---|---|
| `writingSample: string` → `writingSamples: string[]` | ✅ | Core voice-reference, breidt uit naar 5-10 gecureerde samples |
| `brandVoiceguideDescription: string` | ✅ | Voice-prosa, niet personality-eigenschap |
| `wordsWeUse: string[]` | ✅ | Vocabulary, voice-domein |
| `wordsWeAvoid: string[]` | ✅ + `brand-rule-sync.ts` bron-pad updaten | Auto-syncs naar fidelity Pijler 3 BrandRule |
| `channelTones: { website, socialMedia, ... }` | ✅ + uitbreiden | Per-kanaal voice |
| `toneDimensions: NN/g 4-axis` | ⚠️ deels | Voice-axes blijven (formal/casual, etc.); psychografische aspect blijft in Personality |
| `personalityTraits, dimensionScores, spectrumSliders` | ❌ blijft | Psychografisch, niet voice |
| `colorDirection, typographyDirection, imageryDirection` | ❌ blijft / migreert naar Brandstyle | Visueel |

---

## SCHEMA DESIGN

### Nieuw Prisma model

```prisma
model BrandVoiceguide {
  id              String    @id @default(cuid())
  workspaceId     String    @unique
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  // ─── Voice DNA ──────────────────────────────
  voiceDescription String?   @db.Text  // gemigreerd van BrandPersonality.brandVoiceguideDescription
  toneDimensions   Json?     // 4-axis NN/g (formalCasual, seriousFunny, etc.)

  // ─── References ─────────────────────────────
  writingSamples   Json      @default("[]")  // string[] — gecureerde samples (5-10 typisch)

  // ─── Vocabulary ─────────────────────────────
  wordsWeUse       String[]  // gemigreerd
  wordsWeAvoid     String[]  // gemigreerd, blijft auto-sync bron voor BrandRule

  // ─── Channel-Tones ──────────────────────────
  channelTones     Json?     // { website, socialMedia, email, ads, video, ... }

  // ─── Anti-Patterns ──────────────────────────
  antiPatterns     String[]  // anti-pattern phrases (uitbreiding op wordsWeAvoid)

  // ─── Embedding centroid (voor fidelity Pijler 1) ─────
  centroidEmbedding Unsupported("vector(1536)")?  // OpenAI text-embedding-3-small (pgvector)
  centroidComputedAt DateTime?

  // ─── Save-for-AI per sectie (Brandstyle-pattern) ─────
  voiceDnaSavedForAi      Boolean @default(true)
  vocabularySavedForAi    Boolean @default(true)
  channelTonesSavedForAi  Boolean @default(true)
  antiPatternsSavedForAi  Boolean @default(true)
  referencesSavedForAi    Boolean @default(false)  // verbose, default off

  // ─── Metadata ───────────────────────────────
  source           String    @default("manual")  // "manual" | "extracted" | "analyzer"
  publishedAt      DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  createdById      String?
  createdBy        User?     @relation(fields: [createdById], references: [id])

  @@index([workspaceId])
}
```

### Workspace + User relatie-uitbreidingen

- `Workspace.brandVoiceguide: BrandVoiceguide?` (1:1)
- `User.createdBrandVoiceguides: BrandVoiceguide[]`

### BrandPersonality model: deprecate voice-velden niet meteen

Backwards-compat strategie: voice-velden in `BrandPersonalityFrameworkData` blijven bestaan tijdens migratie-window (3-6 maanden). `formatBrandPersonality()` wordt gesplitst:
- `formatBrandPersonality()` — alleen psychografisch
- `formatBrandVoiceguide()` — voice-data uit nieuwe model

In transitie-fase: als BrandVoiceguide bestaat → gebruik die. Anders fallback op BrandPersonality.

---

## CODE TOUCH-POINTS

| File | Wijziging |
|---|---|
| `prisma/schema.prisma` | + BrandVoiceguide model, + Workspace/User relaties, + pgvector extensie |
| `src/lib/ai/brand-context.ts` | Splits `formatBrandPersonality()` → `formatBrandPersonality()` + `formatBrandVoiceguide()`. `getBrandContext()` includeert beide. |
| `src/lib/brand-fidelity/brand-rule-sync.ts` | Bron-pad: `BrandPersonality.wordsWeAvoid` → `BrandVoiceguide.wordsWeAvoid + BrandVoiceguide.antiPatterns` (union met dedup) |
| `src/lib/brand-fidelity/composition-engine.ts` | Pijler 1 Style: leest nu `BrandVoiceguide.centroidEmbedding` ipv `BrandPersonality.writingSample` for chunked-embedding match |
| `src/lib/brand-fidelity/fidelity-config.ts` | Pijler-bron-paden updaten naar BrandVoiceguide |
| `src/types/brand-asset-detail/framework.types.ts` | `BrandPersonalityFrameworkData` velden markeren als `@deprecated` (transitie-fase) |
| `scripts/voice-research/` | Hergebruik chunked-embedding pipeline voor centroid-berekening uit `writingSamples[]` |
| Nieuwe API routes | `/api/brandvoice` GET+PATCH, `/api/brandvoice/analyze/url`, `/api/brandvoice/[section]/save-for-ai`, etc. (mirror `/api/brandstyle/`) |
| Nieuwe frontend feature | `src/features/brand-voice/` met `BrandVoiceguideAnalyzerPage`, `BrandVoiceguideguidePage`, 5 tab-componenten |

---

## FASEN

### Fase BV-0 — Schema + Migratie ✅ AFGEROND (2026-05-06)

- ✅ Prisma `BrandVoiceguide` model toegevoegd (~70 regels, `@@unique workspaceId`, `Unsupported("vector(1536)")` centroid). NB: model heet **BrandVoiceguide** (niet BrandVoice) ivm collision met ElevenLabs TTS BrandVoice model.
- ✅ `Workspace.brandVoiceguide` + `User.createdBrandVoiceguides` relaties
- ✅ DB synced via `npx prisma db push` + client geregenereerd
- ✅ Migration script `prisma/scripts/migrate-personality-to-voiceguide.ts` (idempotent, dry-run via `MIGRATE_DRY_RUN=1`, optionele OpenAI centroid via `MIGRATE_SKIP_EMBEDDING=1`, scope via `MIGRATE_WORKSPACE_ID`)
- ⏳ Demo-data seed.ts: pending (niet kritiek, BV-1 werkt zonder demo-record dankzij upsert in PATCH endpoint)

### Fase BV-1 — Backend Splits ✅ AFGEROND (2026-05-06)

- ✅ `BrandContextBlock.brandVoiceguide?: string` toegevoegd (`prompt-templates.ts`)
- ✅ Render-injectie in 3 tier renders (`formatBrandContext`, summary inventory, light) — voiceguide als eigen blok onder personality
- ✅ `formatBrandVoiceguide(BrandVoiceguideRow)` in `brand-context.ts`: voice-description, NN/g 4-axis tone, channel tones, wordsWeUse/Avoid, antiPatterns, eerste writing-sample (truncated 600 chars)
- ✅ `getBrandContext()` Promise.all uitgebreid met `prisma.brandVoiceguide.findUnique` query — soft-migration: voiceguide krijgt voorrang als rij bestaat, anders blijft `formatBrandPersonality()` voice-output rendering
- ✅ `brand-rule-sync.ts` herschreven:
  - `syncWordsAvoidToRules` legacy (source `auto:wordsWeAvoid` van BrandPersonality) — back-compat
  - `syncVoiceguideToRules` nieuw (sources `auto:voiceguide.wordsWeAvoid` warning + `auto:voiceguide.antiPatterns` error)
  - `syncWorkspaceBrandRules` unified entry-point: dropt legacy rules wanneer voiceguide bestaat
- ✅ `/api/brandvoiceguide` GET + PATCH (Zod, upsert pattern, auto-trigger rule-sync wanneer wordsWeAvoid/antiPatterns muteert, `invalidateBrandContext` + cache prefix)
- ✅ Cache prefix `brandvoiceguide:${wsId}` in cache-keys
- ✅ TypeScript 0 nieuwe errors

### Fase BV-2 — Voiceguide UI ✅ AFGEROND (2026-05-06)

4-tab pagina (anti-patterns als sub-blok in Vocabulary, niet aparte tab):
- ✅ **Voice DNA**: voice-description + 4-axis NN/g sliders + centroid status (incl. Recompute-knop)
- ✅ **Vocabulary**: wordsWeUse + wordsWeAvoid + antiPatterns (3 chip-lists, accent-coded)
- ✅ **Channel Tones**: 5 channels (website/socialMedia/email/ads/video) — vrije tekst + optionele dominante axis-shift
- ✅ **References**: writing-samples lijst (add/edit/delete, char/woord-count, recommend 5-10)

Sidebar (rechts): `PersonalityCompanionCard` toont read-only voice-velden uit BrandPersonality.frameworkData zolang die er nog staan.

Empty-state pagina met 3-card CTA: Migrate from Personality / Run Analyzer / Start from scratch.

Save-for-AI banner per sectie (toggle ipv eenmalig save zoals brandstyle, default: 4× ON, References OFF). Defaults vergrendeld.

Sidebar plek: KNOWLEDGE sectie tussen Brandstyle en Business Strategy. Mic2 icon, teal→emerald gradient.

### Fase BV-3 — Analyzer ✅ AFGEROND (2026-05-06)

- ✅ `voice-analyzer-engine.ts` — fire-and-forget pipeline met in-memory progress (5 statussen: PENDING/SCRAPING/EXTRACTING/ANALYZING/COMPLETED). Hergebruikt `scrapeUrlMultiPage` voor URL-mode, accepteert `pastedSamples` voor paste-mode.
- ✅ `voice-analysis-prompts.ts` — Claude system + user prompt builder. Output contract: voiceDescription, toneDimensions (4-axis), 3-5 writingSamples (verbatim), wordsWeUse/Avoid, channelTones, antiPatterns + rationale per sectie.
- ✅ API: `POST /api/brandvoiceguide/analyze/url` + `GET /analyze/status/[jobId]`.
- ✅ Analyzer-UI: input-modes (URL / paste), processing 5-step checklist, review-screen met per-sectie toggle (apply or skip).
- ✅ **Website-scanner integratie**: `scanner-pipeline.ts` Phase 5b VOICE ANALYSIS — runt na STYLING met dezelfde scrape-data, alleen wanneer geen voiceguide bestaat. `ScanProgress` type uitgebreid (brandvoiceStatus, brandvoiceError, brandvoiceJobId).

### Fase BV-5 — Deprecate Personality voice-velden ✅ AFGEROND (2026-05-06)

Strict cutover (geen 3-6 maanden window — user-keuze "actief migreren"):
- ✅ `BrandPersonalitySection.tsx` Card 4 (Voice & Tone) + Card 5 (Communication Style) vervangen door teal "moved to Brand Voice" banner met read-only summary van legacy fields.
- ✅ `BrandPersonalityFrameworkData` type: 6 voice-velden voorzien van `@deprecated` markers.
- ✅ `formatBrandPersonality()` in brand-context.ts: voice-output verwijderd. Voiceguide rendert via `formatBrandVoiceguide()`. Fallback in getBrandContext: workspaces zonder voiceguide krijgen voice-context geprojecteerd uit personality.frameworkData (1 cycle, totdat ze migreren).
- ✅ `brand-asset-completeness.ts` BRAND_PERSONALITY case: 6 voice-velden uit completeness criteria.

NB: schema-veld-deletie van BrandPersonalityFrameworkData is bewust NIET gedaan — frameworkData is een Json-veld, dus geen migration nodig. Type behoudt voice-velden voor back-compat met workspaces die niet gemigreerd zijn.

### Fase BV-4 — Fidelity Integratie + andere consumers (BV-WIRE)

Apart plan-doc: `IMPLEMENTATIEPLAN-BV-WIRE.md` — inventaris van alle 11+ modules die nog tegen voice-velden lezen via de oude paden + 7-wave cutover plan.

Belangrijkste items:
- W-1 Pillar 1 fingerprint switch (style-scorer + composition-engine + fidelity-runner) — vereist regression-test
- W-2 BVD canvas directive
- W-3 Alignment + AI prompts
- W-4 Consistent-models brand context
- W-5 AI Exploration brand-personality config (voice-dimensies strippen, optioneel nieuwe brand-voice config)
- W-6 Framework PATCH endpoint legacy `syncWordsAvoidToRules` afsluiten
- W-7 F-VAL vanilla baseline (alleen als scope uitbreidt)

Effort: 11-18u + 1u regression test.

---

## OPEN BESLISSINGEN

Concrete keuzes voor sessie 1 van Brand Voice werkstroom:

1. **Splitsing strikt of soft?** Strict = alle voice-velden meteen weg uit BrandPersonality. Soft = backwards-compat window van 3-6 maanden. **Aanbeveling: soft** (regression-test makkelijker, geen breakage).

2. **Centroid embedding-model?** OpenAI `text-embedding-3-small` (1536-dim, $0.02/1M tokens, snel) vs `text-embedding-3-large` (3072-dim, betere accuracy, $0.13/1M). **Aanbeveling: small** voor MVP, evalueer accuracy later.

3. **Wanneer centroid (her)berekenen?** Bij elke writingSamples-mutatie? Of alleen op user-request? **Aanbeveling: bij mutatie via debounced background-job**, expose `recompute-centroid` admin-action voor handmatig.

4. **Tone-dimensions: 4-axis behouden of uitbreiden?** Memory note over LINFI tone-fix suggereert channel-specific tones zijn meer accuraat. **Aanbeveling: globale 4-axis als baseline + per-channel overrides** (channel-tones sectie).

5. **Anti-patterns: separate veld of subset van wordsWeAvoid?** Anti-patterns zijn vaak phrases (multi-word), niet single words. **Aanbeveling: separate `antiPatterns: String[]`** veld voor multi-word patterns; wordsWeAvoid blijft single-word focus.

6. **Analyzer-trigger: handmatig of auto-bij-Brandstyle-scan?** **Aanbeveling: handmatig vanuit Voiceguide pagina**. Brandstyle scan blijft visual-only.

7. **Save-for-AI defaults?** Voice-DNA + Vocabulary + Channel-Tones + Anti-Patterns: ON. References: OFF (verbose). **Aanbeveling akkoord, vergrendel.**

---

## RISICO'S + MITIGATIES

| Risico | Mitigatie |
|---|---|
| **Fidelity-score regressie** na migratie | Verplichte regression-test in Fase BV-4: 100 sample content-versies, score voor + na, accept als delta < 5% |
| **pgvector extensie** niet beschikbaar in productie | Pre-flight check in migrate-script. Als extensie niet beschikbaar → centroid kolom NULL, fallback op text-based fidelity |
| **BrandPersonality voice-velden uit sync** met BrandVoiceguide tijdens transitie-window | Database trigger of background-job sync (BrandPersonality.wordsWeAvoid → BrandVoiceguide.wordsWeAvoid bij update tot deprecation) |
| **Embedding-cost** voor grote workspaces | Centroid-berekening 1× per writingSamples-set (gemiddeld 5-10 samples × 500 tokens = 5K tokens = $0.0001). Triviaal. |
| **LINFI-style tone-fix verkeerd** (memory observatie) | Channel-specific tones lossen dit op via per-channel overrides — elke kanaal eigen tone-direction |

---

## REFERENTIES

| Document | Rol |
|---|---|
| `brand-voice-future-extraction.md` (memory) | Volledige extractie-context + sequencing |
| `docs/voice-fingerprinting-ws2-protocol.md` v0.5 §6.7-6.8 | WS3 finding + architecture |
| `IMPLEMENTATIEPLAN-FIDELITY-CRITERIA.md` | Decision-locked scoring-architectuur |
| `IMPLEMENTATIEPLAN-LEARNING-LOOP.md` | Telemetrie context |
| `src/lib/brand-fidelity/fidelity-config.ts` | 3-pijler weights |
| `src/lib/brand-fidelity/brand-rule-sync.ts` | Pijler 3 auto-sync, bron-pad-update vereist |
| `src/lib/ai/brand-context.ts` `formatBrandPersonality()` | Splits in fase BV-1 |
| `scripts/voice-research/` | WS3 chunked-embedding pipeline, hergebruikbaar |

---

## SEQUENCING

Kritisch — niet in de war raken:

1. ✅ Fidelity afgerond (geeft stabiele scoring-baseline op huidige BrandPersonality-data)
2. ✅ Learning loop afgerond (geeft telemetrie waar fidelity zwak is)
3. **➡️ Brand Voice extractie** ← hier
4. WS2 generation (12 stukken propagation-mechaniek-meting) kan parallel

WS2 meet niet bron-data-kwaliteit, dus methodologisch valide om parallel te draaien.

---

## OPEN AFHANKELIJKHEDEN

Buiten dit plan, niet door deze werkstroom op te lossen:

- **F-VAL strict-mode** afronden (gebruiker-werkstroom, niet-gecommitte changes in `brand-fidelity/`)
- **Productie pgvector** activatie (devOps, niet code)
- **WS3 voice-research** afronden (geeft accuracy-baseline voor centroid-aanpak)

---

*Plan-doc voorbereid 2026-05-06. Sessie 1 van Brand Voice werkstroom kan starten zodra F-VAL stable. Voor open beslissingen: review met gebruiker vóór schema-migratie.*
