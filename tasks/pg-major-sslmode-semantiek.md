---
id: pg-major-sslmode-semantiek
title: pg v9 verandert de betekenis van sslmode=require — nu vastleggen, niet bij de upgrade ontdekken
fase: post-launch
priority: next
effort: 1-2 uur
owner: claude-code
status: open
created: 2026-08-18
completed:
related-adr: -
related-spec: -
worktree: branddock-autonoom-19-08  # afronding 2026-08-19 (sessie 41832dfd is opgeheven)
---

# Probleem

Bij het draaien van de storage-URL-audit tegen Neon-productie (2026-08-18) gaf `pg` deze
waarschuwing:

```
SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as
aliases for 'verify-full'. In the next major version (pg-connection-string v3.0.0 and
pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security
guarantees.
```

Kort: vandaag behandelt `pg` onze `sslmode=require` als **`verify-full`** — certificaat én
hostnaam worden geverifieerd. Na de major wordt dat libpq-semantiek: versleuteld, maar
**zónder certificaat- en hostnaamverificatie**. Dezelfde connection string, zwakkere garantie.

Dat is de vervelende soort wijziging: er breekt niets, er komt geen foutmelding, en de
beveiliging zakt stil. Precies het patroon dat we vaker hebben gezien — de faalmodus is stilte.

Huidige staat: `pg@8.20.0` (gedeclareerd `^8.18.0`), `@prisma/adapter-pg@7.8.0`. De major is nog
niet uit, dus dit is voorbereiding, geen incident. Raakt élke connection string die `pg` gebruikt
— de app-`DATABASE_URL` op Vercel net zo goed als lokale scripts. `.env.example` noemt `sslmode`
op dit moment nergens.

# Voorstel

De semantiek expliciet maken zodat de major-upgrade een no-op is in plaats van een stille
verzwakking. Concreet: overal `sslmode=verify-full` gebruiken in plaats van `require` — dat is
exact het gedrag van vandaag, en het blijft dat gedrag ná de major.

Daarnaast een startup-controle die klaagt als een productie-`DATABASE_URL` een zwakkere
`sslmode` draagt, zodat een toekomstige copy-paste uit een Neon-dashboard (dat `require`
uitdeelt) niet ongemerkt de verificatie uitzet.

# Acceptatiecriteria

- [ ] Prod-`DATABASE_URL` op Vercel gebruikt `sslmode=verify-full` (jij — Neon-dashboard geeft
      standaard `require`)
