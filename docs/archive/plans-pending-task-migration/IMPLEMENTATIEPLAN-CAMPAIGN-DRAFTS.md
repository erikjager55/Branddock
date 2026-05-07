# Implementatieplan: Campaign Drafts (DB-backed)

> **Status**: Plan goedgekeurd, klaar voor Stap 1
> **Aangemaakt**: 2026-04-10
> **Aanleiding**: Een 16-minuten Concept-stap ging verloren na page refresh omdat de Campaign Wizard alleen in geheugen leeft (`useCampaignWizardStore`). De campagne werd nooit in de database aangemaakt — pas in de Review-stap via `wizard/launch/route.ts`.
> **Fase 1 (al uitgevoerd)**: Zustand `persist` middleware op `useCampaignWizardStore`. Beschermt tegen page refresh binnen één browser. Onvoldoende voor multi-device, crash-recovery vóór localStorage write, of zichtbaarheid van drafts buiten de wizard.
> **Fase 2 (dit plan)**: Volledige DB-backed draft persistence, gemodelleerd naar het bestaande `ExplorationSession` patroon (KBF-4.3, #100).

---

## Doelstellingen

1. Draft-campagnes overleven crashes, refreshes, browser-wisselingen en multi-device gebruik.
2. Maximaal **5 drafts per user per workspace**. Bij overschrijding moet de gebruiker eerst een draft afsluiten of verwijderen.
3. Drafts zijn zichtbaar op de Active Campaigns pagina (eigen sectie/banner) maar **vervuilen de Active lijst niet**.
4. Naadloze promotion: launch van een draft is een UPDATE van de bestaande Campaign-rij, niet een nieuwe create.
5. Geen verandering in het bestaande SSE-pipeline contract — pipelines blijven stateless. De client orkestreert opslag.

---

## Aannames (bevestigd door Erik 2026-04-10)

1. ✅ **"Max 5 drafts" = per user per workspace.** Sarah Chen (seed user, MEMBER van Branddock Agency) en Erik (OWNER) hebben elk hun eigen 5 drafts in dezelfde workspace.
2. ✅ **Aanmaken bij stap 1 → stap 2 transitie.** Gebruiker die de wizard opent en direct wegklikt → geen lege DB-rij.
3. ✅ **Soft delete via `isArchived: true`** (volgt bestaand campaign archive patroon — zie `CampaignOverflowMenu.tsx:69` Archive/Unarchive toggle en `GET /api/campaigns` filter `where.isArchived = false`). De `DELETE /drafts/[id]` endpoint zet `isArchived: true`. Vanuit de bestaande "Archived" view (filter `?isArchived=true` op `/api/campaigns`) kan de gebruiker dan permanent verwijderen via de bestaande `DELETE /api/campaigns/[id]`. We introduceren GEEN nieuwe `ARCHIVED` status enum waarde — die bestaat al maar wordt nergens gebruikt; consistent blijven met de boolean is beter.
4. ✅ **Pipeline SSE routes blijven stateless.** Save-naar-DB gebeurt vanuit de UI in `onComplete` callbacks van de SSE handlers.
5. ✅ **Last-write-wins** bij meerdere tabs op dezelfde draft. Geen optimistic locking voor nu.

---

## Stap 1 — Schema + Migration

### Wijzigingen

**`prisma/schema.prisma`**

```prisma
enum CampaignStatus {
  DRAFT       // ⬅️ NIEUW (echt nieuw — bestaande ARCHIVED enum waarde blijft ongebruikt, wij gebruiken isArchived boolean voor archive)
  ACTIVE
  COMPLETED
  ARCHIVED
}

model Campaign {
  // ... bestaande velden
  // (isArchived Boolean bestaat al — gebruiken we voor soft delete van drafts)
  
  // Draft persistence (Fase 2 — DB-backed wizard state)
  wizardState        Json?       // Snapshot van useCampaignWizardStore (zelfde shape als partialize() uit Fase 1)
  wizardStep         Int?        // Laatst voltooide stap (1-6) — voor "Resume from step X" UI
  wizardLastSavedAt  DateTime?
  wizardOwnerId      String?     // FK naar User — drafts zijn per-user, niet per-workspace
  wizardOwner        User?       @relation("CampaignWizardOwner", fields: [wizardOwnerId], references: [id], onDelete: SetNull)
  
  // ... bestaande indexes
  @@index([workspaceId, status, wizardOwnerId, isArchived, wizardLastSavedAt])  // Voor snelle draft-lookup
}

model User {
  // ... bestaande relaties
  draftCampaigns Campaign[] @relation("CampaignWizardOwner")
}
```

**Belangrijke notitie**: De gearchiveerde drafts komen automatisch in de bestaande "Archived" filter (`?isArchived=true` op `/api/campaigns`) terecht, samen met archived active campaigns. Vanuit daar kan de gebruiker via de bestaande `DELETE /api/campaigns/[id]` permanent verwijderen. We hoeven dus géén nieuwe Archive view te bouwen — die bestaat al, en mengt nu naadloos archived drafts en archived campaigns.

### Migratie-strategie

- `npx prisma db push` — geen data migration nodig, alle nieuwe velden zijn nullable.
- Bestaande Campaigns krijgen `status` ongewijzigd (alleen `ACTIVE/COMPLETED/ARCHIVED`), `wizardState/wizardStep/wizardLastSavedAt/wizardOwnerId` blijven `null`.

### Verificatie

- `npx prisma db push` succesvol
- `npx prisma validate` clean
- `npx tsc --noEmit` 0 errors (Prisma types regenereren automatisch)
- `psql` query: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Campaign' AND column_name LIKE 'wizard%';` toont 4 nieuwe kolommen

### Done criterium

- Schema in sync, types gegenereerd, geen runtime errors bij bestaande Campaign queries.

---

## Stap 2 — API Endpoints

### Nieuwe endpoints

**`POST /api/campaigns/wizard/drafts`** — Nieuwe draft aanmaken

```ts
// Body
{
  name?: string;           // Optional, defaults to "Untitled draft"
  wizardState: Record<string, unknown>;  // Initial state snapshot
  wizardStep?: number;     // Default 1
}

// Response
{
  campaignId: string;
  isAtLimit: false;        // Alleen true als dit de 5e draft is
}

// Errors
// 403 — geen workspace/user
// 409 — DRAFT_LIMIT_REACHED (5 drafts already exist for this user in this workspace)
```

Server-side check: `prisma.campaign.count({ where: { workspaceId, status: 'DRAFT', wizardOwnerId: userId } })` ≥ 5 → 409.

Slug = `draft-{cuid()}` (collision-vrij). Title = `name || "Untitled draft"`.

**`GET /api/campaigns/wizard/drafts`** — Lijst alle drafts voor huidige user/workspace

```ts
// Response
{
  drafts: Array<{
    id: string;
    name: string;
    wizardStep: number;
    wizardLastSavedAt: string;
    createdAt: string;
  }>;
  limit: 5;
  current: number;
}
```

Sorted by `wizardLastSavedAt desc`.

**`GET /api/campaigns/wizard/drafts/[id]`** — Volledige state van één draft laden

```ts
// Response
{
  campaignId: string;
  name: string;
  wizardState: Record<string, unknown>;
  wizardStep: number;
  wizardLastSavedAt: string;
}
```

Workspace + ownership check. 404 als draft niet bestaat of niet van deze user.

**`PATCH /api/campaigns/wizard/drafts/[id]`** — State opslaan (debounced auto-save)

```ts
// Body
{
  wizardState?: Record<string, unknown>;  // Volledige snapshot
  wizardStep?: number;
  name?: string;                          // Sync naar Campaign.title
}

// Response
{
  ok: true;
  wizardLastSavedAt: string;
}
```

Update `wizardLastSavedAt = new Date()`. Workspace + ownership check.

**`DELETE /api/campaigns/wizard/drafts/[id]`** — Draft archiveren (soft delete)

Zet `isArchived: true` (status blijft `DRAFT`, `wizardState` blijft intact). Workspace + ownership check.

Rationale: Een gearchiveerde draft kan later teruggehaald worden ("Unarchive") en de gebruiker verliest geen werk per ongeluk. Permanent verwijderen kan via de bestaande `DELETE /api/campaigns/[id]` (die hardelete), bereikbaar vanuit de Archived view (`?isArchived=true` filter op de bestaande campaigns lijst).

```ts
// Response
{ ok: true; archivedAt: string }
```

### Aanpassingen aan bestaande endpoints

**`GET /api/campaigns` (`src/app/api/campaigns/route.ts`)**

- `where` clause: voeg `status: { not: 'DRAFT' }` toe (naast bestaande `type: { not: 'CONTENT' }` en `isArchived: false`).
- Resultaat: drafts (DRAFT status) verschijnen nooit in de Active Campaigns lijst. Gearchiveerde drafts (DRAFT + isArchived: true) verschijnen ook niet in de Active lijst, MAAR ze verschijnen wél in de Archived view (`?isArchived=true`) — dat is bedoeld gedrag, daar kunnen ze permanent verwijderd of unarchived worden.
- ⚠️ Bij Stap 2 controleren of de bestaande Archived view deliverable counts correct toont voor drafts (drafts hebben mogelijk deliverables = 0). Cosmetisch issue, niet blocking.

**`POST /api/campaigns/wizard/launch` (`src/app/api/campaigns/wizard/launch/route.ts`)**

- Zod schema uitbreiden met `draftCampaignId: z.string().optional()`.
- Als `draftCampaignId` aanwezig: ownership/workspace check, dan UPDATE die Campaign:
  - `status: 'ACTIVE'`
  - `wizardState: Prisma.JsonNull`
  - `wizardStep: null`
  - `wizardLastSavedAt: null`
  - `wizardOwnerId: null`
  - `slug` regenereren uit `name` (bestaande logica)
  - `title`, `campaignGoalType`, `strategy` updaten uit body
- Knowledge assets en deliverables worden aan **dezelfde** campaign-rij gehangen (via `campaign.id`).
- Cache invalidation onveranderd.
- Als `draftCampaignId` afwezig: bestaande CREATE-pad (backward compat voor wizards die nooit draft-mode gebruikten).

### Verificatie per endpoint

- Curl POST `/drafts` met seed user session → DB rij met `status: DRAFT`
- Herhaal 5x → 6e POST faalt met 409 DRAFT_LIMIT_REACHED
- Curl GET `/drafts` → 5 records geretourneerd, gesorteerd op lastSavedAt
- Curl PATCH met wizardState body → `wizardLastSavedAt` updated
- Curl DELETE → record weg
- Bestaande `GET /api/campaigns` → DRAFTs niet meer in response
- Curl POST `/wizard/launch` met `draftCampaignId` → DRAFT bestaat niet meer als DRAFT, één nieuwe ACTIVE Campaign met dezelfde ID + correcte slug

### Done criterium

- Alle 5 endpoints curl-getest met 401/403/404/409 paden
- TypeScript 0 errors
- `GET /api/campaigns` returncount = ACTIVE only

---

## Stap 3 — Store + Auto-Save Integratie

### Store wijzigingen

**`src/features/campaigns/stores/useCampaignWizardStore.ts`**

Nieuwe state velden:
```ts
draftCampaignId: string | null;
draftSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
draftLastSavedAt: string | null;
```

Nieuwe actions:
```ts
setDraftCampaignId: (id: string | null) => void;
setDraftSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
setDraftLastSavedAt: (ts: string | null) => void;
loadDraft: (data: { campaignId: string; wizardState: Record<string, unknown>; wizardStep: number }) => void;
```

`loadDraft()`: vervangt store state met `wizardState` (gefilterd via dezelfde `partialize` keys), zet `currentStep = wizardStep`, zet `draftCampaignId`. Wordt aangeroepen vanuit het Resume-pad in de UI.

**Belangrijk**: `draftCampaignId` MOET in de Fase 1 `partialize` whitelist komen, anders raakt de koppeling kwijt na refresh.

### Auto-save hook

**Nieuw bestand: `src/features/campaigns/hooks/useDraftAutoSave.ts`**

```ts
export function useDraftAutoSave() {
  const draftCampaignId = useCampaignWizardStore((s) => s.draftCampaignId);
  // ... watch alle relevante velden
  
  // Debounced save (1500ms)
  // Triggered op: name, description, briefing fields, knowledge selection, 
  //               selected deliverables, currentStep
  
  // Immediate save (no debounce) bij milestone events:
  // - insights mining complete (insights.length > 0)
  // - concept selected (selectedConceptIndex !== null)
  // - synthesizedStrategy gezet
  // - elaborateResult gezet
  
  // Save logica:
  // 1. POST /drafts als draftCampaignId == null AND currentStep >= 2
  //    (= step 1 → 2 transitie creëert de DB rij)
  // 2. PATCH /drafts/:id met partialize'd state daarna
  // 3. Update draftSaveStatus + draftLastSavedAt in store
}
```

**Race conditions**:
- AbortController per save call. Nieuwe save cancelt vorige in-flight request.
- Gebruik `useRef<AbortController | null>` om voorkomen state tear in React 19 double-invoke.

### Wiring

**`CampaignWizardPage.tsx`**: roept `useDraftAutoSave()` aan op mount. Effect cleanup cancelt in-flight request.

**Save indicator UI**: nieuwe `<DraftSaveIndicator />` component naast de WizardStepper toont `draftSaveStatus`:
- `idle` → niets
- `saving` → "Saving..." met spinner
- `saved` → "Saved 2s ago" (getick relatief, herberekend op interval)
- `error` → rode tekst met retry icon

### Verificatie

- Wizard openen, naam invullen, naar stap 2 → DevTools Network toont 1 POST /drafts. DB rij verschijnt.
- Briefing veld typen → na 1.5s 1 PATCH /drafts/:id. Geen meervoudige saves bij snel typen (debounce werkt).
- Insight mining starten en voltooien → bij `complete` SSE event 1 immediate PATCH met insights array.
- Refresh page → wizard opent op juiste stap (uit localStorage via Fase 1) en `draftCampaignId` is nog gekoppeld.
- Tweede tab openen, andere draft starten → twee aparte DB rijen, beide met eigen draftCampaignId in eigen tab.

### Done criterium

- Auto-save draait zonder ratelimits of duplicate inserts
- Save indicator geeft accurate feedback
- Geen orphaned saves bij component unmount

---

## Stap 4 — UI: Draft Picker + Resume Flow

### Componenten

**Vervanging: `DraftCampaignBanner` → `DraftCampaignsList`**

Locatie: `src/features/campaigns/components/overview/DraftCampaignsList.tsx`

```tsx
export function DraftCampaignsList({
  drafts,        // Van GET /drafts
  onResume,      // (id) => void
  onDiscard,     // (id) => void
}) {
  if (drafts.length === 0) return null;
  
  return (
    <Card>
      <CardHeader>
        <h3>Drafts in progress ({drafts.length}/5)</h3>
      </CardHeader>
      <CardBody>
        {drafts.map(d => (
          <DraftRow
            key={d.id}
            draft={d}
            onResume={() => onResume(d.id)}
            onDiscard={() => onDiscard(d.id)}
          />
        ))}
      </CardBody>
    </Card>
  );
}
```

Elke `DraftRow`: naam, "Step X of 6 ({stepLabel})", relatieve "Saved 2 hours ago", Continue + Archive buttons. Knop heet bewust "Archive" (niet "Discard") omdat het soft delete is — gebruiker weet dat hij het later kan terughalen vanuit de Archived view. Tooltip op de Archive knop: "Move to archive — can be restored later".

**`ActiveCampaignsPage.tsx`** uitbreiden:
- Hook: `useDraftCampaigns()` (TanStack Query → GET /drafts)
- Render `<DraftCampaignsList>` boven de bestaande campaign grid (vervangt de oude `<DraftCampaignBanner />`)
- "New Campaign" button gedrag uitbreiden:
  - Als `drafts.length === 0` → start fresh (huidige gedrag)
  - Als `drafts.length >= 1` && `< 5` → modal met opties: "Resume an existing draft" (lijst) of "Start a new campaign"
  - Als `drafts.length === 5` → modal met message: "You have 5 drafts (max). Resume or discard one before starting a new campaign." Geen "Start new" optie zichtbaar.

**Nieuwe modal: `DraftPickerModal.tsx`**

Toont alle drafts + "Start fresh" knop (als < 5). Klik op draft → `loadDraft()` + navigate naar wizard. Klik op "Start fresh" → `resetWizard()` + navigate naar wizard.

### Resume flow detail

```ts
async function handleResumeDraft(draftId: string) {
  const data = await fetchDraft(draftId);  // GET /drafts/:id
  useCampaignWizardStore.getState().loadDraft({
    campaignId: data.campaignId,
    wizardState: data.wizardState,
    wizardStep: data.wizardStep,
  });
  onNavigate('campaign-wizard');
}
```

`loadDraft()` MOET de Fase 1 persisted state respecteren. Het mag niet de huidige in-progress wizard van een andere draft overschrijven zonder gebruiker confirmation. Als de gebruiker al een andere draft open heeft (`draftCampaignId !== null && draftCampaignId !== newId`), tonen we een waarschuwing.

### Verificatie

- 0 drafts → "New Campaign" → fresh wizard direct
- 2 drafts → "New Campaign" → modal toont 2 drafts + "Start new" optie
- 5 drafts → "New Campaign" → modal toont 5 drafts, geen "Start new" optie, alleen Resume of Archive
- Resume klik → wizard opent op juiste stap met juiste data
- Archive klik → soft delete (PATCH met `isArchived: true`), draft verdwijnt uit DraftCampaignsList, badge counter daalt
- Verifieer in Archived view (`?isArchived=true` filter): gearchiveerde draft is daar zichtbaar
- Vanuit Archived view: hard delete via bestaande DELETE → draft definitief weg
- Vanuit Archived view: Unarchive → draft komt terug in DraftCampaignsList
- Launch een draft → verdwijnt uit drafts lijst, verschijnt in active campaigns, **één** Campaign DB rij (geen duplicaat)

### Done criterium

- Alle 4 scenarios (0/1-4/5/launch) werken end-to-end
- Geen UI flicker bij resume (data laadt vóór navigate)
- DraftCampaignsList is responsive en tonable in beide grid en list views

---

## Stap 5 — Review + Cleanup + Documentatie

### Code review

Per CLAUDE.md gebruikelijke patroon: **2 rondes met 2 onafhankelijke review-agents**. Per ronde scannen ze:
- Stap 1: schema sanity, foreign key cascade behavior, index efficiëntie
- Stap 2: Zod validation completeness, ownership checks op alle 5 endpoints, cache invalidation, error responses
- Stap 3: Race conditions in auto-save, AbortController cleanup, debounce timing, SSE milestone wiring
- Stap 4: Modal accessibility, empty/loading/error states, race tussen resume + auto-save

Verwachte vondsten (uit ervaring):
- Vergeten cache invalidation op een PATCH route
- AbortController niet gecleaned op unmount
- Stale closure in een useEffect-binnen-callback
- Modal niet keyboard-navigeerbaar
- Race wanneer twee tabs dezelfde draft openen

### Cleanup

- Verwijder de oude `DraftCampaignBanner` component (regel 130-176 in `ActiveCampaignsPage.tsx`)
- Verwijder eventuele dead code in `useCampaignWizardStore` die we niet meer gebruiken

### Documentatie

- **CLAUDE.md update**: Sectie "Werkende routes" uitbreiden met de 5 nieuwe wizard/drafts endpoints. Sectie "Sidebar Section IDs" onveranderd. Status entry toevoegen aan "AFGEROND" lijst (entry #194 of hoger): `194. CDR: Campaign Drafts (DB-backed) — compleet`
- **gotchas.md**: Lessen die we onderweg leren toevoegen (bijv. als we ergens een edge case raken)
- Dit `IMPLEMENTATIEPLAN-CAMPAIGN-DRAFTS.md` bestand kan blijven staan als historisch artefact, of na voltooiing verplaatst naar `docs/`

### Manual test scenario (end-to-end)

1. Login als Erik in workspace "Branddock Demo"
2. Active Campaigns → 0 drafts → "New Campaign" → wizard opent
3. Stap 1 invullen, naar stap 2 → DB rij verschijnt (verifieer via psql)
4. Stap 2 knowledge selecteren, save indicator toont "Saving..." → "Saved"
5. Page hard refresh → wizard sluit, dashboard opent
6. Naar Active Campaigns → DraftCampaignsList toont 1 draft "Step 2 of 6 (Knowledge)"
7. Continue → wizard opent op stap 2 met geselecteerde knowledge
8. Door naar stap 3 (Strategy), generate foundation, wacht tot complete
9. Door naar stap 4 (Concept), start insight mining
10. **Refresh tijdens mining_insights** → wizard opent op rationale_complete (Fase 1 recovery)
11. Insights opnieuw genereren, voltooien
12. Refresh → bevestigd: insights staan er nog (uit DB + localStorage)
13. Concept selecteren, build strategy, elaborate, naar stap 6 Review
14. Launch → success modal, navigatie naar campaign detail
15. psql check: één Campaign rij met `status: ACTIVE`, `wizardState: NULL`, correcte slug uit naam
16. Active Campaigns → campaign verschijnt, geen draft meer
17. Open een tweede browser (Incognito) → login als Erik
18. DraftCampaignsList → leeg ✓ (de gelaunchte draft is geen draft meer)
19. Maak 5 nieuwe drafts → 6e poging → "Max drafts reached" modal
20. Archive één draft → DraftCampaignsList toont 4 drafts → 6e draft kan nu wel
21. Open Archived view (`?isArchived=true`) → gearchiveerde draft zichtbaar daar
22. Klik Unarchive op gearchiveerde draft → komt terug in DraftCampaignsList als 5e
23. Archive opnieuw → daarna hard delete vanuit Archived view → DB row weg, geen restore mogelijk

### Done criterium

- Alle 19 manual test stappen slagen
- 0 nieuwe TS errors
- Geen openstaande review issues
- CLAUDE.md bijgewerkt
- Eén nieuwe entry in AFGEROND lijst

---

## Risico's & Open Vragen

### Risico's

1. **`wizardState` JSON-veld grootte**: een complete Concept-stap state met 3 insights + 3 concepts + synthesized strategy + architecture + elaborateResult kan ~200-500KB zijn. Postgres `JSONB` aankan tot ~1GB per veld, dus geen technische limiet, maar:
   - Mitigation: meten in stap 3 met een test wizard. Als > 500KB → overweeg om `concepts/insights/synthesizedStrategy` als losse Json velden op Campaign te zetten i.p.v. één grote `wizardState`. Dit is een implementatiedetail, blokkeert het plan niet.
2. **Auto-save spam tijdens snel typen**: debounce van 1500ms zou voldoende moeten zijn, maar als gebruiker traag typt en elke 2s een save triggert kan het rumoerig worden in Network tab. Niet schadelijk, wel cosmetisch.
3. **localStorage + DB out-of-sync**: Fase 1 schrijft naar localStorage, Fase 2 schrijft naar DB. Als één faalt en de ander niet, krijgt de gebruiker mogelijk verschillende state op verschillende devices. Mitigation: bij draft Resume altijd uit DB laden (DB is source of truth). localStorage is alleen optimistic cache.
4. **Multi-user agency edge case**: User A maakt draft → User A wordt verwijderd uit workspace → draft is "wees". `wizardOwnerId` heeft `onDelete: SetNull`, dus de draft blijft bestaan met `wizardOwnerId: null`. Niemand kan hem nog bewerken. Niet ideaal, maar geen data verlies. Cleanup script later.
5. **Bestaande wizards in dev**: ontwikkelaars (= jij) hebben mogelijk localStorage state uit Fase 1 met `draftCampaignId: null`. Bij eerste reload na Fase 2 deploy verschijnt geen DB-draft. Geen probleem — bij volgende stap-transitie wordt draft alsnog aangemaakt.

### Open vragen voor mij om te beantwoorden tijdens implementatie

- **Save indicator positie**: in WizardStepper of in een sticky footer? Ik kies tijdens stap 4 op basis van wat het minst stoort.
- **DraftPickerModal styling**: hergebruik van bestaande Modal primitive of custom layout? Ik kies bestaande Modal voor consistency.
- **Draft naam fallback**: "Untitled draft" of `Draft from {date}` of `New campaign #{count}`? Ik ga voor "Untitled draft" en de gebruiker kan het direct in stap 1 wijzigen.

### Vragen voor jou (Erik) vóór ik begin

1. ✅ Aannames bevestigd 2026-04-10 (zie sectie bovenaan).
2. Wil je dat ik dit als één commit per sessie (3 commits) doe, of één grote commit per stap (5 commits)?
3. ✅ Akkoord op kleine bugfixes in aangrenzende code (bevestigd 2026-04-10).

---

## Bestandsoverzicht (verwacht)

**Nieuwe bestanden** (~8):
- `src/app/api/campaigns/wizard/drafts/route.ts` (POST + GET)
- `src/app/api/campaigns/wizard/drafts/[id]/route.ts` (GET + PATCH + DELETE)
- `src/features/campaigns/hooks/useDraftAutoSave.ts`
- `src/features/campaigns/hooks/useDraftCampaigns.ts` (TanStack Query)
- `src/features/campaigns/components/overview/DraftCampaignsList.tsx`
- `src/features/campaigns/components/overview/DraftPickerModal.tsx`
- `src/features/campaigns/components/wizard/DraftSaveIndicator.tsx`
- `src/features/campaigns/api/drafts.api.ts`

**Gewijzigde bestanden** (~7):
- `prisma/schema.prisma`
- `src/features/campaigns/stores/useCampaignWizardStore.ts` (draftCampaignId state + loadDraft action + partialize update)
- `src/features/campaigns/components/wizard/CampaignWizardPage.tsx` (useDraftAutoSave wiring + DraftSaveIndicator)
- `src/features/campaigns/components/overview/ActiveCampaignsPage.tsx` (DraftCampaignsList integratie + New Campaign modal)
- `src/app/api/campaigns/wizard/launch/route.ts` (draftCampaignId promotion)
- `src/app/api/campaigns/route.ts` (DRAFT filter)
- `CLAUDE.md` (route docs + AFGEROND entry)

**Verwijderde code** (~50 regels):
- `DraftCampaignBanner` component in `ActiveCampaignsPage.tsx` (regel 130-176)

---

## Geschatte effort

Niet in tijd uitgedrukt (per CLAUDE.md), maar in stap-complexiteit:

| Stap | Complexiteit | Risico |
|------|--------------|--------|
| 1 — Schema | Laag | Laag (alleen nullable additions) |
| 2 — API endpoints | Gemiddeld | Gemiddeld (5 endpoints, ownership/limit checks) |
| 3 — Store + auto-save | Hoog | Hoog (debounce + race conditions + SSE wiring) |
| 4 — UI | Gemiddeld | Laag (componentenwerk) |
| 5 — Review + docs | Laag | Laag (zelfde patroon als altijd) |

Stap 3 is de meest risicovolle. Ik wil daar extra zorgvuldig zijn met de AbortController patterns en de debounce.

---

## Volgorde-keuze

Ik wil voorstellen om **stap 1 + 2 in één werksessie** te doen (schema + endpoints zijn nauw gekoppeld en goed te testen met curl), dan **stap 3 in een aparte sessie** (vereist veel UI-testen), dan **stap 4 + 5 in een derde sessie**.

Tussen elke sessie kan jij valideren dat het werkt voordat we doorgaan. Akkoord?
