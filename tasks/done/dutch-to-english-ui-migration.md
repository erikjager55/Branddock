---
id: dutch-to-english-ui-migration
title: Ingeslopen Nederlandse UI/communicatie-teksten → Engels (monolinguale Engelse UI)
fase: pre-launch
priority: next
effort: ~3-4 dagen (F1-F3+F5); F4 apart 1-2d opt-in
owner: claude-code
status: done
created: 2026-06-17
completed: 2026-06-17
related-adr: docs/adr/2026-06-17-nl-to-en-ui-migration.md
related-spec: -
worktree: branddock-feat-nl-to-en (branch feat/dutch-to-english-ui)
---

> **Uitvoering 2026-06-17** — werkelijke scope bleek ~10× de eerste schatting:
> de discovery vond ~690 user-facing findings (royaal geteld; ~250-350 echt) over ~80 files,
> niet ~65. Zelfde soort werk, groter volume. Uitgevoerd in worktree `branddock-feat-nl-to-en`:
> - **F1/F2/F3** (TIER A, 8 parallelle agents): marketing-site, settings, shared components, canvas-UI,
>   brandstyle/voice, competitors + transactionele alert-emails (`notify-major-events.ts`), activity-labels.
> - **F4** (handmatig): puck-config + template-helpers scaffold-defaults → Engels (consistent met de
>   al-Engelse BrandHero + bestaande bilinguale placeholder-markers; géén locale-driven refactor want het
>   zijn placeholders die de generatie overschrijft). `?? 'nl'`-taalfallbacks in 5 generated-content-paden
>   uitgelijnd op `'en'` (no-preference default = schema-default; voorkeur-brands onaangeraakt).
> - **F5**: ESLint `no-restricted-syntax`-gate tegen nieuwe NL UI-strings (vond 10 misses tijdens uitvoering, gefixt).
> - **ADR**: `docs/adr/2026-06-17-nl-to-en-ui-migration.md`.
> - **Verificatie**: tsc 0 · eslint 0 errors · F5-gate 0 violations · smoke:prompt-contracts 235/235 ·
>   smoke:locale 32/32 · smoke:web-page-builder 68/68 · smoke:page-types/image-briefing/competitor-activities/feature-visual-gate groen.
>   Géén doNotTouch/prompt-body files in de diff. Diff: ~80 files.
> - **Buiten scope gehouden** (gebruikerskeuze): code-comments + interne docs blijven Nederlands.

# Probleem

De app-UI is grotendeels Engels, maar er is Nederlands "ingeslopen": losse aria-labels, placeholders, error-/toast-meldingen en validatie-teksten. De gebruiker wil dat **alle product-/communicatieteksten Engels** zijn. **Uitzondering**: de voor de klant *gegenereerde* content blijft in de taal naar voorkeur (Settings → Content Language) — die laag mag NIET geforceerd naar Engels.

Audit-basis (multi-agent scan 2026-06-17, 90 agents): er is **geen i18n-framework**; UI-strings zijn hardcoded literals in JSX. Slechts ~49 van 839 componenten bevatten Nederlands, meestal comments/aria-labels/error-strings — geen meertalig-ombouw nodig. De taal van gegenereerde content is een volwassen locale-laag (ADR `2026-05-08-locale-routing-brand-voice`): `BrandVoiceguide.contentLocale` → `Workspace.contentLanguage` (`@default("en")`) → `en-GB`, met `buildLocaleInstruction()` als "OUTPUT LANGUAGE — CRITICAL"-prompt. Die infra blijft intact.

# Voorstel

Directe hardcoded **NL→EN-vervanging** van user-facing strings, **geen i18n-laag introduceren** (gebruiker wil monolinguaal Engels, niet meertalig; een framework botst bovendien met de client-side SPA-switch in `src/App.tsx`). Gefaseerd, laag-risico, per-component reviewbaar. Een ESLint-gate voorkomt herhaling. De klant-content-producerende paden (Puck-defaults, prompt-scaffolding, locale-laag) worden **expliciet uitgesloten** en — waar ze nu hard-Nederlands zijn — in een aparte fase **locale-driven** gemaakt zodat ze de voorkeurstaal respecteren i.p.v. te forceren.

