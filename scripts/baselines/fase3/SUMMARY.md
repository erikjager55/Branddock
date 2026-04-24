# Brandstyle palette verification — `fase3`

Run: 2026-04-22T14:53:10.541Z

## https://dtsede.nl

- Title: `DTS Ede`
- Stylesheet links in HTML: 31 (15 plugin-like)
- Scraper saw 31 link tags — will fetch top 15 by rankStylesheets() priority
- CSS colour-vars found: 0 (semantic-named: 0)
- Colour frequency rows (post-filter): 60
- Fonts: body=`—`, heading=`HelveticaNeue-Light` (total 6)
- Logo URLs: 2
    - https://www.dtsede.nl/wp-content/uploads/dtsede/2017/07/cropped-logo-512-512-e1519824421558.png
- Logo-extracted colours: `#0060A0` (blue, 31% raster), `#0040A0` (blue, 14% raster), `#2060A0` (blue, 7% raster)

### Authoritative palette (12/12)
Confidence split → high: 2, medium: 10, low: 0

| # | hex | hue | source | conf | detector / var | freq | usage | vision |
|---|-----|-----|--------|------|----------------|------|-------|--------|
| 1 | `#0060A0` | blue | detector | high | logo-extraction:primary |  | strong | — |
| 2 | `#0040A0` | blue | detector | high | logo-extraction:secondary |  | strong | — |
| 3 | `#DFDFDF` | white-ish | frequency | medium | — | 33 | strong | — |
| 4 | `#F1F1F1` | white-ish | frequency | medium | — | 12 | strong | — |
| 5 | `#464646` | gray | frequency | medium | — | 11 | strong | — |
| 6 | `#222222` | black-ish | frequency | medium | — | 9 | strong | — |
| 7 | `#999999` | gray | frequency | medium | — | 9 | strong | — |
| 8 | `#666666` | gray | frequency | medium | — | 9 | strong | — |
| 9 | `#CCCCCC` | gray | frequency | medium | — | 7 | strong | — |
| 10 | `#888888` | gray | frequency | medium | — | 7 | strong | — |
| 11 | `#333333` | gray | frequency | medium | — | 6 | strong | — |
| 12 | `#555555` | gray | frequency | medium | — | 6 | strong | — |

### Usage verification — 2 screenshot(s), Vision: on
Top pixel coverage: #F1F1F1 44.12%, #0060A0 10.58%, #222222 8.02%, #CCCCCC 3.88%, #999999 2.83%

### Symptoms
- missingPrimaryBlue heuristic: ok
- blue candidates in palette: #0060A0, #0040A0
- red/green in palette (may be SEMANTIC-labelled): —

## https://betterbrands.nl

- Title: `better brands - branding agency - Branding, Marketing & Innovatie

    
    | better brands`
- Stylesheet links in HTML: 7 (0 plugin-like)
- Scraper saw 4 link tags — will fetch top 15 by rankStylesheets() priority
- CSS colour-vars found: 0 (semantic-named: 0)
- Colour frequency rows (post-filter): 9
- Fonts: body=`Open Sans`, heading=`—` (total 7)
- Logo URLs: 2
    - https://betterbrands.nl/img/favicon/apple-touch-icon.png
- Logo-extracted colours: `#20A020` (green, 25% raster), `#008020` (green, 22% raster), `#004040` (neutral, 21% raster)

### Authoritative palette (12/12)
Confidence split → high: 2, medium: 8, low: 2

| # | hex | hue | source | conf | detector / var | freq | usage | vision |
|---|-----|-----|--------|------|----------------|------|-------|--------|
| 1 | `#20A020` | green | detector | high | logo-extraction:primary |  | weak | none |
| 2 | `#008020` | green | detector | high | logo-extraction:secondary |  | strong | primary |
| 3 | `#111111` | black-ish | frequency | medium | — | 25 | strong | — |
| 4 | `#20C509` | green | frequency | medium | — | 18 | strong | primary |
| 5 | `#F4F4F4` | white-ish | frequency | medium | — | 14 | strong | — |
| 6 | `#CECECE` | gray | frequency | medium | — | 9 | strong | — |
| 7 | `#727272` | gray | frequency | medium | — | 8 | weak | decorative |
| 8 | `#EA0E44` | red | frequency | medium | — | 4 | none | none |
| 9 | `#A9A9A9` | gray | frequency | medium | — | 4 | weak | decorative |
| 10 | `#002838` | neutral | frequency | medium | — | 3 | none | — |
| 11 | `#199F07` | green | frequency | low | — | 1 | none | — |
| 12 | `#374151` | neutral | other | low | — |  | weak | — |

