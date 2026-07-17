---
id: content-locale-anchor
title: Content-locale-anker ontbreekt op sign-up-workspaces + drie bronnen met tegenstrijdige precedentie
fase: launch
priority: now
effort: 4-6 uur
owner: claude-code
status: done
created: 2026-07-16
completed: 2026-07-17
related-adr: docs/adr/2026-07-16-content-locale-source-of-truth.md
related-spec: -
worktree: branddock-content-locale-anchor
---

# Probleem

Gevonden tijdens de diagnose van BugReport 2026-07-16 (taalmenging). **Veroorzaakt die
melding NIET** — dat was `lp-locale-directive` — maar het is een echte, aparte bug die
tijdens hetzelfde onderzoek bovenkwam.

1. **`provisionNewUser` (sign-up-pad, `auth.ts:55`) legde geen content-locale-anker.**
   Het maakte Organization → Workspace → 11 BrandAssets, maar géén `Brand` +
   `BrandLocaleProfile`. `POST /api/workspaces` deed dat wél. Twee creatiepaden, dezelfde
   plicht, één die 'm niet kende. Meting op prod: **3 van de 4 workspaces zonder anker**
   — alleen de workspace die via `migrate-brand-dna` gevuld is had er één. Zonder anker
   geeft `resolveTargetProfile` `null` en is generatie niet locale-adresseerbaar; de
   Fase-2-target-picker en het multi-markt-epic (ADR 2026-06-28) nemen aan dat 'ie er is.
   Zelfde klasse als het `MediumEnrichment`-incident (#168): defaults die alleen de seed
   zet, en de seed draait nooit op prod.

2. **Drie bronnen claimen de content-taal, met tegenstrijdige precedentie.**
   `getBrandContext` zegt profiel > voiceguide > contentLanguage; de backfill zegt
   voiceguide > contentLanguage; `PATCH /api/workspaces` laat contentLanguage het profiel
   overschrijven. Gevolg op prod: de **pilotklant-workspace** heeft `contentLanguage='en'`
   maar profiel + voiceguide `nl-NL`. De generatie draait Nederlands, de **settings-UI
   toont "English"** — de UI liegt over wat het product doet. (Géén één-klik-flip: de
   UI-guard voorkomt een PATCH zonder echte dropdown-wijziging; zie Notes.)

# Voorstel

Zie ADR [`2026-07-16-content-locale-source-of-truth`](../docs/adr/2026-07-16-content-locale-source-of-truth.md).
Kort: het isDefault-profiel is de enige bron van waarheid; `contentLanguage` is een
afgeleide spiegel; de voiceguide-locale is een aanmaak-suggestie. Eén gedeelde,
niet-clobberende helper op álle creatiepaden + een reconciliërende repair-backfill.

# Acceptatiecriteria

- [x] ADR geschreven en geaccepteerd
- [x] `ensureBrandWithDefaultProfile(tx, workspaceId, locale)` — gedeeld, idempotent,
      niet-clobberend
- [x] `provisionNewUser` roept 'm aan binnen dezelfde transactie
- [x] `POST /api/workspaces` gebruikt dezelfde helper (was inline)
- [x] `resolveInitialLocale` centraliseert de aanmaak-precedentie (gelijk aan de backfill)
- [x] `repair-defaults` maakt ontbrekende ankers + trekt divergerende `contentLanguage` bij
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors op gewijzigde files
- [x] **Echte sign-up bewijst het anker** — zie Smoke
- [ ] Repair gedraaid op prod (user-actie: `POST /api/admin/repair-defaults` als developer)

# Bestanden die ik aanraak

- `docs/adr/2026-07-16-content-locale-source-of-truth.md` — nieuw
- `src/lib/content-locale/default-profile.ts` — `ensureBrandWithDefaultProfile` + `resolveInitialLocale`
- `src/lib/content-locale/repair-anchors.ts` — nieuw: diagnose + repair
- `src/lib/auth.ts` — `provisionNewUser` legt het anker
- `src/app/api/workspaces/route.ts` — gebruikt de helper i.p.v. inline
- `src/app/api/admin/repair-defaults/route.ts` — anker-repair erbij
- `scripts/dev/content-locale-anchor-smoke.ts` — nieuw

# Bestanden die ik NIET aanraak

- `src/lib/ai/brand-context.ts` — de precedentie-keten (regel 1022) klopt al en is de
  referentie waar de rest naartoe beweegt. Zijn voiceguide-fallback blijft bewust staan
  tot het anker overal gegarandeerd is (zie ADR-consequences).
- `prisma/scripts/backfill-brand-locale-profiles.ts` — het bestaande script blijft; de
  repair-route is de prod-weg (geen shell-toegang tot Neon nodig).
- `Workspace.contentLanguage` droppen — te brede lees-surface, aparte migratie (ADR-alternatieven).

# Smoke test plan

`node --env-file-if-exists=.env.local node_modules/.bin/tsx scripts/dev/content-locale-anchor-smoke.ts`
→ **14/14** read-only; met `REPAIR=1` → **17/17** (lokale DB had zelf 4 ankerloze workspaces;
repair maakte ze, 2e run doet niets).

**Echte sign-up via het Better-Auth-pad** (dev-server, `POST /api/auth/sign-up/email`):
```
Anchor Smoke's Workspace | Brand=JA ✓ | profiel=en-GB | contentLanguage=en
```
Vóór de fix: `Brand=NEE | profiel=GEEN` — exact de staat van de pilot-tester. Testgebruiker
+ org na afloop opgeruimd.

# Risico's

- De repair wijzigt `contentLanguage` van bestaande workspaces (pilotklant: `en` → `nl`).
  User-visible in de settings-UI — dat is het doel (hij loog eerst), maar het is wél een
  zichtbare verandering. Draaien op een moment dat je het kunt uitleggen.
- `contentLanguage` blijft dubbel. Elke nieuwe schrijver van de content-taal moet het
  profiel meenemen; conventie, geen compiler-garantie. Zie ADR-consequences.

# Out of scope

- De contenttaal vragen bij onboarding. Het anker maakt de taal nu **deterministisch**
  (`en-GB`), niet **juist**: een Nederlandse gebruiker krijgt nog steeds consistent Engels
  tenzij hij 'm zelf omzet. Dat is beter dan hybride, maar de echte vraag — "vraag het
  gewoon" — is een productbeslissing.
- `Workspace.contentLanguage` droppen.

# Notes

**Uit de code-review (1 MAJOR + 2 MINOR, verwerkt):**

1. **MAJOR — mijn repair kon zelf een merk naar Engels flippen.** `resolveInitialLocale`
   valideerde de voiceguide-locale tegen `Object.values(LANG_TO_LOCALE)`
   (`en-GB/nl-NL/de-DE/fr-FR/es-ES/pt-PT/it-IT`), maar de set die
   `BrandVoiceguide.contentLocale` mág bevatten is `SUPPORTED_LOCALES`
   (`nl-NL/nl-BE/en-GB/de-DE`). **`nl-BE` zit alleen in de tweede** — en het is een gewone
   picker-optie ("Nederlands (België)"). Een Vlaams merk met voiceguide `nl-BE` +
   `contentLanguage='en'` (de `@default`) genereert vandaag Nederlands via de
   voiceguide-fallback; mijn repair had daar een `en-GB`-anker gemaakt → generatie flipt
   naar Engels. **De repair zou exact de bug veroorzaken die deze ADR opheft.** Mijn
   JSDoc claimde bovendien pariteit met de backfill; die accepteert `nl-BE` wél. Gefixt +
   een smoke die aantoonbaar faalt op de oude code. Mijn oorspronkelijke smoke testte
   alleen ONZIN-invoer (`zz-ZZ`) — daar wérkte de whitelist juist, dus hij zag niets.
2. **MINOR — `LOCALE_TO_LANG` had dezelfde blinde vlek.** De omgekeerde map gaf `nl-BE` →
   `undefined` → reconcile stil overgeslagen én `diagnoseAnchors` rapporteerde
   "niet-divergent" terwijl de UI bleef liegen. Nu `languageForLocale()` via het
   base-subtag.
3. **MINOR — geen cache-invalidatie.** De repair schrijft precies de velden die
   `getBrandContext` 5 min cachet; zonder invalidatie serveert generatie na de repair nog
   minuten de oude taal (CLAUDE.md-regel #10). Nu `invalidateBrandContext` per geraakte
   workspace.

**Ook gecorrigeerd: mijn ADR-premisse was scherper dan de code rechtvaardigt.** Ik schreef
dat "één keer opslaan" de pilotklant stil naar Engels flipt. `WorkspacesTab.tsx:125`
guardt met `if (contentLanguage === ws.contentLanguage) return`, dus zonder échte
dropdown-wijziging vuurt er geen PATCH. Het defect is de **leugen in de UI** (toont
`en`, genereert `nl`), niet een latent ongeluk. ADR-beslissing 6 is daarop bijgesteld:
de PATCH blijft ongewijzigd en dát is correct, geen omissie.

**Bewust niet meegenomen:** TOCTOU op `findFirst` + `create` in de helper — twee
concurrent calls met verschillende locales kunnen twee `isDefault`-rijen maken
(`@@unique([workspaceId, locale])` vangt alleen dezelfde locale). Pre-existing:
`syncDefaultLocaleProfile` en `resolveTargetProfile` hebben dezelfde race; de helper erft
'm, introduceert 'm niet. Structurele fix = partial unique index op
`(workspaceId) WHERE isDefault`. Idem de N+1 in `repairAnchors` (prima bij 4 workspaces,
loopt bij groei tegen de functietimeout).

Diagnose-eerlijkheid: ik dacht aanvankelijk dat dit ontbrekende anker de taalmenging
veroorzaakte. Verificatie weerlegde dat — `getBrandContext` valt netjes terug op
`contentLanguage` ('en'), dus het anker had de uitkomst van de melding niet veranderd. De
bug is echt, maar het is een andere bug. Zie `lp-locale-directive` voor de dader.
