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
]);

export default eslintConfig;
