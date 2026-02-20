'use client';

import { IMPORT_PROVIDERS } from '../../constants/insight-constants';
import { ProviderCard } from './ProviderCard';

export function ImportDatabaseTab() {
  return (
    <div data-testid="import-database-tab" className="grid grid-cols-2 gap-4">
      {IMPORT_PROVIDERS.map((provider) => (
        <ProviderCard key={provider.id} provider={provider} />
      ))}
    </div>
  );
}
