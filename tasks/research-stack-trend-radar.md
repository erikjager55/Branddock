---
id: research-stack-trend-radar
title: Trend-radar — Exa + S2 als extra bronlagen in de researcher
fase: post-launch
priority: next
effort: 1-2 dagen
owner: claude-code
status: open
created: 2026-07-15
completed: -
related-adr: - (geen schema/architectuur-wijziging; patroon #402)
related-spec: docs/reports/research-stack-plan-2026-07-15.md
worktree: branddock-research-stack-trend-radar
---

# Probleem

De trend-radar-researcher (`src/lib/trend-radar/researcher.ts`) zoekt uitsluitend via Gemini
`searchWithGrounding`. Dat mist (a) Exa's semantische search met versheid-filters — precies
gebouwd voor "vind opkomende discussies over X" — en (b) academische vroegsignalen via S2
(wetenschap loopt vaak vóór op de markt). De keys zijn sinds 2026-07-15 live en het
verrijkingspatroon is bewezen in Nova (#402).

# Voorstel

Exa en S2 als **optionele extra bronlagen** naast de bestaande grounding-fan-out, exact het
#402-patroon: alleen mét key, fail-soft naar warning, resultaten mee de bestaande
signaal-extractie in. Geen nieuwe pipeline, geen schema-wijziging — de `Signal`-interface
(`signal-extractor.ts`) kent al `SourceType 'research'` en `SourceAuthority`.

# Geverifieerde re-entry-punten (2026-07-15, tegen main)

- `src/lib/trend-radar/researcher.ts` — orchestrator; importeert nu `searchWithGrounding`,
  `generateDiverseQueries` (query-generator.ts), `extractSignalsFromSources`
  (signal-extractor.ts). Dáár komt de fan-out-uitbreiding.
- `src/lib/trend-radar/signal-extractor.ts:15-18` — `SourceType` bevat al `'research'`;
  `Signal`-shape hergebruiken, géén nieuw type.
- `src/lib/exa/exa-client.ts` → `fetchExaContext(queries)`; query-shape
  `{ query, queryLayer }` (zie `exa-queries.ts`). NB: Exa levert context-TEKST + meta,
  geen per-bron-array — voor de radar wil je vermoedelijk wél bronnen; check of
  `fetchExaContext`'s meta bron-URLs bevat, anders een dunne `searchExaSources`-helper
  naast de bestaande client (zelfde API-key-pad, `numResults`-cap, category/date-filters).
- `src/lib/semantic-scholar/scholar-client.ts` → `fetchScholarContext(queries)` — papers
  met titel/abstract/citationCount/jaar; map naar `Signal` met sourceType `'research'`.
- Kostenplaats: de radar draait per workspace-scan; huidige runs zijn Gemini-only.

# Acceptatiecriteria

- [ ] Zonder `EXA_API_KEY`/`S2_API_KEY`: gedrag byte-identiek aan vandaag (regressie-smoke).
- [ ] Mét keys: een trend-scan bevat signalen uit ≥2 bronlagen; Exa-/S2-afkomstige signalen
      dragen correcte `SourceType`/`SourceAuthority` en een echte bron-URL.
- [ ] Fouten in een bronlaag (bv. 429 van S2) degraderen naar een warning; de scan slaagt.
- [ ] Kosten-datapunt in de smoke: volledige scan mét beide lagen ≤ $0,15 boven de baseline.
- [ ] Geen dubbele signalen: dedup over bron-URL heen (bestaand dedup-patroon volgen).
- [ ] `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors
- [ ] Smoke-script `scripts/dev/trend-radar-sources-smoke.ts` met échte scan op de lokale
      BB-workspace (keys staan in `.env.local`)
- [ ] Changelog-entry

# Bestanden die ik aanraak

| Bestand | Wijziging | Risico |
|---|---|---|
| `src/lib/trend-radar/researcher.ts` | extend: Exa+S2-fan-out naast grounding (fail-soft) | medium (levende pipeline) |
| `src/lib/exa/exa-client.ts` óf nieuw `searchExaSources`-helper | alleen als de bestaande meta geen bron-URLs geeft | laag |
| `src/lib/trend-radar/query-generator.ts` | evt. Exa-/S2-specifieke query-varianten (kort, semantisch) | laag |
| `scripts/dev/trend-radar-sources-smoke.ts` | nieuw | — |

# Bestanden die ik NIET aanraak

- `signal-extractor.ts`-interfaces (types volstaan), `trend-scorer.ts`/`trend-judge.ts`
  (scoring ongemoeid), de trend-radar-UI (data-gedreven), `knowledge-research/**` (#402 af).

# Smoke-plan

1. Baseline: scan zonder keys (env leeg-forceren) → output-shape identiek aan main.
2. Volle scan mét keys op lokale BB → signalen uit meerdere lagen, URL's echt, kosten gelogd.
3. S2 kunstmatig laten falen (ongeldige key in env) → warning, scan slaagt.
4. Dedup: zelfde bron via grounding én Exa → één signaal.

# Risico's

- **Exa-client geeft context-tekst, geen bronnenlijst** → check meta éérst; een dunne
  helper is toegestaan, een tweede client niet.
- **S2 rate-limit (1 rps)** → max 2 S2-queries per scan, sequentieel; de client dempt al.
- **Signaal-ruis** → S2-papers onder de bestaande citatie-drempel van de client blijven weg.

# Out of scope

Trend-detectie-algoritme-wijzigingen; UI-veranderingen; historische her-scans; Arena-bron.

# Start-instructie voor de uitvoerende sessie

Lees `CLAUDE.md`+`gotchas.md`, dan deze file. `scripts/dev/worktree.sh research-stack-trend-radar`.
Bestudeer het #402-patroon in `src/lib/knowledge-research/phases/search.ts` vóór je begint.
Werk → gates → smoke → code-reviewer-subagent → PR → merge. Kleine, patroon-getrouwe diff.
