# Branddock — Strategisch Vervolgstappen Document

**Datum**: 2026-05-06
**Doel**: Volledig totaalbeeld van het project + beslissingskader voor wat je het komende kwartaal/halfjaar wel of niet bouwt.
**Gebruik**: leeshulp voor jezelf, niet een vastgesteld plan. Pak per blok wat resoneert.

---

## 1. Wat Branddock vandaag is

### Productpositie
Branddock is een **AI-aangedreven brand-strategy + content-generatie SaaS** voor merken en bureaus. Eén workspace bevat de complete merk-DNA (12 canonical brand assets, brand voice, brandstyle, personas, producten, concurrenten, trends), die via een gelaagde context-stack in **alle** AI-calls wordt geïnjecteerd. Het resultaat: content die meetbaar trouwer aan het merk is dan generieke LLM-output (F-VAL framework: +15-18 punten gap vs vanille GPT-4o).

De **transformatie naar Brandclaw** (autonome agent-loop) is de toekomstige stap maar nog niet gebouwd. Branddock vandaag = krachtige human-in-the-loop tool. Brandclaw morgen = autonome marketing-agent die zelf beslist en uitvoert.

### Tech-stack realiteit
- **Framework**: Next.js 16.1.6 (hybride SPA — server API routes + client-side switch routing in `App.tsx`)
- **DB**: PostgreSQL 17 + Prisma 7.4 + pgvector (76+ modellen, 28+ enums)
- **Auth**: Better Auth (organization plugin, OAuth Google/Microsoft/Apple)
- **State**: Zustand (18 stores) + TanStack Query 5 + 12 React Contexts
- **AI providers in productie**: Anthropic Claude 4.6/4.7, OpenAI GPT-4o + DALL-E, Google Gemini 3.1 Pro/Flash + Imagen, fal.ai (5 image + 5 video modellen), ElevenLabs, Replicate (LoRA training), Exa, Semantic Scholar, Are.na
- **Infrastructuur**: Redis Upstash (rate limiting, sessie cache), Emailit (transactional + audiences), pgvector HNSW index voor agent memory + voiceguide centroids
- **Externe data services**: Pexels (stock), Adobe Fonts detector, R2-style storage (lokaal `/uploads/`)

### Volwassenheid
**Pre-launch.** Volledig functioneel lokaal, alle features in CLAUDE.md (217 numbered features, R0-S12+) zijn geïmplementeerd of in voorbereiding. Geen productie-deployment, geen betalende klanten, geen Stripe billing live.

---

## 2. Modulaire opbouw (24 modules)

### Volledig productie-stabiel
| Module | Wat het doet |
|---|---|
| **Brand Foundation** | 12 canonical brand assets met dedicated framework canvases (Purpose Wheel, Golden Circle, Brand Essence, Brand Promise, Mission, Vision, Brand Archetype, Transformative Goals, Brand Personality, Brand Story, BrandHouse Values, Social Relevancy) |
| **Brand Voice Guide** | Aparte module voor verbale identiteit (writing samples + centroid embedding, NN/g 4-axis tone, vocabulary, channel tones, anti-patterns). Migreerbaar uit BrandPersonality |
| **Brandstyle** | Visual identity analyzer (multi-page crawl, kleur-extractie met Vision-verificatie, Adobe Fonts, Visual System tab met SVG previews) |
| **Personas** | 3-tab create + chat met Claude + AI Persona Analysis (4-dimensie insights) |
| **Products & Services** | URL/PDF analyzer via Gemini, 22 categorieën, ProductImages met 13 categorieën |
| **Competitors** | URL analyzer via Gemini, 5-secties detail, competitive scoring |
| **Trend Radar** | 5-fase research pipeline (Query→Extract→Synthesize→Score→Judge), Claude+Gemini, image scraping |
| **Brand Alignment** | 8-stap AI scan over 6 modules, AI fix-options met DB write-back via $transaction |
| **Business Strategy** | OKR met objectives/key results/milestones, SWOT, AI Strategy Review (Claude), PDF export |
| **Knowledge Library** | 12 resource types, featured/favorites/archive, smart import URL stub |
| **Research & Validation** | Bundles marketplace + Custom Plans builder + studies tracker |
| **Workshops** | Purchase flow + 6-stap session + 5-tab results + AI report |
| **Interviews** | 5-step wizard + question templates |
| **Dashboard** | Readiness % (gewogen 5-module), attention list, recommended action, onboarding wizard |
| **Settings** | Account/Team/Agency/Clients/Billing UI/Notifications/Appearance + Developer-only tabs (AI Models, AI Configuration) |
| **Help & Support** | FAQ, video tutorials, contact, FloatingChatWidget |

