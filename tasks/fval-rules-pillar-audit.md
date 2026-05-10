---
id: fval-rules-pillar-audit
title: F-VAL rules-pijler audit — mapper-categories + NL-NL heuristic-pack + stem-variant sync
fase: pre-launch
priority: now
effort: 1 dag
owner: claude-code
status: in-progress
created: 2026-05-10
completed: -
related-adr: 2026-05-08-fval-output-schema-bevindingen
related-spec: -
worktree: -
---

# Probleem

Visual smoke vandaag op LINFI workspace onthulde drie aparte zwakheden in F-VAL's rules-pijler:

1. **Mapper-quirk**: `inferCategory` in `src/lib/brand-fidelity/violation-to-finding.ts:67-87` gebruikt alleen ruleId-prefix parsing. BrandRule violations (niet-heuristic) vallen door naar `FindingCategory.TERMINOLOGY` ongeacht hun `ruleType`. Insights tab toont 16/16 LINFI findings allemaal in TERMINOLOGY — `BUSINESS`, `STYLE`, etc. categorieën blijven ongebruikt voor BrandRule-violations.

2. **Heuristic-pack gap (NL-NL)**: fluff-tekst met "passie/kwaliteit/innovatie" leverde 0 findings op via `runFidelityForExternalContent`. Audit-script bevestigt: rule-evaluator runt 36 rules op LINFI maar 0 violations match deze tekst. Reden:
   - "passie" zit in **geen** NL-NL heuristic-pack (`gepassioneerd` wel in vague-quality, maar de stam niet)
   - "kwaliteit" zit in **geen** pack
   - "innovatie" zit niet als variant — alleen "innovatief" in corporate-fluff

3. **Stem-variant gap in sync**: `syncVoiceguideToRules` in `src/lib/brand-fidelity/brand-rule-sync.ts:86-146` maakt één FORBIDDEN_WORD BrandRule per `wordsWeAvoid` entry. LINFI heeft "innovatief" in wordsWeAvoid, maar fluff-text bevat "innovatie" (zonder `f`). Word-boundary regex `\binnovatief\b` matcht niet "innovatie". Voor NL morfologie is dit een veelvoorkomende mismatch.

Net effect: LINFI's eigen anti-pattern-content scoort weliswaar laag (~63/100 via judge-pijler) maar de **rules-pijler signaleert niets**, en de findings-categorisatie verbergt rule-type-context. Alle drie Δ-1 surfaces (Tab 3, Brand Assistant, PublishGate) zijn impacted — hoe meer signal de rules-pijler oppakt, hoe rijker de findings-output.

# Voorstel

Drie incrementele wijzigingen, elk onafhankelijk testbaar:

1. **`inferCategory` mapper-extend** — voor BrandRule violations (niet-heuristic) gebruik `v.ruleType`:
   - `REQUIRED_PHRASE` → `FindingCategory.BUSINESS` (verplichte claims/positionering)
   - `STYLE_LIMIT` → `FindingCategory.STYLE` (sentence-length, bullet-counts)
   - `PILLAR_REFERENCE` → `FindingCategory.BUSINESS` (pillar-keywords missing)
   - `FORBIDDEN_WORD` → blijft `TERMINOLOGY` (geen eenduidige category zonder schema-extend)

