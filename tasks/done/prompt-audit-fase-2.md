---
id: prompt-audit-fase-2
title: Prompt-audit Fase 2 — component-contract-laag dichten (17 types, sequences, website-types, contract-CI)
fase: pre-launch
priority: now
effort: 4-5 dagen (audit-schatting; parallel uitgevoerd)
owner: claude-code
status: done
created: 2026-06-11
completed: 2026-06-11
related-adr: -
related-spec: docs/audits/2026-06-11-prompt-audit.md
worktree: branddock-feat-prompt-audit
---

# Probleem

De grootste CRITICAL-cluster uit de prompt-audit: 17+ content-types (4 sales, 7 pr-hr, 6 video) hebben geen component-groepen, waardoor de canvas-prompt letterlijk *"components array MUST contain exactly 0 entries"* eist terwijl de systemprompt een compleet document eist — het model verzint structuur of levert niets (vrijwel zeker de geteste kapotte prompt, C3). Daarnaast: email-sequences van 5-7 mails in één 5.000-char body-veld (C4), faq/comparison/microsite in landing-page-groepen geperst (C5), linkedin-carousel resolved naar 0 groepen, en tiktok-script verliest zijn `isScriptedScene` aan een medium-row die van de fallback wint.

# Voorstel

Fallback-registry uitbreiden met alle ontbrekende types (groepen afgeleid uit de template-skeletten + registry requiredSections), een `FALLBACK_FIRST_TYPES`-precedence zodat fallback wint van een te generieke medium-row (tiktok/faq/comparison/microsite/sequences), een harde guard op `textGroups.length === 0`, prompts in email.ts/website.ts/pr-hr.ts/sales.ts/video-audio.ts in lijn brengen met het per-group contract, het silent-iterate voor multi-group deliverables herstellen (per-group i.p.v. blob), en een deterministische contract-consistentie-test als CI-vangnet zodat deze defect-klasse niet terugkomt.

# Acceptatiecriteria

- [x] Alle types in `CONTENT_TYPE_TO_MEDIUM` + TEMPLATE_REGISTRY resolven naar ≥1 component-groep — fallback-registry 7→32 entries (geen "exactly 0 entries" meer mogelijk)
- [x] Guard: bij 0 text-groups gooit buildCanvasPrompt een duidelijke Error (structured payload); error-pad naar SSE/bulk-progress geverifieerd, geen silent catch
- [x] `FALLBACK_FIRST_TYPES` (7 types): tiktok-script heeft weer `isScriptedScene` (contract-test assert); faq/comparison/microsite/sequences gebruiken eigen groepen
- [x] welcome/nurture: per-email groepen (email-N-subject 60 / email-N-body 2500, 1-3 required); re-engagement-email schoon single-email contract
- [x] faq-page: intro + question/answer-paren + closing-cta; comparison-page: intro/matrix/differentiators/switching-guide(required)/summary/closing-cta; microsite: page-1..5; linkedin-carousel: cover/content-slides/cta-slide/caption/hashtags — *naam-beslissing: `closing-cta` i.p.v. `cta` (ontwijkt 48-char button-rule + clamp)*
- [x] Silent auto-iterate hersteld voor multi-group: per-group rewrite ná persistVariants (Step 5.2), id+variantGroup+variantIndex-gescoped updateMany, scripted-scene groepen geskipt — *bijvangst: oude positie vóór persist betekende dat het iter-resultaat door persistVariants werd weggevaagd (latent sinds F24)*
- [x] Prompts email/website/pr-hr/sales/video-audio + social-media (carousel) spreken het per-group contract niet meer tegen; PROMPT_VERSION 2.0.0 + registry gesynct
- [x] `smoke:prompt-contracts` (235 checks): groep-dekking, type-ID-consistentie, FALLBACK_FIRST-asserts, resolved-template verificatie voor press-release/welcome-sequence/faq-page/tiktok-script, PROMPT_VERSIONS-drift-detectie — **235/235 PASS**
- [x] `npx tsc --noEmit` 0 errors · eslint 0 errors op 16 gewijzigde files (4 pre-existing warnings) · smokes: web-page-builder 68/68, longform-tweaks 9/9, studio 19×[OK], structured-tweaks 12/13 (de ene fail = pre-existing live-LLM slide-title-check, faalt ook op origin/main)

# Bestanden die ik aanraak (file-ownership per cluster)

