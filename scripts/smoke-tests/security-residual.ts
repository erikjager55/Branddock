// Smoke: security-residual-hardening — L6 (help-markdown escape/href-allowlist),
//   L9 (ad-token crypto convergentie + legacy-decrypt backward-compat) en de
//   CSP/security-headers-consolidatie. Pure functies, geen DB.
//
//   npx tsx scripts/smoke-tests/security-residual.ts
//
// Zet een test-key zodat het crypto-pad deterministisch draait, ongeacht de
// lokale env (moet vóór de crypto-imports staan die de key lazy inlezen).
import { randomBytes, createCipheriv, createHash } from "crypto";
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { escapeHtml, sanitizeMarkdownHref } from "@/lib/security/html-escape";
import { buildPageRuntimeScriptBody } from "@/lib/landing-pages/static-compile";
import {
  encryptToken,
  decryptToken,
  _resetKeyCacheForTesting,
} from "@/lib/ad-tokens/encryption";
import {
  buildRequestSecurityHeaders,
  buildStaticSecurityHeaders,
  buildContentSecurityPolicy,
  CSP_REPORT_ENDPOINT,
  LANDING_PAGE_SCRIPT_HASHES,
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
const NONCE = "test-nonce-abc";
const prodHeaders = buildRequestSecurityHeaders(true, { scope: "app", nonce: NONCE });
const devHeaders = buildRequestSecurityHeaders(false, { scope: "app", nonce: NONCE });
ok("prod zet de full Content-Security-Policy (met script-src)", (prodHeaders["Content-Security-Policy"] ?? "").includes("script-src"));
ok("prod zet HSTS", (prodHeaders["Strict-Transport-Security"] ?? "").includes("max-age="));
ok("dev zet de minimale CSP (geen script-src → HMR blijft werken)", devHeaders["Content-Security-Policy"] === DEV_CONTENT_SECURITY_POLICY && !devHeaders["Content-Security-Policy"].includes("script-src"));
ok("dev CSP dekt base-uri + form-action", devHeaders["Content-Security-Policy"].includes("base-uri 'self'") && devHeaders["Content-Security-Policy"].includes("form-action 'self'"));
ok("dev zet GEEN HSTS", devHeaders["Strict-Transport-Security"] === undefined);
ok("Permissions-Policy consistent (interest-cohort in beide)", devHeaders["Permissions-Policy"].includes("interest-cohort=()"));
ok("X-Frame-Options DENY in beide omgevingen", prodHeaders["X-Frame-Options"] === "DENY" && devHeaders["X-Frame-Options"] === "DENY");

// ── Nonce-migratie stap 3: enforce-flip ─────────────────────────────────
const appCsp = buildContentSecurityPolicy({ scope: "app", nonce: NONCE });
const lpCsp = buildContentSecurityPolicy({ scope: "landing-page", nonce: NONCE });

ok("enforce-CSP bevat de per-request nonce", appCsp.includes(`'nonce-${NONCE}'`));
ok("enforce-CSP gebruikt strict-dynamic", appCsp.includes("'strict-dynamic'"));
ok("enforce-CSP heeft GEEN unsafe-inline/unsafe-eval meer", !appCsp.includes("unsafe-inline") || !appCsp.split(";").find((d) => d.trim().startsWith("script-src"))?.includes("unsafe-inline"));
ok("script-src is vrij van unsafe-* (de kern van de flip)", (() => {
  const scriptSrc = appCsp.split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src")) ?? "";
  return !scriptSrc.includes("unsafe-inline") && !scriptSrc.includes("unsafe-eval");
})());
ok("enforce-CSP blijft rapporteren naar de collector", appCsp.includes(`report-uri ${CSP_REPORT_ENDPOINT}`));
ok("app-scope draagt GEEN landingspagina-hashes", !LANDING_PAGE_SCRIPT_HASHES.some((h) => appCsp.includes(h)));
ok("landing-page-scope draagt beide snippet-hashes", LANDING_PAGE_SCRIPT_HASHES.every((h) => lpCsp.includes(h)));
ok("landing-page-scope houdt nonce + strict-dynamic", lpCsp.includes(`'nonce-${NONCE}'`) && lpCsp.includes("'strict-dynamic'"));
ok("enforce-CSP staat beide PostHog-hosts toe in connect-src", (() => {
  const connect = appCsp.split(";").map((d) => d.trim()).find((d) => d.startsWith("connect-src")) ?? "";
  return connect.includes("https://eu.i.posthog.com") && connect.includes("https://eu-assets.i.posthog.com");
})());

// Drift-bewaking: de hashes staan als constante in de edge-module (geen
// node:crypto daar). Deze check hercomputeert ze uit de échte snippets, zodat
// een wijziging aan het script niet stil élk gepubliceerd artifact breekt.
const recomputed = [false, true].map((withForms) =>
  `'sha256-${createHash("sha256").update(buildPageRuntimeScriptBody({ withForms }), "utf8").digest("base64")}'`,
);
ok("snippet-hashes komen overeen met de echte buildPageRuntimeScriptBody-output", recomputed.every((h) => (LANDING_PAGE_SCRIPT_HASHES as readonly string[]).includes(h)));

// ── Nonce-migratie stap 1+2: statische laag zonder CSP ──────────────────
const staticProd = buildStaticSecurityHeaders(true);
const staticDev = buildStaticSecurityHeaders(false);
ok("statische laag (next.config) zendt GEEN CSP meer", staticProd["Content-Security-Policy"] === undefined && staticDev["Content-Security-Policy"] === undefined);
ok("statische laag behoudt HSTS in prod", (staticProd["Strict-Transport-Security"] ?? "").includes("max-age="));
ok("statische laag behoudt de base-headers", staticProd["X-Frame-Options"] === "DENY" && staticDev["X-Content-Type-Options"] === "nosniff");
ok("Reporting-Endpoints wordt in prod meegestuurd", (prodHeaders["Reporting-Endpoints"] ?? "").includes("csp-endpoint"));

console.log(`\nsecurity-residual: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
