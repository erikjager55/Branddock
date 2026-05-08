---
id: content-review-multi-surface
title: Δ-1 Content Review — Brand Alignment tab + Brand Assistant tool + PublishGate (3 surfaces, 1 engine)
fase: pre-launch
priority: now
effort: 8-10 dagen (parallel-track met Δ-2/Δ-3)
owner: claude-code
status: in-progress
sub-cluster-done: A foundation — Prisma schema + migration. A engine — runFidelityForExternalContent helper (src/lib/brand-fidelity/external-content-runner.ts) + RuleViolation→BrandReviewFinding mapping (severity + category-inference uit synthetic ruleId) + ContentReviewLog persistence in transaction
sub-cluster-todo: B — backend route POST /api/alignment/review-external + ingest helpers (paste/url/.docx/.pdf); C — Surface 1 Brand Alignment Tab 3 UI; D — Surface 2 Brand Assistant chat-tool (review_content read-tool); E — Surface 3 PublishGate uitbreiding (bevindingen-tabel render)
created: 2026-05-08
completed: -
related-adr: 2026-05-08-fval-output-schema-bevindingen, 2026-05-08-locale-routing-brand-voice
related-spec: tasks/_drafts/idea-brand-control-program.md
worktree: branddock-program-p2
---

# Probleem

Branddock kan vandaag uitsluitend **proactief** on-brand content produceren maar niet **reactief** bestaande tekst beoordelen. F-VAL draait alleen tijdens generatie; externe content (eigen homepage, e-mails, archief, paste-in van klant) heeft geen review-pad. Dat blokkeert drie use-cases die de pre-launch positionering dragen: pre-launch QC, audit, onboarding-feedback voor externe content-makers.

Bestaande infrastructuur is al rijker dan eerder gedacht (Phase 0 discovery): ClawPageContext + activeEntity + inspect_current_entity al gebouwd; F-VAL composition-engine accepteert content-string + workspaceId; BrandReviewFinding output-schema staat (ADR-1); locale-routing per BrandVoiceguide.contentLocale staat (ADR-3). Wat ontbreekt is de ingest-flow voor externe tekst en de three-surface UI/API-laag.

# Voorstel

F-VAL-engine omvormen tot generieke content-review-engine die werkt op **elke tekstbron** (gegenereerd OF extern). Drie ingest-surfaces voor dezelfde engine:

1. **Brand Alignment Tab 3 "Content Review"** — formele review-sessie met paste-in / URL / .docx / .pdf upload. Backend `POST /api/alignment/review-external` orchestreert ingest (`pandoc` / `unpdf` / `WebFetch`) → roept F-VAL pipeline aan met externe tekst → retourneert bevindingen-tabel + voor/na suggesties.
2. **Brand Assistant chat-tool `review_content`** — read-tool (geen MutationConfirmCard) met `{ source: 'paste'|'url'|'file', content?, url?, fileId?, language?, focus? }` argumenten. Roept dezelfde backend-route aan; rendert `BrandReviewResultCard` chat-card met bevindingen-tabel inline.
3. **PublishGate uitbreiding** (al gewired) — bestaande F-VAL composite-score-gate krijgt bevindingen-tabel in dezelfde shape uit ADR-1 `BrandReviewFinding`. Gen-flow consumeert hetzelfde output-schema.

Persistence van review-historie via nieuw `ContentReviewLog` Prisma-model. Retention default 90 dagen (per beslispunt 4 idea-doc), workspace-toggle pas in `privacy-dpa-hooks` LATER-task. Plan-gate per beslispunt 1: paste-in onder DIRECT-plan, bulk-audit + URL-scanning onder AGENCY-plan.

# Acceptatiecriteria

## F-VAL engine extension
- [ ] `src/lib/brand-fidelity/fidelity-runner.ts` accepteert content zonder `contentMetadata` (nullable brief-to-content lineage); existing generation-callers passen contentMetadata door, review-callers laten weg
- [ ] Unit-test verifieert F-VAL run op externe content zonder crash op missing `contentMetadata`
- [ ] BrandReviewFinding[] persistentie via 1-N relation naar ContentFidelityScore (per ADR-1) — werkt voor zowel gegenereerde als externe content

