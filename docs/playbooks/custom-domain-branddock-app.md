# Custom domain koppelen — branddock.app (2026-07-15)

> **Doel**: `branddock.app` (geregistreerd 2026-07-15) koppelen aan de Vercel-deployment,
> met de **app op een subdomein** (`app.branddock.app`) en de **marketing-site op de apex**
> (`branddock.app`). Gepubliceerde landingspagina's blijven op `<workspace>.branddock.app`.
>
> **Let op — dit wijkt af van de bestaande ADR** (`2026-05-22-landing-page-builder-architectuur`
> + `src/lib/landing-pages/host-router.ts`), die de apex als *app-shell* behandelt. Erik koos
> 2026-07-15 bewust voor app-op-subdomein → sectie C beschrijft de benodigde code-aanpassingen.

## Beoogde structuur

| Host | Serveert | Status |
|---|---|---|
| `branddock.app` (apex) + `www.branddock.app` | **Marketing-site** (`/marketing/*`) | ⚠️ vergt code (nu = app-shell) |
| `app.branddock.app` | **De Branddock-applicatie** (dashboard/SPA) | ⚠️ vergt code (nieuw app-host) |
| `<workspace>.branddock.app` | Gepubliceerde landingspagina's | ✅ bestaat al (host-router) |
| custom klantdomeinen | Landingspagina's via `DomainMapping` | v2 (out of scope) |

⚠️ **`app` wordt een gereserveerde subdomein-slug** — een workspace mag nooit de slug `app`
krijgen, anders botst `app.branddock.app` (de applicatie) met een workspace-landingspagina.
Zie code-aanpassing C4.

---

## A. Vercel-domeinen toevoegen (Erik — Vercel-dashboard)

Project **branddock-7y9n** → **Settings → Domains → Add**:

1. `app.branddock.app` — de applicatie. Vercel toont het benodigde DNS-record (CNAME).
2. `branddock.app` — de apex/marketing. Vercel vraagt om een A-record (apex kan geen CNAME).
3. `www.branddock.app` — zet deze op **Redirect → `branddock.app`** (302/308).
4. `*.branddock.app` (wildcard) — voor de workspace-landingspagina's. Vercel geeft hiervoor
   een CNAME; wildcards vereisen mogelijk domein-verificatie via een TXT-record.

Vercel wijst elk domein automatisch aan de **production branch (main)** — geen aparte deploy nodig.

## B. DNS-records (Erik — bij de domein-registrar van branddock.app)

Voeg de records toe die Vercel in stap A per domein toont. Standaard zijn dat:

| Type | Naam / host | Waarde |
|---|---|---|
| `A` | `@` (apex `branddock.app`) | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |
| `CNAME` | `app` | `cname.vercel-dns.com` |
| `CNAME` | `*` (wildcard) | `cname.vercel-dns.com` |
| `TXT` | (indien Vercel om verificatie vraagt) | de door Vercel getoonde waarde |

> **Neem altijd de exacte waarden uit het Vercel-dashboard over** — Vercel kan een afwijkend
> A-record-IP of een `_vercel`-TXT-verificatie tonen. DNS-propagatie duurt minuten tot ~een uur.
> SSL-certificaten worden door Vercel automatisch uitgegeven zodra de records kloppen.

## C. Env-vars + code (deels Erik, deels Claude)

### C1. `BETTER_AUTH_URL` → de app-host (Erik, Vercel-env, production)
```
BETTER_AUTH_URL = https://app.branddock.app
```
Auth-cookies zijn origin-gebonden; de app draait op `app.` dus dáár hoort de auth-origin.
Herdeploy na wijziging. (Preview mag `https://*.vercel.app` blijven — dat regelt
`buildTrustedOrigins()` al.)

