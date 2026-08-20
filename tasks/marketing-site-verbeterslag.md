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

⚠️ **Let op de resterende twee templates.** 5 van de 19 URL's komen uit 2 bestanden
(`solutions/[slug]`, `vergelijk/[slug]`). Een wijziging in de lay-out van zo'n template
raakt alle instanties tegelijk; alleen de content per slug is losstaand. Bij die groepen
scheiden we dus expliciet "template" van "content".

⚠️ **De derde template (`features/[slug]`, 7 URL's) is per 20-08 (#458) opgegaan in
pagina #2** — zie sectie B2 hieronder. Vandaar 19 i.p.v. de oorspronkelijke 26 URL's.

---

# A. Website-breed — verzamelbak

> Alles wat Erik markeert als `*website: <tekst>*` komt hier terecht.
> Uitvoeren in één aparte ronde, ná of náást de pagina-doorloop.

| # | Wijziging | Raakt | Status |
|---|---|---|---|
| W1 | **Geen em-streepje (—) in Nederlandse copy.** Het is geen Nederlands leesteken. Per geval vervangen door wat de zin vraagt: dubbele punt bij een opsomming of toelichting, komma bij een bijstelling, punt waar het twee zinnen waren, haakjes bij een echte tussenzin, puntkomma bij twee samenhangende hoofdzinnen. Koppeltekens in samenstellingen (merk-DNA, AI-schrijftools, on-brand) blijven staan. | alle pagina's | ✅ **af 18-08** — 174 vervangingen in 18 bestanden (#325) + 3 in gedeelde constanten (#327). Live geverifieerd op 10 pagina's: 0 treffers |

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
  rest van de site NL-first is. ⚠️ Daarom zijn de 12 em-streepjes op die pagina en in
  de Engelse helft van `generator-client.tsx` bewust blijven staan: in het Engels is
  dat leesteken correcte typografie. Vertalen of bewust Engels houden is een besluit
  dat nog openstaat.
- **De hele site rendert dynamic.** Eén `await cookies()` in `src/app/layout.tsx:26`
  zet élke route op server-rendered; de `generateStaticParams` op features/solutions/
  vergelijk levert daardoor niets op. Eigen taak: `static-rendering-regressie`.
  Als we tóch overal doorheen gaan, is dit het moment om te beslissen.
- **De 3 ontbrekende feature-screenshots** staan al sinds de website-rebuild open
  (`open-acties-2026-07-23` §B).

## Open besluiten uit ronde 1 (18-08)

- **Titel-scheider.** `%s — Branddock` is `%s | Branddock` geworden, gelijk aan wat de
  brand.md-pagina's al deden. Dit raakt de `<title>` van élke marketingpagina en dus
  wat Google toont. Viel strikt genomen buiten de em-streepje-regel (het is geen zin);
  in één commando terug te draaien als Erik het anders wil.
- **References & Anti-References-inhoud.** De 12e canonieke asset kreeg inhoud in
  `seed-branddock-brand.ts` (#325): Stripe, Linear en Frontify als referenties, elk met
  de trek die we bewust níét overnemen, plus vier anti-referenties. Door Claude
  geschreven op basis van de gedocumenteerde positionering — dat is merkstrategie, geen
  feit. Nalezen vóór het script draait.
- **App-UI valt buiten deze taak.** De em-streepje-sweep dekte de website (marketing +
  brand.md + de constanten die daarin renderen). In de app-componenten staan er nog
  ruim 1.600 (deels comments). De i18n-locales zijn schoon. Aparte ronde als Erik dat
  wil.

---

# B. Pagina-inventaris (19 URL's uit 13 route-bestanden)

Oorspronkelijk 26 URL's uit 14 bestanden (18-08); de 7 `features/[slug]`-URL's zijn per
20-08 (#458) opgegaan in pagina #2 (zie B2) — vandaar de nieuwe totalen.

Geverifieerd tegen `MARKETING_SITEMAP_PATHS` — die lijst dekt 16 van de 19; de drie
brand.md-URL's ontbreken er (zie observaties).

## B1 — Kern / conversie

| # | URL | Bestand | Omvang | Status |
|---|---|---|---|---|
| 1 | `/` | `src/app/marketing/page.tsx` | 560 r | ✅ **af 18-08** (#321, #325) |
| 2 | `/marketing/platform` | `platform/page.tsx` | 266 r | ✅ **af 20-08** (#457, #458) — productshots weg, stappen als genummerde stepper; de 7 features-detailpagina's zijn erin opgegaan als lightbox per module (zie B2) |
| 3 | `/marketing/pricing` | `pricing/page.tsx` | 383 r | ⬜ |

## B2 — Features (7 URL's, 1 template) — ✅ **opgegaan in pagina #2, 20-08 (#458)**

~~Template: `src/app/marketing/features/[slug]/page.tsx` (216 r) · content: `FEATURES`-record~~
**Verwijderd.** Inhoud verhuisd naar `platform/module-details.ts`, getoond als lightbox
per module-tegel op `/marketing/platform`. De 7 oude URL's redirecten (permanent):
`brand-alignment` → `/marketing/resources/f-val` (had al een rijkere eigen pagina), de
overige 6 → `/marketing/platform?feature=<slug>` (opent meteen de juiste lightbox).
Nav-item "Platform" is van dropdown naar directe link veranderd; footer, homepage-tegels,
`HowItWorks`-CTA's en de F-VAL-CTA zijn meegerepoint.

| # | URL (oud, redirect nu) | Slug | Status |
|---|---|---|---|
| 4 | `/marketing/features/brand-voice` | `brand-voice` | ✅ lightbox |
| 5 | `/marketing/features/content-canvas` | `content-canvas` | ✅ lightbox |
| 6 | `/marketing/features/brand-alignment` | `brand-alignment` | ✅ redirect → `/marketing/resources/f-val` |
| 7 | `/marketing/features/agents` | `agents` | ✅ lightbox |
| 8 | `/marketing/features/personas` | `personas` | ✅ lightbox |
| 9 | `/marketing/features/trend-radar` | `trend-radar` | ✅ lightbox |
| 10 | `/marketing/features/campaigns` | `campaigns` | ✅ lightbox |

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

⚠️ Nav en footer kregen op 20-08 (#458) alleen een mechanische href-repoint (de 7
features-links) door het opgaan van B2 — geen volledige pass. Blijven dus `⬜` tot ze als
eigen item worden opgepakt.

| Onderdeel | Bestand | Status |
|---|---|---|
| Nav + aankondigingsbalk | `MarketingNav.tsx` | ⬜ (Platform-dropdown → directe link, 20-08) |
| Footer | `MarketingFooter.tsx` | ⬜ (features-links repoint, 20-08) |
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
