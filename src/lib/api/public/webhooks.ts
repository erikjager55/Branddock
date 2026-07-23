// =============================================================
// Publieke Brand-API — outbound webhooks (P3.3, Postiz-verbeterplan).
//
// dispatchWebhookEvent() POST't event-payloads naar alle actieve, op het
// event-type geabonneerde WebhookEndpoints van een workspace. Ontwerp:
//
// - Fail-soft: dispatch mag NOOIT throwen of de aanroepende flow vertragen —
//   callers roepen `void dispatchWebhookEvent(...)` fire-and-forget aan
//   (emitLearningEvent draait in hot paths zoals publish + F-VAL-scoring).
// - GEEN retries in v1: één poging per event per endpoint. Een gemiste
//   delivery is zichtbaar via lastDeliveryStatus/failureCount in Settings;
//   de ontvanger kan de actuele staat altijd via de REST-API navragen.
//   Retry-with-backoff is een bewuste v2-uitbreiding (vergt een queue).
// - Metadata-only payloads (ADR-principe "gedrag meten is metadata; inhoud
//   opslaan is opt-in"): ids/scores/types — nooit content-teksten. De
//   ontvanger haalt details op via de publieke API met het meegegeven id.
// - Signing: `x-branddock-signature: sha256=<hmac-hex over de raw body>`
//   met het per-endpoint shared secret (whsec_…), zodat de ontvanger de
//   afzender kan verifiëren (zelfde patroon als Stripe/GitHub).
// - Auto-deactivatie: na 25 opeenvolgende failures gaat het endpoint op
//   active:false (met warn) — beschermt tegen eeuwig posten naar dode URLs.
// =============================================================

import { createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';
import { assertSafeUrl } from '@/lib/utils/ssrf';

/**
 * Ondersteunde webhook-event-types (v1).
 *
 * - `content.published`      — deliverable is gepubliceerd (learning-loop).
 * - `fidelity.scored`        — F-VAL-score afgerond (learning-loop).
 * - `fidelity.below_threshold` — afgeleid event: een fidelity.scored waarbij
 *   `thresholdMet === false` (het "valideer vóór publicatie"-recept).
 * - `deliverable.generated`  — headless generatie succesvol afgerond.
 */
export const WEBHOOK_EVENT_TYPES = [
  'content.published',
  'fidelity.scored',
  'fidelity.below_threshold',
  'deliverable.generated',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

/** Metadata-only event-data: ids/scores/types — nooit content-inhoud. */
export type WebhookEventData = Record<string, string | number | boolean | null>;

const DELIVERY_TIMEOUT_MS = 10_000;
const AUTO_DISABLE_AFTER_FAILURES = 25;

/** lastDeliveryStatus-waarde voor "geen HTTP-response" (timeout/netwerkfout). */
const STATUS_NO_RESPONSE = 0;

// ── SSRF-guard ────────────────────────────────────────────────────────────

/**
 * Hostname-patronen die we weigeren: loopback, link-local en private ranges.
 * Bewust een letterlijke check op de opgegeven hostname (geen DNS-resolutie) —
 * DNS-rebinding-hardening is een v2-punt; https-verplichting + deze denylist
 * dekken de voor de hand liggende localhost/metadata-endpoints af.
 */
const BLOCKED_HOSTNAME_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127(?:\.\d{1,3}){3}$/, // 127.0.0.0/8 loopback
  /^0\.0\.0\.0$/,
  /^10(?:\.\d{1,3}){3}$/, // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/, // 172.16.0.0/12
  /^192\.168(?:\.\d{1,3}){2}$/, // 192.168.0.0/16
  /^169\.254(?:\.\d{1,3}){2}$/, // 169.254.0.0/16 link-local (cloud metadata)
  /^\[?::1\]?$/, // IPv6 loopback
  /^\[?::\]?$/, // IPv6 unspecified
];

export interface WebhookUrlValidation {
  ok: boolean;
  /** Menselijke uitleg wanneer ok=false — direct bruikbaar als 400-message. */
  reason?: string;
}

/**
 * SSRF-guard voor webhook-URLs (beheer-route, bij aanmaak).
 * Eist https en weigert loopback/private/link-local bestemmingen.
 * Geëxporteerd zodat de smoke de validator direct kan unit-testen.
 */
export function validateWebhookUrl(rawUrl: string): WebhookUrlValidation {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'url is not a valid URL' };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'url must use https' };
  }
  const hostname = parsed.hostname;
  if (BLOCKED_HOSTNAME_PATTERNS.some((p) => p.test(hostname))) {
    return { ok: false, reason: 'url must point to a public host (localhost/private ranges are not allowed)' };
  }
  return { ok: true };
}

