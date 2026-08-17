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
      retentie ná 26 maanden is geen antwoord op "wis mijn gegevens nú"). De wis
      draait als `deleteMany` over de scope-`where` van de GET mét het id erbij,
      niet als `delete` op id alleen: een id buiten de eigen workspace raakt 0
      rijen en levert 404. Vast window, niet per workspace — zie ADR §Windows.
- [x] **PagePublish.compiledHtml-pruning**: nieuwste 5 versies per pagina houden
      hun HTML, ouder → `null`; `puckData` en metadata blijven, dus rollback werkt
      via het bestaande runtime-fallback-pad. **De live versie wordt altijd
      overgeslagen, ook buiten de nieuwste 5** — rollback is een pointer-swap, dus
      de live versie is niet altijd de nieuwste; zonder die uitzondering verliest
      juist de live pagina haar bevroren artifact.

**Bewijs**: `npm run smoke:lp-retention` → **20/20** tegen een echte Postgres
(9 pure checks incl. de live-pointer-casus, 11 DB-checks). Cron end-to-end:
401 zonder token, 401 met verkeerd token, en met 7 oude events / 3 oude
submissions / 8 publishes gezaaid → `{"pageEvents":7,"formSubmissions":3,
"compiledHtml":3}`, daarna 0 events, 0 submissions, 5 publishes mét HTML,
3 zonder, `puckData` intact op alle 8. `tsc` 0 errors · `lint` 0 errors.

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
      workspace met >10k events/maand — gebouwd 2026-08-17 (ADR + cron + smoke 20/20)
- [ ] Robuustheid-items opgepakt in een reguliere hardening-sessie — **nog open**,
      de zes items hierboven zijn níet van deze ronde

# Out of scope

- Alles wat de review als "Gecheckt en OK" markeerde (auth/isolatie/XSS/
  SSRF-fundamenten) — niet heropenen zonder nieuwe aanleiding.
