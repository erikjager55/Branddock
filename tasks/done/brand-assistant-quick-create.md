---
id: brand-assistant-quick-create
title: "P3.0b — Brand Assistant quick-create: chat vult velden en triggert generatie"
fase: launch
priority: next
effort: 2-3 dagen
owner: claude-code
status: done
created: 2026-07-17
completed: 2026-07-17
related-adr: -
related-spec: docs/reports/postiz-verbeterplan-2026-07-17.md
worktree: branddock-assistant-quick-create (aan te maken bij start)
---

# Probleem

Content genereren is arbeidsintensief: de volledige wizard vraagt setup + ≥1 knowledge-item + strategie-score ≥80 + concept-keuzes; zelfs het lichtste pad (Quick Content) is 3 velden + 2 schermen + een Generate-klik. De Brand Assistant heeft al een volwaardige write-tool-registry (`create_deliverable`, `update_deliverable_brief`, `update_deliverable_content_inputs`) maar levert een léég item zonder generatie. Dit is bovendien de meest kansrijke onboarding-fix als pilot-venster 1 (peildatum 2026-07-28) oranje/rood kleurt op C1.

# Voorstel

Bouwt op `createAndGenerateDeliverable` uit [P3.0a](headless-content-service.md) — **dependency, eerst afronden**.

1. `create_deliverable`-chat-tool krijgt `generate?: boolean` + `contextSelection?`-params; bij `generate: true` roept de tool de P3.0a-service aan (met confirmation-flow zoals bestaande write-tools)
2. Assistant-prompt aangescherpt: bij een content-verzoek conversationeel de verplichte inputs uitvragen (contentType, campagne of "maak er een", objective/keyMessage) en relevante context voorstellen via de bestaande read-tools (personas/products/competitors/knowledge zoeken → ID's in `contextSelection`)
3. Resultaat in de chat: link/navigatie naar het gegenereerde item in de Canvas

# Acceptatiecriteria

- [x] Quick-create-flow: `create_deliverable` heeft `generate` + `contextSelection` + optionele `campaignId`; execute loopt volledig via de headless service; generate:true-run levert gegenereerd item (smoke: F-VAL 79, 8 componenten)
- [x] Context-selectie: prompt instrueert read_personas/read_products/read_competitors/read_knowledge → `contextSelection`; confirm-card toont de geselecteerde namen (buildProposal-smoke PASS)
- [x] Confirmation-flow intact (`requiresConfirmation: true` geverifieerd in smoke; generatie draait pas ná confirm, in de claw-confirm-route met maxDuration 300)
- [x] Credits via het bestaande metering-pad (generatie loopt door dezelfde orchestrator; geen nieuw pad)
- [~] Browser-smoke chat-flow: vervangen door tool-laag-smoke (buildProposal + execute, 13 checks) — de LLM-conversatie zelf is non-deterministisch; de deterministische keten (tool→service→generatie→confirm-card-data) is volledig gedekt. Handmatige chat-check door Erik aanbevolen na merge.
- [x] `npx tsc --noEmit` 0 errors · eslint 0 errors
- [x] Dubbele-generatie-guard: agents-confirm-route slaat eigen drain over bij `generated:true`; P3.0a-regressiesmoke groen

# Bestanden die ik aanraak

- `src/lib/claw/tools/write-tools.ts` (create_deliverable: generate + contextSelection)
- Brand Assistant systeem-prompt (locatie bij start verifiëren, `src/lib/claw/`)
- `src/app/api/claw/confirm/route.ts` (alleen indien de generieke execute-flow een async-generatie-resultaat moet doorgeven)

# Bestanden die ik NIET aanraak

- `src/lib/content/headless-create.ts` — P3.0a-service is dependency, geen wijziging
- Canvas/wizard-UI — bestaande flows blijven onaangetast

# Smoke test plan

1. Playwright: login → Brand Assistant openen → "schrijf een blogartikel over [product X] voor [persona Y], neem concurrent Z mee"
2. Verwacht: assistant stelt max 2-3 vragen, toont confirm-voorstel, na akkoord verschijnt het gegenereerde item in de content-library
3. Check: contextSelection-ID's zichtbaar in de deliverable-settings; credits afgeschreven; F-VAL-score aanwezig

# Risico's

- Chat-gedreven generatie kost credits — confirmation-gate is verplicht onderdeel, geen optie
- Assistant kan te veel doorvragen (frictie terug via de achterdeur) — prompt op max 2-3 vragen sturen, rest defaulten

# Out of scope

- Publieke API/MCP-ontsluiting (P3.2)
- Meerdere items per chat-opdracht (bulk)
- Voice/andere kanalen

# Notes

- Herkomst: Postiz-verbeterplan P3.0b + Eriks observatie 2026-07-17 ("genereren is arbeidsintensief; chat kan velden snel vullen")
- Dubbelrol: API-voorwerk én pilot-onboarding-fix — bij oranje/rood verdict op 28-07 stijgt de prioriteit naar now
