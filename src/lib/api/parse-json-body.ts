import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * L8 Zod-sweep (audit 2026-06-26) — gedeelde body-parser voor mutatie-routes.
 *
 * Parse't de JSON-body tegen het meegegeven schema. Bij ongeldige of
 * ontbrekende JSON komt dezelfde 400-shape terug als batch-1
 * (`knowledge`/`research-plans` POST): `{ error, details: flatten() }`.
 *
 * Gebruik:
 *   const parsed = await parseJsonBody(request, schema);
 *   if (!parsed.ok) return parsed.response;
 *   const data = parsed.data;
 */
export async function parseJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
