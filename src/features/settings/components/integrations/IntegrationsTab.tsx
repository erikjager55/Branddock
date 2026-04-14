'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plug,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Building2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button, Modal, Input } from '@/components/shared';
import {
  usePublishChannels,
  useCreateChannel,
  useDeleteChannel,
} from '../../hooks/use-publish-channels';
import type { PublishChannelSummary, CreateChannelBody } from '../../api/publish-channels.api';
import { SocialProfileSelector } from './SocialProfileSelector';

// ─── Platform Definitions ──────────────────────────────────

interface PlatformDef {
  id: string;
  label: string;
  provider: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  /** If true, uses OAuth flow instead of manual credential entry */
  oauthConnect: boolean;
  /** Manual credential fields (only used when oauthConnect is false) */
  credentialFields: { key: string; label: string; type: 'text' | 'password'; placeholder: string }[];
  docsUrl?: string;
}

const PLATFORMS: PlatformDef[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    provider: 'linkedin-direct',
    icon: 'in',
    color: '#0A66C2',
    bgColor: 'bg-blue-50',
    description: 'Publish posts to your LinkedIn personal profile or company pages.',
    oauthConnect: true,
    credentialFields: [],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    provider: 'instagram-direct',
    icon: 'ig',
    color: '#E1306C',
    bgColor: 'bg-pink-50',
    description: 'Publish posts to your Instagram business account.',
    oauthConnect: true,
    credentialFields: [],
  },
  {
    id: 'facebook',
    label: 'Facebook',
    provider: 'facebook-direct',
    icon: 'fb',
    color: '#1877F2',
    bgColor: 'bg-blue-50',
    description: 'Publish posts to your Facebook pages.',
    oauthConnect: true,
    credentialFields: [],
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    provider: 'tiktok-direct',
    icon: 'tt',
    color: '#000000',
    bgColor: 'bg-gray-100',
    description: 'Publish videos to TikTok.',
    oauthConnect: true,
    credentialFields: [],
  },
  {
    id: 'email',
    label: 'Email (Resend)',
    provider: 'resend',
    icon: '✉',
    color: '#000000',
    bgColor: 'bg-gray-100',
    description: 'Send email newsletters and promotional emails via Resend.',
    oauthConnect: false,
    credentialFields: [
      { key: 'apiKey', label: 'Resend API Key', type: 'password', placeholder: 're_...' },
      { key: 'fromEmail', label: 'From Email', type: 'text', placeholder: 'hello@yourdomain.com' },
      { key: 'fromName', label: 'From Name', type: 'text', placeholder: 'Your Brand Name' },
    ],
  },
  {
    id: 'wordpress',
    label: 'WordPress',
    provider: 'wordpress-rest',
    icon: 'wp',
    color: '#21759B',
    bgColor: 'bg-blue-50',
    description: 'Publish blog posts and pages to your WordPress site.',
    oauthConnect: false,
    credentialFields: [
      { key: 'siteUrl', label: 'WordPress Site URL', type: 'text', placeholder: 'https://yourdomain.com' },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'admin' },
      { key: 'appPassword', label: 'Application Password', type: 'password', placeholder: 'xxxx xxxx xxxx xxxx' },
    ],
    docsUrl: 'https://developer.wordpress.org/rest-api/',
  },
];

// ─── Token Health ──────────────────────────────────────────

function getTokenHealth(channel: PublishChannelSummary): 'valid' | 'expiring' | 'expired' | 'unknown' {
  const settings = channel.settings as Record<string, unknown> | null;
  const tokenExpiry = (settings as Record<string, unknown> | null)?.tokenExpiry as string | undefined;

  // For OAuth channels, check credentials (not in summary for security)
  // We rely on a tokenHealth field set by the backend in settings
  const health = settings?.tokenHealth as string | undefined;
  if (health === 'valid' || health === 'expiring' || health === 'expired') return health;

  // If no health info available, check lastPublishedAt as a proxy
  if (!channel.lastPublishedAt) return 'unknown';
  return 'unknown';
}

// ─── Component ─────────────────────────────────────────────

