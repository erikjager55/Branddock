'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import {
  AlertTriangle,
  Ban,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Plug,
  Plus,
} from 'lucide-react';

// =============================================================
// Settings → API & Connectors — beheer van publieke-API-keys +
// koppel-instructies voor Claude/ChatGPT (MCP). Fase E van
// tasks/public-brand-api.md. Praat met /api/workspace/api-keys
// (sessie-auth, owner/admin); de volledige key is alleen direct
// na aanmaak zichtbaar (hash-only opslag server-side).
// =============================================================

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

interface CreatedKey {
  id: string;
  name: string;
  key: string;
}

/** De 17 publieke MCP-tools — namen + één-regel-omschrijving (bron: src/lib/api/public/mcp-server.ts). */
const MCP_TOOLS: { name: string; desc: string }[] = [
  { name: 'get_brand_context', desc: 'Full brand context of this workspace: assets, voice, personas, products, competitors. Free.' },
  { name: 'score_against_brand', desc: 'Score any text with the F-VAL brand-fidelity engine (0-100 + findings). Free.' },
  { name: 'generate_on_brand', desc: 'Generate an on-brand content item via the full Branddock pipeline — returns the text. Costs credits.' },
  { name: 'rewrite_on_brand', desc: 'Rewrite text or draft a reply in the brand voice — nothing is stored. 1 credit.' },
  { name: 'generate_image', desc: 'Generate an on-brand image, saved to the Media Library. 2 credits.' },
  { name: 'generate_campaign_strategy', desc: 'Start the full campaign-strategy chain as a background job on a real campaign.' },
  { name: 'get_strategy_status', desc: 'Poll the progress of a campaign-strategy generation. Free.' },
  { name: 'generate_long_form_seo', desc: 'Start the 8-step SEO/GEO pipeline (keyword research to long-form article). 80 credits.' },
  { name: 'get_seo_status', desc: 'Poll the progress of a long-form SEO job. Free.' },
  { name: 'generate_web_page', desc: 'Generate a complete on-brand web page from a free-text prompt. 5 credits.' },
  { name: 'generate_video', desc: 'Generate a short on-brand video clip from a script. 20 credits.' },
  { name: 'get_deliverable_content', desc: 'Full content of a deliverable: text, image/video URLs, F-VAL score. Free.' },
  { name: 'list_brands', desc: 'All brands this connection can use — id, name, org, current default. Free.' },
  { name: 'list_personas', desc: 'All personas of this workspace — ids for context selection. Free.' },
  { name: 'list_products', desc: 'All products of this workspace — ids for context selection. Free.' },
  { name: 'list_competitors', desc: 'All competitors of this workspace — ids for context selection. Free.' },
  { name: 'search_knowledge', desc: 'Search knowledge resources by title — ids for context selection. Free.' },
];

async function fetchKeys(): Promise<ApiKeyItem[]> {
  const res = await fetch('/api/workspace/api-keys', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load API keys (${res.status})`);
  const body = (await res.json()) as { keys: ApiKeyItem[] };
  return body.keys;
}

async function createKey(name: string): Promise<CreatedKey> {
  const res = await fetch('/api/workspace/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to create API key (${res.status})`);
  return (await res.json()) as CreatedKey;
}

