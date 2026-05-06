# FIDELITY-CRITERIA-AUDIT.md

> Audit-input voor de content-strategy sessie. Inventariseert bestaande
> `qualityCriteria` in `src/features/campaigns/lib/deliverable-types.ts`
> en levert pillar-mapping-voorstellen + gap-analyse. Geen ontwerp.
>
> Laatst bijgewerkt: 5 mei 2026 [EJ]

---

## SAMENVATTING IN ÉÉN PARAGRAAF

Branddock heeft sinds CLAUDE.md item 155 een gewogen `qualityCriteria`-systeem op alle 53 content-types in `deliverable-types.ts`. Per type zijn er **5 criteria** (niet 6 zoals de leerlus-spec suggereert), gewogen tot 1.0, met `name` + `weight` + `description`. De criteria zijn georganiseerd via 8 categorie-defaults (`LONG_FORM_DEFAULTS`, `SOCIAL_MEDIA_DEFAULTS`, etc.) plus 4 type-specifieke overrides (LinkedIn-set, linkedin-ad, tiktok-script, faq-page). Patroon-analyse onthult 8 terugkerende criterion-thema's die zich logisch laten clusteren in 3 pillars. Belangrijkste vondsten: (1) currente shape is 5-niet-6 — beslis-moment voor de sessie; (2) defaults zijn op categorie-niveau, slechts 4 type-overrides — keep-as-is is verdedigbaar; (3) significante gaps in wat de leerlus zou willen meten (behavioral-science, originality, evidence-strength, concept-fidelity).

---

## 1. INVENTARIS: 53 TYPES × 5 CRITERIA-SETS

### Categorie-defaults (8 sets, dekken 47 van 53 types)

| Categorie | # types | Criterion 1 | Criterion 2 | Criterion 3 | Criterion 4 | Criterion 5 |
|---|---|---|---|---|---|---|
| Long-Form Content | 7 | SEO Optimization (0.25) | Brand Alignment (0.20) | Readability (0.20) | Engagement (0.20) | Structure (0.15) |
| Social Media | 5* | Visual-Text Synergy (0.25) | Engagement Hooks (0.25) | Brand Voice (0.20) | Platform Fit (0.20) | Accessibility (0.10) |
| Advertising & Paid | 6 | Conversion Focus (0.30) | Brand Alignment (0.20) | Platform Compliance (0.20) | Targeting Precision (0.15) | Creative Impact (0.15) |
| Email & Automation | 5 | Subject Line (0.25) | Brand Voice (0.20) | Conversion Path (0.20) | Readability (0.20) | Deliverability (0.15) |
| Website & Landing Pages | 4† | Conversion Optimization (0.25) | SEO (0.20) | Brand Alignment (0.20) | User Experience (0.20) | Persuasion (0.15) |
| Video & Audio | 5 | Hook Strength (0.25) | Narrative Flow (0.25) | Brand Integration (0.20) | CTA Effectiveness (0.15) | Production Readiness (0.15) |
| Sales Enablement | 4 | Value Proposition (0.25) | Brand Alignment (0.20) | Persuasion Structure (0.20) | Actionability (0.20) | Visual Readiness (0.15) |
| PR, HR & Communications | 8 | Message Clarity (0.25) | Brand Voice (0.20) | Audience Fit (0.20) | Credibility (0.20) | Structure (0.15) |

\* Social Media-default wordt gebruikt door 5 types (instagram-post, twitter-thread, facebook-post, social-carousel, linkedin-article erft van LONG_FORM in plaats); de andere 8 LinkedIn-types gebruiken LINKEDIN-set.
† Website-default wordt gebruikt door 4 types; faq-page heeft eigen set.

### Type-specifieke overrides (4 types met eigen criteria)

