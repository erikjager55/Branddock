// =============================================================
// Build-script: bundelt de vier entrypoints met esbuild naar dist/ en
// kopieert de statische bestanden (manifest, html, css). Bouwt daarnaast
// de chrome-vrije modules (api, oauth, mcp) als ESM naar .test-build/
// zodat `node --test` ze zonder chrome-context kan testen.
// =============================================================

import * as esbuild from 'esbuild';
import { cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');

rmSync(dist, { recursive: true, force: true });

// Extensie-bundles: klassieke scripts (iife) — geldig voor MV3 service-worker
// zonder "type": "module", content-scripts en pagina-scripts.
await esbuild.build({
  entryPoints: ['background', 'content', 'popup', 'options'].map((name) =>
    path.join(root, 'src', `${name}.ts`),
  ),
  outdir: dist,
  bundle: true,
  format: 'iife',
  target: 'chrome110',
  sourcemap: false,
  minify: false,
  logLevel: 'info',
});

cpSync(path.join(root, 'static'), dist, { recursive: true });

// Testartefacten: de chrome-vrije modules als ESM voor node --test.
// Elk artefact is een zelfstandige bundle (oauth/mcp nemen hun api-imports
// mee); tests importeren error-klassen daarom uit dezelfde bundle als de
// geteste functie zodat instanceof-checks kloppen.
await esbuild.build({
  entryPoints: ['api', 'oauth', 'mcp'].map((name) => path.join(root, 'src', `${name}.ts`)),
  outdir: path.join(root, '.test-build'),
  outExtension: { '.js': '.mjs' },
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'node20',
  sourcemap: false,
  logLevel: 'silent',
});

console.log('Build klaar: dist/ (extensie) + .test-build/*.mjs (tests)');
