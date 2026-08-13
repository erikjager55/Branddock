# Livegang-checklist — peildatum 2026-08-13

> **Context**: de app draait al op productie (`branddock-7y9n.vercel.app`, main=production,
> Vercel Pro+Fluid, regio fra1) met Stripe-billing live en credits in pilotmodus.
> "Livegang" per roadmap-definitie = **custom domain + billing operationeel + 0 P0/P1**.
> Dit bestand consolideert de láátste stappen in volgorde, met verwijzing naar de
> bestaande playbooks. Afvinken + daarna archiveren naar `tasks/done/`.

---

## 1. Webpage-builder-rework naar prod (branch `claude/puck-editor-improvement-y9ep4x`)

Schone fast-forward op main (0 achter, geverifieerd 2026-08-13). Volledige
suite groen (53/53 phases, tsc 0). Puck-exit + versioned publishing + static compile +
forms/analytics + publish-gate + generatieve patterns — zie
`docs/specs/2026-08-07-webpage-builder-verbeterplan.md` (§ Uitvoeringsstatus).
**Pre-merge review-ronde ✅ 2026-08-13**: 2 parallelle code-reviewers over de volledige
diff — 0 CRITICAL; alle 5 MAJORs + goedkope MINORs gefixt (spoofbare leads-KPI dicht,
form-rate-limit gelaagd, ISR-revalidate op delete, sectie-AI dekt alle 22 types,
publish-gate-precisie). Uitgestelde restpunten: `tasks/lp-review-followups.md`.

**Volgorde is essentieel** (memory `neon-schema-push-on-deploy`):

- [ ] **1a. Neon schema-push VÓÓR de merge** (Erik, lokaal — additief, breekt draaiende code niet):
  ```bash
  DATABASE_URL="<neon-prod-url>" npx prisma db push
  ```
  Nieuw in het schema: tabel `PagePublish` (incl. `compiledHtml`), kolom
  `LandingPage.livePublishId`, tabellen `FormSubmission` + `PageEvent`.
  Zonder deze push crasht de nieuwe code op de eerste publish/form/beacon-call.
- [ ] **1b. PR maken + mergen naar main** (main=production deployt automatisch).
  Geen nieuwe env-vars nodig; host-router is al consistent met het domein-runbook.
- [ ] **1c. Prod-verificatie na deploy** (browser of curl):
  - bestaande gepubliceerde pagina rendert nog (legacy `/p/<slug>` redirect werkt)
  - nieuwe publish vanuit Step 4 → versie in "Publicaties"-lijst + live artifact
  - rollback-knop → vorige versie serveert direct
  - leadformulier op een testpagina → submission zichtbaar + webhook afgeleverd
  - `?utm`-bezoek → beacon-event in stats-paneel
  - publish-gate: pagina met placeholder-copy wordt geblokkeerd (422)

## 2. Custom domain `branddock.app` (Erik — puur infra, code staat klaar)

Volledig runbook: [`custom-domain-branddock-app.md`](custom-domain-branddock-app.md).
Kort: **A** Vercel-domeinen (app/apex/www-redirect/wildcard) → **B** DNS-records →
**C** 3 env-vars (`BETTER_AUTH_URL`, `NEXT_PUBLIC_MARKETING_URL`, `NEXT_PUBLIC_APP_URL`)
+ Meta OAuth-redirect → **D** verificatie (7 checks). Onafhankelijk van stap 1 —
kan parallel. Ontgrendelt daarna: Apple SSO, `@branddock.app`-afzender, klantdomeinen.

- [ ] A t/m D uitgevoerd en geverifieerd
- [ ] Gepubliceerde pagina op `<workspace>.branddock.app/<slug>` rendert (raakt stap 1!)

## 3. TOPUP aan — omzet-schakelaar (Erik)

Technisch klaar (bouw #380-#386 ✅, smokes ✅). Playbook: `stripe-go-live.md` §10/§11.

- [ ] `NEXT_PUBLIC_TOPUP_ENABLED=true` in Vercel production-env + redeploy
- [ ] Eén echte betaal-smoke (topup-checkout met echte kaart/iDEAL, klein bedrag)
- [ ] Auto-topup-kill-switch-gedrag bekend (één gefaalde incasso zet hem uit)

## 4. Afhechting rond livegang (niet-blokkerend, wel deze fase)

| Item | Eigenaar | Bron |
|---|---|---|
| CSP Report-Only → enforce (`[csp-report]`-logs analyseren) | Erik levert logs, agent flipt | `tasks/security-residual-hardening.md` |
| `repair-defaults` op prod (BB `contentLanguage` en→nl) | agent, bij uitleg-moment | open-acties §C |
| Onboarding-test met 3 externe testers | Erik | `tasks/onboarding-flow-test.md` |
| `golden-set-gate-decouple` (nightly 4/5 rood → gate genegeerd) | agent, zonder eigenaar | `tasks/golden-set-gate-decouple.md` |
| `workspaces-online-migratie` rest (8 van 9 gedaan, #453) | Erik kiest laatste set | `tasks/workspaces-online-migratie.md` |
| Klein prod-nawerk: Barneveld-logo, "+12"-proof point, marketing-restjes | Erik | open-acties §B |
| Browser-smoke LP-matrix op prod | samen (functioneel agent, visueel Erik) | open-acties §A — valt samen met 1c |

## 5. Go-live-criterium (roadmap "Launch"-definitie)

- [ ] Custom domain live (stap 2)
- [ ] Billing operationeel incl. topup (stap 3)
- [ ] 0 P0/P1 bugs in core flows na stap-1c-verificatie
- [ ] Eerste betalende klant = de fase-afsluiting (post-livegang)

---

**Volgorde-advies**: 1a → 1b → (1c ∥ 2) → 3. Stap 2 kan vandaag al starten
(DNS-propagatie loopt dan terwijl stap 1 landt). Stap 3 pas ná 1c + 2-verificatie,
zodat de eerste betalende gebruiker op het echte domein en de nieuwe publish-keten zit.
