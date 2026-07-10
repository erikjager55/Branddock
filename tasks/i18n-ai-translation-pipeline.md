---
id: i18n-ai-translation-pipeline
title: Automatische AI-vertaal-pipeline voor UI-strings (geen handmatige vertaling)
fase: post-launch
priority: later
effort: 1-2 weken (engine) + doorlopend per namespace
owner: claude-code
status: open
created: 2026-06-28
completed: -
related-adr: docs/adr/2026-06-28-multilingual-i18n-and-multi-market-content.md
related-spec: -
worktree: -
---

> **Status-sync 2026-07-08**: `fase` pre-launch → **post-launch**, `priority` now → **later** — consistent met de roadmap §🌍 Meertaligheid (Fase 1b = post-launch parkeer; en/nl al geseed door de extractie-waves, dus niet-blokkerend voor launch).

# Probleem

Het UI-string-oppervlak is ~3-4k distincte strings over ~600 bestanden. Handmatig vertalen naar nl (en later de/es/fr) is niet haalbaar en de gebruiker wil expliciet geen handwerk: alle niet-Engelse bundles moeten automatisch door het beste AI-model gegenereerd worden, en élke latere wijziging moet automatisch meertalig zijn.

# Voorstel

Een build-time script `scripts/i18n/translate.ts` dat de canonieke `en`-catalogi vertaalt naar elke doeltaal via Claude Opus (door de bestaande `src/lib/ai/`-laag, nooit de SDK direct). Incrementeel via source-hash (alleen nieuwe/gewijzigde sleutels), met glossary (do-not-translate merktermen) + tone-keuze per taal, placeholder/ICU-behoud, een deterministische validatie-gate en een LLM-judge (self-repair-loop). Gegenereerde bundles worden gecommit (deterministische builds; geen runtime/per-deploy-vertaling). Een CI-action draait de pipeline bij elke wijziging aan `en` en faalt of bot-commit op basis van validatie. Graceful fallback naar Engels bij een ontbrekende/afgekeurde sleutel.

# Acceptatiecriteria

- [ ] `npm run i18n:translate` genereert per doeltaal complete bundles uit `en`; alleen gewijzigde/nieuwe sleutels worden (her)vertaald (source-hash in `i18n.lock.json`).
- [ ] Glossary-termen (Branddock, Brandclaw, Canvas, Persona, Workspace, …) blijven verbatim; tone per taal vast (nl informeel "je", de "du"/formeel — configureerbaar).
- [ ] Placeholders (`{{name}}`, `{count}`), ICU en plural-categorieën blijven byte-identiek behouden en compleet voor de doeltaal; validator faalt anders.
- [ ] Validatie-gate faalt CI bij: ontbrekende key, kapotte placeholder/ICU, incomplete plural-categorieën, niet-parsende output, of "target == source" waar verschil verwacht werd (met glossary-uitzondering).
- [ ] LLM-judge (ander model) scoort fidelity/fluency/tone; lage scores triggeren auto-hervertaling met de kritiek; hardnekkige gevallen vallen terug op Engels + log (nooit een rauwe key in de UI).
- [ ] CI-action draait bij wijziging in `en`-catalogi en commit de bundles (bot) of faalt de PR.
- [ ] Server-oppervlak gedekt: een server-only i18next `createInstance`-accessor (`src/lib/ui-i18n/server.ts`) keyed op recipient-locale; `sendTransactional` (`src/lib/email/transactional.ts:43`) + callers krijgen een `locale`-param zodat e-mails in de taal van de ontvanger renderen (client-i18next dekt het email-/server-oppervlak NIET).
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd
- [ ] Documentatie bijgewerkt indien van toepassing

# Bestanden die ik aanraak

- `scripts/i18n/translate.ts` (nieuw) — vertaal-runner via `src/lib/ai/` (Opus), batch per namespace met `createClaudeStructuredCompletion`
- `scripts/i18n/validate.ts` (nieuw) — deterministische gate (keys/placeholders/ICU/plural/parse)
- `scripts/i18n/judge.ts` (nieuw) — LLM-as-judge + self-repair-loop
- `src/lib/ui-i18n/glossary.ts` + `src/lib/ui-i18n/tone.ts` (nieuw) — do-not-translate + formaliteit per taal
- `src/lib/ui-i18n/locales/<lang>/*.ts` (gegenereerd, gecommit) + `i18n.lock.json` (source-hashes)
- `src/lib/ai/feature-models.ts` (nieuwe `ui-translation`-feature default Opus; judge = ander model)
- `package.json` (`i18n:translate` / `i18n:validate` scripts)
- `.github/workflows/i18n-translate.yml` (nieuw)
- `src/lib/ui-i18n/server.ts` (nieuw, server-only catalog-accessor) + `src/lib/email/transactional.ts` (+ callers) — recipient-locale-e-mails

# Bestanden die ik NIET aanraak

- `src/lib/ai/locale-instruction.ts` / `src/lib/i18n/*` — CONTENT-localisatie, andere engine (zie ADR Beslissing 4); deze pipeline is UI-strings, brand-context-vrij.
- De i18next-runtime/provider → `[[i18n-ui-foundation]]`.

# Smoke test plan

1. Voeg een nieuwe key toe aan `en/common.ts` met een placeholder (`"Hi {{name}}"`) → `npm run i18n:translate` vult alleen die key in nl; placeholder behouden.
2. Saboteer een nl-waarde (verwijder `{{name}}`) → `npm run i18n:validate` faalt met die key.
3. Verander niets aan `en` en draai opnieuw → 0 hervertalingen (hash-stabiel, geen diff-churn).
4. Verwijder een nl-key → runtime toont Engels (graceful fallback), niet de rauwe key.

# Risico's

- AI-vertaling van korte UI-labels zonder context is de klassieke faalmodus → mitigatie: key-pad + optionele dev-omschrijving + glossary + judge.
- Kosten/throughput → mitigatie: incrementeel (hash) + batch per namespace; alleen Opus voor vertaling, goedkoper model voor judge.
- Plural-categorieën verschillen per taal → validator dwingt volledigheid af via `Intl.PluralRules`-categorieën van de doeltaal.

# Out of scope

- CONTENT-transcreatie (brand-/persona-/compliance-bewust, F-VAL-gescoord) → `[[multi-market-transcreation-enterprise]]`.
- TMS-integratie (Crowdin/Lokalise) — optionele latere verbetering.

# Notes

- `en` = single source of truth; developers schrijven alleen Engelse keys (afgedwongen door de CI-guard uit `[[i18n-ui-foundation]]`).
- De enige menselijke input die kwaliteit borgt is glossary + tone-keuze + een omschrijving bij ambigue korte strings — geen vertaalwerk.
