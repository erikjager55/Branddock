'use client';

import { Chrome, MessageSquare, Monitor, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useConnectAccount, useDisconnectAccount } from '@/hooks/use-settings';
import { Button, Badge } from '@/components/shared';
import type { ConnectedAccountItem as ConnectedAccountItemType } from '@/types/settings';

interface ConnectedAccountItemProps {
  account: ConnectedAccountItemType;
}

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  GOOGLE: Chrome,
  google: Chrome,
  SLACK: MessageSquare,
  MICROSOFT: Monitor,
  microsoft: Monitor,
  APPLE: Smartphone,
  apple: Smartphone,
};

const PROVIDER_LABELS: Record<string, string> = {
  GOOGLE: 'Google',
  google: 'Google',
  SLACK: 'Slack',
  MICROSOFT: 'Microsoft',
  microsoft: 'Microsoft',
  APPLE: 'Apple',
  apple: 'Apple',
  credential: 'E-mail & Wachtwoord',
};

export function ConnectedAccountItem({ account }: ConnectedAccountItemProps) {
  const connectAccount = useConnectAccount();
  const disconnectAccount = useDisconnectAccount();

  const Icon = PROVIDER_ICONS[account.provider] ?? Monitor;
  const label = PROVIDER_LABELS[account.provider] ?? account.provider;
  const isConnected = account.status === 'CONNECTED';

  function handleConnect() {
    connectAccount.mutate(account.provider);
  }

  function handleDisconnect() {
    disconnectAccount.mutate(account.provider);
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {isConnected && account.providerUserId && (
            <p className="text-xs text-gray-500">{account.providerUserId}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isConnected && (
          <Badge variant="success" size="sm">Connected</Badge>
        )}
        {isConnected ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            isLoading={disconnectAccount.isPending}
          >
            Disconnect
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleConnect}
            isLoading={connectAccount.isPending}
          >
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}
