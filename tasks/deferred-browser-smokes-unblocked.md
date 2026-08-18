---
id: deferred-browser-smokes-unblocked
title: Drie browser-smokes die op een blocker wachtten die er niet meer is
fase: post-launch
priority: next
effort: 2-4 uur
owner: claude-code + user (visuele beoordeling)
status: review
created: 2026-08-16
completed: 2026-08-18 (op één prod-beoordeling na)
related-adr: -
related-spec: -
worktree: branddock-deferred-browser-smokes
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

- [x] Visual Brief **Compose** gedraaid met een echte, publieke R2-URL — beeld komt terug en
      volgt de referentie
- [~] Visual Brief **Trained-Style** — de faalklasse is deterministisch afgedekt met een écht
      verlopen signed URL; de visuele beoordeling op prod resteert (Erik)
- [x] Typography-tab browser-smoke — 12/12; **geen** echte before/after-screenshots, zie hieronder
- [x] Per smoke vastgelegd: geslaagd/gefaald, wat er te zien was, en bij falen de oorzaak
- [x] De twee `[⏸️]`-items in `pre-launch-browser-smoke-batch` afgevinkt of met reden gesloten

# Uitkomst (2026-08-18)

## De sweep vond twee ongeguarde routes — dít was de echte opbrengst

De gotcha van 21-07 schrijft een **call-site-sweep** voor bij deze klasse ("één gefixte route
bewijst niets over de andere"). Die sweep vond twee producenten die een uit de DB gelezen
storage-URL rauw aan een externe fetcher gaven:

| Route | Wat er rauw doorging |
|---|---|
| `generate-visual-compose/route.ts:203` | `MediaAsset.fileUrl` → `composeFromImages` |
| `refine-visual/route.ts:158` | `component.imageUrl` → `composeFromImages` (de anchors ernaast wérden geresolved) |

Beide gaan nu door `resolveStorageUrl(s)`, net als `generate-visual-trained`.

⚠️ **De faalmodus is anders dan in 2026-07-21 en dat is belangrijk voor de inschatting.** Daar
dropte fal `image_urls` stil en kwam er een beeld uit zónder stijl. Hier downloadt Gemini de
URL's server-side (`fetchImageAsInlineData`), dus een verlopen URL geeft `!res.ok` →
`ComposeInvalidImageError` → 422. Compose was voor oude prod-assets dus **luid stuk met een
verwarrende melding** ("Reference image fetch returned 403"), niet stil verkeerd.

⚠️ **Reikwijdte op prod is niet vastgesteld.** Of er prod-rijen mét verlopen signed URL's
bestaan is van hieruit niet te zien (geen prod-DB-toegang). Lokaal bestaan ze niet: 561
`/uploads/`-paden + 72 duurzame `pub-…r2.dev`-URL's, nul signed. Nieuwe uploads krijgen sinds
`R2_PUBLIC_URL` een duurzame URL, dus dit raakt alleen oudere rijen.

## Bewijs

**`npm run smoke:storage-url-expiry` — 21/21.** Drie delen: normalisatie-contracten (puur),
call-site-dekking, en een échte R2-round-trip die een object met 1s TTL ondertekent en laat
verlopen: **rauw 403, geresolved 200, byte-identiek**. Geen mock — de echte faalconditie,
zonder prod-toegang.

**Op tanden getest, niet alleen groen.** De call-site-check draait ook tegen de óngefixte bron
in de main-worktree en faalt daar op beide routes — hij zou de bug dus gevangen hebben.

**Typography-tab browser-smoke — 12/12.** `getComputedStyle` bewijst dat Type Scale en In
Context h1/h2/h3 met dezelfde familie én weight renderen (700/600/600).

**Compose — echte Gemini-call op twee publieke R2-URL's.** 9,1s, 2,4 MB, en in de output zijn
beide referenties herkenbaar overgenomen. Bewust twee sterk herkenbare beelden gekozen, omdat
"er komt een beeld uit" per de risico-notitie hieronder niets bewijst.

## Twee observaties uit de Compose-run (geen blocker, niet gefixt)

1. **`aspectRatio` is advies, geen instelling.** Gemini Image kent geen native aspect-parameter;
   `composeFromImages` plakt er een zin aan de prompt (`ASPECT_INSTRUCTION_SUFFIX`). Met
   `'1:1'` gevraagd kwam **1632×640** terug. De route berekent die aspect uit het medium en
   geeft 'm door — de gebruiker kiest dus een verhouding en krijgt iets anders.
2. **De compositie-instructie werd deels genegeerd**: gevraagd om voor-/achtergrond, geleverd
   als naast-elkaar-collage.

## Wat NIET is gedaan — en waarom

- **Trained-Style is niet door de échte route gedraaid.** Die vereist een prod-asset met een
  verlopen URL; lokaal bestaat dat niet en prod-DB-toegang is er niet. De klasse is in plaats
  daarvan reproduceerbaar gemaakt (zie boven). **Voor Erik**: draai de trained-style-flow op
  prod op een asset van vóór `R2_PUBLIC_URL` en beoordeel of de referentiestijl écht gevolgd is.
- **Geen echte before/after-screenshots** bij Typography — de fix staat al maanden op `main`.
- **D2 niet gedekt** (`effra` vs `effra-fallback`): het smoke-account is `workspaceScoped` en
  komt alleen in *Branddock Demo*, dat geen gevulde `fontFamily` heeft. De workspaces mét echte
  font-stacks (Het Nieuwe Golfen, Zwarthout) vereisen een owner/admin-login. **Voor Erik**: draai
  `SMOKE_WORKSPACE_ID=cmpp4dxgc001w4ums9sttpg62` met je eigen account.
- **De twee aspect-observaties zijn niet gefixt** — modelgedrag/productvraag, buiten deze taak.

## Val waar ik zelf in liep (nu geborgd)

De eerste twee Typography-runs claimden *Zwarthout* en *Het Nieuwe Golfen* maar draaiden
**beide** op *Branddock Demo* — pixel-identieke screenshots verrieden het. Oorzaak is géén bug:
`getExplicitWorkspace` doet een volledige ACL-check en valt bij een niet-toegestane id stil
terug op de eerste toegankelijke workspace (de IDOR-fix van 2026-07-22, die hier dus aantoonbaar
wérkt). De smoke heeft nu een harde workspace-identiteitsassertie die dit luid afbreekt;
mutatietest bevestigd.

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