### Recente werkstromen (laatste 4 weken)
| Module | Status |
|---|---|
| **Campaigns met CQP pipeline** | ✅ Creative Quality Pipeline: insight mining → concept generation → multi-round critic/defense debate → strategy build. 16 campaign goal types in 4 categorieën. 3 campaign types (brand/content/activation). 5 enrichment-bronnen (Cialdini, IPA Effectiveness, Byron Sharp, Kahneman framing, EAST) + opt-in externe (Are.na, Exa, Semantic Scholar) |
| **Content Library + Wizard** | ✅ 4 view modes (Grid/List/Calendar/Timeline met drag-drop, persona lanes, flow connections), single content mode (4-stap wizard naast 6-stap campaign), 47 deliverable types met type-specifieke quality criteria |
| **Content Canvas** | ✅ 3-panel layout met multi-model orchestration (Claude text + DALL-E/Imagen images), 4-stap accordion (Context → Variants → Medium → Planner), 10 platform-previews (LinkedIn/Instagram/Email/Landing/Video/Podcast etc.), approval flow, platform derivatie, BVD (Brand Voice Directive) injectie, type-specifieke prompts (53 templates) |
| **F-VAL fidelity validation** | ✅ 3-pijler scoring (style 35% / judge 45% / rules 20%), STRICT mode auto-rewrite, vanille comparison endpoint, position-bar UI, end-to-end gevalideerd met +15-18 punten gap vs vanille GPT-4o |
| **Learning Loop foundation** | ✅ 5 nieuwe Prisma modellen (BrandContextSnapshot, AICallSnapshot, AICallTrace, ContentFidelityScore, LearningEvent), ~55 AI call-sites met opt-in tracking, prompt-registry dashboard met cost attribution |
| **Media Library + AI Trainer + AI Studio** | ✅ Pexels stock, AI image generation (5 providers), AI video generation (5 fal.ai providers), Replicate LoRA training (PERSON/PRODUCT/STYLE/ILLUSTRATION/PHOTOGRAPHY/BRAND_STYLE/OBJECT/ANIMATION), brand voice TTS via ElevenLabs |
| **Agent infrastructure** | ✅ Redis Upstash (rate limiting), Emailit (transactional + webhooks), pgvector AgentMemory (HNSW cosine), AgentJob queue + Vercel Cron, PostHog analytics |

### Experimenteel / partial
| Module | Status |
|---|---|
| **Video Generation pipeline** | ⏸️ Fundament gebouwd (per-scene generation + voiceover + compositie), maar UX-polish + ffmpeg integratie pending. ON HOLD tot video-first prioriteit |
| **Brand Assistant** | Werkt op specifieke pagina's via dedicated tools, mist universele `fill_active_field` capability |

---

## 3. De vier strategische routes

Vier fundamenteel verschillende manieren om de komende periode te besteden. Ze sluiten elkaar niet uit, maar concurreren wel om jouw aandacht. Per route: wat het is, waarom je het zou kiezen, en wat het kost.

### Route A — Productie launch readiness
**Wat het is**: Branddock van pre-launch naar live SaaS.

**Items**:
- Stripe billing (Phase 3.2: 2 plannen direct/agency, checkout flow, webhook handler, plan enforcement, subscription management UI)
- Vercel deployment (Neon PostgreSQL met pgvector, env vars, CI/CD via GitHub Actions, custom domain)
- Sentry + PostHog browser-side wiring (server-side PostHog al klaar)
- E2E coverage uitbreiden (huidige Playwright dekt critical-flow + performance, mist nieuwere modules)
- Per-page error boundaries (al beschikbaar, niet overal toegepast)
- OAuth productie-credentials (code klaar, vereist Google Cloud Console + Azure AD setup)

**Effort**: 2-4 weken (Stripe is grootste blok ~1 week, deployment 2-3 dagen, monitoring 1 dag)

**Kritiekheid**: BLOKKEREND voor commerciële validatie. Zonder dit kan niemand betalen.

**Waarom kiezen**: Je hebt een product. Je hebt geen klanten. Pas met productie weet je of de waardepropositie raakt.

