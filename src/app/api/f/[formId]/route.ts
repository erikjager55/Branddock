import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkGenericRateLimit } from '@/lib/ai/rate-limiter';
import { safeFetch } from '@/lib/utils/ssrf';
import { trySendTransactional } from '@/lib/email/transactional';
import {
  parseLeadFormId,
  findLeadFormSection,
  leadFormSuccessAnchorId,
  LEAD_FORM_HONEYPOT_FIELD,
  LEAD_FORM_TIMESTAMP_FIELD,
  LEAD_FORM_SOURCE_FIELD,
  LEAD_FORM_RESERVED_FIELDS,
  LEAD_FORM_MAX_FIELDS,
  LEAD_FORM_MAX_PAYLOAD_BYTES,
  LEAD_FORM_MAX_FIELD_NAME_LENGTH,
  LEAD_FORM_MAX_FIELD_VALUE_LENGTH,
} from '@/lib/landing-pages/lead-form';

/**
 * POST /api/f/[formId] — publiek lead-capture-endpoint (P3 lp-forms-leads).
 *
 * PUBLIEK — géén auth, CORS-open: subdomein-, custom-domain-, zip-export- én
 * WordPress-pagina's posten allemaal naar ditzelfde endpoint (staticforms-
 * patroon, marktonderzoek §4.2). Tenant-resolutie zit in het formId zelf:
 * `<workspaceId>:<formKey>` (zie `src/lib/landing-pages/lead-form.ts`).
 *
 * Accepteert form-encoded, multipart én JSON. Guards (in volgorde):
 *  1. payload-cap (early 413 op content-length, daarna 30-velden/10KB-cap);
 *  2. rate-limit per IP+formId (sliding window, Redis-backed op prod);
 *  3. honeypot `_hp` gevuld → stil "succes" zonder opslag;
 *  4. submit-timing `_ts` < 2s → stil "succes" zonder opslag (bots; alleen
 *     betrouwbaar mét JS — het artifact-script ververst `_ts` naar load-tijd,
 *     de statisch bevroren render-timestamp triggert nooit een false positive).
 *
 * Notificaties (e-mail + webhook) worden uit de GEPUBLICEERDE snapshot van de
 * sectie gelezen — nooit uit de request (anders is dit een open spam-/
 * SSRF-relay) — en draaien via `after()` ná de response (fail-soft; les van
 * Instapage: bedankgedrag nooit op de webhook laten wachten, spec §7).
 *
 * Response: no-JS pad (form-encoded/multipart) → 303 redirect naar
 * `<bron>?submitted=1#<success-anchor>` (CSS `:target` toont het success-blok
 * zonder JS); JSON-callers → 200 { ok: true }.
 */

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/** Requests per minuut per IP+formId — royaal voor mensen, stopt scripts. */
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
/** Sneller dan dit tussen render/load en submit = bot (spec P3). */
const MIN_SUBMIT_MS = 2_000;
/** Early-reject vóór body-parse; ruim boven de 10KB-datacap (multipart-overhead). */
const MAX_BODY_BYTES = 64 * 1024;
/** Max gepubliceerde pagina's die we scannen op de form-sectie. */
const MAX_PAGES_SCANNED = 100;
const WEBHOOK_TIMEOUT_MS = 5_000;

const fieldsSchema = z
  .record(
    z.string().min(1).max(LEAD_FORM_MAX_FIELD_NAME_LENGTH),
    z.string().max(LEAD_FORM_MAX_FIELD_VALUE_LENGTH),
  )
  .refine((rec) => Object.keys(rec).length <= LEAD_FORM_MAX_FIELDS, {
    message: `Too many fields (max ${LEAD_FORM_MAX_FIELDS})`,
  });

function jsonResponse(body: Record<string, unknown>, status: number, extraHeaders?: Record<string, string>): NextResponse {
  return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, ...extraHeaders } });
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Client-IP voor de rate-limit-bucket (zelfde bron als de publieke Brand-API). */
function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  );
}

/**
 * Normaliseer het request-body naar een platte string→string-map, ongeacht
 * syntax (urlencoded/multipart via formData(), JSON/text via JSON.parse).
 * File-uploads en niet-primitieve JSON-waarden worden genegeerd.
 */
async function readFields(request: NextRequest): Promise<Record<string, string> | null> {
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
  try {
    if (contentType.includes('application/json') || contentType.includes('text/plain')) {
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      const out: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === 'string') out[key] = value;
        else if (typeof value === 'number' || typeof value === 'boolean') out[key] = String(value);
      }
      return out;
    }
    const formData = await request.formData();
    const out: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  } catch {
    return null;
  }
}

/** Wil deze caller een browser-redirect (no-JS form-post) of JSON? */
function wantsRedirect(request: NextRequest): boolean {
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
  return (
    contentType.includes('application/x-www-form-urlencoded')
    || contentType.includes('multipart/form-data')
  );
}

