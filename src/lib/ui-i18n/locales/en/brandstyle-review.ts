// Canonical (source-of-truth) English UI strings — `brandstyle-review` namespace.
const ns = {
  // Render-edge labels for the REVIEW_SECTION_LABELS registry
  // (src/lib/brandstyle/review-sections.ts). Keyed on the stable section key;
  // the constant file stays the English source-of-truth / defaultValue.
  sections: {
    'brand-assets-logos': 'Logos',
    'brand-assets-fonts': 'Typography → Fonts',
    colors: 'Colors',
    typography: 'Typography',
    imagery: 'Imagery',
    'visual-system': 'Visual System',
    'colors-brand': 'Brand colors',
    'colors-neutrals': 'Neutrals',
    'colors-semantic': 'Semantic tints',
    'typography-display': 'Display type',
    'typography-ui': 'UI type',
    'typography-eyebrow': 'Eyebrow & meta',
    'spacing-scale': 'Spacing scale',
    'spacing-radii': 'Corner radii',
    'spacing-shadow': 'Shadow system',
    'components-buttons': 'Buttons',
    'components-form-inputs': 'Form inputs',
    'components-status-chips': 'Status chips',
    'components-product-cards': 'Product cards',
    'components-feature-icons': 'Feature icons',
    'components-top-navigation': 'Top navigation',
    'components-quote-blocks': 'Quote blocks',
    'system-roles': 'System roles (DESIGN.md)',
  },
  systemRoles: {
    empty: {
      title: 'System roles not yet resolved',
      body: 'Run the analyzer to generate DESIGN.md-compatible semantic roles (primary / on-primary / surface / ...). Existing styleguides created before this feature shipped can be re-analyzed via the header action.',
    },
    header: {
      title: 'System Roles',
      subtitle:
        'Semantic color tokens derived from your palette — used in DESIGN.md, DTCG, Tailwind and shadcn exports.',
    },
    override_one: '{{count}} override',
    override_other: '{{count}} overrides',
    wcagWarning_one: '{{count}} WCAG warning',
    wcagWarning_other: '{{count}} WCAG warnings',
    allResolved: 'All roles resolved',
    unresolvedLabel: 'Unresolved required roles:',
    unresolvedBody: 'Re-analyze to populate them, or set overrides manually.',
    overridesPersistNote: 'Overrides persist until you explicitly clear or re-analyze.',
    clearAll: 'Clear all overrides',
    reviewLabel: 'Review system roles',
    row: {
      swatchAlt: 'Color swatch for {{role}}',
      overrideBadge: 'Override',
      wcagBadge: 'WCAG {{ratio}}:1',
      fromSource: 'from: {{source}}',
      overrideAction: 'Override',
    },
    modal: {
      title: 'Override {{role}}',
      hexLabel: 'Hex value',
      contrastPreview: 'Contrast preview',
      sampleOn: 'Sample text on {{role}}',
      sampleUsing: 'Sample text using {{role}} on surface',
      resolverSuggested: 'Resolver suggested:',
      revert: 'Revert to resolver',
      cancel: 'Cancel',
      saving: 'Saving…',
      save: 'Save override',
      errorInvalidHex: 'Enter a valid hex value (e.g. #0D9488)',
      errorSaveFailed: 'Save failed',
      contrastBadge: 'Contrast {{ratio}}:1 — {{verdict}}',
      contrastPass: 'WCAG AA ✓',
      contrastFail: 'Below WCAG AA (needs 4.5:1)',
    },
  },
} as const;

export default ns;