2. **NL-NL heuristic-pack uitbreiding** — voeg toe in `src/lib/brand-fidelity/heuristics/nl-NL/`:
   - `vague-quality.ts`: "passie", "kwaliteit", "passioneel" (gestelden van "gepassioneerd" + ontbrekende kern-cliché's)
   - `corporate-fluff.ts`: "innovatie", "innovaties" (varianten van "innovatief")
   - Severity: `warning` (always-flag) — consistent met bestaande entries

3. **Stem-variant generation in sync** — nieuwe helper `expandStemVariants(word: string): string[]` in `brand-rule-sync.ts`. Per input-word genereert veel-voorkomende NL morfologische varianten:
   - `endswith('ief')` (innovatief) → ook stem (-ie) + -ieve + -ieves
   - `endswith('eel')` (passioneel) → ook -ele + stem
   - `endswith('iek')` (uniek) → ook -ieke + -ieken
   - `endswith('isch')` → ook -ische + -isme
   - Default: word + word+e + word+en (NL plurals/conjugations)
   - Beide `syncVoiceguideToRules` en `syncWordsAvoidToRules` (legacy) gebruiken expand → 1 input-word levert N FORBIDDEN_WORD rules
   - Source-marker blijft hetzelfde; `pattern` is de variant zelf zodat rule-compiler word-boundary check normaal werkt

# Acceptatiecriteria

- [ ] `inferCategory` in `violation-to-finding.ts` checkt `v.ruleType` als prefix niet `heuristic:`; mapping zoals beschreven; geschiedenis-comment uitgebreid
- [ ] NL-NL heuristic-pack: "passie" + "kwaliteit" als entries in `vague-quality.ts`; "innovatie" + "innovaties" in `corporate-fluff.ts`
- [ ] `expandStemVariants(word)` helper in `brand-rule-sync.ts` met deterministische suffix-rules (≥5 NL-suffix-patronen); pure-functie, side-effect-free
- [ ] `syncVoiceguideToRules` + `syncWordsAvoidToRules` gebruiken `expandStemVariants` → 1 word levert N rules in DB
- [ ] Re-sync LINFI's BrandVoiceguide.wordsWeAvoid via API + verifieer dat "innovatief" → ≥3 BrandRules ("innovatief", "innovatie", "innovatieve")
- [ ] Audit-script `scripts/_audit-rules-pillar.ts` re-run op LINFI fluff-tekst → ≥3 violations voor "innovatie", "innovaties" + "passie", "kwaliteit" via heuristic-pack
- [ ] `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors in nieuwe/aangeraakte files
- [ ] Smoke-test `scripts/smoke-tests/heuristic-stem-variants.ts` (nieuw) — verifieer expandStemVariants output voor 10+ NL-input-words
- [ ] Manual UX-smoke: paste fluff-tekst in Brand Assistant → krijg ReviewFindingsCard met findings (>0); Insights tab toont meer category-spread (niet meer 100% TERMINOLOGY)

# Bestanden die ik aanraak

**Server**:
- `src/lib/brand-fidelity/violation-to-finding.ts` (modify) — `inferCategory` extend met ruleType-branch
- `src/lib/brand-fidelity/brand-rule-sync.ts` (modify) — `expandStemVariants` helper + integratie in beide sync-functies
- `src/lib/brand-fidelity/heuristics/nl-NL/vague-quality.ts` (modify) — "passie", "kwaliteit" toevoegen
- `src/lib/brand-fidelity/heuristics/nl-NL/corporate-fluff.ts` (modify) — "innovatie", "innovaties" toevoegen

**Tests / Audit**:
- `scripts/smoke-tests/heuristic-stem-variants.ts` (nieuw) — unit-test voor `expandStemVariants` op 10+ NL-input-words
- `scripts/_audit-rules-pillar.ts` (tijdelijk, dev-helper) — restore voor before/after compare; verwijder na audit

**Documentatie**:
- `tasks/fval-rules-pillar-audit.md` (deze)
- `docs/changelog.md` (entry #248 bij task-finalize)

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` — geen schema-wijziging (BrandRule.category als nieuwe field zou eenduidig FORBIDDEN_WORD-categorisatie geven, maar buiten scope; overweeg apart wanneer pilot-data dat motiveert)
- `src/lib/brand-fidelity/composition-engine.ts` — engine-flow ongewijzigd
- `src/lib/brand-fidelity/rule-compiler.ts` — compile-logic ongewijzigd; sync produceert nu meer rules, compiler doet zelfde
- `src/lib/brand-fidelity/heuristics/{en-GB,de-DE,nl-BE}/` — alleen NL-NL pack uitgebreid (LINFI-impact is direct meetbaar; andere locales kunnen later op basis van pilot-data)
- BrandVoiceguide UI / API — niet aanraken; de re-sync gebeurt automatisch wanneer de wordsWeAvoid array via PATCH wordt gewijzigd; voor LINFI doe ik handmatig een force-resync via dev-helper

# Smoke test plan

**Server-side smoke** (`npm run smoke:heuristic-stem-variants` na seed):

1. `expandStemVariants("innovatief")` → ["innovatief", "innovatie", "innovatieve", "innovaties"] (suffix-ief regel)
2. `expandStemVariants("passioneel")` → ["passioneel", "passionele", "passioneles"] (suffix-eel)
3. `expandStemVariants("uniek")` → ["uniek", "unieke", "unieken"] (suffix-iek)
4. `expandStemVariants("automatisch")` → ["automatisch", "automatische", "automatisme"] (suffix-isch)
5. `expandStemVariants("kwaliteit")` → ["kwaliteit", "kwaliteite", "kwaliteiten"] (default plurals)
6. Empty-input + special-chars edge-cases

**Audit-script** (manual):

1. Run before-state: `_audit-rules-pillar.ts` → 0 violations op fluff-tekst
2. Run sync-trigger op LINFI workspace via dev-script (resync wordsWeAvoid)
3. Run after-state: ≥3 violations (innovatie via stem-variant, passie via heuristic, kwaliteit via heuristic)
4. Verify category-spread: niet 100% TERMINOLOGY meer

**Manual UX-smoke**:

1. Brand Assistant: plak fluff-tekst → ReviewFindingsCard met >0 findings + meer category-mix
2. Insights tab: top-categorieën niet meer alleen TERMINOLOGY; trend kan veranderen

# Risico's

- **Stem-variant over-flagging**: te aggressieve suffix-rules genereren false-positives ("innovatie" → "innov" → matcht "innovatief" recursief). **Mitigatie**: deterministische suffix-rules met minimum-stem-length checks; smoke-test op 10+ inputs.
- **NL-NL heuristic-pack expansie raakt andere workspaces**: alle workspaces met content-locale=nl-NL profiteren (of lijden) van de uitbreiding. **Mitigatie**: alleen toevoegen woorden die universeel als "vague-quality" gelden binnen NL-business-content (niet domain-specifiek); eerst Insights data observeren na deploy voor signal-vs-noise verhouding.
- **Re-sync van bestaande workspaces**: bij deploy moet bestaande wordsWeAvoid opnieuw gesynced worden om de stem-varianten te krijgen. **Mitigatie**: of automatische backfill-script in deploy-pad, of manual trigger per workspace.
- **mapper category-extend breaking analytics**: Insights tab toont nu BUSINESS/STYLE waar voorheen alles TERMINOLOGY was — dashboard-vergelijking pre-vs-post is niet apples-to-apples. **Mitigatie**: documenteer in task-Notes; pilot-data is alfa, vergelijking valt onder verwacht-evolutionair gedrag.

# Out of scope

- BrandRule.category schema-field voor eenduidige FORBIDDEN_WORD-categorisatie — separate task
- Multi-locale heuristic-pack expansion (en-GB, de-DE, nl-BE) — pilot eerst NL-NL evalueren
- Lemmatizer-library (compromis NL-stemmer als `node-stemmer`) — over-engineering voor MVP; suffix-heuristics dekken 80% case
- Automatische stem-variant suggesties in BrandVoiceguide UI — Δ-2 follow-up
- Deploy-time backfill-cron voor bestaande workspaces — separate ops-task
- Severity-tuning per heuristic-entry — bestaande severity-mapping (warning-default) volstaat

# Notes

**Phase -1 Gates resultaat**:
- Simplicity Gate: PASS (4 modify + 1 nieuw smoke-script, geen abstracties, deterministische rules)
- Anti-Abstraction Gate: PASS (suffix-rules direct in pure functie; geen wrapper-service)
- Integration-First Gate: PASS (mapper en sync hebben bestaande contracts; smoke-script toont functie-input/output direct)

**ADR-noodzaak**: NEE
- Geen schema-wijziging
- Geen nieuwe `src/lib/<module>/` directory
- Geen library-install
- Patroon: extends bestaande sync + mapper functions

**Cross-links**:
- Surface C/D/E tasks in `tasks/done/`
- Δ-1 cleanup-pack: `tasks/done/delta-1-cleanup-pack.md`
- Brand Alignment Insights: `tasks/done/brand-alignment-insights-tab.md`
- ADR-1 BrandReviewFinding: `docs/adr/2026-05-08-fval-output-schema-bevindingen.md`
- Pattern-precedent voor heuristic-pack augmentation: `src/lib/brand-fidelity/heuristics/nl-NL/corporate-fluff.ts`
