# Branddock Everywhere — browser-extensie (Chrome/Edge, MV3)

Herschrijf, beantwoord en beoordeel tekst on-brand met je Branddock-workspace, overal in de browser. De extensie kent twee auth-paden:

| Pad | Voor wie | Transport |
|---|---|---|
| **Inloggen met Branddock** (aanbevolen) | Gewone gebruikers — met merk-dropdown | OAuth (PKCE) → MCP-tools op `POST /api/mcp` |
| **API-key** (`bd_live_…`) | Automation / gedeelde machines | REST `POST /api/v1/rewrite` + `/api/v1/score` |

| Actie | OAuth-pad (MCP-tool) | Key-pad (REST) | Kosten |
|---|---|---|---|
| Herschrijf / antwoord | `rewrite_on_brand` | `POST /api/v1/rewrite` | 1 credit |
| Brand-score (F-VAL) | `score_against_brand` | `POST /api/v1/score` | gratis |
| Merken ophalen | `list_brands` | — (keys zijn merk-vergrendeld) | gratis |
| Test verbinding | MCP `initialize` | `GET /api/v1/brand-context` | gratis |

Dit is een volledig standalone package — het maakt géén deel uit van de Next.js-build van de hoofd-app (eigen `package.json`/`tsconfig.json`; de map is ge-exclude in de root-tsconfig).

## Bouwen

```bash
cd integrations/browser-extension
npm install
npm run build     # typecheck + esbuild-bundle naar dist/
npm run verify    # controleert dist/manifest.json + gebouwde bestanden
npm test          # unit-tests (api + oauth + mcp; gemockte fetch, geen netwerk)
```

## Installeren (developer mode)

1. Draai `npm run build` (zie hierboven).
2. Open `chrome://extensions` (of `edge://extensions`).
3. Zet **Developer mode** aan (schakelaar rechtsboven).
4. Klik **Load unpacked** en kies de map `integrations/browser-extension/dist/`.

## Configureren

### Aanbevolen: inloggen met Branddock (OAuth)

1. Open de extensie-opties (rechtsklik op het extensie-icoon → Opties, of via "Instellingen" in de popup).
2. Kies de tab **Inloggen met Branddock** en klik **Inloggen met Branddock**.
3. Er opent een apart browservenster met de beveiligde Branddock-login; na inloggen (en eventueel consent) sluit het venster zichzelf en toont de options-pagina "Ingelogd — toegang tot N merken".
4. Kies daarna in de **popup** je merk in de dropdown (zie hieronder).

Technisch: bij de eerste login registreert de extensie zichzelf eenmalig als public OAuth-client (dynamic client registration, redirect naar `https://<extension-id>.chromiumapp.org/`), daarna authorization-code-flow met PKCE S256 en state-check via `chrome.identity.launchWebAuthFlow`. Access- + refresh-token staan in `chrome.storage.local` (bewust niet `sync` — tokens horen niet mee te reizen naar andere apparaten) en worden stil ververst via het refresh-token (`offline_access`-scope).

### Alternatief: API-key (automation-pad)

1. Maak in Branddock een API-key aan: **Settings → API & Connectors** (formaat `bd_live_…`; de key is alleen bij aanmaak zichtbaar).
2. Kies in de opties de tab **API-key**, plak de key en klik **Opslaan & testen** — de extensie valideert via `GET /api/v1/brand-context` (200 = geldig, 401 = key fout, 404 = URL fout of publieke API uitgeschakeld via `PUBLIC_API_ENABLED`).

API-keys zijn **merk-vergrendeld**: alle acties landen op de workspace van de key. De merk-dropdown is in key-modus daarom verborgen.

Base URL staat standaard op `https://branddock.app`; een eigen domein of `http://localhost:3000` stel je in onder "Geavanceerd" (geldt voor beide auth-paden).

## Merk-dropdown (alleen OAuth-modus)

Bovenin de popup kies je op welk merk rewrite/score landen — de keuze geldt óók voor de context-menu-acties:

- **Volg Branddock (actieve organisatie)** — default: er gaat geen merk-parameter mee; de server gebruikt de actieve organisatie van je Branddock-account (consent-slot > recentste sessie-org > oudste membership).
- **Een specifiek merk** — de gekozen workspace-id gaat als `brand`-parameter mee met elke aanroep. Je ziet alleen merken waar je lid van bent (`list_brands`).

De merkenlijst wordt 10 minuten gecachet in `chrome.storage.local`; opnieuw inloggen ververst hem direct.

## Gebruik

**Context-menu (kern-flow):** selecteer tekst op een willekeurige pagina → rechtsklik →

- **Branddock: herschrijf on-brand** — herschrijft de selectie in de merkstem.
- **Branddock: schrijf on-brand antwoord** — behandelt de selectie als binnenkomend bericht en schrijft een on-brand antwoord.

Het resultaat verschijnt in een klein paneel rechtsonder met **Kopieer** en — alleen wanneer de selectie in een bewerkbaar veld zat (textarea/input/contenteditable) én het een herschrijving is — **Vervang selectie**.

**Popup (vrije tekst):** klik op het extensie-icoon → plak tekst → **Herschrijf on-brand**, **Schrijf antwoord** of **Brand-score**. De popup heeft ook:

- **Merk-dropdown** (OAuth-modus) — zie hierboven.
- **Doelgroep-notitie** — vrije tekst die als `Doelgroep: …`-instructie met élke opdracht meegaat (ook context-menu-acties). Opgeslagen in `chrome.storage.sync`.
- **Extra instructie** — ad-hoc sturing per opdracht ("korter en formeler"); niet gepersisteerd.

