// =============================================================
// Build-script: bundelt de vier entrypoints met esbuild naar dist/ en
// kopieert de statische bestanden (manifest, html, css). Bouwt daarnaast
// src/api.ts als ESM naar .test-build/ zodat `node --test` de kern-wrapper
// zonder chrome-context kan testen.
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

// Testartefact: de chrome-vrije API-wrapper als ESM voor node --test.
await esbuild.build({
  entryPoints: [path.join(root, 'src', 'api.ts')],
  outfile: path.join(root, '.test-build', 'api.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'node20',
  sourcemap: false,
  logLevel: 'silent',
});

console.log('Build klaar: dist/ (extensie) + .test-build/api.mjs (tests)');
