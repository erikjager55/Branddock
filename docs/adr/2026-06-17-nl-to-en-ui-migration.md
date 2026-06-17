# ADR 2026-06-17 — Monolinguale Engelse UI (NL→EN migratie) + generated-content locale-defaults

- **Status**: accepted
- **Datum**: 2026-06-17
- **Context-task**: [`tasks/dutch-to-english-ui-migration.md`](../../tasks/dutch-to-english-ui-migration.md)

## Context

In de UI was Nederlands "ingeslopen" (aria-labels, placeholders, error-/toast-meldingen, marketing-copy, notificatie-/e-mailteksten, en NL default-/placeholder-content in de Puck-page-builder). De gebruiker wil dat **alle product-/communicatieteksten Engels** zijn, met als enige uitzondering de voor de klant **gegenereerde content**, die de taal-voorkeur volgt (Settings → Content Language).

Een multi-agent audit (workflow `dutch-to-english-audit`) wees uit:
- Er is **geen i18n-framework**; UI-strings zijn hardcoded literals in JSX.
- De taal van gegenereerde content is een volwassen locale-laag (ADR `2026-05-08-locale-routing-brand-voice`): `BrandVoiceguide.contentLocale` → `Workspace.contentLanguage` (`@default("en")`) → `en-GB`, met `buildLocaleInstruction()` als prompt-directive.

## Decision

1. **Directe hardcoded NL→EN-vervanging van user-facing UI-strings. GEEN i18n-laag.** De gebruiker wil monolinguaal Engels, niet meertalig; een framework levert pas waarde bij ≥2 UI-talen en botst met de client-side SPA-switch (`src/App.tsx`).

2. **De locale-laag voor gegenereerde content blijft intact.** Niet gesloopt, niet als UI-string vertaald. Prompt-instructie-bodies (o.a. `locale-instruction.ts`, `brand-voice-directive.ts`, `variant-generator.ts`, `analysis-prompts.ts`, brandclaw-nodes) blijven **byte-identical** wegens golden-set-stabiliteit.

3. **No-preference taal-fallback uitgelijnd op de schema-default `'en'`.** Diverse hardcoded `?? 'nl'` / `'nl-NL'`-fallbacks bepaalden bij ontbrekende voorkeur stilzwijgend Nederlands — tegenstrijdig met `Workspace.contentLanguage @default("en")`. Gewijzigd naar `'en'` in: `generate-structured-variant`/`auto-iterate-variant` routes, `canvas-orchestrator.ts`, `human-voice-directive.ts`, `auto-iterate-integration.ts`. **Brands mét expliciete voorkeur zijn onaangeraakt** (de `nl → nl-NL`-mapping en per-taal-data zoals `citations.ts`/`detect-brand-language.ts` blijven staan). Dit raakt alleen de edge-case "geen enkele voorkeur ingesteld", die nu de gedocumenteerde default volgt.

4. **Puck/template editor-scaffold-defaults → Engels (niet locale-driven).** De default/placeholder-props in `puck-config.tsx` en `puck-templates/template-helpers.ts` ('Plan een afspraak', 'Meer informatie', FAQ-placeholders, 'Schrijf hier je inhoud.', etc.) zijn **recognizable scaffold-placeholders** (zie anti-fabrication-comment in `template-helpers.ts`) die de generatie overschrijft — geen echte content. `defaultBrandHero` was al Engels; de placeholder-markers in `fidelity-runner.ts` zijn al bilingue (`'your content here'` naast `'schrijf hier je inhoud'`). We maken ze daarom consistent Engels (de RichText-default wordt `'Write your content here.'` zodat de bestaande EN-marker matcht) i.p.v. een locale-driven refactor te bouwen. De builder heeft de brand/locale-context wél (`buildSpikePuckConfig(contextStack)`) mocht echte locale-driven defaults later gewenst zijn.

5. **ESLint-gate tegen regressie.** Een `no-restricted-syntax`-regel blokkeert nieuwe Nederlandse UI-strings (hoog-precieze stopwoordenlijst) in JSX-tekst + aria-label/placeholder/title, scoped op `src/components`/`src/features`/`src/app`, met harde exclude van de klant-content-paden (puck-config/puck-templates).

6. **Buiten scope (bewuste gebruikerskeuze):** NL code-comments en interne documentatie (CLAUDE.md/gotchas/roadmap/tasks/ADRs) blijven Nederlands, conform de bestaande conventie "Documentatie: Nederlands. Code/interfaces: Engels."

## Consequences

- **Positief:** monolinguaal Engelse UI + publieke marketing-site; geen runtime-dependency of build-config-wijziging; regressie-gate; de no-preference default klopt nu met het schema.
- **Trade-off:** brands zónder enige taal-voorkeur krijgen voortaan Engelse gegenereerde content i.p.v. Nederlands (reversibel: zet `Workspace.contentLanguage` of `BrandVoiceguide.contentLocale`). Editor-scaffold dat onverhoopt op een gepubliceerde NL-pagina lekt is Engels — acceptabel want het is herkenbare placeholder die de fidelity-runner als unfilled detecteert.
- **Risico-mitigatie:** prompt-bodies byte-identical (golden-sets groen als bewijs); `PLACEHOLDER_CONTENT_MARKERS` ongewijzigd (bestaande opgeslagen content blijft herkend); `smoke:prompt-contracts` + golden-sets als gate.

## Y-statement

In de context van een pre-launch product met ingeslopen Nederlands en een Engelssprekende doelmarkt, kozen we voor **directe hardcoded NL→EN-vervanging met een lint-gate** en lieten we de generated-content-locale-laag intact (met de no-preference default uitgelijnd op `'en'`), om een consistent Engelse UI te bereiken zonder de meerwaarde-loze complexiteit van een i18n-framework of het risico van het herschrijven van golden-set-gevoelige prompt-bodies, met als consequentie dat we NL code-comments/docs en de voorkeur-gedreven generated-content bewust ongemoeid laten.