## Bewuste keuzes

- **Base URL is leidend, geen OAuth-discovery.** De server canonicaliseert zijn OIDC-issuer naar `BETTER_AUTH_URL` (vandaag `https://branddock.app`); well-known-metadata zou dus endpoints op een ándere origin kunnen teruggeven dan wat de gebruiker instelde. De extensie leidt register/authorize/token-endpoints daarom rechtstreeks af van de Base-URL-setting (`{base}/api/auth/mcp/…`). Consequentie: **wisselt de issuer of de Base URL, dan moet je opnieuw inloggen** (de extensie detecteert de mismatch en vraagt om her-login; tokens en client-registratie zijn aan het oude adres gebonden). OAuth werkt alleen als de Base URL dezelfde origin is als de `BETTER_AUTH_URL` van de server — met de default is dat vanzelf zo.
- **Key-pad blijft op REST.** Het OAuth-token werkt uitsluitend op `/api/mcp`; de REST-v1-routes zijn key-only. De bestaande, geteste REST-wrapper blijft het key-pad bedienen (minste risico); alleen het OAuth-pad loopt via het nieuwe MCP-laagje. Beide Bearer-soorten werken overigens op `/api/mcp` — het endpoint is hetzelfde.
- **Stateless MCP.** De server bouwt per POST een verse MCP-server; `tools/call` werkt dus zonder sessie of voorafgaande `initialize`. De `initialize`-handshake wordt alleen gebruikt als lichte "Test verbinding".
- **Client-registratie blijft staan bij uitloggen** (public client, geen secret); mislukt een login met een bewaarde `client_id`, dan wordt die gedropt zodat de volgende poging vers registreert (dekt server-side verdwenen registraties af).

## Bekende beperkingen

- **Eerste login opent een apart venster** (`chrome.identity.launchWebAuthFlow`) — dat hoort zo; sluit je het venster, dan is inloggen simpelweg geannuleerd.
- **Sessie verlopen.** Wordt de refresh geweigerd of het token ingetrokken, dan wist de extensie de tokens en tonen popup/overlay "log opnieuw in via de instellingen".
- **Token-refresh-race (theoretisch).** Popup en service-worker zijn gescheiden JS-contexten; binnen één context is refresh single-flight, cross-context kan in theorie een dubbele refresh optreden. Onschadelijk zolang de server het vorige refresh-token bij rotatie niet hard intrekt; ga je toch een keer onverwacht "sessie verlopen" zien, dan is opnieuw inloggen genoeg.
- **Doelgroep als vrije tekst i.p.v. persona-select.** De doelgroep-keuze is een vrij invulveld dat in `instruction` wordt meegegeven; een echte `personaIds`-select (via `list_personas`) kan nu op het MCP-pad, maar is bewust nog niet gebouwd.
- **Geen iconen.** MV3 kan zonder `icons`-veld (Chrome toont een letter-placeholder). Voor Web Store-publicatie moeten nog 16/48/128-px PNG's worden toegevoegd aan `static/` + het `icons`-veld in `static/manifest.json`.
- **Web Store-publicatie** vereist een Chrome Web Store developer-account van Erik; tot die tijd alleen "load unpacked". Let op: het extension-id (en dus de redirect-URL) verschilt per install-methode; dynamic client registration vangt dat per install op.
- **Selectie in iframes** (bijv. sommige e-mail-editors) wordt via de context-menu-fallback wel herschreven, maar "Vervang selectie" is dan niet beschikbaar (alleen kopiëren).
- **Popup openhouden tijdens een opdracht.** Sluit je de popup, dan wordt het lopende verzoek afgebroken (de context-menu-flow heeft hier geen last van — die loopt via de service-worker).
- **Beschermde pagina's** (`chrome://…`, Chrome Web Store, PDF-viewer) staan geen injectie toe; daar werkt alleen de popup.
- **Geen analytics/tracking** in de extensie zelf; de enige netwerk-calls gaan naar de geconfigureerde Branddock-Base-URL.

## Structuur

```
integrations/browser-extension/
├── src/
│   ├── api.ts          # REST-wrapper key-pad (chrome-vrij, unit-getest)
│   ├── oauth.ts        # OAuth-core: PKCE, registratie, exchange, refresh (chrome-vrij, unit-getest)
│   ├── mcp.ts          # MCP JSON-RPC-laagje + tool-wrappers (chrome-vrij, unit-getest)
│   ├── auth.ts         # login/logout/ensureAccessToken (chrome.identity + storage.local)
│   ├── brands.ts       # merk-lijst (10-min-cache) + merk-keuze
│   ├── client.ts       # facade: kiest OAuth/MCP- of key/REST-pad
│   ├── settings.ts     # chrome.storage.sync (baseUrl, apiKey, audienceNote)
│   ├── messages.ts     # berichten-types background ↔ content
│   ├── background.ts   # service-worker: context-menu → rewrite → overlay
│   ├── content.ts      # selectie-capture + resultaat-overlay (Shadow DOM)
│   ├── popup.ts        # popup-logica (incl. merk-dropdown)
│   └── options.ts      # options-pagina (auth-tabs, login, key)
├── static/             # manifest.json + html/css (1-op-1 gekopieerd naar dist/)
├── build.mjs           # esbuild-bundle + static-copy + test-artefacten
├── verify.mjs          # dist-verificatie (manifest + bestanden + UI-ankers)
└── test/               # node --test: api / oauth / mcp (gemockte fetch)
```
