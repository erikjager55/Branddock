# ADR: Feature-visual pipeline — brief-first prompts + judge-gated kwaliteit

> **Datum**: 2026-06-10
> **Status**: accepted
> **Context-doc**: `docs/audits/2026-06-10-lp-feature-image-diversity.md` (diagnose R1-R9 + jury-proces)
> **Task**: `tasks/lp-feature-image-diversity.md`

## Y-statement

In de context van **LP feature-beelden die homogeen en tekst-irrelevant uitvielen** (Napking: 4× "chef met gekruiste armen"), geconfronteerd met **een gedeelde prescriptieve scrape-staart in elke prompt en een feature-pad dat alle gebouwde kwaliteitsmachinerie omzeilde**, besloten we tot **brief-first prompts (copy-LLM levert per sectie een gestructureerde imageBrief) + server-side prompt-bouw + een judge-gated regeneratiepoort**, en tegen **blind multi-candidate genereren, pgvector-pairwise-checks en source-first library-matching als hoofdas**, om **per sectie een relevant, onderling divers beeld te krijgen voor ~$0,53-0,79/pagina**, accepterend dat **legacy variants zonder brief op een fallback-pad draaien en library-matching een vervolgstap is**.

## Beslissingen

### 1. photographyStyle gesplitst: stijl deelbaar, onderwerp/compositie per-beeld (R1)
`promptFragment` = mood-only; `compositionFragment` apart (alleen single-image contexten — de hero, waar de observed compositie van een echte hero-foto legitiem is); `subjectMatter` → `subjectPool: string[]` (inspiratie, geen commando). Een OBSERVED scrape-beschrijving van één bron-foto mag nooit prescriptief elk gegenereerd beeld sturen.
**Verworpen**: photographyStyle volledig negeren (verliest merk-stijl); LLM-herschrijven op scrape-moment (hoort bij het brandstyle-result-audit-plan, raakt analysis-engine).

### 2. Governance-gate gespiegeld aan brand-context (R5)
`canvas-context` levert photographyStyle alleen nog bij `published && imagerySavedForAi` (exact de brand-context-semantiek: imagery-gate bínnen het published-blok). Ongereviewde scrapes vallen terug op archetype-hints (tier-2 in de prompt-builders).

### 3. imageBrief uit de copy-LLM, gestructureerd (R7)
`{subject, sceneType: object|process|location|detail|person, composition, avoid}` optioneel+nullable op hero + features.items. De copy-LLM heeft de volledige brand/persona-context; het video-pad bewees het patroon ([VISUAL:]-blokken). KRITISCHE REGEL 15 dwingt set-diversiteit op brief-niveau af (≥3 sceneTypes, max 1 person, geen frontale pose).
**Verworpen**: aparte Haiku-derivation-call (extra latency, verliest arc-context); string-brief (niet mechanisch valideerbaar).

### 4. Server-side prompt-bouw in de route (R3)
v2-contract `{features, pageHeadline}`; `buildFeatureVisualPrompts` (sceneType-templates, angle-rotatie-fallback, sibling-differentiatie, per-slot seed). De route is dé seam voor negatives/seeds/judges/persist; client-verbatim prompts maakten dat structureel onbereikbaar. Legacy `{prompts}` één release deprecated.

### 5. Seeds: empirisch geverifieerd effectief (R4)
`scripts/experiments/test-nano-banana-seed.ts`: nano-banana-pro is deterministisch per seed (zelfde seed → identiek beeld; andere seed → andere scène) en honoreert `num_images=2`. Per-index seeds zijn dus een echte diversificatie-laag, geen hoop.

### 6. Kwaliteitspoort: paired G4 + multi-image diversity-judge + budget-capped retry (R3/R4)
- G4 coherence-judge per beeld met **alleen de eigen feature-copy** als contentText (paar-i-vs-i; judge-file ongewijzigd). Base64 uit al-aanwezige bytes (Anthropic url-source kan niet bij localhost).
- Set-diversiteit via **één multi-image Haiku-call** (`feature-set-diversity-judge`, ~$0,005) — **niet pgvector**: G2 embedt aiDescription-tekst, geen pixels; verse fal-outputs zijn geen MediaAsset.
- Deterministische gate `decideFeatureRegenerations` (coherence < 50 ∨ dupe-verliezer; low-coherence > duplicate; cap 2/pagina) — pure functie, unit-gesmoked.
- Gerichte retry via `sharpenFeaturePromptForRetry` + nieuwe seed; coherence heeft géén DIMENSION_REFINE_HINTS-template, dus eigen copy-gedreven aanscherping i.p.v. extractRefineHint.
**Verworpen**: default multi-candidate 2-3× (verdubbelt kosten vóór bewezen baat; `FEATURE_CANDIDATE_COUNT`-haak staat klaar voor een WorkspaceAiConfig quality-mode); volledige 6-dims visual-ai-judge als selector (~$0,04 + 12-15s per kandidaat — te traag/duur voor 4 kleine beelden).

### 7. Negatives werkend gemaakt op modellen zonder native param (R6)
`supportsNegativePrompt`-capability op `FalProvider`; fal-client vouwt de negative als `formatNegativeAsPromptDirective` in de prompt (word-safe gecapt) voor nano-banana; `brandImageryDonts` + `brief.avoid` (userNegations) stromen nu mee op het feature-pad.

### 8. Persist als audit, niet als render-bron (R3-audit)
`DeliverableComponent` per beeld (`variantGroup 'feature-visual:<index>'`, `imagePromptUsed`), fail-soft. De Puck-renderer blijft puckData lezen — components als tweede render-bron zou de orphaned-rows-val van R8 reproduceren. Optionele follow-up: AICallTrace via bestaand `primaryCallTraceId`.

### 9. Clobber-guard voor feature-beelden (R9)
`preserveFeatureVisualsOnSettings` naast `preserveHeroOnSettings` in de studio-PATCH (chokepoint), met titel-gelijkheid als anti-reorder-slot. Nieuw bestand; `hero-visual-preserve.ts` (workstream-owned) onaangeraakt.

### 10. Source-first als opstap, niet als as (R8)
Embedding-backfill-script + golden-set dry-run + `sources`-veld in de response. Library-first matching volgt pas ná (a) gedraaide backfill (huidige dekking 0/521) en (b) afronding browser-verificatie `lp-image-source-wiring`. Cold-start is de universele toestand; "echt-maar-fout beeld is erger dan goed AI-beeld".

## Kosten

| Pad | Per pagina (4 features) |
|---|---|
| Vóór (ongecontroleerd) | $0,52 |
| Nu (judges + worst-case 2 retries) | $0,53-0,79 |
| Quality-mode (2-3 kandidaten, later) | $1,05-1,58 |

## Consequenties

- + Feature-beelden zijn sectie-relevant en onderling divers, met een vangnet dat missers gericht corrigeert i.p.v. blind te hopen.
- + Prompts zijn voortaan auditbaar (`imagePromptUsed`) — de Napking-diagnose vergde reconstructie.
- − De confirm-flow duurt langer (judges + evt. retries) → race-ceiling 60s→120s; Step-3 gap-fill blijft het vangnet.
- − Workspaces die (onbewust) op de ongereviewde scrape-stijl leunden zien hun LP-beelden terugvallen op archetype-stijl tot imagery gereviewd is (gewenst, wel communiceren).
- − Legacy variants zonder imageBrief draaien op het fallback-pad (beter dan voorheen — gesaneerde stijl + angle-rotatie — maar niet brief-niveau) tot regeneratie.
