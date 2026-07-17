// pilot-meting — meting van de pilot-succes-criteria (C1-C5) tegen een
// draaiende Branddock-instantie (lokaal of prod), via het developer-only
// endpoint /api/admin/pilot-metrics. Drempels + matrix:
// docs/playbooks/pilot-succes-definitie.md (bekrachtigd 2026-07-17).
//
// Gebruik:
//   PILOT_EMAIL=… PILOT_PASSWORD=… node scripts/dev/pilot-meting.mjs
//   env: PILOT_BASE_URL   (default http://localhost:3000; prod: https://branddock-7y9n.vercel.app)
//        PILOT_WORKSPACE  (name-contains, default "Better Brands")
//        PILOT_WEEKS      (default 4, max 12)
// Vereist: account in DEVELOPER_EMAILS van de doel-instantie.

const BASE = process.env.PILOT_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.PILOT_EMAIL;
const PASSWORD = process.env.PILOT_PASSWORD;
// PILOT_WORKSPACE_ID (exact, heeft voorrang) — naam-lookup kan meerdere
// workspaces raken; de prod-pilot-workspace is cmr4znouo000204ic257g3gcn.
const WORKSPACE_ID = process.env.PILOT_WORKSPACE_ID;
const WORKSPACE = process.env.PILOT_WORKSPACE ?? 'Better Brands';
const WEEKS = Number(process.env.PILOT_WEEKS ?? 4);

// Bekrachtigde week-drempels (2026-07-17). C5 = actieve weken in het venster.
const DREMPELS = { c1: 3, c2: 1, c3: 2, c4: 1, c5ActieveWeken: 2 };
// Venster-verdict = laatste N vólledige weken (lopende week telt niet mee).
const VENSTER_WEKEN = 2;

if (!EMAIL || !PASSWORD) {
  console.error('Zet PILOT_EMAIL en PILOT_PASSWORD (account in DEVELOPER_EMAILS).');
  process.exit(1);
}

