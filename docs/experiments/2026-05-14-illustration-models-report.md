# Illustration models comparison — 2026-05-14

Vergelijk van 6 SOTA image-models op één illustration-brief (Napking restaurant-manager). Elk model gebruikt zijn eigen optimale config — niet generic.

## Brief
Een ontspannen restaurantmanager in horeca-omgeving. Op de achtergrond keukenpersoneel in vlekkeloos witte kokskleding bezig met hun werk. Sfeer: warm, professioneel, geen stress. Geen tekst, geen logos, geen signage.

## Score-weging
- styleMatch (30%) — illustration-stijl bereikt?
- brandFit (30%) — Napking-look (warm/professional, brand-colors)
- noTextCompliance (20%) — geen tekst in image
- subjectAccuracy (20%) — depicts requested scene

## Resultaat

| Rank | Model | Composite | Style | Brand | NoText | Subject | Latency | Cost | URL |
|------|-------|----------:|------:|------:|-------:|--------:|--------:|------|-----|
| 1 | Nano Banana Pro | **88** | 82 | 88 | 95 | 90 | 21.7s | $0.02 | [link](https://v3b.fal.media/files/b/0a9a38eb/ote_sJRcLp3D1VPkLNV7C_qB6Wwaj6.png) |
| 2 | Gemini 2.5 Flash Image (native) | **82** | 80 | 78 | 98 | 75 | 8.3s | $0.04 | [link](file:///Users/erikjager/Projects/branddock-app/docs/experiments/images-2026-05-14/gemini-flash-image.png) |
| 3 | Recraft V3 (digital_illustration) | **60** | 88 | 62 | 5 | 72 | 8.9s | $0.04 | [link](https://v3b.fal.media/files/b/0a9a38e9/rbSpV-WDhs649SdlzwEcJ_image.webp) |
| 4 | FLUX 2 Pro | **58** | 2 | 72 | 92 | 88 | 18.2s | $0.03 | [link](https://v3b.fal.media/files/b/0a9a38f0/Vz19RgPrUAlFJOWKFgLHp_6ehqrUh7.png) |
| 5 | Ideogram V3 | **53** | 3 | 58 | 95 | 80 | 13.5s | $0.04 | [link](https://v3b.fal.media/files/b/0a9a38f1/-BRv5QJDF2uhnIfJFaghM_image.png) |
| 6 | Recraft V3 (vector_illustration) | — | — | — | — | — | 19.5s | $0.04 | SVG (judge skipped) — https://v3b.fal.media/files/b/0a9a38eb/fRJ-Qv4YD3I6Z3dZffTRk_image.svg |

## Per-model judge-motivatie

### Nano Banana Pro (composite 88)
- Sterke illustratie-stijl met uitstekende brandfit: teal muurkleur, warme verlichting, ontspannen manager met teal shirt en keukenpersoneel zichtbaar via open keukenvenster. Vrijwel geen tekst, professionele maar niet-luxe sfeer — past goed bij Napking.
- URL: https://v3b.fal.media/files/b/0a9a38eb/ote_sJRcLp3D1VPkLNV7C_qB6Wwaj6.png

### Gemini 2.5 Flash Image (native) (composite 82)
- Nette illustratie-stijl met teal keukenkasten en warme sfeer, geen tekst zichtbaar. De manager draagt echter een schort wat hem meer als kok positioneert dan als manager, en het keukenpersoneel draagt grijze schorten in plaats van vlekkeloos witte kokskleding.
- URL: file:///Users/erikjager/Projects/branddock-app/docs/experiments/images-2026-05-14/gemini-flash-image.png

### Recraft V3 (digital_illustration) (composite 60)
- Duidelijk illustratie-stijl met teal kleuraccenten die goed bij Napking passen, maar de afbeelding is overladen met embedded tekst en menu-borden die de brief direct overtreden. Manager en keukenpersoneel in witte kleding zijn aanwezig, maar de setting lijkt meer een bakkerij/counter dan een restaurant.
- URL: https://v3b.fal.media/files/b/0a9a38e9/rbSpV-WDhs649SdlzwEcJ_image.webp

### FLUX 2 Pro (composite 58)
- Fotorealistisch beeld — voldoet niet aan de illustratie-stijlvereiste. Inhoudelijk sterk: ontspannen manager vooraan, keukenpersoneel in witte koksjassen op de achtergrond, teal kleuraccenten zichtbaar, maar de setting oogt iets te upscale/luxe voor Napking.
- URL: https://v3b.fal.media/files/b/0a9a38f0/Vz19RgPrUAlFJOWKFgLHp_6ehqrUh7.png

### Ideogram V3 (composite 53)
- Eveneens fotorealistisch — niet de gevraagde illustratie-stijl. De sfeer is te luxe/fine-dining (gele tafelkleden, formeel pak met stropdas, glanzende keuken) wat niet aansluit bij Napking's no-nonsense positionering, hoewel teal accenten en keukenpersoneel aanwezig zijn.
- URL: https://v3b.fal.media/files/b/0a9a38f1/-BRv5QJDF2uhnIfJFaghM_image.png

### Recraft V3 (vector_illustration) (no judge)
- SVG-output — Claude Vision API ondersteunt geen SVG; visueel handmatig te beoordelen via URL.
- URL: https://v3b.fal.media/files/b/0a9a38eb/fRJ-Qv4YD3I6Z3dZffTRk_image.svg