### Usage verification — 2 screenshot(s), Vision: on
Top pixel coverage: #F4F4F4 92.89%, #111111 2.61%, #CECECE 1.02%, #A9A9A9 0.86%, #727272 0.72%
Flagged as unused on page: #EA0E44, #002838, #199F07
Vision notes:
- `#20A020` (none): Not visible on any screenshot. The green text in the tagline and logo dots appear to use different shades.
- `#008020` (primary): Visible in the logo dots (left side of header) - the primary brand green used in the 'better brands' logo icon.
- `#20C509` (primary): Visible in the hero tagline text 'We drive sustainable growth through branding, innovation & activation' - bright green accent color used for key messaging.
- `#727272` (decorative): Appears in the 'SCROLLEN' text below the scroll indicator - subtle gray used for minor UI elements.

### Symptoms
- missingPrimaryBlue heuristic: ⚠️  YES
- blue candidates in palette: —
- red/green in palette (may be SEMANTIC-labelled): #20A020, #008020, #20C509, #EA0E44, #199F07

## https://stripe.com

- Title: `Stripe | Financial Infrastructure to Grow Your Revenue`
- Stylesheet links in HTML: 7 (0 plugin-like)
- Scraper saw 7 link tags — will fetch top 15 by rankStylesheets() priority
- CSS colour-vars found: 665 (semantic-named: 18)
- Colour frequency rows (post-filter): 131
- Fonts: body=`—`, heading=`sohne-var","SF Pro Display",sans-serif` (total 7)
- Logo URLs: 7
    - https://images.stripeassets.com/fzn2n1nzq965/1hgcBNd12BfT9VLgbId7By/01d91920114b124fb4cf6d448f9f06eb/favicon.svg
- Logo-extracted colours: `#533AFD` (blue, 100% svg)

### Authoritative palette (12/12)
Confidence split → high: 1, medium: 11, low: 0

| # | hex | hue | source | conf | detector / var | freq | usage | vision |
|---|-----|-----|--------|------|----------------|------|-------|--------|
| 1 | `#533AFD` | blue | detector | high | logo-extraction:primary |  | strong | — |
| 2 | `#F5F5FF` | white-ish | css-variable | medium | --hds-color-core-brand-25 |  | strong | — |
| 3 | `#E8E9FF` | blue | css-variable | medium | --hds-color-core-brand-50 |  | weak | none |
| 4 | `#E2E4FF` | blue | css-variable | medium | --hds-color-core-brand-75 |  | weak | none |
| 5 | `#D6D9FC` | blue | css-variable | medium | --hds-color-core-brand-100 |  | strong | — |
| 6 | `#B9B9F9` | blue | css-variable | medium | --hds-color-core-brand-200 |  | strong | — |
| 7 | `#9A9AFE` | blue | css-variable | medium | --hds-color-core-brand-300 |  | strong | accent |
| 8 | `#7F7DFC` | blue | css-variable | medium | --hds-color-core-brand-400 |  | strong | accent |
| 9 | `#665EFD` | blue | css-variable | medium | --hds-color-core-brand-500 |  | strong | primary |
| 10 | `#4032C8` | blue | css-variable | medium | --hds-color-core-brand-700 |  | weak | none |
| 11 | `#2E2B8C` | blue | css-variable | medium | --hds-color-core-brand-800 |  | none | — |
| 12 | `#1C1E54` | blue | css-variable | medium | --hds-color-core-brand-900 |  | weak | — |

### Usage verification — 2 screenshot(s), Vision: on
Top pixel coverage: #F5F5FF 65.01%, #B9B9F9 3.72%, #D6D9FC 1.93%, #533AFD 1.18%, #E8E9FF 0.81%
Flagged as unused on page: #2E2B8C
Vision notes:
- `#E8E9FF` (none): Not visible on any screenshot. No elements match this very light lavender tint.
- `#E2E4FF` (none): Not visible on any screenshot. This pale blue-lavender does not appear on any branded elements.
- `#9A9AFE` (accent): Visible in the headline text as part of the purple gradient effect on words like 'omzet te laten' and 'financiële diensten', used as decorative text accent.
- `#7F7DFC` (accent): Appears in the headline text gradient, particularly visible in words like 'eigen' and parts of the purple-tinted text in the hero section.

