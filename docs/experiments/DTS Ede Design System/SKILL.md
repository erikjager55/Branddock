---
name: dts-ede-design
description: Use this skill to generate well-branded interfaces and assets for V.V. DTS '35 Ede (Door Training Sterker) — the blauw-witte Dutch amateur football club at Sportpark Peppelensteeg, Ede, founded 1935 — either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and a website UI kit verified against dtsede.nl.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts *or* production code, depending on the need.

## Quick facts (verified against dtsede.nl, May 2026)

- **Brand:** V.V. DTS '35 Ede (Door Training Sterker, *vereeniging* sinds 1935)
- **Address:** Sportpark Peppelensteeg · Inschoterweg 2, 6715 CS Ede
- **Telephone:** 0318 - 437 121
- **Socials:** facebook.com/vvDTSEde · instagram @dtsede35 · twitter @dtsede
- **Marquee event:** International U15 Top Tournament (23e editie, 25 mei — Whit Monday)
- **Palette:** Royal Blue `#0060A0` + Deep Blue `#0040A0` + a long neutral ramp (Off White `#F1F1F1` → Near Black `#222222`). **No accent colors.**
- **Type:** Licensed **HelveticaNeue** loaded via `@font-face` from `fonts/`. Full weight ladder: Light 300 / Roman 400 / Medium 500 / Bold 700 / Black 900 (+ Bold & Black italics).
- **Voice:** Dutch, third person, present-tense, factual, neighborly. Never marketing-speak. No emoji **except** the named team "DTS Ede 6 🍺".
- **Icons:** Lucide stroke set, 24px grid, 1.5 stroke (flagged substitution — brand book does not specify a library).

## Files

- `README.md` — full brand book digest: voice, visual foundations, iconography
- `colors_and_type.css` — CSS custom properties + base type/color styles
- `assets/dts-ede-logo.png` — circular crest, 200×200
- `preview/` — small specimen cards (colors, type, components, voice)
- `ui_kits/website/` — React (Babel JSX) recreation of the club website. Components: Header, Hero, NewsCard, FixtureTable, StandingsTable, Footer, plus `ui.jsx` primitives (Button, Badge, ScoreChip, Card, SectionHeading, Icon).

## Hard rules

- **Never invent accent colors.** Use blue + gray + bold weight to express state. No green for success, no red for error.
- **No gradients in UI chrome.** The only allowed gradient is the Royal Blue scrim over hero photography.
- **Flat cards.** 1px Light Gray border, 4px radius, no drop shadow.
- **No emoji, no cartoonish icons, no stock-photo aesthetics.**
- **Dutch copy by default.** Use `je` (informal), never `u`. Vocabulary lives in README.md.
- **Crest is logo, not bullet.** Use at ≥ 32px square. Never as a watermark.

## Substitutions to flag

When building output that uses these, mention to the user:

1. **Lucide icons** stand in for the unspecified icon system — replace if a preferred set is supplied.
2. **Imagery** in the website kit is placeholders — replace with real DTS Ede photography.
