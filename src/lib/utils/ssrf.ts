// =============================================================
// SSRF Protection — shared guard for all server-side URL fetches
//
// Blocks requests to private/internal networks + cloud-metadata endpoints.
//
// Security-audit 2026-06-26 (H1): the previous string-only `isPrivateHostname`
// was bypassable via bracketed IPv6 (`[::ffff:169.254.169.254]`), IPv4-mapped
// IPv6, and DNS-rebinding (a public hostname resolving to a private IP). This
// guard hardens all three:
//   - `isPrivateIp`        — full IPv4 + IPv6 (incl. IPv4-mapped, dotted AND hex form)
//   - `isPrivateHostname`  — sync; strips IPv6 brackets, delegates IP literals to
//                            isPrivateIp. Cannot catch DNS-rebind (no DNS) — prefer
//                            the async `assertSafeUrl` for fetch entry points.
//   - `assertSafeUrl`      — ASYNC: scheme-allowlist + literal check + DNS-resolve-
//                            and-verify of every A/AAAA record (closes DNS-rebind).
//   - `safeFetch`          — ASYNC: SSRF-safe `fetch` drop-in — manual redirect loop
//                            that re-validates every hop before connecting (prefer
//                            this over a raw fetch + post-hoc check).
//
// IMPORTANT: `assertSafeUrl`/`safeFetch` are async — every caller MUST `await`
// them, otherwise the validation is fire-and-forget and the fetch is unprotected.
// =============================================================

import { lookup } from "dns/promises";
import { isIP } from "net";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** Strip surrounding brackets from an IPv6 URL hostname (`[::1]` → `::1`). */
function unbracket(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

/**
 * Recover an embedded IPv4 from the recognised IPv4-in-IPv6 forms, so a private
 * v4 (e.g. IMDS 169.254.169.254) can't hide inside an IPv6 literal:
 *   - IPv4-mapped       `::ffff:x`     (the common one)
 *   - NAT64 well-known  `64:ff9b::x`   (RFC6052 — routes to the v4 on NAT64 hosts)
 *   - IPv4-compatible   `::x`          (deprecated, but still resolvable)
 * Handles BOTH the dotted (`...:1.2.3.4`) and hex (`...:0102:0304`) tails — the
 * hex form bypassed even the prior "gold standard". Returns dotted IPv4 or null.
 */
function embeddedIpv4(ipv6Lower: string): string | null {
  let tail: string | null = null;
  if (ipv6Lower.startsWith("::ffff:")) tail = ipv6Lower.slice(7);
  else if (ipv6Lower.startsWith("64:ff9b::")) tail = ipv6Lower.slice(9);
  else if (ipv6Lower.startsWith("::") && ipv6Lower !== "::" && ipv6Lower !== "::1") tail = ipv6Lower.slice(2);
  if (!tail) return null;
  if (tail.includes(".")) return isIP(tail) === 4 ? tail : null;
  const groups = tail.split(":").filter(Boolean);
  if (groups.length === 2 && groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) {
    const hi = parseInt(groups[0], 16);
    const lo = parseInt(groups[1], 16);
    return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
  }
  return null;
}

/**
 * RFC1918 + loopback + link-local + cloud-metadata (IMDS 169.254.169.254) +
 * CGNAT (100.64/10) + IPv6 loopback/link-local/unique-local + IPv4-mapped IPv6.
 */
export function isPrivateIp(ip: string): boolean {
  const fam = isIP(ip);
  if (fam === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true;
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local + AWS/GCP IMDS
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT (RFC6598)
    return false;
  }
  if (fam === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true; // unspecified + loopback
    if (/^fe[89ab]/.test(lower)) return true; // link-local fe80::/10
    if (/^f[cd]/.test(lower)) return true; // unique-local fc00::/7
    const v4 = embeddedIpv4(lower);
    if (v4) return isPrivateIp(v4); // IPv4-in-IPv6 — recurse on embedded v4
    return false;
  }
  return false;
}

/**
 * Sync hostname check. Handles IP literals (incl. bracketed IPv6) and obvious
 * local names. NOTE: does NOT resolve DNS, so it cannot stop DNS-rebinding —
 * for fetch entry points use the async {@link assertSafeUrl} instead.
 */
export function isPrivateHostname(hostname: string): boolean {
  const host = unbracket(hostname).toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return true;
  }
  if (isIP(host)) return isPrivateIp(host);
  return false;
}

/**
 * Validate that `url` is safe to fetch: http/https only, and its host (literal
 * or every DNS-resolved A/AAAA record) is not private/internal. Throws on unsafe.
 * ASYNC — callers MUST await.
 */
