/**
 * scripts/fidelity/build-bvd.ts
 *
 * Empirische verificatie van de huidige Brand Voice Directive (BVD).
 * Dumpt de output van buildBrandVoiceDirective() voor een gegeven workspace
 * in verschillende kanaal-contexten en analyseert veld-coverage + token-count.
 *
 * Doel: schema-audit sectie 2.2 onderbouwen met empirische data.
 *
 * Run:
 *   npx tsx scripts/fidelity/build-bvd.ts --workspace branddock-demo
 *   npx tsx scripts/fidelity/build-bvd.ts --workspace wra --channel email
 *
 * Output:
 *   research/fidelity-week1/bvd-dumps/{workspace-slug}-bvd.txt
 *   + console rapport (token count, veld-coverage, gevonden velden)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

// ─── Env loading ────────────────────────────────────────────

const envPath = resolve(process.cwd(), '.env.local');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const hashIdx = value.indexOf('#');
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    }
    if (value) process.env[key] = value;
  }
} catch (err) {
  console.warn(`(could not read ${envPath}: ${(err as Error).message})`);
}

// Dynamic imports after env loading — prisma.ts reads DATABASE_URL at module init
import type { PATHS as PathsType } from './config';

let prisma: typeof import('../../src/lib/prisma').prisma;
let buildBrandVoiceDirective: typeof import('../../src/lib/studio/brand-voice-directive').buildBrandVoiceDirective;
let PATHS: typeof PathsType;

// ─── Field-coverage detectors ───────────────────────────────

/** Markers we expect to find in a fully-populated BVD output */
const FIELD_MARKERS: Array<{ key: string; pattern: RegExp; category: string }> = [
  // BrandPersonality (formatBrandPersonality output)
  { key: 'primaryDimension', pattern: /Primary dimension:/i, category: 'BrandPersonality' },
  { key: 'secondaryDimension', pattern: /Secondary:/i, category: 'BrandPersonality' },
  { key: 'dimensionScores', pattern: /Personality scores:/i, category: 'BrandPersonality' },
  { key: 'personalityTraits', pattern: /Core traits:/i, category: 'BrandPersonality' },
  { key: 'butNeverThat', pattern: /But never:/i, category: 'BrandPersonality' },
  { key: 'spectrumSliders', pattern: /Personality positioning:/i, category: 'BrandPersonality' },
  { key: 'toneDimensions', pattern: /Tone of voice:/i, category: 'BrandPersonality' },
  { key: 'brandVoiceDescription', pattern: /Brand voice:/i, category: 'BrandPersonality' },
  { key: 'wordsWeUse', pattern: /Words we use:/i, category: 'BrandPersonality' },
  { key: 'wordsWeAvoid', pattern: /Words we avoid:/i, category: 'BrandPersonality' },
  { key: 'writingSample', pattern: /Writing sample:/i, category: 'BrandPersonality' },
  { key: 'channelTones', pattern: /Channel-specific tone:/i, category: 'BrandPersonality' },
  // BrandStyleguide.toneOfVoice (BVD wraps it as **Tone of voice guidelines**:)
  { key: 'toneOfVoiceGuidelines', pattern: /\*\*Tone of voice guidelines\*\*:/i, category: 'ToneOfVoice' },
  // BVD wrapper itself
  { key: 'bvdHeader', pattern: /BRAND VOICE DIRECTIVE — NON-NEGOTIABLE/i, category: 'BVD-wrapper' },
  { key: 'languageDirective', pattern: /\*\*Language\*\*:/i, category: 'BVD-wrapper' },
  { key: 'channelHint', pattern: /\*\*Channel\*\*:/i, category: 'BVD-wrapper' },
  { key: 'brandNameReminder', pattern: /\*\*Brand name\*\*:/i, category: 'BVD-wrapper' },
  { key: 'brandVoiceWrapper', pattern: /\*\*Brand voice\*\*:/i, category: 'BVD-wrapper' },
];

interface CoverageReport {
  workspaceSlug: string;
  workspaceName: string;
  channel: string | null;
  bvdOutput: string;
  charCount: number;
  approxTokens: number;
  fieldsPresent: string[];
  fieldsAbsent: string[];
  byCategory: Record<string, { present: number; total: number; presentKeys: string[] }>;
}

function analyzeCoverage(workspaceSlug: string, workspaceName: string, channel: string | null, bvdOutput: string): CoverageReport {
  const fieldsPresent: string[] = [];
  const fieldsAbsent: string[] = [];
  const byCategory: Record<string, { present: number; total: number; presentKeys: string[] }> = {};

  for (const marker of FIELD_MARKERS) {
    const found = marker.pattern.test(bvdOutput);
    if (!byCategory[marker.category]) {
      byCategory[marker.category] = { present: 0, total: 0, presentKeys: [] };
    }
    byCategory[marker.category].total += 1;
    if (found) {
      fieldsPresent.push(marker.key);
      byCategory[marker.category].present += 1;
      byCategory[marker.category].presentKeys.push(marker.key);
    } else {
      fieldsAbsent.push(marker.key);
    }
  }

  return {
    workspaceSlug,
    workspaceName,
    channel,
    bvdOutput,
    charCount: bvdOutput.length,
    approxTokens: Math.round(bvdOutput.length / 4),
    fieldsPresent,
    fieldsAbsent,
    byCategory,
  };
}