| Type | Override | Criteria |
|---|---|---|
| `linkedin-carousel`, `linkedin-newsletter`, `linkedin-video`, `linkedin-event`, `linkedin-poll` (5 types) | `LINKEDIN_DEFAULTS` | Professional Tone (0.25), Platform Fit (0.25), Engagement Hooks (0.20), Brand Voice (0.20), Accessibility (0.10) |
| `linkedin-ad` | inline | Conversion Focus (0.30), Professional Tone (0.25), Platform Compliance (0.20), Targeting Precision (0.15), Creative Impact (0.10) |
| `tiktok-script` | inline | Hook Strength (0.30), Trend Alignment (0.25), Brand Voice (0.20), CTA Clarity (0.15), Replay Value (0.10) |
| `faq-page` | inline | Answer Quality (0.25), SEO (0.25), Brand Voice (0.20), Scanability (0.15), Completeness (0.15) |

### Coverage-statistiek

- 47 types via category-defaults
- 5 types via LINKEDIN-set
- 1 type per inline-override (3 types)
- Total: 53 types, 12 unieke criteria-sets in de codebase

### Belangrijke vondst: 5-niet-6

Huidige shape is **5 criteria per type**. Leerlus-beslissing 3 (sessie 2) sprak van "6 sub-criteria". Dit is een **keuze-moment voor de sessie**:
- (a) 5 → 6: voeg een 6e dimensie toe aan elke set (uniformeer of voeg type-specifiek toe)
- (b) 6 → 5: pas leerlus-spec aan naar 5 sub-criteria + 3 pillars (eenvoudiger migratie, behoudt bestaande weights)
- (c) Hybride: 5 als minimum, sommige types krijgen 6 (zoals linkedin-poll vs blog-post)

---

## 2. PATROON-ANALYSE: 8 TERUGKERENDE CRITERION-THEMA'S

Cross-categorie clustering van wat criteria meten:

| Thema | Verschijnt als | In categorieën |
|---|---|---|
| **A. Merk-trouw** | Brand Alignment / Brand Voice / Brand Integration | Long-Form, Social, Email, Advertising, Website, Sales, PR/HR, Video — overal |
| **B. Doelgroep-pasvorm** | Platform Fit / Audience Fit / Targeting Precision / Accessibility / Trend Alignment | Social, LinkedIn, Advertising, PR/HR, TikTok |
| **C. Aandacht-trekken** | Engagement / Engagement Hooks / Hook Strength | Long-Form, Social, LinkedIn, Video, TikTok |
| **D. Conversie-mechaniek** | Conversion Focus / Conversion Path / Conversion Optimization / Value Proposition / CTA Effectiveness | Advertising, Email, Website, Sales, Video, TikTok |
| **E. Leesbaarheid & structuur** | Readability / Structure / Scanability / User Experience / Narrative Flow | Long-Form, Email, PR/HR, Website, Video, FAQ |
| **F. Technische uitvoering** | SEO / Deliverability / Production Readiness / Visual Readiness / Visual-Text Synergy / Platform Compliance | Long-Form, Email, Video, Sales, Social, Advertising, Website, FAQ |
| **G. Geloofwaardigheid** | Credibility / Persuasion / Persuasion Structure / Answer Quality | PR/HR, Website, Sales, FAQ |
| **H. Onderscheidend vermogen** | Creative Impact / Replay Value / Trend Alignment / Subject Line / Message Clarity | Advertising, TikTok, Email, PR/HR |

**Observatie:** thema A (merk-trouw) en thema D (conversie) komen in alle of bijna alle categorieën voor. Thema B (doelgroep), E (leesbaarheid) en F (uitvoering) zijn ook zeer breed gedragen. Thema's C, G, H zijn vaker categorie-specifiek.

---

## 3. CLUSTER-VOORSTEL: 8 CATEGORIEËN

Per categorie: gemeenschappelijke deler met andere categorieën + uniek karakter.

