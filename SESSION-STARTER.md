# SESSION-STARTER
# Dagelijkse Claude Code sessie-opener — Branddock / Brandclaw
#
# GEBRUIK: Kopieer de prompt hieronder en plak hem aan het begin
# van elke Claude Code sessie. Pas [FASE] en [TAAK] aan per dag.
# ---------------------------------------------------------------

---

## DAGELIJKSE SESSIE-PROMPT (kopieer dit)

```
Start deze sessie door de volgende bestanden volledig te lezen — in deze volgorde:

1. BRANDCLAW-ROADMAP.md        ← strategische roadmap, fasevolgorde, specs per fase
2. CLAUDE.md                   ← codebase patterns, architectuurregels, werkwijze
3. gotchas.md                  ← bekende valkuilen, verplicht voor elke sessie
4. ai-playbook.md              ← AI-workflow regels
5. content-canvas-spec.md      ← spec voor Content Canvas module (indien relevant voor taak)
6. TODO.md                     ← actuele taakenlijst, sprint-staat

Na het lezen: geef een beknopte statuscheck:
- In welke fase zitten we (A t/m I uit BRANDCLAW-ROADMAP.md)?
- Wat is er in de vorige sessie afgerond (haal op uit TODO.md of git log)?
- Zijn er openstaande blokkades of open beslissingen die eerst genomen moeten worden?

Dan de taak voor deze sessie:

[BESCHRIJF HIER WAT JE VANDAAG WIL BOUWEN]

Presenteer daarna een plan:
- Welke bestanden worden aangemaakt of gewijzigd?
- Welke bestaande code is relevant (toon de paden)?
- Welke afhankelijkheden of imports zijn nodig?
- Zijn er risico's of afwijkingen van bestaande patronen?

Wacht op mijn akkoord vóór je begint met implementeren.
Voer na afronding uit: git add -A && git commit && git push origin main
```

---

## FASE-SPECIFIEKE TAAKOMSCHRIJVINGEN

Vul [BESCHRIJF HIER WAT JE VANDAAG WIL BOUWEN] in met de
onderstaande tekst voor de actieve fase.

---

### FASE A — S11: OAuth + E2E Testing

```
We werken aan Fase A: S11.
Taak vandaag: [kies één]
- Google OAuth toevoegen aan Better Auth config + login buttons op AuthPage
- Microsoft OAuth toevoegen aan Better Auth config
- Playwright setup + eerste E2E test (login → dashboard flow)
- E2E test: brand asset detail → AI exploration flow
- Performance benchmarks opzetten
```

---

### FASE B — Content Studio Voltooien

```
We werken aan Fase B: Content Studio voltooien.
Lees extra: src/features/content-studio/ (alle bestanden),
            src/app/api/studio/ (alle route files),
            src/types/campaign.ts,
            content-canvas-spec.md

Inventariseer vóór het plan:
- Welke deliverableTypes bestaan er al in het Prisma schema?
- Welke API routes in /api/studio/ zijn stubs vs. echt geïmplementeerd?
- Welke Content Studio componenten zijn al aanwezig?

Taak vandaag: [kies één]
- B.1: Content type catalog aanmaken (src/lib/content-types/catalog.ts)
        Begin met de 5 tekst-types met hoogste prioriteit:
        linkedin-post, instagram-caption, email-newsletter, seo-page, google-ads-copy
- B.2: AI generatie implementeren voor linkedin-post + instagram-caption
        (echte Claude API-aanroep, streaming via SSE, brand context injectie)
- B.3: Kwaliteitsscoring na generatie (brand voice score, platform compliance check)
- B.4: Content Studio UI herziening — stap 1: Deliverable Type Kiezen grid
- B.4: Content Studio UI herziening — stap 2: Context Configuratie scherm
- B.4: Content Studio UI herziening — stap 3: Editor + varianten weergave
- B.5: TikTok-script + YouTube-script generatie implementeren
- B.6: SEO-pagina generatie (GPT-4o + brand alignment check via Claude)
- B.7: Export flow (klembord, DOCX, PDF) voor alle tekst-types
- B.8: Visual briefs generatie (visual-brief-social, visual-brief-ad)
```

---

### FASE C — S13: Visual Regression Fix

```
We werken aan Fase C: S13 visual regression fix.
Taak vandaag: [beschrijf de specifieke regressie die opgelost moet worden]
```

---

### FASE D — S12 Uitgebreid: Deployment + Agent Fundament

```
We werken aan Fase D: S12 deployment + agent-fundament infrastructuur.
Lees extra: src/lib/ai/rate-limiter.ts,
            src/app/api/organization/invite/route.ts,
            prisma/schema.prisma (volledig)

Taak vandaag: [kies één]
- D.1: Vercel deployment setup + environment variables
- D.2: PostgreSQL migratie naar Neon (productie) + pgvector extensie aanzetten
- D.3: Redis via Upstash — rate limiter migreren van in-memory naar Redis
- D.4: Resend e-mail — transactionele e-mail service + invite emails live maken
- D.5: pgvector — AgentMemory Prisma model + embedding service
        (src/lib/agents/memory.ts: storeMemory, recallRelevant, decayOldMemories)
- D.6: Webhook infrastructuur + BullMQ job queue
        (AgentJob Prisma model + src/lib/agents/workers/)
- D.7: Stripe live billing — checkout flow + webhook handler + plan enforcement
- D.8: PostHog uitbreiding — agent-specifieke events toevoegen
- D.9: CI/CD pipeline (GitHub Actions → Vercel)
- D.10: Sentry integratie + alert rules
```

