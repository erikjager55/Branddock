# Brandstyle golden-set

Onderdeel van V5 (governed-token-layer verbeterplan,
`docs/audits/2026-06-06-governed-token-layer-verbeterplan.md`).

Bevroren set van merk-fixtures waartegen de token-**resolver**
(`extractBrandTokensWithProvenance`) wordt gemeten: per merk de verwachte
geresolveerde tokens + provenance-source. De runner rapporteert een
accuraatheid-% en faalt onder de drempel (default 90% — Anthropic's
offline-eval-bar uit de self-service-analytics les).

```bash
npm run eval:brandstyle-golden            # drempel 90%
GOLDEN_THRESHOLD=95 npm run eval:brandstyle-golden
```

## Een merk toevoegen

Kopieer `brands/_schema.json` naar `brands/<naam>.json` en vul in:

- `input` — een `StyleguideShape` (resolver-input): `colors[]` met
  `hex`/`category`/`tags`/`confidence`, `fonts[]` met `name`/`role`/`fontFamily`,
  optioneel `layoutStyle`/`archetype` + de render-profielen
  (`buttonProfile`/`elevationProfile`/…).
- `expect.tokens` — verwachte token-waarden (subset; case-insensitive exact).
- `expect.provenanceSource` — verwachte `source` per token-pad
  (`scraped`/`logo`/`preset`/`fallback`/`derived`).

Files met een `_`-prefix worden overgeslagen (`_schema.json`).

## Bewuste scope-beperking

Dit is een **resolver-niveau** golden-set, geen full-scrape golden-set. De
scraper (`src/lib/brandstyle/url-scraper.ts` → `scrapeUrl(url)`) kent alleen een
netwerk-fetch, geen offline HTML-seam. Een golden-set tegen opgeslagen
HTML-snapshots (die ook de scrape→extractie-laag dekt) vereist daarom eerst een
scraper-refactor (`scrapeHtml(html)`-variant). Tot die er is bevriezen we de
StyleguideShape — dat dekt de volledige resolve/provenance-laag deterministisch.
De DET-suite (`scripts/smoke-tests/brandstyle-provenance.ts`) toetst dezelfde
laag met edge-case-asserts; deze golden-set voegt brede merk-dekking + een
accuraatheid-drempel toe.

**Vervolgstap**: `scrapeHtml()`-seam + golden-files met `rawHtml` i.p.v.
`input.StyleguideShape` zodra de volledige pijplijn offline draaibaar is.
