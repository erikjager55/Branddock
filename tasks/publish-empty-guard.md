---
id: publish-empty-guard
title: Kanaal-publicatie stuurt een lege post naar LinkedIn/WordPress/e-mail
fase: launch
priority: now
effort: 2 uur
owner: claude-code
status: in-progress
created: 2026-07-17
completed:
related-adr: -
related-spec: -
worktree: branddock-publish-empty-guard
---

# Probleem

Gevonden tijdens de structurele analyse van de twee content-ketens (n.a.v. de
bugmeldingen van 2026-07-16). **Niet gemeld door een gebruiker — nog niet.**

`POST /api/studio/[deliverableId]/publish-to-channel` distribueert **extern**: LinkedIn,
e-mail (Resend), WordPress. Hij bouwt zijn payload uitsluitend uit
`deliverable.components` — de component-keten:

```ts
const bodyText = contentByGroup.body ?? contentByGroup.caption ?? … ?? '';
const fullText = [bodyText, hashtags].filter(Boolean).join('\n\n');
…
text: fullText                                  // → LinkedIn
html: contentToEmailHtml(title, bodyText, …)    // → e-mail
wpContent = contentToWordPressHtml(bodyText)    // → WordPress-artikel
```

Voor de structured/PUCK-types (landing-page/faq-page/product-page/microsite + de 7
long-form GEO-types) is die keten **structureel leeg** — niet "soms": `orchestrate/route.ts:91`
gate't ze weg vóór de enige plek die tekst-componenten aanmaakt, en
`generate-structured-variant` bevat **nul** `deliverableComponent.create`. Hun copy zit in
`settings.structuredVariant`. Dus: `bodyText === ''` → **een leeg artikel op de WordPress
van de klant, een lege LinkedIn-post**. Naar het publiek van de klant, onomkeerbaar.

**Waarom de bestaande QA-gate dit niet vangt** (en niet kán vangen):
`getContentReadiness` oordeelt op een **F-VAL-score**, die via het LP-pad van keten **B**
komt — terwijl de payload uit keten **A** komt. Een groene gate is dus juist bewijs dát er
goede content is, waarna we niets versturen. Bovendien is 'ie expliciet failsafe-open:
`no-version` → `canPublish: true`, met in de eigen types de comment *"no ContentVersion
exists yet — never generated"*. De gate laat content door die nooit gegenereerd is.

Bereikbaar, niet latent: `Step4Timeline` rendert de kanaal-publish-knop **zonder**
`isPuckType`-gate — terwijl datzelfde bestand 40 regels hoger wél `puckSignals` inpatcht
voor de checklist. (Vereist een gekoppeld kanaal.)

# Voorstel

Een leeg-guard op de **payload zelf**, niet op een proxy ervoor. Payload-extractie naar een
pure functie (`src/lib/studio/channel-payload.ts`) zodat de guard testbaar is zonder de
halve stack — en zodat er precies één chokepoint is waar de latere content-accessor inplugt.

Vangnet, geen fix: de structurele oplossing is dat deze route beide ketens leest. Het
vangnet blijft daarna staan — het valideert wat er verstuurd wordt en overleeft dus elke
toekomstige keten.

# Acceptatiecriteria

- [x] Geen enkele provider kan een lege payload versturen (LinkedIn/Resend/WordPress)
- [x] Guard staat vóór `publishLog.create` én vóór elke externe call
- [x] Payload-extractie logica-identiek aan het origineel (geen regressie)
- [x] Provider-mapping spiegelt de route-switch (`linkedin-direct`, niet `linkedin`)
- [x] Whitespace-only telt als leeg
- [x] `npx tsc --noEmit` 0 errors · `lint` 0 errors
- [x] Smoke 23/23

# Bestanden die ik aanraak

- `src/lib/studio/channel-payload.ts` — nieuw: pure payload-extractie + `isPublishable`
- `src/app/api/studio/[deliverableId]/publish-to-channel/route.ts` — leunt op de helper + guard
- `scripts/dev/publish-empty-guard-smoke.ts` — nieuw

# Bestanden die ik NIET aanraak

- `src/lib/learning-loop/content-readiness.ts` — de failsafe-open is een bewuste keuze voor
  infrastructuur-uitval en blijft. Het punt is dat 'ie de verkeerde vraag beantwoordt, niet
  dat 'ie stuk is.
- `Step4Timeline` publish-sectie — de ontbrekende `isPuckType`-gate lost zichzelf op zodra
  de route beide ketens leest; een UI-gate zou het symptoom verbergen.

# Smoke test plan

`node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/dev/publish-empty-guard-smoke.ts`
→ **23/23**. Dekt: de exacte prod-vorm van een pillar-page (één image-component zonder
inhoud) tegen alle 3 providers, de bewuste afwezigheid van een beeld-uitzondering, de
regressie-check op een echte social-post, de provider-mapping, whitespace, en de
alternatieve variant-group-fallbacks (`caption`/`body-sections`/`introduction`).

# Risico's

- **Bewust géén beeld-uitzondering.** Een long-form-deliverable *heeft* een hero-image, dus
  "leeg mag als er een beeld is" zou de guard uitschakelen voor precies het geval dat 'm
  motiveert. Beeld-only publiceren is hier geen ondersteunde flow; wordt dat ooit een
  feature, dan is dat een expliciete keuze met een eigen pad. Zou er vandaag een gebruiker
  beeld-only publiceren, dan krijgt die nu een 422 in plaats van een post zonder tekst — dat
  is de betere fout.
- De 422 is Engels, conform de rest van deze route.

# Out of scope

De 20 andere kruisingen tussen de ketens (Content Library toont "No content generated" op
een volle pagina, Brand Assistant zegt "geen content", ZIP-export leeg, versie-historie
zonder diffs, hero-beelden gescoord zonder copy-context, …). Die vragen de gedeelde
accessor, niet 20 losse guards — zie de content-accessor-task.

# Notes

Fout in mijn eigen eerste versie: ik checkte `provider === 'linkedin'` terwijl de
route-switch op `'linkedin-direct'` matcht (`'linkedin'` bestaat elders als OAuth-id).
Effect: LinkedIn zou op `bodyText` gevalideerd zijn en een hashtags-only post onterecht
geblokkeerd. Nu prefix-match + een smoke-case die het vastlegt.

De diepere les voor de gate-discussie: `getContentReadiness` is niet stuk — hij beantwoordt
de verkeerde vraag. "Is deze content goed genoeg?" is iets anders dan "hebben we iets te
versturen?". Een score is een proxy; de payload is het feit. Valideer het feit.
