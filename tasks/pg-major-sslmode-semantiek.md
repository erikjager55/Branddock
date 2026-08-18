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
worktree: -
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
- [ ] `.env.example` documenteert `sslmode=verify-full` mét de reden in één regel
- [ ] Een startup-check faalt luid bij `NODE_ENV=production` met `sslmode=require|prefer|
      verify-ca` of zonder `sslmode`
- [ ] Verbinding met Neon werkt aantoonbaar met `verify-full` (Neon levert een geldig publiek
      certificaat, dus dit hóórt te werken — maar bewijzen, niet aannemen)
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd
- [ ] Documentatie bijgewerkt indien van toepassing

# Bestanden die ik aanraak

- `.env.example` — `sslmode=verify-full` + toelichting
- `src/lib/prisma.ts` — of de bestaande env-validatielaag, voor de startup-check
- `docs/playbooks/` — noot bij de deploy-/DB-documentatie

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
