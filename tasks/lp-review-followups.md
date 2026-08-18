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
- [~] **Registry-type versmallen (`buildSpikePuckConfig`)** — annotatie
      toegepast 2026-08-18, effect ONBEWEZEN (zie hieronder). Origineel: sinds E3 het
      return-type laten inferen (de minimale annotatie brak 149 consumer-
      regels die veld-metadata lezen) instantieert elke consumer een enorm
      anoniem structureel type. Gevolg: de TS-fase van `next build` ging in
      CI door de 4GB-default-heap (heap-bump in `.github/workflows/ci.yml`,
      2026-08-13; kale `tsc --noEmit` past er wél in). Structurele fix: een
      rijke maar benoemde interface die álle door consumenten gelezen
      veld-metadata dekt, of het props-paneel-model loskoppelen van de
      registry-literal.
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
        ⚠️ **Dekking is niet volledig**: `applyStrictTellRewrite` en
        `applySilentIterate` krijgen de signal niet, dus de calls daarbinnen
        (rewrite + twee judge-rescores) zijn alleen op de grens te skippen, niet
        af te breken. Het voorbereidende werk vóór de stream (archetype, angles,
        Exa/S2-stats) draait vóórdat de `Response` bestaat en is niet abortbaar.
        Het JSON-fallback-pad checkt de signal helemaal niet.
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
- [ ] **`persistVariantOptions` read-modify-write-venster**: settings-
      snapshot van vóór een minutenlange SSE-generatie kan een concurrent
      autosave clobberen. Patroon bestond pre-branch; venster is nu langer.
      Fix-voorbeeld staat in `publish/route.ts` (transactionele fresh-read).
- [ ] **Id-loze secties**: PageRender synthetiseert `<type>-<index>`-ids maar
      de kernel matcht alleen echte `props.id` → move/remove/panel zijn dan
      no-ops met misleidende melding. Alle producers zetten ids (gemitigeerd);
      structurele fix: load-time id-backfill of `sectionContentIndex`-
      resolutie in de kernel hergebruiken.
- [ ] **`addSection` met onbekend `afterSectionId`** appendt stil onderaan —
      expliciete `not-found` overwegen (raakt de synthetisch-id-casus).

- [x] **`persistVariantOptions` read-modify-write-venster** — ✅ 2026-08-18.
      De write loopt nu in één interactieve transactie op een VERSE lees-actie;
      de minuten-oude snapshot wordt alleen nog als terugval gebruikt wanneer de
      rij verdwenen is. Zelfde patroon als de GEO-haak in `publish/route.ts`.
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

**Het experiment is niet gedraaid — de bump staat terug.** De opzet was: bump uit,
runner laat oordelen. Er kwam geen Actions-run, en mijn eerste verklaring daarvoor
("een PR die `.github/workflows/**` aanraakt krijgt geen run") **was fout**. De
echte oorzaak: de PR stond op `CONFLICTING` doordat #287 ondertussen op main
landde, en GitHub schedulet geen `pull_request`-run zolang er geen merge-ref te
berekenen valt. Na de rebase liep CI gewoon.

Waarom het experiment dan alsnog niet in deze PR zit: het is een losse vraag met
een eigen risico (een rode build op werk dat verder bewezen is), en de drie andere
items hoeven daar niet op te wachten. Wie het wil weten: haal `NODE_OPTIONS` van
de build-stap in een aparte PR of rechtstreeks op main, en kijk of de stap valt.
Kost één CI-run en beantwoordt de vraag definitief.

De bump op de losse `tsc`-stap is sowieso een andere zaak (brandstyle-stack
#255-#259) en blijft staan.

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
- [ ] Robuustheid-items opgepakt in een reguliere hardening-sessie — **nog open**,
      de zes items hierboven zijn níet van deze ronde

# Out of scope

- Alles wat de review als "Gecheckt en OK" markeerde (auth/isolatie/XSS/
  SSRF-fundamenten) — niet heropenen zonder nieuwe aanleiding.