async function revokeKey(id: string): Promise<void> {
  const res = await fetch('/api/workspace/api-keys', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`Failed to revoke API key (${res.status})`);
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Amber "kopieer nu"-blok — de volledige key is hierna nooit meer opvraagbaar. */
function NewKeyReveal({ createdKey, onDismiss, t }: { createdKey: CreatedKey; onDismiss: () => void; t: TFunction }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {t('apiKeys.revealTitle', { defaultValue: 'Copy your key now — you will never see it again' })}
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            {t('apiKeys.revealHelp', {
              defaultValue:
                'This is the only time the full key for "{{name}}" is shown. Store it somewhere safe.',
              name: createdKey.name,
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <code
          data-testid="api-key-secret"
          className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-mono select-all"
          style={{ wordBreak: 'break-all' }}
        >
          {createdKey.key}
        </code>
        <button
          type="button"
          data-testid="api-key-copy"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors flex-shrink-0"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied
            ? t('apiKeys.copied', { defaultValue: 'Copied' })
            : t('apiKeys.copy', { defaultValue: 'Copy' })}
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-xs text-amber-800 underline hover:text-amber-600"
      >
        {t('apiKeys.revealDismiss', { defaultValue: 'I stored the key — hide it' })}
      </button>
    </div>
  );
}

/** Eén key-rij — ingetrokken keys gedimd met badge, revoke via window.confirm. */
function KeyRow({ item, revokingId, onRevoke, t }: { item: ApiKeyItem; revokingId: string | null; onRevoke: (item: ApiKeyItem) => void; t: TFunction }) {
  const revoked = item.revokedAt !== null;

  return (
    <div
      data-testid={`api-key-row-${item.id}`}
      data-revoked={revoked ? 'true' : 'false'}
      className={`flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 ${revoked ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${revoked ? 'bg-gray-100 text-gray-400' : 'bg-teal-50 text-teal-600'}`}>
          <KeyRound className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{item.name}</span>
            {revoked && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                {t('apiKeys.revokedBadge', { defaultValue: 'Revoked' })}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 font-mono">{item.keyPrefix}••••••••</span>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right">
          <p className="text-xs text-gray-500 whitespace-nowrap">
            {t('apiKeys.createdAt', { defaultValue: 'Created {{date}}', date: formatDate(item.createdAt) })}
          </p>
          <p className="text-xs text-gray-400 whitespace-nowrap">
            {item.lastUsedAt
              ? t('apiKeys.lastUsed', { defaultValue: 'Last used {{date}}', date: formatDate(item.lastUsedAt) })
              : t('apiKeys.neverUsed', { defaultValue: 'Never used' })}
          </p>
        </div>
        <button
          type="button"
          data-testid={`api-key-revoke-${item.id}`}
          disabled={revoked || revokingId === item.id}
          onClick={() => onRevoke(item)}
          title={
            revoked
              ? t('apiKeys.alreadyRevoked', { defaultValue: 'This key is already revoked' })
              : t('apiKeys.revokeTooltip', { defaultValue: 'Revoke "{{name}}"', name: item.name })
          }
          className="rounded-lg p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent transition-colors"
        >
          {revokingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/** Koppel-instructies: Claude/ChatGPT-connector in 3 stappen + de 17 MCP-tools. */
function ConnectPanel({ t }: { t: TFunction }) {
  // window is niet beschikbaar tijdens prerender — lazy initializer, geen effect.
  const [origin] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin));
  const mcpUrl = `${origin}/api/mcp`;

  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Plug className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-semibold">
          {t('apiKeys.connectHeading', { defaultValue: 'Connect Claude / ChatGPT' })}
        </h3>
      </div>
      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
        <li>
          {t('apiKeys.connectStep1', {
            defaultValue: 'Create an API key above and copy it — it is shown only once.',
          })}
        </li>
        <li>
          {t('apiKeys.connectStep2', {
            defaultValue: 'In Claude or ChatGPT, go to Settings → Connectors and add this URL as a custom connector:',
          })}{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono select-all" style={{ wordBreak: 'break-all' }}>
            {mcpUrl}
          </code>
        </li>
        <li>
          {t('apiKeys.connectStep3', {
            defaultValue: 'Authorize with your API key as Bearer token — the connector is then scoped to this workspace.',
          })}
        </li>
      </ol>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          {t('apiKeys.toolsHeading', { defaultValue: 'Available tools ({{count}})', count: MCP_TOOLS.length })}
        </h4>
        <div className="space-y-1.5">
          {MCP_TOOLS.map((tool) => (
            <div key={tool.name} className="flex items-baseline gap-2 text-xs">
              <code className="font-mono text-teal-600 whitespace-nowrap flex-shrink-0">{tool.name}</code>
              <span className="text-gray-500">{tool.desc}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400">
        {t('apiKeys.flagNote', {
          defaultValue:
            'The public API is gated behind the PUBLIC_API_ENABLED feature flag. Key management always works, but connector calls only succeed once the flag is enabled on the server.',
        })}
      </p>
    </div>
  );
}

/**
 * Settings-tab "API & Connectors" — lijst + aanmaken + intrekken van
 * publieke-API-keys en koppel-instructies voor Claude/ChatGPT (MCP).
 */
export function ApiKeysTab() {
  const { t } = useTranslation('settings-misc');
  const queryClient = useQueryClient();
  const { data: keys = [], isLoading, isError } = useQuery({
    queryKey: ['workspace', 'api-keys'],
    queryFn: fetchKeys,
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const refetchKeys = () => queryClient.invalidateQueries({ queryKey: ['workspace', 'api-keys'] });

  const error = isError
    ? t('apiKeys.loadFailed', { defaultValue: 'Could not load API keys. Only workspace owners and admins can manage them.' })
    : actionError;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isCreating) return;
    setIsCreating(true);
    setActionError(null);
    try {
      setCreatedKey(await createKey(name.trim()));
      setName('');
      await refetchKeys();
    } catch {
      setActionError(t('apiKeys.createFailed', { defaultValue: 'Could not create the API key' }));
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (item: ApiKeyItem) => {
    if (!window.confirm(t('apiKeys.revokeConfirm', {
      defaultValue: 'Revoke "{{name}}"? Integrations using this key will stop working immediately. This cannot be undone.',
      name: item.name,
    }))) {
      return;
    }
    setRevokingId(item.id);
    setActionError(null);
    try {
      await revokeKey(item.id);
      if (createdKey?.id === item.id) setCreatedKey(null);
      await refetchKeys();
    } catch {
      setActionError(t('apiKeys.revokeFailed', { defaultValue: 'Could not revoke the API key' }));
    } finally {
      setRevokingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          {t('apiKeys.heading', { defaultValue: 'API & Connectors' })}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('apiKeys.description', {
            defaultValue:
              'API keys give external tools like Claude and ChatGPT access to the brand tools of this workspace. Keys are workspace-scoped; only owners and admins can manage them.',
          })}
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {createdKey && (
        <NewKeyReveal createdKey={createdKey} onDismiss={() => setCreatedKey(null)} t={t} />
      )}

      <form onSubmit={handleCreate} className="flex items-end gap-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
        <div className="flex-1 space-y-1">
          <label htmlFor="api-key-name" className="text-sm font-medium text-gray-700">
            {t('apiKeys.nameLabel', { defaultValue: 'Key name' })}
          </label>
          <input
            id="api-key-name"
            data-testid="api-key-name-input"
            type="text"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('apiKeys.namePlaceholder', { defaultValue: 'e.g. Claude connector' })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
          />
        </div>
        <button
          type="submit"
          data-testid="api-key-create"
          disabled={isCreating || !name.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t('apiKeys.create', { defaultValue: 'Create key' })}
        </button>
      </form>

      {keys.length === 0 ? (
        <p className="text-sm text-gray-400">
          {t('apiKeys.empty', { defaultValue: 'No API keys yet. Create one to connect an external tool.' })}
        </p>
      ) : (
        <div className="space-y-2">
          {keys.map((item) => (
            <KeyRow key={item.id} item={item} revokingId={revokingId} onRevoke={handleRevoke} t={t} />
          ))}
        </div>
      )}

      <ConnectPanel t={t} />
    </div>
  );
}
