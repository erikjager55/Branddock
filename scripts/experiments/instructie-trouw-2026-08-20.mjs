// Instructie-trouw uit BESTAANDE generaties — nul nieuwe AI-calls.
// De briefs stelden zelf een woordbereik ("300-400 woorden"). Dat is een
// expliciet gegeven instructie, dus toetsbaar zonder judge en zonder ruis in
// de MEETLAT zelf.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const ROOT='/Users/erikjager/Projects/branddock-app';
const raw = JSON.parse(readFileSync(`${ROOT}/docs/experiments/2026-08-20-spreiding-raw.json`,'utf8'));
const script = execFileSync('git',['show','origin/main:scripts/experiments/per-content-type-model-2026-08-20.ts'],{cwd:ROOT,encoding:'utf8'});

// bereik per content-type uit de format-regel
const bereik = {};
const blok = script.slice(script.indexOf('const CONTENT_TYPES'), script.indexOf('\n];', script.indexOf('const CONTENT_TYPES')));
let huidig = null;
for (const line of blok.split('\n')) {
  const m = line.match(/id:\s*'([a-z-]+)'/); if (m) huidig = m[1];
  const f = line.match(/format:\s*'(\d+)\s*-\s*(\d+)\s*woorden/);
  if (f && huidig) bereik[huidig] = [Number(f[1]), Number(f[2])];
}
const woorden = (s) => (s||'').trim().split(/\s+/).filter(Boolean).length;

const per = new Map();
let meetbaar = 0;
for (const r of raw.results) {
  const b = bereik[r.contentTypeId]; if (!b) continue;
  meetbaar++;
  const n = woorden(r.output);
  const binnen = n >= b[0] && n <= b[1];
  const afw = binnen ? 0 : (n < b[0] ? (b[0]-n)/b[0] : (n-b[1])/b[1]);
  if (!per.has(r.modelId)) per.set(r.modelId, { in:0, tot:0, afw:[] });
  const p = per.get(r.modelId); p.tot++; if (binnen) p.in++; p.afw.push(afw);
}
console.log(`  content-types met expliciet bereik : ${Object.keys(bereik).length} (${Object.keys(bereik).join(', ')})`);
console.log(`  meetbare generaties                : ${meetbaar} van ${raw.results.length}\n`);
console.log('  model                    binnen bereik   gem. overschrijding');
const rijen=[...per.entries()].map(([m,p])=>({m, pct:p.in/p.tot*100, afw:p.afw.reduce((a,b)=>a+b,0)/p.afw.length*100, tot:p.tot}))
  .sort((a,b)=>b.pct-a.pct);
for (const r of rijen) console.log(`  ${r.m.padEnd(22)} ${(r.pct.toFixed(0)+'%').padStart(8)} (${r.tot})   ${r.afw.toFixed(0)}%`);

// ── Wat kan n=30 dragen? ────────────────────────────────────────────────────
console.log('\n  95%-betrouwbaarheidsinterval (Wald, n=30):');
for (const r of rijen) {
  const p=r.pct/100, se=Math.sqrt(p*(1-p)/r.tot)*100;
  console.log(`  ${r.m.padEnd(22)} ${r.pct.toFixed(0)}%  ±${(1.96*se).toFixed(0)}pp   [${Math.max(0,r.pct-1.96*se).toFixed(0)}–${Math.min(100,r.pct+1.96*se).toFixed(0)}]`);
}
console.log('\n  Overlappen de intervallen? (paarsgewijs, aangrenzend)');
for (let i=0;i<rijen.length-1;i++){
  const a=rijen[i], b=rijen[i+1];
  const sa=Math.sqrt((a.pct/100)*(1-a.pct/100)/a.tot)*100, sb=Math.sqrt((b.pct/100)*(1-b.pct/100)/b.tot)*100;
  const overlap = (a.pct-1.96*sa) < (b.pct+1.96*sb);
  console.log(`  ${a.m.padEnd(20)} vs ${b.m.padEnd(20)} ${overlap?'overlapt — niet te scheiden':'GESCHEIDEN'}`);
}
