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
- [ ] **Registry-type versmallen (`buildSpikePuckConfig`)**: sinds E3 het
      return-type laten inferen (de minimale annotatie brak 149 consumer-
      regels die veld-metadata lezen) instantieert elke consumer een enorm
      anoniem structureel type. Gevolg: de TS-fase van `next build` ging in
      CI door de 4GB-default-heap (heap-bump in `.github/workflows/ci.yml`,
      2026-08-13; kale `tsc --noEmit` past er wél in). Structurele fix: een
      rijke maar benoemde interface die álle door consumenten gelezen
      veld-metadata dekt, of het props-paneel-model loskoppelen van de
      registry-literal.
- [ ] **SSE-generator + client-disconnect**: `generate-structured-variant`
      luistert niet naar `request.signal` — na weglopen genereert de server
      tot 480s door (tokenkosten). Client mist AbortController op de
      stream-fetch. Route r.745-844.
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
