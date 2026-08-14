---
id: lp-image-routes
title: "Beeld-routes webpage-builder: hoofdstukbeelden long-form + merkbeelden-beheer"
fase: post-launch
priority: now
effort: 1 dag
owner: claude-code (remote sessie)
status: review
created: 2026-08-14
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md (opvolging)
worktree: remote-sessie (claude/puck-editor-improvement-y9ep4x, herstart vanaf main)
---

# Aanleiding

Livegang-feedback Erik (2026-08-14, linfi.branddock.app/pillar-page): "er worden een
minimaal aantal afbeeldingen getoond". Onderzoek wees uit:

1. Long-form/GEO-typen (pillar-page, blog-post, whitepaper, case-study, ebook,
   linkedin-article, thought-leadership) hebben **alleen een hero-beeldslot** —
   artikel-secties hebben geen beeld. Dit verklaart de kale pillar-page.
2. Er is **geen UI om merkbeelden te beheren/uploaden** — `brandImages` wordt alleen
   door de scraper gevuld; de PATCH `/api/brandstyle/imagery` accepteert het veld al.
3. De sectie-editor heeft per beeldveld al een complete picker (Generate/Library/
   Upload/Stock via `ImageSourcePanel`) — zodra een veld bestaat, is handmatig én
   AI-vullen dus al geregeld.

# Scope

- **W1 — hoofdstukbeelden long-form**: `geoSectionSchema` + `imageUrl`/`imageBrief`;
  GEO-systeemprompt genereert 2-3 sectie-briefs (bewijs-gedreven, divers, unbranded);
  template geeft beeld door aan `RichText`; `RichText` krijgt optioneel figure-render
  + editor-beeldveld; merkbeelden vullen lege slots (uitbreiding `brand-images.ts`).
- **W2 — merkbeelden-beheer**: blok in styleguide → Imagery-sectie: grid van huidige
  merkbeelden, verwijderen, toevoegen via media-library-upload; persist via bestaande
  PATCH `/api/brandstyle/imagery`.

# Out of scope

- Automatische AI-generatie van sectie-beelden bij page-generate (kosten-beslissing;
  briefs worden wél gegenereerd zodat de Generate-tab per veld raak schiet).
- Beeldslots voor overige sectietypen die er bewust geen hebben (FAQ, StatsBlock e.d.).

# Acceptatiecriteria

- [x] Nieuwe long-form generatie levert secties met imageBrief (2-3, divers, unbranded) — prompt-regel 11 + schema
- [x] RichText rendert imageUrl als figure (zelfde registry voor editor-preview, publieke route én compiled artifact)
- [x] Editor toont beeldveld op artikel-secties (imageField → ImageSourcePanel incl. Generate)
- [x] Merken mét brandImages krijgen automatisch beelden in artikel-secties (assignBrandImagesToGeoVariant)
- [x] Styleguide → Imagery: merkbeelden bekijken/toevoegen/verwijderen (BrandImagesPanel, upload via /api/media)
- [x] Bestaande gepubliceerde pagina's renderen ongewijzigd (imageUrl optioneel, default leeg)
- [x] `npx tsc --noEmit` 0 errors, eslint clean op geraakte files
- [ ] Smoke op prod (Erik): nieuwe pillar-page genereren → sectie-beelden; merkbeeld uploaden → volgende generatie gebruikt hem

# Smoke-test

Nieuwe pillar-page genereren voor een merk mét merkbeelden → secties tonen beelden;
merk zonder merkbeelden → briefs aanwezig, Generate-tab vult veld; upload merkbeeld
in styleguide → volgende generatie gebruikt hem.
