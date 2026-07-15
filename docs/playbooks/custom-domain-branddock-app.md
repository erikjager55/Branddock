# Custom domain koppelen — branddock.app (2026-07-15)

> **Doel**: `branddock.app` (geregistreerd 2026-07-15) koppelen aan de Vercel-deployment,
> met de **app op een subdomein** (`app.branddock.app`) en de **marketing-site op de apex**
> (`branddock.app`). Gepubliceerde landingspagina's blijven op `<workspace>.branddock.app`.
>
> **De code is al voorbereid** (PR #<domain-launch-prep>, 2026-07-15): de host-router routeert
> `app.branddock.app` → app, apex → marketing, `<ws>.` → landingspagina's; `app`/`www`/`api`
> e.d. zijn gereserveerde workspace-slugs; de marketing-CTA's worden absoluut zodra
> `NEXT_PUBLIC_APP_URL` gezet is. Alles is **inert tot de domeinen live zijn** — de huidige
> `branddock-7y9n.vercel.app` verandert niet. Deze runbook = alleen nog jouw infra-stappen.

## Beoogde structuur

| Host | Serveert | Code |
|---|---|---|
| `branddock.app` (apex) + `www.branddock.app` | **Marketing-site** (root → /marketing) | ✅ |
| `app.branddock.app` | **De Branddock-applicatie** (dashboard/SPA) | ✅ |
| `<workspace>.branddock.app` | Gepubliceerde landingspagina's | ✅ (bestond al) |
| custom klantdomeinen | Landingspagina's via `DomainMapping` | v2 (out of scope) |

⚠️ **`app` (+ `www`/`api`/`admin`/`p`/`static`/`assets`) zijn gereserveerde workspace-slugs** —
workspace-create weigert ze (409), zodat een workspace-landingspagina nooit met de app/infra-
hosts botst.

---

## A. Vercel-domeinen toevoegen (Vercel-dashboard → project branddock-7y9n → Settings → Domains → Add)

1. `app.branddock.app` — de applicatie. Vercel toont het benodigde DNS-record (CNAME).
2. `branddock.app` — de apex/marketing. Vercel vraagt om een A-record (apex kan geen CNAME).
3. `www.branddock.app` — zet op **Redirect → `branddock.app`**.
4. `*.branddock.app` (wildcard) — voor de workspace-landingspagina's (CNAME; mogelijk TXT-verificatie).

Alle domeinen wijzen automatisch naar de production branch (main) — geen aparte deploy nodig.

## B. DNS-records (bij de registrar van branddock.app)

Neem de **exacte** waarden over die Vercel per domein toont. Standaard:

| Type | Naam | Waarde |
|---|---|---|
| `A` | `@` (apex) | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |
| `CNAME` | `app` | `cname.vercel-dns.com` |
| `CNAME` | `*` | `cname.vercel-dns.com` |
| `TXT` | (indien gevraagd, bv. `_vercel`) | de door Vercel getoonde waarde |

Propagatie duurt minuten tot ~een uur; Vercel geeft SSL automatisch uit zodra de records kloppen.

## C. Env-vars + Meta-redirect (Vercel-env, production; herdeploy na afloop)

| Var | Waarde | Waarom |
|---|---|---|
| `BETTER_AUTH_URL` | `https://app.branddock.app` | Auth-cookies horen op de app-host |
| `NEXT_PUBLIC_MARKETING_URL` | `https://branddock.app` | Voegt marketing toe aan Better-Auth `trustedOrigins` (CSRF) |
| `NEXT_PUBLIC_APP_URL` | `https://app.branddock.app` | Marketing-CTA's linken absoluut naar de app-host |

**Meta OAuth-redirect** (Meta App Dashboard): voeg
`https://app.branddock.app/api/ad-accounts/meta/callback` toe aan de Valid OAuth Redirect URIs
(naast de bestaande `.vercel.app`-URL) — anders breekt het (her)koppelen van ad-accounts.

## D. Verificatie (na propagatie + redeploy)

1. `https://branddock.app` → marketing-homepage; `www` → redirect naar apex.
2. `https://app.branddock.app` → app (login); inloggen + sessie werkt.
3. "Start free trial" op marketing → landt op `app.branddock.app` zonder auth-fout.
4. "Book a demo" → Morgen-boekingslink (`NEXT_PUBLIC_BOOKING_URL`).
5. Een gepubliceerde landingspagina op `<workspace>.branddock.app/<slug>` rendert.
6. Meta-ad-account (her)koppelen slaagt met de nieuwe callback-URL.
7. SSL groen op alle hosts.

## E. Ontgrendelt hierna (los te plannen)

- **Apple SSO** (eiste een geverifieerd domein) — nu mogelijk.
- Nette **e-mail-afzender** op `@branddock.app` (EMAILIT-domeinverificatie).
- Custom **klantdomeinen** voor landingspagina's (`web-page-builder-v2-custom-domains`, DomainMapping).

---
**Samengevat — jouw acties**: A (Vercel-domeinen) → B (DNS) → C (env-vars + Meta-redirect) → D (verifiëren).
De code staat klaar; er is geen extra Claude-PR meer nodig tenzij de verificatie iets aan het licht brengt.
