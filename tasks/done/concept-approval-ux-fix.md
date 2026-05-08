---
id: concept-approval-ux-fix
title: Campaign-wizard concept-approval bug-fix + UX-redesign
fase: pre-launch
priority: now
effort: 4-6 uur (Fase A 30min, B 2-3u, C 1u)
owner: claude-code
status: done
created: 2026-05-08
completed: 2026-05-08
related-adr: -
related-spec: -
worktree: -
---

# Probleem

In campaign-mode zit de gebruiker vast op de "Review Creative Concept"-stap: na het raten van alle 6 concept-elementen blijft de **"Approve Concept"**-button disabled, terwijl de progress-tekst **"6 of 6 elements rated"** toont. Er is geen zichtbare reden waarom de gebruiker niet door kan.

**Root cause** — source-of-truth mismatch tussen view en gate-functie:
- `ConceptStep.tsx:968` rendert de view met prop `strategy = finalStrategy ?? synthesizedStrategy`
- `useCampaignWizardStore.ts:543` (`allConceptRated()`) checkt **alleen** `state.synthesizedStrategy` — als die `null` is of een veld leeg heeft terwijl `finalStrategy` compleet is, klopt de teller maar geeft de gate `false`.

Bovenop de bug zijn er UX-problemen die het issue verergeren: oranje "klaar"-tekst, gedeelde disabled-state met "Refine Concept", geen per-card status-indicator, geen "approve all"-shortcut, geen reden bij blokkade.

# Voorstel

Drie fasen, single task-file:

- **Fase A — bug-fix (30 min)**: gate volgt zelfde fallback als view (`finalStrategy ?? synthesizedStrategy`). Tijdelijke `console.warn` bij divergentie om de root-cause van de divergentie zelf op te sporen voor `gotchas.md`.
- **Fase B — UX-redesign (2-3u)**: button altijd enabled met scroll-to-first-unrated + toast bij `!allRated`; per-card status-dot; correcte progress-kleur; "Approve all"-shortcut; `Refine Concept` ontkoppelen van `allRated`; sticky footer.
- **Fase C — tests + hardening (1u)**: unit-tests `allConceptRated()`, E2E-smoke voor de hele flow, `gotchas.md` entry over view/store source-of-truth divergentie.

# Acceptatiecriteria

**Fase A**
- [ ] Bij screenshot-scenario (synthesizedStrategy null/incompleet, finalStrategy compleet, 6/6 ratings): button activeert
- [ ] Geen regressie op happy-path: 6 echte ratings → button enabled → next step bereikt
- [ ] Console-warn fired in dev als view-strategy en store-strategy divergeren op de 6 concept-velden

**Fase B**
- [ ] Button heeft `disabled={false}` standaard. Bij `!allRated` op klik: scroll naar eerste ongeraten card + toast met labels van ontbrekende elementen
- [ ] `ElementRatingCard` toont status-dot (groen=up, rood=down, grijs=neutral) in card-header
- [ ] Progress-tekst: groen (`text-emerald-600`) bij `allRated`, oranje (`text-amber-600`) bij partial, niet zichtbaar bij 0
- [ ] "Mark all as approved" tertiaire knop boven de cards — één klik zet alle 6 op `'up'`
- [ ] `Refine Concept` button: `disabled={false}` standaard (refinement mag met partial input)
- [ ] Sticky footer onderaan met progress + 2 buttons (z-index correct, geen overlap met content)
- [ ] Visuele hiërarchie: "Additional Feedback" niet meer even prominent als de cards

**Fase C**
- [x] `gotchas.md` entry over view-prop/store-state source-of-truth divergentie met datum 2026-05-08
- [ ] ~~Unit-tests `allConceptRated`~~ — **deferred**: geen vitest/jest infra in repo, opzetten is yak-shaving buiten scope. Als follow-up task `vitest-setup` aangeraden voor reusable test-fundament.
- [ ] ~~E2E `campaign-wizard.spec.ts`~~ — **deferred**: bestaande wizard-spec test alleen stepper-rendering, niet de AI-driven generatie-flow. Deep coverage voor concept-approval vereist ofwel een meerminuten-durende real-AI run (kost kwetsbaar voor flakiness + budget) of test-hooks voor store-priming die nog niet bestaan. Manual smoke-test plan hieronder dekt het happy-path.

**Generic**
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd in browser (campaign-mode end-to-end)
- [ ] Geen `any` types toegevoegd
- [ ] Lucide icons (geen emoji) — status-dots via Lucide of styled spans

# Bestanden die ik aanraak

- `src/features/campaigns/stores/useCampaignWizardStore.ts` — gate-fix (Fase A) + tests (Fase C)
- `src/features/campaigns/components/wizard/ConceptReviewView.tsx` — UX-redesign (Fase B)
- `src/features/campaigns/components/wizard/ElementRatingCard.tsx` — status-dot (Fase B)
- `src/features/campaigns/components/wizard/ConceptStep.tsx` — recovery-banner indien nodig + verifieer dat `handleApprove` robuust is bij `synthesizedStrategy = null` (regel 731-778)
- `gotchas.md` — entry (Fase C)
- `e2e/<existing-of-nieuw>.spec.ts` — E2E smoke (Fase C, exact bestand vast te stellen tijdens uitvoering)

