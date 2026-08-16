import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test & build artifacts:
    "e2e/**",
    "playwright-report/**",
    "test-results/**",
    "src/scripts/**",
    "*.mjs",
    // Python virtualenvs under scripts/ (e.g. voice-research/ws3/.venv)
    // bundle third-party JavaScript (PyTorch model_dump/code.js) that
    // isn't ours to lint.
    "scripts/**/.venv/**",
    "scripts/**/venv/**",
    "scripts/**/__pycache__/**",
    // Research / experiment exports (DTS Ede design-system UI-kit, etc.).
    // Third-party-style code that is NOT part of the productie-bundle.
    "docs/experiments/**",
  ]),
  // Downgrade noisy rules to warnings (fix incrementally).
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-assign-module-variable": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "prefer-const": "warn",
      // React Compiler rules — downgrade while adopting incrementally.
      "react-hooks/static-components": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  // NL→EN guard (tasks/dutch-to-english-ui-migration.md + ADR 2026-06-17):
  // de product-UI is monolinguaal Engels. Deze regel blokkeert nieuwe
  // Nederlandse UI-strings in JSX-tekst + UI-attributen met een hoog-precieze
  // stopwoordenlijst. Klant-content-producers (Puck-config + templates) zijn
  // uitgesloten: dáár volgt de taal de brand-locale, niet de app-UI.
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/features/**/*.{ts,tsx}",
      "src/app/**/*.tsx",
    ],
    ignores: [
      "src/features/campaigns/components/canvas/medium/puck-config.tsx",
      "src/features/campaigns/components/canvas/medium/puck-templates/**",
      // Marketing-site is bewust NL-first (website-verbeterplan v2, 2026-07-15);
      // de NL-denylist geldt alleen voor de product-UI.
      "src/app/marketing/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXText[value=/\\b(mislukt|gelukt|geslaagd|ongeldig|vereist|verplicht|verwijderen|annuleren|toevoegen|bewerken|opslaan|sluiten|wijzigen|bezig|laden|zoeken|kiezen|selecteer|niet gevonden|kon niet|weet je zeker)\\b/i]",
          message:
            "Dutch UI text detected. Product UI must be English (tasks/dutch-to-english-ui-migration.md). For client-facing generated content, drive language via the locale layer, not hardcoded strings.",
        },
        {
          selector:
            "JSXAttribute[name.name=/^(aria-label|placeholder|title|alt)$/] Literal[value=/\\b(mislukt|gelukt|geslaagd|ongeldig|vereist|verplicht|verwijderen|annuleren|toevoegen|bewerken|opslaan|sluiten|wijzigen|bezig|laden|zoeken|kiezen|selecteer)\\b/i]",
          message:
            "Dutch text in a UI attribute (aria-label/placeholder/title/alt). Product UI must be English.",
        },
      ],
    },
  },
  // UI-i18n migration guard (ADR 2026-06-28-multilingual-i18n-and-multi-market-content):
  // op files die al naar de i18next-runtime zijn gemigreerd, verbied NIEUWE
  // hardcoded user-facing strings — die moeten via t(). De scope is een
  // allowlist die meegroeit naarmate meer chrome-oppervlakken zijn gemigreerd.
  // NB: ESLint flat-config doet last-wins per rule-key, dus dit blok vervangt
  // het NL-denylist-blok hierboven op overlappende files. De JSXText-selector is
  // bewust een SUPERSET (vangt álle latin tekst, incl. NL) zodat de Nederlandse-
  // tekst-dekking behouden blijft — versoepel deze regel niet zonder de NL-guard
  // expliciet terug te brengen op deze files.
  {
    files: [
      "src/features/settings/components/appearance/**/*.tsx",
      "src/components/TopNavigationBar.tsx",
      // Agents-feature is i18n-native vanaf dag 1 (agents-ui-inbox).
      "src/features/agents/**/*.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXText[value=/[A-Za-z]{3,}/]",
          message:
            "Hardcoded UI text in an i18n-migrated file. Use t('namespace:key') from react-i18next instead.",
        },
        {
          selector:
            "JSXAttribute[name.name=/^(aria-label|placeholder|title|alt)$/] > Literal[value=/[A-Za-z]{3,}/]",
          message:
            "Hardcoded text in a UI attribute in an i18n-migrated file. Use t() instead.",
        },
      ],
    },
  },
  // ─────────────────────────────────────────────────────────────
  // W7.1 — de merkbibliotheek is het verplichte consumptiepad.
  //
  // Directe `prisma.brandStyleguide`-toegang verspreidt de gates (published +
  // de zes save-for-AI-vlaggen) en de marker-stripping over tientallen
  // bestanden; één vergeten gate is dan een governance-gat. Consumers gaan via
  // `getBrandLibrary` (src/lib/brand-library).
  //
  // Bewust `no-restricted-properties` en niet `no-restricted-syntax`: die
  // laatste sleutel is hierboven al twee keer in gebruik voor de NL- en
  // i18n-guards, en flat-config doet last-wins per rule-key — een derde blok
  // zou die guards op elk overlappend bestand uitschakelen.
  //
  // De `ignores`-lijst is de resterende schuld en hoort te krimpen.
  // Zie docs/adr/2026-08-14-brand-library-consumption.md.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      // De accessor zelf + de CRUD/editor-routes van de styleguide.
      "src/lib/brand-library/**",
      "src/app/api/brandstyle/**",

      // Schrijfpaden: analyse, scrape, afgeleide velden, lock-checks.
      "src/lib/brandstyle/analysis-engine.ts",
      // Leest uitsluitend `userEditedFields` om een mutatie te ondersteunen —
      // geen merkcontent, dus de gates zijn hier niet van toepassing (W5).
      "src/lib/brandstyle/claim-fields.ts",
      "src/lib/brandstyle/recompute-color-pairings.ts",
      "src/lib/brandstyle/semantic-role-resolver.ts",
      "src/lib/brandstyle/snapshots/snapshot-cleanup.ts",
      "src/lib/landing-pages/ensure-archetype.ts",
      "src/lib/landing-pages/ensure-layout-style.ts",
      "src/lib/website-scanner/scanner-pipeline.ts",
      "src/lib/alignment/fix-generator.ts",
      // NB: geen letterlijke [token] in het pad — flat-config leest `[...]`
      // als character-class, waardoor de entry stil niet matcht.
      "src/app/api/brandmd/claim/**",

      // Styleguide-domein zelf: leest zijn eigen regels mét eigen gates.
      "src/lib/brand-fidelity/styleguide-rule-compiler.ts",
      "src/lib/brandstyle/rule-structurer.ts",

      // TODO(brand-library-consumer-migration): nog te migreren lezers.
      // Export-paden zijn bewust uitgesteld — gating daar verandert de Brand
      // Kit Bundle en verdient een eigen beslissing.
      "src/lib/export/design-system/resolver.ts",
      "src/lib/export/brand-kit-bundle/index.ts",
      "src/app/api/export/brand-kit/data/route.ts",
      "src/app/api/export/proxy-image/route.ts",
      "src/app/api/workspace/export/route.ts",
      // Geen promptcontent: asset-URLs, tellingen, debug-context.
      "src/lib/brand/get-brand-logo.ts",
      "src/lib/alignment/audit-scoring.ts",
      "src/lib/bug-analysis/analyze-bug.ts",
    ],
    rules: {
      "no-restricted-properties": [
        "error",
        ...["prisma", "tx", "db"].map((object) => ({
          object,
          property: "brandStyleguide",
          message:
            "Read the brand library through getBrandLibrary() from @/lib/brand-library instead of querying BrandStyleguide directly — gates and marker-stripping live there (W7.1).",
        })),
      ],
    },
  },
  // ─────────────────────────────────────────────────────────────
  // Content-keten-guard — lees deliverable-content via de accessor.
  //
  // Content woont op drie plekken (component-keten, `settings.structuredVariant`,
  // legacy `generatedText`). Wie er één rechtstreeks leest, mist de andere twee:
  // dat leverde in acht weken vier keer dezelfde bug op — een volle pagina die
  // zich als leeg voordoet. Lezen gaat via `resolveDeliverableContent()` uit
  // @/lib/content/resolve-deliverable-content.
  //
  // ⚠️ SCOPE IS BEWUST `src/lib/**` + `src/app/api/**` EN GEEN `src/**`.
  // Flat-config doet last-wins per rule-key, en `no-restricted-syntax` is
  // hierboven al twee keer in gebruik (NL-denylist op components/features/app-tsx,
  // i18n-guard op een allowlist). Een blok dat die paden óók raakt zou die guards
  // stil uitschakelen — precies de val die het `no-restricted-properties`-commentaar
  // hierboven beschrijft. `src/app/api/**\/*.ts` overlapt niet met `src/app/**\/*.tsx`,
  // en `src/lib/**` komt in geen van beide voor. Verbreed dit dus niet zonder de
  // andere twee guards expliciet mee te nemen.
  //
  // Gevolg van die scope: de twee .tsx-call-sites (Step4Timeline, FeedbackBar)
  // zijn niet lint-gedekt. Beide staan in de fase-2-lijst van
  // tasks/content-chain-accessor.md en worden daar met de hand gemigreerd.
  //
  // `puckData` staat bewust NIET in de lijst: 77 vindplaatsen, vrijwel allemaal
  // legitiem render-werk in het landing-pages-domein. Het is een render-artefact,
  // geen tekstbron.
  {
    files: ["src/lib/**/*.ts", "src/app/api/**/*.ts"],
    ignores: [
      // De accessor zelf.
      "src/lib/content/resolve-deliverable-content.ts",
      "src/lib/content/deliverable-settings.ts",

      // Schrijf- en render-paden: het landing-pages-domein bezit keten B.
      "src/lib/landing-pages/**",
      "src/app/api/landing-pages/**",
      // Schrijver: patcht de hero-URL IN de variant. Een leesaccessor helpt hier
      // niet — dit pad muteert bewust de opslag.
      "src/lib/deliverable/patch-hero-visual.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[property.name='structuredVariant']",
          message:
            "Raw access to settings.structuredVariant. Read content through resolveDeliverableContent() from @/lib/content/resolve-deliverable-content — it handles all three content chains (tasks/content-chain-accessor.md).",
        },
        {
          selector: "MemberExpression[property.name='structuredVariantOptions']",
          message:
            "Raw access to settings.structuredVariantOptions. Use resolveDeliverableContent() — the 'structured-unchosen' kind tells you content exists but no variant was picked.",
        },
        {
          selector: "MemberExpression[property.name='generatedText']",
          message:
            "Raw access to the legacy generatedText chain. Use resolveDeliverableContent() — it falls back to generatedText only when the other two chains are empty.",
        },
      ],
    },
  },
]);

export default eslintConfig;