export function IntegrationsTab() {
  const { data: channels, isLoading } = usePublishChannels();
  const createChannel = useCreateChannel();
  const deleteChannel = useDeleteChannel();

  // Manual credential modal state
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformDef | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formLabel, setFormLabel] = useState('');
  const [formAccountName, setFormAccountName] = useState('');

  // OAuth profile selector state
  const [oauthSession, setOauthSession] = useState<{ platform: string; sessionId: string } | null>(null);

  // Check for OAuth callback params in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('social_connect_session');
    const platform = params.get('social_connect_platform');
    const error = params.get('social_connect_error');

    if (error) {
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete('social_connect_error');
      window.history.replaceState({}, '', url.toString());
    }

    if (sessionId && platform) {
      setOauthSession({ platform, sessionId });
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete('social_connect_session');
      url.searchParams.delete('social_connect_platform');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Group channels by platform for multi-account display
  const channelsByPlatform = new Map<string, PublishChannelSummary[]>();
  for (const ch of channels ?? []) {
    const list = channelsByPlatform.get(ch.platform) ?? [];
    list.push(ch);
    channelsByPlatform.set(ch.platform, list);
  }

  const handleConnect = (platform: PlatformDef) => {
    if (platform.oauthConnect) {
      // Redirect to OAuth authorize endpoint
      window.location.href = `/api/social-connect/${platform.id}/authorize`;
    } else {
      // Open manual credential modal
      setConnectingPlatform(platform);
      setFormValues({});
      setFormLabel('');
      setFormAccountName('');
    }
  };

  const handleSave = async () => {
    if (!connectingPlatform) return;

    const credentials: Record<string, unknown> = {};
    const settings: Record<string, unknown> = {};

    for (const field of connectingPlatform.credentialFields) {
      const val = formValues[field.key]?.trim();
      if (!val) continue;
      if (field.key === 'fromEmail' || field.key === 'fromName') {
        settings[field.key] = val;
      } else {
        credentials[field.key] = val;
      }
    }

    const body: CreateChannelBody = {
      platform: connectingPlatform.id,
      provider: connectingPlatform.provider,
      label: formLabel.trim() || undefined,
      accountName: formAccountName.trim() || undefined,
      credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
      settings: Object.keys(settings).length > 0 ? settings : undefined,
    };

    try {
      await createChannel.mutateAsync(body);
      setConnectingPlatform(null);
    } catch {
      // Error handled by React Query
    }
  };

  const handleDisconnect = async (channelId: string) => {
    if (!window.confirm('Disconnect this platform? Published content will remain online.')) return;
    deleteChannel.mutate(channelId);
  };

  const handleReconnect = (platform: PlatformDef) => {
    window.location.href = `/api/social-connect/${platform.id}/authorize`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Publishing Integrations</h2>
        <p className="text-sm text-gray-500 mt-1">
          Connect your publishing platforms to schedule and publish content directly from Branddock.
        </p>
        <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-md bg-blue-50 border border-blue-100">
          <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            These integrations are workspace-specific. Switch workspace to configure a different client.
          </p>
        </div>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => {
          const platformChannels = channelsByPlatform.get(platform.id) ?? [];
          const hasChannels = platformChannels.length > 0;

          return (
            <div
              key={platform.id}
              className={`rounded-lg border p-4 ${
                hasChannels ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${platform.bgColor}`}>
                    <span className="text-sm font-bold" style={{ color: platform.color }}>{platform.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{platform.label}</h3>
                    <p className="text-xs text-gray-500">
                      {platform.oauthConnect ? 'Direct connection' : platform.provider}
                    </p>
                  </div>
                </div>
                {hasChannels ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {platformChannels.length} account{platformChannels.length > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <XCircle className="h-3.5 w-3.5" />
                    Not connected
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 mb-3">{platform.description}</p>

              {/* Connected accounts list */}
              {platformChannels.length > 0 && (
                <div className="space-y-2 mb-3">
                  {platformChannels.map((ch) => {
                    const health = getTokenHealth(ch);
                    const isOAuth = platform.oauthConnect;

                    return (
                      <div key={ch.id} className="flex items-center justify-between rounded-md bg-white border border-gray-100 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Token health indicator for OAuth channels */}
                          {isOAuth && health === 'expiring' && (
                            <span title="Token expiring soon"><AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" /></span>
                          )}
                          {isOAuth && health === 'expired' && (
                            <span title="Token expired"><AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" /></span>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {ch.accountName ?? ch.label}
                            </p>
                            {ch.accountName && ch.label && ch.label !== ch.accountName && (
                              <p className="text-[10px] text-gray-400 truncate">{ch.label}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isOAuth && health === 'expired' && (
                            <button
                              type="button"
                              onClick={() => handleReconnect(platform)}
                              className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 mr-1"
                              title="Reconnect"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDisconnect(ch.id)}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={hasChannels ? 'ghost' : 'primary'}
                  onClick={() => handleConnect(platform)}
                  icon={Plus}
                  className="ml-auto"
                >
                  {hasChannels ? 'Add account' : 'Connect'}
                </Button>
                {platform.docsUrl && (
                  <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-600">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual credential modal (Email, WordPress) */}
      <Modal
        isOpen={!!connectingPlatform}
        onClose={() => setConnectingPlatform(null)}
        title={`Connect ${connectingPlatform?.label ?? ''}`}
        size="md"
      >
        {connectingPlatform && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{connectingPlatform.description}</p>

            <Input
              label="Account name"
              value={formAccountName}
              onChange={(e) => setFormAccountName(e.target.value)}
              placeholder="e.g. Company Newsletter, Marketing Blog..."
            />

            <Input
              label="Label (optional)"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              placeholder={`e.g. Primary ${connectingPlatform.label} account`}
            />

            {connectingPlatform.credentialFields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <input
                  type={field.type}
                  value={formValues[field.key] ?? ''}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            ))}

            {createChannel.isError && (
              <p className="text-sm text-red-600">
                {createChannel.error instanceof Error ? createChannel.error.message : 'Connection failed'}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setConnectingPlatform(null)}>Cancel</Button>
              <Button
                onClick={handleSave}
                isLoading={createChannel.isPending}
                disabled={createChannel.isPending}
              >
                Connect
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* OAuth profile selector modal */}
      {oauthSession && (
        <SocialProfileSelector
          platform={oauthSession.platform}
          sessionId={oauthSession.sessionId}
          onClose={() => setOauthSession(null)}
        />
      )}
    </div>
  );
}
