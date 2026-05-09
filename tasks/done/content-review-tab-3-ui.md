---
id: content-review-tab-3-ui
title: Δ-1 Surface C — Brand Alignment Tab 3 "Content Review" UI
fase: pre-launch
priority: now
effort: 1-2 dagen
owner: claude-code
status: done
created: 2026-05-08
completed: 2026-05-09
finalize-rounds: 3 review-iteraties (R1 0/6 / R2 0/3 / R3 0/0 WARNING), 0 CRITICAL doorheen. Productie-commit `994e772` + finalize-fixes.
related-adr: 2026-05-08-fval-output-schema-bevindingen, 2026-05-08-locale-routing-brand-voice
related-spec: tasks/_drafts/idea-brand-control-program.md
worktree: -
---

# Probleem

Δ-1 sub-cluster A (foundation + engine) en B v1 (POST /api/alignment/review-external) zijn klaar en live-smoke-getest, maar er is nog geen UI die de endpoint aanroept. De Better Brands pilot kan extern content (paste-in copy / website-URLs) niet zelf reviewen zonder API-call. Surface C is de eerste consumer en maakt het API-werk direct bruikbaar voor de pilot.

# Voorstel

Een derde tab "Content Review" toevoegen aan `BrandAlignmentPage` (naast Alignment + Audit). Tab bevat een paste-textarea + URL-input (file-upload deferred naar B-2), submit roept POST /api/alignment/review-external aan, en rendert het resultaat: composite-score gauge + threshold-badge + findings-tabel met severity/categorie/location/description-kolommen. Filters per severity en categorie via simpele toggle-pills. Hergebruik bestaande primitives (`SeverityBadge`, design-tokens, `PageShell`-pattern).

# Acceptatiecriteria

- [ ] Tab "Content Review" verschijnt rechts naast Alignment/Audit met `FileSearch` icon
- [ ] Paste-textarea (min 50 chars, max 50k) — submit disabled buiten range
- [ ] URL-input toggle (http/https only via client-side validatie, server-side fallback)
- [ ] Submit toont loading-state (skeleton + spinner) tijdens F-VAL run
- [ ] Resultaat rendert: composite-score (0-100) + threshold-met badge + findingsCount + scorerVersion
- [ ] Findings-tabel toont severity-badge / categorie-pill / location / description
- [ ] Filter-pills per severity (HIGH/MEDIUM/LOW) en categorie — toggle-state in component
- [ ] 4xx errors leesbaar tonen (bv. "URL geblokkeerd: privé-IP", "Content te kort", "Timeout")
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd in dev-browser

# Bestanden die ik aanraak

- `src/stores/useBrandAlignmentStore.ts` — `AlignmentTab` union extend met `"review"`
- `src/components/brand-alignment/BrandAlignmentPage.tsx` — extra tab-button + render-branch
- `src/components/brand-alignment/ContentReviewTab.tsx` *(nieuw)* — input-sectie + submit
- `src/components/brand-alignment/ContentReviewResult.tsx` *(nieuw)* — score-gauge + findings-tabel
- `src/hooks/useReviewContent.ts` *(nieuw)* — TanStack Query mutation tegen POST /api/alignment/review-external

# Bestanden die ik NIET aanraak

- `src/lib/brand-fidelity/external-content-runner.ts` — engine al klaar, niet wijzigen
- `src/app/api/alignment/review-external/route.ts` — API al klaar
- `src/lib/alignment/external-content-ingest.ts` — ingest al klaar
- `src/components/brand-alignment/BrandAuditView.tsx` — losse audit-tab niet aanraken
- `prisma/schema.prisma` — geen schema-changes voor v1 UI

# Smoke test plan

1. Start dev-server (`npm run dev`)
2. Login als Better Brands user, navigeer naar Brand Alignment-pagina
3. Klik op "Content Review" tab — verifieer dat die rendert
4. **Paste-test**: plak fluff-zware nederlandse tekst (min 200 chars) → submit
   - Verwacht: composite-score ≤ 60, ≥ 3 findings, categorieën VOICE + CLAIMS zichtbaar
5. **URL-test**: plak een Better Brands publieke URL → submit
   - Verwacht: score + findings, of leesbare error wanneer fetch faalt
6. **Filter-test**: klik HIGH-pill → alleen HIGH-findings zichtbaar
7. **Error-test**: plak `http://169.254.169.254/...` → verwacht "URL geblokkeerd"
8. **Empty-test**: laat textarea leeg, submit-knop disabled
9. Refresh pagina — geen state-leak (verse blank input)

# Risico's

- Lange F-VAL runs (>5s met judge-active) kunnen traag voelen → mitigeer met optimistic-loading-skeleton + judge-skip toggle
- Tailwind 4 purge-issues op nieuwe utility-klassen → check `index.css` als nieuwe kleuren niet renderen
- Prompt-injection vector via paste-content (HTML-tags etc.) — al server-side gemitigeerd, maar XSS-vector op findings.description / location render. **Mitigatie: render altijd via React text-children, nooit via dangerouslySetInnerHTML**

# Out of scope

- File-upload UI — volgt in B-2 (PDF via unpdf, DOCX via mammoth)
- Tone-suggestions / inline-edit op findings — Δ-1 v2
- Surface D Brand Assistant chat-tool — eigen task
- Surface E PublishGate uitbreiding — eigen task
- History-list van eerder geüploade reviews — Δ-1 v2 (later)
- Auto-export naar PDF/CSV — niet voor pilot

# Notes

- API response-shape: `{ reviewLogId, compositeScore, thresholdMet, findingsCount, durationMs, scorerVersion }` (zonder findings — die kunnen later via separate GET worden gefetcht). v1 fetcht findings inline na submit via aparte GET, of we laten het API direct findings teruggeven. **Beslissing**: v1 doet aparte GET na submit voor consistente FE-pattern met andere endpoints; later optimaliseren naar inline-response indien wenselijk.
- Wacht: huidige API geeft GEEN findings terug. Optie A: extend route response om findings inline te returneren. Optie B: `GET /api/alignment/review-external/:reviewLogId` voor findings-fetch. **Optie A simpler v1** — extend response naar `{ ..., findings: [...] }`. Dat is een minimale API-change, geen breaking change, en bespaart een round-trip.