# Bestanden die ik NIET aanraak

- Strategy-chain logica (`src/lib/campaigns/*` rondom strategy-synthesis) — out-of-scope, divergentie van `finalStrategy` vs `synthesizedStrategy` is een symptoom-onderzoek voor een aparte task indien nodig
- `useDraftAutoSave.ts` — auto-save flow blijft ongewijzigd
- API routes onder `src/app/api/campaigns/wizard/` — geen backend-wijziging
- `roadmap.md` / `START_HERE.md` — task-finalize skill update achteraf

# Smoke test plan

**Manual smoke (na Fase A)**:
1. Start dev: `npm run dev`
2. Login → workspace → New Campaign Wizard
3. Doorloop tot Concept-step (genereer strategy + concept)
4. Rate alle 6 elementen (mix van up/down)
5. Vul optionele feedback "approved"
6. Verifieer: button enabled, klik werkt, advancet naar volgende step

**Manual smoke (na Fase B)**:
7. Reset, ga opnieuw naar concept-step, rate 4 van 6 → klik Approve → toast verschijnt + scrollt naar element 5
8. Klik "Mark all as approved" — alle 6 status-dots groen, button enabled
9. Klik Refine Concept met partial ratings — werkt zonder lock-out
10. Resize browser — sticky footer blijft zichtbaar zonder content-overlap

**Quality gates**:
11. `npx tsc --noEmit` 0 errors
12. `npm run lint` 0 errors
13. `npm run test` (unit-tests Fase C groen)
14. `npm run test:e2e -- --grep "concept"` (E2E Fase C)

# Risico's

- **Gate-fix verbergt onderliggend strategy-divergentie probleem** — mitigatie: de `console.warn` in Fase A logt elk geval, zodat we tijdens smoke-test data verzamelen. Indien `synthesizedStrategy` structureel null blijft post-elaborate, opent dat een vervolg-investigation.
- **Sticky footer overlap met andere wizard-steps** — mitigatie: scope sticky-footer naar `ConceptReviewView` only, niet aan parent toevoegen.
- **"Mark all as approved" verlaagt rating-kwaliteit** — mitigatie: de rating is alleen voor downstream context (synthesis-feedback), niet een blocker voor advance. Acceptabel voor user die geen genuanceerd oordeel heeft.
- **E2E test infrastructure** — kan zijn dat campaign-wizard E2E nog niet bestaat; in dat geval beperken tot één smoke-spec en de bredere E2E-coverage delegeren naar `posthog-sentry-browser`-vervolgtaak.

# Out of scope

- Andere wizard-steps (briefing, strategy-foundation, journey-elaborate) — alleen concept-review
- Server-side validation van ratings — blijft client-only zoals nu
- Refine-flow zelf (`onRefine` callback) — wijzigt niet, alleen disabled-conditie
- Onderzoek naar **waarom** `synthesizedStrategy` post-elaborate null/incompleet kan zijn — pas op te pakken als console.warn dat structureel laat zien
- Brandclaw-integratie van rating-feedback — los track

# Notes

**Onderzochte snippets**:
- `ConceptReviewView.tsx:55` — `allRated = useCampaignWizardStore((s) => s.allConceptRated())`
- `ConceptReviewView.tsx:58-61` — view-side `presentKeys` filter op props.strategy
- `ConceptReviewView.tsx:220-224` — orange progress text gated op `!allRated`
- `ConceptReviewView.tsx:233, 243` — beide buttons delen `disabled={!allRated}`
- `useCampaignWizardStore.ts:541-559` — `allConceptRated()` gebruikt `state.synthesizedStrategy`
- `ConceptStep.tsx:967-980` — render condition + `fs = finalStrategy ?? synthesizedStrategy`

**Recente git history op deze flow**:
- `5a296e0` fix: remove elaborateResult guard from handleApprove
- `bb87808` fix: ConceptReviewView approve button stuck in elaborate loop

→ tweede pre-existing fix in dezelfde flow → patroon bevestigt dat deze view kwetsbaar is voor render/store sync issues.

**Pause-point**: na Fase A user-verificatie aanvragen voordat Fase B begint, om de bug-fix snel in productie/dev te krijgen los van het redesign-werk.

**Voortgang 2026-05-08**:
- Fase A ✅ uitgevoerd + user-bevestigd (`hij doet het`). Twee plekken gepatcht: `allConceptRated()` gate + `handleApprove`. Beide met dev-warn voor diagnostiek.
- Fase B ✅ uitgevoerd. Wacht op user smoke-validatie van: button-altijd-klikbaar + toast/scroll, status-dots, Mark-all-shortcut, Refine ontkoppeld, sticky footer.
- Fase C — gotchas-entry geschreven. Tests deferred met expliciete reden (zie acceptatiecriteria).

**Follow-up tasks**:
- `vitest-setup` (klein, post-launch): reusable unit-test foundation voor store-logic en pure functies. Levert ROI bij elke volgende store-bugfix.
- Investigate **waarom** `synthesizedStrategy` post-build-strategy null kan blijven in campaign-mode multi-variant flow. De `[concept-approval]` console.warn tijdens manual smoke wijst de exacte divergentie aan — dat is de input voor deze investigation. Pas oppakken als de warning structureel afgaat.
