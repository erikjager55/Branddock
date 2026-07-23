'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { Loader2, Plug, Unplug } from 'lucide-react';

// =============================================================
// Settings → API & Connectors → Connected apps — de MCP-connector-
// koppelingen (claude.ai/ChatGPT) van de ingelogde gebruiker, met een
// intrek-knop per koppeling (audit-feature 2026-07-23). Praat met
// /api/oauth/connections (sessie-auth, strikt op de eigen userId). Intrekken
// verwijdert de OAuth-token- en consent-rijen → de connector moet opnieuw
// koppelen; ontkoppelen in de client alléén liet het token 60 dagen leven.
// =============================================================

interface ConnectionItem {
  clientId: string;
  appName: string;
  scopes: string;
  tokenCount: number;
  connectedAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

async function fetchConnections(): Promise<ConnectionItem[]> {
  const res = await fetch('/api/oauth/connections', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load connections (${res.status})`);
  const body = (await res.json()) as { connections: ConnectionItem[] };
  return body.connections;
}

async function revokeConnection(clientId: string): Promise<void> {
  const res = await fetch('/api/oauth/connections', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId }),
  });
  if (!res.ok) throw new Error(`Failed to revoke connection (${res.status})`);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function ConnectionRow({
  item,
  revokingId,
  onRevoke,
  t,
}: {
  item: ConnectionItem;
  revokingId: string | null;
  onRevoke: (item: ConnectionItem) => void;
  t: TFunction;
}) {
  return (
    <div
      data-testid={`connection-row-${item.clientId}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">{item.appName}</span>
          <span className="text-xs text-gray-400 font-mono truncate">{item.clientId}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {item.scopes.split(' ').filter(Boolean).map((scope) => (
            <span key={scope} className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-mono text-teal-700">
              {scope}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {t('apiKeys.connections.meta', {
            defaultValue: 'Connected {{connected}} · last active {{active}} · expires {{expires}}',
            connected: formatDate(item.connectedAt),
            active: formatDate(item.lastActiveAt),
            expires: formatDate(item.expiresAt),
          })}
        </p>
      </div>
      <button
        type="button"
        data-testid={`connection-revoke-${item.clientId}`}
        disabled={revokingId === item.clientId}
        onClick={() => onRevoke(item)}
        title={t('apiKeys.connections.revokeTooltip', { defaultValue: 'Revoke this connection' })}
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors flex-shrink-0"
      >
        {revokingId === item.clientId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
        {t('apiKeys.connections.revoke', { defaultValue: 'Revoke' })}
      </button>
    </div>
  );
}

/**
 * Connected-apps-sectie in de "API & Connectors"-tab: toont de OAuth-connector-
 * koppelingen van de gebruiker en laat ze per stuk intrekken.
 */
export function ConnectionsPanel() {
  const { t } = useTranslation('settings-misc');
  const queryClient = useQueryClient();
  const { data: connections = [], isLoading, isError } = useQuery({
    queryKey: ['oauth', 'connections'],
    queryFn: fetchConnections,
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleRevoke = async (item: ConnectionItem) => {
    if (!window.confirm(t('apiKeys.connections.revokeConfirm', {
      defaultValue: 'Revoke {{app}}? The connector stops working immediately and must reconnect and sign in again.',
      app: item.appName,
    }))) {
      return;
    }
    setRevokingId(item.clientId);
    setActionError(null);
    try {
      await revokeConnection(item.clientId);
      await queryClient.invalidateQueries({ queryKey: ['oauth', 'connections'] });
    } catch {
      setActionError(t('apiKeys.connections.revokeFailed', { defaultValue: 'Could not revoke the connection' }));
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Plug className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-semibold">
          {t('apiKeys.connections.heading', { defaultValue: 'Connected apps' })}
        </h3>
      </div>
      <p className="text-sm text-gray-500">
        {t('apiKeys.connections.description', {
          defaultValue:
            'Apps you connected via the MCP connector (Claude, ChatGPT). Revoking removes their access immediately — the app must reconnect and sign in again. This only affects your own connections.',
        })}
      </p>

      {(isError || actionError) && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {isError
            ? t('apiKeys.connections.loadFailed', { defaultValue: 'Could not load your connections.' })
            : actionError}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : connections.length === 0 ? (
        <p className="text-sm text-gray-400">
          {t('apiKeys.connections.empty', { defaultValue: 'No connected apps yet. Connect Branddock as a connector in Claude or ChatGPT to see it here.' })}
        </p>
      ) : (
        <div className="space-y-2">
          {connections.map((item) => (
            <ConnectionRow key={item.clientId} item={item} revokingId={revokingId} onRevoke={handleRevoke} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
