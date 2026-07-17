---
id: content-chain-accessor
title: Eén getypeerde accessor voor deliverable-content — de twee content-ketens krijgen één deur
fase: launch
priority: now
effort: 5-8 dagen (3 fasen)
owner: claude-code
status: open
created: 2026-07-17
completed:
related-adr: docs/adr/2026-07-17-deliverable-content-accessor.md
related-spec: -
worktree: branddock-content-chain-accessor
---

# Probleem

Zie ADR [`2026-07-17-deliverable-content-accessor`](../docs/adr/2026-07-17-deliverable-content-accessor.md)
voor de volledige onderbouwing. Kort:

Content woont op **drie** plekken (`DeliverableComponent.generatedContent` = keten A;
`settings.structuredVariant`/`puckData` = keten B; `generatedText` = keten C, dood). Voor de
11 keten-B-types (4 PUCK-webpage + 7 long-form GEO) is keten A **structureel** leeg. Het
type-systeem beveelt de verkeerde keten aan: 240 getypeerde toegangen tot A, 39 rauwe tot B,
en `settings` staat in het schema gedocumenteerd als *"Type-specifieke settings"*.

Vier keer dezelfde bug in acht weken; twee gevonden door een externe tester in zijn eerste
uren. Een sweep vond **21 kruisingen** die nog open staan.

# Voorstel

`getDeliverableContent()` als enige deur, met een discriminated union die exhaustiviteit
afdwingt. `settings` typeren. Rauwe toegang verbieden via ESLint. Gefaseerd over 3 PR's.

# ⚠️ Sequencing — lees dit eerst

Deze task **raakt de bestanden van open PR's**. Start pas als deze gemerged zijn, anders
bouw je een onreviewbare stapel:

| PR | Waarom het botst |
|---|---|
| [#174](https://github.com/erikjager55/Branddock/pull/174) | introduceert `export-deliverable-text.ts` (een proto-accessor) + de `Step4Timeline.allText`-fallback. **Beide worden door de accessor vervangen** — `buildDeliverableBody` gaat op in `getDeliverableContent`. |
| [#177](https://github.com/erikjager55/Branddock/pull/177) | `channel-payload.ts` is bewust het chokepoint waar de accessor inplugt. De guard blijft; alleen de extractie verandert. |
| [#173](https://github.com/erikjager55/Branddock/pull/173) · [#175](https://github.com/erikjager55/Branddock/pull/175) | raken de content-ketens niet; geen conflict. |

# Fase 1 — de accessor (eigen PR)

**Levert**: de deur, nog zonder consumenten. Volledig testbaar in isolatie.

- `src/lib/content/deliverable-content.ts`
  ```ts
  export type DeliverableContent =
    | { kind: 'components'; text: string; byGroup: Record<string, string>; heroImageUrl: string | null }
    | { kind: 'structured'; text: string; variant: PageVariantContent }
    | { kind: 'structured-unchosen'; optionCount: number }
    | { kind: 'empty' };

  export function getDeliverableContent(d: DeliverableLike): DeliverableContent;
  ```
  - Precedentie: componenten-mét-inhoud → gekozen variant → opties-zonder-keuze →
    `generatedText` (legacy-fallback) → empty.
  - **Fail-soft flatten**: `flattenPageVariantToText` itereert rechtstreeks over
    `tldr`/`sections`/`citeableStats`/`qa` en gooit op een half-complete opgeslagen variant
    (gotcha 2026-03-24). De accessor vangt dat en degradeert naar `empty` + warn; hij mag
    nooit een consument 500'en.
- `src/lib/content/deliverable-settings.ts` — `DeliverableSettings`-interface +
  `readDeliverableSettings(json)`-parser (defensief: Prisma-JSON kan alles zijn).
- `prisma/schema.prisma` — comment-correctie op `settings` (*"Type-specifieke settings"* →
  benoemt dat hier content in zit) + `generatedText` markeren als deprecated. **Geen
  schema-wijziging**, dus geen Neon-push.
- ESLint `no-restricted-syntax` op rauwe toegang, met expliciete uitzondering voor de
  accessor-module + de schrijf-paden.
- Smoke: elke `kind`, de flip-staat, half-complete variant, rommelige settings.

**Acceptatie**: `tsc` 0 · `lint` 0 · smoke groen · **de lint-regel vlagt aantoonbaar de 39
bestaande rauwe toegangen** (bewijs dat 'ie discrimineert; die worden in fase 2/3 opgeruimd,
tot dan een `eslint-disable` mét TODO-verwijzing naar deze task).

# Fase 2 — de 9 gebruiker-zichtbare kruisingen (eigen PR)

Elk met een echte verificatie, niet alleen tsc.

| # | pad:regel | leest | wat de gebruiker ziet bij een pillar-page |
|---|---|---|---|
| 1 | `studio/[deliverableId]/publish-to-channel/route.ts:122` | A | **lege post extern** — guard staat (#412), maar publiceert nog steeds niets i.p.v. de content |
| 2 | `content-library/route.ts:208-211,230,246` | C | rood stoplicht + **"No content generated"** op een volle, gepubliceerde pagina; voedt `deriveTrafficLight` + de readiness-filter → verkeerde bucket. `wordCount` is `null` (dood veld) |
| 3 | `lib/claw/tools/read-tools.ts:861-865` | A + C | Brand Assistant: *"deze pagina heeft nog geen content"*, `hasContent: false` — repurpose/samenvat-vragen falen. Dezelfde file heeft op `:985` wél een gate voor `read_landing_page_content` |
| 4 | `features/campaigns/lib/export-zip.ts:40,64` | C | ZIP-export → `<p>No content generated yet.</p>` |
| 5 | `studio/[deliverableId]/auto-iterate/trigger/route.ts:84-140` | A | *"Variant A contains 0 words. At least 50 words are needed…"* (half gepatcht via `suppressAutoIterateCta`) |
| 6 | `studio/[deliverableId]/strict-rewrite/apply/route.ts:84-107` | A | 400 *"No first-variant text components found"* |
| 7 | `studio/[deliverableId]/auto-iterate/apply/route.ts:79-101` | A | idem |
| 8 | `canvas/accordion/Step4Timeline.tsx:100` | A | **gefixt in #174** — migreren naar de accessor |
| 9 | `campaigns/[id]/canvas/export/route.ts:37-66` | A | **gefixt in #174** — migreren; route is bovendien onbereikbaar (`useExportDeliverables` heeft geen consumers) → overweeg verwijderen i.p.v. migreren |

# Fase 3 — de 12 stille kruisingen (eigen PR)

Data- en AI-kwaliteit; geen directe UI-schade, wel structureel.

| # | pad:regel | leest | wat er misgaat |
|---|---|---|---|
| 10 | `lib/learning-loop/content-version.ts:196-201` | A | `snapshotToText` → `beforeText === afterText === ''` → geen diff, `editType = null`. Versie-historie zonder edit-badges. Snapshot zelf is oké (includeert `settings`) |
| 11 | `lib/brand-fidelity/visual-fidelity-scorer.ts:460-475` | A | `fetchSiblingTextContent` → `""` → **hero-beeld wordt gescoord zonder enige copy-context**. Raakt generate-visual/-trained/-compose/refine-visual |
| 12 | `lib/studio/context-builder.ts:211-231` | A | `buildCascadingContext` → lege headline/keyMessage; volgende AI-calls krijgen geen sibling-context |
| 13 | `lib/ai/knowledge-context-fetcher.ts:145-147` | C | pillar-page als knowledge-source → alleen titel + contentType |
| 14 | `lib/ai/persona-prompt-builder.ts:178-179` | C | persona-reactie krijgt geen content-snippet |
| 15 | `api/workspace/export/route.ts:122` | C | GDPR-export: `generatedText: null`; `settings` gaat wél mee (rauwe JSON), `components` ontbreekt volledig |
| 16 | `studio/[deliverableId]/route.ts:51-54` | C | `isTabLocked` false op een volle pagina → tab blijft wisselbaar |
| 17 | `studio/[deliverableId]/context/route.ts:55-58` | C | `hasGeneratedContent` false → gegenereerde pagina krijgt een inheritance-candidate |
| 18 | `studio/[deliverableId]/components/[componentId]/route.ts:82-93` | A | **Puck-edits emitten nooit een LearningEvent** → `feedback-loop-metrics:147` telt LP-edits niet mee. Raakt ook Claw's `update_landing_page_content` |
| 19 | `studio/[deliverableId]/derive/route.ts:43,84-92` | A (dood) | de opgehaalde `components` worden nergens gebruikt (repurpose neemt géén bron-content mee, voor geen enkel type); `cleanSettings` kopieert ongefilterd → een afgeleide instagram-post erft `puckData` als dode ballast |
| 20 | `canvas/FeedbackBar.tsx:40` | A | benigne (Step2 returnt eerder), meenemen voor consistentie |
| 21 | `campaigns/[id]/deliverables/[did]/send/route.ts:93` | C | onbereikbaar (gated op `contentType.includes('email')`) — alleen voor volledigheid |

# De flip — apart afhandelen in fase 1

Long-form defaultt op `['seo']` (`seo-pipeline-utils.ts:22-29`) → `isPuckRenderable` false →
keten A. Vinkt de gebruiker het GEO-doel aan, dan flipt het deliverable naar keten B terwijl
de oude `variantGroups` blijven staan. De accessor moet dan **niet** de verouderde
pre-flip-tekst teruggeven: als er een gekozen structured variant is, wint die — ongeacht wat
er nog aan componenten ligt. Dit is de enige situatie waarin #10 wél een diff produceert, en
dan een verkeerde.

# Bestanden die ik NIET aanraak

- De opslag zelf. Geen datamigratie, geen schema-wijziging (dus geen Neon-push). De accessor
  is een leeslaag.
- `variant-generator.ts` / de generatie-pipelines — die schrijven, de accessor leest.
- De **schrijf**-divergentie (twee ketens schrijven naar verschillende state; de
  publish-DRAFT-bug van 24-06). Aparte beslissing; deze task lost lezen op.

# Smoke test plan

Per fase eigen bewijs. Minimaal:
1. **Fase 1**: unit-smoke over elke `kind` + de flip + half-complete variant + rommelige
   settings. Plus: de lint-regel vlagt de bestaande rauwe toegangen (discriminatie-bewijs).
2. **Fase 2**: per kruising een echte reproductie. Voor #2 en #3 kan dat tegen een lokale
   pillar-page; voor #1 via de bestaande `publish-empty-guard-smoke` uitgebreid met de
   gevulde-payload-case.
3. **Fase 3**: #11 (hero-scoring zonder copy) verdient een echte generatie-run — dat is de
   enige die AI-output beïnvloedt.

Regel uit de gotchas (12-07): **een fix is pas een fix na een echte run van de getroffen
flow.** tsc-groen bewijst hier per definitie niets — beide takken compileren.

# Risico's

- **Grote refactor-oppervlakte** (21 call-sites). Mitigatie: 3 fasen, elk een eigen PR met
  eigen bewijs. Fase 1 raakt geen enkele consument en is dus veilig te mergen.
- **De lint-regel irriteert.** Elke uitzondering moet een bewuste keuze zijn met een comment,
  geen `eslint-disable` uit gemak. Review-punt.
- **`structured-unchosen` dwingt 21 productbeslissingen af** ("wat toon ik als er geen keuze
  is?"). Dat is het doel, maar het is werk en het vraagt Eriks input op minstens #2
  (Content Library-stoplicht) en #3 (Brand Assistant-antwoord).
- **De accessor kan zelf de volgende single point of failure worden.** Mitigatie: hij is puur,
  volledig gesmoked, en de externe randen houden hun eigen vangnet (#412).

# Out of scope

- Storage normaliseren (ADR-alternatieven).
- `generatedText` droppen — aparte opruim-migratie.
- Schrijf-divergentie.
- De onbereikbare `canvas/export`-route: overweeg 'm te verwijderen i.p.v. te migreren, maar
  dat is een aparte beslissing.

# Notes

De sweep die deze inventaris opleverde staat in de sessie-analyse van 17-07. Twee
observaties die makkelijk verloren gaan:

- **`LONG_FORM_SEO_TYPES` heeft 7 leden, niet 6** — `thought-leadership` wordt in de
  ADR-teksten en in mijn eerdere analyses consequent vergeten.
- **`getContentReadiness` is niet stuk, hij beantwoordt de verkeerde vraag.** *"Is deze content
  goed genoeg?"* ≠ *"hebben we iets te versturen?"*. Een score is een proxy; de payload is het
  feit. Dat onderscheid is de reden dat de guard van #412 blijft bestaan náást de accessor.
