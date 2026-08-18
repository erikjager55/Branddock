---
id: lp-turnstile-form-endpoint
title: Turnstile op het publieke form-endpoint — de volgende trede bóven honeypot en rate-limits
fase: post-launch
priority: later
effort: 3-5 uur
owner: unassigned
status: blocked
created: 2026-08-18
completed: -
related-adr: -
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md (§Deploy-notities)
worktree: -
---

# Probleem

`/api/f/[formId]` is het enige publieke, ongeauthenticeerde schrijfpad van de app:
iedereen op internet kan er een lead-formulier mee indienen. Er staat al een
gelaagde verdediging omheen — rate-limit per IP+formId (sliding window, Redis op
prod), honeypot-veld `_hp`, submit-timing `_ts` < 2s, en een dagplafond van 500 om
notify-/webhookkosten te begrenzen bij gedistribueerde spam.

Die ladder houdt losse bots tegen. Wat hij **niet** tegenhoudt is een botnet: per-IP
limieten helpen daar per definitie niet, en honeypot + timing zijn triviaal te
omzeilen zodra iemand het formulier één keer bekijkt. Turnstile staat sinds de spec
genoteerd als de volgende trede.

# Waarom dit BLOCKED staat en geen `open`

**Er is geen waargenomen spam-druk.** Dit bouwen zonder signaal voegt een
CAPTCHA-hindernis toe aan het conversiepad van een lead-funnel die op dit moment
nauwelijks verkeer heeft — de brand.md-funnel leverde in vier dagen 4 page-events
en 0 leads op. De kosten (conversieverlies, een extern script in de CSP, een
Cloudflare-afhankelijkheid) zijn dan zeker en de baten hypothetisch.

De uitstel-reden is dus expliciet, en dit blok bestaat om te voorkomen dat "later"
stilzwijgend "nooit" wordt.

## Trigger — bouw dit zodra één van deze waar is

- [ ] Meer dan ~20 submissions per dag die als spam worden herkend (honeypot- of
      timing-hits), gemeten over een week
- [ ] Eén enkele `FormSubmission`-piek die het dagplafond van 500 raakt
- [ ] Een klant meldt spam in zijn leads-dashboard
- [ ] Een lead-formulier gaat live op een pagina met serieus verkeer (>1.000
      bezoekers/maand)

**Meet vóór je bouwt.** De retentie-indexen van 18-08 zijn het waarschuwende
voorbeeld: die werden als urgent opgevoerd op grond van "onbegrensde groei" en
beschermden bij meting vier rijen. Query voor de eerste twee triggers:

```sql
SELECT date_trunc('day', "createdAt") AS dag, count(*)
FROM "FormSubmission"
GROUP BY 1 ORDER BY 1 DESC LIMIT 30;
```

# Voorstel

Cloudflare Turnstile als vijfde trede, in de **invisible/managed** modus zodat een
gewone bezoeker niets ziet en alleen verdachte sessies een uitdaging krijgen.
Server-side verificatie via `/siteverify` vóór de honeypot-check, en fail-**open**
bij een onbereikbare Cloudflare: een kapotte externe dienst mag geen leads
weggooien.

# Acceptatiecriteria

- [ ] Een submission zonder geldig token wordt geweigerd, met dezelfde stille
      "succes"-respons als de honeypot (geen informatie voor de aanvaller)
- [ ] Een gewone bezoeker ziet géén uitdaging in de managed modus
- [ ] Cloudflare onbereikbaar of traag (>3s) → submission gaat gewoon door en er
      komt een logregel; leads gaan nooit verloren door een externe storing
- [ ] `challenges.cloudflare.com` staat in de CSP (`script-src` + `frame-src`) —
      de CSP staat sinds #294 op enforce, dus zonder dit werkt het script niet
- [ ] De sleutels zijn env-gated: zonder `TURNSTILE_SECRET_KEY` is de hele trede
      uit en gedraagt het endpoint zich exact als nu
- [ ] Smoke bewijst mét mutatietest dat de verificatie discrimineert — een
      ongeldig token móet leiden tot niet-opslaan; blijft de rij staan, dan meet
      de smoke niets
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors

# Bestanden die ik aanraak

- `src/app/api/f/[formId]/route.ts` — verificatie-trede vóór de honeypot-check
- `src/lib/security/turnstile.ts` — nieuw: `verifyTurnstileToken()`, fail-open
- de publieke formulier-renderer — token-veld + script-tag
- `next.config.ts` of de CSP-middleware — `challenges.cloudflare.com`
- `scripts/smoke-tests/` — nieuwe smoke incl. mutatietest

# Bestanden die ik NIET aanraak

- De bestaande vier treden — die blijven staan; Turnstile is een aanvulling, geen
  vervanging. Vooral het dagplafond blijft nodig, want dat begrenst kosten en niet
  bots.

# Smoke test plan

1. Zonder `TURNSTILE_SECRET_KEY`: submission slaagt zoals nu (trede uit)
2. Met sleutel + geldig testtoken (Cloudflare levert altijd-slagende testsleutels):
   submission slaagt en de rij staat in `FormSubmission`
3. Met sleutel + ongeldig token: stille "succes"-respons, géén rij
4. Mutatietest: verificatie-tak uitzetten → stap 3 móet een rij opleveren
5. `/siteverify` naar een dood adres wijzen: submission slaagt alsnog (fail-open)

# Risico's

- **Conversieverlies** — de reden dat dit gegate is. Managed modus + fail-open
  beperken het, maar nul is het niet. Meet de conversie vóór en ná.
- **CSP** — staat sinds #294 op enforce. Een vergeten `frame-src` betekent dat de
  widget stil niet laadt; de bug van 18-08 met de i18n-namespaces laat zien hoe
  lang zoiets onzichtbaar kan blijven.
- **Fail-open is een bewuste zwakte**: tijdens een Cloudflare-storing is de trede
  weg. Dat is de goede afweging voor een leadformulier, maar schrijf het op zodat
  niemand het later per ongeluk "repareert" naar fail-closed.

# Out of scope

- De andere publieke endpoints (Brand-API) — die hebben hun eigen rate-limiting-
  traject, zie [`open-acties-2026-07-23`](open-acties-2026-07-23.md)
- Spamfiltering op de inhoud van een submission (tekstclassificatie)

# Herkomst

Afgesplitst op 2026-08-18 uit [`lp-review-followups`](done/lp-review-followups.md),
waar dit het laatste openstaande item was. Die taak is afgerond; dit stond er
alleen nog als bewust gegate toekomstwerk. Bron van het oorspronkelijke item:
spec §Deploy-notities + [`lp-forms-leads`](done/lp-forms-leads.md).