// ── Dispatch ──────────────────────────────────────────────────────────────

/**
 * Bezorgt één event bij alle actieve endpoints van de workspace die op dit
 * event-type geabonneerd zijn. Volledig fail-soft: throwt nooit; fouten
 * worden gelogd (warn) en in failureCount/lastDeliveryStatus geregistreerd.
 *
 * `data` MOET metadata-only zijn (ids/scores/types) — de caller is daar
 * verantwoordelijk voor; deze functie serialiseert wat ze krijgt.
 */
export async function dispatchWebhookEvent(
  workspaceId: string,
  eventType: WebhookEventType,
  data: WebhookEventData,
): Promise<void> {
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { workspaceId, active: true, events: { has: eventType } },
      select: { id: true, url: true, secret: true, failureCount: true },
    });
    if (endpoints.length === 0) return;

    const body = JSON.stringify({
      event: eventType,
      workspaceId,
      timestamp: new Date().toISOString(),
      data,
    });

    await Promise.allSettled(
      endpoints.map((endpoint) => deliverToEndpoint(endpoint, eventType, body)),
    );
  } catch (err) {
    // Fail-soft: een webhook-probleem mag de eigenlijke actie nooit raken.
    console.warn('[webhooks] dispatch failed', {
      workspaceId,
      eventType,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

interface EndpointRef {
  id: string;
  url: string;
  secret: string;
  failureCount: number;
}

/** Eén poging (geen retries in v1) + bijwerken van de delivery-telemetrie. */
async function deliverToEndpoint(
  endpoint: EndpointRef,
  eventType: WebhookEventType,
  body: string,
): Promise<void> {
  const signature = `sha256=${createHmac('sha256', endpoint.secret).update(body).digest('hex')}`;

  let status = STATUS_NO_RESPONSE;
  let delivered = false;
  try {
    // DNS-rebind-bescherming bij dispatch (audit 2026-07-23, LOW): validateWebhookUrl
    // draait alleen bij create op de letterlijke hostname; een owner/admin kan een
    // publieke host registreren die later naar een intern IP resolvet. assertSafeUrl
    // resolvet de DNS nú en gooit bij een private/link-local/metadata-IP.
    await assertSafeUrl(endpoint.url);

    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-branddock-signature': signature,
        'x-branddock-event': eventType,
      },
      body,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    status = res.status;
    delivered = res.ok;
  } catch (err) {
    console.warn('[webhooks] delivery failed', {
      endpointId: endpoint.id,
      eventType,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    if (delivered) {
      await prisma.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: { lastDeliveryAt: new Date(), lastDeliveryStatus: status, failureCount: 0 },
      });
      return;
    }

    // Benadering op basis van de bij dispatch geladen teller — een race tussen
    // parallelle dispatches kan de drempel één event later raken; acceptabel
    // voor een fail-soft kill-switch.
    const newFailureCount = endpoint.failureCount + 1;
    const disable = newFailureCount >= AUTO_DISABLE_AFTER_FAILURES;
    await prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: {
        lastDeliveryAt: new Date(),
        lastDeliveryStatus: status,
        failureCount: { increment: 1 },
        ...(disable ? { active: false } : {}),
      },
    });
    if (disable) {
      console.warn('[webhooks] endpoint auto-disabled after consecutive failures', {
        endpointId: endpoint.id,
        failureCount: newFailureCount,
      });
    }
  } catch (err) {
    console.warn('[webhooks] delivery bookkeeping failed', {
      endpointId: endpoint.id,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
