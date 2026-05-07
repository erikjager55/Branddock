---
id: campaign-drafts-db-backed
title: Campaign Drafts DB-backed (multi-device persistence)
fase: post-launch
priority: next
effort: 1.5 dag
owner: claude-code
status: open
created: 2026-05-07
completed: -
related-adr: -
related-spec: docs/archive/plans-pending-task-migration/IMPLEMENTATIEPLAN-CAMPAIGN-DRAFTS.md
worktree: branddock-feat-campaign-drafts
---

# Probleem

Campaign Wizard leeft alleen in geheugen (`useCampaignWizardStore`). Een 16-minuten Concept-stap ging recent verloren na page refresh — de campagne werd nooit in de DB aangemaakt tot Review-stap via `wizard/launch/route.ts`. Fase 1 (Zustand `persist` middleware) beschermt tegen page refresh binnen één browser maar onvoldoende voor multi-device, crash-recovery vóór localStorage write, of zichtbaarheid van drafts buiten de wizard.

# Voorstel

Volledige DB-backed draft persistence, gemodelleerd naar `ExplorationSession` patroon. Draft = Campaign-rij met `status: DRAFT` + `wizardState Json`. Bij wizard-launch wordt draft een UPDATE (geen nieuwe create). Max 5 drafts per user per workspace, soft delete via `isArchived: true`.

# Acceptatiecriteria

- [ ] Schema: `CampaignStatus` enum +`DRAFT`, `Campaign` model +`wizardState Json?` veld
- [ ] Draft wordt aangemaakt bij stap 1 → stap 2 transitie (niet bij wizard-open)
- [ ] Auto-save na elke stap-transitie (geen opslag bij elke field-change)
- [ ] Max 5 drafts per user per workspace — bij overschrijding moet user eerst sluiten/verwijderen
- [ ] Soft delete via `isArchived: true` (consistent met bestaand archive patroon)
- [ ] Drafts zichtbaar op Active Campaigns pagina in eigen sectie (vervuilen Active lijst niet)
- [ ] Resume flow: klik op draft → wizard hervat in juiste stap met `wizardState`
- [ ] Naadloze launch: `wizard/launch/route.ts` doet UPDATE op bestaande Campaign (status DRAFT → ACTIVE), niet INSERT
- [ ] Last-write-wins bij meerdere tabs op zelfde draft
- [ ] `npx tsc --noEmit` 0 errors
- [ ] Smoke-test: 5 stappen → page refresh → resume + alle data intact

# Bestanden die ik aanraak

- `prisma/schema.prisma` — CampaignStatus enum + Campaign.wizardState
- `src/features/campaigns/stores/useCampaignWizardStore.ts` — partialize + DB save calls
- `src/features/campaigns/api/wizard.api.ts` — nieuwe draft CRUD endpoints
- `src/app/api/campaigns/wizard/drafts/route.ts` — POST (create) + GET (list)
- `src/app/api/campaigns/wizard/drafts/[id]/route.ts` — PATCH (auto-save) + DELETE (soft)
- `src/app/api/campaigns/wizard/launch/route.ts` — UPDATE i.p.v. INSERT
- `src/features/campaigns/components/wizard/CampaignWizardPage.tsx` — load draft + stap-transitie save
- `src/features/campaigns/components/overview/ActiveCampaignsPage.tsx` — drafts sectie
- `src/features/campaigns/components/overview/DraftCampaignBanner.tsx` (nieuw)

# Bestanden die ik NIET aanraak

- SSE-pipeline routes (`/api/campaigns/wizard/strategy/*`) — blijven stateless per beslissing
- `useCampaignStore` (overview store) — alleen banner-component leest drafts

# Smoke test plan

1. Open wizard, vul stap 1 in, klik "Continue" → DB-rij created met `status: DRAFT`
2. Vul stap 2 in, klik "Continue" → wizardState updated in DB
3. Hard refresh browser → navigeer terug naar Active Campaigns → zie draft in Drafts sectie
4. Klik op draft → wizard opent in stap 3 met data intact
5. Voltooi wizard → launch → verify `Campaign.status` = `ACTIVE`, geen tweede DB-rij created
6. Maak 5 drafts → 6e poging → zie blokkerende melding "max 5 drafts"
7. Archive een draft → poging 6 weer → succes

# Risico's

- **Schema breaking change** voor bestaande campagnes — mitigatie: `wizardState` nullable, bestaande Campaigns krijgen NULL
- **Auto-save race condition** met SSE-pipeline events — mitigatie: save alleen op stap-transitie, niet tijdens pipeline-run
- **Multi-tab concurrent edits** — gekozen voor last-write-wins; user merkt dit alleen bij actieve dual-tab werk

# Out of scope

- Optimistic locking / conflict resolution
- Draft sharing tussen users in zelfde workspace
- Draft templates
- Diff-tracking tussen draft revisions (zie ContentVersion patroon, niet hier)

# Notes

Volledig plan in `docs/archive/plans-pending-task-migration/IMPLEMENTATIEPLAN-CAMPAIGN-DRAFTS.md` (523 regels, 5 stappen uitgewerkt). Stap-voor-stap implementatie volgens dat plan.
