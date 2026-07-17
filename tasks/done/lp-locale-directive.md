---
id: lp-locale-directive
title: Web-page/LP-generator adopteert de gedeelde locale-directive (taalmenging in output)
fase: launch
priority: now
effort: 4-6 uur
owner: claude-code
status: done
created: 2026-07-16
completed: 2026-07-17
related-adr: -
related-spec: -
worktree: branddock-lp-locale-directive
---

# Probleem

Pilot-tester `sljmn@me.com` meldde op 2026-07-16 (BugReport `cmrnkv...`, severity **high**):
"in de gegenereerde content lopen engels en nederlands door elkaar heen". Bewijs uit de
prod-DB (zijn pillar-page, `structuredVariantOptions`):

> hero: "The WooCommerce Bol.com **koppeling** that gives you your evenings back"
> intro: "A WooCommerce Bol.com **koppeling** is a ready-made connection that syncs..."
> tldr: "A ready-made **koppeling** syncs stock in real time..."

Engelse volzinnen met een Nederlandse term erin. Zijn workspace-contenttaal is `en`
(de `@default("en")`, nooit gevraagd bij onboarding); zijn SEO-zoekterm en markt zijn NL.

**Root cause**: `src/lib/landing-pages/variant-generator.ts` heeft de gedeelde
`buildLocaleInstruction()` (`src/lib/ai/locale-instruction.ts`) **nooit geadopteerd**.
Zijn enige taalregel is één bullet, positie 8 van 11, in een Nederlandstalige regellijst:

```
8. **Locale ${opts.locale}**: alle content in deze taal.
```

Die regel verbiedt code-switching níet en eist níet dat anderstalig bronmateriaal
vertaald wordt. De gedeelde directive doet exact dat — lees zijn eigen docstring:
"Override mixed-language brand-foundation input (translate, don't mirror) · **Block
code-switching mid-output** · Survive AI tendency to default to English on
technical/marketing terms". Het medicijn bestond al; dit pad slikte het niet.

Zelfde familie als de gotchas "twee plekken houden dezelfde waarheid bij, één loopt
achter" (2026-05-08 / 2026-06-24).

Twee bijvangsten in hetzelfde bestand:
- `const locale = params.locale ?? "nl-NL"` (regel ~157) — hardcoded NL-default in een
  product waarvan de workspace-default `en` is.
- Regel ~273 — `opts.locale.toLowerCase().startsWith('en') ? 'en' : 'nl'`: een Duitse
  workspace (`de-DE`) krijgt de **Nederlandse** human-voice-directive. `buildHumanVoiceDirective`
  kent alleen `'nl' | 'en'` en valt terug op Engels voor alles wat niet `'nl'` is — het
  base-subtag doorgeven lost dit op.

# Voorstel

`buildLocaleInstruction(opts.locale)` bedraden in `buildSharedStyleBlocks()` — het
gedeelde blok dat álle vijf system-prompts voedt (LP, FAQ, product, microsite, long-form
GEO). Eén injectiepunt dekt alle types. Het blok komt **bovenaan** de stijl-stack te
staan, zodat "This rule outranks any tone or style guidance below" letterlijk klopt.
De bestaande bullet-8-regels blijven staan als (consistente) herhaling — minimale diff.

# Acceptatiecriteria

- [x] `variant-generator.ts` importeert en gebruikt `buildLocaleInstruction`
- [x] Directive vóór tone/depth/vocab/voice/HVD (smoke §2)
- [x] Alle 5 system-prompts via het gedeelde blok (smoke §3)
- [x] `?? "nl-NL"` → `en-GB` (smoke §4)
- [x] HVD krijgt base-subtag (smoke §5)
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors op gewijzigde files
- [x] **Echte generatie-run reproduceert de bug vóór de fix en is schoon erna** — PRE
      3/3 lek ("WooCommerce Bol.com **Koppeling**: …", + "jouw"/"zonder gedoe" uit de
      CTA); POST 0/3 lek, term vertaald naar "Integration".