**Waarom uitstellen**: Nog geen ICP-validatie. Zonder duidelijke pilot-klanten is "live gaan" een lege vlieger. Vraag jezelf: heb ik 3 mensen die morgen €X/mnd zouden betalen? Zo niet — eerst dáárop focussen.

### Route B — Brandclaw transformatie (autonomous agent loop)
**Wat het is**: De positionering die je expliciet als toekomst hebt geschreven. Branddock = tool, Brandclaw = autonome marketing-agent.

**Items**:
- LangGraph.js Marketing Loop (6 nodes: Strategy Analyst → Campaign Builder → Content Generator → Measurement → Evaluation → Optimization)
- Human-in-the-Loop approval flow (AgentApproval model, autonomy dial per workspace)
- Channel Activation (Google Ads API, DataForSEO, eventueel Meta Ads + Ayrshare social publishing)
- Wekelijks Brandclaw Rapport (Brand Health Score + Campaign Performance + Trend Alerts + Aanbevolen Actie, delivery via Emailit + PDF + dashboard)
- Cross-workspace benchmarks (anonymous performance aggregatie)

**Effort**: 6-12 weken. Echt groot werkstuk. Vereist Phase 6+7+8 uit TODO.md.

**Kritiekheid**: Differentiator. Zonder dit ben je "nog een AI content tool". Mét dit ben je het eerste platform dat de hele marketing-loop sluit.

**Waarom kiezen**: Markt is over-served met content-genererende AI. Onder-served met AI die zelf beslist, uitvoert en leert. Brandclaw is de moat.

**Waarom uitstellen**: Vereist eerst paying customers (anders bouw je voor niemand), vereist Stripe + deployment first (Route A), vereist channel-API toegang die maanden setup kost, vereist productie-data om de feedback-loops te trainen.

### Route C — Diepgang van bestaande features (kwaliteit i.p.v. breedte)
**Wat het is**: De features die er staan beter laten werken voor echte gebruikers.

**Items**:
- **F-VAL iteratie 3**: data-gedreven re-tuning van pillar weights na 3-6 maanden productie-data (vereist ContentVersion creation routes — nu geblokkeerd)
- **BV-WIRE W-1-full centroid switch**: vervang string-match in F-VAL Pillar 1 met cosine-similarity (regression-harness staat klaar, ~4-6u werk)
- **Learning Loop dashboard usage layer**: per `sourceIdentifier` aantal calls / failure rate / latency / token cost / top failing prompts (~halve dag)
- **Content Canvas per-preview inline edit overlays** (item 9.0b): klik op sectie in elke preview → editable. Vervangt centrale ContentSectionsEditor. Schoner mentaal model voor gebruikers
- **Brand Assistant universele field-fill** (item 9.0d): generic context store + `fill_active_field` tool zodat assistent op iedere pagina kan helpen vullen
- **Migratie content-styling velden naar Content Brief** (item 9.0c): tone/hashtag/CTA-style horen in briefing (Stap 1) niet in Stap 3 medium config. Social-post done, nog 8 categorieën
- **Auto-trigger fidelity-scoring** zodra ContentVersion-creation routes terugkomen
- **Iteratie 3 Long-Form/Email differentiatie verfijnen** na productie-data
- **Power User Shortcuts** (IMPLEMENTATIEPLAN-POWER-USER-SHORTCUTS.md bestaat)
- **Studio Overhaul** (IMPLEMENTATIEPLAN-STUDIO-OVERHAUL.md bestaat — Studio is grotendeels verwijderd ten gunste van Canvas, maar item 192 cleanup nog niet)

**Effort**: 4-8 weken voor de hele lijst. Per-item 0.5-2 dagen.

**Kritiekheid**: Niet blokkerend. Wel wat onderscheid maakt tussen "demo werkt" en "klanten gebruiken het dagelijks".

**Waarom kiezen**: Je hebt veel breedte. Je hebt minder diepte. Pilot-klanten zullen dit harder voelen dan jij nu.

**Waarom uitstellen**: Premature optimization. Veel van deze items vereisen productie-feedback om goed te prioriteren — zonder klanten gok je.

### Route D — Externe integraties (Tier 1+2)
**Wat het is**: Branddock connecteren met de tools die agencies en merken al gebruiken.

