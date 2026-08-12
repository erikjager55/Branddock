# brand.md — Branddock full profile (conformance-documentatie)

> **Status**: v1, 2026-08-03 · hoort bij `tasks/brand-md-open-standaard.md` en launch-plan v2 Bijlage A.
> **Kern-spec (upstream)**: [github.com/caiopizzol/brand.md](https://github.com/caiopizzol/brand.md), v0.2 (draft, MIT) — wij zijn implementeerder en contributor, geen eigenaar.

## Conformance

Een **Branddock full profile** is een geldig brand.md-bestand volgens de upstream v0.2-kern, plus additieve uitbreidingen. De compatibiliteitsregel is de wet:

1. De kern blijft letterlijk intact: YAML-frontmatter met `name`, `version` (de gepinde kernversie, als string), `language`, en de secties `## Strategy`, `## Voice`, `## Visual`.
2. Alle uitbreidingen zijn **additief**: nieuwe frontmatter-blokken en nieuwe `##`-secties. Een parser die alleen de kern kent, slaat ze zonder fout over.
3. Elk door Branddock gegenereerd bestand valideert tegen de kern — aantoonbaar via `npx brandmd-validate` (`integrations/brandmd-validator`).

## Full-profile-uitbreidingen

**Frontmatter**

| Veld | Vorm | Betekenis |
|---|---|---|
| `locales` | `[en, nl]` | Alle content-locales van het merk (alleen bij >1) |
| `validation` | per sectie `{ status: validated\|unvalidated, score?, date? }` | Eerlijkheidslaag: wat is bevestigd, wat is een scan-gok. Neutraal gedefinieerd — elke tool mag stempelen; alleen een levende implementatie kán het betekenisvol |
| `provenance` | `generated_by`, `generated_at`, `canonical?`, `source?` | Herkomst + de levende versie (of claim-URL bij generator-drafts) |

**Secties**

| Sectie | Inhoud |
|---|---|
| `## Audience` | Personas: profiel, primary goal, key traits, quote |
| `## Products & Services` | Catalogus: wat, kernvoordelen, use-cases |
| `## Channel Tones` | Per kanaal de toon-afwijking |
| `## Guardrails` | Machine-checkbare do/don't-regels (upgrade van proza-guardrails) |

**Privaat (nooit in een gedeeld bestand)**: `## Market Context` (concurrenten) bestaat alleen in het *extended profile* dat de MCP-server achter auth serveert. De validator waarschuwt als hij het aantreft. OKR's, trends en de prompt-/chain-laag komen in géén enkel profiel voor (ADR public-brand-api).

## Twee smaken, één emitter

| Profiel | Bron | Validation-status | Distributie |
|---|---|---|---|
| Generator-draft | Anonieme URL-scan | Alles `unvalidated` (een scan bevestigt niets) | Gratis download; claim-URL in provenance |
| Levende versie | Workspace-export | Uit echte data (`BrandAsset.status` + coverage, voiceguide, styleguide) | UI-export, `GET /api/v1/brand-md`, MCP-tool `get_brand_md`, canonical-URL |

Implementatie: `src/lib/export/design-system/emitters/brandmd.ts` (deterministisch, smoke: `scripts/smoke-tests/brandmd-emitter.ts`). Voorbeelden: `docs/specs/brandmd-examples/`.

## Upstream-beleid

De algemeen-nuttige uitbreidingen (Audience, provenance, gestructureerde guardrails) worden als PR's upstream aangeboden — teksten klaar in `docs/specs/brandmd-upstream-proposals.md`. Geaccepteerd = de spec groeit; geweigerd = het full profile blijft additief-compatibel bestaan. Fork alleen vanuit kracht, nooit als startpunt (launch-plan v2 §3).
