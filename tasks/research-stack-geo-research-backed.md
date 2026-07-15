---
id: research-stack-geo-research-backed
title: GEO long-form — research-backed citeableStats (Exa + S2) in de generatie
fase: post-launch
priority: next
effort: 2-4 dagen
owner: claude-code
status: open
created: 2026-07-15
completed: -
related-adr: - (generatie-verrijking; F-VAL/GEO-scoring ongemoeid — geen ADR nodig, wél stop-and-ask bij scoring-wijzigingen)
related-spec: docs/reports/research-stack-plan-2026-07-15.md
worktree: branddock-research-stack-geo
---

# Probleem

GEO-long-form-artikelen leven van citeerbaarheid: `citeableStats` (cijfers mét bron) zijn
een van de hoogst gewogen GEO-signalen (`citedStats` in de scorer). Maar de stats komen nu
uit het model zelf plus workspace-kennis (`buildGeoKnowledgeContext`) — het model kán geen
échte actuele bronnen citeren en de source-sanitizer (`sanitize-geo-sources.ts`) moet
verzonnen bronnen juist wégpoetsen. Met Exa (actuele webcijfers) en S2 (peer-reviewed)
kunnen stats bij generatie op échte, verifieerbare bronnen steunen — een directe
versterking van de GEO-differentiator.

# Voorstel

Een **research-verrijkingsstap vóór de structured-variant-generatie**: haal per artikel-
onderwerp een klein pakket kandidaat-stats op (Exa + S2, fail-soft), lever die als
"verified source material" in de generatie-prompt, en instrueer het model `citeableStats`
bij voorkeur dááruit te putten (met echte bron-URL/naam+jaar). De sanitizer en de
GEO-scoring blijven ongewijzigd — er verandert alleen wat het model als grondstof krijgt.

# Geverifieerde re-entry-punten (2026-07-15, tegen main)

- Generatie-route: `src/app/api/landing-pages/[deliverableId]/generate-structured-variant/route.ts`
  — het levende pad voor long-form GEO (zie ook de re-entry-verificatie in
  `tasks/done/agent-seo-watchdog.md`).
- Bestaande context-injectie: `src/lib/landing-pages/geo-knowledge-context.ts`
  (`buildGeoKnowledgeContext`, `GeoContextItem`) — de natuurlijke plek om het
  research-pakket aan toe te voegen of naast te leggen (zelfde aanlevervorm).
- Schema: `longFormGeoVariantSchema` (`page-type-schemas.ts`) — `citeableStats[]` met
  `{ label, value, source?: string|null }`; source is bewust optioneel (gotcha: geforceerde
  bron dwong het model tot verzinnen — die les blijft leidend: échte bron of géén bron).
- Bron-hygiëne: `src/lib/landing-pages/sanitize-geo-sources.ts` (`cleanStatSource`) —
  NIET versoepelen; de verrijking moet bronnen aanleveren die deze filter overleven.
- Scoring: `computeGeoScore`/`citedStats` (`brand-fidelity/geo-fidelity-scorer.ts`) —
  read-only referentie; wijzigingen hier = stop-and-ask.
