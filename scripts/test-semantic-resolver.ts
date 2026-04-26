// =============================================================
// Test script voor de Semantic Role Resolver.
//
// Usage:
//   DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" \
//     npx tsx scripts/test-semantic-resolver.ts [styleguideId]
//
// Als er geen id wordt meegegeven, pikt het script de eerste styleguide
// met status=COMPLETE. Dumpt het volledige SemanticTokens-object naar
// stdout en doet een paar sanity checks.
// =============================================================

import { prisma } from '../src/lib/prisma';
import { resolveSemanticTokens, type SemanticColorRole } from '../src/lib/brandstyle/semantic-role-resolver';
import { buildDesignSystemModel } from '../src/lib/export/design-system/resolver';
import { emitDesignMd } from '../src/lib/export/design-system/emitters/designmd';
import { emitDtcg } from '../src/lib/export/design-system/emitters/dtcg';
import { emitTailwindTheme } from '../src/lib/export/design-system/emitters/tailwind';
import { emitShadcnCss } from '../src/lib/export/design-system/emitters/shadcn';
import { emitFigmaVariables } from '../src/lib/export/design-system/emitters/figma-variables';
import { emitStyleDictionary } from '../src/lib/export/design-system/emitters/style-dictionary';
import { emitBrandBrief } from '../src/lib/export/design-system/emitters/brand-brief';

const REQUIRED: SemanticColorRole[] = ['primary', 'on-primary', 'surface', 'on-surface'];

async function main(): Promise<void> {
  const arg = process.argv[2];

  const styleguide = arg
    ? await prisma.brandStyleguide.findUnique({ where: { id: arg } })
    : await prisma.brandStyleguide.findFirst({
        where: { status: 'COMPLETE' },
        orderBy: { updatedAt: 'desc' },
      });

  if (!styleguide) {
    console.error('No styleguide found. Run the brandstyle analyzer on a URL first.');
    process.exit(1);
  }

  console.log(`\n── Resolving semantic tokens for styleguide ${styleguide.id} ──\n`);

  const tokens = await resolveSemanticTokens(styleguide.id);

  console.log(JSON.stringify(tokens, null, 2));

  console.log('\n── Sanity checks ──');

  const missing: SemanticColorRole[] = [];
  for (const role of REQUIRED) {
    if (!tokens.resolved.colors[role]) missing.push(role);
  }
  if (missing.length > 0) {
    console.error(`  ✗ Missing required roles: ${missing.join(', ')}`);
  } else {
    console.log('  ✓ All required color roles resolved');
  }

  const typoCount = Object.keys(tokens.resolved.typography).length;
  console.log(`  ${typoCount > 0 ? '✓' : '✗'} Typography roles resolved: ${typoCount}`);

  const roundedCount = Object.keys(tokens.resolved.rounded).length;
  console.log(`  ${roundedCount > 0 ? '✓' : '✗'} Rounded scale entries: ${roundedCount}`);

  const spacingCount = Object.keys(tokens.resolved.spacing).length;
  console.log(`  ${spacingCount > 0 ? '✓' : '✗'} Spacing scale entries: ${spacingCount}`);

  const elevationCount = Object.keys(tokens.resolved.elevation).length;
  console.log(`  Elevation levels: ${elevationCount} (border-based site zonder shadows is OK)`);

  const variantCount = Object.keys(tokens.resolved.componentVariants).length;
  console.log(`  Component variants classified: ${variantCount}`);

  if (tokens.diagnostics.wcagWarnings.length > 0) {
    console.warn('\n  WCAG warnings:');
    for (const w of tokens.diagnostics.wcagWarnings) {
      console.warn(`    - ${w.role}: ${w.message}`);
    }
  }

  if (tokens.diagnostics.unresolvedRoles.length > 0) {
    console.warn(`\n  Unresolved roles: ${tokens.diagnostics.unresolvedRoles.join(', ')}`);
  }

  // ── Exporters smoke test ──
  console.log('\n── Canonical model + emitters ──');
  const model = await buildDesignSystemModel(styleguide.workspaceId);
  console.log(`  Meta: ${model.meta.name} (workspace ${model.meta.workspaceSlug})`);
  console.log(`  Colors: ${Object.keys(model.colors).length} roles`);
  console.log(`  Typography: ${Object.keys(model.typography).length} roles`);
  console.log(`  Components: ${Object.keys(model.components).length} variants`);
  console.log(`  Extensions: voice=${!!model.extensions.voice}, imagery=${!!model.extensions.imagery}, iconography=${!!model.extensions.iconography}, brandFoundation=${!!model.extensions.brandFoundation}`);

  const md = emitDesignMd(model);
  console.log(`\n  DESIGN.md (${md.length} chars, first 40 lines):`);
  console.log(md.split('\n').slice(0, 40).map((l) => '    ' + l).join('\n'));

  const dtcg = emitDtcg(model);
  console.log(`\n  DTCG tokens.json colors keys: ${Object.keys(dtcg.colors).join(', ')}`);

  const tw = emitTailwindTheme(model);
  console.log(`  Tailwind theme: ${Object.keys(tw.colors).length} colors, ${Object.keys(tw.fontSize).length} fontSize, ${Object.keys(tw.borderRadius).length} borderRadius`);

  const shadcn = emitShadcnCss(model);
  const shadcnVars = (shadcn.match(/--[a-z-]+:/g) ?? []).length;
  console.log(`  shadcn CSS: ${shadcnVars} CSS variables`);

  const figma = emitFigmaVariables(model);
  console.log(`  Figma Variables: ${figma.collections.length} collections (${figma.collections.map(c => c.variables.length).join('+')} vars)`);

  const sd = emitStyleDictionary(model);
  console.log(`  Style Dictionary: ${Object.keys(sd.color as object).length} color, ${Object.keys(sd.size as object).length} size groups`);

  const brief = emitBrandBrief(model);
  console.log(`  Brand Brief: ${brief.length} chars, ${(brief.match(/^##/gm) ?? []).length} sections`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Resolver test failed:', err);
  prisma.$disconnect().finally(() => process.exit(1));
});
