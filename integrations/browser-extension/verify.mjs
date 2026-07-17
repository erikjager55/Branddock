// =============================================================
// Verificatie van de gebouwde extensie: parseert dist/manifest.json en
// controleert dat alle gerefereerde/benodigde bestanden bestaan en de
// manifest-velden kloppen. Exit 1 bij elke afwijking.
// =============================================================

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const problems = [];

function check(condition, label) {
  if (condition) {
    console.log(`  OK   ${label}`);
  } else {
    problems.push(label);
    console.error(`  FOUT ${label}`);
  }
}

console.log('Manifest controleren…');
const manifestPath = path.join(dist, 'manifest.json');
if (!existsSync(manifestPath)) {
  console.error(`  FOUT dist/manifest.json ontbreekt — draai eerst npm run build`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

check(manifest.manifest_version === 3, 'manifest_version is 3');
check(typeof manifest.name === 'string' && manifest.name.length > 0, 'name aanwezig');
check(/^\d+\.\d+\.\d+$/.test(manifest.version ?? ''), 'version is x.y.z');

for (const permission of ['contextMenus', 'storage', 'activeTab', 'scripting']) {
  check(manifest.permissions?.includes(permission), `permission: ${permission}`);
}
check(manifest.host_permissions?.includes('<all_urls>'), 'host_permissions: <all_urls>');

console.log('Gebouwde bestanden controleren…');
const referenced = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  manifest.options_ui?.page,
  // content.js staat niet in het manifest (on-demand injectie via scripting) —
  // moet wél in dist/ zitten omdat background.js het per bestandsnaam injecteert.
  'content.js',
  'popup.js',
  'options.js',
  'popup.css',
  'options.css',
].filter(Boolean);

for (const file of referenced) {
  check(existsSync(path.join(dist, file)), `dist/${file} bestaat`);
}

// HTML-pagina's moeten hun eigen script daadwerkelijk laden.
for (const [page, script] of [
  ['popup.html', 'popup.js'],
  ['options.html', 'options.js'],
]) {
  const html = readFileSync(path.join(dist, page), 'utf8');
  check(html.includes(`src="${script}"`), `${page} laadt ${script}`);
}

if (problems.length > 0) {
  console.error(`\n${problems.length} probleem(en) gevonden.`);
  process.exit(1);
}
console.log('\nVerificatie geslaagd — dist/ is compleet en consistent.');
