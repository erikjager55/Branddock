# DTS '35 Ede Website — UI Kit

A hi-fi recreation of the **dtsede.nl** public site, applying the brand book's visual rules to the real content, navigation structure, news, and club info as found on the live site (verified May 2026).

## Notes

> **The live dtsede.nl site is a Sportlink-driven WordPress install** whose visual chrome is plainer and older than this hi-fi kit. This kit is what the brand book's intent *would* look like applied to the same content — same nav structure, same headlines, same address/socials/sponsors. Treat as a brand-true reference build, not a pixel copy of the current rendering.

## What's here

Open `index.html` to see the assembled site. It's a single page with five sections (Header → Hero → Latest News → Fixtures → Standings → Footer) plus a small interactive demo (click between Wedstrijden / Programma / Stand tabs).

## Files

- `index.html` — page shell, mounts React, imports all components
- `ui.jsx` — primitives: `Button`, `Badge`, `ScoreChip`, `Card`, `SectionHeading`, `Icon`
- `Header.jsx` — sticky white nav matching the real 7-section structure; Deep Blue top utility bar with address + Ledenshop / Sport BSO / Login
- `Hero.jsx` — full-bleed photo placeholder with Royal Blue scrim + headline + CTAs
- `NewsCard.jsx` — 6 cards with **real headlines pulled from the live site** (May 2026)
- `SponsorStrip.jsx` — real sponsors: Autobedrijf Braber, Sportted, ING, Aannemersbedrijf W. Maassen, Sanidirect Ede, Concept4Cars + Club van 100 tile
- `Jarigen.jsx` — sidebar with **Agenda**, **Onze blauw-witte jarigen** birthdays table, **Zoek in deze site** search, and the **Rookvrije generatie** tile
- `FixtureTable.jsx` — Uitslagen / Programma tabbed view
- `StandingsTable.jsx` — KNVB 2e klasse table
- `Footer.jsx` — Deep Blue four-column footer with **real address (Inschoterweg 2, 6715 CS Ede)**, phone, email, Facebook/Instagram links
- `App.jsx` — composes all components into the page (Hero · Sponsors · Nieuws + Sidebar · Wedstrijden · Stand · Footer)
- `kit.css` — kit-specific layout/components, layered on `colors_and_type.css`

## Component coverage

| Component | Status |
|---|---|
| Deep Blue utility top bar (address · Ledenshop / Sport BSO / Login) | ✓ |
| Sticky header w/ 7-section nav + dropdowns | ✓ |
| Full-bleed hero w/ scrim | ✓ |
| Sponsor strip w/ Club van 100 | ✓ |
| News / match-report cards (×6, real headlines) | ✓ |
| Sidebar: Agenda · Jarigen · Search · Rookvrij | ✓ |
| Fixture table w/ Uitslagen/Programma tabs | ✓ |
| Standings table | ✓ |
| Buttons (primary / secondary / tertiary) | ✓ |
| Badges + score chip | ✓ |
| Section heading w/ "Meer →" link | ✓ |
| Deep Blue footer w/ real address + socials | ✓ |
| Login / Members area | ✗ — not in scope |
| Team rosters (DTS Ede 1 ... JO8-6) | ✗ — repetitive, not built |
| Mobile nav drawer | ✗ — desktop view only |

## How to read it

The kit is **cosmetic, not functional**: tabs switch, but nothing is wired to a real backend. All copy is in Dutch and follows the brand voice (third person, present tense, no marketing-speak).