/**
 * Bouw het 303-redirect-doel: bronpagina + `?submitted=1` + `#<success-anchor>`
 * (CSS `:target` maakt het success-blok zichtbaar zonder JS). Alleen http(s)-
 * URL's; `_src` is client-input dus scheme-validatie is verplicht. POST-only
 * endpoint → een crafted redirect vereist al een attacker-gecontroleerd
 * formulier in de browser van het slachtoffer (geen GET-open-redirect).
 */
function buildRedirectTarget(src: string | undefined, referer: string | null, formKey: string): string | null {
  for (const candidate of [src, referer ?? undefined]) {
    if (!candidate || candidate.length > 2048) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
      url.searchParams.set('submitted', '1');
      url.hash = leadFormSuccessAnchorId(formKey);
      return url.toString();
    } catch {
      continue;
    }
  }
  return null;
}

/** Success-response passend bij de caller (303 voor form-posts, 200 JSON anders). */
function successResponse(request: NextRequest, redirectTarget: string | null): NextResponse {
  if (wantsRedirect(request) && redirectTarget) {
    return new NextResponse(null, {
      status: 303,
      headers: { ...CORS_HEADERS, Location: redirectTarget },
    });
  }
  return jsonResponse({ ok: true }, 200);
}

interface ResolvedFormSection {
  landingPageId: string;
  slug: string;
  webhookUrl: string | null;
  notifyEmail: string | null;
}

/**
 * Zoek de LeadForm-sectie in de GEPUBLICEERDE pagina's van de workspace
 * (live snapshot > legacy kolom). Levert landingPageId (voor het
 * PageEvent-conversielog) + de server-side vertrouwde notify-config.
 * Fail-soft: niet gevonden → null (submission wordt alsnog opgeslagen).
 */
