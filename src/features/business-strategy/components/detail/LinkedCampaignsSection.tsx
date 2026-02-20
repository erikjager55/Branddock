'use client';

import { Link2 } from 'lucide-react';
import { EmptyState } from '@/components/shared';

export function LinkedCampaignsSection() {
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Linked Campaigns</h2>
      <EmptyState
        icon={Link2}
        title="No campaigns linked yet"
        description="Link campaigns when the Campaign module is available."
      />
    </div>
  );
}
