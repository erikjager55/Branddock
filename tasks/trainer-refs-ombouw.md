---
id: trainer-refs-ombouw
title: AI-trainer ombouwen — LoRA-training eruit, referentie-gedreven generatie erin
fase: pre-launch
priority: now
effort: 1 dag
owner: claude-code
status: done
created: 2026-07-21
completed: 2026-07-21
related-adr: -
related-spec: -
worktree: branddock-trainer-refs
---

# Probleem

Erik (2026-07-21): de AI-trainer is "kwalitatief onvoldoende" — verwijderen of verbeteren? Analyse: de LoRA-pijplijn (fal.ai flux-2-trainer) is het structureel zwakke deel — 10-20 beelden is te weinig voor een goede LoRA, elke training kost tijd/geld, en het resultaat veroudert bij elk nieuw basismodel. De sterke delen (referentie-upload, Claude-Vision-stijlanalyse) hangen niet aan LoRA. Het platform heeft de moderne opvolger al aan boord: brand-style anchors (F40) — referentiebeelden direct als `image_urls` per generatie.

# Voorstel (Eriks go: "kunnen we de lora-training niet ombouwen?")

LoRA-train- en LoRA-generate-primitieven verwijderen; de drie generatiepaden (model-generate, studio generate-visual-trained, media TRAINED_MODEL) omzetten naar multi-ref generatie via `generateFalImage` + `referenceImageUrls` (Nano Banana Pro, cap 14 refs). Upload + stijlanalyse + showcase blijven; een model is READY zodra er ≥3 referentiebeelden zijn (was: na training met ≥10).

# Acceptatiecriteria

- [x] `POST /consistent-models/[id]/generate` genereert via referentiebeelden (≥3 vereist), zonder falLoraUrl
- [x] Studio `generate-visual-trained` en media `TRAINED_MODEL` idem; strength-slider vervallen
- [x] Train/training-status-routes, training-pipeline/-poller en fal-LoRA-functies verwijderd; REPLICATE_API_TOKEN-env weg
- [x] Bestaande (ooit getrainde) modellen blijven werken — hun referenceImages voeden het nieuwe pad
- [x] Wizard zonder trainingsstap (Upload → Showcase; illustratie: Upload → Stijlanalyse → Showcase); READY-flip bij upload
- [x] Geen schema-migratie (LoRA-kolommen blijven ongebruikt staan — additief beleid, geen Neon-push nodig)
- [x] `npx tsc --noEmit` 0 errors; eslint 0 errors op aangeraakte bestanden
- [x] Changelog-entry

# Bestanden (kern)

Backend: consistent-models generate/reference-images-routes, studio generate-visual-trained, media ai-images generate, fal-client (LoRA-functies weg), training-pipeline/-poller (weg), env-validation.
Frontend: ModelDetailPage (herschreven), TrainingSection/-ProgressModal/-StatusCard (weg), TrainedStylePicker (slider weg), model-constants (LoRA-config weg, MIN 10→3, REFERENCE_GENERATOR_MODEL), hooks/api (training-functies weg), i18n nl/en.

# Out of scope

- VOICE/SOUND_EFFECT-types (waren al niet-trainbaar)
- dall-e-3-restanten in andere beeldpaden (aparte beeld-review)
- Naamgeving "AI Trainer" in navigatie (productbesluit Erik)
