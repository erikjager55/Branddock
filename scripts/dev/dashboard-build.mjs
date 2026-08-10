#!/usr/bin/env node
/**
 * Genereert docs/dashboard/branddock-dashboard.html uit:
 *  - tasks/*.md            (frontmatter = feiten: title, status, effort, fase, priority)
 *  - tasks/done/           (teller)
 *  - docs/dashboard/stuurdata.json (redactie: klasse, kritiek pad, live-stand, vragen, besluiten)
 *  - docs/dashboard/template.html  (weergave; placeholder __DASHBOARD_DATA__)
 *
 * Gebruik: node scripts/dev/dashboard-build.mjs
 * Daarna: artifact herpubliceren naar dezelfde URL (zie docs/dashboard/README.md).
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tasksDir = join(root, "tasks");
const dashDir = join(root, "docs", "dashboard");

function parseTask(file) {
  const raw = readFileSync(join(tasksDir, file), "utf8");
  const out = { id: file.replace(/\.md$/, ""), file: `tasks/${file}` };
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (fm) {
    for (const line of fm[1].split("\n")) {
      const m = line.match(/^([a-z-]+):\s*(.*)$/i);
      if (m) out[m[1].trim()] = m[2].trim();
    }
  } else {
    // bullet-stijl (bv. kpi-fase0): "# id — titel" + "- **Status**: x"
    const h = raw.match(/^#\s+(?:[\w-]+\s+—\s+)?(.+)$/m);
    if (h) out.title = h[1].trim();
    const st = raw.match(/^-\s+\*\*Status\*\*:\s*(.+)$/m);
    if (st) out.status = st[1].trim();
  }
  out.title = out.title || out.id;
  out.status = (out.status || "onbekend").toLowerCase();
  return out;
}

const files = readdirSync(tasksDir).filter(
  (f) => f.endsWith(".md") && !f.startsWith("_")
);
const parsed = files.map(parseTask);
const doneCount = readdirSync(join(tasksDir, "done")).filter((f) =>
  f.endsWith(".md")
).length;

const stuur = JSON.parse(readFileSync(join(dashDir, "stuurdata.json"), "utf8"));

// Samenvoegen: feiten uit frontmatter + redactie uit stuurdata
const docSync = [];
const items = [];
for (const t of parsed) {
  const s = stuur.taken[t.id];
  if (!s) {
    docSync.push(`\`${t.id}\` heeft geen klasse in stuurdata.json — ken A/B/C toe`);
  }
  if (t.status === "done") {
    docSync.push(`\`${t.id}\` staat op status done maar ligt nog in tasks/ (hoort in tasks/done/)`);
  }
  items.push({
    id: t.id,
    titel: t.title,
    klasse: s?.klasse || "?",
    oms: s?.oms || t.title,
    status: s?.statusOverride || t.status,
    pillType:
      s?.pillType ||
      (t.status === "done"
        ? "deels"
        : t.status === "blocked"
          ? "block"
          : s?.gate
            ? "gate"
            : t.status === "in-progress"
              ? "deels"
              : "open"),
    gate: s?.gate || null,
    vragen: s?.vragen || [],
    effort: t.effort || null,
    fase: t.fase || null,
    bron: t.file,
  });
}
for (const v of stuur.virtueleTaken || []) {
  items.push({ ...v, virtueel: true, vragen: v.vragen || [], gate: v.gate || null });
}
// Stuurdata-entries zonder bestand signaleren
for (const id of Object.keys(stuur.taken)) {
  if (!parsed.some((t) => t.id === id))
    docSync.push(`stuurdata.json kent \`${id}\` maar tasks/${id}.md bestaat niet (afgerond? verwijder de entry)`);
}

const data = {
  peildatum: stuur.peildatum,
  gegenereerd: process.env.DASHBOARD_DATUM || stuur.peildatum,
  fase: stuur.fase,
  doneCount,
  openCount: parsed.filter((t) => t.status !== "done").length,
  liveStand: stuur.liveStand,
  kritiekPad: stuur.kritiekPad,
  klassen: stuur.klassen,
  items,
  besluiten: stuur.besluiten,
  advies: stuur.advies,
  docSync,
};

const template = readFileSync(join(dashDir, "template.html"), "utf8");
const json = JSON.stringify(data).replace(/<\//g, "<\\/");
writeFileSync(
  join(dashDir, "branddock-dashboard.html"),
  template.replace("__DASHBOARD_DATA__", json)
);

console.log(
  `Dashboard gegenereerd: ${items.length} items (${parsed.length} task-files + ${(stuur.virtueleTaken || []).length} virtueel), ${doneCount} done.`
);
if (docSync.length) {
  console.log(`\nDoc-sync-afwijkingen (${docSync.length}) — staan ook op het dashboard:`);
  for (const d of docSync) console.log(`  - ${d}`);
}
