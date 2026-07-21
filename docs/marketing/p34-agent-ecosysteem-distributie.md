# P3.4 — Distributie-pakket agent-ecosystemen

> **Datum**: 2026-07-17 · **Product**: P3.4 uit het Postiz-verbeterplan
> **Status**: pakket klaar voor publicatie — alle publicaties zijn user-held (accounts/review-processen). Gate: P3.2 live op prod (flag aan) + P2.2-pagina staat.

Doel: de MCP-server publiceren wáár agent-gebruikers zoeken — Postiz' 7×-vector. Drie onderdelen: listings, LP-copy, en Eriks publicatie-stappenlijst.

---

## 1. ClawHub-skill-listing (klaar om te plakken)

**Naam**: Branddock — Brand Guardrails & On-Brand Content
**Tagline**: Give your agent your brand's DNA: context, validation and on-brand generation for any workspace.
**Beschrijving**:
> Branddock turns your agent into a brand-aware marketer. Connect your Branddock workspace and your agent gets 14 tools: pull the full brand context (assets, voice, personas, products, competitors), validate any text against the brand with F-VAL fidelity scoring (0-100, with concrete findings), generate on-brand content through Branddock's full pipeline (social, long-form SEO, web pages, video, campaign strategy), and rewrite or reply to anything in the brand voice. Content lands directly in your Branddock library — scored, metered, and ready to publish. Reading and validating are free; you only pay credits for what you create.
**Setup-instructie**: API-key aanmaken in Branddock → Settings → API & Connectors; MCP-endpoint `https://<domein>/api/mcp` met Bearer-auth.
**Categorieën**: marketing, content, brand management

## 2. MCP-directory-listing (generiek, voor 2+ directories)

**Server-naam**: branddock-brand-api
**Één-regel**: The brand layer for AI agents — brand context, F-VAL validation and on-brand generation as MCP tools.
**Tools-samenvatting**: get_brand_context · score_against_brand · generate_on_brand · rewrite_on_brand · generate_long_form_seo (+status) · generate_web_page · generate_video · generate_campaign_strategy (+status) · list_personas/products/competitors · search_knowledge
**Auth**: Bearer API-key (OAuth-connect volgt)
**Transport**: streamable HTTP, stateless

## 3. Per-platform-LP-copy (voor de marketing-site; bouw met de eigen GEO-flow)

### LP A — "Branddock + Claude"
- **H1**: Geef Claude je merk-DNA
- **Kern**: Koppel Branddock als connector en elke Claude-chat kent je merk: schrijven, herschrijven en beoordelen in jouw merkstem, met je echte personas en producten als context. Gegenereerd werk landt gescoord in je Branddock-library.
- **3 bullets**: (1) Connector toevoegen in 30 seconden — URL plakken, key erin, klaar. (2) F-VAL-guardrails: elke output meetbaar on-brand. (3) Je betaalt alleen voor wat je maakt — context en validatie zijn gratis.
- **CTA**: Start je trial → koppel je eigen Claude

### LP B — "Branddock + ChatGPT"
Zelfde opbouw als A; vervang de openingszin door: "ChatGPT kent jouw merk niet — tot je Branddock koppelt." Zelfde bullets/CTA.

### LP C — "Brand guardrails voor AI-agents" (de wig-pagina, = P2.2)
- **H1**: Elke agent kan content maken. Geen enkele weet of het on-brand is.
- **Kern**: Branddock is de merklaag onder je agent-stack: context erin, validatie eroverheen, en een meetbaar F-VAL-cijfer op alles wat eruit komt — welk model of platform je ook gebruikt.
- **Proof-blok**: pilot-benchmark (+7 gem. / +9,5 newsletter vs. vanilla, eerlijk geframed: briefing-gevoelig).
- **CTA**: Bekijk de 14 tools → koppel je agent

## 4. Publicatie-stappenlijst (Erik, na flag-aan)

1. ClawHub-account + skill publiceren (listing §1)
2. 2× MCP-directory-submission (listing §2) — kandidaten op moment van publicatie kiezen (directory-landschap verandert snel)
3. LP A/B/C op de marketing-site (copy §3; C = P2.2)
4. LinkedIn-cadans-post over de connector (format "release-note", zie distributie-cadans.md)
5. Optioneel later: deelbare "Branddock Assistant" Custom GPT (OpenAPI-Actions-fallback)

**Kill-criterium (les 5)**: elke listing/LP krijgt een rij in `docs/marketing/experimenten-log.md` bij publicatie.
