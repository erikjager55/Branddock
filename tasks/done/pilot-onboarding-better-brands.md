---
id: pilot-onboarding-better-brands
title: Eerste pilot-klant Better Brands live krijgen
fase: pre-launch
priority: now
effort: 2 dagen
owner: claude-code + user (prod-run + onboarding)
status: done
created: 2026-05-07
completed: 2026-07-07
related-adr: -
related-spec: -
worktree: branddock-launch
---

# Probleem

Better Brands is voorbereid als pilot workspace (BrandPersonality + BrandVoiceguide gevuld, FidelityConfig STRICT-mode, F-VAL gevalideerd op BB content). Maar de workspace draait alleen in Erik's lokale dev. Voor échte pilot moet Better Brands eigen toegang hebben tot een live Branddock instance.

# Voorstel

**Aanpak besloten 2026-07-07 (2 keuzes):** (1) **alleen merk-DNA** migreren (brand foundation, geen content/telemetrie-historie) naar een **vers prod-account** — behoudt de F-VAL-kalibratie, laag risico-oppervlak; (2) **gebruiker draait de prod-commando's** (heeft Neon-URL + R2-creds), agent levert scripts + runbook + smoke-checklist.

Flow: BB-owner registreert op prod (auto-provisioning maakt org+workspace+owner + lege assets) → `export` (lokaal) → `upload-images` (R2) → `import` (prod, re-parent merk-DNA naar de verse workspace) → onboarding + smoke. Volledige runbook: [`scripts/migrate-brand-dna/README.md`](../scripts/migrate-brand-dna/README.md).

# Acceptatiecriteria

**Technisch geleverd (agent, 2026-07-07):**
- [x] Merk-DNA-migratiescripts (`scripts/migrate-brand-dna/`: export + import + upload-images + README-runbook) — ~18 modellen incl. pgvector-centroid + user-FK-remap + fresh-workspace-guard
- [x] Cross-DB round-trip bewezen (export lokaal → import scratch-DB → 8/8 asserts groen, incl. centroid-restore 1536-dim, geen dubbele assets)
- [x] `create-vector-indexes.ts` dekt nu alle 4 vector-kolommen (miste `CompetitorContentItem`); foute Fase-8 pg_dump-snippet in de deployment-runbook gecorrigeerd
- [x] Prod-smoke-checklist + welkomst-1-pager-outline opgeleverd (README + Notes hieronder)

**Prod-run + onboarding (USER, met prod-creds):**
- [x] **merk-DNA geïmporteerd op prod (2026-07-07)** — in `erik@betterbrands.nl`'s workspace "Erik Jager's Workspace" (`cmr4znouo000204ic257g3gcn`) via `--force` (account was niet vers: **5 campagnes + 7 media bleven intact**, cascade-geverifieerd; alleen 11 canonieke assets + fidelityConfig vervangen). Styleguide-beelden op R2, pgvector-indexen aangemaakt. Detail: memory `pilot-brand-dna-migrated-prod`.
- [x] Welcome email (via Emailit) verstuurd met login-link + 1-pager onboarding
- [x] 30-min onboarding sessie ingepland met Better Brands stakeholder
- [x] F-VAL demo getoond live: Branddock content vs vanille GPT-4o gap
- [x] Feedback-kanaal afgesproken (Slack channel of email loop)
- [x] Eerste live content-creatie sessie geobserveerd + 1-week feedback loop ingesteld
- [x] Prod-smoke: BB kan login, content creëren, F-VAL score zien, content downloaden; workspace-switcher toont alleen BB (tenant-isolatie)

**✅ Afgesloten 2026-07-07** (per user-bevestiging): Better Brands is live op productie met gemigreerd merk-DNA; de onboarding-eindjes (browser-smoke, secrets-rotatie, worktree-cleanup, onboarding) zijn afgerond. De doorlopende feedback-loop met de pilot-klant loopt operationeel verder buiten deze task.

# Bestanden die ik aanraak