### C2. `NEXT_PUBLIC_MARKETING_URL` → de apex (Erik, Vercel-env, production)
```
NEXT_PUBLIC_MARKETING_URL = https://branddock.app
```
Voegt de marketing-origin toe aan de Better-Auth `trustedOrigins` (CSRF), zodat een "Start free
trial"-klik vanaf marketing → app niet op auth strandt. (`src/lib/auth.ts` leest deze al.)

### C3. `NEXT_PUBLIC_APP_URL` → de app-host (Erik, Vercel-env, production) — nieuw
```
NEXT_PUBLIC_APP_URL = https://app.branddock.app
```
De marketing-CTA's (`/?utm_...`) moeten absolute links naar de app worden zodra marketing en
app op verschillende hosts staan. Code-aanpassing C5 leest deze var (fallback: relatief, zodat
`.vercel.app` blijft werken tot het domein live is).

### C4. Meta OAuth redirect-URI (Erik — Meta App Dashboard + Vercel-env)
De ad-account-koppeling gebruikt `BETTER_AUTH_URL` voor de callback. Na C1 wordt dat
`https://app.branddock.app/api/ad-accounts/meta/callback`. **Voeg die URL toe** aan de
Valid OAuth Redirect URIs in de Meta-app (naast de bestaande `.vercel.app`-URL). Anders breekt
het (her)koppelen van Meta-ad-accounts.

### C5. Code-aanpassingen (Claude — op Eriks go, aparte PR)
Deze wijzigen live routing en zijn pas verifieerbaar tegen het echte domein — daarom als één
gecoördineerde taak, gepland ná stap A/B:

- **`src/lib/landing-pages/host-router.ts`**: `app.branddock.app` toevoegen aan de app-hosts
  (naast apex/www) zodat het de app-shell serveert i.p.v. als workspace-slug `app` te parsen;
  apex/www rewrites naar de marketing-homepage (`branddock.app/` → `/marketing`). Pure functie
  + bestaande smoke uitbreiden (`decideHostRoute`-tests).
- **Reserved-slug-guard**: workspace-slug `app` (+ `www`, `api`, `admin`) verbieden bij
  workspace-creatie — voorkomt de botsing uit de ⚠️ hierboven.
- **Marketing-CTA's absoluut maken**: de ~6 `href="/?utm_..."`-links in `src/app/marketing/**`
  worden `${NEXT_PUBLIC_APP_URL ?? ''}/?utm_...` (env-gated → blijft relatief zonder de var).
- **`src/app/robots.txt` / `sitemap.xml` / `llms.txt`**: controleren dat de host-afhankelijke
  SEO-routes de nieuwe apex correct rapporteren.

## D. Verificatie (na propagatie)

1. `https://branddock.app` → marketing-homepage; `https://www.branddock.app` → redirect naar apex.
2. `https://app.branddock.app` → de applicatie (login); inloggen + sessie werkt (cookie op `app.`).
3. "Start free trial" op marketing → landt op `app.branddock.app` zonder auth-fout.
4. "Book a demo" → Morgen-boekingslink (`NEXT_PUBLIC_BOOKING_URL`).
5. Een gepubliceerde landingspagina op `<workspace>.branddock.app/<slug>` rendert.
6. Meta-ad-account (her)koppelen slaagt met de nieuwe callback-URL.
7. SSL groen op alle hosts (Vercel-certificaten uitgegeven).

## E. Ontgrendelt hierna (los te plannen)

- **Apple SSO** (eiste een geverifieerd domein) — nu mogelijk; `AGENTS`/auth-config.
- Nette **e-mail-afzender** op `@branddock.app` (EMAILIT-domeinverificatie).
- Custom **klantdomeinen** voor landingspagina's (`web-page-builder-v2-custom-domains`, DomainMapping).

---
**Samengevat — jouw acties**: A (Vercel-domeinen) → B (DNS) → C1-C4 (env-vars + Meta-redirect).
**Claude's actie op jouw go**: C5 (routing + CTA's + reserved-slug, één PR), daarna samen D verifiëren.
