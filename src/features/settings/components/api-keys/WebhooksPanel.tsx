'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Plus,
  Trash2,
  Webhook,
} from 'lucide-react';

// =============================================================
// Settings → API & Connectors → Webhooks — beheer van outbound
// webhook-endpoints (P3.3-restje, tasks/public-brand-api.md).
// Praat met /api/workspace/webhooks (sessie-auth, owner/admin);
// het volledige signing-secret is alleen direct na aanmaak
// zichtbaar. Payloads zijn metadata-only (ids/scores, geen
// content) — de ontvanger haalt inhoud op via de publieke API.
// =============================================================

interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: number | null;
  failureCount: number;
  secretPrefix: string;
}

interface CreatedWebhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
}

/** Outbound event-types — spiegel van WEBHOOK_EVENT_TYPES (src/lib/api/public/webhooks.ts). */
const WEBHOOK_EVENTS: { value: string; desc: string }[] = [
  { value: 'deliverable.generated', desc: 'A deliverable finished generating (content, web page, SEO article, video)' },
  { value: 'content.published', desc: 'A deliverable was published' },
  { value: 'fidelity.scored', desc: 'An F-VAL review produced a score' },
  { value: 'fidelity.below_threshold', desc: 'An F-VAL score came in below the threshold' },
];

async function fetchWebhooks(): Promise<WebhookItem[]> {
  const res = await fetch('/api/workspace/webhooks', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load webhooks (${res.status})`);
  const body = (await res.json()) as { endpoints: WebhookItem[] };
  return body.endpoints;
}

async function createWebhook(url: string, events: string[]): Promise<CreatedWebhook> {
  const res = await fetch('/api/workspace/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, events }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to create webhook (${res.status})`);
  }
  return (await res.json()) as CreatedWebhook;
}

