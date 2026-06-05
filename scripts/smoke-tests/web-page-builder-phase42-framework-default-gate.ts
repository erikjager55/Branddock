/**
 * Smoke-test — brandstyle Fase 2 (framework-default-gate). Verifieert dat
 * framework-default selectors/kleuren worden herkend + gedeprioriteerd, terwijl
 * échte merk-selectors/kleuren (incl. een toevallig-Bootstrap-grijs als Zwarthout
 * #212529) ongemoeid blijven.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase42-framework-default-gate.ts
 */
import {
  isFrameworkDefaultSelector,
  hasFrameworkDefaultClass,
  isFrameworkDefaultPrimary,
} from '../../src/lib/brandstyle/framework-defaults';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

console.log('\n── selector-gate ──');
assert('.wp-block-button__link = framework-default', isFrameworkDefaultSelector('.wp-block-button__link'));
assert('.wp-element-button = framework-default', isFrameworkDefaultSelector('.wp-element-button'));
assert('.gform_button = framework-default', isFrameworkDefaultSelector('.gform_button'));
assert('.elementor-button = framework-default', isFrameworkDefaultSelector('.elementor-button'));
assert('.btn-primary (kale Bootstrap) = framework-default', isFrameworkDefaultSelector('.btn-primary'));
assert('.zwarthout-cta = ECHT (geen framework)', !isFrameworkDefaultSelector('.zwarthout-cta'));
assert('.hero__button = ECHT (geen framework)', !isFrameworkDefaultSelector('.hero__button'));
// Review-bugfixes #3/#6: namespaced merk-classes + custom Gutenberg-blocks NIET gegate
assert('.brand-btn-primary = ECHT (namespaced, geen penalty)', !isFrameworkDefaultSelector('.brand-btn-primary'));
assert('.my-btn-primary = ECHT (namespaced)', !isFrameworkDefaultSelector('.my-btn-primary'));
assert('.wp-block-mybrand = ECHT (custom Gutenberg-block)', !isFrameworkDefaultSelector('.wp-block-mybrand'));
assert('.wp-block-button__link blijft framework-default', isFrameworkDefaultSelector('.wp-block-button__link'));

console.log('\n── hasFrameworkDefaultClass ──');
assert('classes met wp-block-button → true', hasFrameworkDefaultClass(['wp-block-button', 'foo']));
assert('classes zonder framework → false', !hasFrameworkDefaultClass(['hero', 'cta-main']));

console.log('\n── primary-kleur-gate ──');
assert('#0D6EFD (Bootstrap primary) = default', isFrameworkDefaultPrimary('#0D6EFD'));
assert('#0d6efd lowercase = default', isFrameworkDefaultPrimary('#0d6efd'));
assert('#2271B1 (WP-admin) = default', isFrameworkDefaultPrimary('#2271B1'));
assert('#212529 (Zwarthout charcoal) NIET gegate', !isFrameworkDefaultPrimary('#212529'));
assert('#F0B849 (echt accent) NIET gegate', !isFrameworkDefaultPrimary('#F0B849'));
assert('null veilig', !isFrameworkDefaultPrimary(null));

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