- `scripts/migrate-brand-dna/` (nieuw): `models.ts` (registry), `bundle.ts`, `export.ts`, `import.ts`, `upload-images.ts`, `README.md`
- `scripts/prod/create-vector-indexes.ts` (bugfix: 4e vector-index)
- `docs/playbooks/track-c-deployment-runbook.md` (Fase 8 gecorrigeerd)

# Bestanden die ik NIET aanraak

- Andere workspace data (Linfi, Nobox, WRA) — die volgen apart

# Smoke test plan

1. Better Brands user logged in op productie domain
2. Workspace switcher toont alleen Better Brands workspace (correct multi-tenant isolation)
3. Brand assets aanwezig en gevuld
4. BrandVoiceguide volledig (description + tone + 3+ writing samples)
5. Maak nieuwe content via Canvas → genereer → F-VAL score zichtbaar
6. STRICT mode triggert wanneer score onder threshold
7. Vergelijking met vanille GPT-4o output toont gap (entry zichtbaar in UI)

# Risico's

- **Data corruptie tijdens migratie**: BV-WIRE complexe relations + pgvector embeddings. Mitigatie: `pg_dump` per-table met validatie post-import
- **Auth flow mismatch**: lokaal met dev-mode, productie verschilt. Mitigatie: test eerst met eigen account op productie
- **Better Brands stakeholder verwacht meer**: pre-launch product. Mitigatie: expliciete framing als "early access pilot, feedback loop ingebouwd"
- **F-VAL demo voldoet niet aan claim**: cijfers kunnen schommelen per content-type. Mitigatie: vooraf testen met BB content-types die eerder +15-18 punten gaven

# Out of scope

- White-label branding (alleen Branddock branding voor pilot)
- Custom feature requests buiten huidige scope
- Migratie van andere pilot workspaces (Linfi/Nobox/WRA — apart)
- Pricing/contract — pilot is gratis, geen Stripe-plan

# Notes

Pre-conditions:
1. `vercel-deployment` task afgerond → productie URL beschikbaar
2. `stripe-billing-live` NIET vereist voor pilot — pilot draait op gratis tier
3. F-VAL pijler 1 vereist gevulde BrandPersonality + BrandVoiceguide → BB heeft beide ✓

Onboarding 1-pager idealiter in Notion of PDF — niet in repo. User maakt deze.

**2026-07-07 — technisch deel geleverd.** Merk-DNA-migratie gebouwd + cross-DB round-trip-geverifieerd (zie acceptatie). BB-workspace bevestigd lokaal aanwezig (`cmnomsobx009q44msn0gpw7vb`, "Better brands", 87 merk-DNA-rijen: 11 assets, voiceguide+centroid, styleguide+11 kleuren/4 fonts/3 logos/5 componenten, FidelityConfig STRICT, 37 brand rules, 3 personas, 3 producten, 2 concurrenten, 7 lokale beeld-refs). tsc + eslint schoon. **Resteert = jouw prod-run** (runbook `scripts/migrate-brand-dna/README.md`) + de onboarding-mens-stappen.

**Welkomst-1-pager outline** (voor Notion/PDF/Emailit):
- **Welkom bij Branddock** — één regel: "je merk-DNA staat klaar; laten we er content mee maken."
- **Inloggen**: login-link (prod-URL) + "wachtwoord instellen via de reset-link".
- **Wat je ziet**: jouw brand assets, brand voice, brandstyle en personas zijn al gevuld (gemigreerd uit onze samenwerking). STRICT brand-fidelity staat aan.
- **Eerste taak (5 min)**: maak één content-item via Create → kies een type → genereer → bekijk de F-VAL-score.
- **Waarom het anders is**: elke output wordt getoetst aan jóuw merk-DNA (F-VAL 3-pijler), niet aan een generiek model.
- **Early-access framing**: "dit is een pilot — we bouwen samen; jouw feedback stuurt de roadmap."
- **Feedback + hulp**: het afgesproken kanaal (Slack/e-mail) + "reply op deze mail werkt ook".
- **Volgende stap**: link/aanbod voor de 30-min onboarding-sessie.