- [x] `.env.example` documenteert `sslmode=verify-full` mét de reden — ✅ 2026-08-18
- [~] Een startup-check faalt luid bij `NODE_ENV=production` met `sslmode=require|prefer|
      verify-ca` of zonder `sslmode` — ⚠️ **waarschuwt** standaard, faalt hard zodra
      `DATABASE_SSL_STRICT=true`. Bewust zo: Neon deelt `require` uit, dus een throw
      by default zou de eerstvolgende deploy laten omvallen vóórdat iemand de variabele
      kán omzetten. Een beveiligingsnotitie mag geen productie-incident worden. Zet de
      vlag zodra de prod-URL om is; dan kan het niet meer stil terugzakken.

      ✅ **Geverifieerd 2026-08-19 dát de check draait**, niet alleen dát hij bestaat.
      `validateEnv()` wordt op module-niveau aangeroepen in `src/app/layout.tsx:14`, dus
      bij elke cold start van een serverinstantie. Dit is bewust nagemeten: deze repo heeft
      twee keer eerder een vlag gebouwd die niemand ooit las (gotcha 14-08, "leescode is
      geen bescherming"). Een startup-check die nergens wordt aangeroepen is exact dezelfde
      klasse — en dat is hier niet het geval.
- [x] Verbinding met Neon werkt aantoonbaar met `verify-full` — ✅ gemeten 2026-08-18 tegen
      `branddock-prod`: `verify-full` 189ms, `require` 471ms. ⚠️ Bijvangst: `no-verify`
      verbindt óók gewoon. Een werkende verbinding zegt dus niets over de sterkte — precies
      waarom de modus expliciet in de string hoort en niet aangenomen mag worden.
- [x] **De bewaker draait ergens** — ✅ 2026-08-19. Was hij niet: `smoke:db-ssl-mode` stond
      in geen enkele workflow. Geen bewuste keuze, want `scripts/ci/run-db-guards.sh:36`
      verwijst hem expliciet door ("goedkope groep in run-guards.sh, niet hier") naar een
      plek waar hij nooit is aangekomen — de doorverwijzing was geschreven, de landing niet.
      Nu aangehaakt als `smoke:db-ssl-mode:14` in de goedkope PR-poort: puur (geen database,
      geen sleutels, geen netwerk), 15 asserties in 0,27s. Volledige gate ná toevoeging:
      **34 bewakers, 0 gefaald**.
- [x] `npx tsc --noEmit` 0 errors — ✅ 2026-08-19 (incl. `typecheck:scripts`; sinds 19-08 dekt
      `tsc --noEmit` de map `scripts/` niet meer)
- [x] `npm run lint` 0 errors — ✅ 2026-08-19
- [x] Smoke-test uitgevoerd — ✅ `npm run smoke:db-ssl-mode` **14/14**, gedraaid met een dode
      `DATABASE_URL` in plaats van een weggestripte (gotcha 19-08). Mutatietest op de nieuwe
      gate-regel: ondergrens 14 → exit 0, ondergrens 999 → exit 1. Dat de regel meedraait is
      dus gemeten, niet aangenomen.
- [x] Documentatie bijgewerkt indien van toepassing — ✅ dit bestand + de comment in
      `run-guards.sh`

# Bestanden die ik aanraak

- `.env.example` — `sslmode=verify-full` + toelichting
- `src/lib/prisma.ts` — of de bestaande env-validatielaag, voor de startup-check
- `docs/playbooks/` — noot bij de deploy-/DB-documentatie
- `scripts/ci/run-guards.sh` — de bewaker aangehaakt (2026-08-19)

# Smoke test plan

1. `DATABASE_URL` met `sslmode=verify-full` naar Neon → `scripts/dev/storage-url-audit.ts`
   draait door zonder de waarschuwing.
2. `sslmode=require` + `NODE_ENV=production` → de startup-check faalt luid.
3. Lokale Postgres (geen TLS) blijft werken — de check mag alleen in productie bijten.

# Risico's

- **`verify-full` kan bij een andere host wél breken** (self-signed certificaat, of een
  hostnaam die niet matcht). Neon is prima; een toekomstige DB-verhuizing is het moment om dit
  opnieuw te toetsen. Daarom de check prod-gated, niet globaal.
- **De waarschuwing kan misleiden.** Hij zegt dat `pg` vandaag stréngen is dan libpq. Wie hem
  leest als "onze verbinding is zwak" draait de conclusie om. Leg dat vast in de toelichting,
  anders "fixt" iemand het later de verkeerde kant op.

# Out of scope

- De daadwerkelijke upgrade naar `pg` v9 / `@prisma/adapter-pg` met v9-ondersteuning. Deze taak
  maakt die upgrade veilig; hij voert hem niet uit.

# Notes

Gevonden als bijvangst van `deferred-browser-smokes-unblocked` (prod-audit 2026-08-18).

## Open punt gevonden bij het aanhaken (2026-08-19): `no-verify` passeert stil

Gevonden door de bewaker te **lezen** in plaats van alleen zijn exit-code te bekijken —
de regel uit de gotcha van 19-08 ("een slapende bewaker aanzetten is niet neutraal").

`judgeDatabaseSslMode()` geeft voor `sslmode=no-verify` het niveau `ok`. Binnen de lens van
deze taak klopt dat: `no-verify` wordt niet zwakker door de pg-major, want hij is al zwak.
Maar `env-validation.ts` leest `level === 'ok'` als **"geen bezwaar"**, ook met
`DATABASE_SSL_STRICT=true`. Gevolg: een prod-`DATABASE_URL` met `sslmode=no-verify` passeert
stil — in de strengste stand van de vlag die juist tegen stille verzwakking is gebouwd.

**Vandaag geen blootstelling**: de prod-URL draagt `require`. Dit is een gat in de dekking,
geen incident.

**Bewust niet in deze ronde gefixt.** De check zit op het productie-startpad en de hele taak
is er expliciet op ontworpen dat een beveiligingsnotitie geen deploy-incident wordt (zie het
`[~]`-criterium). Een extra niveau toevoegen verandert het gedrag van `validateEnv()` op prod,
en dat hoort een eigen afweging te zijn — niet iets dat meelift met een aanhaak-PR.

De assertie in `scripts/smoke-tests/db-ssl-mode.ts` is ter plekke geannoteerd met wat `ok`
hier wél en niet betekent, plus de waarschuwing om hem niet naar `weakening` om te zetten:
dat zou de functie laten liegen over haar eigen onderwerp. De juiste fix is een apart niveau
(bijvoorbeeld `weak`) dat in productie waarschuwt zonder de verzwakkings-beoordeling te
vertroebelen.

⏭️ **Beslispunt voor Erik**: wil je dat `no-verify` en `disable` in productie luid falen onder
`DATABASE_SSL_STRICT=true`? Zo ja, dan is dat ~1 uur werk plus een gerichte smoke.

## Stand 2026-08-19 — code af, wacht op één handeling van Erik

Alles wat in code kán, is gedaan en bewaakt. Wat rest is **niet-technisch** en staat als
eerste acceptatiecriterium: de prod-`DATABASE_URL` op Vercel omzetten naar
`sslmode=verify-full`, en pas dáárna `DATABASE_SSL_STRICT=true` zetten.

⚠️ **Die volgorde is niet vrijblijvend.** De vlag eerst zetten laat de eerstvolgende deploy
omvallen — precies de reden dat de check by default waarschuwt in plaats van throwt. Dezelfde
twee stappen staan, in dezelfde volgorde, in
[`open-acties-2026-07-23`](open-acties-2026-07-23.md) §E.

Tot die handeling blijft de taak `open`. Niet omdat er werk ligt, maar omdat afvinken vóór de
env-wijziging precies de boekhoudgewoonte is die de done-audit van 16-08 blootlegde: een
`status: done` die niets zegt over de vakjes eronder.