## Geverifieerde omvang (2026-06-17)

| Bucket | Telling | Actie |
|---|---|---|
| UI_STRING (aria/placeholder/title/labels) | ~35 strings · 6 files | Vertalen (F1) |
| USER_MESSAGE (toast/error/validatie) | ~30 strings · 15 files + 2 API-routes | Vertalen (F2) |
| EMAIL_NOTIFICATION | 0 (al Engels — geverifieerd) | Alleen verifiëren (F3) |
| AI_PROMPT_INSTRUCTION (NL → LLM) | ~12 | Byte-identical laten (golden-sets); zie F4 |
| GENERATED_CONTENT_DEFAULT (Puck/template NL-defaults) | ~40 | NIET swappen → locale-driven (F4) |
| Code-comments / interne docs | n.v.t. | **Buiten scope** (gebruikerskeuze) |

# Acceptatiecriteria

- [ ] F1: 6 files met NL aria-label/placeholder/title → Engels
- [ ] F2: ~15 files NL toast/error/validatie + 2 API-routes (alleen response-velden) → Engels
- [ ] F3: bevestigd dat email-templates + notificatie-copy 100% Engels zijn (huidige meting: 0 NL)
- [ ] F5: ESLint-gate actief die nieuwe NL UI-strings blokkeert, met harde exclude van klant-content-paden
- [ ] Geen klant-content-producer (doNotTouch) gewijzigd in F1/F2/F5
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] `npm run smoke:prompt-contracts` + golden-sets ongewijzigd groen (bewijst dat prompts niet geraakt zijn)
- [ ] Visuele smoke per gewijzigd scherm (geen Engelse copy in NL-klantpagina's)

# Fasering

### F1 — Hoog-zichtbare UI-chrome (laag risico, ~0,5-1d)
aria-labels, titles, placeholders, losse labels in `src/components/**` + `src/features/**` (.tsx), **exclusief** puck-config/puck-templates + doNotTouch. Grep-gestuurd op NL-stopwoorden. Anker: `InfoBox.tsx:172` aria-label='Sluiten', `HeroLogoOverlayPanel.tsx`.

### F2 — Toasts, error-messages, validatie (laag-middel, ~1d)
NL error/success/validatie-copy (toast.*, setError, throw new Error → user-facing) + de 2 API-routes (alleen `response.error`-velden, **niet** interne logging/`console.warn`). Onderscheid user-message van NL code-comment.

### F3 — Email + notificaties (triviaal, ~0,25d)
Verificatie-only: gerichte grep bevestigt 0 NL in `src/lib/email/templates/**`. Indien een notificatie/preference-label nog NL is → vervangen. Anders afvinken.

### F4 — Generated-content NL-defaults locale-driven maken (APART, ~1-2d, opt-in, eigen ADR)
**Geen UI-vertaling.** Betreft NL die in *klant-output* kan lekken:
- NL Puck/template `defaultProps` (`puck-config.tsx`, `template-helpers.ts`: 'Plan een afspraak', 'Meer informatie', 'Klaar om te starten?', feature/FAQ/testimonial-placeholders) → **locale-driven** (volg brand `contentLocale`) i.p.v. hard NL. Zo krijgt een EN-voorkeur-brand Engelse defaults en een NL-brand Nederlandse — conform de voorkeursinstelling.
- Hardcoded `'nl'/'nl-NL'`-fallback in LP-generatie (`generate-structured-variant/route.ts:193,197`, `auto-iterate-variant`) → locale-resolver-default i.p.v. hard NL.
- NL prompt-bodies die de LLM aansturen (`variant-generator.ts` VARIANT_REWRITE_SYSTEM_PROMPT, strategy-chain) → **byte-identical laten** (golden-set-eis; sturen output-taal niet — dat doet `locale-instruction.ts`). Optioneel later her-baselinen.
- **Niet** bestaande workspaces forceren naar 'en' — de voorkeur blijft leidend.

### F5 — Lint/CI-gate tegen nieuwe NL UI-strings (laag-middel, ~0,5-1d)
ESLint flat-config (`eslint.config.mjs`) `no-restricted-syntax` of lichte custom-regel met hoog-precieze NL-stopwoordenlijst (mislukt/gelukt/Opslaan/Sluiten/Annuleren/Verwijderen/Toevoegen/Bewerken/vereist/ongeldig) op JSX-text/aria-label/placeholder/title. Comments + `console.*` uitgesloten (NL-comments toegestaan per CLAUDE.md). Klant-content-paden via overrides-glob **hard uitgesloten**.

# Bestanden die ik aanraak

- F1: ~6 .tsx in `src/components/**` + `src/features/**` (o.a. `InfoBox.tsx`, `HeroLogoOverlayPanel.tsx`) — exact via grep vaststellen
- F2: ~15 .tsx + `src/app/api/<2 routes>/route.ts` (alleen response-strings)
- F5: `eslint.config.mjs`
- F4 (apart): `puck-config.tsx`, `puck-templates/template-helpers.ts`, `generate-structured-variant/route.ts`, `auto-iterate-variant/route.ts` + nieuwe locale-helper

# Bestanden die ik NIET aanraak (doNotTouch — klant-content-producers)

- `src/lib/brand-fidelity/heuristics/locale-resolver.ts` — bepaalt output-taal van klant-content
- `src/lib/ai/locale-instruction.ts` — golden-set: byte-identical vereist
- `src/lib/i18n/detect-brand-language.ts`, `src/lib/studio/brand-voice-directive.ts`
- `src/lib/ai/prompt-templates.ts`, `src/lib/campaigns/strategy-chain.ts`, `src/lib/ai/prompts/**`
- `src/lib/landing-pages/*` prompt-bodies (in F1/F2; in F4 alléén de defaults/fallback, niet de prompt-bodies)
- `prisma/schema.prisma` locale-velden (niet slopen)
- NL code-comments en interne docs (CLAUDE.md/gotchas/roadmap/tasks/ADRs) — buiten scope per gebruikerskeuze

# Smoke test plan

1. Per gewijzigd F1/F2-scherm: visueel checken dat de UI Engels is en de layout intact.
2. `grep` herhalen op NL-stopwoorden in `src/components`+`src/features` → user-facing hits = 0 (m.u.v. doNotTouch).
3. Een NL-voorkeur-workspace (bv. Napking): genereer een content-item + LP → klant-output blijft **Nederlands** (bewijst dat F1/F2 de generated-laag niet raakten).
4. `npm run smoke:prompt-contracts` + golden-sets groen.
5. F5: voeg bewust een NL aria-label toe → lint moet falen; klant-content-pad met NL → lint moet slagen (exclude werkt).

# Risico's

- **Per ongeluk generated-defaults vertalen**: NL Puck-defaults renderen in gepubliceerde klantpagina's; `"Schrijf hier je inhoud."` staat zelfs in `PLACEHOLDER_CONTENT_MARKERS` (fidelity-runner.ts:579 — naïeve swap vervuilt LP-fidelity-scores). Mitigatie: F1/F2/F5 sluiten puck-config/puck-templates hard uit; alleen via F4 (locale-driven, + marker-update).
- **Golden-sets breken**: prompt-scaffolding byte-identical houden; F4 als aparte task met prompt-contract-smoke als gate.
- **Gemiste strings**: stopwoord-grep dekt niet alle NL. Mitigatie: F5-gate + eenmalige bredere sweep + visuele smoke.
- **ESLint false positives** op leenwoorden/eigennamen. Mitigatie: korte hoog-precieze lijst, inline-disable mogelijk.
- **API-over-vertaling**: alleen response/error-velden, niet logging.

# Out of scope

- Code-comments en interne docs naar Engels (gebruikerskeuze 2026-06-17: laten staan)
- Meertalige UI / i18n-framework (gebruiker wil monolinguaal Engels)
- Forceren van bestaande workspaces/generated-content naar Engels (blijft voorkeur-gedreven)

# Notes

- Audit-run: workflow `dutch-to-english-audit` (`wf_f24637fd-b75`), 90 agents, geverifieerd met gerichte greps.
- Gebruikerskeuzes 2026-06-17: comments laten · interne docs laten · lint-gate toevoegen.
- F4 is bewust losgekoppeld: het raakt klant-output + golden-sets en hoort onder een eigen ADR + smoke-run, niet onder de UI-string-swap.