**Tier 1 (snelle wins)**:
- **Resend / Emailit** (email): SDK al geïnstalleerd, Emailit al gewired voor invites + auth. Mist alleen weekly report wanneer Brandclaw-rapport bestaat
- **Brandfetch** ($99/mnd): logo's + kleuren + fonts voor 60M merken — verrijkt Competitor Analyzer + client onboarding
- **Ayrshare** (vanaf $10/mnd): unified social publishing API (15+ platforms) — kritisch voor Brandclaw channel activation
- **Perplexity Sonar API**: real-time web search met citaten, kan Trend Radar en research verrijken
- **Pexels**: ✅ al geïntegreerd

**Tier 2 (hoge waarde)**:
- **HubSpot CRM** (gratis tier): persona validatie, campaign→deal ROI tracking
- **Google Analytics 4** (gratis): content performance feedback voor F-VAL data
- **DataForSEO**: SEO data voor Content Studio + Trend Radar verrijking
- **Canva Connect API** (gratis): Brandstyle sync naar Canva Brand Kit
- **Slack**: real-time alerts voor Brand Alignment + Trend Radar + Campaign status

**Effort**: per integratie 2-5 dagen, dus Tier 1 = 2-3 weken, Tier 2 = nog eens 3-4 weken.

**Kritiekheid**: Maakt Branddock onderdeel van de bestaande stack i.p.v. een silo.

**Waarom kiezen**: Concrete pijnpunten van early adopters wegnemen. Brandfetch alleen al elimineert ~10 min per nieuwe client onboarding.

**Waarom uitstellen**: Architectuur-aanbeveling uit TODO.md was eerst een **Integration Hub** te bouwen (`IntegrationConfig` Prisma model + generieke OAuth handler + webhook receiver + Settings > Integrations UI) voordat je individuele integraties bouwt. Anders bouw je 10× dezelfde patterns.

---

## 4. Drie kleinere assen die overal doorheen lopen

Naast de vier hoofdroutes zijn er drie thema's die elke route raken:

### As 1 — Tech debt afbouwen
- **Adapter pattern**: tijdelijke mock↔API mappers zijn deels weg (R0.9 Brand Foundation, persona, brand-asset adapters), maar nog 4-5 modules op adapter pattern. Doel: componenten direct DB-model
- **`: any` type annotations**: nog 146 in 68 bestanden (parameters/variabelen). `as any` casts zijn al opgeruimd
- **Dual versioning historie**: BrandAssetVersion model bewust behouden naast ResourceVersion. Tabel kan op termijn gedropt
- **Dead code identificatie**: `coherence-checker.ts` heeft 0 callers, mogelijk meer kandidaten

### As 2 — Pilot validatie & feedback infrastructuur
- 4 pilot workspaces zijn klaar voor F-VAL demo (Better Brands, Linfi, Nobox, WRA Juristen) met BrandPersonality + STRICT mode geconfigureerd
- Geen actieve pilot-loop nu — je hebt de infrastructuur maar geen ritme om feedback te verzamelen
- Learning loop foundation (BrandContextSnapshot, AICallSnapshot, ContentFidelityScore, LearningEvent) is volledig wired maar wacht op productie-data om iets te leren

### As 3 — Documentatie + onboarding
- Geen onboarding-flow voor nieuwe agencies (OnboardingWizard is een 3-step modal voor eerste sessie, geen complete client onboarding)
- Geen klant-onboarding script voor bureaus die hun klanten in Branddock zetten
- CLAUDE.md is nu gigantisch (~217 entries) en lastig nog te navigeren — een nieuwe collaborator (mens of AI) heeft moeite

---

## 5. Strategische beslissingsdimensies

Stel jezelf deze vragen voordat je kiest:

### Vraag 1 — Wat is je waarheid over de markt?
- **Optie A**: "Markt wil meer/betere AI content tools" → Route C (diepgang) + Route D (integraties)
- **Optie B**: "Markt wil autonome marketing, niet meer tools" → Route B (Brandclaw)
- **Optie C**: "Ik weet het niet — moet eerst valideren" → Route A (deploy + 5 pilot-klanten) eerst, dan A/B/C bepalen

### Vraag 2 — Wat is je financiële horizon?
- **Bootstrap (geen runway druk)**: Route C of B. Bouw onbedreigd, lever in 6-12 maanden
- **Korte runway / cashflow nodig**: Route A + Route D Tier 1 zo snel mogelijk. Eerste 5 betalende klanten matter
- **Funding-traject**: Route B is investor-vriendelijk verhaal. Branddock alleen is "yet another AI tool"