---

### FASE E — Research & Validation Stubs

```
We werken aan Fase E: Research & Validation stubs vervangen.
Lees extra: src/app/api/research/ (alle route files)

Taak vandaag: [kies één]
- Research Hub stubs vervangen (insights, pending-validation, recommended-actions)
- Validation flow implementeren (validate/[assetId])
- Strategy ↔ Campaign linking (link-campaign, unlink-campaign endpoints)
- Billing usage data live maken
```

---

### FASE F — Brandclaw Agent Core

```
We werken aan Fase F: Brandclaw Agent Core — eerste autonome loop.
Lees extra: src/lib/agents/ (indien al aanwezig),
            prisma/schema.prisma (AgentJob, AgentMemory, AgentApproval modellen)

Controleer vóór het plan:
- Zijn AgentJob, AgentMemory, AgentApproval en WorkspaceIntegration
  aangemaakt in Fase D? Zo niet: stop en doe dat eerst.
- Is BullMQ geconfigureerd en werkend?
- Is pgvector actief op productie-DB?

Taak vandaag: [kies één]
- F.1: LangGraph.js installeren + Marketing Loop state machine opzetten
        (src/lib/agents/marketing-loop/graph.ts + state.ts)
- F.2: Strategy Analyst node implementeren
- F.3: Campaign Builder node implementeren
- F.4: Measurement Agent node (PostHog data ophalen + normaliseren)
- F.5: Evaluation Agent node (resultaten vs. doelen + AgentMemory opslaan)
- F.6: Optimization Agent node (confidence scoring + escalatie-logica)
- F.7: Human-in-the-loop: AgentApproval workflow + e-mail notificatie
- F.8: Agent Activity Dashboard (src/features/agent/AgentDashboard.tsx)
- F.9: Autonomy Dial UI in Settings
- F.10: Wekelijks rapport — generatie + e-mail delivery via Resend
```

---

### FASE G — Channel Activation

```
We werken aan Fase G: Brandclaw Channel Activation.
Lees extra: src/lib/integrations/ (indien al aanwezig)

Controleer vóór het plan:
- Is WorkspaceIntegration Prisma model aanwezig?
- Is Google OAuth scope uitgebreid met Google Ads?

Taak vandaag: [kies één]
- G.1: Google Ads OAuth koppeling + token opslag in WorkspaceIntegration
- G.2: Google Ads performance data ophalen (getCampaignPerformance)
- G.3: CampaignPerformanceSnapshot Prisma model + opslag
- G.4: DataForSEO integratie (zoekvolume + keyword difficulty in Content Studio)
- G.5: Wekelijks rapport uitbreiden met Google Ads data
```

---

### FASE H — Full Platform

```
We werken aan Fase H: Brandclaw Full Platform.
Taak vandaag: [kies één]
- H.1: Meta Ads API OAuth + performance data
- H.2: Ayrshare social publishing integratie
- H.3: HubSpot CRM koppeling (leads uit campagnes)
- H.4: Cross-workspace benchmark data model + aggregatie-job
```

---

### FASE I — Media Assets Layer

```
We werken aan Fase I: Media Assets Layer.
Taak vandaag: [kies één]
- I.1: ElevenLabs brand voices — WorkspaceBrandVoice model + Settings UI
- I.2: ElevenLabs geluidsbibliotheek
- I.3: AI-beeldgeneratie via Imagen 4 + WorkspaceVisualStyle model
- I.4: Cloudflare R2 storage voor gegenereerde beelden
- I.5: Consistente AI-modellen evaluatie (LoRA vs. Astria.ai)
```

---

## SNELLE REFERENTIE — BESTANDSLOCATIES

```
Architectuur & regels:
  BRANDCLAW-ROADMAP.md        ← roadmap + fasespecs (dit project)
  CLAUDE.md                   ← codebase werkwijze
  gotchas.md                  ← bekende valkuilen
  ai-playbook.md              ← AI-workflow regels
  content-canvas-spec.md      ← Content Canvas module spec
  TODO.md                     ← sprint taakenlijst

Kernbestanden codebase:
  prisma/schema.prisma        ← database modellen
  src/App.tsx                 ← hoofdnavigatie (switch op activeSection)
  src/lib/ai/                 ← AI clients (Claude, OpenAI, Gemini)
  src/lib/api/cache.ts        ← server-side cache (invalidateCache na mutaties)
  src/lib/agents/             ← agent-infrastructuur (Fase D+)
  src/lib/integrations/       ← externe API-koppelingen (Fase G+)
  src/lib/content-types/      ← content type catalog (Fase B)
  src/features/               ← feature directories per module
  src/app/api/                ← ~60 route files, 200+ endpoints

Werkdirectory: ~/Projects/branddock-app
Git workflow:  git add -A && git commit && git push origin main
```

---

## AANDACHTSPUNTEN DIE ALTIJD GELDEN

```
1. min-h-0 wordt gepurged — gebruik altijd style={{ minHeight: 0 }}
2. Nooit AI-data direct in Prisma spreaden — altijd sanitizen via whitelist
3. Na schema-wijziging: npx prisma generate + dev server restart
4. Paden met [] in shell: gebruik single quotes, geen backslash-escaping
5. Cache invalideren na elke DB-mutatie: invalidateCache() aanroepen
6. Lock/unlock styling: exact kopiëren van persona-implementatie
7. Prisma in terminal is onbetrouwbaar — gebruik Claude Code voor DB-operaties
8. Verificatie via curl: curl -s http://localhost:3000/api/[route] | python3 -m json.tool
```
