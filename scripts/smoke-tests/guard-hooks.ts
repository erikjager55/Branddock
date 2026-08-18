/**
 * Smoke — de twee veiligheidshooks (`session-guard.sh` + `check-dangerous-bash.sh`).
 *
 * Roept de hooks écht aan met geprepareerde PreToolUse-JSON op stdin, tegen echte
 * git-repo's en echte lockfiles met een verse heartbeat. Geen tweede Claude-sessie
 * nodig: de lock ís het hele co-sessie-mechanisme.
 *
 * Draait ook een MUTATIETEST (`--mutate`): een bewust gebroken kopie van elke hook
 * moet zichtbaar rijen laten omvallen. Een smoke die groen blijft nadat je de
 * blokkeer-tak eruit sloopt bewijst niets — les gotchas.md 2026-08-18.
 *
 * Gebruik:  npm run smoke:guard-hooks
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = process.cwd();
const MY_SID = 'sid-mine-0000';
const OTHER_SID = 'sid-other-1111';

interface HookResult {
  code: number;
  stderr: string;
  stdout: string;
}

interface Case {
  name: string;
  hook: 'session-guard.sh' | 'check-dangerous-bash.sh';
  command: string;
  cwd: string;
  /** Lockfiles die vóór de run gezet worden: pad → session-id van de houder. */
  locks?: Record<string, string>;
  expectCode: 0 | 2;
  /** Substring die in stderr moet voorkomen (bewijst dat de júiste tak liep). */
  expectStderr?: string;
}

function sh(cmd: string, args: string[], cwd: string): void {
  execFileSync(cmd, args, { cwd, stdio: 'pipe' });
}

/** Maakt een echte git-repo met één commit op de gevraagde branch. */
function makeRepo(root: string, branch: string): string {
  mkdirSync(root, { recursive: true });
  sh('git', ['init', '-q', '-b', branch], root);
  sh('git', ['config', 'user.email', 'smoke@test.local'], root);
  sh('git', ['config', 'user.name', 'Smoke'], root);
  writeFileSync(join(root, 'README.md'), '# smoke\n');
  sh('git', ['add', '.'], root);
  sh('git', ['commit', '-qm', 'init'], root);
  return root;
}

/** Lockfile met een verse heartbeat — precies wat de guard als "levend" leest. */
function writeLock(worktree: string, sid: string): void {
  const now = Math.floor(Date.now() / 1000);
  writeFileSync(join(worktree, '.claude-session.lock'), `${sid}\n${now}\nmain\n`);
}

function clearLock(worktree: string): void {
  rmSync(join(worktree, '.claude-session.lock'), { force: true });
}

function runHook(hooksDir: string, hook: string, command: string, cwd: string): HookResult {
  const payload = JSON.stringify({
    session_id: MY_SID,
    cwd,
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command },
  });
  const res = spawnSync('bash', [join(hooksDir, hook)], {
    input: payload,
    encoding: 'utf8',
  });
  return {
    code: res.status ?? -1,
    stderr: res.stderr ?? '',
    stdout: res.stdout ?? '',
  };
}

function buildCases(wt1: string, wt2: string): Case[] {
  // wt1 staat op `main`, wt2 op `feat/test`.
  return [
    {
      name: '1. git checkout in dezelfde worktree, co-sessie leeft → blokkeren',
      hook: 'session-guard.sh',
      command: 'git checkout main',
      cwd: wt1,
      locks: { [wt1]: OTHER_SID },
      expectCode: 2,
      expectStderr: 'GEBLOKKEERD',
    },
    {
      name: '2. idem zonder co-sessie → doorlaten',
      hook: 'session-guard.sh',
      command: 'git checkout main',
      cwd: wt1,
      locks: { [wt1]: MY_SID },
      expectCode: 0,
    },
    {
      name: '3. cd naar ANDERE worktree, co-sessie alleen in wt1 → doorlaten (was blokkeren)',
      hook: 'session-guard.sh',
      command: `cd ${wt2} && git checkout feat/test`,
      cwd: wt1,
      locks: { [wt1]: OTHER_SID },
      expectCode: 0,
    },
    {
      name: '4. git -C naar wt2 terwijl de co-sessie ÍN wt2 zit → blokkeren',
      hook: 'session-guard.sh',
      command: `git -C ${wt2} checkout feat/test`,
      cwd: wt1,
      locks: { [wt2]: OTHER_SID },
      expectCode: 2,
      expectStderr: wt2,
    },
    {
      name: '5. git worktree add → doorlaten (was blokkeren)',
      hook: 'session-guard.sh',
      command: 'git worktree add ../nieuw -b feat/nieuw origin/main',
      cwd: wt1,
      locks: { [wt1]: OTHER_SID },
      expectCode: 0,
    },
    {
      name: '6. gh pr merge + co-sessie → doorlaten MET waarschuwing',
      hook: 'session-guard.sh',
      command: 'gh pr merge 311 --squash --delete-branch',
      cwd: wt1,
      locks: { [wt1]: OTHER_SID },
      expectCode: 0,
      expectStderr: 'ls-remote',
    },
    {
      name: '7. git reset --hard <sha> op een feature-branch → doorlaten',
      hook: 'check-dangerous-bash.sh',
      command: 'git reset --hard abc1234',
      cwd: wt2,
      expectCode: 0,
    },
    {
      name: '8. git reset --hard <sha> op main → blokkeren (was doorlaten!)',
      hook: 'check-dangerous-bash.sh',
      command: 'git reset --hard abc1234',
      cwd: wt1,
      expectCode: 2,
      expectStderr: 'reset --hard',
    },
    {
      name: '9. git push --force-with-lease op feature-branch → doorlaten (was blokkeren)',
      hook: 'check-dangerous-bash.sh',
      command: 'git push --force-with-lease',
      cwd: wt2,
      expectCode: 0,
    },
    {
      name: '10. git push --force origin main → blokkeren',
      hook: 'check-dangerous-bash.sh',
      command: 'git push --force origin main',
      cwd: wt2,
      expectCode: 2,
      expectStderr: 'beschermde branch',
    },
    {
      name: '11. rm -rf / → blokkeren',
      hook: 'check-dangerous-bash.sh',
      command: 'rm -rf /',
      cwd: wt2,
      expectCode: 2,
      expectStderr: 'onherstelbaar',
    },
    {
      // Regressie op het gat dat de smoke zelf blootlegde: de verb-regexes eisten
      // het werkwoord dírect achter `git`, dus `git -C <pad> reset --hard` glipte
      // er in BEIDE hooks langs — ook in de versie van vóór 18-08.
      name: '13. git -C <wt1-op-main> reset --hard → blokkeren (verb achter -C)',
      hook: 'check-dangerous-bash.sh',
      command: `git -C ${wt1} reset --hard abc1234`,
      cwd: wt2,
      expectCode: 2,
      expectStderr: 'reset --hard',
    },
    {
      name: '12. onbepaalbaar doel (variabele) + co-sessie → doorlaten (fail-open)',
      hook: 'session-guard.sh',
      command: 'cd "$SOME_DIR" && git checkout main',
      cwd: wt1,
      locks: { [wt1]: OTHER_SID },
      expectCode: 0,
    },
  ];
}

