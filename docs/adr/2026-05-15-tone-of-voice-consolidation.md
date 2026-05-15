---
id: 2026-05-15-tone-of-voice-consolidation
title: Tone of Voice tab consolideren in BrandVoiceguide als enige source-of-truth
status: accepted
date: 2026-05-15
supersedes: -
superseded-by: -
---

# Context

Branddock heeft historisch twee parallelle "voice"-locaties in het datamodel en de UI:

1. **`BrandStyleguide`** (Brand Styleguide module — tab "Tone of Voice")
   - `contentGuidelines String[]` — algemene "hoe schrijven we" regels, mogelijk met `OBSERVED:` / `RECOMMENDED:` prefixen
   - `writingGuidelines String[]` — schrijfstijl-regels met badge-parsing
   - `examplePhrases Json?` — do/don't fraseringen
   - `toneSavedForAi Boolean` — save-for-AI toggle

2. **`BrandVoiceguide`** (Brand Voice module — BV-WIRE architectuur 2026-05-06)
   - Voice DNA tab: `voiceDescription`, `toneDimensions` (4-axis NN/g baseline)
   - Vocabulary tab: `wordsWeUse[]`, `wordsWeAvoid[]`, `antiPatterns[]`
   - Channel Tones tab: `channelTones` (per-kanaal JSON)
   - References tab: `writingSamples[]` (centroid-embedding-bron voor F-VAL Pijler 1)
   - Metadata: `contentLocale` (ADR `2026-05-08-locale-routing-brand-voice`)

Daarnaast bevat `BrandPersonalitySection.tsx` (regels 481-532) een migratie-banner "Voice, Tone & Communication Style — moved" die read-only de oude `BrandPersonality.frameworkData.brandVoiceDescription/wordsWeUse/wordsWeAvoid/writingSample` velden toont. Banner is residu van de BV-WIRE-migratie en heeft geen huidige functie.

**Cross-link card** in `ToneOfVoiceSection.tsx` claimt sinds BV-WIRE-rollout: *"Brand Voice Guide is the canonical voice source. The guidelines on this tab are reference material for human writers. AI generations read voice rules, vocabulary, and channel tones from the Brand Voice Guide."* Deze claim is feitelijk onjuist: `src/lib/ai/brand-context.ts` regels 897-898 + 1274-1278 lezen `contentGuidelines` en `writingGuidelines` direct uit `Brandstyleguide` en injecteren ze in `voiceContext.guidelines` voor alle AI-calls. Hetzelfde geldt voor `knowledge-context-fetcher.ts`. Totaal ~25 files lezen deze velden uit Brandstyleguide (export emitters, F-VAL alignment, claw read-tools, brand-kit PDF, snapshots, campaign strategy, brandstyle analysis-engine/prompts).

Constraint 1 — **single source-of-truth voor voice**: een gebruiker die "hoe het merk klinkt" wil definiëren, moet naar één plek kunnen gaan. Twee locaties met cross-link-uitleg is een onboarding-cliff en geeft AI-prompt-builders ambiguïteit over welke bron leidend is.

Constraint 2 — **geen overlap, wel complementariteit**: een feitelijke vergelijking tussen de twee modellen toont **geen veld-overlap** — de drie tone-of-voice-velden bestaan niet in BrandVoiceguide. Het is dus geen duplicaat-verwijdering maar een schema-consolidatie waarbij velden van A naar B verhuizen.

Constraint 3 — **AI-context-builders mogen geen breaking change zien**: ~25 downstream consumers (alignment, export, claw, campaign-strategy) lezen `voiceContext.guidelines`. Payload-shape moet identiek blijven, alleen de bron-fetch wijzigt.

Constraint 4 — **methodologie-consistentie met BV-WIRE**: ADR `2026-05-08-locale-routing-brand-voice` koos `BrandVoiceguide` expliciet als locatie voor "merkstem-DNA". Tone-of-voice guidelines passen architecturaal bij Voice DNA (4-axis tone + voice description → guidelines die deze tone uitleggen). Do/Don't examples passen bij Vocabulary (parallel aan wordsWeUse/wordsWeAvoid op woord/frase-niveau).

