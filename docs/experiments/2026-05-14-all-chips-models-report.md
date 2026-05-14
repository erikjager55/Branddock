# All-chips model comparison — 2026-05-14

Per use-case groep getest welk SOTA model het beste presteert. 4 groepen die alle chips dekken (siblings delen winnaar).

## Group A: Photoreal scene with people
Chips: `lifestyle`, `behind-the-scenes`, `ugc`

**Brief**: Authentic candid photo of restaurant staff in white uniforms working together in a warm professional kitchen. Natural lighting, real moments, not posed. Warm color palette with teal accents. No text, no captions, no signage.

| Rank | Model | Composite | Dimensions | Latency | Cost | URL |
|------|-------|----------:|-----------|--------:|------|-----|
| 1 | Phota (photoreal specialist) | **87** | authenticity:85 / warmth:80 / brandFit:88 / noTextCompliance:95 | 16.6s | $0.03 | [link](https://v3b.fal.media/files/b/0a9a393c/b2x6N3eust5hVcMm23_b6_sUSYkUhv.png) |
| 2 | Nano Banana Pro | **86** | authenticity:92 / warmth:70 / brandFit:85 / noTextCompliance:95 | 26.8s | $0.02 | [link](https://v3b.fal.media/files/b/0a9a3939/ody6WthouRkkCZwt_sc-P_i5612VYS.png) |
| 3 | FLUX 2 Pro | **77** | authenticity:72 / warmth:85 / brandFit:68 / noTextCompliance:82 | 12.8s | $0.03 | [link](https://v3b.fal.media/files/b/0a9a3939/81L9i-5ofDT2U8mL-XCjO_dwV6MfA1.png) |
| 4 | Seedream V4 | **71** | authenticity:58 / warmth:72 / brandFit:75 / noTextCompliance:78 | 10.2s | $0.04 | [link](https://v3b.fal.media/files/b/0a9a394a/DcOWbcKU5ZUIk75CPX_Gs_b2f39bb5ad5545fda4aa6cc473a13d49.png) |
| 5 | GPT Image 2 | — | — | 120.1s | $0.21 | ERR: Client timed out waiting for the request to comple |

### Judge motivatie per model

- **Phota (photoreal specialist)** (composite 87): Excellent candid feel with staff focused on real tasks; teal stripe details on aprons and tiles integrate brand color subtly and authentically. Warm natural window light and practical kitchen setting align perfectly with Napking's professional-but-not-luxury positioning.
- **Nano Banana Pro** (composite 86): Highly candid and authentic with genuine laughter and real kitchen chaos — perfectly no-nonsense and non-luxury. Teal accents appear naturally in bandanas and gloves, strongly matching Napking's brand color, though the cooler daylight reduces warmth slightly.
- **FLUX 2 Pro** (composite 77): Warm golden lighting and active kitchen energy feel genuine and candid, though the scene leans slightly upscale with the styled interior. Teal tiles in the background provide a nice brand color nod, but the overall aesthetic edges toward premium rather than practical B2B horeca.
- **Seedream V4** (composite 71): Bold teal architectural elements are visually striking and on-brand, but the two chefs feel somewhat posed and the scene has a slightly staged, commercial quality. Possible text/embroidery on uniforms slightly reduces compliance, and the luxury-adjacent styling is a mild mismatch for Napking's no-nonsense identity.
- **GPT Image 2** — ERROR: Client timed out waiting for the request to complete after 120000ms

**Aanbevolen voor chips `lifestyle`, `behind-the-scenes`, `ugc`: Phota (photoreal specialist)** (composite 87, $0.03)

## Group B: Product-shot (textile close-up)
Chips: `product-shot`

**Brief**: Clean product photography: a stack of pristine white folded napkins with a small "Napking" textile label visible on the corner. Studio lighting, neutral background, sharp detail on fabric texture. Brand colors teal and warm off-white. Highly detailed.

| Rank | Model | Composite | Dimensions | Latency | Cost | URL |
|------|-------|----------:|-----------|--------:|------|-----|
| 1 | Seedream V4 (text-in-product specialist) | **88** | materialAccuracy:82 / labelLegibility:92 / composition:88 / brandFit:90 | 10.1s | $0.04 | [link](https://v3b.fal.media/files/b/0a9a394d/CchdeBIDdBPD-OFcmXlOp_79afb35e1f93433ab8365f820f1e34e5.png) |
| 2 | Nano Banana Pro | **83** | materialAccuracy:85 / labelLegibility:88 / composition:86 / brandFit:72 | 39.9s | $0.02 | [link](https://v3b.fal.media/files/b/0a9a3959/Xi_7qShrRwqk49WBI8PbB_Lxb95OwT.png) |
| 3 | FLUX 2 Pro | **81** | materialAccuracy:78 / labelLegibility:85 / composition:82 / brandFit:78 | 14.2s | $0.03 | [link](https://v3b.fal.media/files/b/0a9a395e/0J8kBFlEmt_mkcYp4tzMh_T7FsTuyT.png) |
| 4 | Ideogram V3 | **69** | materialAccuracy:80 / labelLegibility:72 / composition:58 / brandFit:65 | 12.3s | $0.04 | [link](https://v3b.fal.media/files/b/0a9a395f/KeO84z8MeVul156vFKY6X_image.png) |
| 5 | GPT Image 2 | — | — | 120.2s | $0.21 | ERR: Client timed out waiting for the request to comple |

### Judge motivatie per model

- **Seedream V4 (text-in-product specialist)** (composite 88): Uitstekende labelleesbaarhied met duidelijk 'Napking' in donkerblauw op off-white label; de tweedelige teal/warm-off-white achtergrond sluit perfect aan op de merkidentiteit. Textuurdétail is goed maar de servet is slechts één exemplaar in plaats van een stapel, wat de productshot-conventie iets verzwakt.
- **Nano Banana Pro** (composite 83): Mooie stapel met zichtbare linnen textuur en leesbaar teal label; de neutrale grijsbeige achtergrond mist echter de warme off-white en teal merkaccenten waardoor de brandfit matig scoort.
- **FLUX 2 Pro** (composite 81): Goed leesbaar teal label met gouden tekst (afwijkend van merkrichtlijnen) en nette stapelcompositie; de stof oogt wat glad en mist fijn textuurdétail, en de gouden letterkleur past niet bij de merkidentiteit.
- **Ideogram V3** (composite 69): Rijke stoftextuur en teal prop in de achtergrond, maar de compositie is rommelig (schuine servet, diepe schaduwen, niet-studio sfeer) en het label toont 'napking' in kleine letters wat de merkconsistentie ondermijnt.
- **GPT Image 2** — ERROR: Client timed out waiting for the request to complete after 120000ms

**Aanbevolen voor chips `product-shot`: Seedream V4 (text-in-product specialist)** (composite 88, $0.04)

## Group C: Quote-text / typography poster
Chips: `quote-text`

**Brief**: Typography-led design: large clear text "Vlekkeloos textiel, zorgeloos werken" as focal point. Geometric solid background in teal #0D9488. Off-white text. Modern sans-serif font. Minimal decoration. No other elements.

| Rank | Model | Composite | Dimensions | Latency | Cost | URL |
|------|-------|----------:|-----------|--------:|------|-----|
| 1 | Ideogram V3 (typography specialist) | **78** | textLegibility:88 / typography:90 / brandFit:72 / minimalism:60 | 13.0s | $0.04 | [link](https://v3b.fal.media/files/b/0a9a3962/hXCfs8eID8MMu41DKOKD7_image.png) |
| 2 | Seedream V4 | **75** | textLegibility:90 / typography:82 / brandFit:62 / minimalism:65 | 10.2s | $0.04 | [link](https://v3b.fal.media/files/b/0a9a3966/DrcBeH4Sun5R851mRr40w_b09bae993c2d42d1a0c2764438326e3e.png) |
| 3 | Nano Banana Pro | **69** | textLegibility:70 / typography:65 / brandFit:68 / minimalism:72 | 19.0s | $0.02 | [link](https://v3b.fal.media/files/b/0a9a3963/kn3Uit8CTCNFS_m4uGAWu_Dox6oAzn.png) |
| 4 | Recraft V3 (style: digital_illustration for typo) | **51** | textLegibility:80 / typography:65 / brandFit:45 / minimalism:15 | 11.0s | $0.04 | [link](https://v3b.fal.media/files/b/0a9a3963/7ebm-CF4gd_QWq5HvDizJ_image.webp) |
| 5 | GPT Image 2 | — | — | 120.1s | $0.21 | ERR: Client timed out waiting for the request to comple |

### Judge motivatie per model

- **Ideogram V3 (typography specialist)** (composite 78): Tekst is correct gespeld en goed leesbaar met een mooie moderne sans-serif, maar de achtergrond bestaat uit meerdere geometrische teal-vlakken in verschillende tinten in plaats van één solide kleur, wat de minimalisme-eis schaadt. De off-white kleur is goed getroffen.
- **Seedream V4** (composite 75): Tekst is correct gespeld en zeer leesbaar met een goede moderne sans-serif, maar de tekstkleur is puur wit in plaats van off-white (#FAFAF7), en de achtergrond toont geometrische driehoekige vlakken in lichtere teal-tinten plus een kleine lichtreflectie — niet volledig solide.
- **Nano Banana Pro** (composite 69): Achtergrond is teal en tekst is off-white, maar 'zorgeloos' is fout gespeld als 'ZORGELOÓS' met een accent, en de tekst heeft een subtiele drop-shadow die de minimalisme-eis licht schaadt; de achtergrond heeft ook een lichte textuur/gradient.
- **Recraft V3 (style: digital_illustration for typo)** (composite 51): Tekst is correct en leesbaar maar in pure wit (niet off-white) en all-caps wat minder elegant is; de achtergrond bevat een fotorealistisch persoon, hexagonale patronen en een logo-icoon — dit is het tegenovergestelde van minimalistisch en wijkt sterk af van de brief.
- **GPT Image 2** — ERROR: Client timed out waiting for the request to complete after 120000ms

**Aanbevolen voor chips `quote-text`: Ideogram V3 (typography specialist)** (composite 78, $0.04)

## Group D: Infographic / data-viz
Chips: `infographic`, `data-driven`

**Brief**: Information graphic: prominent stat "280+ restaurants" as hero number. Small icon of a folded napkin. Sub-text "geserveerd in de Randstad". Clean structured layout with teal #0D9488 accent on the number. Light grey background. Minimal decoration. Modern editorial style.

| Rank | Model | Composite | Dimensions | Latency | Cost | URL |
|------|-------|----------:|-----------|--------:|------|-----|
| 1 | Ideogram V3 | **83** | dataLegibility:88 / structure:90 / brandFit:75 / iconAccuracy:80 | 11.6s | $0.04 | [link](https://v3b.fal.media/files/b/0a9a3978/cUja3kQwtzTngCjb5lGIy_image.png) |
| 2 | Nano Banana Pro (world-knowledge + text) | **82** | dataLegibility:82 / structure:85 / brandFit:88 / iconAccuracy:72 | 32.5s | $0.02 | [link](https://v3b.fal.media/files/b/0a9a3974/CegHTu6H0m8l8KWeisCXU_UTLDbbfk.png) |
| 3 | Seedream V4 | **60** | dataLegibility:78 / structure:45 / brandFit:65 / iconAccuracy:50 | 19.9s | $0.04 | [link](https://v3b.fal.media/files/b/0a9a397b/j9HepH2iv8DBvNFKnyqPm_080bff12a8af4e2db3ed252a2e4e5c2d.png) |
| 4 | Recraft V3 (vector_illustration) | — | — | 14.7s | $0.04 | SVG (skipped) |
| 5 | GPT Image 2 | — | — | 120.1s | $0.21 | ERR: Client timed out waiting for the request to comple |

### Judge motivatie per model

- **Ideogram V3** (composite 83): Excellent editorial hierarchy with '280+ restaurants' prominent and sub-text clearly legible; the folded napkin icon is clean and recognizable. However, the color used is a darker teal/navy rather than the specified #0D9488, slightly missing the brand accent requirement.
- **Nano Banana Pro (world-knowledge + text)** (composite 82): Hero number '280+' is large and clearly teal-accented, sub-text 'geserveerd in de Randstad' is readable in charcoal; clean editorial hierarchy with light background and minimal border decoration. The napkin icon is present and recognizable as a folded textile, though the diamond-rotated style makes it slightly abstract.
- **Seedream V4** (composite 60): The '280+' number is large and uses a teal close to brand color, but the dominant food photography background severely disrupts the clean editorial structure requested and competes with the data hierarchy. The napkin icon is present but small and partially obscured, and the overall composition is far from the minimal infographic brief.
- **Recraft V3 (vector_illustration)** — SVG (judge skipped)
- **GPT Image 2** — ERROR: Client timed out waiting for the request to complete after 120000ms

**Aanbevolen voor chips `infographic`, `data-driven`: Ideogram V3** (composite 83, $0.04)
