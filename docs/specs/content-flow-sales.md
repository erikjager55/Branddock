# Content-flow analyse — Sales Enablement

> **Status**: ingevuld 2026-05-29 · sub-sprint **#7.A** · methode: code-audit
> **Types (4, "Sales Enablement")**: `sales-deck` · `one-pager` · `proposal-template` · `product-description`
> Bron: `deliverable-types.ts:878-917` · template-registry `prompt-templates/sales.ts`

## 1. Pipeline-doorloop — category-specific checkpoints

Standaard angle-based dual-call pad (`canvas-orchestrator.ts:175`). Geen Plan-and-Solve, geen SEO.

- `proposal-template` is lang (1000-5000w) maar krijgt geen multi-stage Plan-and-Solve pad → enige lange type buiten long-form/website dat structureel single-pass blijft.
- `validateVariantOutput` (`checkpoint-gates.ts:205`) bewaakt sectie-structuur (deck-slides, 1-pager beknoptheid).
- 8 gates universeel; geen sales-specifieke gate.

## 2. Prompt-quality

- **Bestand**: `src/lib/studio/prompt-templates/sales.ts` — 302 regels (kleinste categorie-bestand), `PROMPT_VERSION 1.2.0`.
- **Alle 4 types hebben een dedicated template** (`sales-deck`, `one-pager`, `proposal-template`, `product-description`) — geen generieke fallback. Template-set matcht 1-op-1 de deliverable-types.
- **Few-shot**: ≈8 example-referenties — rijk voor de bestandsgrootte (≈2 per type).
- Gedeelde helper `buildSalesUserPrompt`.

## 3. Output-format (geverifieerd)

`sales-deck`/`one-pager`/`proposal-template` Text+PDF (sales-deck ook `pptx`-export) · `product-description` Text (`deliverable-types.ts:878-917`).

## 4. Asset-pattern

- Overwegend **no-asset** (tekst/structuur-gedreven). `sales-deck` heeft visual-direction notities per slide maar geen gegenereerd beeld.

## 5. Recente gotchas (categorie-relevant)

- Geen sales-specifieke entry in `gotchas.md`. Breder patroon **2026-03-20 — spreading raw AI fields into Prisma** (`gotchas.md:51-55`): relevant wanneer gestructureerde sales-velden gepersist worden — whitelist verplicht.

## 6. Friction-points

- **`proposal-template` lang maar single-pass**: geen Plan-and-Solve voor een 5000-woorden type → structuur-kwaliteit-risico (zelfde gat als lange website-types).
- **`product-description` is een uitschieter**: zeer kort (50-300w) in een categorie van lange documenten → mogelijk verkeerd gecategoriseerd (lijkt meer op e-commerce/ad-copy).
- **Geen sales-gotchas geregistreerd** → categorie relatief onbeproefd; *pending Ronde 1*.

## 7. Verbeter-aanbevelingen

1. **`proposal-template` meenemen in `LONG_OUTPUT_TYPES`** voor Plan-and-Solve. → ticket CF-3.
2. **Field-whitelist** afdwingen bij persistentie van gestructureerde sales-velden (`gotchas.md:51-55` patroon).
3. **Golden-set** voor de 4 sales-types (value-proposition + persuasion als G-Eval dimensies).

## 8. Cross-type patterns / DRY

- 4 types delen `buildSalesUserPrompt`; system-prompts uniek → geen DRY.
- `proposal-template` deelt long-output structuurbehoefte met long-form/website → kandidaat `LONG_OUTPUT_TYPES` (synthesis §E).
- **Noot**: de prompt-versie-categoriemap (`TYPE_TO_CATEGORY`) noemt voor sales nog `battle-card`/`objection-handler` — die bestaan **niet** als deliverable-types. Stale map; zie synthesis §C + ticket CF-4.

## Referenties (file:line)

- `canvas-orchestrator.ts:175`
- `src/lib/studio/prompt-templates/sales.ts` (302r, v1.2.0, 4 templates)
- `checkpoint-gates.ts:205`
- `deliverable-types.ts:878-917`
- `gotchas.md:51-55`