# Decision

Wij consolideren `contentGuidelines`, `writingGuidelines` en `examplePhrases` van `BrandStyleguide` naar `BrandVoiceguide` en verwijderen de Tone of Voice tab uit Brand Styleguide. Tegelijk verwijderen we de migratie-banner "Voice, Tone & Communication Style — moved" uit `BrandPersonalitySection.tsx`. Resultaat: `BrandVoiceguide` is de enige source-of-truth voor merkstem-content.

**Allocatie binnen Brand Voice**:
- `contentGuidelines` + `writingGuidelines` → **Voice DNA tab** (naast `voiceDescription` + `toneDimensions`)
- `examplePhrases` (do/don't) → **Vocabulary tab** (naast `wordsWeUse` + `wordsWeAvoid` + `antiPatterns`)

**Save-for-AI toggles** (parallel aan bestaande `voiceDnaSavedForAi` / `vocabularySavedForAi`):
- `guidelinesSavedForAi Boolean @default(true)` — voor content + writing guidelines
- `examplePhrasesSavedForAi Boolean @default(true)` — voor do/don't examples

## Schema-shape

```prisma
model BrandVoiceguide {
  // ... bestaande velden

  // ─── Voice DNA — uitgebreid ──────────────────
  contentGuidelines String[]    // verhuisd van BrandStyleguide
  writingGuidelines String[]    // verhuisd van BrandStyleguide

  // ─── Vocabulary — uitgebreid ─────────────────
  examplePhrases    Json?       // verhuisd van BrandStyleguide. Shape: { text: string; type: 'do' | 'dont' }[]

  // ─── Save-for-AI — nieuwe toggles ────────────
  guidelinesSavedForAi     Boolean @default(true)
  examplePhrasesSavedForAi Boolean @default(true)
}

model BrandStyleguide {
  // velden verwijderd:
  // contentGuidelines  String[]
  // writingGuidelines  String[]
  // examplePhrases     Json?
  // toneSavedForAi     Boolean
}
```

## Migratie-pad

1. **Stap A** — additieve schema-wijziging: velden toegevoegd aan `BrandVoiceguide`, `BrandStyleguide`-velden blijven. `prisma db push` zonder data-loss
2. **Stap B** — idempotent migratie-script `prisma/scripts/migrate-tone-of-voice-to-voiceguide.ts`:
   - Iterate alle workspaces met niet-leeg Brandstyleguide-veld
   - Upsert `BrandVoiceguide` op workspaceId
   - Conflict-policy: voiceguide-veld leeg → kopieer; al gevuld → log skip met workspaceId + veldnaam
   - 2e run = no-op (al-gemigreerde data wordt geskipt)
3. **Stap C** — code switch: alle ~25 lees-sites lezen uit BrandVoiceguide ipv BrandStyleguide. `voiceContext.guidelines` payload-shape ongewijzigd
4. **Stap D** — UI: Voice DNA + Vocabulary sections krijgen de nieuwe blokken; Tone of Voice tab + ToneOfVoiceSection + `/api/brandstyle/tone-of-voice` route worden verwijderd; moved-banner uit Brand Personality verwijderd
5. **Stap E** — schema-cleanup: `Brandstyleguide`-velden verwijderd, `prisma db push --accept-data-loss` (data zit veilig in voiceguide, accept-data-loss bevestigt cleanup)

# Y-statement

In de context van **Branddock's pre-launch sprint waar de stem van het merk versplinterd zit over BrandStyleguide tone-of-voice (3 velden), BrandVoiceguide (voice DNA + vocabulary + channel-tones + references) en een legacy migratie-banner in BrandPersonality, terwijl AI-prompts uit beide modellen lezen via 25 lees-sites**, facing **een feitelijk onjuiste cross-link claim dat Brand Voice de canonical source zou zijn (terwijl Brandstyleguide-velden in dezelfde AI-context-payload landen) plus onboarding-friction door drie locaties voor één concept**, I decided **`contentGuidelines` + `writingGuidelines` + `examplePhrases` te verhuizen naar BrandVoiceguide (Voice DNA respectievelijk Vocabulary tab), de Tone of Voice tab + moved-banner volledig te verwijderen, en de schema-migratie te organiseren als additief-eerst → data-migratie → reads-switch → schema-cleanup zodat elke stap reversibel is** to achieve **één canonical source-of-truth voor merkstem, identieke `voiceContext.guidelines` payload-shape voor 25 downstream consumers, en een UI waar de gebruiker exact één plek heeft om "hoe het merk klinkt" te beheren**, accepting tradeoff **een meerstapse schema-migratie met data-loss-step aan het einde (gemitigeerd door volgorde + dry-run + idempotent script), tijdelijke schema-dubbeling tijdens de migratie-window (acceptabel — pre-launch, geen externe API-consumers), en het feit dat de BrandPersonality `frameworkData` legacy-velden niet in deze task worden opgeruimd (verschuiven naar follow-up)**.

# Consequences

## Positief
- **Single source-of-truth voor voice**: één locatie (`BrandVoiceguide`) voor alle merkstem-content
- **Heldere mental model voor gebruikers**: Voice DNA tab = hoe het klinkt + guidelines; Vocabulary tab = welke woorden + voorbeelden
- **Cross-link claim wordt waar**: de "Brand Voice is canonical voice source" claim klopt na deze task — AI leest dan daadwerkelijk alleen uit voiceguide
- **F-VAL Pijler 3 (rules) blijft consistent**: guidelines worden uit zelfde model gelezen als waar `contentLocale` op gerouteerd wordt (ADR `2026-05-08-locale-routing-brand-voice`)
- **Reduce surface area in Brand Styleguide**: één tab minder, focus op visuele identity (colors/typography/imagery/design-language)
- **Voorbereiding voor Brandclaw**: post-launch Strategy Analyst node leest één voiceguide-payload voor merkstem-context — geen multi-source merge nodig
- **API-cleanup**: `/api/brandstyle/tone-of-voice` weg, `/api/voiceguide/*` is enige write-pad

## Negatief / tradeoffs
- **Meerstapse schema-migratie**: 5 sub-stappen met data-loss-step aan het einde. Mitigatie: idempotent script + dry-run + git-revert-rollback met data-veiligheid op beide locaties tijdens migratie-window
- **23 lees-sites moeten gelijktijdig switchen**: één commit per logische groep, type-check vangt regressies, maar PR is groot (~25 files). Mitigatie: file-list vooraf vastgelegd in task-file, geen scope-creep
- **PDF brand-kit emit-volgorde**: visueel risico — guidelines verschijnen nu in voice-sectie ipv tone-of-voice-sectie. Mitigatie: smoke-test stap 9 vóór finalize
- **`toneSavedForAi` boolean wordt vervangen door `guidelinesSavedForAi` + `examplePhrasesSavedForAi`** — semantisch gesplitst (twee secties → twee toggles). Geen UI-regressie want toggle wordt opnieuw gerenderd in Voice DNA + Vocabulary tabs
- **Migratie-window dubbele opslag**: gedurende stap A → stap E zitten guidelines op beide locaties. Acceptabel pre-launch, geen externe sync

## Neutraal
- IETF BCP 47 locale-tag (`contentLocale`) raakt deze velden niet — guidelines worden vrij-tekst opgeslagen, locale-routing geldt voor heuristiek-pakketten via F-VAL Pijler 3
- OBSERVED/RECOMMENDED prefix-parsing verhuist 1:1 als utility — geen refactor in deze task
- Save-for-AI toggles blijven default `true` (huidig gedrag op Brandstyleguide.toneSavedForAi was niet default-true; bewuste keuze om guidelines actief mee te nemen in AI-context na consolidatie)

# Alternatives considered

- **Alt A — Status quo (geen migratie, alleen banner weg)**: behoud Tone of Voice tab in Brand Styleguide, alleen verwijder moved-banner uit Brand Personality. Afgewezen — lost niet de onderliggende fragmentatie op; cross-link claim blijft onjuist; gebruiker blijft drie locaties hebben voor "merkstem"

- **Alt B — Nieuwe 5e tab "Guidelines" in Brand Voice**: aparte tab voor alle 3 velden bij elkaar. Afgewezen — voegt tab-druk toe (5 tabs ipv 4); doorbreekt logische clustering (guidelines bij voice-DNA-concept; do/don't bij vocabulary-concept); minder coherent dan optie 1 met user voor-akkoord

- **Alt C — Splitsen guidelines→Voice DNA, examples→References**: do/don't bij writing-samples plaatsen (centroid-bron). Afgewezen — examples zijn instructief ("zo wel/niet schrijven"), writing-samples zijn descriptief ("zo schrijven we"). Verschillende intentie; do/don't past niet bij centroid-embedding-bron (zou centroid-kwaliteit kunnen schaden als do/don't gemixt wordt in writing-samples)

- **Alt D — UI-only consolidatie (data blijft in BrandStyleguide)**: Tone of Voice tab UI verwijderen maar velden in BrandStyleguide laten staan; Voice DNA/Vocabulary tabs lezen brandstyle. Afgewezen — duplicate-data-source anti-pattern; voice-features lezen brandstyle.contentGuidelines wat conceptueel verwarrend is; future Brandclaw Strategy Analyst leest 2 modellen ipv 1; maintainability-cost > migration-cost

- **Alt E — Hard-cutover zonder migratie-script**: drop Brandstyleguide-velden, gebruikers herinvoeren. Afgewezen — workspace `Better Brands` heeft handmatig ingevulde guidelines; data-loss zonder zakelijk argument; pre-launch betekent niet "data weggooien is ok"

# Notes

**Cross-references**:
- `tasks/tone-of-voice-merge-into-brand-voice.md` — uitvoering-task-file met stappen-volgorde + acceptatiecriteria
- ADR `2026-05-06-brand-voice-extraction` — BV-WIRE architectuur waarop deze consolidatie aansluit
- ADR `2026-05-08-locale-routing-brand-voice` — `BrandVoiceguide.contentLocale` per-brand routing; deze ADR consolideert verdere voice-content in zelfde model
- `IMPLEMENTATIEPLAN-BRAND-VOICE.md` (project root) — oorspronkelijk BV-WIRE plan

**Out-of-scope follow-ups**:
- `BrandPersonality.frameworkData.brandVoiceDescription/wordsWeUse/wordsWeAvoid/writingSample` legacy cleanup — apart task (migratie-window is voorbij, removal kan)
- Refactor OBSERVED/RECOMMENDED prefix-parsing naar shared utility (huidig in ToneOfVoiceSection, verhuist 1:1 naar VoiceDnaSection)
- AI-context-builder consolidatie: post-task is `voiceContext` payload-shape ongewijzigd; eventuele rationalisatie van voiceContext-shape valt buiten scope

**Rollback-plan**:
- Stap A-D (additief + reads-switch): `git revert` op betreffende commits; data zit op beide locaties dus geen verlies
- Stap E (schema-cleanup met data-loss-flag): reversibel via reverse migration + restore uit voiceguide (data zit veilig in voiceguide-velden). In worst-case kan migratie-script `--reverse` flag draaien (out-of-scope voor deze task; reversal-script implementeren als rollback nodig blijkt)

**Validatie-strategie**:
- Type-check `npx tsc --noEmit` vangt elke vergeten reference-update
- Migratie-script idempotency-test: 2e run logt `0 actions`
- Smoke-test stap 9 dekt 25 lees-sites indirect via PDF-export + Studio AI-call + F-VAL review

**Memory-update na voltooiing**:
- Update `MEMORY.md` index met deze ADR onder werkstroom "Brand Voice extractie"
- Append shorthand-note in bestaande `brand-voice-future-extraction.md` memory: tone-of-voice nu volledig in BrandVoiceguide
