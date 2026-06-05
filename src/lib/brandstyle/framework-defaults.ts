/**
 * Centrale framework-default-detectie voor de scrape→brandstyle-extractie.
 *
 * Op Bootstrap/WordPress/Gutenberg/Gravity-Forms-sites worden framework-default
 * selectors + kleuren als merk-design overgenomen (user-symptoom: buttons
 * kloppen niet, componenten @100% confidence, Bootstrap-blauw als primary).
 * Deze gate deprioriteert ze i.p.v. ze hard te droppen — zo wint een échte
 * merk-component/-kleur, maar blijft op een puur-framework-site nog íéts over.
 *
 * Verbeterplan brand-fidelity Fase 2 — audit 2026-06-05.
 */

/** Framework-default button/component-selectors (Gutenberg/Elementor/Bootstrap/Gravity). */
const FRAMEWORK_DEFAULT_SELECTOR_PATTERNS: RegExp[] = [
  /\.wp-block-button/i,
  /\.wp-element-button/i,
  /\.has-button-style/i,
  /\.elementor-button/i,
  /\.gform[_-]/i,        // Gravity Forms (.gform_button, .gform_wrapper, ...)
  /\.gfield/i,
  // Kale Bootstrap-utility (zonder merk-prefix). Linker-grens via lookbehind
  // zodat namespaced merk-classes (.brand-btn-primary, .my-btn-primary) NIET
  // matchen. (Generieke /\.wp-block-/ bewust weggelaten — over-matcht custom
  // Gutenberg-blocks zoals .wp-block-mybrand; .wp-block-button dekt de default.)
  /(?<![\w-])btn-primary\b/i,
  /(?<![\w-])btn-secondary\b/i,
  /(?<![\w-])btn-outline-/i,
];

/**
 * ONGEWIJZIGDE framework-default PRIMARY-kleuren — Bootstrap `--bs-primary`,
 * WordPress-admin-blauw, Gutenberg-default-accent. Bewust een FOCUSSET van
 * primary/accent-defaults (niet de hele neutrale palette): een merk kan
 * toevallig een Bootstrap-grijs/-zwart als echte kleur voeren (bv. Zwarthout
 * #212529), dus alleen de "merk-claimende" default-accenten gaten we.
 */
const FRAMEWORK_DEFAULT_PRIMARY_HEXES = new Set(
  [
    '#0D6EFD', // Bootstrap primary blue
    '#0A58CA', // Bootstrap primary-dark
    '#6610F2', // Bootstrap indigo
    '#0DCAF0', // Bootstrap info
    '#2271B1', '#0073AA', '#006799', '#00669B', '#135E96', '#0085BA', // WP-admin blues
    '#7A00DF', // Gutenberg synced-block default
    '#0693E3', '#8ED1FC', // Gutenberg default blues
    '#087990', // Bootstrap teal / info text-emphasis
    '#146C43', // Bootstrap success text-emphasis (green-dark)
    '#6F42C1', '#6610F2', // Bootstrap purple / indigo
    '#D63384', // Bootstrap pink
    '#20C997', // Bootstrap teal
    // Bootstrap theme/semantic-defaults (success/warning/danger). Bewust de
    // SATURATED status-kleuren — NIET de neutrale grijzen (#6C757D/#212529/
    // #F8F9FA), die structureel een echte merk-tekst/-surface kunnen zijn.
    '#198754', // Bootstrap success green
    '#FFC107', // Bootstrap warning amber
    '#DC3545', // Bootstrap danger red
  ].map((h) => h.toLowerCase()),
);

/** True wanneer de selector een framework-default button/component-selector is. */
export function isFrameworkDefaultSelector(selector: string): boolean {
  return FRAMEWORK_DEFAULT_SELECTOR_PATTERNS.some((re) => re.test(selector));
}

/** True wanneer één van de classes een framework-default-selector is. */
export function hasFrameworkDefaultClass(classes: string[]): boolean {
  return classes.some((c) => isFrameworkDefaultSelector(c.startsWith('.') ? c : `.${c}`));
}

/**
 * True wanneer de hex een ongewijzigde framework-default PRIMARY/accent-kleur is
 * die NIET als high-confidence merk-primary gepusht mag worden.
 */
export function isFrameworkDefaultPrimary(hex: string | null | undefined): boolean {
  if (!hex) return false;
  return FRAMEWORK_DEFAULT_PRIMARY_HEXES.has(hex.trim().toLowerCase());
}
