# brand.md — upstream-PR-pakket (klaar voor indienen)

> **Status**: v2, 2026-08-14 — volledig herschreven na de upstream-release van **spec v0.3.0**.
> **Indienen is een Erik-actie** (externe handeling onder eigen naam, launch-plan v2 §3.2-3.3): eerst de outreach-mail, daarna deze PR's op [github.com/caiopizzol/brand.md](https://github.com/caiopizzol/brand.md), in deze volgorde. Elke PR verwijst naar werkende tooling als bewijs (generator, emitter, validator, voorbeelden in deze repo).
>
> **Waarom v2?** Upstream heeft in v0.3.0 zelf `Audience` en `Guardrails` toegevoegd (als Strategy-subsecties) — onze oorspronkelijke PR #1 en #3 ("add Audience section", "add Guardrails section") zouden dus voorstellen wat er al is. De v1-teksten zijn vervangen; de inhoudelijke kern (gestructureerde personas, machine-checkbare regels, provenance) blijft — nu geframed als aanvulling op wat 0.3 al biedt.

---

## Upstream-stand (v0.3.0, gecheckt 2026-08-14)

- Frontmatter: `name`, `tagline` (nieuw, verplicht), `version` (integer, merkevolutie), `language`, `specVersion` (nieuw; afwezig = 0.2), `type`/`architecture` (sub-brands).
- **Strategy** heeft 7 verplichte subsecties, waaronder **Audience** (proza: primary/secondary/exclusions) en **Guardrails** (tone summary, cannot-be-lijst, litmus test).
- Visual-hernoemingen mét 0.2-aliassen: Colors→Core Colors, Typography→Typefaces, Style→Art Direction, Photography→Photography & Illustration.
- Nieuw: optionele **Governance**-laag (Naming, Claims, Accessibility), sub-brand-inheritance, en de **BRAND.md ↔ DESIGN.md-grens** (kleurrollen/typescale horen in DESIGN.md).
- **Nog steeds afwezig upstream**: `provenance`- en `validation`-frontmatter. Dat is ons sterkste aanbod.
- Onze bestanden (v0.2-kern, geen `specVersion`) blijven per upstream-beleid **onbeperkt geldig** ("0.2 files remain valid indefinitely").

---

## PR #1 — `provenance` + `validation` frontmatter (was PR #2 — nu de speerpunt)

**Titel**: `spec: add optional provenance and validation frontmatter`

**Body**:

> brand.md files are increasingly *generated* by tools and then travel — into repos, briefs and chats. v0.3.0 added `version` and `specVersion`, which tell a reader *what* they're looking at, but not *where it came from*, *how old the content is*, or *which parts are actually confirmed by the brand owner versus inferred by a tool*.
>
> This PR adds two optional frontmatter blocks:
>
> **`provenance`** — `generated_by`, `generated_at` (ISO date), optional `canonical` (URL of the maintained version) and optional `source` (the site a generator scanned). Without it, generated files silently go stale and readers can't find the living version.
>
> **`validation`** — per top-level section `{ status: validated|unvalidated, score?, date? }`. Generators can produce a plausible-looking file from a website scan, but a scan confirms nothing. This block lets a file be honest about which sections a human (or a maintained brand system) has actually confirmed. It's tool-neutral: any tool may stamp it.
>
> ```yaml
> provenance:
>   generated_by: <tool or author>
>   generated_at: "2026-08-14"
>   canonical: "https://example.com/acme/brand.md"
> validation:
>   strategy: { status: unvalidated }
>   voice: { status: validated, date: 2026-08-01 }
> ```
>
> Both are additive; unknown frontmatter keys are already ignored by core parsers. We've been shipping both from a public generator and a workspace exporter for a while — happy to adjust naming/shape, and to contribute the validator checks.

## PR #2 — structured personas under `Strategy > Audience`

**Titel**: `spec: allow structured persona entries in Strategy > Audience`

**Body**:

> v0.3.0's `Strategy > Audience` (primary audience, beliefs, exclusions) is a great foundation. In practice, AI agents that write copy get the most out of *structured* personas: a named archetype with a goal, traits, and an in-their-words quote they can aim at.
>
> This PR proposes an optional, additive convention inside the existing section: one `####` sub-entry per persona, after the required prose.
>
> ```markdown
> ### Audience
>
> [required prose: primary audience, beliefs, exclusions]
>
> #### Ritual Rosa
>
> Home-brew perfectionist, 28-40
>
> - Primary goal: Cafe-level coffee at home
> - Key traits: curious, quality-driven
> - In their words: "Tell me the farm, not the vibe."
> ```
>
> Parsers that only know the prose form skip the sub-entries. We've implemented this in a generator + emitter and shipped example files; happy to adjust naming/shape to whatever you prefer.

## PR #3 — machine-checkable Do/Don't lists in `Strategy > Guardrails`

**Titel**: `spec: allow structured Do/Don't lists in Strategy > Guardrails`

**Body**:

> v0.3.0's `Strategy > Guardrails` (tone summary, cannot-be list, litmus test) reads well for humans. For tools there's one step further: rules an agent or validator can *enforce* mechanically — "Avoid the word/phrase X", "Never separate icon from wordmark".
>
> This PR proposes optional `#### Do` / `#### Don't` bullet lists inside the existing Guardrails section, after the required content. Each bullet is one concrete, checkable rule.
>
> ```markdown
> ### Guardrails
>
> [required: tone summary, cannot-be list, litmus test]
>
> #### Do
> - Name the farm and roast date
>
> #### Don't
> - Avoid the word/phrase "artisanal"
> ```
>
> We ship a dependency-free validator that already reports these lists, and an emitter that generates them from vocabulary + logo/color rules; happy to contribute a reference check upstream too.

---

## Niet als PR, wel voor de outreach-mail

- **DESIGN.md**: melden dat wij het BRAND.md ↔ DESIGN.md-paar implementeren (Brand Manifest/designbibliotheek als bron voor een DESIGN.md-emitter is bij ons in voorbereiding). Positioneert Branddock als eerste volledige implementatie van beide kanten van de 0.3-grens.
- **0.3-migratie**: wij emitten bewust nog de 0.2-kern (onbeperkt geldig); 0.3-conformance (specVersion, tagline, hernoemde Visual-secties, Strategy-subsecties) staat op de roadmap. Niet beloven met datum — wel noemen als richting.

## Bewijsmateriaal om in de PR's naar te linken (na launch)

- Generator: `https://branddock.app/brandmd` (URL → spec-valide bestand)
- Validator: `integrations/brandmd-validator` (npm-publish is een Erik-actie; naam `brandmd-validate` is nog vrij op npm — claim bij publish)
- Voorbeelden: `docs/specs/brandmd-examples/`
- Full-profile-conformance: `docs/specs/brand-md-full-profile.md`

## Volgorde en toon (uit launch-plan v2)

1. Outreach-mail/issue van Erik persoonlijk mét werkende tooling als openingszet — geen leeg samenwerkingsverzoek. Complimenteer de 0.3-release expliciet (Audience/Guardrails upstream = bewijs dat de maintainer dezelfde kant op denkt).
2. PR #1 → #2 → #3, los van elkaar mergebaar. PR #1 (provenance/validation) eerst — dat is het gat dat 0.3 nog niet dekt.
