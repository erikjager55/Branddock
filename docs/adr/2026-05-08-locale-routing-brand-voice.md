---
id: 2026-05-08-locale-routing-brand-voice
title: Per-brand locale-routing via BrandVoiceguide.contentLocale voor heuristiek-pakket-selectie
status: accepted
date: 2026-05-08
supersedes: -
superseded-by: -
---

# Context

Branddock ondersteunt vandaag `Workspace.contentLanguage` (default `en`, mogelijke waarden: `en` / `nl` / `de` / `fr` / `es` / `pt` / `it`). `BrandVoiceguide`-model heeft géén locale-veld; gebruikt impliciet de workspace-waarde wanneer een AI-prompt-builder daarom vraagt. Pre-launch programma "Brand Control Program" (zie `tasks/_drafts/idea-brand-control-program.md`) introduceert heuristiek-pakketten in vier locales — `nl-NL` / `nl-BE` / `en-GB` / `de-DE` — die F-VAL Pijler 3 (rules 20%) verrijken met taal-specifieke woordlijsten voor corporate-fluff, superlatieven, vulwoorden, vage-kwaliteitsclaims en risky-comparatives.

Online research deze sessie identificeerde substantiële verschillen tussen `nl-NL` en `nl-BE` die pure ISO-639-1 'nl'-routing onvoldoende maken:

- **Aanspreekvorm-default**: BE = `u`-form in zakelijke copy, NL = `je`-form. Een BE-tekst die `je` gebruikt moet flag krijgen; een NL-tekst die `je` gebruikt niet
- **16 NL-woorden whitelisted in BE**: `job` / `onthaal` / `verlof` / `dossier` / `kinesist` / `hospitalisatie` / `werf` / `zetel` / `schepen` / `immo` / `camion` / `fusioneren` / `syndicaat` / `technieker` / `domiciliëring` / `kader` zijn formeel correct in BE — flagging in BE produceert false-positives die het tool-vertrouwen breken
- **BE-specifieke fluff**: "familiale sfeer", "marktconform salaris", "stressbestendig" — niet aanwezig in NL-pakket
- **BE-intensifiers**: `straf`, `machtig` als evidence-eisende superlatieven (niet in NL-pakket)
- **NL-jargon dat in BE extra fout aanvoelt**: `pinpas` / `tosti` / `gaaf` / `cool` / `leuk` als Hollands-informele intensifiers — andere severity-classificatie dan in NL-tekst

Constraint 1 — **agency-tenant multi-brand**: één Branddock-workspace kan meerdere brands beheren in agency-modus. Locale-routing op workspace-niveau breekt dat: een agency-workspace met Better Brands (NL-NL) plus een hypothetische BE-klant zou beide brands hetzelfde heuristiek-pakket geven. Locale moet daarom per-brand zijn — concreet: per `BrandVoiceguide`.

Constraint 2 — **F-VAL Pijler 3 runtime resolution**: ADR `2026-05-08-fval-output-schema-bevindingen` introduceert `BrandReviewFinding`-model dat findings produceert via Pijler 3 rules. `fidelity-rules.ts` + `BrandRule`-tabel moeten runtime weten welk taal-pakket te gebruiken bij rule-resolution per content-review. Dit vereist een resolver-functie die brand → locale → pakket mapt zonder roundtrip per rule-evaluatie.

Constraint 3 — **methodology hard-switch principe**: research-conclusie was expliciet "BE-mode flagt anders dan NL-mode; geen gedeelde lijst". Pakketten als union mergen (NL-all = NL-NL ∪ NL-BE) zou false-positives produceren afhankelijk van merge-volgorde. Tool-vertrouwen valt om bij eerste valse positief op `job` of `onthaal`.

# Decision

Wij voegen een nieuw optioneel veld `BrandVoiceguide.contentLocale` toe (IETF BCP 47 formaat: `nl-NL` / `nl-BE` / `en-GB` / `de-DE`) als source-of-truth voor heuristiek-pakket-selectie. Wanneer dit veld `null` is, valt het systeem terug op `Workspace.contentLanguage` via een mapping-tabel naar default-locales (`en` → `en-GB`, `nl` → `nl-NL`, `de` → `de-DE`). Definitieve fallback is `en-GB`.

Heuristiek-pakketten worden geregistreerd in `src/lib/brand-fidelity/heuristics/index.ts` per locale-key. `nl-BE` importeert `nl-NL` base programmatisch (en past whitelist + extra-flags toe), maar exporteert het resultaat als één bevroren unit — consumers zien geen union, alleen het hard-switch eindpakket. Een `getHeuristicsForBrand(workspaceId)` resolver levert F-VAL Pijler 3 (en alle toekomstige consumers) het juiste pakket per call.

## Schema-shape

```prisma
model BrandVoiceguide {
  // ... bestaande velden
  contentLocale String? // IETF BCP 47: 'nl-NL' / 'nl-BE' / 'en-GB' / 'de-DE'. null = workspace-fallback.
}
```

## Resolver-pseudocode

