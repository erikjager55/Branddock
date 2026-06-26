// Smoke: SSRF-guard (security-audit 2026-06-26 H1).
// Verifies the bypass payloads the audit found are blocked, plus the allow-path.
// Deterministic — IP-literal / scheme / localhost cases need no network DNS.
//
//   npx tsx scripts/smoke-tests/ssrf-guard.ts

import { isPrivateIp, isPrivateHostname, assertSafeUrl } from "@/lib/utils/ssrf";

let pass = 0;
let fail = 0;
function ok(label: string, cond: boolean) {
  if (cond) { pass++; } else { fail++; console.log(`  ✗ ${label}`); }
}

// ── isPrivateIp ───────────────────────────────────────────────
const BLOCK_IPS = [
  "127.0.0.1", "10.0.0.1", "172.16.5.4", "172.31.255.255", "192.168.1.1",
  "169.254.169.254", "0.0.0.0", "100.64.0.1", "100.127.255.255",
  "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1",
  "::ffff:169.254.169.254",            // IPv4-mapped, dotted
  "::ffff:a9fe:a9fe",                  // IPv4-mapped, HEX (the gold-standard gap)
  "::ffff:10.0.0.1", "::ffff:7f00:1",  // mapped RFC1918 + loopback (hex 127.0.0.1)
  "64:ff9b::169.254.169.254",          // NAT64 well-known prefix, dotted
  "64:ff9b::a9fe:a9fe",                // NAT64, hex
  "::169.254.169.254", "::a9fe:a9fe",  // IPv4-compatible (deprecated), dotted + hex
];
for (const ip of BLOCK_IPS) ok(`isPrivateIp blocks ${ip}`, isPrivateIp(ip) === true);

const ALLOW_IPS = ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111", "172.15.0.1", "172.32.0.1"];
for (const ip of ALLOW_IPS) ok(`isPrivateIp allows ${ip}`, isPrivateIp(ip) === false);

// ── isPrivateHostname (sync; bracket-strip) ───────────────────
const BLOCK_HOSTS = [
  "localhost", "foo.localhost", "printer.local",
  "[::1]", "[::ffff:169.254.169.254]", "[::ffff:a9fe:a9fe]",
  "169.254.169.254", "10.1.2.3",
];
for (const h of BLOCK_HOSTS) ok(`isPrivateHostname blocks ${h}`, isPrivateHostname(h) === true);
const ALLOW_HOSTS = ["example.com", "branddock.app", "8.8.8.8", "[2606:4700:4700::1111]"];
for (const h of ALLOW_HOSTS) ok(`isPrivateHostname allows ${h}`, isPrivateHostname(h) === false);

// ── assertSafeUrl (async; no DNS for literals/scheme/localhost) ─
async function blocks(url: string): Promise<boolean> {
  try { await assertSafeUrl(url); return false; } catch { return true; }
}
async function allows(url: string): Promise<boolean> {
  try { await assertSafeUrl(url); return true; } catch { return false; }
}

async function main() {
  const BLOCK_URLS = [
    "http://[::ffff:169.254.169.254]/latest/meta-data/",  // F1 AWS IMDS via mapped IPv6
    "http://[::ffff:a9fe:a9fe]/",                          // F1 hex form
    "http://169.254.169.254/latest/meta-data/",            // direct IMDS
    "http://[::1]/", "http://127.0.0.1:6379/", "http://10.0.0.1/", "http://localhost:5432/",
    "http://[64:ff9b::a9fe:a9fe]/", "http://[::169.254.169.254]/",  // NAT64 + IPv4-compatible
    "ftp://example.com/", "file:///etc/passwd", "gopher://x/",  // scheme allowlist
  ];
  for (const u of BLOCK_URLS) ok(`assertSafeUrl blocks ${u}`, await blocks(u));

  // Allow: public IP literals (no DNS needed → deterministic offline).
  for (const u of ["http://8.8.8.8/", "https://1.1.1.1/"]) {
    ok(`assertSafeUrl allows ${u}`, await allows(u));
  }

  console.log(`\nSSRF-guard: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