async function resolveFormSection(workspaceId: string, formKey: string): Promise<ResolvedFormSection | null> {
  const pages = await prisma.landingPage.findMany({
    where: { workspaceId, status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      puckData: true,
      livePublish: { select: { puckData: true } },
    },
    take: MAX_PAGES_SCANNED,
  });
  for (const page of pages) {
    const tree = page.livePublish?.puckData ?? page.puckData;
    const section = findLeadFormSection(tree, formKey);
    if (!section) continue;
    const webhookUrl = typeof section.props.webhookUrl === 'string' && section.props.webhookUrl.trim().length > 0
      ? section.props.webhookUrl.trim()
      : null;
    const notifyEmail = typeof section.props.notifyEmail === 'string' && section.props.notifyEmail.trim().length > 0
      ? section.props.notifyEmail.trim()
      : null;
    return { landingPageId: page.id, slug: page.slug, webhookUrl, notifyEmail };
  }
  return null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Fire-and-forget notificaties (e-mail + webhook) — draait via `after()` ná
 * de response; élke fout wordt geslikt en gelogd (fail-soft, spec P3).
 */
async function dispatchNotifications(args: {
  section: ResolvedFormSection;
  formId: string;
  data: Record<string, string>;
  sourceUrl: string | null;
  submissionId: string;
}): Promise<void> {
  const { section, formId, data, sourceUrl, submissionId } = args;

  if (section.notifyEmail && EMAIL_PATTERN.test(section.notifyEmail)) {
    const rows = Object.entries(data)
      .map(([key, value]) => `<tr><td style="padding:4px 12px 4px 0;font-weight:600">${escapeHtml(key)}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`)
      .join('');
    const result = await trySendTransactional({
      to: section.notifyEmail,
      subject: `New lead on /${section.slug}`,
      html: `<p>A visitor submitted the form on <strong>/${escapeHtml(section.slug)}</strong>.</p><table>${rows}</table>${sourceUrl ? `<p style="color:#6b7280;font-size:12px">Source: ${escapeHtml(sourceUrl)}</p>` : ''}`,
    });
    if (!result.ok) {
      console.warn('[api/f] lead-notificatie-mail faalde (genegeerd):', result.error);
    }
  }

  if (section.webhookUrl) {
    try {
      // safeFetch is VERPLICHT voor user-supplied URLs (SSRF-guard: valideert
      // elke hop, blokkeert private ranges/IMDS). Timeout 5s zodat een trage
      // consumer nooit resources vasthoudt (Instapage-les, spec §7).
      const response = await safeFetch(section.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'form_submission',
          formId,
          submissionId,
          submittedAt: new Date().toISOString(),
          page: section.slug,
          sourceUrl,
          data,
        }),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      if (!response.ok) {
        console.warn(`[api/f] webhook antwoordde ${response.status} (genegeerd)`);
      }
    } catch (err) {
      console.warn('[api/f] webhook-dispatch faalde (genegeerd):', err instanceof Error ? err.message : err);
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;

  // Vorm-validatie vóór élke DB-lookup — ongeldig formaat is per definitie 404.
  const parsed = parseLeadFormId(formId);
  if (!parsed) {
    return jsonResponse({ error: 'Unknown form' }, 404);
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'Payload too large' }, 413);
  }

  const rate = await checkGenericRateLimit(
    `leadform:${clientIp(request)}:${formId}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!rate.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000));
    return jsonResponse({ error: 'Rate limit exceeded', retryAfter }, 429, { 'Retry-After': String(retryAfter) });
  }

  const rawFields = await readFields(request);
  if (rawFields === null) {
    return jsonResponse({ error: 'Invalid body' }, 400);
  }

  // Interne velden apart nemen; de rest is de submission-payload.
  const honeypot = rawFields[LEAD_FORM_HONEYPOT_FIELD] ?? '';
  const tsRaw = rawFields[LEAD_FORM_TIMESTAMP_FIELD] ?? '';
  const srcRaw = rawFields[LEAD_FORM_SOURCE_FIELD] ?? '';
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawFields)) {
    if (LEAD_FORM_RESERVED_FIELDS.includes(key)) continue;
    data[key] = value;
  }

  const validated = fieldsSchema.safeParse(data);
  if (!validated.success) {
    return jsonResponse({ error: 'Invalid fields' }, 400);
  }
  if (Buffer.byteLength(JSON.stringify(validated.data), 'utf8') > LEAD_FORM_MAX_PAYLOAD_BYTES) {
    return jsonResponse({ error: 'Payload too large' }, 413);
  }

  const referer = request.headers.get('referer');
  const redirectTarget = buildRedirectTarget(srcRaw || undefined, referer, parsed.formKey);

  // Honeypot: mensen zien het veld nooit; gevuld = bot → stil "succes"
  // (zelfde response-shape als echt succes, niets opgeslagen).
  if (honeypot.trim().length > 0) {
    return successResponse(request, redirectTarget);
  }
  // Timing: submit < 2s na (door het artifact-script ververste) load = bot.
  // Alleen droppen bij een POSITIEVE delta — klokscheefstand of de bevroren
  // artifact-timestamp mag nooit een mens stil laten vallen.
  const ts = Number(tsRaw);
  if (Number.isFinite(ts) && ts > 0) {
    const delta = Date.now() - ts;
    if (delta >= 0 && delta < MIN_SUBMIT_MS) {
      return successResponse(request, redirectTarget);
    }
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: parsed.workspaceId },
    select: { id: true },
  });
  if (!workspace) {
    return jsonResponse({ error: 'Unknown form' }, 404);
  }

  // Sectie-resolutie uit de gepubliceerde snapshot: levert landingPageId
  // (conversielog) + de vertrouwde notify-config. Fail-soft.
  let section: ResolvedFormSection | null = null;
  try {
    section = await resolveFormSection(parsed.workspaceId, parsed.formKey);
  } catch (err) {
    console.warn('[api/f] sectie-resolutie faalde (genegeerd):', err instanceof Error ? err.message : err);
  }

  const sourceUrl = srcRaw && srcRaw.length <= 2048 ? srcRaw : null;

  let submissionId: string;
  try {
    const submission = await prisma.formSubmission.create({
      data: {
        workspaceId: parsed.workspaceId,
        landingPageId: section?.landingPageId ?? null,
        formId,
        data: validated.data,
        sourceUrl,
      },
      select: { id: true },
    });
    submissionId = submission.id;
  } catch (err) {
    console.error('[api/f] submission-opslag faalde:', err instanceof Error ? err.message : err);
    return jsonResponse({ error: 'Submission failed' }, 500);
  }

  // P4: server-side conversieteller — dé betrouwbare bron (werkt ook no-JS;
  // het artifact-script stuurt bewust géén extra form_submit-beacon, anders
  // telt een JS-submit dubbel). Fail-soft: mag de submission nooit breken.
  if (section) {
    try {
      await prisma.pageEvent.create({
        data: {
          workspaceId: parsed.workspaceId,
          landingPageId: section.landingPageId,
          kind: 'form_submit',
          path: `/${section.slug}`,
          referrer: null,
        },
      });
    } catch (err) {
      console.warn('[api/f] form_submit-event faalde (genegeerd):', err instanceof Error ? err.message : err);
    }
  }

  // Notificaties ná de response — de bezoeker wacht nooit op mail/webhook.
  if (section && (section.notifyEmail || section.webhookUrl)) {
    const resolvedSection = section;
    after(async () => {
      await dispatchNotifications({
        section: resolvedSection,
        formId,
        data: validated.data,
        sourceUrl,
        submissionId,
      });
    });
  }

  return successResponse(request, redirectTarget);
}
