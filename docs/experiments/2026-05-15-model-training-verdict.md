# Final verdict — model training strategie (2026-05-15)

Onderzoek naar of de huidige Branddock-trainingsaanpak nog steeds adequaat is, vergeleken met state-of-the-art alternatieven en de praktijkervaring uit het Gewoon Guus kinderboek-project.

---

## Huidige situatie Branddock

**Trainer per model-type** (uit `model-constants.ts`):

| Type | Trainer | Generator | Status |
|------|---------|-----------|--------|
| PERSON | `fal-ai/flux-lora-portrait-trainer` | `fal-ai/flux-lora` | Oudere stack (FLUX 1) |
| PRODUCT / STYLE / OBJECT / BRAND_STYLE / PHOTOGRAPHY / ILLUSTRATION | `fal-ai/flux-2-trainer` | `fal-ai/flux-2/lora` | Up-to-date (FLUX 2) |

**Workflow**: minimum 9-50 images, 2500 steps standaard, $0.008/step → ~$20 per LoRA, training tijd 6-12h afhankelijk van GPU-tier.

## Praktijkervaring Gewoon Guus

Sprint A (stijl-LoRA `BERELO_style`, 2026-05-09 → 10):

- **Pipeline**: 160 trainingsbeelden → curatie 30 sterkste → 2500-steps FLUX 2 training → 9 OOD-validaties
- **Cost**: $20 per LoRA, ~38 min training-tijd op fal.ai
- **Resultaat**: 8/9 OOD-tests sterk (rect brushy vignets, palette-adherence, geen wildlife-hallucinatie)
- **Cruciale les**: V1 met **Gemini-trainingsdata** gaf domain-shift → V2 pivot naar **all-FLUX pipeline** (trainingsdata via FLUX 2, inference via FLUX 2 LoRA)
- **Curatie-inzichten**: drop prompts met outlier-clusters; sky-only prompts triggeren wildlife-hallucinatie; objects met sunset-lighting krijgen palette-drift

## State-of-the-art 2026 alternatieven

### LoRA training opties

| Trainer | Cost (2500 steps) | Speed | Quality | Verdict |
|---------|------------------:|------:|---------|---------|
| **FLUX 2 trainer** (huidig) | $20 | 6-12h | Top-tier voor branded design | Productie-bewezen |
| **Z-Image trainer** | ~$5.65 | 1-3h | Blind-test indistinguishable van FLUX 2 | 3-4× cheaper |
| FLUX LoRA Fast | ~$10 | <1h | Slightly lager dan FLUX 2 | Voor MVP |
| FLUX LoRA Portrait (huidig PERSON) | ~$15 | 2-4h | Specifiek PERSON; geen FLUX 2 features | Legacy |

### Brand-consistency alternatieven zonder training

- **IP-Adapter / Style-reference**: 1-5 reference images, geen training-stap. Goed voor one-off variations, **LOSES** voor long-term identity recall + detail-capture.
- **Multi-reference fusion** (Nano Banana 14 images, Recraft 5 images): zelfde profiel als IP-Adapter — flexibel maar zwakker dan LoRA voor brand-character.
- **Stacked LoRA + IP-Adapter**: professionele standaard 2026 — LoRA voor base identity, adapter voor scene-variatie.
- **Nano Banana fine-tuning**: niet beschikbaar voor end-users (alleen Google internally via Vision Banana). Geen alternative voor brand-specific training.

### Branddock F40 brand-style anchors

We bouwden in F40 een lightweight style-reference systeem: 3-10 anchor-images per workspace die via `image_urls` worden meegestuurd. Dit is **complementair** aan LoRA, niet vervangend:

- **Anchors**: voor workspaces zonder LoRA-investment, of voor consistency over één campagne
- **LoRA**: voor workspaces die brand-specific characters / signature style nodig hebben

---

## Verdict

### 1. LoRA-pipeline blijft de juiste keuze

De huidige FLUX 2 trainer aanpak is **architecturaal correct en productie-bewezen**:
- Eigen Gewoon Guus pipeline bewijst dat het werkt (8/9 OOD-tests sterk)
- LoRA wint van alle reference-based alternatieven voor long-term brand-character recall
- FLUX 2 levert top-tier kwaliteit voor branded design

### 2. Drie concrete verbeteringen

