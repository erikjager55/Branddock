---
id: marketing-site-verbeterslag
title: Marketing-site verbeterslag — pagina voor pagina, met een website-brede verzamelbak
fase: post-launch
priority: now
effort: doorlopend (per pagina 0,5-2 uur; website-brede items apart)
owner: claude-code + Erik (richting per pagina)
status: in-progress
created: 2026-08-18
completed:
related-adr: -
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md
worktree: -
---

# Probleem

De marketing-site op `branddock.app` is in fasen gegroeid (`marketing-homepage-v2`
Fase 1: homepage + nav/footer NL-first; daarna solutions-, vergelijk- en
voor-ai-agents-pagina's). Er is nooit één ronde overheen gegaan waarin élke pagina
tegen dezelfde lat is gelegd. Tegelijk is de site nu wél het distributiekanaal: de
funnel is technisch af en leverde in vier dagen 4 page-events en 0 leads.

Deze taak is de gestructureerde doorloop: **pagina na pagina**, met een aparte
verzamelbak voor wijzigingen die op élke pagina moeten landen.

# Werkwijze

1. We lopen sectie B hieronder van boven naar beneden af, één pagina per keer.
2. Erik geeft per pagina de gewenste wijzigingen; die komen onder die pagina te staan.
3. Wijzigingen die de héle site raken markeert Erik als `*website: <tekst>*`. Die
   verhuizen naar sectie A en worden **niet** per pagina uitgevoerd, maar in één
   aparte ronde — anders raakt de site halverwege inconsistent.
4. Een pagina is `✅` als de wijzigingen erin zitten, `tsc` + `lint` groen zijn en
   de Vercel-preview 'm rendert.

⚠️ **Let op de drie templates.** 12 van de 26 URL's komen uit 3 bestanden
(`features/[slug]`, `solutions/[slug]`, `vergelijk/[slug]`). Een wijziging in de
lay-out van zo'n template raakt alle instanties tegelijk; alleen de content per
slug is losstaand. Bij die groepen scheiden we dus expliciet "template" van "content".

---

# A. Website-breed — verzamelbak

> Alles wat Erik markeert als `*website: <tekst>*` komt hier terecht.
> Uitvoeren in één aparte ronde, ná of náást de pagina-doorloop.

| # | Wijziging | Raakt | Status |
|---|---|---|---|
| — | _(nog leeg — wordt gevuld tijdens de doorloop)_ | | |

## Observaties uit de inventarisatie (van Claude — nog geen besluit)

Gevonden bij het opstellen van de lijst, ter beoordeling door Erik. Pas een
website-brede actie als hij ze als zodanig markeert.

- **Titel-lengte en -stijl lopen uiteen.** Het `title.template` in
  `src/app/marketing/layout.tsx` maakt er `%s — Branddock` van, maar de subtitels
  zelf zijn kaal en kort: `Platform`, `Prijzen`, `Contact`, `Over ons`. Dat zijn
  labels, geen zoekresultaat-titels. De brand.md-pagina's doen het wél volledig
  ("brand.md-generator — geef elke AI-agent het geheugen van je merk | Branddock")
  — en gebruiken dan weer een `|` in plaats van de `—` van het template.
- **`/brandmd` en `/brandmd/use` staan in de footer maar niet in de sitemap**
  (`src/app/marketing/sitemap-pages.ts`). Google vindt ze alleen via de footerlink.
  Relevant omdat juist die funnel de leads moet opleveren.
- **`/brandmd/claim/[token]` is Engels** ("Your brand is already here.") terwijl de
  rest van de site NL-first is.
- **De hele site rendert dynamic.** Eén `await cookies()` in `src/app/layout.tsx:26`
  zet élke route op server-rendered; de `generateStaticParams` op features/solutions/
  vergelijk levert daardoor niets op. Eigen taak: `static-rendering-regressie`.
  Als we tóch overal doorheen gaan, is dit het moment om te beslissen.
- **De 3 ontbrekende feature-screenshots** staan al sinds de website-rebuild open
  (`open-acties-2026-07-23` §B).

---

# B. Pagina-inventaris (26 URL's uit 14 route-bestanden)

Geverifieerd tegen `MARKETING_SITEMAP_PATHS` — die lijst dekt 23 van de 26; de drie
brand.md-URL's ontbreken er (zie observaties).

## B1 — Kern / conversie

| # | URL | Bestand | Omvang | Status |
|---|---|---|---|---|
| 1 | `/` | `src/app/marketing/page.tsx` | 560 r | ⬜ |
| 2 | `/marketing/platform` | `platform/page.tsx` | 266 r | ⬜ |
| 3 | `/marketing/pricing` | `pricing/page.tsx` | 383 r | ⬜ |

## B2 — Features (7 URL's, 1 template)

Template: `src/app/marketing/features/[slug]/page.tsx` (216 r) · content: `FEATURES`-record

| # | URL | Slug | Status |
|---|---|---|---|
| 4 | `/marketing/features/brand-voice` | `brand-voice` | ⬜ |
| 5 | `/marketing/features/content-canvas` | `content-canvas` | ⬜ |
| 6 | `/marketing/features/brand-alignment` | `brand-alignment` | ⬜ |
| 7 | `/marketing/features/agents` | `agents` | ⬜ |
| 8 | `/marketing/features/personas` | `personas` | ⬜ |
| 9 | `/marketing/features/trend-radar` | `trend-radar` | ⬜ |
| 10 | `/marketing/features/campaigns` | `campaigns` | ⬜ |

## B3 — Oplossingen (2 URL's, 1 template)

Template: `src/app/marketing/solutions/[slug]/page.tsx` (243 r) · content: `SOLUTIONS`-record

| # | URL | Slug | Status |
|---|---|---|---|
| 11 | `/marketing/solutions/marketingteams` | `marketingteams` | ⬜ |
| 12 | `/marketing/solutions/bureaus` | `bureaus` | ⬜ |

## B4 — Vergelijkingen (3 URL's, 1 template)

Template: `src/app/marketing/vergelijk/[slug]/page.tsx` (317 r) · content: `COMPARISONS`-record

| # | URL | Slug | Status |
|---|---|---|---|
| 13 | `/marketing/vergelijk/jasper` | `jasper` | ⬜ |
| 14 | `/marketing/vergelijk/chatgpt` | `chatgpt` | ⬜ |
| 15 | `/marketing/vergelijk/social-schedulers` | `social-schedulers` | ⬜ |

## B5 — AI-agents / open standaard

| # | URL | Bestand | Omvang | Status |
|---|---|---|---|---|
| 16 | `/marketing/voor-ai-agents` (+ `#api`) | `voor-ai-agents/page.tsx` | 327 r | ⬜ |

Redirect: `/marketing/guardrails` → hier (permanent, `next.config.ts`).

## B6 — Resources

| # | URL | Bestand | Omvang | Status |
|---|---|---|---|---|
| 17 | `/marketing/resources/f-val` | `resources/f-val/page.tsx` | 172 r | ⬜ |
| 18 | `/marketing/changelog` | `changelog/page.tsx` | 128 r | ⬜ |

## B7 — Bedrijf

| # | URL | Bestand | Omvang | Status |
|---|---|---|---|---|
| 19 | `/marketing/about` | `about/page.tsx` | 83 r | ⬜ |
| 20 | `/marketing/contact` | `contact/page.tsx` | 100 r | ⬜ |

## B8 — Juridisch / vertrouwen

| # | URL | Bestand | Omvang | Status |
|---|---|---|---|---|
| 21 | `/marketing/security` | `security/page.tsx` | 168 r | ⬜ |
| 22 | `/marketing/privacy` | `privacy/page.tsx` | 132 r | ⬜ |
| 23 | `/marketing/voorwaarden` | `voorwaarden/page.tsx` | 130 r | ⬜ |

Redirect: `/marketing/terms` → `/marketing/voorwaarden` (permanent).

## B9 — brand.md-funnel (eigen layout, wél in de footer)

| # | URL | Bestand | Omvang | Status |
|---|---|---|---|---|
| 24 | `/brandmd` | `brandmd/page.tsx` | 24 r | ⬜ |
| 25 | `/brandmd/use` | `brandmd/use/page.tsx` | 123 r | ⬜ |
| 26 | `/brandmd/claim/[token]` | `brandmd/claim/[token]/page.tsx` | 198 r | ⬜ |

## B10 — Gedeelde chroom (geen eigen URL, wel op elke pagina)

| Onderdeel | Bestand | Status |
|---|---|---|
| Nav + aankondigingsbalk | `MarketingNav.tsx` | ⬜ |
| Footer | `MarketingFooter.tsx` | ⬜ |
| Layout / metadata / JSON-LD | `marketing/layout.tsx` | ⬜ |
| Herbruikbare blokken | `SplitHeader` · `HeroModes` · `HowItWorks` · `Mosaic` · `Testimonial` · `CopyBlock` · `TrialNote` · `BookDemoButton` | ⬜ |
| Sitemap-lijst | `sitemap-pages.ts` | ⬜ |

---

# Acceptatiecriteria

- [ ] Elke pagina in sectie B heeft een besluit: gewijzigd, of bewust ongewijzigd
- [ ] Alle `*website:*`-items uit sectie A zijn op élke pagina doorgevoerd (of expliciet uitgezonderd)
- [ ] Nieuwe of hernoemde URL's staan in `MARKETING_SITEMAP_PATHS`
- [ ] Geen dode links (nav, footer, in-page)
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Vercel-preview gecontroleerd per gewijzigde pagina

# Bestanden die ik NIET aanraak

- `src/app/p/[workspace]/[slug]/` — klant-landingspagina's, ander product
- `src/app/layout.tsx` — de dynamic-rendering-oorzaak hoort bij `static-rendering-regressie`

# Out of scope

- De marketing-site meertalig maken (eigen initiatief, `i18n-*`-taken)
- Nieuwe pagina's/routes bedenken — eerst de bestaande op orde
- De 3 ontbrekende feature-screenshots aanleveren (wacht op Erik)

# Notes

- **Voorganger afgehecht (2026-08-18)**: `marketing-homepage-v2` is verplaatst naar
  `tasks/done/`. Het werk mergede op 15-07 (PR #151), en de hele Fase-2/3-out-of-scope
  lijst uit die task-file — feature-pagina's, oplossingen, resources/security/privacy/
  voorwaarden, nav-dropdowns — volgde diezelfde avond in #152 en #153. Er ligt dus
  **geen ongemergd werk** waar deze doorloop overheen zou schrijven; de site zoals in
  sectie B geïnventariseerd is de complete stand.
- Bij het opstellen van de inventaris (18-08) stond `origin/main` op `9e93452e`.