### Vraag 3 — Wat is je ICP-zekerheid?
- **Bureaus**: agency model is volledig gebouwd. Multi-tenant, OrganizationMember, white-label-ready (al bouwt nog niemand het). Brandfetch + Canva + HubSpot integraties extra waardevol
- **Direct merken**: simpeler proposition, maar competitief met ChatGPT + Jasper + Copy.ai. F-VAL gap (+15-18 punten) is je verhaal
- **Beide**: pricing-keuze (per seat / per workspace / flat tiers) heb je nog open. Beslissen voor je live gaat

### Vraag 4 — Heb je een team of doe je alles alleen?
- **Solo**: kies één route per kwartaal. Alles parallel = niets klaar
- **Team van 2-3**: Route A + Route C parallel kan, Route B + Route D parallel kan
- **Geen team maar wel pilot-klanten met budget**: contract-werk uitbesteden (Brandclaw LangGraph implementatie is duidelijk afbakenbaar voor freelancer)

---

## 6. Drie scenario's voor het komende kwartaal

Hieronder drie geloofwaardige paden — elk met zijn eigen logica. Niet bedoeld als keuze-A-B-C maar als denkframe.

### Scenario 1 — "Ship it" (8 weken)
**Premisse**: De applicatie is af genoeg. Klanten zullen problemen blootleggen die ik nu nog niet zie.

- Week 1-2: Stripe billing + 2 plannen + checkout
- Week 3-4: Vercel deployment + Neon DB + monitoring
- Week 5-6: 3-5 pilot-klanten onboarden (Better Brands, Linfi, Nobox, WRA + 1 nieuw bureau)
- Week 7-8: feedback verzamelen, kritische bugs fixen, eerste iteratie

**Resultaat**: live SaaS met 5 betalende klanten. Roadmap voor Q3 wordt door klantfeedback bepaald, niet door gokken.

**Risico**: pilot-klanten ontdekken iets fundamenteels broken (UX, performance, missende feature) → Q3 wordt damage control.

### Scenario 2 — "Brandclaw moonshot" (12 weken)
**Premisse**: Branddock is het fundament. Brandclaw is de 10× differentiator. Tijd om die te bouwen voor de concurrentie het doet.

- Week 1-3: LangGraph.js Marketing Loop (6 nodes) + AgentApproval model + Autonomy Dial
- Week 4-6: Wekelijks Brandclaw Rapport (Brand Health + Performance + Trend Alerts + Aanbevolen Actie)
- Week 7-9: Channel Activation MVP (Google Ads API + Meta Ads OAuth + Ayrshare social publishing)
- Week 10-12: HubSpot CRM loop + Cross-workspace benchmarks + agent monitoring dashboard

**Resultaat**: Brandclaw v1 — autonome agent die wekelijks rapporteert en (met approval) zelf aanpassingen doet aan campagnes. Investor-klaar.

**Risico**: 12 weken bouwen zonder klanten = je raadt wat ze willen. Brandclaw zonder paying users is een tech-demo, geen business.

### Scenario 3 — "Diepgang + integraties" (10 weken)
**Premisse**: Wat er staat moet eerst onmiskenbaar goed werken voordat ik er meer aan plak. En het moet in de gebruikersflow passen.

- Week 1-2: Stripe + Vercel (minimaal product-launch — niet perfect, wel live)
- Week 3-4: Brandfetch + HubSpot CRM + Slack integraties (Tier 1)
- Week 5-6: F-VAL iteratie 3 (data-gedreven weights) + Content Canvas per-preview inline edit + Brand Assistant universele field-fill
- Week 7-8: Learning Loop dashboard usage layer + auto-trigger fidelity-scoring + BV-WIRE W-1 full
- Week 9-10: 3-5 pilot-klanten onboarden, eerste iteratie op basis van feedback

**Resultaat**: een vol-volwassen tool die minder breed is dan wat je nu in CLAUDE.md hebt staan, maar diep waar het telt. Klanten gebruiken hem dagelijks.

**Risico**: trager naar markt dan Scenario 1, minder differentierend dan Scenario 2. Het "veilige midden".

---

## 7. Open beslissingen die je sowieso moet nemen

Deze staan al deels in CLAUDE.md ❓ sectie maar zijn strategisch zwaarwegend:

1. **Pricing model**: per seat / per workspace / flat tiers. Bepaalt of agencies vs direct merken het primaire kanaal worden
2. **Gratis tier limieten**: nu zijn er 3 AI tiers (FREE 20/min, PRO 60/min, AGENCY 120/min) maar geen koppeling aan Stripe plannen
3. **Workspace isolatie**: soft (filter op orgId zoals nu) vs hard (Postgres row-level security). Hard is duurder maar enterprise-vereiste
4. **Agency white-label**: alleen Branddock branding of eigen logo+domein per bureau? Code is voorbereid maar UI niet gebouwd
5. **AI provider lock-in**: 3 providers actief (Anthropic + OpenAI + Google). Per-feature switchbaar via Settings > AI Models. Houden of consolideren? Multi-provider geeft resilience maar kostenoverzicht is complex
6. **Deployment**: Vercel (gemak, serverless) vs Railway (controle) vs self-hosted (privacy/DPA). DPA-compliance is `separate werkstroom` per memory
7. **Privacy/DPA hooks**: workspace-isolation enforcement, opt-in voor cross-klant aggregaten. Geblokkeerd op zowel ICP-clarity als deployment-keuze

---

## 8. Risico's & onbekenden

- **CLAUDE.md is 200K+ tokens**: nieuwe sessies (mens of AI) hebben significante context-overhead. Op termijn opsplitsen in `docs/` modules
- **Geen productie-feedback**: alle prioritering is op gevoel, geen data
- **Multi-tenant agency model nooit getest**: code staat, maar geen agency met meerdere klant-workspaces in productie gebruik
- **F-VAL claim (+15-18 punten gap)** is empirisch op één case study (Better Brands blog-post). Vereist meerdere case studies met diverse content types om als marketing-claim te dragen
- **Twee parallelle Claude Code sessies** kunnen race conditions geven (zie commit `5064015` precedent). Werk-discipline: één agent per repo, of expliciete file-set coördinatie
- **Brandclaw vs concurrenten**: Adobe + Salesforce + HubSpot bouwen alle drie autonome marketing-AI. Window om te leiden is klein
- **Video Generation pipeline ON HOLD**: fundament gebouwd maar niet af. Latere reactivering vereist refactor
- **Studio cleanup item 192**: Content Studio is grotendeels vervangen door Content Canvas, maar `quality-scorer.ts`, `improve-suggester.ts`, `ai-router.ts` zijn dead code in `src/lib/studio/` die nog opgeruimd moet

---

## 9. Wat ik zou doen (meningsweergave, geen advies)

Als de keuze van mij was, met de informatie die ik nu heb:

**Onmiddellijk** (week 1):
- Stripe + Vercel basis-deployment (Route A minimum). Niet om te lanceren — om de live-omgeving te hebben staan voor pilot-klanten zonder local dev setup
- Eén pilot-klant identificeren (van de 4 voorbereide workspaces) en concreet werken aan hun use case

**Kort termijn** (week 2-6):
- Route C selecties: Content Canvas inline edit + Brand Assistant field-fill + Learning Loop dashboard. Dit zijn de items die pilot-klanten direct zullen waarderen
- Brandfetch integratie (Tier 1, ~3 dagen) — onboarding van nieuwe workspaces wordt 10× sneller
- F-VAL iteratie 3 voorbereiden zodra eerste productie-data binnen is

**Middellange termijn** (week 7-12):
- Op basis van pilot-feedback óf Route B (Brandclaw — als bevestigd dat autonomie het verhaal is) óf Route D verbreden (integraties — als bevestigd dat tool-fit het probleem is)

De Brandclaw-route blijft de grote "north star" maar is moeilijk te bouwen zonder klantvalidatie van de huidige features. Eerst het schip te water, dan de motoren bouwen.

---

## 10. Hoe dit document te gebruiken

- **Lees voor je een nieuwe sessie start**: een paar minuten in dit document scant geeft je een totaalbeeld waardoor je beter kunt sturen
- **Update bij grote keuzes**: als je voor Scenario 2 gaat, schrijf dat hier op zodat je het over 2 maanden nog weet
- **Niet als plan**: dit is een denkkader, geen TODO-lijst. De echte items staan in `TODO.md` en de `IMPLEMENTATIEPLAN-*.md` bestanden
- **Vragen die hier niet beantwoord zijn**: ICP-clarity, financial runway, team-grootte. Die bepalen de keuze meer dan alle technische items hierboven

---

**Volgende edit van dit document**: wanneer je een richting hebt gekozen, of wanneer een belangrijke aanname wijzigt (eerste betalende klant, funding, team uitbreiding, concurrent-launch).
