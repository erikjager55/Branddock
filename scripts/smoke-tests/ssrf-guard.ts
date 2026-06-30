// Smoke: SSRF-guard (security-audit 2026-06-26 H1).
// Verifies the bypass payloads the audit found are blocked, plus the allow-path.
// Deterministic — IP-literal / scheme / localhost cases need no network DNS.
//
//   npx tsx scripts/smoke-tests/ssrf-guard.ts

import { isPrivateIp, isPrivateHostname, assertSafeUrl, safeFetch } from "@/lib/utils/ssrf";

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

  // ── safeFetch: per-hop redirect re-validation (H1 punt 1) ──────
  // Scripted fetch so it's deterministic + offline. Only IP literals are used
  // as entry points (no DNS). The security property under test: a redirect to a
  // private/metadata host is rejected BEFORE that host is ever connected to.
  const realFetch = globalThis.fetch;
  const fetched: string[] = [];
  function mockResponse(status: number, location: string | null, type = "default"): Response {
    return {
      type,
      status,
      ok: status >= 200 && status < 300,
      headers: { get: (k: string) => (k.toLowerCase() === "location" ? location : null) },
    } as unknown as Response;
  }
  function installFetch(script: (url: string) => Response) {
    globalThis.fetch = ((input: string | URL | Request) => {
      const u = typeof input === "string" ? input : input.toString();
      fetched.push(u);
      return Promise.resolve(script(u));
    }) as unknown as typeof fetch;
  }
  try {
    // 1. redirect → IMDS is blocked, and the private host is NEVER fetched.
    fetched.length = 0;
    installFetch((u) =>
      u === "http://8.8.8.8/"
        ? mockResponse(302, "http://169.254.169.254/latest/meta-data/")
        : mockResponse(200, null),
    );
    let blocked = false;
    try { await safeFetch("http://8.8.8.8/"); } catch { blocked = true; }
    ok("safeFetch blocks redirect → IMDS", blocked);
    ok("safeFetch never connects to the private redirect target",
      !fetched.some((u) => u.includes("169.254.169.254")));

    // 2. redirect → public host is followed to the final 200.
    fetched.length = 0;
    installFetch((u) =>
      u === "http://1.1.1.1/" ? mockResponse(301, "http://8.8.8.8/final") : mockResponse(200, null),
    );
    let followed = false;
    try { followed = (await safeFetch("http://1.1.1.1/")).status === 200; } catch { followed = false; }
    ok("safeFetch follows redirect → public host", followed);

    // 3. opaque redirect (Location unreadable) fails closed.
    fetched.length = 0;
    installFetch(() => mockResponse(0, null, "opaqueredirect"));
    let opaque = false;
    try { await safeFetch("http://8.8.8.8/"); } catch { opaque = true; }
    ok("safeFetch fails closed on opaque redirect", opaque);

    // 4. an endless redirect loop throws (no infinite hang).
    fetched.length = 0;
    installFetch(() => mockResponse(302, "http://8.8.8.8/next"));
    let tooMany = false;
    try { await safeFetch("http://8.8.8.8/", { maxRedirects: 3 }); } catch { tooMany = true; }
    ok("safeFetch throws on too many redirects", tooMany);
  } finally {
    globalThis.fetch = realFetch;
  }

  console.log(`\nSSRF-guard: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
