---
id: 2026-07-16-content-locale-source-of-truth
title: Content-locale source of truth — het isDefault-BrandLocaleProfile wint, contentLanguage is een afgeleide spiegel
status: accepted
date: 2026-07-16
supersedes: -
superseded-by: -
---

# Context

Drie velden beweren allemaal iets over "in welke taal genereren we content voor dit merk?",
en ze spreken elkaar op productie aantoonbaar tegen:

| Bron | Vorm | Wie schrijft | Wie leest |
|---|---|---|---|
| `Workspace.contentLanguage` | ISO-639-1, `@default("en")` | `PATCH /api/workspaces` (settings-UI) | `getBrandContext`-fallback; de settings-selector |
| `BrandVoiceguide.contentLocale` | BCP-47, auto-detect (`franc-min`) + handmatige override in de Voice DNA-tab | brand-language-autodetect; de picker | `getBrandContext`-fallback; `backfill-brand-locale-profiles` |
| `BrandLocaleProfile.locale` (`isDefault`) | BCP-47 | `workspaces`-route (POST/PATCH), `syncDefaultLocaleProfile`, de backfill | `resolveTargetProfile` (generatie); `getBrandContext` (eerste in de keten) |

De precedentie is **niet consistent** tussen de schrijvers:

- `getBrandContext` (`brand-context.ts:1022`) leest `profileLocalePrefix ?? voiceguideLocalePrefix ?? workspace.contentLanguage ?? 'en'` — **profiel wint**.
- `backfill-brand-locale-profiles.ts` leidt het profiel af als `voiceguideLocale ?? DEFAULT_LOCALE_BY_LANG[contentLanguage] ?? 'en-GB'` — **voiceguide wint**.
- `PATCH /api/workspaces` schrijft `contentLanguage` en synct dáárna het profiel via
  `syncDefaultLocaleProfile(localeForLanguage(contentLanguage))` — **contentLanguage wint en overschrijft het profiel**.

Meetbaar gevolg op prod (2026-07-16, 4 workspaces):

- **De pilotklant-workspace** (Better Brands) heeft `contentLanguage='en'` maar profiel + voiceguide op `nl-NL`. De generatie draait dus Nederlands (profiel wint in `getBrandContext`), terwijl de **settings-UI "English" toont** (die leest `contentLanguage`). De UI liegt over wat het product doet — een gebruiker die daarop afgaat trekt de verkeerde conclusie over zijn eigen merk.

  *Preciezer dan de eerste versie van deze ADR beweerde*: er is géén één-klik-flip. `WorkspacesTab.tsx:125` guardt met `if (contentLanguage === ws.contentLanguage) return`, dus opslaan zonder de dropdown te wijzigen stuurt geen PATCH. Een flip vereist een expliciete andere taalkeuze — en dán is 'ie bedoeld. Het defect is dus de **leugen in de UI**, niet een latent ongeluk. Dat maakt het minder urgent maar niet minder fout: zolang twee bronnen uiteenlopen, is elke lezer een gok.