## ContentReviewLog persistence
- [ ] Prisma-model `ContentReviewLog { id, workspaceId, userId, sourceType ('paste'|'url'|'file'), sourceContent (encrypted of hashed bij PII-risk), sourceUrl, language, fidelityScoreId, findingsJson, durationMs, retainUntil, createdAt }`
- [ ] Indexed op `(workspaceId, createdAt)` voor Strategy Analyst trend-queries
- [ ] `retainUntil` default `createdAt + 90 days`
- [ ] Cron-job ruimt rijen >`retainUntil` op (nightly cleanup)

## Surface 1: Brand Alignment Tab 3
- [ ] `src/features/brand-alignment/components/ContentReviewTab.tsx` (nieuw) — paste-in textarea + URL-input + file-upload (.docx/.pdf)
- [ ] BrandAlignmentPage routing: nieuwe Tab 3 "Content Review" tussen Tab 2 "Brand Audit" en Tab 4 "Insights"
- [ ] Bevindingen-tabel render: severity-icon + locatie + suggestie per finding; voor/na expand voor top-3 high-severity
- [ ] "Klaar voor klant"-knop logt PostHog event `content_review_marked_ready`
- [ ] Loading state tijdens review (~10-30s), error state op F-VAL of ingest fail

## Surface 2: Brand Assistant chat-tool
- [ ] `src/lib/claw/tools/read-tools.ts` — nieuwe `review_content` read-tool
- [ ] Input: `{ source: 'paste'|'url'|'file', content?: string, url?: string, fileId?: string, language?: string, focus?: 'voice'|'terminology'|'claims'|'style'|'all' }`
- [ ] Tool delegeert naar dezelfde `/api/alignment/review-external` endpoint (single source of truth)
- [ ] `BrandReviewResultCard` chat-card component — rendert N findings inline met severity + voor/na
- [ ] Action-button per finding "Apply suggestion" — op Canvas-page roept `fill_form_fields` (Phase 0.2.A); elders genereert revised paragraph

## Surface 3: PublishGate (uitbreiding)
- [ ] PublishGate UI toont bevindingen-tabel naast composite-score (al consumeert F-VAL output via ContentFidelityScore + BrandReviewFinding 1-N relation)
- [ ] `findingsCount` aggregatie-veld (per ADR-1) toont count-badge per severity
- [ ] "Override" pad logt audit-trail wanneer user publisht ondanks gate-failure

## Backend ingest
- [ ] `POST /api/alignment/review-external` route met Zod schema `{ source, content?, url?, fileId?, language?, focus?, contentLocale? }`
- [ ] Pandoc voor .docx → plain text; unpdf voor .pdf → plain text; WebFetch voor URL (bestaande tool); paste-in is direct content-string
- [ ] Workspace-isolatie via `resolveWorkspaceId()` + `where: { workspaceId }` op alle Prisma calls
- [ ] PostHog events: `brand_review_started`, `brand_review_completed`, `brand_review_marked_ready`

## Plan-gate (Stripe-integration)
- [ ] DIRECT-plan: paste-in tot 30 reviews/maand
- [ ] AGENCY-plan: bulk-audit (URL-scan + multi-file upload) + onbeperkte paste-in
- [ ] Plan-gate check via `src/lib/billing/plan-gate.ts` (komt uit `stripe-billing-live` task)

## Quality gates
- [ ] `npx tsc --noEmit` 0 errors + `npm run lint` 0 errors
- [ ] Smoke-test: paste-in 500-word BB blog-post → expect findings in nl-NL locale; expected duration ≤30s
- [ ] Smoke-test: URL-fetch van eigen homepage → expect findings + sources-tab toont fetch-time
- [ ] Smoke-test: chat-tool `review_content` met paste → BrandReviewResultCard rendert N findings + "Apply suggestion" knop visible
- [ ] Smoke-test: PublishGate toont bevindingen-tabel naast score op een Canvas-deliverable
- [ ] Workspace-isolatie: paste content uit workspace-A → call review als user-workspace-B → 404/403

# Bestanden die ik aanraak

## Schema
- `prisma/schema.prisma` — `ContentReviewLog` model + cascade-relations
- `prisma/migrations/<timestamp>_add_content_review_log/migration.sql` — additief

## Engine
- `src/lib/brand-fidelity/fidelity-runner.ts` — nullable contentMetadata pad
- `src/lib/brand-fidelity/composition-engine.ts` — review-mode flag (skipt brief-to-content lineage assertions)

## Backend
- `src/app/api/alignment/review-external/route.ts` (nieuw) — POST endpoint
- `src/lib/alignment/review-orchestrator.ts` (nieuw) — ingest + F-VAL + persist
- `src/lib/alignment/ingest/{paste,url,docx,pdf}.ts` (nieuw) — per-source ingest helpers
- `src/lib/cron/cleanup-content-review-logs.ts` (nieuw) — nightly retention sweep