- [x] Smoke: **19/19** deterministisch (`node --env-file-if-exists=.env.local
      node_modules/.bin/tsx scripts/dev/lp-locale-mixing-smoke.ts`); met `FULL_RUN=1`
      komen er 7 generatie-checks bij. Elke check discrimineert: terugdraaien van de
      directive laat §1-§4 vallen, terugdraaien van de HVD-fix laat §5 vallen (getest).
- [x] Bestaande `web-page-builder-phase8-variant-generator` smoke groen (40/40) — die
      asserteerde de oude `nl-NL`-default en werd rood van de flip; nu geport.
- [x] GEO-directive spreekt de gedeelde directive niet meer tegen (zie Notes)
- [x] ctaLabel-overflow gemitigeerd + gemeten (3/3 schoon, 0 harde fails) — zie Risico's
- [ ] Golden-sets herijkt (de prompt verandert bewust — zie Risico's)

# Bestanden die ik aanraak

- `src/lib/landing-pages/variant-generator.ts` — locale-directive + 2 bijvangsten
- `src/lib/ai/prompts/geo-directives.ts` — "vertaal niet" → eenduidig (zie Notes)
- `scripts/dev/lp-locale-mixing-smoke.ts` — nieuw: reproductie-smoke (voor/na)
- `scripts/smoke-tests/web-page-builder-phase8-variant-generator.ts` — assertie geport
  naar de nieuwe `en-GB`-default

# Bestanden die ik NIET aanraak

- `src/lib/ai/locale-instruction.ts` — de directive zelf is correct, alleen niet geadopteerd
- `src/lib/ai/brand-context.ts` — de precedentie-keten (regel 1022) klopt al
- `src/lib/auth.ts` / `src/app/api/workspaces/route.ts` — het ontbrekende Brand-anker is
  een **aparte** bug (`content-locale-anchor`), veroorzaakt deze melding NIET
- `src/app/api/campaigns/[id]/canvas/export/route.ts` — melding 1, aparte task

# Smoke test plan

1. Lokale workspace, `contentLanguage='en'`, briefing met een NL-zoekterm
   ("WooCommerce Bol.com koppeling") — sulejman's situatie.
2. Genereer een pillar-page-variant **vóór** de fix → verwacht: hybride output
   (Engelse zinnen, NL-term). Reproductie vastleggen.
3. Zelfde run **ná** de fix → verwacht: consistent Engels, NL-term vertaald.
4. Contra-check: workspace op `nl` → volledig NL (geen regressie de andere kant op).

Bewijs verplicht conform gotcha 2026-07-12: een maxTokens/prompt/budget-wijziging is
pas gefixt na een echte run van de getroffen flow. tsc-groen bewijst hier niets.

# Risico's

- **`finalCta.ctaLabel` overflow — gemitigeerd, klein sample.** Eerste post-fix-meting gaf
  1/3 **harde** generatie-fail op `finalCta.ctaLabel max 48 tekens` (initial én
  recovery-retry), tegen 0/3 pre-fix. Mechanisme: de directive eist "translate the
  meaning" → het model vertaalde de lange NL call-to-action uit de briefing en propte 'm
  in een veld met cap 48. Mitigatie: één regel direct ná het locale-blok die zegt dat
  vertalen de schema-caps nooit overruled (korte velden = beknopt vertalen, geen
  briefing-zin als label). **Na mitigatie: 3/3 runs complete, lek-vrije variant, 0 harde
  fails** (1 run had een initial-hiccup die de retry opving — het vangnet werkt).
  ⚠️ n=3 blijft klein; als dit in de praktijk terugkomt is de volgende stap de
  retry-feedback op validatie-errors verstevigen, niet nóg een promptregel.
- **Golden-sets schuiven.** `variant-generator.ts` staat vol met noten als "prompt blijft
  byte-identiek" en "golden-set safety". De directive erin bedraden verandert de prompt
  *bewust* → de LP-golden-sets moeten herijkt. Dit is de bedoeling, geen bijwerking,
  maar het moet expliciet gebeuren en niet stiekem.
- **Prompt-lengte** groeit met ~6 regels per call. Verwaarloosbaar t.o.v. de context-stack.
- **Default-flip `nl-NL` → `en-GB`** raakt alleen callers die géén locale doorgeven: twee
  smoke-scripts. De route geeft 'm altijd mee, dus prod-gedrag is ongewijzigd.

# Out of scope

- De contenttaal vragen bij onboarding (sulejman kreeg stil `en`) — echte UX-vraag,
  eigen beslissing. Zonder dat blijft een NL-gebruiker consistent Engels krijgen; dat is
  beter dan hybride, maar nog niet goed.
- Het ontbrekende Brand/BrandLocaleProfile-anker → `content-locale-anchor`.
- De variant-confirm/export-bugs → `canvas-variant-confirm-export`.

# Notes

**Uit de code-review (3 echte defecten, allemaal verwerkt):**

1. **De `en-GB`-flip maakte een bestaande smoke rood** —
   `web-page-builder-phase8-variant-generator.ts:160` asserteerde letterlijk
   `default locale = nl-NL` (exit 1 op de branch, 0 op main). Precies de caller-categorie
   die mijn eigen commit-comment noemde ("alleen smoke-scripts raken deze default") maar
   die ik niet nagelopen had. Geport naar `en-GB` + een assertie op de directive
   (intentie i.p.v. implementatiedetail). Nu 40/40.
2. **De GEO-directive sprak de fix letterlijk tegen** — `geo-directives.ts` zei
   "vertaal niet en wissel niet van taal", de gedeelde directive zegt "translate the
   meaning ... do not preserve foreign-language phrases". Beide landden in de
   long-form-GEO-prompt, met de GEO-regel als laatste — op precies de route van de
   melding (pillar-page ∈ LONG_FORM_SEO_TYPES). Latent (de FULL_RUN-evidence laat zien
   dat het model de goede kant kiest), maar een tegenstrijdigheid die bij een taaiere
   briefing of een volgend model terugbijt. **Niet geschrapt maar herformuleerd**:
   `geo-polish.ts` roept `buildGeoDirective` aan zónder de gedeelde directive en zou
   anders zijn enige taalregel verliezen. "vertaal niet" was daar sowieso verkeerd
   advies — bedoeld was "vertaal de pagina niet naar een andere taal", gelezen werd
   "laat vreemde termen staan".
3. **Mijn eigen §5-check was vacuüm** — hij zocht `'Schrijf alsof je'`, een string die
   nergens in de codebase bestaat (enige hit: mijn eigen smoke-regel). De check slaagde
   dus óók als de-DE de volledige Nederlandse HVD kreeg; het acceptatiecriterium
   "HVD krijgt base-subtag" was feitelijk ongetest. Nu op de echte markers
   (`'Echte tekst heeft ritme'` / `'Real writing has rhythm'`) + nl/en-regressiechecks,
   en geverifieerd dat terugdraaien van de fix de smoke wél laat vallen.

Diagnose-pad (voor retro): ik heb de oorzaak twee keer moeten herzien. Eerst leek het
ontbrekende locale-anker de dader; verificatie toonde dat `getBrandContext` (regel 1022,
`profileLocalePrefix ?? voiceguideLocalePrefix ?? workspace?.contentLanguage ?? 'en'`)
voor deze workspace al netjes `'en'` oplevert — het anker had de uitkomst niet veranderd.
Pas het naast elkaar leggen van de sterke gedeelde directive en de zwakke bullet wees de
echte dader aan. Les: bij "AI negeert instructie X" eerst controleren of instructie X het
prompt-pad überhaupt bereikt.
