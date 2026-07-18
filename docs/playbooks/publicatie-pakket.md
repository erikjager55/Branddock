# Publicatie-pakket — extensie, n8n-node, ClawHub/directories

> **Datum**: 2026-07-18 · Onderdeel van het restlijst-sluitstuk. Alle publicaties zijn user-held (accounts/reviews); dit doc maakt elke stap een invuloefening. Listing-teksten: `docs/marketing/p34-agent-ecosysteem-distributie.md`.

## 1. n8n-community-node publiceren (±15 min + npm-account)

Voorwerk ✅ gedaan: package bouwt schoon (fixes: `@types/node`-devDep + `NodeConnectionTypes`-imports; build-caveat in de README — op Node 24+ `npm install --ignore-scripts` wegens `isolated-vm`).

```bash
cd ~/Projects/branddock-app/integrations/n8n-nodes-branddock
npm install --ignore-scripts && npm run build
npm login            # eenmalig, npm-account vereist
npm publish --access public
```

Daarna vindbaar als community-node `n8n-nodes-branddock`; in n8n: Settings → Community Nodes → installeren. Noteer een rij in `docs/marketing/experimenten-log.md`.

## 2. Chrome Web Store (±30 min + $5-developer-account + dagen review)

Voorwerk ✅: MV3-package compleet mét officiële beeldmerk-iconen (16/48/128).

1. Store-zip maken:
   ```bash
   cd ~/Projects/branddock-app/integrations/browser-extension
   npm install && npm run build
   cd dist && zip -r ../branddock-everywhere-store.zip . && cd ..
   ```
2. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) → eenmalig $5 → "New item" → upload de zip.
3. Listing: naam "Branddock Everywhere", korte omschrijving uit de extensie-manifest, screenshots (maak 2-3: opties-scherm, context-menu, resultaat-overlay — 1280×800), categorie Productivity, taal NL.
4. Privacy: verwijs naar de privacy-pagina op branddock.app (⚠️ vereist dat PR #161 — privacy/voorwaarden — gereviewd en live is; zelfde blocker als de Anthropic-directory).
5. Review duurt dagen; na goedkeuring de "(beta)"-labels op de site bijwerken.

## 3. ClawHub + MCP-directories (±30 min)

Teksten liggen klaar in het P3.4-doc (§1 ClawHub-listing, §2 generieke directory-listing). Endpoint: `https://branddock.app/api/mcp` (OAuth). Volgorde: ClawHub-account → skill publiceren → 2 directory-submissions naar keuze (kies actuele directories op moment van publicatie). Rij in het experimenten-log per listing.

## 4. Anthropic Connectors Directory — GEPARKEERD (post-launch)

Checklist wanneer opgepakt: Claude Team-org (~$25/seat/mnd, min. 2-5 seats) · privacy-policy live (PR #161) · reviewer-testaccount met gevulde workspace + stap-voor-stap-instructies (kan ik prepareren) · submission-portal in claude.ai-admin. Technische eisen zijn al gedekt (OAuth + DCR + HTTPS + tool-annotations).

## 5. Volgorde-advies

n8n (1) en ClawHub (3) kunnen vandaag — geen review-wachttijd, meteen vindbaar. Web Store (2) starten zodra #161 live is. Directory (4) na launch.