- **T1**: `src/lib/ai/component-templates-fallback.ts` + `src/lib/ai/canvas-context.ts`
- **T2**: `src/lib/ai/canvas-orchestrator.ts`
- **T3**: `src/lib/studio/prompt-templates/email.ts`
- **T4**: `src/lib/studio/prompt-templates/website.ts`
- **T5**: `src/lib/studio/prompt-templates/pr-hr.ts`, `sales.ts`, `video-audio.ts`
- **T6**: nieuw `scripts/smoke-tests/prompt-contracts.ts` + `package.json` (alleen scripts-regel)

# Bestanden die ik NIET aanraak

- `prisma/seed.ts` — fallback-registry is de code-source-of-truth; geen DB-seeding nodig (werkt ook voor verse installs)
- `src/lib/studio/component-registry.ts` — bestaande groupTypes volstaan; lezen mag
- Preview-componenten — generieke rendering verifiëren (read-only), dedicated previews zijn follow-up indien nodig
- Fase 3-5 scope (validatie-hygiëne, taal/jargon, exploration-éénwording)

# Smoke test plan

1. `npx tsc --noEmit` + eslint op gewijzigde files
2. Nieuwe `npm run smoke:prompt-contracts` → 0 failures
3. Bestaande suites: web-page-builder, structured-tweaks, longform-tweaks, studio (live-pad)
4. Gerichte verificatie: buildCanvasPrompt voor press-release/welcome-sequence/faq-page/tiktok-script bevat de nieuwe groepen + geen "exactly 0 entries"
5. 2-subagent review-pass over de volledige diff

# Risico's

- **Nieuwe groepen zonder dedicated preview-slot** — generieke text-preview moet ze tonen; agents verifiëren read-only hoe Step 3 onbekende groepen rendert en rapporteren gaten.
- **FALLBACK_FIRST verandert bestaand gedrag** voor types met een medium-row (tiktok, sequences, website-types) — bewust: die rows waren juist het defect. Bestaande deliverables houden hun opgeslagen componenten; alleen nieuwe generaties krijgen het nieuwe contract.
- **Per-group silent-iterate** raakt het pad dat in Fase 0 bewust op skip is gezet — de variantIndex/groupType-scoped persist moet de clobber-les (gotcha 2026-05-17) respecteren.

# Out of scope

- Dedicated previews per nieuw type (alleen gap-rapportage)
- emailCount/pageCount user-settings bedraden (settings-bestand heeft nul importers — apart op te ruimen, Fase 5)
- Fase 3-5

# Notes

- Bron: `docs/audits/2026-06-11-prompt-audit.md` §3 C3/C4/C5 + §4 T2 + §5 Fase 2; data-JSON voor file:line.
- Fase 0+1 gecommit als `1039f0e2` op deze branch.

## Uitvoering 2026-06-11

- **Gebouwd via 6 parallelle clusters (T1-T6) + 2-reviewer pass + fix-ronde (6 fixers) + 3 directe fixes.** Review vond 13 unieke issues (6 MAJOR), alle verwerkt — o.a.: contract-caps vs globale cta-rule/clamp (→ `closing-cta`-hernoeming), "exactly N entries" telde optionele groepen mee (→ required-vs-optional split met fallback bij 0 required), deliverable-types constraints gereconcilieerd (18 types), Step 3 Puck-mapping contract-bewust (faq answer-zip, microsite page-concat), scripted-scene-skip in silent-iter, PROMPT_VERSIONS gesynct + drift-assert in CI-test.
- **requiresCTA-flip opgevangen**: exact-match `includes('cta')` op requiredSections → substring-match + required fallback-groep met cta-naam (closing-cta/cta-slide blijven gegate; welcome/nurture bewust false — per-email CTA's zijn niet group-gatebaar).
- **Eerste run sneuvelde op de sessie-limiet** (8 agents); halve T3/T4-edits gerevert vóór de herstart — geen vervuiling.
- **Preview-gaps (bewuste follow-ups, geen blockers)**: EmailPreview rendert sequences als platte additional-secties (sequence-kaarten-mock = follow-up); LinkedInCarouselPreview slide-cards; question-N/answer-N/page-N hebben geen dedicated Puck-slots maar renderen via de contract-extractie. Pre-existing quirk: buildMicrositeTemplate rendert defaultRichText 2× (was al zo).
- **Open voor browser-smoke (na merge)**: generatie van press-release / welcome-sequence / faq-page / tiktok-script end-to-end in de UI bekijken — het contract is deterministisch geverifieerd, de rendering verdient een menselijke blik.