### Symptoms
- missingPrimaryBlue heuristic: ok
- blue candidates in palette: #533AFD, #E8E9FF, #E2E4FF, #D6D9FC, #B9B9F9, #9A9AFE, #7F7DFC, #665EFD, #4032C8, #2E2B8C, #1C1E54
- red/green in palette (may be SEMANTIC-labelled): —
- CSS vars named success/error/warning: --hds-color-core-error-100: #feb9ac | --hds-color-core-error-400: #f3432a | --hds-color-core-error-500: #d8351e | --hds-color-core-error-600: #a01400 | --hds-color-core-success-100: #b6f2c7

## https://vercel.com

- Title: `Vercel: Build and deploy the best web experiences with the AI Cloud`
- Stylesheet links in HTML: 13 (0 plugin-like)
- Scraper saw 13 link tags — will fetch top 15 by rankStylesheets() priority
- CSS colour-vars found: 239 (semantic-named: 9)
- Colour frequency rows (post-filter): 61
- Fonts: body=`—`, heading=`—` (total 37)
- Logo URLs: 8
    - https://assets.vercel.com/image/upload/q_auto/front/favicon/vercel/apple-touch-icon-57x57.png
- Logo-extracted colours: none

### Authoritative palette (12/12)
Confidence split → high: 0, medium: 12, low: 0

| # | hex | hue | source | conf | detector / var | freq | usage | vision |
|---|-----|-----|--------|------|----------------|------|-------|--------|
| 1 | `#FFFFFF` | white-ish | css-variable | medium | --badge-color |  | strong | — |
| 2 | `#000000` | black-ish | css-variable | medium | --badge-bg-color |  | strong | — |
| 3 | `#D3E5FF` | blue | css-variable | medium | --geist-success-lighter |  | strong | — |
| 4 | `#0070F3` | blue | css-variable | medium | --geist-success |  | none | none |
| 5 | `#0761D1` | blue | css-variable | medium | --geist-success-dark |  | none | none |
| 6 | `#F7D4D6` | red | css-variable | medium | --geist-error-lighter |  | strong | — |
| 7 | `#EE0000` | red | css-variable | medium | --geist-error |  | none | none |
| 8 | `#C50000` | red | css-variable | medium | --geist-error-dark |  | none | none |
| 9 | `#FFEFCF` | neutral | css-variable | medium | --geist-warning-lighter |  | strong | — |
| 10 | `#F5A623` | yellow/orange | css-variable | medium | --geist-warning |  | weak | none |
| 11 | `#AB570A` | red | css-variable | medium | --geist-warning-dark |  | none | none |
| 12 | `#D8CCF1` | blue | css-variable | medium | --geist-violet-lighter |  | weak | — |

### Usage verification — 2 screenshot(s), Vision: on
Top pixel coverage: #FFFFFF 66.07%, #D3E5FF 4.73%, #FFEFCF 4.73%, #F7D4D6 1.45%, #000000 1.04%
Flagged as unused on page: #0070F3, #0761D1, #EE0000, #C50000, #AB570A
Vision notes:
- `#0070F3` (none): Not visible on any screenshot. The page uses black buttons and a multicolor gradient background, but no blue matching this hex appears in any branded element.
- `#0761D1` (none): Not visible on any screenshot. No blue of this shade appears in the navigation, buttons, or hero section.
- `#EE0000` (none): Not visible on any screenshot. While the gradient contains red/pink tones, this specific bright red does not appear as a distinct branded element.
- `#C50000` (none): Not visible on any screenshot. No dark red appears in any UI elements, buttons, or branding.

### Symptoms
- missingPrimaryBlue heuristic: ok
- blue candidates in palette: #D3E5FF, #0070F3, #0761D1, #D8CCF1
- red/green in palette (may be SEMANTIC-labelled): #F7D4D6, #EE0000, #C50000, #AB570A
- CSS vars named success/error/warning: --geist-success-lighter: #d3e5ff | --geist-success: #0070f3 | --geist-success-dark: #0761d1 | --geist-error-lighter: #f7d4d6 | --geist-error: #e00