**A. PERSON trainer upgrade** (P1 follow-up)
Huidige `fal-ai/flux-lora-portrait-trainer` is FLUX 1-tier. Migreer naar `fal-ai/flux-2-trainer` zoals andere types — uniforme stack, betere quality, zelfde cost-profiel. Bestaande LoRAs blijven werken; nieuwe trainingen gaan via FLUX 2.

**B. Z-Image als budget-tier (P2)**
Voor cost-sensitive workspaces of MVP-fase brands: bied `fal-ai/z-image-trainer` als alternatief ($5.65 ipv $20, 1-3h ipv 6-12h). Blind-test laat zien dat output kwalitatief vergelijkbaar is. Selectie via workspace AI-config of pricing-tier.

**C. Gewoon Guus curatie-lessen documenteren** (P3)
Voeg curatie-richtlijnen toe aan AI Trainer UI:
- "Scan eerst alle 160 outputs voor dominante aesthetic-cluster — drop outliers"
- "Vermijd sky-only prompts in savanna/outdoor context — wildlife-hallucinatie 100%"
- "Object-trainings: gebruik neutral lighting OF hex-code object-kleur expliciet per prompt"
- "Train data MUST match inference model — geen domain-shift mixen (Gemini training → FLUX inference faalt)"

### 3. Anchors + LoRA = optimal stack

Brand-style anchors (F40) en LoRA-training vullen elkaar aan:

```
Workspace zonder LoRA           → anchors als style-reference (lightweight)
Workspace met LoRA              → LoRA als base + anchors voor scene-variatie
Workspace met LoRA + IP-Adapter → top-tier consistency (toekomstige toevoeging)
```

Branddock heeft beide nu: LoRA via Trained Style-source, anchors via Brand Foundation panel.

### 4. Niet doen

- **Nano Banana fine-tuning**: niet beschikbaar voor end-users. Wachten op Google.
- **Recraft V4 LoRA-equivalent**: bestaat niet; Recraft heeft style-reference systeem (5 images) als enige optie. Bruikbaar maar niet vervangend voor LoRA.
- **Mixen van trainings-stacks**: NIET trainen op Gemini-output en inferen op FLUX. Gewoon Guus V1 → V2 pivot bewees dat domain-shift catastrofaal is.

---

## Actie-items follow-up

| Prio | Fix | Effort | Cost-impact |
|------|-----|-------:|-------------|
| P1 | PERSON trainer migratie naar flux-2-trainer | 2u | $0 |
| P2 | Z-Image trainer als budget-tier optie | 4u | +cost-tier optie |
| P3 | Curatie-tips in AI Trainer UI | 3u | $0 |

Geen P0 issues — huidige pipeline is solid. De drie suggesties zijn optimalisaties, niet bug-fixes.

---

## Sources

- [Train FLUX LoRA Fast — fal.ai](https://fal.ai/models/fal-ai/flux-lora-fast-training)
- [FLUX.2 [dev] Trainer — fal.ai](https://fal.ai/models/fal-ai/flux-2-trainer)
- [Z-Image vs Flux.1 comparison 2026 — Z-Image Blog](https://zimage.design/blog/z-image-vs-flux-comparison/)
- [Z-Image Trainer — fal.ai](https://fal.ai/models/fal-ai/z-image-trainer)
- [Training FLUX.2 LoRAs — fal blog](https://blog.fal.ai/training-flux-2-loras/)
- [Best Practices for Training LoRA Models with Z-Image (2026) — DEV](https://dev.to/gary_yan_86eb77d35e0070f5/best-practices-for-training-lora-models-with-z-image-complete-2026-guide-4p7h)
- [Best LoRAs for Consistent Characters 2026 — Thinkpeak AI](https://thinkpeak.ai/best-loras-consistent-characters-2026/)
- [ComfyUI LoRA Training Guide 2026 — Apatero](https://www.apatero.com/blog/comfyui-lora-training-character-consistency-guide-2026)
- [Style Without Training: IP-Adapter — Medium](https://shree6791.medium.com/part-4-style-without-training-how-ip-adapter-adds-you-to-the-picture-836c9355b085)
- [Understanding IP Adapters — Mercity Research](https://www.mercity.ai/blog-post/understanding-and-training-ip-adapters-for-diffusion-models/)
- [Nano Banana Pro guide 2026 — AVB](https://aivideobootcamp.com/blog/nano-banana-pro-complete-guide-2026/)
- [Vision Banana Explained — DataCamp](https://www.datacamp.com/blog/vision-banana-explained)