async function deleteWebhook(id: string): Promise<void> {
  const res = await fetch('/api/workspace/webhooks', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`Failed to delete webhook (${res.status})`);
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Amber "kopieer nu"-blok — het volledige signing-secret is hierna nooit meer opvraagbaar. */
function SecretReveal({ created, onDismiss, t }: { created: CreatedWebhook; onDismiss: () => void; t: TFunction }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(created.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {t('apiKeys.webhooks.revealTitle', { defaultValue: 'Copy your signing secret now — you will never see it again' })}
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            {t('apiKeys.webhooks.revealHelp', {
              defaultValue: 'Verify each delivery with this secret: the x-branddock-signature header is an HMAC-SHA256 over the raw request body.',
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <code
          data-testid="webhook-secret"
          className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-mono select-all"
          style={{ wordBreak: 'break-all' }}
        >
          {created.secret}
        </code>
        <button
          type="button"
          data-testid="webhook-secret-copy"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors flex-shrink-0"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied
            ? t('apiKeys.copied', { defaultValue: 'Copied' })
            : t('apiKeys.copy', { defaultValue: 'Copy' })}
        </button>
      </div>
      <button type="button" onClick={onDismiss} className="text-xs text-amber-800 underline hover:text-amber-600">
        {t('apiKeys.webhooks.revealDismiss', { defaultValue: 'I stored the secret — hide it' })}
      </button>
    </div>
  );
}

/** Eén endpoint-rij — auto-gedeactiveerde endpoints gedimd met badge, delete via window.confirm. */
function WebhookRow({ item, deletingId, onDelete, t }: { item: WebhookItem; deletingId: string | null; onDelete: (item: WebhookItem) => void; t: TFunction }) {
  return (
    <div
      data-testid={`webhook-row-${item.id}`}
      className={`flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 ${item.active ? '' : 'opacity-60'}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm truncate">{item.url}</span>
          {!item.active && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 flex-shrink-0">
              {t('apiKeys.webhooks.disabledBadge', { defaultValue: 'Auto-disabled after {{count}} failures', count: item.failureCount })}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {item.events.map((ev) => (
            <span key={ev} className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-mono text-teal-700">
              {ev}
            </span>
          ))}
          <span className="text-xs text-gray-400 font-mono">{item.secretPrefix}••••</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {item.lastDeliveryAt
            ? t('apiKeys.webhooks.lastDelivery', {
                defaultValue: 'Last delivery {{date}} — HTTP {{status}}',
                date: formatDate(item.lastDeliveryAt),
                status: item.lastDeliveryStatus || t('apiKeys.webhooks.noResponse', { defaultValue: 'no response' }),
              })
            : t('apiKeys.webhooks.neverDelivered', { defaultValue: 'No deliveries yet' })}
        </p>
      </div>
      <button
        type="button"
        data-testid={`webhook-delete-${item.id}`}
        disabled={deletingId === item.id}
        onClick={() => onDelete(item)}
        title={t('apiKeys.webhooks.deleteTooltip', { defaultValue: 'Delete this endpoint' })}
        className="rounded-lg p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors flex-shrink-0"
      >
        {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

/**
 * Webhooks-sectie in de "API & Connectors"-tab: lijst + aanmaken + verwijderen
 * van outbound webhook-endpoints, met eenmalige secret-reveal na aanmaak.
 */
export function WebhooksPanel() {
  const { t } = useTranslation('settings-misc');
  const queryClient = useQueryClient();
  const { data: endpoints = [], isLoading, isError } = useQuery({
    queryKey: ['workspace', 'webhooks'],
    queryFn: fetchWebhooks,
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['deliverable.generated']);
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState<CreatedWebhook | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['workspace', 'webhooks'] });

  const toggleEvent = (value: string) => {
    setEvents((prev) => (prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value]));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || events.length === 0 || isCreating) return;
    setIsCreating(true);
    setActionError(null);
    try {
      setCreated(await createWebhook(url.trim(), events));
      setUrl('');
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('apiKeys.webhooks.createFailed', { defaultValue: 'Could not create the webhook' }));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (item: WebhookItem) => {
    if (!window.confirm(t('apiKeys.webhooks.deleteConfirm', {
      defaultValue: 'Delete this webhook endpoint? Deliveries to {{url}} stop immediately.',
      url: item.url,
    }))) {
      return;
    }
    setDeletingId(item.id);
    setActionError(null);
    try {
      await deleteWebhook(item.id);
      if (created?.id === item.id) setCreated(null);
      await refetch();
    } catch {
      setActionError(t('apiKeys.webhooks.deleteFailed', { defaultValue: 'Could not delete the webhook' }));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Webhook className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-semibold">
          {t('apiKeys.webhooks.heading', { defaultValue: 'Webhooks' })}
        </h3>
      </div>
      <p className="text-sm text-gray-500">
        {t('apiKeys.webhooks.description', {
          defaultValue:
            'Get an HTTPS call when something happens in this workspace — for n8n, Zapier or your own backend. Payloads contain ids and scores only, never content; fetch details via the public API.',
        })}
      </p>

      {(isError || actionError) && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {isError
            ? t('apiKeys.webhooks.loadFailed', { defaultValue: 'Could not load webhooks. Only workspace owners and admins can manage them.' })
            : actionError}
        </div>
      )}

      {created && <SecretReveal created={created} onDismiss={() => setCreated(null)} t={t} />}

      <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
        <div className="space-y-1">
          <label htmlFor="webhook-url" className="text-sm font-medium text-gray-700">
            {t('apiKeys.webhooks.urlLabel', { defaultValue: 'Endpoint URL (https)' })}
          </label>
          <input
            id="webhook-url"
            data-testid="webhook-url-input"
            type="url"
            value={url}
            maxLength={2000}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/hooks/branddock"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
          />
        </div>
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium text-gray-700">
            {t('apiKeys.webhooks.eventsLabel', { defaultValue: 'Events' })}
          </legend>
          {WEBHOOK_EVENTS.map((ev) => (
            <label key={ev.value} className="flex items-baseline gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                data-testid={`webhook-event-${ev.value}`}
                checked={events.includes(ev.value)}
                onChange={() => toggleEvent(ev.value)}
                className="translate-y-0.5 accent-teal-600"
              />
              <code className="font-mono text-teal-700 whitespace-nowrap">{ev.value}</code>
              <span className="text-gray-500">{ev.desc}</span>
            </label>
          ))}
        </fieldset>
        <button
          type="submit"
          data-testid="webhook-create"
          disabled={isCreating || !url.trim() || events.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t('apiKeys.webhooks.create', { defaultValue: 'Add endpoint' })}
        </button>
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : endpoints.length === 0 ? (
        <p className="text-sm text-gray-400">
          {t('apiKeys.webhooks.empty', { defaultValue: 'No webhook endpoints yet.' })}
        </p>
      ) : (
        <div className="space-y-2">
          {endpoints.map((item) => (
            <WebhookRow key={item.id} item={item} deletingId={deletingId} onDelete={handleDelete} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
