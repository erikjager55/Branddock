# Livegang-checklist — peildatum 2026-08-13 (bijgewerkt 2026-08-14: stap 1+2 ✅)

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

- [x] **1a. Neon schema-push VÓÓR de merge** ✅ 2026-08-13 (Erik, via schema-download van de branch + `--schema`/`--url`-vlaggen — lokale checkout bleek onvindbaar):
  ```bash
  DATABASE_URL="<neon-prod-url>" npx prisma db push
  ```
  Nieuw in het schema: tabel `PagePublish` (incl. `compiledHtml`), kolom
  `LandingPage.livePublishId`, tabellen `FormSubmission` + `PageEvent`.
  Zonder deze push crasht de nieuwe code op de eerste publish/form/beacon-call.
- [x] **1b. PR maken + mergen naar main** ✅ 2026-08-13 — PR #251 squash-merged (`4d6746f`),
  prod-deploy automatisch. Follow-up #252 (`8309379`, hoofdstukbeelden + merkbeelden-beheer,
  n.a.v. livegang-feedback) 2026-08-14 gemerged.
- [x] **1c. Prod-verificatie na deploy** — kern bevestigd 2026-08-14 (Erik, browser):
  - [x] bestaande gepubliceerde pagina's renderen (o.a. `linfi.branddock.app/pillar-page`)
  - [x] editor-flow werkt op prod (inline edit, beeldvelden, generatie incl. sectie-beelden)
  - [ ] restchecks nog niet expliciet gedaan: rollback-knop, leadform-submission + webhook,
    beacon-event in stats, publish-gate-422 — meenemen bij eerste echte klantpagina

## 2. Custom domain `branddock.app` (Erik — puur infra, code staat klaar)

Volledig runbook: [`custom-domain-branddock-app.md`](custom-domain-branddock-app.md).
Kort: **A** Vercel-domeinen (app/apex/www-redirect/wildcard) → **B** DNS-records →
**C** 3 env-vars (`BETTER_AUTH_URL`, `NEXT_PUBLIC_MARKETING_URL`, `NEXT_PUBLIC_APP_URL`)
+ Meta OAuth-redirect → **D** verificatie (7 checks). Onafhankelijk van stap 1 —
kan parallel. Ontgrendelt daarna: Apple SSO, `@branddock.app`-afzender, klantdomeinen.

- [x] A t/m D uitgevoerd en geverifieerd ✅ 2026-08-13/14 — uitvoering week af van het
  runbook: nameservers volledig naar Vercel gedelegeerd (`ns1`/`ns2.vercel-dns.com`,
  TransIP-DNS uit) i.p.v. losse records. Daardoor: DNS-beheer voortaan in Vercel,
  wildcard zonder TXT-verificatie. NB: TransIP-mail-records (MX/SPF/DKIM) daarmee
  vervallen — er draaide geen mail op het domein; bij `@branddock.app`-afzender
  (runbook §E) records in Vercel-DNS aanmaken.
- [x] Gepubliceerde pagina op `<workspace>.branddock.app/<slug>` rendert
  (`linfi.branddock.app/pillar-page`, 2026-08-14)

## 3. TOPUP aan — omzet-schakelaar (Erik)

Technisch klaar (bouw #380-#386 ✅, smokes ✅). Playbook: `stripe-go-live.md` §10/§11.

- [ ] `NEXT_PUBLIC_TOPUP_ENABLED=true` in Vercel production-env + redeploy
- [ ] Eén echte betaal-smoke (topup-checkout met echte kaart/iDEAL, klein bedrag)
- [ ] Auto-topup-kill-switch-gedrag bekend (één gefaalde incasso zet hem uit)

## 4. Afhechting rond livegang (niet-blokkerend, wel deze fase)

| Item | Eigenaar | Bron |
|---|---|---|
| ~~CSP Report-Only → enforce~~ ✅ **gedaan 18-08** (#294) — niet via prod-logs maar via een lokale meting tegen een echte productiebuild; die logs bleken onbruikbaar | afgerond | `tasks/done/security-residual-hardening.md` |
| `repair-defaults` op prod (BB `contentLanguage` en→nl) | agent, bij uitleg-moment | open-acties §C |
| Onboarding-test met 3 externe testers | Erik | `tasks/onboarding-flow-test.md` |
| `golden-set-gate-decouple` (nightly 4/5 rood → gate genegeerd) | agent, zonder eigenaar | `tasks/golden-set-gate-decouple.md` |
| `workspaces-online-migratie` rest (8 van 9 gedaan, #453) | Erik kiest laatste set | `tasks/workspaces-online-migratie.md` |
| Klein prod-nawerk: Barneveld-logo, "+12"-proof point, marketing-restjes | Erik | open-acties §B |
| Browser-smoke LP-matrix op prod | samen (functioneel agent, visueel Erik) | open-acties §A — valt samen met 1c |

## 5. Go-live-criterium (roadmap "Launch"-definitie)

- [x] Custom domain live (stap 2) ✅ 2026-08-14
- [ ] Billing operationeel incl. topup (stap 3) — **enige resterende launch-stap**
- [ ] 0 P0/P1 bugs in core flows na stap-1c-verificatie (restchecks 1c open)
- [ ] Eerste betalende klant = de fase-afsluiting (post-livegang)

> **Restlijst na 2026-08-14**: (1) TOPUP-flip + betaal-smoke (stap 3), (2) 1c-restchecks
> (rollback/leadform/beacon/gate), (3) Meta OAuth-redirect-URL controleren,
> (4) Neon-wachtwoord roteren (stond 2026-08-13 in een chatsessie) + `DATABASE_URL`
> in Vercel bijwerken, (5) afhechting §4.

---

**Volgorde-advies**: 1a → 1b → (1c ∥ 2) → 3. Stap 2 kan vandaag al starten
(DNS-propagatie loopt dan terwijl stap 1 landt). Stap 3 pas ná 1c + 2-verificatie,
zodat de eerste betalende gebruiker op het echte domein en de nieuwe publish-keten zit.
