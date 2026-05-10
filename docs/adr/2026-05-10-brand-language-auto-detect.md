# ADR 2026-05-10 — Brand-language auto-detect via franc-min

**Status**: Accepted
**Datum**: 2026-05-10
**Auteur**: claude-code (sessie met erik@betterbrands.nl)
**Verwante ADRs**: 2026-05-08-locale-routing-brand-voice (precedence)
**Verwante task**: tasks/done/brand-language-auto-detect.md

## Context

Workspaces krijgen bij creatie `Workspace.contentLanguage = 'en'` als default. F-VAL audit (2026-05-10) onthulde dat 4 van de 14 workspaces met content NL-text hebben terwijl ze als EN geconfigureerd staan. Gevolg:

- **F-VAL Pijler 3** gebruikt verkeerde heuristic-pack (EN-GB ipv NL-NL) → mist locale-specifieke buzzwords
- **Canvas-orchestrator** injecteert "Write in English" in BVD → AI genereert EN-content voor NL-merk
- Mismatch is **silent**: geen runtime-signaal, geen audit-pad voor user

Bestaande locale-resolver (`src/lib/brand-fidelity/heuristics/locale-resolver.ts`, per ADR 2026-05-08) implementeert precedence-logic:

```
BrandVoiceguide.contentLocale  →  Workspace.contentLanguage (mapped)  →  'en-GB' (fallback)
```

Maar de fallback is een **stille standaard** — niet een uitleg dat de detectie failed. Voor een merk met duidelijk NL-content moet de configuratie corrigeerbaar zijn zonder dat user expliciet weet dat workspace.contentLanguage standaard 'en' is.

## Beslissing

Drie complementaire mechanismen:

### 1. Detection helper

`detectBrandLanguage(workspaceId): Promise<BrandLanguageDetection>` in `src/lib/i18n/detect-brand-language.ts`. Combineert drie tekstuele bronnen per workspace:

1. `BrandVoiceguide.voiceDescription`
2. `BrandVoiceguide.writingSamples` (JSON array, flatten alle strings)
3. `BrandAsset.frameworkData` + `BrandAsset.content` (Json — flatten alle strings ≥20 chars)

Runt deze geconcateneerde tekst door **`franc-min` v6.2.0** (42KB ESM, no native bindings, ondersteunt 150+ talen). Mapping ISO 639-3 → ISO 639-1 → BCP-47:

| franc-min | ISO 639-1 | BCP-47 |
|---|---|---|
| `nld` | `nl` | `nl-NL` |
| `eng` | `en` | `en-GB` |
| `deu` | `de` | `de-DE` |
| `fra` | `fr` | `fr-FR` |

Andere franc-outputs (talen buiten de 4 ondersteunde heuristic-packs) → `language: null`.

### 2. Confidence-thresholds

Detectie levert `confidence: 'high' | 'medium' | 'low'`:

- **`high`**: ≥2 sources én ≥300 chars totale corpus
- **`medium`**: ≥1 source én ≥150 chars
- **`low`**: <150 chars of <50 chars per source

Alleen `high` triggert auto-correctie in backfill. `medium` retourneert wel een language-guess maar wordt geskipped voor writes — user moet handmatig in Settings UI bevestigen. `low` retourneert `language: null`.

### 3. Override-policy (precedence)

Verhouding tot bestaande locale-resolver (ADR 2026-05-08):

```
1. BrandVoiceguide.contentLocale     (user-set, hoogste autoriteit)
2. Workspace.contentLanguage         (workspace-default, mapped naar BCP-47)
3. detectBrandLanguage()             (NIEUW — alleen via backfill-script)
4. 'en-GB'                           (ultimate fallback)
```

**Auto-detection is GEEN runtime-override** voor stap 1+2. Het is een **backfill-tool** (eenmalige correctie of periodieke audit) + een **runtime-mismatch-guard** (logging-only).

Reden: silent runtime-overrides breken user-trust. Als user bewust workspace.contentLanguage='en' heeft gezet voor een NL-brand (bijv. om English content voor een Engelstalige campagne te genereren), moet die keuze respected blijven. De backfill-script biedt de correctie via user-action (run met --apply).