```ts
// src/lib/brand-fidelity/heuristics/locale-resolver.ts
export async function resolveLocaleForBrand(workspaceId: string): Promise<Locale> {
  const voiceguide = await prisma.brandVoiceguide.findUnique({
    where: { workspaceId },
    select: { contentLocale: true },
  });
  if (voiceguide?.contentLocale) return voiceguide.contentLocale as Locale;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { contentLanguage: true },
  });
  const lang = workspace?.contentLanguage ?? 'en';

  const defaultLocaleByLang: Record<string, Locale> = {
    en: 'en-GB',
    nl: 'nl-NL',
    de: 'de-DE',
    // fr/es/pt/it niet ondersteund in v1 — fallback 'en-GB'
  };
  return defaultLocaleByLang[lang] ?? 'en-GB';
}

// src/lib/brand-fidelity/heuristics/index.ts
const REGISTRY: Record<Locale, HeuristicPackage> = {
  'nl-NL': nlNLPackage,
  'nl-BE': buildNlBE(nlNLPackage), // extends + whitelist + extra-flags, returns frozen unit
  'en-GB': enGBPackage,
  'de-DE': deDEPackage,
};

export function getHeuristicsForLocale(locale: Locale): HeuristicPackage {
  return REGISTRY[locale]; // hard-switch — geen union, geen merge
}
```

# Y-statement

In de context van **Branddock's multi-brand multi-tenant architectuur waar één agency-workspace meerdere brands met verschillende talen+regio's kan beheren én een methodology-eis dat heuristiek-pakketten als hard-switch units werken**, facing **substantiële NL-NL/NL-BE divergentie (16 NL-woorden whitelisted in BE, andere u/je-default, BE-specifieke fluff/intensifiers) waarvoor pure ISO-639-1 routing onvoldoende is**, I decided **een optioneel `BrandVoiceguide.contentLocale`-veld in IETF BCP 47-formaat toe te voegen als source-of-truth, met workspace-fallback via mapping en `nl-BE` als programmatisch-extends-NL-NL-maar-bevroren-unit** to achieve **per-brand locale-granulariteit zonder breaking change voor bestaande workspaces, future-proof voor Channel Activation (LinkedIn-NL vs LinkedIn-BE), en false-positive-vrije heuristiek-routing**, accepting tradeoff **een additieve schema-migratie en de complexiteit dat de heuristiek-loader `nl-BE` programmatisch moet bouwen uit `nl-NL` base + whitelist + extra-flags terwijl het resultaat als één bevroren unit wordt geconsumeerd**.

# Consequences

## Positief
- **Per-brand granulariteit**: agency-workspace met BB (`nl-NL`) + hypothetische BE-klant (`nl-BE`) krijgt elke brand het juiste pakket
- **Geen breaking change**: bestaande workspaces zonder voiceguide-locale vallen terug op workspace.contentLanguage; geen migratie-script nodig voor 7+ bestaande workspaces
- **Future-proof voor Channel Activation post-launch**: LinkedIn-NL en LinkedIn-BE accounts kunnen verschillende locales hebben binnen één brand wanneer dat ooit relevant wordt
- **Methodology-conform**: hard-switch principe gerespecteerd, geen union/merge die false-positives produceert
- **Auditeerbaar**: locale-keuze is expliciet in DB, niet runtime-detected — gebruiker kan zien en wijzigen welke locale een brand heeft
- **Δ-1 paste-in flexibiliteit**: in Phase 2 review-form kan user locale-override geven (default = brand-locale), nuttig voor audit-use-case waar paste-in een BE-klant-tekst is in een NL-brand-workspace
- **IETF BCP 47 standaard**: industrie-norm voor locale-tags; toekomstige uitbreidingen (`fr-BE`, `nl-SR`, `de-AT`, `de-CH`) zijn syntactisch consistent

## Negatief / tradeoffs
- **Extra veld op BrandVoiceguide** + één-veld migratie (laag risico, additief)
- **`nl-BE` extends-but-frozen complexiteit**: heuristiek-loader moet bij module-load `nl-BE` programmatisch bouwen uit `nl-NL` base + whitelist + extra-flags. Mitigatie: één-keer-aan-startup, gecached in registry-object, geen runtime-cost per review
- **Default-resolver-pad nodig**: drie-laag fallback (voiceguide → workspace → 'en-GB') vereist extra DB-query voor brands zonder voiceguide-locale (mitigatie: prefetch in `getBrandContext` 5-min-cache)
- **`fr` / `es` / `pt` / `it` workspaces vallen terug op `en-GB`** vóór heuristiek-pakketten voor die talen worden gebouwd (LATER-roadmap). Niet ideaal voor pilot-klanten in die talen, maar pragmatisch — BE/DE/EN/NL is huidige doelgroep

## Neutraal
- IETF BCP 47-formaat is informeel-bekend bij developers; geen training nodig
- Veld is `String?` ipv enum — laat toekomstige uitbreidingen zonder migratie toe (`fr-BE`, etc.). Validatie via Zod-schema in API-laag, niet via DB-constraint, om flexibiliteit te behouden
- `BrandVoiceguide.contentLocale` heeft geen relatie met andere multi-locale velden in de codebase — terminologisch consistent met IETF-norm

# Alternatives considered