function formatReport(report: CoverageReport): string {
  const lines: string[] = [];
  lines.push(`# BVD Empirische Verificatie`);
  lines.push('');
  lines.push(`**Workspace**: ${report.workspaceName} (${report.workspaceSlug})`);
  lines.push(`**Channel**: ${report.channel ?? '(none — default)'}`);
  lines.push(`**Generated at**: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`## Metrics`);
  lines.push('');
  lines.push(`- Char count: **${report.charCount}**`);
  lines.push(`- Approx tokens (chars/4): **${report.approxTokens}**`);
  lines.push(`- Fields present: **${report.fieldsPresent.length}** of ${FIELD_MARKERS.length}`);
  lines.push(`- Fields absent: ${report.fieldsAbsent.length}`);
  lines.push('');
  lines.push(`## By category`);
  lines.push('');
  for (const [category, stats] of Object.entries(report.byCategory)) {
    lines.push(`**${category}**: ${stats.present}/${stats.total} present`);
    lines.push(`- Present: ${stats.presentKeys.length > 0 ? stats.presentKeys.join(', ') : '(none)'}`);
    lines.push('');
  }
  lines.push(`## Absent fields`);
  lines.push('');
  if (report.fieldsAbsent.length === 0) {
    lines.push('(All markers detected.)');
  } else {
    for (const key of report.fieldsAbsent) {
      lines.push(`- ${key}`);
    }
  }
  lines.push('');
  lines.push(`## Full BVD output`);
  lines.push('');
  lines.push('```');
  lines.push(report.bvdOutput.length === 0 ? '(empty — workspace has no BrandPersonality, ToneOfVoice, or non-English language)' : report.bvdOutput);
  lines.push('```');
  return lines.join('\n');
}

// ─── CLI parsing ────────────────────────────────────────────

function parseArgs(): { workspace?: string; channels: (string | null)[] } {
  const args = process.argv.slice(2);
  let workspace: string | undefined;
  const channels: (string | null)[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--workspace' && args[i + 1]) {
      workspace = args[i + 1];
      i++;
    } else if (args[i] === '--channel' && args[i + 1]) {
      channels.push(args[i + 1]);
      i++;
    }
  }
  if (channels.length === 0) {
    // Default: dump for no-channel + 3 representative channels
    channels.push(null, 'socialMedia', 'email', 'website');
  }
  return { workspace, channels };
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  const { workspace: workspaceSlugArg, channels } = parseArgs();
  if (!workspaceSlugArg) {
    console.error('Usage: npx tsx scripts/fidelity/build-bvd.ts --workspace <slug> [--channel <key>]');
    process.exit(1);
  }

  // Now that env vars are loaded, import the runtime modules.
  ({ prisma } = await import('../../src/lib/prisma'));
  ({ buildBrandVoiceDirective } = await import('../../src/lib/studio/brand-voice-directive'));
  ({ PATHS } = await import('./config'));

  const workspace = await prisma.workspace.findFirst({
    where: { slug: workspaceSlugArg },
    select: { id: true, name: true, slug: true },
  });
  if (!workspace) {
    console.error(`Workspace with slug "${workspaceSlugArg}" not found.`);
    const available = await prisma.workspace.findMany({ select: { slug: true, name: true } });
    console.error(`Available workspaces: ${available.map((w) => `${w.slug} (${w.name})`).join(', ')}`);
    process.exit(1);
  }

  console.log(`→ Workspace: ${workspace.name} (${workspace.slug})`);
  console.log(`→ Channels to test: ${channels.map((c) => c ?? '(none)').join(', ')}`);
  console.log('');

  mkdirSync(PATHS.bvdDumps, { recursive: true });

  for (const channel of channels) {
    console.log(`\n━━━ Channel: ${channel ?? '(none)'} ━━━`);
    const bvdOutput = await buildBrandVoiceDirective(
      workspace.id,
      channel ? { channel } : undefined,
    );

    const report = analyzeCoverage(workspace.slug, workspace.name, channel, bvdOutput);

    console.log(`  Chars: ${report.charCount}, approx tokens: ${report.approxTokens}`);
    console.log(`  Fields present: ${report.fieldsPresent.length}/${FIELD_MARKERS.length}`);
    for (const [cat, stats] of Object.entries(report.byCategory)) {
      console.log(`    ${cat}: ${stats.present}/${stats.total}`);
    }
    if (report.fieldsAbsent.length > 0) {
      console.log(`  Absent: ${report.fieldsAbsent.join(', ')}`);
    }

    const filename = channel
      ? `${workspace.slug}-bvd-${channel}.md`
      : `${workspace.slug}-bvd-default.md`;
    const filepath = join(PATHS.bvdDumps, filename);
    writeFileSync(filepath, formatReport(report), 'utf8');
    console.log(`  ✓ Wrote ${filepath}`);
  }

  console.log('\n✓ Done. See research/fidelity-week1/bvd-dumps/ for full reports.');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
