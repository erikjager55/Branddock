---
id: prompt-audit-fase-3
title: Prompt-audit Fase 3 — schema- en validatie-hygiëne (validateAndCoerce, regen-volgorde, judge-integriteit, ad-runner C7, auditor, admin-routes)
fase: pre-launch
priority: now
effort: ~3 dagen (audit-schatting; parallel uitgevoerd)
owner: claude-code
status: done
created: 2026-06-11
completed: 2026-06-11
related-adr: -
related-spec: docs/audits/2026-06-11-prompt-audit.md
worktree: branddock-feat-prompt-audit
---

# Probleem

Validatie van AI-output is in de hele strategy/judge-laag warn-only of pervers: `validateOrWarn` throwt nooit (malformed data stroomt door naar de UI), het regen-pad doet een strikte `.parse()` vóórdat de lenient normalisatie kan repareren, het hoofdpad normaliseert helemaal niet ("undefined" fasenamen als letterlijke prompt-eis), `normalizeRubricResponse` accepteert alles (malformed judge-JSON → stil composite 50 op de 45%-pijler), de ad-quality runner laadt componenten met een drievoudig fout datacontract zodat alle 6 judges altijd lege content beoordelen (C7, CRITICAL — scores betekenisloos én gecachet), de alignment-auditor-output is ongevalideerd (fout enum crasht de audit-view permanent) en de admin-prompt-routes accepteren elke payload zonder Zod of caps.

# Voorstel

Zes file-disjuncte clusters: (V1) strategy-chain — `validateAndCoerce`-upgrade + regen-volgorde + hoofdpad-normalisatie + thinking-budget bovenop + creative-critic schaal-defensie + confidence-herverdeling; (V2) assetPlanResponseSchema contentTypeInputs openen; (V3) judge-integriteit (rubric echt rejecten + critic-schaal in prompt); (V4) ad-runner C7 datacontract + cache-zelfheling verifiëren; (V5) auditor-output valideren + UI-fallback; (V6) admin-routes Zod + size/bounds-caps. Daarna 2-reviewer pass + gates.

# Acceptatiecriteria

- [x] `validateOrWarn` is opgevolgd door een coerce-dan-enforce variant: Number()-coercion voor string-getallen, toDisplayString voor objects-waar-strings, en bij onherstelbaar falen een echte error i.p.v. raw passthrough — bestaande call-sites (incl. `brief-data-mapper.ts`) geverifieerd
- [x] Regen-pad: normalisatie draait vóór de strikte parse — laag-regeneratie faalt niet meer op precies de deviaties die de normalizer moest opvangen
- [x] Hoofdpad: `normalizeArchitectureLayer` + truthy-filter op phaseNames + EXACT-veldnamen-instructieblok — geen "undefined" fasenamen meer in de asset-planner prompt
- [x] buildConceptDrivenStrategy: thinking-budget komt bovenop het output-budget (geen ~4k netto meer bij deliberate rigor)
- [x] Creative-critic: schaal 0-100 expliciet in prompt + defensieve ≤10→×10 normalisatie vóór de gate
- [x] Blueprint-confidence niet meer structureel -20% door de dode PersonaValidation-stap (gewicht herverdeeld óf stap gereactiveerd — beargumenteerde keuze)
- [x] assetPlanResponseSchema: contentTypeInputs kan de gevraagde type-specifieke velden daadwerkelijk dragen + log-check op non-empty rate
- [x] normalizeRubricResponse rejectt echt: <4 aanwezige+numerieke dimensies → judge-fail pad (geen stil composite 50); callAnthropicJudge throwt bij ontbrekend text-block
- [x] C7: ad-runner laadt echte content (variantIndex + componentType-filter + variantGroup-key), guard op lege groups → AdQualityError; bestaande lege-content-scores hergescoord of aantoonbaar zelf-helend via contentHash
- [x] Auditor-output runtime-gevalideerd (assetAssessments-fallback, enum-normalisatie+whitelist, Number.isFinite) + AuditImprovementList rendert onbekende enum-waarden met MEDIUM-fallback i.p.v. crash
- [x] Admin exploration-configs routes: Zod-schema, size-caps op prompt-velden, bounds op temperature/maxTokens
- [x] `npx tsc --noEmit` 0 errors · eslint 0 errors op gewijzigde files · `smoke:prompt-contracts` 235/235 blijft groen · relevante smokes groen

# Bestanden die ik aanraak (file-ownership per cluster)

- **V1**: `src/lib/campaigns/strategy-chain.ts`
- **V2**: `src/lib/campaigns/strategy-blueprint.types.ts`
- **V3**: `src/lib/brand-fidelity/g-eval-rubric.ts` + `src/lib/ai/prompts/campaign-strategy-agents.ts`
- **V4**: `src/lib/ad-validation/runner.ts` (+ evt. klein verificatie-script onder `scripts/dev/`)
- **V5**: `src/lib/alignment/auditor.ts` + `src/components/brand-alignment/AuditImprovementList.tsx`
- **V6**: `src/app/api/admin/exploration-configs/route.ts` + `src/app/api/admin/exploration-configs/[id]/route.ts`

# Bestanden die ik NIET aanraak