function runMatrix(hooksDir: string, cases: Case[], wts: string[], verbose: boolean): number {
  let failed = 0;
  for (const c of cases) {
    for (const wt of wts) clearLock(wt);
    for (const [wt, sid] of Object.entries(c.locks ?? {})) writeLock(wt, sid);

    const res = runHook(hooksDir, c.hook, c.command, c.cwd);
    const codeOk = res.code === c.expectCode;
    const strOk = !c.expectStderr || res.stderr.includes(c.expectStderr);
    const ok = codeOk && strOk;

    if (!ok) failed++;
    if (verbose || !ok) {
      console.log(`${ok ? '  ✅' : '  ❌'} ${c.name}`);
      if (!ok) {
        if (!codeOk) console.log(`       exit ${res.code}, verwacht ${c.expectCode}`);
        if (!strOk) console.log(`       stderr mist "${c.expectStderr}"`);
      }
    }
  }
  return failed;
}

/** Kopieert de hooks naar een temp-dir en past één bewuste breuk toe. */
function mutate(hooksSrc: string, tmp: string, name: string, apply: (dir: string) => void): string {
  const dir = join(tmp, `hooks-${name}`);
  cpSync(hooksSrc, dir, { recursive: true });
  apply(dir);
  return dir;
}

function patch(file: string, from: string, to: string): void {
  const before = readFileSync(file, 'utf8');
  if (!before.includes(from)) throw new Error(`mutatie-anker niet gevonden in ${file}: ${from}`);
  writeFileSync(file, before.replace(from, to));
}

function main(): void {
  const tmp = mkdtempSync(join(tmpdir(), 'guard-hooks-'));
  const hooksSrc = join(REPO, '.claude', 'hooks');
  let exitCode = 0;

  try {
    const wt1 = makeRepo(join(tmp, 'wt1'), 'main');
    const wt2 = makeRepo(join(tmp, 'wt2'), 'feat/test');
    const wts = [wt1, wt2];
    const cases = buildCases(wt1, wt2);

    console.log(`\nGuard-hooks smoke — ${cases.length} scenario's\n`);
    const failed = runMatrix(hooksSrc, cases, wts, true);
    console.log(`\n${cases.length - failed}/${cases.length} geslaagd`);
    if (failed > 0) exitCode = 1;

    // ── Mutatietest ──────────────────────────────────────────────────────────
    // Bewijst dat de matrix hierboven een defect kán zien. Een smoke die groen
    // blijft na het slopen van de blokkeer-tak toetst niets.
    console.log('\nMutatietest — elke breuk moet rijen laten omvallen:');

    const mutations: Array<{ name: string; dir: string; minFailures: number }> = [
      {
        name: 'session-guard: blokkeer-tak uitgeschakeld',
        dir: mutate(hooksSrc, tmp, 'no-block', (d) =>
          patch(join(d, 'session-guard.sh'), '    exit 2\n  fi\ndone <<<', '    exit 0\n  fi\ndone <<<'),
        ),
        minFailures: 2, // rij 1 en 4
      },
      {
        name: 'guard-lib: geen enkele branch is nog beschermd',
        dir: mutate(hooksSrc, tmp, 'no-protect', (d) =>
          patch(join(d, 'lib', 'guard-lib.sh'), 'GUARD_PROTECTED_BRANCHES="main master"', 'GUARD_PROTECTED_BRANCHES=""'),
        ),
        minFailures: 1, // rij 8
      },
      {
        name: 'check-dangerous-bash: CRITICAL-lijst leeggehaald',
        dir: mutate(hooksSrc, tmp, 'no-critical', (d) =>
          patch(join(d, 'check-dangerous-bash.sh'), '  "rm -rf /"\n', ''),
        ),
        minFailures: 1, // rij 11
      },
    ];

    for (const m of mutations) {
      const n = runMatrix(m.dir, cases, wts, false);
      const ok = n >= m.minFailures;
      if (!ok) exitCode = 1;
      console.log(`  ${ok ? '✅' : '❌'} ${m.name} → ${n} rij(en) omgevallen (min ${m.minFailures})`);
    }

    console.log(exitCode === 0 ? '\n✅ Alles groen\n' : '\n❌ Smoke gefaald\n');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  process.exit(exitCode);
}

main();