## UI Surface 1 — Brand Alignment Tab 3
- `src/features/brand-alignment/components/ContentReviewTab.tsx` (nieuw)
- `src/features/brand-alignment/components/BrandReviewResultsTable.tsx` (nieuw — gedeeld met Surface 2 chat-card)
- `src/components/brand-alignment/BrandAlignmentPage.tsx` — Tab 3 toevoegen aan tab-set
- `src/features/brand-alignment/api/content-review.api.ts` (nieuw) — TanStack Query hooks
- `src/features/brand-alignment/hooks/use-content-review.ts` (nieuw)

## UI Surface 2 — Brand Assistant chat-tool
- `src/lib/claw/tools/read-tools.ts` — `review_content` read-tool toevoegen
- `src/lib/claw/tools/registry.ts` — registreer review_content
- `src/features/claw/components/BrandReviewResultCard.tsx` (nieuw) — chat-card; gebruikt gedeelde BrandReviewResultsTable component
- `src/lib/claw/context-assembler.ts` — system-prompt instructie voor `review_content` (3 use-cases: pre-launch QC, audit, onboarding-feedback)

## UI Surface 3 — PublishGate uitbreiding
- `src/features/campaigns/components/canvas/PublishGate.tsx` — bevindingen-tabel render naast composite-score
- `src/features/campaigns/components/canvas/Step4Timeline.tsx` — geen wijziging (PublishGate al gewired)

## Plan-gate
- `src/lib/billing/plan-gate.ts` (uit stripe-billing-live) — `canUseContentReview` + `canUseBulkAudit` checks

# Bestanden die ik NIET aanraak

- F-VAL Pijler 1 + 2 + 3 — engine onaangeraakt; alleen orchestrator-laag accepteert nullable metadata
- Bestaande studio generation-flow — review-pad is parallel
- BrandVoiceguide schema — alleen reads
- Brandstyle scraper — niet gerelateerd
- Δ-2 heuristiek-pakketten — Pijler 3 wordt natuurlijk verbeterd door Δ-2 maar geen direct integratie nodig hier
- Δ-3 voice 1-pager — F-VAL judge-prompt embed gebeurt door Δ-3, niet hier

# Smoke test plan

1. **Paste-in BB blog**: 500-word nl-NL content → review-route → expect findings (severity-distributed); duration ≤30s; ContentReviewLog rij gepersisteerd; retainUntil = +90 dagen
2. **URL-fetch eigen homepage**: input "https://branddock.app" → ingest via WebFetch → findings tonen sources-attribution
3. **DOCX upload**: 2-page Word-document → pandoc → review → findings rendered
4. **PDF upload**: 5-page PDF → unpdf → review → findings rendered
5. **Chat-tool paste**: in Brand Assistant: "Review deze tekst: [paste 200 words]" → BrandReviewResultCard rendert; Apply-suggestion knop visible
6. **Chat-tool URL**: in Brand Assistant: "Review homepage van acme.com" → fetch + review → findings inline
7. **Chat-tool op Canvas Step 4**: "Review deze draft" → AI uses inspect_current_entity to read draft → review_content with content; findings in chat-card; Apply-suggestion roept fill_form_fields aan
8. **PublishGate consume**: open Canvas Step 4 met content waarvoor F-VAL gerunde → bevindingen-tabel naast score zichtbaar
9. **Workspace-isolatie**: probeer review-route met content van andere workspace → 404
10. **Plan-gate**: FREE-plan workspace probeert review → 403 met upgrade-CTA; DIRECT-plan tot 30 reviews/maand; AGENCY unlimited
11. **Retention**: maak ContentReviewLog met `retainUntil = now()-1day` → run cleanup-cron → row gone
12. **PostHog events**: verify alle 3 events fired in dev-tools

# Risico's

