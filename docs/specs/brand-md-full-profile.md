# BRAND.md — Branddock full profile (conformance-documentatie)

> **Status**: v2, 2026-08-14 — herschreven bij de 0.3-migratie · hoort bij `tasks/brand-md-open-standaard.md` en launch-plan v2 Bijlage A.
> **Kern-spec (upstream)**: [github.com/caiopizzol/brand.md](https://github.com/caiopizzol/brand.md), spec v0.3.0 (draft, MIT) — wij zijn implementeerder en contributor, geen eigenaar.
> **Historie**: t/m 2026-08-14 emitten wij een eigen lezing van de 0.2-kern die bij audit níet strikt spec-conform bleek (frontmatter `version` als specversie-string, geen `tagline`, eigen subsectienamen). De 0.3-migratie herstelt dat in één beweging; oude gedownloade drafts blijven functioneel maar valideren niet strikt — een re-scan levert een conform bestand.

## Conformance

Een **Branddock full profile** is een geldig BRAND.md-bestand volgens de upstream-spec v0.3.0, plus additieve uitbreidingen. De compatibiliteitsregel is de wet:

1. **De kern is letterlijk de spec**: frontmatter `name`, `tagline`, `specVersion: "0.3.0"`, `version` (integer-merkrevisie, start 1), `language`; de lagen `## Strategy` / `## Voice` / `## Visual` met alle verplichte 0.3-subsecties (Strategy: Overview, Audience, Positioning, Personality, References & Anti-References, Promise, Guardrails · Voice: Identity, Tagline & Slogans, Message Pillars, Phrases, Tonal Rules · Visual: Core Colors, Typefaces, Art Direction).
2. **Eerlijk boven indrukwekkend**: een verplichte subsectie zonder echte databron krijgt de expliciete regel `_Not yet defined._` — nooit verzonnen inhoud (spec-Governance: "Omit rather than invent"). De open subsecties zijn precies de upsell naar de levende versie.
3. **Alle uitbreidingen zijn additief**: extra frontmatter-blokken, `####`-subentries binnen bestaande secties en extra `##`/`###`-secties. Een parser die alleen de kern kent, slaat ze zonder fout over.
4. Elk door Branddock gegenereerd bestand valideert tegen de échte spec — aantoonbaar via `npx brandmd-validate` (`integrations/brandmd-validator`), dat de spec-resolutieregels implementeert (0.2.0 én 0.3.0, inclusief aliassen en de malformed-`specVersion`-tabel). De emitter-smoke kruisvalideert elke build.

## Datamapping (canonical model → 0.3-subsecties)

| 0.3-subsectie | Bron in Branddock |
|---|---|
| Strategy > Overview | assets `purpose(-statement)`, `golden-circle`, `mission-vision`, `brand-story` |
| Strategy > Audience | personas (proza-regel + `####`-subentries — zie uitbreidingen) |
| Strategy > Positioning | assets `positioning`, `brand-essence` |
| Strategy > Personality | assets `(brand-)personality`, `brand-archetype` |
| Strategy > References & Anti-References | *(nog geen databron — expliciet leeg)* |
| Strategy > Promise | asset `brand-promise` |
| Strategy > Guardrails | voice do/don't + logo-/imagery-regels als `#### Do` / `#### Don't` |
| Voice > Identity | voiceguide `voiceDescription` |
| Voice > Tagline & Slogans | tagline + "phrases that sound like us" |
| Voice > Message Pillars | *(nog geen databron — expliciet leeg)* |
| Voice > Phrases | voiceguide voorbeeldzinnen / scan-`exampleLines` |
| Voice > Vocabulary *(optioneel)* | words we use / words we avoid |
| Voice > Tonal Rules | tonal rules + writing guidelines (+ We Say/We Never Say-tabel) |
| Visual > Core Colors | styleguide-kleurtokens (naam + hex) |
| Visual > Typefaces | font-families + rol; maten blijven bewust achterwege (DESIGN.md-grens); licentie expliciet "not verified" |
| Visual > Photography & Illustration *(optioneel)* | imagery-stijl + richtlijnen |
| Visual > Art Direction | styleguide-overview (direction statement) |

Niet-gemapte assets met inhoud (Core Values, Social Relevancy, Transformative Goals, …) worden als additieve `###`-secties binnen Strategy geëmit.

**Bestandsnaam**: downloads heten exact `BRAND.md` (spec-canoniek, uppercase) — "drop it in your repo root" klopt zonder rename-stap.

## Full-profile-uitbreidingen

**Frontmatter**

| Veld | Vorm | Betekenis |
|---|---|---|
| `locales` | `[en, nl]` | Alle content-locales van het merk (alleen bij >1) |
| `validation` | per laag `{ status: validated\|unvalidated, score?, date? }` | Eerlijkheidslaag: wat is bevestigd, wat is een scan-gok. Neutraal gedefinieerd — elke tool mag stempelen; alleen een levende implementatie kán het betekenisvol |
| `provenance` | `generated_by`, `generated_at`, `canonical?`, `source?` | Herkomst + de levende versie (of claim-URL bij generator-drafts) |

**Binnen bestaande secties** (de upstream-PR-conventies, zie `brandmd-upstream-proposals.md` v2)

| Plek | Uitbreiding |
|---|---|
| `Strategy > Audience` | `####`-subentry per persona: profielregel, primary goal, key traits, quote |
| `Strategy > Guardrails` | `#### Do` / `#### Don't` — machine-checkbare regels |

**Extra secties**

| Sectie | Inhoud |
|---|---|
| `## Products & Services` | Catalogus: wat, kernvoordelen, use-cases |
| `## Channel Tones` | Per kanaal de toon-afwijking |

**Privaat (nooit in een gedeeld bestand)**: `## Market Context` (concurrenten) bestaat alleen in het *extended profile* dat de MCP-server achter auth serveert. De validator waarschuwt als hij het aantreft. OKR's, trends en de prompt-/chain-laag komen in géén enkel profiel voor (ADR public-brand-api).

## Twee smaken, één emitter

| Profiel | Bron | Validation-status | Distributie |
|---|---|---|---|
| Generator-draft | Anonieme URL-scan | Alles `unvalidated` (een scan bevestigt niets) | Gratis download; claim-URL in provenance |
| Levende versie | Workspace-export | Uit echte data (`BrandAsset.status` + coverage, voiceguide, styleguide) | UI-export, `GET /api/v1/brand-md`, MCP-tool `get_brand_md`, canonical-URL |

Implementatie: `src/lib/export/design-system/emitters/brandmd.ts` (deterministisch; smoke mét spec-kruisvalidatie: `scripts/smoke-tests/brandmd-emitter.ts`). Voorbeelden: `docs/specs/brandmd-examples/`.

## Roadmap

- **DESIGN.md-emitter** — de 0.3-spec definieert de BRAND.md↔DESIGN.md-grens (kleurrollen, typescale en componentregels horen in DESIGN.md). Het Brand Manifest + de designbibliotheek (changelog #456) zijn daarvoor de natuurlijke bron; daarmee zouden wij de eerste volledige implementatie van het bestandenpaar zijn.
- **References & Anti-References / Message Pillars als product-features** — de twee verplichte subsecties zonder databron; kandidaten voor het merkfundament (nieuwe asset-types), waarna de emitter ze vanzelf vult.
- **Merkrevisieteller** — frontmatter `version` per workspace laten oplopen bij inhoudelijke wijzigingen (nu vast `1`).

## Upstream-beleid

De algemeen-nuttige uitbreidingen worden als PR's upstream aangeboden — teksten klaar in `docs/specs/brandmd-upstream-proposals.md` (v2, herzien na de 0.3-release). Geaccepteerd = de spec groeit; geweigerd = het full profile blijft additief-compatibel bestaan. Fork alleen vanuit kracht, nooit als startpunt (launch-plan v2 §3).