- **3 van de 4 workspaces hebben helemaal geen `Brand`-rij** en dus geen profiel. Oorzaak: `provisionNewUser` (het sign-up-pad, `auth.ts:55`) maakt Organization → Workspace → 11 BrandAssets, maar géén Brand + default-profiel; de `workspaces`-route (POST) doet dat wél. Alleen de workspace die via `migrate-brand-dna` gevuld is heeft een anker. Zelfde klasse als het `MediumEnrichment`-incident (#168): defaults die alleen de seed zet, en de seed draait nooit op prod.

Zonder anker geeft `resolveTargetProfile` `null` terug en is generatie niet locale-adresseerbaar; de Fase-2-target-picker en alle multi-markt-plannen (ADR `2026-06-28`) hangen aan het bestaan van dat profiel.

# Decision

1. **`BrandLocaleProfile.isDefault.locale` is de enige bron van waarheid voor de content-locale.**
   Dit bevestigt wat ADR `2026-06-28` al stelde ("het isDefault-profiel is de forward-compatible
   drager van de content-locale") en wat `getBrandContext` al doet — de andere schrijvers volgen nu.

2. **`Workspace.contentLanguage` is een afgeleide spiegel, geen invoer.** Het blijft bestaan
   (legacy-lezers + de settings-selector + `localeForLanguage`), maar wordt voortaan **samen met**
   het profiel geschreven en mag er nooit van divergeren. Bewust niet verwijderd: de kolom heeft een
   brede lees-surface en een drop is een aparte migratie.

3. **`BrandVoiceguide.contentLocale` is een auto-detect-*suggestie*, geen bron.** Het voedt de
   locale bij **aanmaak** en blijft de handmatige override in de Voice DNA-tab (die schrijft dan het
   profiel mee), maar wordt nooit als autoriteit gelezen tijdens generatie.

4. **Precedentie, uitsluitend bij aanmaak/reparatie** (bestaande profielen worden nooit stil
   overschreven): `voiceguide.contentLocale` → `localeForLanguage(workspace.contentLanguage)` →
   `en-GB`. Gelijk aan wat `backfill-brand-locale-profiles` al deed, zodat de backfill en de
   provisioning niet uiteenlopen — inclusief **validatie tegen `SUPPORTED_LOCALES`**, níet tegen
   de values van `LANG_TO_LOCALE`. Die twee sets verschillen: `SUPPORTED_LOCALES` bevat `nl-BE`
   (een echte picker-optie) en `LANG_TO_LOCALE` niet. Op de verkeerde set valideren gooit `nl-BE`
   weg en geeft een Vlaams merk een `en-GB`-anker — precies de stille taalflip die deze ADR
   opheft. Dezelfde eis geldt omgekeerd: locale → `contentLanguage` via het **base-subtag**
   (`nl-BE` → `nl`), niet via een omgekeerde map die alles buiten de 7 canonieke waarden
   stil overslaat.

5. **Eén gedeelde, transactie-bewuste helper borgt het anker** —
   `ensureBrandWithDefaultProfile(tx, workspaceId, locale)`, idempotent en **niet-clobberend**
   (bestaat er al een default-profiel, dan blijft dat staan). Élk pad dat een workspace aanmaakt
   roept 'm aan: `provisionNewUser` én de `workspaces`-route. Niet de aanroep dupliceren maar de
   helper delen — anders divergeren de paden over een half jaar opnieuw, precies zoals nu gebeurd is.

6. **De settings-PATCH blijft ongewijzigd** — en dat is correct, geen omissie. Een expliciete
   taalkeuze schrijft `contentLanguage` én synct het profiel; dat ís de gewenste symmetrie en
   het gebeurt al. De UI-guard (`WorkspacesTab.tsx:125`) zorgt dat er zonder echte wijziging
   geen PATCH vuurt, dus er is geen stil pad naar het profiel. Geen code-wijziging nodig.

7. **Reconciliatie van bestaande rijen via `POST /api/admin/repair-defaults`** — het endpoint dat
   voor exact deze klasse (seed-defaults-drift op prod) gebouwd is. Idempotent: ontbrekende
   Brand+profielen aanmaken, en waar profiel en `contentLanguage` divergeren wint het **profiel**
   (BB: `contentLanguage` `en` → `nl`), zodat de UI voortaan toont wat de generatie doet.

# Y-statement

In de context van **drie velden die alledrie de content-taal claimen, met schrijvers die
tegengestelde precedentie hanteren en een sign-up-pad dat het anker helemaal niet aanmaakt**,
facing **3 van 4 prod-workspaces zonder locale-anker, en een settings-UI die "English" toont
terwijl de pilotklant aantoonbaar Nederlands genereert**, I decided **het isDefault-profiel tot
enige bron van waarheid te maken, `contentLanguage` tot afgeleide spiegel en de voiceguide-locale
tot aanmaak-suggestie, geborgd door één gedeelde niet-clobberende helper op álle creatiepaden plus
een reconciliërende repair-backfill**, to achieve **een deterministische content-taal per workspace
die niet afhangt van welk codepad de workspace toevallig aanmaakte, en een settings-UI die toont
wat de generatie werkelijk doet**, accepting tradeoff **dat `contentLanguage` als redundante kolom
blijft bestaan (met de bijbehorende sync-plicht bij elke schrijver) in plaats van 'm nu te droppen —
de lees-surface is te breed voor deze taak, en een dubbele-bron-met-vaste-richting is beheersbaar
waar drie-bronnen-zonder-richting dat niet was**.

# Consequences

**Positief**
- Elke nieuwe workspace is locale-adresseerbaar vanaf rij 1 — de Fase-2-target-picker en het
  multi-markt-epic (ADR `2026-06-28`) krijgen de garantie die ze aannamen.
- Geen enkel pad overschrijft nog stil een bestaand profiel; de repair kan een merk niet naar
  de verkeerde taal duwen (nl-BE-regressie afgedekt met een discriminerende smoke).
- De settings-UI en de generatie lezen na reconciliatie dezelfde waarheid.

**Negatief / op te letten**
- `contentLanguage` blijft dubbel. Elke nieuwe schrijver van de content-taal **moet** het profiel
  meenemen; dat is een conventie, geen compiler-garantie. Kandidaat voor een latere drop-migratie.
- De repair-backfill wijzigt `contentLanguage` van bestaande workspaces (BB: `en` → `nl`). Zichtbaar
  in de settings-UI; dat is het doel (hij loog eerst), maar het is wél een user-visible verandering.
- `getBrandContext`'s fallback-keten blijft de voiceguide lezen. Dat is bewust: legacy-rijen zonder
  profiel mogen niet stil naar Engels vallen vóór de backfill overal gedraaid is. Opruimen zodra
  het anker gegarandeerd overal staat.

# Alternatieven overwogen

- **`contentLanguage` als bron, profiel afgeleid.** Simpeler mentaal model, maar botst frontaal met
  ADR `2026-06-28`: het profiel is de multi-markt-drager en kan straks per markt afwijken — een
  ISO-639-1-kolom op de workspace kan dat per definitie niet dragen. Bovendien zou BB's `nl-NL`
  (de feitelijke productie-waarheid) dan weggegooid worden ten gunste van een default die niemand
  ooit gekozen heeft.
- **`contentLanguage` nu droppen.** Architectonisch het schoonst, maar de lees-surface is breed
  (o.a. `getBrandContext`, `localeForLanguage`, brand-kit-export, de settings-UI) en het raakt
  `prisma/seed.ts` + de backfill-scripts. Te grote blast-radius voor een bugfix op een productie-
  melding; apart plannen.
- **Alleen `provisionNewUser` repareren.** Dicht het gat voor nieuwe gebruikers maar laat de
  tegenstrijdige precedentie én de pilotklant-flip staan — dat is de helft van de bug.