// ── 1. Login (Better Auth email/password) → session-cookies ────────────────
// Better Auth weigert sign-ins zonder geldige Origin-header (CSRF-guard). De
// origin moet matchen met BETTER_AUTH_URL van de doel-instantie — op prod is
// dat gelijk aan BASE; lokaal op een afwijkende poort: PILOT_ORIGIN zetten.
const ORIGIN = process.env.PILOT_ORIGIN ?? BASE;
const loginRes = await fetch(`${BASE}/api/auth/sign-in/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: ORIGIN },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
if (!loginRes.ok) {
  console.error(`Login faalde: ${loginRes.status} ${await loginRes.text()}`);
  process.exit(1);
}
const setCookies = loginRes.headers.getSetCookie?.() ?? [loginRes.headers.get('set-cookie')].filter(Boolean);
const cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
if (!cookie) {
  console.error('Login gaf 200 maar geen session-cookie.');
  process.exit(1);
}

// ── 2. Metrics ophalen ──────────────────────────────────────────────────────
const qs = WORKSPACE_ID
  ? `workspaceId=${encodeURIComponent(WORKSPACE_ID)}&weeks=${WEEKS}`
  : `workspaceName=${encodeURIComponent(WORKSPACE)}&weeks=${WEEKS}`;
const metricsRes = await fetch(`${BASE}/api/admin/pilot-metrics?${qs}`, { headers: { cookie } });
if (metricsRes.status === 403) {
  console.error(`403 — '${EMAIL}' staat niet in DEVELOPER_EMAILS van ${BASE}.`);
  process.exit(1);
}
if (metricsRes.status === 409) {
  const conflict = await metricsRes.json();
  console.error('Meerdere workspaces matchen deze naam — kies er één via PILOT_WORKSPACE_ID:');
  for (const c of conflict.candidates ?? []) {
    console.error(`  ${c.id}  "${c.name}"  (aangemaakt ${c.createdAt?.slice(0, 10)})`);
  }
  process.exit(1);
}
if (!metricsRes.ok) {
  console.error(`Metrics faalde: ${metricsRes.status} ${await metricsRes.text()}`);
  process.exit(1);
}
const data = await metricsRes.json();

// ── 3. Per week evalueren ───────────────────────────────────────────────────
const weken = data.weeks.map((w) => {
  const c1 = w.generated;
  // C2: LearningEvent is primair; publishedAt-count vangt paden die (nog) geen event emitten.
  const c2 = Math.max(w.publishedEvents, w.publishedDeliverables);
  const c3 = w.fidelityText + w.fidelityVisual;
  const c4 = w.agentManualRuns + w.artifactsAccepted + w.artifactsDismissed;
  const actief = c1 >= DREMPELS.c1 || c4 >= DREMPELS.c4;
  return { ...w, c1, c2, c3, c4, actief };
});

const ok = (v, drempel) => (v >= drempel ? '✅' : '❌');
console.log(`\nPilot-meting — workspace "${data.workspace.name}" (${data.workspace.id}) @ ${BASE}`);
console.log(`Gemeten: ${data.generatedAt}\n`);
console.log('Week (ma)   | C1 gen | C2 pub | C3 fval | C4 agent | actief | (sched-runs)');
console.log('------------|--------|--------|---------|----------|--------|-------------');
for (const w of weken) {
  const lopend = w === weken[weken.length - 1] ? ' ←lopend' : '';
  console.log(
    `${w.weekStart}  | ${String(w.c1).padStart(3)} ${ok(w.c1, DREMPELS.c1)} | ${String(w.c2).padStart(3)} ${ok(w.c2, DREMPELS.c2)} | ` +
      `${String(w.c3).padStart(4)} ${ok(w.c3, DREMPELS.c3)} | ${String(w.c4).padStart(5)} ${ok(w.c4, DREMPELS.c4)} | ` +
      `${w.actief ? '  ja  ' : ' nee  '} | ${w.agentScheduledRuns}${lopend}`,
  );
}

// ── 4. Venster-verdict (laatste VENSTER_WEKEN volledige weken) ──────────────
const volledig = weken.slice(0, -1);
const venster = volledig.slice(-VENSTER_WEKEN);
if (venster.length < VENSTER_WEKEN) {
  console.log(`\n⚠️  Te weinig volledige weken voor een venster-verdict (${venster.length}/${VENSTER_WEKEN}). Verhoog PILOT_WEEKS.`);
  process.exit(0);
}

const avg = (key) => venster.reduce((sum, w) => sum + w[key], 0) / venster.length;
const actieveWeken = venster.filter((w) => w.actief).length;
const criteria = [
  { naam: 'C1 gegenereerd/wk', waarde: avg('c1'), drempel: DREMPELS.c1 },
  { naam: 'C2 gepubliceerd/wk', waarde: avg('c2'), drempel: DREMPELS.c2 },
  { naam: 'C3 F-VAL-runs/wk', waarde: avg('c3'), drempel: DREMPELS.c3 },
  { naam: 'C4 agent-interactie/wk', waarde: avg('c4'), drempel: DREMPELS.c4 },
  { naam: 'C5 actieve weken', waarde: actieveWeken, drempel: DREMPELS.c5ActieveWeken },
];

console.log(`\nVenster-verdict over ${venster[0].weekStart} t/m ${venster[venster.length - 1].weekEnd} (gemiddelde/week):`);
let gehaald = 0;
for (const c of criteria) {
  const halt = c.waarde >= c.drempel;
  if (halt) gehaald += 1;
  console.log(`  ${halt ? '✅' : '❌'} ${c.naam}: ${Number(c.waarde.toFixed(1))} (drempel ${c.drempel})`);
}

const verdict = gehaald >= 4 ? '🟢 GROEN — opschalen (testers + TOPUP agenderen)'
  : gehaald >= 2 ? '🟠 ORANJE — niet opschalen; diagnose + onboarding-fix, daarna venster 2'
  : '🔴 ROOD — niet opschalen; framing/onboarding herzien vóór er testers bij komen';
console.log(`\n${gehaald}/5 criteria gehaald → ${verdict}`);
console.log('Matrix + consequenties: docs/playbooks/pilot-succes-definitie.md\n');
