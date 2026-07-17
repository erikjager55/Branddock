// Smoke: security-residual-hardening — L6 (help-markdown escape/href-allowlist),
//   L9 (ad-token crypto convergentie + legacy-decrypt backward-compat) en de
//   CSP/security-headers-consolidatie. Pure functies, geen DB.
//
//   npx tsx scripts/smoke-tests/security-residual.ts
//
// Zet een test-key zodat het crypto-pad deterministisch draait, ongeacht de
// lokale env (moet vóór de crypto-imports staan die de key lazy inlezen).
import { randomBytes, createCipheriv } from "crypto";
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { escapeHtml, sanitizeMarkdownHref } from "@/lib/security/html-escape";
import {
  encryptToken,
  decryptToken,
  _resetKeyCacheForTesting,
} from "@/lib/ad-tokens/encryption";
import {
  buildSecurityHeaders,
  buildStaticSecurityHeaders,
  buildReportOnlyCsp,
  CSP_REPORT_ENDPOINT,
  CONTENT_SECURITY_POLICY,
  DEV_CONTENT_SECURITY_POLICY,
} from "@/lib/security/security-headers";

let pass = 0;
let fail = 0;
function ok(label: string, cond: boolean) {
  if (cond) pass++;
  else {
    fail++;
    console.log(`  [FAIL] ${label}`);
  }
}

// ── L6: HTML-escape ─────────────────────────────────────────────────────
ok("escapeHtml neutraliseert <script>", escapeHtml("<script>alert(1)</script>") === "&lt;script&gt;alert(1)&lt;/script&gt;");
ok("escapeHtml escapet dubbele quote", escapeHtml('a "b" c') === "a &quot;b&quot; c");
ok("escapeHtml escapet ampersand eerst", escapeHtml("a & <b>") === "a &amp; &lt;b&gt;");
ok(
  "escapeHtml neutraliseert img-onerror-payload",
  !escapeHtml('<img src=x onerror="alert(1)">').includes("<img"),
);

// ── L6: href-allowlist ──────────────────────────────────────────────────
ok("href https toegestaan", sanitizeMarkdownHref("https://branddock.com") === "https://branddock.com");
ok("href mailto toegestaan", sanitizeMarkdownHref("mailto:help@branddock.com") === "mailto:help@branddock.com");
ok("href javascript: geblokkeerd", sanitizeMarkdownHref("javascript:alert(1)") === null);
ok("href data: geblokkeerd", sanitizeMarkdownHref("data:text/html,<script>1</script>") === null);
ok("href http: (geen s) geblokkeerd", sanitizeMarkdownHref("http://insecure.example") === null);
ok("href met leading spaces + javascript geblokkeerd", sanitizeMarkdownHref("   javascript:alert(1)") === null);

// ── L9: crypto round-trip in het nieuwe v1-formaat ──────────────────────
_resetKeyCacheForTesting();
const secret = "meta-access-token-abc123";
const ct = encryptToken(secret);
ok("encryptToken produceert het versioned v1-formaat", ct.startsWith("v1:"));
ok("decryptToken herstelt de plaintext (v1 round-trip)", decryptToken(ct) === secret);
ok("twee encrypts geven verschillende ciphertext (random IV)", encryptToken(secret) !== encryptToken(secret));

// ── L9: backward-compat — legacy unversioned rij decrypt nog ────────────
// Reproduceer het OUDE on-disk-formaat: base64(iv[12] || tag[16] || ct).
function legacyEncrypt(plain: string): string {
  const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY as string, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}
const legacyCt = legacyEncrypt(secret);
ok("legacy ciphertext heeft GEEN v1-prefix", !legacyCt.startsWith("v1:"));
ok("decryptToken decrypt een bestaande legacy-rij (geen brick)", decryptToken(legacyCt) === secret);

// ── L9: tamper-detectie (GCM-authtag) ───────────────────────────────────
let tampered = false;
try {
  const parts = ct.split(":"); // v1:iv:tag:ct — flip een byte in de ciphertext
  const raw = Buffer.from(parts[3], "base64");
  raw[0] ^= 0xff;
  parts[3] = raw.toString("base64");
  decryptToken(parts.join(":"));
} catch {
  tampered = true;
}
ok("gemanipuleerde ciphertext faalt de auth-tag-check", tampered);

// ── CSP / security-headers-consolidatie ─────────────────────────────────
const prodHeaders = buildSecurityHeaders(true);
const devHeaders = buildSecurityHeaders(false);
ok("prod zet de full Content-Security-Policy (met script-src)", prodHeaders["Content-Security-Policy"] === CONTENT_SECURITY_POLICY && prodHeaders["Content-Security-Policy"].includes("script-src"));
ok("prod zet HSTS", (prodHeaders["Strict-Transport-Security"] ?? "").includes("max-age="));
ok("dev zet de minimale CSP (geen script-src → HMR blijft werken)", devHeaders["Content-Security-Policy"] === DEV_CONTENT_SECURITY_POLICY && !devHeaders["Content-Security-Policy"].includes("script-src"));
ok("dev CSP dekt base-uri + form-action", devHeaders["Content-Security-Policy"].includes("base-uri 'self'") && devHeaders["Content-Security-Policy"].includes("form-action 'self'"));
ok("dev zet GEEN HSTS", devHeaders["Strict-Transport-Security"] === undefined);
ok("Permissions-Policy consistent (interest-cohort in beide)", devHeaders["Permissions-Policy"].includes("interest-cohort=()"));
ok("X-Frame-Options DENY in beide omgevingen", prodHeaders["X-Frame-Options"] === "DENY" && devHeaders["X-Frame-Options"] === "DENY");
ok("enforce-CSP staat PostHog-ingest toe in connect-src", CONTENT_SECURITY_POLICY.includes("connect-src 'self' https://api.stripe.com https://eu.i.posthog.com"));

// ── Nonce-migratie stap 1+2: statische laag zonder CSP + Report-Only-CSP ─
const staticProd = buildStaticSecurityHeaders(true);
const staticDev = buildStaticSecurityHeaders(false);
ok("statische laag (next.config) zendt GEEN CSP meer", staticProd["Content-Security-Policy"] === undefined && staticDev["Content-Security-Policy"] === undefined);
ok("statische laag behoudt HSTS in prod", (staticProd["Strict-Transport-Security"] ?? "").includes("max-age="));
ok("statische laag behoudt de base-headers", staticProd["X-Frame-Options"] === "DENY" && staticDev["X-Content-Type-Options"] === "nosniff");

const roCsp = buildReportOnlyCsp("test-nonce-abc");
ok("Report-Only-CSP bevat de per-request nonce", roCsp.includes("'nonce-test-nonce-abc'"));
ok("Report-Only-CSP gebruikt strict-dynamic", roCsp.includes("'strict-dynamic'"));
ok("Report-Only-CSP rapporteert naar de collector-route", roCsp.includes(`report-uri ${CSP_REPORT_ENDPOINT}`));
ok("Report-Only-CSP bevat bewust GEEN unsafe-inline/unsafe-eval (dat is de meting)", !roCsp.includes("unsafe-inline") && !roCsp.includes("unsafe-eval"));

console.log(`\nsecurity-residual: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