- Alle ongecommitte Fase 2-files (component-templates-fallback, canvas-context, canvas-orchestrator, prompt-templates, sanitizer, variant-to-puck-data, previews, deliverable-types, prompt-version-registry, prompt-contracts) — disjuncte sets, geen merge-verwarring
- `src/lib/ai/exploration/exploration-llm.ts` en het exploration-promptsysteem — Fase 5
- Taal/locale-werk — Fase 4

# Smoke test plan

1. `npx tsc --noEmit` + eslint op gewijzigde files
2. `npm run smoke:prompt-contracts` blijft 235/235
3. Bestaande suites: studio + web-page-builder + ad-creative-validation
4. Gericht: validateAndCoerce-gedrag unit-getest via `npx tsx` (string-nummer, object-waar-string, onherstelbaar); ad-runner met psql read-check op een echt ad-deliverable
5. 2-subagent review-pass over de Fase 3-diff

# Risico's

- **validateOrWarn-gedragsverandering** raakt 9 call-sites in strategy-chain + brief-data-mapper — coerce-first houdt de happy-path identiek; alleen onherstelbaar-malformed gaat van stil-doorstromen naar duidelijke fout (dat is het doel). Reviewer checkt elke call-site.
- **normalizeRubricResponse rejecten** maakt judge-fails zichtbaar die nu stil composite 50 waren — F-VAL-uitkomsten kunnen verschuiven; degraded-pad moet judge-weight herverdelen, niet de hele score killen.
- **Ad-runner fix** verandert wat judges zien: scores gaan van betekenisloos naar echt — bestaande gecachte scores moeten aantoonbaar vervangen worden (contentHash-mechanisme verifiëren).

# Out of scope

- Fase 4 (taal/jargon/context-governance) en Fase 5 (configuratie-éénwording, temperature-guard-centralisatie)
- PersonaValidation-stap volledig herbouwen (alleen als de gewicht-herverdeling aantoonbaar slechter is)

# Notes

- Bron: `docs/audits/2026-06-11-prompt-audit.md` §4 T3/T8 + §5 Fase 3; data-JSON voor file:line.
- Fase 0+1 = commit `1039f0e2`; Fase 2 staat ongecommit in deze worktree (bewust — merge/commit volgt later op gebruikersinitiatief).
- Let op: de truncatie-throws uit Fase 1 maken het thinking-budget-defect (V1d) urgenter — wat eerder stil comprimeerde, throwt nu.

## Uitvoering 2026-06-11

- **Gebouwd via 6 parallelle clusters (V1-V6) + 2-reviewer pass + 12 review-fixes door orchestrator.** Extra files boven de declared ownership (gerapporteerd + akkoord): `confidence-calculator.ts` (gewicht-herverdeling vereiste de calculator zelf), `composition-engine.ts` (degraded-judge-pad), `BriefingReviewView.tsx`/`AuditAssetTable.tsx` (UI-guards), `regenerate/route.ts` (error-doorgifte), `judge-dispatcher.ts` (V3, gerapporteerd).
- **Review-MAJORs verwerkt**: (1) `budgetWithThinking` kreeg een 600s-timeoutvloer bij thinking (de formule mocht de oude SDK-default nooit verkórten) + een OpenAI-reasoning-allowance (12k high / 6k medium — reasoning-tokens tellen binnen max_completion_tokens); (2) `parseRegeneratedFullVariant` substitueert geen lege architecture-default meer — ontbrekende architecture faalt nu in het enforce-pad i.p.v. stil de opgeslagen journey te wissen.
- **Reviewer-suggestie overgenomen**: `budgetWithThinking` ook toegepast op de 5 overige thinking-sites (foundation 16k output, lens/leap/critic/defense 8k output — dubbel het oude worst-case netto) zodat het defect-profiel bestand-breed weg is.
- **Judge-fail-beleid (sign-off-punt uit review)**: gekozen voor het degraded-pad conform de risico-richtlijn — `composition-engine` vangt judge-failures, herverdeelt de weging via het bestaande skipJudge-mechanisme en zet `judgeDegraded` (foutmelding) op het resultaat. Externe reviews behouden dus een style+rules-score i.p.v. een 500.
- **C7 cache-zelfheling**: V4 verifieerde dat contentHash over de geladen content gaat — de fix levert nieuwe content → nieuwe hash → automatische herscore; oude lege-scores zijn onschadelijk verweesd. Live DB-check: nieuwe query levert >0 rijen voor bestaande ad-deliverables.
- **PUT-leniency echt gemaakt**: model-whitelist alleen bij daadwerkelijke wijziging van het veld; ongewijzigde legacy-waarden blijven opslaanbaar (model-deprecatie lockt configs niet meer).
- **Gates**: tsc 0 · eslint 0 errors (warnings pre-existing, geverifieerd tegen origin/main) · prompt-contracts 235/235 · web-page-builder 68/68 · ad-creative-validation 15/15 · studio 19×[OK].
- **Follow-up tickets (bewust niet hier)**: (1) `ctx.groups.get('image')` is structureel leeg voor 4 ad-judge-consumers — image-direction uit `imagePromptUsed`/`visualBrief` laden of de dimensie uit de judge-prompts halen (zelfde klasse als C7, één laag dieper); (2) `ImpactBadge.tsx:10` zelfde unguarded-lookup-patroon op persona-data; (3) sequence-kaarten-mock voor EmailPreview (uit Fase 2).
