# START HERE

> Entry point voor mens en agent. Lees deze bij elke sessie-start.
> **Laatst bijgewerkt: 2026-08-15** (volledig herschreven — de vorige versie was een
> maand oud en noemde het credit-model nog als kritiek pad).

---

## Huidige fase

**Live op productie, in acquisitie.** App én billing draaien op `branddock.app`
(main = production, Vercel Pro+Fluid). De launch-blockers uit het voorjaar zijn
allemaal weg: Vercel ✅, Stripe ✅, credits ✅ gebouwd en gesmoked.

Het zwaartepunt is verschoven van *bouwen tot het af is* naar **distributie**. Twee
sporen dragen dat:

1. **`brand.md` als instap-funnel** — gratis scan → download → claim → trial. Live en
   werkend: generator, Brand Score, rapport-mail, lifecycle-reeks 2.2-2.5, claim-flow
   en leads-dashboard staan er.
2. **De designbibliotheek** — Brand Manifest, Brand Library-accessor, StyleguideRule
   als eersteklas datatype, en sinds vandaag ook de F-VAL-rules-pijler die ze écht leest.

**Wat er niét meer speelt:** het credit-model is compleet (bouw, Stripe-config,
smokes). Het enige dat rest is jouw schakelmoment: `NEXT_PUBLIC_TOPUP_ENABLED=true`
plus één echte betaal-smoke.

---

## ⚠️ Eerst afmaken: ongecommit werk in de main-worktree

Dit staat al dagen los in `branddock-app` en gaat verloren bij een `git checkout` of
een onvoorzichtige pull. **Begin hiermee.**

| Bestand | Wat het is | Actie |
|---|---|---|
| `tasks/hng-invulboek-2026-08-14.md` | Task-file, status `done`, HNG-invulboek volledig verwerkt | committen |
| `scripts/fill-nieuwe-golfen.ts` | Het fill-script dat dat werk uitvoerde | committen |
| `scripts/score-hng-referentieteksten.ts` | Hertest-script (A=91 / B=61 / C=68) | committen |
| `scripts/migrate-brand-dna/bundles/het-nieuwe-golfen-2026-08-14.json` | Prod-bundle, klaar voor import | committen (andere bundles zijn ook getrackt) |
| `tasks/open-acties-2026-07-23.md` | Gewijzigd, niet gecommit | doorlezen en committen |
| `docs/Branddock branddoc v3.pdf` | Untracked sinds juli | **besluit nodig**: committen, verplaatsen of weggooien |
| `integrations/browser-extension/package-lock.json` | Gewijzigd | checken of dit bedoeld is |

Het HNG-werk oogt af — het task-file staat op `done` met alle criteria afgevinkt — maar
is nooit vastgelegd. Eén commit lost het op.

**Daarna nog open bij HNG**: de prod-import draaien (workspace `cmrxl41sm00230akjshqksl17`,
runbook in `scripts/migrate-brand-dna/README.md`) en de kennisbronnen handmatig uploaden;
die zitten niet in de bundle.

---

## Wat er vandaag landde (2026-08-15)

Twee parallelle sessies, negen PR's, alles gemerged met groene CI.

