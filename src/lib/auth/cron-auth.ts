// =============================================================
// Cron auth — constant-time Bearer-token check voor cron-routes.
//
// Waarom: een plain `auth === \`Bearer ${secret}\`` short-circuit op het
// eerste verschillende byte en is daarmee theoretisch timing-observeerbaar.
// timingSafeEqual vergelijkt in constante tijd. De lengte-guard ervoor is
// nodig omdat timingSafeEqual throwt bij ongelijke buffer-lengtes; de
// verwachte token-lengte is geen geheim (vast formaat), dus dat lekt niets.
//
// Bij ontbrekende CRON_SECRET: toegestaan buiten productie, geweigerd in
// productie — identiek gedrag aan de eerdere per-route helpers.
// =============================================================

import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/** Constant-time string-gelijkheid (UTF-8 bytes). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** True wanneer de request een geldige cron-Bearer-token draagt. */
export function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Geen secret geconfigureerd → toestaan in dev, blokkeren in prod.
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization");
  if (!auth) return false;
  return safeEqual(auth, `Bearer ${secret}`);
}
