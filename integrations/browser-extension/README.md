# Branddock Everywhere — browser-extensie (Chrome/Edge, MV3)

Herschrijf, beantwoord en beoordeel tekst on-brand met je Branddock-workspace, overal in de browser. De extensie praat rechtstreeks met de publieke Branddock-API:

| Actie | Endpoint | Kosten |
|---|---|---|
| Herschrijf / antwoord | `POST /api/v1/rewrite` | 1 credit |
| Brand-score (F-VAL) | `POST /api/v1/score` | gratis |
| Test verbinding | `GET /api/v1/brand-context` | gratis |

Dit is een volledig standalone package — het maakt géén deel uit van de Next.js-build van de hoofd-app (eigen `package.json`/`tsconfig.json`; de map is ge-exclude in de root-tsconfig).

## Bouwen

```bash
cd integrations/browser-extension
npm install
npm run build     # typecheck + esbuild-bundle naar dist/
npm run verify    # controleert dist/manifest.json + gebouwde bestanden
npm test          # unit-tests van de API-wrapper (gemockte fetch, geen netwerk)
```

## Installeren (developer mode)

1. Draai `npm run build` (zie hierboven).
2. Open `chrome://extensions` (of `edge://extensions`).
3. Zet **Developer mode** aan (schakelaar rechtsboven).
4. Klik **Load unpacked** en kies de map `integrations/browser-extension/dist/`.

## Configureren

1. Maak in Branddock een API-key aan: **Settings → API & Connectors** (formaat `bd_live_…`; de key is alleen bij aanmaak zichtbaar).
2. Open de extensie-opties (rechtsklik op het extensie-icoon → Opties, of via de link "Instellingen" in de popup).
3. Vul de **Base URL** in (default `https://app.branddock.com`; voor lokaal testen bijv. `http://localhost:3000`) en plak de **API-key**.
4. Klik **Test verbinding** — de extensie valideert de key via `GET /api/v1/brand-context` (200 = geldig, 401 = key fout, 404 = URL fout of publieke API uitgeschakeld via `PUBLIC_API_ENABLED`).

## Gebruik

**Context-menu (kern-flow):** selecteer tekst op een willekeurige pagina → rechtsklik →

- **Branddock: herschrijf on-brand** — herschrijft de selectie in de merkstem.
- **Branddock: schrijf on-brand antwoord** — behandelt de selectie als binnenkomend bericht en schrijft een on-brand antwoord.

Het resultaat verschijnt in een klein paneel rechtsonder met **Kopieer** en — alleen wanneer de selectie in een bewerkbaar veld zat (textarea/input/contenteditable) én het een herschrijving is — **Vervang selectie**.

**Popup (vrije tekst):** klik op het extensie-icoon → plak tekst → **Herschrijf on-brand**, **Schrijf antwoord** of **Brand-score**. De popup heeft ook:

- **Doelgroep-notitie** — vrije tekst die als `Doelgroep: …`-instructie met élke opdracht meegaat (ook context-menu-acties). Opgeslagen in `chrome.storage.sync`.
- **Extra instructie** — ad-hoc sturing per opdracht ("korter en formeler"); niet gepersisteerd.

## Bekende beperkingen (bewuste v1-keuzes)

- **API-key-auth i.p.v. OAuth.** De key staat in `chrome.storage.sync`. OAuth volgt met de connector-fase.
- **Doelgroep als vrije tekst i.p.v. persona-select.** Er is nog geen licht REST-discovery-endpoint voor personas (`/api/mcp` is te zwaar voor de extensie), dus de doelgroep-keuze is een vrij invulveld dat in `instruction` wordt meegegeven. Een echte `personaIds`-select volgt zodra dat endpoint er is.
- **Geen iconen.** MV3 kan zonder `icons`-veld (Chrome toont een letter-placeholder). Voor Web Store-publicatie moeten nog 16/48/128-px PNG's worden toegevoegd aan `static/` + het `icons`-veld in `static/manifest.json`.
- **Web Store-publicatie** vereist een Chrome Web Store developer-account van Erik; tot die tijd alleen "load unpacked".
- **Selectie in iframes** (bijv. sommige e-mail-editors) wordt via de context-menu-fallback wel herschreven, maar "Vervang selectie" is dan niet beschikbaar (alleen kopiëren).
- **Popup openhouden tijdens een opdracht.** Sluit je de popup, dan wordt het lopende verzoek afgebroken (de context-menu-flow heeft hier geen last van — die loopt via de service-worker).
- **Beschermde pagina's** (`chrome://…`, Chrome Web Store, PDF-viewer) staan geen injectie toe; daar werkt alleen de popup.
- **Geen analytics/tracking** in de extensie zelf; de enige netwerk-calls gaan naar de geconfigureerde Branddock-Base-URL.

## Structuur

```
integrations/browser-extension/
├── src/
│   ├── api.ts          # kern-API-wrapper (chrome-vrij, unit-getest)
│   ├── settings.ts     # chrome.storage.sync (baseUrl, apiKey, audienceNote)
│   ├── messages.ts     # berichten-types background ↔ content
│   ├── background.ts   # service-worker: context-menu → rewrite → overlay
│   ├── content.ts      # selectie-capture + resultaat-overlay (Shadow DOM)
│   ├── popup.ts        # popup-logica
│   └── options.ts      # options-pagina-logica
├── static/             # manifest.json + html/css (1-op-1 gekopieerd naar dist/)
├── build.mjs           # esbuild-bundle + static-copy + test-artefact
├── verify.mjs          # dist-verificatie (manifest + bestanden)
└── test/api.test.mjs   # node --test, gemockte fetch
```
