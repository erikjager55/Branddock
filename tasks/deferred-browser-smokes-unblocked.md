---
id: deferred-browser-smokes-unblocked
title: Drie browser-smokes die op een blocker wachtten die er niet meer is
fase: post-launch
priority: next
effort: 2-4 uur
owner: claude-code + user (visuele beoordeling)
status: open
created: 2026-08-16
completed:
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Gevonden bij de done-audit van 16-08 (zie [`campagne-wizard-e2e-restscope`](campagne-wizard-e2e-restscope.md)
voor de aanleiding). Drie hands-on browser-smokes zijn ooit uitgesteld met een **expliciete
reden**, hun taken gingen op `done`, en de reden is inmiddels vervallen — maar niemand heeft ze
alsnog gedraaid.

**Uit [`pre-launch-browser-smoke-batch`](done/pre-launch-browser-smoke-batch.md)** (status
`done`, twee items op `[⏸️]`):

- **Visual Brief Compose** — uitgesteld 2026-05-12 omdat localhost-storage-URL's
  (`/uploads/media/…`) niet publiek bereikbaar zijn voor de FAL/Gemini compose-pipeline.
- **Visual Brief Trained-Style** — zelfde blocker; het FAL trained-LoRA-model heeft publieke
  bron-URL's nodig.

Beide wachtten op `vercel-deployment`. **Dat is sinds 2026-07-05 live**, en R2 met
`R2_PUBLIC_URL` staat er ook. De blocker bestaat dus ruim een maand niet meer.

⚠️ Extra reden om dit nu te doen: de trainer/referentie-keten is op 21-07 twee keer stuk
geweest op precies deze klasse (verlopen signed R2-URL's + het nano-banana t2i-endpoint dat
`image_urls` stil dropt — zie `gotchas.md` 2026-07-21). Die gotcha zegt het zelf: *multi-ref-flows
valideer je alleen met een echte run op data met écht oude URL's*.

**Uit [`brandstyle-typography-fonts`](done/brandstyle-typography-fonts.md)** (status `done`,
sectie "Nog te doen (handmatig — bewust niet autonoom gedaan)"):

- Browser-smoke van de Typography-tab (checklist F4 stap 13) + before/after-screenshots.
- Optioneel: `scripts/rescrape-linfi.ts` als positieve fidelity-cross-check.

# Voorstel

Drie smokes draaien tegen productie (of een prod-achtige omgeving met echte R2-URL's), elk met
een vastgelegde uitkomst. Geen nieuwe code — dit is validatie van wat er al staat.

Waar mogelijk automatiseer ik met Playwright; de **visuele** beoordeling (ziet het beeld er
on-brand uit?) is mensenwerk en hoort bij Erik.

# Acceptatiecriteria

- [ ] Visual Brief **Compose** gedraaid met een echte, publieke R2-URL — beeld komt terug en
      volgt de referentie
- [ ] Visual Brief **Trained-Style** gedraaid — idem, mét een asset waarvan de opgeslagen URL
      écht oud is (dat is het scenario dat 21-07 omviel)
- [ ] Typography-tab browser-smoke + before/after-screenshots
- [ ] Per smoke vastgelegd: geslaagd/gefaald, wat er te zien was, en bij falen de oorzaak
- [ ] De twee `[⏸️]`-items in `pre-launch-browser-smoke-batch` afgevinkt of met reden gesloten

# Smoke test plan

Handmatig via de app op prod, met de checklist uit `pre-launch-browser-smoke-batch`. Voor de
trainer-flow: kies bewust een MediaAsset die vóór `R2_PUBLIC_URL` is geüpload — een verse
upload bewijst niets over deze klasse (gotcha 2026-07-21).

# Risico's

- **"Er komt een beeld uit" bewijst niets.** fal/Nano Banana faalt niet hard op onbereikbare
  `image_urls`; hij genereert stil prompt-only door. Beoordeel of de referentiestijl écht is
  gevolgd, niet of er output is.

# Out of scope

- Nieuwe features in de visual-brief-flow. Dit is uitsluitend het inhalen van uitgestelde
  validatie.