- Clients: `fetchExaContext` + `fetchScholarContext` (patroon #402).

# Contract (Integration-First)

Nieuwe pure-ish module `src/lib/landing-pages/research-stats.ts`:

```ts
interface ResearchStatCandidate {
  label: string;        // wat het cijfer beschrijft
  value: string;        // het cijfer/bereik, letterlijk uit de bron
  source: string;       // "Bron (jaar)" of domeinnaam — moet cleanStatSource overleven
  sourceUrl?: string;   // voor de prompt-context; komt NIET in het schema (schema kent geen url)
  origin: 'exa' | 'scholar';
}
fetchResearchStatCandidates(topic: string, opts?: { max?: number }): Promise<ResearchStatCandidate[]>
```
Fail-soft: zonder keys of bij fouten → lege array (generatie identiek aan vandaag).
Prompt-injectie: apart, duidelijk gelabeld blok ("Verified source material — prefer these
for citeableStats; never invent sources beyond this list"), content-afgeleide strings
gefenced als het pad via agent-context loopt (directe generatie-prompt: label het blok).

# Acceptatiecriteria

- [ ] Mét keys: een gegenereerd GEO-artikel bevat ≥1 `citeableStat` waarvan label+value
      herleidbaar zijn tot het aangeleverde research-pakket (smoke vergelijkt).
- [ ] Zonder keys: generatie-uitkomst-shape identiek aan vandaag (regressie).
- [ ] De GEO-score (`citedStats`-signaal) van een verrijkt artikel ≥ baseline-artikel over
      hetzelfde onderwerp (één A/B-datapunt in de smoke, geen formele studie).
- [ ] Geen verzonnen bronnen: elk source-veld in de output matcht het pakket óf is leeg
      (steekproef in de smoke); `cleanStatSource` blijft ongewijzigd.
- [ ] Kosten-datapunt: verrijking ≤ $0,05 bovenop de generatie; totale generatie-tijd
      +≤15s (de stap draait vóór/parallel aan de bestaande context-bouw).
- [ ] F-VAL/GEO-scoring-code ongewijzigd (diff-check in review).
- [ ] `npx tsc --noEmit` 0 · `npm run lint` 0 · smoke met echte generatie · changelog-entry

# Bestanden die ik aanraak

| Bestand | Wijziging | Risico |
|---|---|---|
| `src/lib/landing-pages/research-stats.ts` | **nieuw** — kandidaat-stats via Exa+S2 | medium |
| `src/app/api/landing-pages/[deliverableId]/generate-structured-variant/route.ts` | extend: pakket ophalen + in prompt-context leggen | **hoog** (levende generatie-route — kleine, additieve diff) |
| prompt-bron van de structured-variant (volg de route naar de prompt-builder) | extend: gelabeld source-material-blok + instructie | medium |
| `scripts/dev/geo-research-stats-smoke.ts` | nieuw | — |

# Bestanden die ik NIET aanraak

- `geo-fidelity-scorer.ts`, `geo-analysis.ts`, `sanitize-geo-sources.ts`,
  `page-type-schemas.ts` (schema ongewijzigd — géén sourceUrl-veld toevoegen zonder
  aparte beslissing), publish-route, Iris/seo-watchdog.

# Smoke-plan

1. Unit: `fetchResearchStatCandidates` — keyless → [], met keys → kandidaten waarvan
   source `cleanStatSource` overleeft.
2. Echte generatie op lokale BB (long-form GEO-deliverable, onderwerp met meetbaar veld,
   bv. merkconsistentie-ROI) mét en zónder verrijking → vergelijk citeableStats + GEO-score.
3. Regressie: bestaande LP-types (faq/product/microsite) ongemoeid — genereer er één.
4. Kosten + latency loggen.

# Risico's

- **Model negeert het pakket** → instructie hard formuleren + smoke-check; desnoods het
  pakket als few-shot-voorbeeld in het stats-deel van de prompt.
- **Bron-kwaliteit** (Exa kan blogs aandragen) → filter in de module: voorkeur S2 >
  major publications; snippet moet het cijfer daadwerkelijk bevatten (string-check).
- **Latency-optelling** → parallel met `buildGeoKnowledgeContext` draaien (Promise.all).
- **Dit raakt de duurste, zichtbaarste flow** → kleine additieve diff, uitgebreide
  regressie-smoke, review-subagent verplicht.

# Out of scope

sourceUrl in het publieke schema/JSON-LD, her-verrijking van bestáánde artikelen
(Iris-territorium), niet-GEO-content-types, bronvermelding-UI in de canvas.

# Start-instructie voor de uitvoerende sessie

Lees `CLAUDE.md`+`gotchas.md`, dan deze file. Trace éérst de generate-structured-variant-
route tot aan de prompt-builder en noteer het exacte injectiepunt vóór je code schrijft
(de file-tabel hierboven laat dat bewust open). `scripts/dev/worktree.sh
research-stack-geo`. Werk → gates → smoke (mét A/B-datapunt) → code-reviewer-subagent →
PR → merge.
