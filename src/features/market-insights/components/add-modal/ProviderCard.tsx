'use client';

import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/shared';
import type { ImportProvider } from '../../types/market-insight.types';

interface ProviderCardProps {
  provider: ImportProvider;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <div data-testid="provider-card" className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{provider.name}</h3>
        <span className="px-2 py-0.5 border border-gray-200 text-xs text-gray-600 rounded">
          {provider.tier}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{provider.description}</p>
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {provider.categories.map((cat) => (
          <span
            key={cat}
            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
          >
            {cat}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={ExternalLink}
          onClick={() => window.open(provider.websiteUrl, '_blank')}
        >
          Visit Website
        </Button>
        <Button
          size="sm"
          onClick={() => {
            // Stub: show toast
            alert('Import integration coming soon');
          }}
        >
          Connect
        </Button>
      </div>
    </div>
  );
}