| Categorie | Gemeenschappelijk met | Uniek |
|---|---|---|
| Long-Form Content | Email (Readability), Website (SEO, Brand Alignment), PR/HR (Structure) | Engagement als first-class criterion |
| Social Media | LinkedIn (Engagement Hooks, Brand Voice, Accessibility), Video (Hook Strength) | Visual-Text Synergy — uniek; Platform Fit zwaarder |
| Advertising & Paid | Sales (Value Proposition), Email (Conversion Path), LinkedIn-ad (eigen) | Conversion Focus zwaarste gewicht (0.30); Platform Compliance |
| Email & Automation | Long-Form (Readability), Advertising (Conversion Path) | Subject Line als first-class; Deliverability als technisch criterion |
| Website & Landing Pages | Long-Form (SEO, Brand Alignment), Sales (Persuasion) | User Experience als criterion; Conversion Optimization |
| Video & Audio | Social/LinkedIn (Hook Strength), Sales (Visual Readiness) | Narrative Flow; Production Readiness |
| Sales Enablement | Long-Form (Persuasion), Website (Persuasion), Advertising (Value Prop) | Actionability als criterion; Visual Readiness |
| PR, HR & Communications | Long-Form (Structure, Brand Alignment) | Message Clarity (vervangt Conversion); Credibility; Audience Fit |

**Outliers worth flagging voor de sessie:**

1. **`linkedin-ad`** — ligt categorisch onder Social Media maar gebruikt Advertising-stijl criteria. Brug-type. Voorstel sessie: keep-as-is of bouw "social-ads" als sub-categorie.
2. **`faq-page`** — eigen criteria-set met "Answer Quality" en "Completeness". Specifieke content-format eis. Behouden als override.
3. **`tiktok-script`** — eigen set met "Trend Alignment" en "Replay Value". Reflecteert short-form video specifics. Behouden.
4. **Long-Form 7 types** (blog-post, pillar-page, whitepaper, case-study, ebook, article, thought-leadership) — gebruiken **identieke** criteria. Differentieert niet tussen reader-intent. Sessie-vraag: te grof?
5. **Email 5 types** — alle met identieke EMAIL-set behalve subject-line die generiek is. Newsletter ≠ welcome ≠ re-engagement, mogelijk te grof.

---

## 4. PILLAR-MAPPING VOORSTELLEN (3 ALTERNATIEVEN)

Drie kandidaat-pillar-sets, elk met mapping van de 8 thema's. **Geen aanbeveling — keuze voor de sessie.**

### Optie 1 — `brand` / `audience` / `craft`

| Pillar | Definitie | Welke thema's |
|---|---|---|
| **brand** | Reflecteert dit content de merk-strategie en stem? | A. Merk-trouw, gedeelde Conversion-elementen die brand-promise vertegenwoordigen |
| **audience** | Wordt de doelgroep raak geraakt en bereikt? | B. Doelgroep-pasvorm, C. Aandacht-trekken (hooks zijn doelgroep-gericht) |
| **craft** | Is dit goed uitgevoerd, technisch en structureel? | D. Conversie-mechaniek, E. Leesbaarheid & structuur, F. Technische uitvoering, G. Geloofwaardigheid, H. Onderscheidend vermogen |