**Designbibliotheek** (#255-#259, #263): StyleguideRule bereikt de F-VAL-rules-pijler,
merkcontext via één gegate accessor met lint-regel, reviewstatus-driftreset, re-analyse
die geen user-edits meer vernietigt, curatie-suggesties uit F-VAL-overtredingen, en R4
compleet. Plus twee CI-fixes (#260, #262) die main van acht commits rood naar groen
brachten — de tsc-stap kreeg 8GB heap omdat hij omviel met out-of-memory.

**E2E-sweep + 8 bugs** (#261, changelog 468): alle 24 zichtbare content-types door het
echte klikpad. 7 leverden nul tekens op. Zes van de acht bugs faalden stil.

**Brand Score + lifecycle-mails** (#264, changelog 469): de score gaf iedereen exact 70;
nu 71-98 met uitleg. Mails herschreven naar Nederlands, één CTA per stuk.

---

## Top 3 om mee te beginnen

**1. Het ongecommitte werk hierboven.** Tien minuten, en het risico is weg.

**2. 💳 TOPUP aanzetten.** Nog steeds het enige met directe omzet-impact, en er is geen
technisch werk meer — alleen `NEXT_PUBLIC_TOPUP_ENABLED=true` en één betaal-smoke.

**3. 🧩 [`content-chain-accessor`](tasks/content-chain-accessor.md) fase 1.** Content woont
op drie plekken; 21 kruisingen in kaart, ADR ligt er. Fase 1 raakt geen consument en is
veilig te mergen. Deze sessie liep er nog live tegenaan: `product-page` leek mislukt omdat
de componentketen leeg was terwijl de content in `settings.structuredVariantOptions` stond.
⚠️ Fase 2 wacht op twee productbeslissingen (zie Open beslissingen).

---

## Open beslissingen (blokkeren werk)

1. **Content-accessor `structured-unchosen`** — twee productkeuzes, geen techniek:
   het Content Library-stoplicht toont rood + "No content generated" op een vólle pagina,
   en de Brand Assistant zegt onterecht "deze pagina heeft nog geen content".
2. **`guard-hooks-hardening`** — raakt je veiligheidsnet, vraagt expliciet akkoord.
   Kernvraag: móet `gh pr merge` blokkeren bij een co-sessie, of volstaat waarschuwen?
   Deze sessie bewees dat de guard werkt maar eenrichting beschermt (zie gotchas 15-08).
3. **`docs/Branddock branddoc v3.pdf`** — committen, verplaatsen of weggooien?
4. **brand.md-strategie** — akkoord op de omarm-strategie + outreach naar de maintainer;
   de upstream-PR's liggen als tekstpakket klaar.
5. **Meertaligheid brand.md-funnel** — de pagina's en mails zijn nu Nederlands. De wens was
   breder: site meertalig, mails volgen de gekozen taal. Vereist een locale-kolom op
   `GeneratedBrandProfile` (schemawijziging → Neon-push) en template-lookup per taal.
   Het fundament ligt er: `renderLayout` kent al een `locale`.

---

## Openstaande taken

### Nu
| Taak | Staat |
|---|---|
| [`brand-md-open-standaard`](tasks/brand-md-open-standaard.md) | in-progress — funnel live; rest is upstream-PR's + jouw strategie-akkoord |
| [`content-chain-accessor`](tasks/content-chain-accessor.md) | open — fase 1 veilig, fase 2 geblokkeerd |
| [`lp-image-routes`](tasks/lp-image-routes.md) | review — wacht op één prod-smoke door jou |
| [`seo-pipeline-speedup`](tasks/seo-pipeline-speedup.md) | open — fase 4a deed 12→7,5 min |
| [`onboarding-flow-test`](tasks/onboarding-flow-test.md) | open — hangt op 3 externe testers |
| [`open-acties-2026-07-23`](tasks/open-acties-2026-07-23.md) | open — wacht-op-Erik-lijst, deels achterhaald |

### Volgende
`workspaces-online-migratie` (4 workspaces resteren, jouw keuze) ·
[`lp-review-followups`](tasks/lp-review-followups.md) (⚠️ retentie-items zijn tijdgevoelig:
`PageEvent` groeit onbegrensd, `FormSubmission` bevat PII zonder wisroutine) ·
[`golden-set-gate-decouple`](tasks/golden-set-gate-decouple.md) ·
[`guard-hooks-hardening`](tasks/guard-hooks-hardening.md) ·
[`headless-content-service`](tasks/headless-content-service.md) (P3.0a) ·
[`brand-assistant-quick-create`](tasks/brand-assistant-quick-create.md) (P3.0b)

### Later
`agent-vera-triggers` · `security-residual-hardening` (rest: CSP-enforce-flip) ·
`content-test-regression-7B` · `geo-seo-followup-later` · `i18n-ai-translation-pipeline` ·
`power-user-shortcuts` · `publishgate-second-opinion` · `validate-brand-domain-component-fit` ·
`video-chain-explainer-showcase` · `web-page-builder-acceptance-rest` ·
`mcp-external-data-enrichment-research`

---

## Losse eindjes uit deze sessie

- **F-VAL onder de drempel** bij `linkedin-post` (69), `linkedin-poll` (70), `search-ad`
  (70,5) en `twitter-thread` (71). Signaal, geen conclusie: Napking's styleguide staat op
  `published = false`, dus de stijl-pijler mist context. Sluit dat eerst uit.
- **Campagnewizard voorbij stap 3 ongetest** — foundation, concept, deliverables en review.
  Vereist een briefing die ≥80 scoort; een rijk ingevulde testbriefing haalde 68. Dat de
  gate zo streng is, is op zichzelf het bekijken waard.
- **`rule-structurer` en `brief-week-theme-prompt`** zijn dezelfde soort STRUCTURED-calls
  als de variant-generator en dus theoretisch kwetsbaar voor thinking-uitputting. Daar
  thinking uitzetten is een kwaliteitsafweging (ze redeneren over merkregels), geen bugfix.
  De nieuwe foutmelding wijst het aan als het gebeurt.
- **Mail 2.4** citeert nu de positionering uit de scan. Merken zonder bruikbare
  positionering vallen terug op een datum-variant — dat is de zwakkere versie.
- **`channelTones`** wordt nooit door een scan gevuld: 2,5 punt van de Brand Score is
  daarmee onbereikbaar zonder mens. Bewust zo gelaten.

---

## Hoe te beginnen

**Sessie-start** (Stream Deck):
```
Lees CLAUDE.md, gotchas.md en START_HERE.md.
Bevestig wat je begrijpt over de huidige fase en geef de top 3 actieve tasks.
```

**Bij task-werk**:
```
Werk aan tasks/<id>.md volgens de regels in CLAUDE.md.
Start in plan-mode. Bevestig file-set en acceptatiecriteria voor je begint.
```

**Nieuw feature-idee**: `Ik heb een idee voor X. Run feature-planner subagent.`
Pipeline: 6-assen discovery → `tasks/_drafts/idea-<id>.md` → technical-planner →
`tasks/<id>.md`. Gids: [`docs/playbooks/feature-discovery.md`](docs/playbooks/feature-discovery.md)

### Twee sessies tegelijk

Werkt, maar alleen met discipline. Vandaag ging het één keer mis en één keer goed:

- **Mis**: een branch vanaf *lokale* main nam ongepusht werk van een ander mee en
  deployde dat vóór de bijbehorende Neon-migratie. Vertak **altijd vanaf `origin/main`**,
  en controleer de PR-diff op bestandsaantal vóór de merge — niet alleen wat je zelf staged.
- **Goed**: de `session-guard` blokkeerde een tweede branch-mutatie. Hij beschermt
  eenrichting (HEAD/branch, niet `gh pr merge`) en laat pas na 15 minuten los. Een sessie
  die "dicht" lijkt kan de lock nog vasthouden — check `.claude-session.lock`.
- Na commits van een andere sessie: **`npx prisma generate`**. Schemawijzigingen laten je
  gegenereerde client achter en `tsc` faalt dan op bestanden die je niet aanraakte.

---

## Zie ook

- [`roadmap.md`](roadmap.md) — volledige Now/Next/Later met fasering
- [`docs/changelog.md`](docs/changelog.md) — wat is gebouwd (#469 en doorlopend)
- [`gotchas.md`](gotchas.md) — lessons learned, lees bij elke sessie
- [`CLAUDE.md`](CLAUDE.md) — runtime context + werkregels
- [`PATTERNS.md`](PATTERNS.md) — verplichte UI-primitives
- [`docs/adr/`](docs/adr/) — architecturale beslissingen
- [`docs/playbooks/working-flow.md`](docs/playbooks/working-flow.md) — operating manual
