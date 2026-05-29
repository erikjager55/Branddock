/**
 * Smoke-test voor Fase A1 — button-state extractie uit CSS.
 *
 * Tests:
 *   - Detecteer .btn / button / .cta / .wp-block-button selectors
 *   - Negative selectors (.menu-button / .close-button) worden uitgesloten
 *   - Padding-shorthand splitst correct in paddingY / paddingX
 *   - Hover-state wordt aan base-selector gekoppeld
 *   - Role-classification: primary (solid bg) / secondary (border-only) / ghost (no bg+border)
 *   - Explicit role-hints in selector (.btn-primary) winnen
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase25-button-extractor.ts
 */

import { extractButtonStyles } from "../../src/lib/brandstyle/button-extractor";

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`);
    fail++;
  }
}

function group(name: string): void {
  console.log(`\n${name}`);
}

// ─── Fixture 1: simple .btn ──────────────────────────────

group("A1 — basis .btn selector");
{
  const css = `
    .btn {
      padding: 12px 24px;
      font-weight: 600;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 4px;
      background: #000000;
      color: #FFFFFF;
      transition: background 200ms ease;
    }
    .btn:hover {
      background: #333333;
      transform: translateY(-1px);
    }
  `;
  const result = extractButtonStyles(css);
  assert("één button gedetecteerd", result.length === 1);
  const btn = result[0];
  assert("paddingY=12px", btn.paddingY === "12px");
  assert("paddingX=24px", btn.paddingX === "24px");
  assert("fontWeight=600", btn.fontWeight === "600");
  assert("fontSize=16px", btn.fontSize === "16px");
  assert("textTransform=uppercase", btn.textTransform === "uppercase");
  assert("letterSpacing=0.05em", btn.letterSpacing === "0.05em");
  assert("borderRadius=4px", btn.borderRadius === "4px");
  assert("background=#000000", btn.background === "#000000");
  assert("color=#FFFFFF", btn.color === "#FFFFFF");
  assert("transition behouden", btn.transition?.includes("200ms") === true);
  assert("hoverBackground=#333333", btn.hoverBackground === "#333333");
  assert(
    "hoverTransform=translateY",
    btn.hoverTransform?.includes("translateY") === true,
  );
  assert("role=primary (solid bg)", btn.role === "primary");
}

// ─── Fixture 2: padding-shorthand variants ────────────────

group("A1 — padding-shorthand variants");
{
  const cases: Array<[string, string | null, string | null]> = [
    ["padding: 16px;", "16px", "16px"],
    ["padding: 12px 24px;", "12px", "24px"],
    ["padding: 8px 16px 12px;", "8px", "16px"],
    ["padding: 4px 8px 12px 16px;", "4px", "8px"],
  ];
  for (const [decl, expectY, expectX] of cases) {
    const css = `.btn { ${decl} background: #000; }`;
    const result = extractButtonStyles(css);
    assert(
      `"${decl}" → Y=${expectY}, X=${expectX}`,
      result[0]?.paddingY === expectY && result[0]?.paddingX === expectX,
      `got Y=${result[0]?.paddingY}, X=${result[0]?.paddingX}`,
    );
  }
}

// ─── Fixture 3: long-form overrides ───────────────────────

group("A1 — padding-top / padding-block / padding-left overrides");
{
  const css = `
    .btn {
      padding: 10px 20px;
      padding-top: 14px;
      padding-left: 28px;
      background: #000;
    }
  `;
  const result = extractButtonStyles(css);
  const btn = result[0];
  assert("paddingY long-form override", btn.paddingY === "14px");
  assert("paddingX long-form override", btn.paddingX === "28px");
}

// ─── Fixture 4: role classification ───────────────────────