### 4. Runtime mismatch-guard

`logBrandLanguageMismatchIfAny(workspaceId, configuredLanguage)` in canvas-orchestrator.ts. Bij elke content-generation:
- Fire-and-forget (geen `await`, geen blocking van generation)
- 5-min in-process cache per workspace (geen log-spam)
- Bij `confidence='high'` mismatch: `console.warn` met audit-trail (workspaceId, configured, detected, sources, suggested-action)

Doel: zichtbaarheid van mismatches in productie-logs zonder user-flow te onderbreken.

## Alternatieven overwogen

### A. Auto-override in runtime

Bij elke generation detect taal en gebruik die (negeer workspace.contentLanguage).

**Afgewezen**: silent override breekt user-keuze + introduceert volatility (zelfde brand-context kan verschillend gedrag tonen na voiceguide-edit).

### B. Detection in workspace-creation endpoint

Bij POST /api/workspaces: detect language uit user-submitted content + set workspace.contentLanguage correct.

**Afgewezen voor v1**: workspace wordt vaak aangemaakt vóór content er is. Detection levert pas signaal nadat voice-guide is ingevuld. Backfill-script dekt dit met latere correctie.

### C. UI-picker voor BrandVoiceguide.contentLocale

Brand Voice tab krijgt een locale-dropdown (nl-NL/nl-BE/en-GB/de-DE) met "Auto-detected: ..." pre-fill.

**Defer**: separate task. Backfill-script + Workspace Settings UI dekken v1 use-case. UI-picker is incremental enhancement.

### D. Library-alternatieven

- **`franc`** (full): 8x groter dan franc-min, ondersteunt 416 talen — overkill voor 4-talen-scope
- **`@google-cloud/translate`**: vereist API-key + network call — over-engineering
- **`cld3`**: Google's native lib — vereist native bindings, build-complexity
- **`eld`**: efficient language detector — minder accuracy bij short text
- **Self-rolled trigrammen**: hoge maintenance, vergelijkbare accuracy

`franc-min` is de pragmatic keuze voor v1: pure-JS, 42KB, deterministisch, no network.

## Consequenties

**Positief**:
- Backfill-script één-shot LINFI + 12 andere workspaces audit + correctie
- Runtime-guard maakt mismatches zichtbaar zonder user-flow te onderbreken
- Pure-JS dependency (geen network, geen native bindings) past binnen het project's deterministische F-VAL filosofie
- Helper is reusable: BrandVoiceguide UI kan in toekomst `detectBrandLanguage()` aanroepen voor "Auto-detected" pre-fill

**Negatief**:
- 42KB extra in dependency tree
- Detection-call doet per workspace 1 Prisma-query (cached via in-process Map 5 min)
- Backfill --apply schrijft naar 13/15 workspaces — als detection-bias optreedt (false-positive op marginale samples) verspreidt error zich workspace-wide. Mitigatie: alleen `high` confidence triggert write
- Geen ondersteuning voor multi-language workspaces (een merk dat NL+EN content levert) — out of scope

**Risico's**:
- Talen buiten de 4 (nl/en/de/fr) → `language: null` → workspace blijft op default. User-action vereist.
- franc-min dataset-bias bij regionale Nederlands varianten (Fries, Limburgs) — mogelijk lagere accuracy maar primary language nog NL-detected.

## Open vragen / follow-ups

- BrandVoiceguide.contentLocale picker in Brand Voice tab UI (separate task)
- Auto-set voiceguide.contentLocale bij workspace-creation als brand-assets al language-signal hebben (chicken-and-egg met workspace-onboarding)
- Multi-locale brand support (campagne in andere taal dan brand-default) — feature voor post-launch
- Bulk-edit UI voor backfill-resultaten (huidige is admin-script)

## Smoke verification

`scripts/smoke-tests/brand-language-detect.ts` (11/11 pass): NL/EN/DE/FR fixtures, short/empty edge-cases, mixed-language + code-blob inputs.

LINFI audit-output (report-only):
```
linfi    current=en  vg.locale=∅  detected=nl  confidence=high  →  update-both (ws en→nl, vg locale ∅→nl-NL)
```

Plus 12 andere workspaces met update-locale of update-both actions.