- **F-VAL latency op externe content** (medium): externe paste-in kan langer zijn dan generation-output (paywall articles, etc.) — F-VAL run kan >30s nemen. Mitigatie: char-limit (50k) op input + UI loading-progress + cancel-button
- **PII in ContentReviewLog** (medium): paste-in content kan klant-data of confidentiële tekst bevatten. Mitigatie: encryption-at-rest voor `sourceContent` field; 90-dagen retention default; workspace-toggle in `privacy-dpa-hooks` LATER
- **Pandoc/unpdf failures** (laag-medium): malformed DOCX/PDF → ingest crash. Mitigatie: try/catch + user-friendly error "Bestand niet leesbaar; probeer paste-in"
- **WebFetch op paywall-content** (medium): URLs achter login of paywall → empty/error response. Mitigatie: detecteer empty content + suggest paste-in alternative
- **Bevindingen-tabel UI overload** (medium): 50+ findings op lange content overweldigt user. Mitigatie: severity-filter + collapse-low-severity by default + pagination (10 per page)
- **Plan-gate enforcement** (laag): zonder plan-gate kan FREE-tier user unlimited reviews triggeren = AI-cost. Mitigatie: hard-rate-limit per workspace per dag fallback wanneer plan-gate niet ingericht
- **Embedding kosten** (medium): Δ-2 heuristics + Δ-3 voice 1-pager + F-VAL Pijler 1 cosine voor extern content = ~$0.001-0.005 per review. Mitigatie: cache per content-hash in Redis (24u TTL)

# Out of scope

- **Live re-publishing of auto-correctie** — Δ-1 vlagt afwijkingen, werkt niet zonder gebruiker-actie
- **Visuele review** (logo, kleur, layout) — methodology §12 noemt expliciet als aparte discipline
- **Engagement / performance-correlatie** — Brandclaw Measurement-node post-launch maand 7-9
- **Multi-tenant cross-workspace benchmarks** — `cross-workspace-benchmarks` LATER-roadmap
- **Workspace-niveau privacy-retention-toggle** — `privacy-dpa-hooks` LATER (default 90 dagen v1)
- **PWA / mobile-app voor Brand Assistant chat** — desktop-first
- **OAuth-scoped review** (LinkedIn-post via OAuth) — Channel Activation LATER
- **Refactor van bestaand F-VAL judge-prompt** — alleen extension voor review-mode (skip brief-context); herschrijving out
- **Bulk-async review (>5 URLs)** — single review per request v1; bulk-batch via separate endpoint LATER
- **Re-review historie comparison UI** — past reviews queryable maar diff-UI komt later

# Notes

Drie use-cases die deze ene feature dekt (uit idea-doc):
- **Pre-launch QC**: brand strategist plakt blog-post vóór publicatie → bevindingen-tabel met locatie + ernst + voor/na — gebruikt vooral Surface 1 (Brand Alignment Tab 3) of Surface 3 (PublishGate als content via Canvas komt)
- **Audit**: content-eigenaar voert URL van eigen site in → bevindingen + thematische samenvatting → vergelijken met past audits — gebruikt vooral Surface 1
- **Onboarding-feedback**: onboardende content-maker laat eerste werk reviewen → gestructureerde feedback i.p.v. free-form chat — gebruikt vooral Surface 2 (Brand Assistant chat-tool)

Cross-task dependencies:
- ADR-1 `BrandReviewFinding` schema — al gevergrendeld; output-shape vast
- ADR-3 locale-routing — al gevergrendeld; `language` parameter in review request mapt naar locale via resolver
- Δ-2 heuristics packages — Pijler 3 wordt rijker tijdens Δ-2; Δ-1 review-output verbetert automatisch
- Δ-3 voice 1-pager — F-VAL judge-prompt embed; review-output is automatisch beter onderbouwd
- Phase 3 Strategy Analyst — leest ContentReviewLog historie via `query_review_history` tool (per ADR-2)
- Phase 0.2.A claw-page-awareness foundation — Brand Assistant chat-integratie hooks gewired voor `review_content` op Canvas Step 4

Implementation-volgorde:
1. F-VAL engine extension + ContentReviewLog model (foundation, 2-3d)
2. Backend route + ingest helpers (2-3d)
3. Surface 1 — Brand Alignment Tab 3 UI (1-2d)
4. Surface 3 — PublishGate uitbreiding (0.5-1d, mostly UI)
5. Surface 2 — Brand Assistant chat-tool + chat-card (1-2d)
6. Plan-gate + cron cleanup + smoke-test (0.5-1d)

Parallel-track met Δ-2 (Pijler 3 heuristics) en Δ-3 (judge-prompt embed) — verschillende files, gemeenschappelijke read-only BrandVoiceguide. Coordination point: F-VAL judge-prompt template wordt gewijzigd door Δ-3; review-pad gebruikt zelfde template, dus na Δ-3 ship is review-output direct beter.