export async function assertSafeUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`URL scheme "${parsed.protocol}" is not allowed (http/https only)`);
  }
  const host = unbracket(parsed.hostname);
  if (!host) {
    throw new Error("URL is missing a hostname");
  }
  // IP literal — validate directly, no DNS needed.
  if (isIP(host)) {
    if (isPrivateIp(host)) {
      throw new Error("URLs pointing to private or internal networks are not allowed");
    }
    return;
  }
  // Local hostnames before the DNS call.
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local")) {
    throw new Error("URLs pointing to private or internal networks are not allowed");
  }
  // Resolve and verify EVERY record — closes DNS-rebinding to a private IP.
  let resolved: { address: string }[];
  try {
    resolved = await lookup(host, { all: true });
  } catch (err) {
    throw new Error(`DNS lookup failed for ${host}: ${(err as Error).message}`);
  }
  for (const record of resolved) {
    if (isPrivateIp(record.address)) {
      throw new Error("URLs pointing to private or internal networks are not allowed");
    }
  }
}

/** Max redirect hops `safeFetch` will follow before failing closed. */
const SAFE_FETCH_MAX_REDIRECTS = 5;

/** Credential headers that must NOT cross an origin boundary on a redirect. */
const CREDENTIAL_HEADERS = ["authorization", "cookie", "proxy-authorization"];

/**
 * SSRF-safe drop-in for `fetch`. Validates EVERY hop instead of post-hoc:
 * forces `redirect: 'manual'` and re-runs {@link assertSafeUrl} before each
 * request, so a redirect to a private/metadata host is rejected BEFORE the
 * connection is made (plain `redirect: 'follow'` + a trailing check still lets
 * the redirect request fire against the internal target — a blind-SSRF window).
 *
 * Credential headers (Authorization/Cookie/Proxy-Authorization) are stripped as
 * soon as a redirect leaves the original origin — mirrors the fetch spec, so a
 * caller's auth token can't leak to a redirect-controlled third-party host.
 *
 * Returns the first non-redirect `Response` (body untouched, caller reads it).
 * Throws on: unsafe URL/redirect target, opaque redirect (Location unreadable),
 * a 3xx without Location, or exceeding `maxRedirects`.
 *
 * Pass-through `init` is forwarded except `redirect` (always `'manual'`), the
 * credential-header stripping above, and the method downgrade below. ASYNC —
 * callers MUST await.
 *
 * Method/body across redirects follows the fetch spec: a 303 (and a 301/302 on a
 * non-GET/HEAD method) re-issues the next hop as a bodyless GET; 307/308 preserve
 * the original method + body. All current callers are GET, so this is latent.
 */
export async function safeFetch(
  url: string,
  init: RequestInit & { maxRedirects?: number } = {},
): Promise<Response> {
  const { maxRedirects = SAFE_FETCH_MAX_REDIRECTS, headers, method, body, ...rest } = init;
  const headerBag = new Headers(headers);
  const originalOrigin = new URL(url).origin;
  let currentUrl = url;
  let currentMethod = method;
  let currentBody = body;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertSafeUrl(currentUrl);
    // Once a redirect leaves the original origin, drop credential headers so a
    // caller's Authorization/Cookie can't be forwarded to a third-party host.
    if (new URL(currentUrl).origin !== originalOrigin) {
      for (const h of CREDENTIAL_HEADERS) headerBag.delete(h);
    }
    const response = await fetch(currentUrl, {
      ...rest,
      method: currentMethod,
      body: currentBody,
      headers: headerBag,
      redirect: "manual",
    });
    // Some runtimes return an opaque redirect (status 0, Location unreadable)
    // instead of a raw 3xx — fail closed rather than silently follow it.
    if (response.type === "opaqueredirect") {
      throw new Error("safeFetch: opaque redirect (Location header not readable in this runtime)");
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      // A 3xx without Location can't be followed — hand it back to the caller
      // (its `!response.ok` branch will handle it).
      if (!location) return response;
      // 303, and 301/302 on a non-GET/HEAD method, re-issue as a bodyless GET
      // (matches the fetch spec); 307/308 keep the method + body.
      const m = (currentMethod ?? "GET").toUpperCase();
      if (response.status === 303 || ((response.status === 301 || response.status === 302) && m !== "GET" && m !== "HEAD")) {
        currentMethod = "GET";
        currentBody = undefined;
        headerBag.delete("content-type");
        headerBag.delete("content-length");
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    return response;
  }
  throw new Error(`safeFetch: too many redirects (>${maxRedirects})`);
}

/**
 * Stream a response body and abort when the cumulative byte-count exceeds `byteCap`.
 * Defense against OOM from a malicious/huge target. Returns the decoded text.
 */
export async function readBodyWithCap(response: Response, byteCap: number): Promise<string> {
  if (!response.body) return await response.text();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > byteCap) {
        await reader.cancel();
        throw new Error(`Response exceeded byte cap (${byteCap} bytes)`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}