- **Alt A — Uitbreiden `Workspace.contentLanguage` enum naar inclusief `nl-BE` / `de-DE` / `en-GB`**: zou locale aan workspace-niveau koppelen. Afgewezen — agency-tenant-modus laat één workspace meerdere brands beheren met mogelijk verschillende locales (Better Brands NL-NL + hypothetische BE-klant in zelfde agency-workspace). Workspace-niveau-routing breekt dit fundamenteel. Bovendien: huidige workspace.contentLanguage wordt elders gebruikt voor UI-suggesties en AI-prompt-language, niet uitsluitend voor heuristiek; semantieke overload op één veld is anti-pattern.

- **Alt C — Aparte `LocalePreference` Prisma-model met FK naar BrandVoiceguide**: eigen tabel voor één veld. Afgewezen — single-veld-tabel is overhead zonder waarde; brand-niveau (BrandVoiceguide) is de logische plek voor brand-spec data. Zou wel zinvol zijn als locale meerdere velden zou hebben (bv. number-format-preference, date-format-preference) — niet het geval voor v1.

- **Alt D — Locale altijd uit voiceguide afleiden via embedding-detection of language-detection bij content-input**: geen DB-veld, runtime-detectie per content. Afgewezen om drie redenen: (1) onbetrouwbaar voor NL-NL/NL-BE-overlap — een BE-tekst kan over 100 woorden 'nl' tonen zonder genoeg BE-marker-woorden om gedetecteerd te worden; (2) runtime-cost per review (extra LLM-call of langdetect-library); (3) niet auditeerbaar door user — als detectie verkeerd locale picks, weet de gebruiker niet waarom en kan niet corrigeren.

- **Alt E — Pakketten als union mergen (`nl-all` = NL-NL ∪ NL-BE)**: heuristiek-loader merget alle nl-pakketten in één lijst. Afgewezen — de 16 NL-woorden die in BE expliciet whitelisted zijn (job/onthaal/verlof/etc.) zouden wel/niet flag krijgen afhankelijk van merge-volgorde; `straf`/`machtig` zouden in NL flag krijgen waar ze gewone Vlaamse intensifiers zijn die geen NL-rol spelen. Methodology-research-conclusie was expliciet "hard-switch, geen union". Tool-vertrouwen valt om bij eerste false-positive op een whitelist-woord.

# Notes

- **Cross-references**:
  - `tasks/_drafts/idea-brand-control-program.md` — programma-context, beslispunt 2 (pilot-rollout-volgorde) bevestigt `nl-NL` eerst, `nl-BE`/`de-DE` on-demand
  - ADR `2026-05-08-fval-output-schema-bevindingen` — output-schema dat findings produceert via locale-gerouteerde Pijler 3 rules
  - ADR `2026-05-06-brand-voice-extraction` — bestaande BV-WIRE architectuur waar `contentLocale` op aansluit

- **Migratie-pad**:
  1. Prisma-migration `add_brand_voiceguide_content_locale` (additief nullable veld, geen backfill)
  2. Phase 1 seed-script: bestaande Better Brands voiceguide krijgt expliciet `contentLocale: 'nl-NL'`
  3. Andere workspaces blijven null → workspace-fallback via resolver
  4. Phase 1 build van heuristiek-pakketten in `src/lib/brand-fidelity/heuristics/<locale>/`
  5. F-VAL Pijler 3 (`fidelity-rules.ts`) update: gebruik `getHeuristicsForBrand()` voor rule-resolution

- **Override-pad voor Δ-1 paste-in (Phase 2)**: review-form heeft optionele locale-dropdown (default = brand-locale uit resolver). Use-case: NL-brand-workspace user plakt een BE-klant-tekst in voor audit. UI toont brand-locale als default met override-mogelijkheid.

- **Validation strategie**: Zod-schema in API-laag valideert op IETF BCP 47-formaat (regex `^[a-z]{2}-[A-Z]{2}$`) en toegestane waarden (`nl-NL` / `nl-BE` / `en-GB` / `de-DE` v1). Onbekende locales → 400 error. Validation niet via DB-constraint om toekomstige toevoegingen zonder schema-migratie te ondersteunen.

- **Cache-discipline**: `getBrandContext(workspaceId)` heeft 5-min cache (CLAUDE.md AI calls sectie). Locale-resolver kan binnen die cache locale meeleveren — geen extra DB-roundtrip per review-call.

- **Out-of-scope voor deze ADR**: hoe heuristiek-pakketten zelf worden gebouwd (woordlijsten, severity-classificatie, provenance-tagging) — dat is implementatie-detail in Δ-2 task-file, niet architectuur-beslissing. Ook out-of-scope: hoe Brand Voice 1-pager (Δ-3) locale toont — UI-vraag.

- **Future-proof claim explicit**: wanneer Channel Activation (`google-ads-integration`, `meta-ads-integration`, `ayrshare-social-publishing` in LATER-roadmap) komt, kunnen toekomstige modellen als `ChannelAccount` of `PublishingChannel` eigen `contentLocale`-veld krijgen voor channel-specifieke locale-override. Patroon is dan consistent met deze ADR.