group("A1 — role classification");
{
  // Solid background → primary
  const primary = extractButtonStyles(`
    .my-cta { background: #1FD1B2; color: #fff; padding: 12px 24px; }
  `);
  assert("solid bg → primary", primary[0]?.role === "primary");

  // Border-only → secondary
  const secondary = extractButtonStyles(`
    .btn-outline { background: transparent; border: 2px solid #000; padding: 12px 24px; }
  `);
  assert("border-only → secondary", secondary[0]?.role === "secondary");

  // Geen bg + geen border → ghost
  const ghost = extractButtonStyles(`
    .btn-link { background: none; padding: 8px 0; color: #1FD1B2; }
  `);
  assert("no bg + no border → ghost", ghost[0]?.role === "ghost");

  // Explicit hint in selector wint
  const explicit = extractButtonStyles(`
    .btn-primary { background: #000; padding: 12px 24px; }
    .btn-secondary { background: transparent; border: 1px solid #000; padding: 12px 24px; }
    .btn-ghost { padding: 8px 0; }
  `);
  const primaryByName = explicit.find((b) => b.selector.includes("primary"));
  const secondaryByName = explicit.find((b) => b.selector.includes("secondary"));
  const ghostByName = explicit.find((b) => b.selector.includes("ghost"));
  assert(".btn-primary → primary", primaryByName?.role === "primary");
  assert(".btn-secondary → secondary", secondaryByName?.role === "secondary");
  assert(".btn-ghost → ghost", ghostByName?.role === "ghost");
}

// ─── Fixture 5: negative selectors (exclusions) ───────────

group("A1 — negative selectors uitgesloten");
{
  const css = `
    .menu-button { padding: 8px; background: #fff; }
    .close-button { padding: 8px; background: #fff; }
    .icon-button { padding: 4px; background: #fff; }
    .btn { padding: 12px 24px; background: #000; }
  `;
  const result = extractButtonStyles(css);
  assert("alleen .btn gedetecteerd", result.length === 1);
  assert(".menu-button uitgesloten", !result.some((b) => b.selector.includes("menu")));
  assert(".close-button uitgesloten", !result.some((b) => b.selector.includes("close")));
}

// ─── Fixture 6: framework-selectors ───────────────────────

group("A1 — WordPress / Elementor / ACSS framework selectors");
{
  const css = `
    .wp-block-button__link { background: #B59032; color: #000; padding: 14px 32px; border-radius: 0; }
    .elementor-button { background: #1FD1B2; color: #fff; padding: 12px 28px; }
    .acss-btn-primary { background: #FF6B6B; padding: 10px 20px; }
  `;
  const result = extractButtonStyles(css);
  assert(
    "drie framework-buttons gedetecteerd",
    result.length === 3,
    `got ${result.length}`,
  );
}

// ─── Fixture 7: multi-rule merge ──────────────────────────

group("A1 — meerdere rules op zelfde selector mergen");
{
  const css = `
    .btn { padding: 12px 24px; background: #000; }
    .btn { font-weight: 700; }
    .btn { color: #fff; }
  `;
  const result = extractButtonStyles(css);
  assert("één result (merged)", result.length === 1);
  assert("padding behouden", result[0].paddingY === "12px");
  assert("font-weight uit 2e rule", result[0].fontWeight === "700");
  assert("color uit 3e rule", result[0].color === "#fff");
}

// ─── Fixture 8: no buttons → empty ────────────────────────

group("A1 — geen button-selectors → lege array");
{
  const css = `
    body { font-family: Inter; }
    h1 { color: black; }
    .container { max-width: 1200px; }
  `;
  const result = extractButtonStyles(css);
  assert("empty result", result.length === 0);
}

// ─── Fixture 9: comma-separated selectors splitsen ────────

group("A1 — comma-separated selectors worden gesplitst");
{
  const css = `
    .btn, .button, button { padding: 12px 24px; background: #000; }
  `;
  const result = extractButtonStyles(css);
  assert(
    "drie individuele entries",
    result.length === 3,
    `got ${result.length}`,
  );
  for (const btn of result) {
    assert(`${btn.selector} heeft padding`, btn.paddingY === "12px");
  }
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
