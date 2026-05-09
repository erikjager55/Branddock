/**
 * scripts/smoke-tests/inline-edit-coverage.ts
 *
 * Coverage-smoke voor canvas-inline-edit-overlays. Geen DOM-rendering of
 * store-setup — alleen filesystem + import-grep. Validates dat:
 *   1. InlineEditableSection.tsx bestaat en de 4 expected exports heeft
 *   2. Alle 13 preview-componenten importeren InlineEditableSection
 *   3. ContentSectionsEditor.tsx is verwijderd
 *   4. WebPageLayout.tsx + MediumConfigLayout.tsx geen ContentSectionsEditor-import meer
 *
 * Live UI-test (klik-edit-save-reload-persistence) is hand-test — zie
 * task-file Smoke Test Plan voor de 8-step manual sequence.
 *
 * Run: `npx tsx scripts/smoke-tests/inline-edit-coverage.ts`
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

const ROOT = process.cwd();
const PREVIEWS_DIR = join(ROOT, 'src/features/campaigns/components/canvas/previews');
const SHARED_FILE = join(PREVIEWS_DIR, 'InlineEditableSection.tsx');

console.log('\n=== inline-edit-coverage smoke ===\n');

// ── 1. Shared component exists with expected exports ──
console.log('## Shared InlineEditableSection.tsx\n');
{
  assert('InlineEditableSection.tsx exists', existsSync(SHARED_FILE));
  if (existsSync(SHARED_FILE)) {
    const src = readFileSync(SHARED_FILE, 'utf8');
    assert('Exports VariantIndexOverrideProvider', src.includes('export function VariantIndexOverrideProvider'));
    assert('Exports useEditableEntry hook', src.includes('export function useEditableEntry'));
    assert('Exports useEditableEntries hook', src.includes('export function useEditableEntries'));
    assert('Exports InlineEditableSection component', src.includes('export function InlineEditableSection'));
    assert('Exports InlineEditableEntry interface', src.includes('export interface InlineEditableEntry'));
    assert('Calls updateComponentContent (API roundtrip)', src.includes('updateComponentContent'));
    assert('Has Pencil-icon affordance', src.includes('Pencil'));
  }
}

// ── 2. Coverage: 13 preview components import InlineEditableSection ──
console.log('\n## Preview consumers (13 expected)\n');
const EXPECTED_PREVIEWS = [
  'LinkedInPostPreview.tsx',
  'LinkedInAdPreview.tsx',
  'LinkedInCarouselPreview.tsx',
  'InstagramPostPreview.tsx',
  'InstagramCarouselPreview.tsx',
  'FacebookPostPreview.tsx',
  'XPostPreview.tsx',
  'EmailPreview.tsx',
  'LandingPagePreview.tsx',
  'VideoPreview.tsx',
  'PodcastPreview.tsx',
  'GenericPreview.tsx',
  'AdditionalComponentsSection.tsx',
];

for (const previewFile of EXPECTED_PREVIEWS) {
  const path = join(PREVIEWS_DIR, previewFile);
  if (!existsSync(path)) {
    assert(`${previewFile} exists`, false, 'file missing');
    continue;
  }
  const src = readFileSync(path, 'utf8');
  const imports = src.includes("from './InlineEditableSection'") ||
                  src.includes('from "./InlineEditableSection"');
  assert(`${previewFile} imports InlineEditableSection`, imports);
}

// ── 3. ContentSectionsEditor is removed ──
console.log('\n## ContentSectionsEditor cleanup\n');
{
  const pathDir = join(ROOT, 'src/features/campaigns/components/canvas/ContentSectionsEditor.tsx');
  const pathPreviewsDir = join(PREVIEWS_DIR, 'ContentSectionsEditor.tsx');
  assert('ContentSectionsEditor.tsx removed (canvas dir)', !existsSync(pathDir));
  assert('ContentSectionsEditor.tsx removed (previews dir)', !existsSync(pathPreviewsDir));
}

// ── 4. WebPageLayout + MediumConfigLayout don't import ContentSectionsEditor ──
console.log('\n## Layout files have no stale ContentSectionsEditor reference\n');
{
  const webPagePath = join(ROOT, 'src/features/campaigns/components/canvas/medium/WebPageLayout.tsx');
  const mediumConfigPath = join(ROOT, 'src/features/campaigns/components/canvas/medium/MediumConfigLayout.tsx');

  // Match only actual imports — historical comment-references are OK
  const importPattern = /^import\s.*ContentSectionsEditor/m;
  if (existsSync(webPagePath)) {
    const src = readFileSync(webPagePath, 'utf8');
    assert('WebPageLayout has no ContentSectionsEditor import', !importPattern.test(src));
  }
  if (existsSync(mediumConfigPath)) {
    const src = readFileSync(mediumConfigPath, 'utf8');
    assert('MediumConfigLayout has no ContentSectionsEditor import', !importPattern.test(src));
  }
}

// ── 5. Step2ContentVariants uses InlineEditable infra (variant-comparison) ──
console.log('\n## Step2ContentVariants integration\n');
{
  const step2Path = join(ROOT, 'src/features/campaigns/components/canvas/accordion/Step2ContentVariants.tsx');
  if (existsSync(step2Path)) {
    const src = readFileSync(step2Path, 'utf8');
    assert(
      'Step2ContentVariants uses VariantIndexOverrideProvider OR useEditableEntries',
      src.includes('VariantIndexOverrideProvider') || src.includes('useEditableEntries'),
    );
  }
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail > 0 ? 1 : 0);
