import { NextRequest, NextResponse } from 'next/server';
import { checkGenericRateLimit } from '@/lib/ai/rate-limiter';

/**
 * POST /api/security/csp-report — collector voor de Report-Only nonce-CSP
 * (audit-rest 2026-07-17, stap 2 van de nonce-migratie).
 *
 * Ontvangt zowel het legacy `report-uri`-formaat ({ "csp-report": {...} })
 * als het Reporting-API-formaat (array van { type, body }). Logt gestructureerd
 * naar de server-log (geen DB) en antwoordt ALTIJD 204 — een kapot of
 * kwaadaardig rapport mag nooit een error-signaal opleveren. Unauthenticated
 * by design: browsers sturen reports zonder credentials-context.
 */

const MAX_REPORT_BYTES = 32_768;
const REPORTS_PER_MINUTE_PER_IP = 20;

/** Eerste aanwezige key uit een unknown object, anders null. */
function pick(obj: unknown, ...keys: string[]): unknown {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== undefined) return value;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const noContent = () => new NextResponse(null, { status: 204 });

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const limit = await checkGenericRateLimit(
    `csp-report:${ip}`,
    REPORTS_PER_MINUTE_PER_IP,
    60_000,
  );
  if (!limit.allowed) return noContent();

  const raw = await request.text().catch(() => '');
  if (!raw || raw.length > MAX_REPORT_BYTES) return noContent();

  try {
    const parsed: unknown = JSON.parse(raw);
    const entries = Array.isArray(parsed) ? parsed.slice(0, 10) : [parsed];
    for (const entry of entries) {
      // report-uri levert { "csp-report": {...} }; de Reporting API { type, body }.
      const body = pick(entry, 'csp-report', 'body') ?? entry;
      console.warn('[csp-report]', {
        documentUri: pick(body, 'document-uri', 'documentURL'),
        violatedDirective: pick(body, 'violated-directive', 'effectiveDirective'),
        blockedUri: pick(body, 'blocked-uri', 'blockedURL'),
        sourceFile: pick(body, 'source-file', 'sourceFile'),
        lineNumber: pick(body, 'line-number', 'lineNumber'),
        disposition: pick(body, 'disposition'),
      });
    }
  } catch {
    // Onparseerbaar rapport → stil droppen; dit endpoint mag nooit 4xx/5xx'en.
  }

  return noContent();
}
