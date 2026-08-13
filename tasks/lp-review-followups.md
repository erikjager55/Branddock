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

## Retentie / groei (vóór serieus verkeer)
- [ ] **PageEvent-retentie**: geen TTL — tabel groeit onbegrensd (60 events
      /min/IP publiek bereikbaar). Retentie-cron (bv. >13 maanden droppen)
      of maandpartities. `prisma/schema.prisma` model `PageEvent`.
- [ ] **FormSubmission-retentie + AVG-wisroutine**: PII in `data Json`;
      workspace-delete cascadeert al, maar per-submission retentie/erasure
      (verwerkersafspraak!) ontbreekt. Zie ook `tasks/lp-forms-leads.md` §AVG.
- [ ] **PagePublish.compiledHtml-pruning**: elk publish-artifact (volledige
      HTML) blijft append-only bewaard. Pruning-strategie: bv. artifacts
      ouder dan N versies leegmaken (metadata behouden — rollback op de
      laatste N blijft instant; ouder = on-demand hercompile).

## Robuustheid (geen waargenomen impact, wel echt)
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

- [ ] Retentie-items gebouwd of expliciet her-geprioriteerd vóór de eerste
      workspace met >10k events/maand
- [ ] Robuustheid-items opgepakt in een reguliere hardening-sessie

# Out of scope

- Alles wat de review als "Gecheckt en OK" markeerde (auth/isolatie/XSS/
  SSRF-fundamenten) — niet heropenen zonder nieuwe aanleiding.