Voordeel: kort, vertaalbaar, intuïtief. Nadeel: `craft` wordt zwaar (5 van 8 thema's) — onbalans.

### Optie 2 — `merk` / `persona-fit` / `vakmanschap` (Nederlandstalig)

Identieke groepering als Optie 1, andere namen. Voordeel: aansluit bij Branddock-jargon. Nadeel: codering wordt mengeling (codebase is Engels per CLAUDE.md). Niet aan te raden.

### Optie 3 — `strategic` / `audience` / `execution`

| Pillar | Definitie | Welke thema's |
|---|---|---|
| **strategic** | Dient deze content de campagne/merkstrategie? | A. Merk-trouw, D. Conversie-mechaniek, H. Onderscheidend vermogen (concept-fidelity) |
| **audience** | Wordt de doelgroep raak geraakt en geëngaged? | B. Doelgroep-pasvorm, C. Aandacht-trekken |
| **execution** | Is dit ambachtelijk goed uitgevoerd? | E. Leesbaarheid & structuur, F. Technische uitvoering, G. Geloofwaardigheid |

Voordeel: betere balans (3-2-3 thema-verdeling). `strategic` vangt expliciet "is dit de juiste content-keuze" naast brand-trouw. Nadeel: minder kort dan Optie 1.

### Vergelijking 3-pillar mapping

| Thema | Optie 1 | Optie 3 |
|---|---|---|
| A. Merk-trouw | brand | strategic |
| B. Doelgroep-pasvorm | audience | audience |
| C. Aandacht-trekken | audience | audience |
| D. Conversie-mechaniek | craft | strategic |
| E. Leesbaarheid & structuur | craft | execution |
| F. Technische uitvoering | craft | execution |
| G. Geloofwaardigheid | craft | execution |
| H. Onderscheidend vermogen | craft | strategic |

---

## 5. GAP-ANALYSE

Wat de leerlus zou willen meten dat **niet** in huidige `qualityCriteria` zit:

### G1. Behavioral-science applicatie
Branddock heeft uitgebreide BCT/Cialdini/IPA/Byron Sharp/Kahneman-infrastructuur (CLAUDE.md item 146 MFE). Geen van de huidige criteria meet of content deze frameworks toepast (bijv. "gebruikt deze ad een Cialdini-principe?"). Voor leerlus jaar 2 cross-klant patronen relevant.

### G2. Concept-fidelity (post-CQP werk)
Sinds CQP (CLAUDE.md item 170) genereert Branddock content concept-led. Maar er is geen criterion dat meet "blijft deze content trouw aan het strategisch concept dat in Concept-step werd gekozen?" — alleen brand-fidelity (G1) niet hetzelfde als concept-fidelity.

### G3. Originaliteit / freshness
EFFIE-werk (CLAUDE.md item 141) emphasizes originaliteit. Geen criterion meet "is dit generiek AI-output of distinctief?" Sub-vraag: kan deterministisch (n-gram-match tegen training-corpus) of alleen AI-judge?

### G4. Persona semantic fit
"Audience Fit" en "Targeting Precision" bestaan, maar geen criterion meet expliciet "matcht deze content de pain-points / behaviors / triggers van de doel-persona?" — vereist persona-data-injectie in scoring.

### G5. Evidence-strength
Long-form en PR hebben "Engagement" / "Credibility" als impliciete proxies, maar geen first-class meting van "hoeveel proof-points / data / examples staan erin?" Vergelijkbaar met `DetectedTrend.evidenceStrength` (deterministisch berekenbaar).

### G6. Constraint-compliance als sub-criterion
Char-limits, hashtag-limits, required-sections zijn nu in `constraints` field (separate gate, niet score). Sessie-vraag: **promoteer naar 6e sub-criterion** (deterministic source) of houden als binary gate naast scoring?

### G7. Memorability / stickiness
TikTok heeft "Replay Value", anderen niet. SUCCESs-framework (Heath & Heath) uit CQP-werk is ongebruikt voor scoring. Sessie-vraag: maak universeel of alleen voor specifieke types?

### G8. Visual-coherence (multimodal)
"Visual-Text Synergy" bestaat voor Social Media en "Visual Readiness" voor Sales — maar er is geen meting van of de gegenereerde **beelden** zelf merk-coherent zijn. Met canvas-orchestrator beelden genereert (DALL-E 3, Imagen 4, etc.) is dit een gat.

### Gap-impact-matrix

| Gap | Impact leerlus jaar 1 | Impact jaar 2 cross-klant | Implementatie-kost |
|---|---|---|---|
| G1 Behavioral-science | Medium | **Hoog** | AI-judge, hoog |
| G2 Concept-fidelity | **Hoog** | Hoog | AI-judge, medium |
| G3 Originaliteit | Medium | **Hoog** | AI-judge, hoog |
| G4 Persona-fit | **Hoog** | **Hoog** | AI-judge, medium |
| G5 Evidence-strength | Medium | Medium | Deterministic, laag |
| G6 Constraint-compliance | Hoog | Laag | Deterministic, **al aanwezig** |
| G7 Memorability | Laag | Medium | AI-judge, medium |
| G8 Visual-coherence | Medium | Medium | AI-judge multimodal, hoog |

---

## 6. OPEN BESLIS-VRAGEN VOOR DE SESSIE

In aflopende belangrijkheid:

1. **5 of 6 sub-criteria?** Currente realiteit is 5; leerlus-spec sprak van 6. Beslis-moment.
2. **Welke 3 pillar-namen?** Optie 1 (`brand`/`audience`/`craft`) of Optie 3 (`strategic`/`audience`/`execution`)? Of derde variant.
3. **Defaults op categorie- of type-niveau?** Huidige hybride (8 categorie-defaults + 4 type-overrides) keep-as-is, of differentiëren (bijv. blog-post ≠ thought-leadership)?
4. **Welke gaps committeren we voor v1?** G1-G8 ranked op leerlus-impact. Welke nu, welke later? Aanbeveling: G2 (concept-fidelity) en G4 (persona-fit) zijn jaar 1 hoog-impact.
5. **Constraint-compliance als sub-criterion of als gate?** G6-vraag. Promoteer of houd separaat.
6. **Source-tag per sub-criterion vergrendelen?** Per sub-criterion: deterministic / ai-judge / human. Veel huidige criteria zijn ambigu (bijv. "Brand Voice" — kan beide).
7. **Threshold per content-type vergrendelen?** Welk composite-niveau is "publishable" per categorie? Eén universeel of per type variabel?
8. **Long-Form 7 types differentiëren?** Currentie behandelt blog-post identiek aan whitepaper. Te grof voor leerlus?
9. **Email 5 types differentiëren?** Currentie behandelt newsletter identiek aan re-engagement. Te grof?
10. **Pillar-weights per content-type variabel?** Bijv. Advertising types laten `strategic` zwaarder wegen, Email types laten `execution` zwaarder wegen.

---

## 7. VOORLOPIGE OBSERVATIES

- **De huidige `qualityCriteria`-infrastructuur is goed onderbouwd.** S7-REST (CLAUDE.md item 155) heeft serieus werk verricht. De sessie kan grotendeels REFINEMENT zijn, niet GREENFIELD.
- **5 → 6 sub-criteria is een schrijfwerk, geen architectuur-werk.** Migratie-pad is clean: voeg de 6e dimensie toe aan elke set. Belangrijkste vraag: WELKE 6e dimensie levert het meeste leerlus-signaal?
- **Pillar-mapping is grotendeels al impliciet aanwezig** in de bestaande criteria. Sessie maakt het expliciet en queryable.
- **De grootste gaps (G2, G4) zijn jaar-1 leerlus-kritiek.** Zonder concept-fidelity en persona-fit als first-class meting kan de leerlus geen onderscheid maken tussen "AI gehoorzaamde de brief" en "AI miste het concept".
- **Cross-categorie consistentie ontbreekt soms** (bijv. "Brand Voice" in 5 sets, "Brand Alignment" in 5 sets — overlappen of verschillen ze?). Sessie kan canoniseren.

---

## RELATIE TOT ANDERE DOCUMENTEN

| Document | Rol |
|---|---|
| `branddock-learning-loop-decisions.md` (memory) | Beslissing 3: ContentFidelityScore-architectuur die deze criteria invult |
| `IMPLEMENTATIEPLAN-LEARNING-LOOP.md` | Fase 4 wacht op v1-criteria uit deze sessie |
| `IMPLEMENTATIEPLAN-FIDELITY-CRITERIA.md` (op te zetten) | Sessie-plan, output-doc met definitieve mappings |
| `src/features/campaigns/lib/deliverable-types.ts` | Bestaande qualityCriteria — bron van inventaris |
| `src/lib/studio/prompt-templates/*.ts` | Prompt-templates per type, bevatten implicit kwaliteits-eisen die mogelijk in nieuwe criteria moeten landen |

---

*Audit-output. Geen ontwerp. Voer de content-strategy sessie met deze input.*
