---
id: lp-review-followups
title: Webpage-builder — uitgestelde review-bevindingen (2-reviewer-ronde 2026-08-13)
fase: launch
priority: next
effort: verspreid, per item 0.5-2u
owner: unassigned
status: open
created: 2026-08-13
completed: -
related-adr: docs/adr/2026-08-07-puck-exit-sectie-editor.md
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md
worktree: -
---

# Probleem

De pre-merge review-ronde (2 parallelle code-reviewers over de volledige
branch-diff, 2026-08-13) vond 0 CRITICAL en 5 MAJOR. Alle MAJORs plus de
goedkope MINORs zijn vóór de merge gefixt (zie commit "review-ronde
webpage-builder"). Dit bestand bewaart de bewust uitgestelde restpunten —
geen launch-blockers, wel afmaken vóór volume-groei.

# Openstaande items

## Retentie / groei (vóór serieus verkeer) — ✅ AF 2026-08-17

Gebouwd volgens [ADR 2026-08-17](../docs/adr/2026-08-17-landing-page-data-retention.md).
Eén dagelijkse cron `/api/cron/lp-retention` (02:00) doet alle drie de stappen,
windows in `src/lib/landing-pages/retention-policy.ts`.

- [x] **PageEvent-retentie**: 13-maands-window, batched delete (5.000/batch met
      lus-cap, geen `deleteMany` over de hele tabel). Gekozen boven maandpartities
      omdat het dashboard maar 30 dagen leest — partitionering is pas interessant
      voorbij ~10k events/maand.
- [x] **FormSubmission-retentie + AVG-wisroutine**: 26-maands-window plus
      `DELETE .../submissions?id=…` voor een individueel wisverzoek (art. 17 —
      retentie ná 26 maanden is geen antwoord op "wis mijn gegevens nú"). Drie
      lagen: rol (owner/admin), scope (`deleteWhere`, striktere variant van de
      lees-scope) en vorm (`deleteMany` mét id, niet `delete` op id alleen → 404).
      Vast window, niet per workspace — zie ADR §Windows.
      Verweesde rijen (dood `landingPageId` na een deliverable-delete) zijn wél
      leesbaar en worden nu ook gewist — dat gat was echt.
      ⚠️ **Bekende grens**: een submissie zónder `landingPageId` wiens sectie-id
      niet meer in enige draft-tree staat matcht geen scope-tak; wissen is voor
      die rijen ruwe SQL. Zie ADR §Consequences.
- [x] **PagePublish.compiledHtml-pruning**: nieuwste 5 versies per pagina houden
      hun HTML, ouder → `null`; `puckData` en metadata blijven, dus rollback werkt
      via het bestaande runtime-fallback-pad. **De live versie wordt altijd
      overgeslagen, ook buiten de nieuwste 5** — rollback is een pointer-swap, dus
      de live versie is niet altijd de nieuwste; zonder die uitzondering verliest
      juist de live pagina haar bevroren artifact.

**Bewijs**: `SMOKE_DB=1 npm run smoke:lp-retention` → **47/47** tegen een echte
Postgres (23 puur, 24 DB). Zeven mutatietests, elk gemeten, met het aantal checks
dat valt: live-pointer uit de pure functie (3), `retentionCutoff` naïef zonder
clamp én guard (8), `workspaceId` uit de wis-scope (1), vensters verwisseld (1),
live-uitsluiting uit het SQL (2), venster telt rijen i.p.v. artifacts (3),
`months`-guard weg (4). Cron na elke wijzigingsronde opnieuw end-to-end: 401
zonder token, 401 met verkeerd token, 200 met `truncated` per stap.
`tsc` 0 errors · `lint` 0 errors.

**Na drie reviewrondes bijgesteld** (3 blockers, 31 warnings): afkapdatum clampte
niet op maandeinden (wiste tot 3 dagen te veel), HTML-pruner sloeg alles voorbij
4.000 pagina's stil over, `viewer` kon lead-PII wissen, de smoke was zelf een
tabelbreed wisscript, twee `createdAt`-indexen ontbraken (énige schemawijziging,
additief), afgekapte runs waren niet te onderscheiden van voltooide, en de
IDOR-garantie werd door geen enkele check gedekt. Ronde 3 vond bovendien dat het
venster publish-rijen telde in plaats van beschikbare artifacts (een pagina wier
vijf nieuwste compiles faalden verloor élk artifact) en dat verweesde submissies
wél leesbaar maar niet wisbaar waren. Details in changelog #474.

## Robuustheid (geen waargenomen impact, wel echt)
- [→] **Registry-type / build-heap** — verplaatst naar een eigen taak:
      [`build-heap-investigation`](build-heap-investigation.md). De annotatie is
      toegepast (#295) en de hypothese is gemeten weerlegd (#302); wat overblijft is
      een geheugenonderzoek, geen typing-klus. Origineel: sinds E3 het
      return-type laten inferen (de minimale annotatie brak 149 consumer-
      regels die veld-metadata lezen) instantieert elke consumer een enorm
      anoniem structureel type. Gevolg: de TS-fase van `next build` ging in
      CI door de 4GB-default-heap (heap-bump in `.github/workflows/ci.yml`,
      2026-08-13; kale `tsc --noEmit` past er wél in). Structurele fix: een
      rijke maar benoemde interface die álle door consumenten gelezen
      veld-metadata dekt, of het props-paneel-model loskoppelen van de
      registry-literal.
- [ ] **Turnstile op het publieke form-endpoint** (`/api/f/[formId]`) — de
      gedocumenteerde volgende trede bóven honeypot + timing + gelaagde
      rate-limits (zit er al in). Pas bouwen bij waargenomen spam-druk;
      bron: spec §Deploy-notities + `tasks/done/lp-forms-leads.md`.
- [x] **SSE-generator + client-disconnect** — ✅ 2026-08-17. Beide helften waren
      nodig: in de SPA unmount de component bij wegnavigeren, maar de browser
      verbreekt de fetch dan niet vanzelf, dus zonder client-abort ging de
      server-`signal` nooit af.
      - Client: `AbortController` per deliverable in een module-scope registry
        (`src/features/campaigns/lib/generation-abort-registry.ts`), NIET in het
        generatieblok. ⚠️ Dat was de eerste opzet en die was een kostenregressie:
        `HorizontalAccordion` rendert maar één stap, dus een gewone tabwissel
        unmount het blok → abort → betaalde varianten weg → en bij terugkomst
        kocht de auto-trigger ze opnieuw. Duurder dán niet aborteren. Nu breekt
        alleen het verlaten van de Canvas af (`CanvasPage`-unmount), met een
        gracieperiode van 250ms zodat React StrictMode's cleanup→setup in dev
        geen generatie per Canvas-opening weggooit.
      - Een nieuwe generatie voor hetzelfde deliverable breekt de vorige af —
        anders draaien er twee en betaal je beide.
      - Run-teller i.p.v. controller-identiteit voor het opruimen van UI-state:
        na een abort van buitenaf moet `isGenerating` alsnog terug naar false,
        anders blijft er een spinner hangen die nooit meer weggaat.
      - Server: `request.signal` doorgegeven; guards vóór volgende slot,
        recovery-retry, rewrite, tussen rewrite en iterate, en persist.
        ⚠️ ~~**Dekking is niet volledig**~~ — **gedicht 2026-08-18**, zie
        §Dekkingsgaten en §Voorwerk hieronder.
      - Signal doorgezet tot in `generateLandingPageVariant` →
        `anthropicClient.createChatCompletion` (dat ondersteunde `abortSignal` al),
        dus de lopende call van 30-90s wordt afgebroken. ⚠️ Die call is
        niet-streamend, dus dat scheelt latency — of het ook geld scheelt hangt af
        van de billing bij abort en is niet bewezen. De harde besparing zit in
        calls die nooit starten.
      - **Bij abort wordt niets gepersisteerd** (Erik-keuze 17-08): de
        settings-snapshot is dan minuten oud en de gebruiker kijkt niet, dus een
        overschreven autosave zou pas veel later opvallen — het venster hieronder
        staat nog open. Prijs: al betaalde varianten gaan verloren.
      - Kosten van een gedraaide generatie worden nog wél geboekt
        (`trackVariantGeneration` staat vóór de skip-guard). Een halverwege
        afgebroken call is niet te boeken (geen resultaat-object) — die input-tokens
        vallen dus buiten de meting.
      - ⚠️ Bijvangst-bug gevonden en gefixt: een abort vóór de server-response zette
        `fallbackToJson`, waarna het JSON-pad **alles opnieuw** genereerde — dubbele
        kosten in precies het scenario dat goedkoper moest worden.
      - **Bewijs**: `npm run smoke:lp-generation-abort` **8/8** — dekt de laag die
        zónder AI-key te verifiëren is (wie breekt wat af, overleeft een run een
        stapwissel, StrictMode-simulatie, gracieperiode). Mutatietest: gracieperiode
        weghalen laat 2 checks vallen.
      - ⚠️ **De generatie-keten zelf is niet end-to-end geverifieerd**: `tsc` 0 en
        `lint` 0, maar er is géén AI-key in de dev-container en een echte proef kost
        een echte generatie.
        **Handmatige check voor Erik**: start een 4-variant-generatie op een webpage,
        navigeer na de eerste `variant_complete` weg uit de Canvas, en kijk in de
        server-log naar `client disconnected`. Verwacht: die regel verschijnt, er
        volgen géén verdere `variant_started`, en `structuredVariantOptions` in
        `settings` is onveranderd.

- [x] **`persistVariantOptions` read-modify-write-venster** — ✅ 2026-08-18,
      changelog #482. Bleek de hele settings-schrijflaag te zijn: **tien**
      schrijvers met dezelfde vorm, niet één. Alle tien lopen nu via
      `updateDeliverableSettings()` (`src/lib/content/update-deliverable-settings.ts`),
      die de rij leest onder `SELECT … FOR UPDATE`.
      ⚠️ Het fix-voorbeeld waar dit item naar verwees (`publish/route.ts`) sloot
      de race **niet**: een kale transactie neemt onder READ COMMITTED geen lock,
      dus beide schrijvers lazen de oude blob en de laatste won alsnog.
      Bewust niet omgezet: de versie-restore in `content-version.ts` (vervangt de
      blob per definitie — geen read-modify-write) en `scripts/regenerate-linfi-puckdata.ts`
      (eenmalig onderhoudsscript, geen gelijktijdigheid).
      Rest-beperking: `regenerate-puck-data` merget nog met de `puckData` van vóór
      de regeneratie — de lock beschermt de ándere sleutels, niet dezelfde.
      Bewijs: `SMOKE_DB=1 npm run smoke:settings-write` 8/8 incl. mutatietest
      (zonder lock móet er een sleutel sneuvelen), `smoke:hero-clobber-guard` 29/29.
- [x] **Id-loze secties** — ✅ 2026-08-18. `sectionContentIndex` is naar de
      kernel verhuisd (`section-edit-tools`) en is nu de énige id-resolutie in
      het edit-pad; `preview-edit-matching` re-exporteert hem. Geen load-time
      backfill: dat schrijft naar opgeslagen data om een leesprobleem op te
      lossen. De terugval blijft streng — een sectie mét eigen id is nooit via
      een synthetisch id te raken, want een edit op de verkéérde sectie is erger
      dan een geweigerde edit.
- [x] **`addSection` met onbekend `afterSectionId`** — ✅ 2026-08-18. Geeft nu
      `after-section-not-found` i.p.v. stil onderaan te appenden, mét uitleg in
      de Claw-melding. Géén anker meegeven blijft gewoon appenden; dat is een
      expliciete keuze van de caller. Samen met de vorige fix is dit méér dan
      een melding: een sectie toevoegen ná een id-loze sectie belandde altijd
      onderaan en meldde succes.

## ✅ Robuustheid — drie van vier af, 2026-08-18

Drie items zijn gefixt en gesmoked; het vierde is toegepast maar niet te
bewijzen. De SSE-disconnect zit in [#287](https://github.com/erikjager55/Branddock/pull/287)
(andere sessie) en is hier bewust niet aangeraakt.

**Wat de eerste twee samen oplossen is groter dan hun beschrijving.** Ze werden
opgeschreven als "misleidende melding", maar het gedrag was erger: een sectie
toevoegen ná een id-loze sectie belandde onderaan en meldde succes. Met de
kernel-resolutie landt hij waar je aanwijst; met de strengere `addSection`
krijgt een écht verdwenen anker een weigering in plaats van een stille verhuizing.

**Bewijs**: `scripts/smoke-tests/section-edit-synthetic-ids.ts` → **23/23**,
inclusief de strengheidsgarantie (een sectie mét eigen id is niet synthetisch
bereikbaar) en het behoud van de verplichte-sectie-guard. De vier aangeraakte
webpage-builder-smokes blijven groen (21/21, 68/68, 20/20). `tsc` 0 · `lint` 0.

### ⚠️ Item 1 — annotatie toegepast, effect niet aangetoond

`buildSpikePuckConfig` heeft nu een benoemd retourtype. Niet een nieuw type:
`SectionLibraryConfig<SpikePuckProps>` bestond al sinds E3 en is daar zelfs
gedocumenteerd als *"de registry-shape zoals `buildSpikePuckConfig` hem
teruggeeft"* — de builder was er alleen nooit mee geannoteerd. De 149
consumer-regels uit de oorspronkelijke beschrijving zijn er niet meer: het
props-paneel leest sinds E3 via `SectionRegistryMeta`, dus er brak nog maar één
klasse casts in smoke-tests (18 stuks, nu via `unknown` of via de lees-deur).

**Maar het claimde probleem reproduceert hier niet.** Twee metingen:

| Meting | Zonder annotatie | Met annotatie |
|---|---|---|
| `tsc --noEmit --extendedDiagnostics` (koud) | 9.059.620 instantiaties · 3,98 GB | 9.059.610 instantiaties · 3,99 GB |
| `next build` met `--max-old-space-size=4096` | **slaagt** | **slaagt** |

Tien instantiaties verschil, en de build die zonder annotatie zou moeten
omvallen doet dat niet. Dat is geen tegenspraak met de bevinding van 13-08 — de
comment bij de tsc-stap in `ci.yml` zegt het zelf: *"Lokaal viel dat niet op —
macOS schaalt de heap mee met het beschikbare RAM, de runner niet."* Alleen de
runner kan dit beantwoorden.

**Het experiment is gedraaid (#302, 2026-08-18) en de hypothese is WEERLEGD.**
Met de annotatie uit #295 erin en de heap-bump eraf viel de build-stap alsnog om,
in exact dezelfde fase als in augustus:

```
Running TypeScript ...
Mark-Compact 4028.2 (4130.1) -> 4013.4 (4130.9) MB
FATAL ERROR: Ineffective mark-compacts near heap limit
```

De anonieme structurele inferentie over de 22-component-registry was dus **niet
de oorzaak** — of in elk geval niet de enige. Dat is de winst van deze run: de
bewering "type-versmalling is de echte oplossing" stond sinds 13-08 als feit in
`ci.yml` zonder dat iemand haar had getoetst, en is nu vervangen door de meting.

De bump staat terug (met het bewijs erbij in de comment). **Wat de annotatie wél
opleverde blijft staan** — de registry heeft nu een benoemd contract in plaats van
een geïnfereerd type dat iedere consument opnieuw instantieert, en de smokes lezen
via datzelfde contract.

**Volgende stap voor wie dit oppakt**: eerst méten waar het geheugen heen gaat
(`tsc --generateTrace` op de build-tsconfig, of `--extendedDiagnostics` per
project-subset), niet opnieuw een type versmallen op gevoel. Let op dat lokaal
meten misleidt: macOS schaalt de heap mee met het RAM, dus een 4GB-build slaagt
hier ook zónder fix.

De bump op de losse `tsc`-stap is een andere zaak (brandstyle-stack
#255-#259) en blijft staan.

## ✅ Dekkingsgaten SSE-abort — gedicht 2026-08-18

De drie gaten die het SSE-item zelf noteerde zijn dicht. Alle drie hadden dezelfde
vorm: een betaalde call die doorliep nadat de client al weg was.

- **`applyStrictTellRewrite`** — guard bovenaan plus `abortSignal` doorgegeven aan
  de Anthropic-call. De ongewijzigde variant is een geldige uitkomst: STRICT is
  een verbetering, geen voorwaarde.
- **`applySilentIterate`** — drie guards, want dit zijn drie betaalde calls
  (judge-score → rewrite → rescore), niet één. De guard vóór de rescore laat
  bewust de originele variant staan: zonder rescore weet keep-if-better niet of
  de rewrite beter is, dus faalt hij veilig.
- **JSON-fallback-pad** — checkte de signal helemaal niet. `abortSignal` gaat nu
  mee in `generateLandingPageVariantBatch` (die gaf 'm niet door, terwijl
  `generateLandingPageVariant` het al ondersteunde), en de optionele
  post-processing wordt overgeslagen bij een afgebroken run.
  ⚠️ **Bewust wél persisteren op dit pad**: de batch is all-or-nothing, dus een
  voltooide batch is volledig én betaald. Weggooien zou de gebruiker bij
  terugkomst dezelfde varianten opnieuw laten kopen. Dat is een andere afweging
  dan bij het streaming-pad, waar een deel-resultaat wél onvolledig kan zijn.

**Wat dit bewijst — en wat niet.** `abortSignal` is een **verplicht** veld op
`VariantPostProcessArgs`, dus geen enkel toekomstig codepad kán 'm vergeten; dat
is een compile-time-garantie, geen afspraak. Mutatietest: het veld uit `postArgs`
halen geeft `error TS2741: Property 'abortSignal' is missing … but required in
type 'VariantPostProcessArgs'` op de juiste regel. De runtime-guards zelf zijn
early-returns zonder automatische dekking — ze zijn niet los te testen zonder de
route-interne functies te exporteren, en een test tegen een nagebouwde kopie zou
niets bewijzen. `npm run smoke:lp-generation-abort` 13/13 (regressie op de
client-registry), `tsc` 0, `lint` 0.

**Beslissing van Erik, 2026-08-18 — ✅ GEBOUWD.** De keuze van 17-08 om bij een
abort níets te persisteren is herzien: er wordt bewaard **vanaf 2 varianten**. De
grond onder de oude keuze was het openstaande read-modify-write-venster, en dat is
gesloten met de rijlock uit #299. Onder de twee is bewaren duurder dan weggooien
(1 + 2 = 3 calls tegen 2), vanaf twee heeft de gebruiker een echte vergelijking.
Zie §Tak-consolidatie hieronder.

## ✅ Tak-consolidatie `claude/sse-abort-disconnect` — afgerond 2026-08-18

Die tak hoorde bij PR #287, die op 17-08 **squash**-gemerged is; daarna zijn er
commits bovenop gezet. Daardoor leek hij zeven commits groot terwijl **vijf van de
acht bestanden inhoudelijk al identiek aan main** waren. Alleen een contentdiff
laat dat zien — een commit-lijst niet.

**Eén deur, niet twee.** De tak bevatte `merge-deliverable-settings.ts`: een tweede
oplossing voor dezelfde race als `update-deliverable-settings.ts` (#299), met
woordelijk dezelfde diagnose in de header — `jsonb ||` tegenover
`SELECT … FOR UPDATE`. Twee sessies, dezelfde bug, twee medicijnen. Bewust **niet**
overgenomen: de gemergde helper dekt 11 call-sites en laat de nieuwe waarde in JS
berekenen. Wel het waard om vast te leggen: #299 verwierp expliciet `jsonb_set`
omdat "de call-sites hele objecten mergen" — maar `jsonb ||` mergt juist wél hele
objecten, dus díe afwijzingsgrond raakte deze variant nooit. De keuze staat op
call-site-dekking en composeerbaarheid, niet op die redenering.

**Wat er wél is overgenomen** — als gedrag, niet als code, want `route.ts` is sinds
die tak flink veranderd (#299 + #322):
- `MIN_PERSISTABLE_PARTIAL` en de krimp-guard staan nu in
  [`src/lib/landing-pages/partial-variant-persist.ts`](../src/lib/landing-pages/partial-variant-persist.ts).
  Apart module omdat het een productregel codeert, en omdat het zo toetsbaar is
  zonder de route te booten.
- De guard draait **binnen** de `mutate`-callback van de helper, dus op de verse
  waarde ónder de rijlock. Buiten de lock zou er een venster zitten waarin de set
  alsnog groeit tussen check en write.
- `abortedEarly` markeert de set in `structuredGenerationMeta`, zodat een consument
  een deel-resultaat kan herkennen.

**Bewijs**: `SMOKE_DB=1 npm run smoke:settings-write` **19/19** (was 8/8), met een
nieuwe sectie D. Inclusief mutatietest: met de guard-tak uit móet de vollere set
sneuvelen — doet hij dat niet, dan meet de scène niets en faalt de smoke.

⚠️ **De tak `claude/sse-abort-disconnect` is hiermee volledig achterhaald** en kan
weg. Niet zelf verwijderd: hij is niet van deze sessie.

## ✅ Voorwerk vóór de stream — 2026-08-18, en de oude claim was onjuist

Dit item stond genoteerd als **niet oplosbaar**: *"het voorbereidende werk draait
vóórdat de `Response` bestaat en is niet abortbaar."* Die redenering klopt niet.
`request.signal` hangt aan het **inkomende verzoek**, niet aan het antwoord — er is
geen reden waarom hij op een Response zou wachten.

**Gemeten in plaats van aangenomen.** Een kale probe-route (Next 16, node-runtime,
`next dev`) die in een lus `request.signal.aborted` logt, beide armen gedraaid:

| Scenario | Uitkomst |
|---|---|
| client blijft hangen (controle) | `signal NOOIT afgegaan in 10035ms` |
| client loopt na 2s weg | `signal.aborted=true na 2005ms, vóór enige Response` |

De controle-arm is het punt: zonder die eerste regel zou "hij vuurt" ook kunnen
betekenen dat de probe altijd `true` meldt. Terzijde, de eerste opzet gaf een 404
omdat de map `_probe-abort` heette — een `_`-prefix maakt er in Next een privémap
van die niet gerouteerd wordt. Een probe die niets vindt is eerst een verdenking
tegen de probe.

**Gebouwd**: drie guards op de grenzen van het voorwerk, vóór respectievelijk de
archetype-classificatie, de Gemini-call voor de creative angles, en — bij long-form
GEO — het Exa/S2-onderzoek. Dat laatste is de duurste stap van het hele voorwerk.
Antwoord is `499` (nginx-conventie voor "client closed request"); er is geen
standaard, en er is ook niemand meer om het te lezen. Het gaat om het stoppen en om
een logregel die verklaart waarom er geen generatie kwam.

⚠️ **Wat dit niet bewijst**: de meting is lokaal, op de node-runtime. Op Vercel
(serverless/Fluid) kan het anders liggen. Dat is geen risico — vuurt de signal daar
niet, dan zijn de guards inert en gedraagt de route zich als voorheen. Wil je het
zeker weten, herhaal de probe tegen een preview-deployment; hij is in twee minuten
nagebouwd met de tabel hierboven als ijkpunt.

## Bewuste niet-fixes (gedocumenteerd, geen actie)
- **`cta_click`-events**: uit het publieke `/api/t`-enum gehaald (spoofbaar);
  pas terugbrengen mét signed payload wanneer click-metingen gewenst zijn.
- **Nav-labels (Footer/BrandNav/AnchorNav) buiten sectie-AI**: navigatie is
  geen herschrijfbare copy — bewust contract in component-edit.
- **Pre-existing 🔒-emoji in PageDiffPreviewModal:237**: regel niet van deze
  branch; opruimen bij eerstvolgende aanraking van dat bestand.

# Acceptatiecriteria

- [x] Retentie-items gebouwd of expliciet her-geprioriteerd vóór de eerste
      workspace met >10k events/maand — gebouwd 2026-08-17 (ADR + cron + smoke 47/47)
- [~] Robuustheid-items opgepakt in een reguliere hardening-sessie — **grotendeels**:
      de SSE-dekkingsgaten zijn gedicht (18-08, §Dekkingsgaten). Nog open: alleen Turnstile,
      en dat is een bewuste gate op waargenomen spam-druk — geen restwerk. Het
      voorwerk vóór de stream is per 18-08 wél afbreekbaar (§Voorwerk); de
      tak-consolidatie is afgerond. Het registry-type
      is verhuisd naar [`build-heap-investigation`](build-heap-investigation.md)

# Out of scope

- Alles wat de review als "Gecheckt en OK" markeerde (auth/isolatie/XSS/
  SSRF-fundamenten) — niet heropenen zonder nieuwe aanleiding.
