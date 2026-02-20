'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/shared';
import { useKnowledgeLibraryStore } from '@/stores/useKnowledgeLibraryStore';
import { useImportUrl } from '../../hooks';
import { SUPPORTED_IMPORT_PLATFORMS } from '../../constants/library-constants';

interface SmartImportTabProps {
  onSwitchToManual: () => void;
}

export function SmartImportTab({ onSwitchToManual }: SmartImportTabProps) {
  const store = useKnowledgeLibraryStore();
  const importUrl = useImportUrl();
  const [url, setUrl] = useState('');

  const handleImport = () => {
    if (!url.trim()) return;

    importUrl.mutateAsync({ url: url.trim() }).then((data) => {
      store.setImportedMetadata(data);
      store.setSelectedResourceType(data.detectedType);
      onSwitchToManual();
    });
  };

  return (
    <div className="flex flex-col items-center py-8 px-4">
      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <Sparkles className="h-6 w-6 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Smart Import</h3>
      <p className="text-sm text-gray-500 mb-6 text-center">
        Paste a URL and we&apos;ll extract the details
      </p>

      <div className="w-full space-y-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          data-testid="import-url-input"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder="https://..."
          onKeyDown={(e) => e.key === 'Enter' && handleImport()}
        />
        <Button
          variant="primary"
          onClick={handleImport}
          isLoading={importUrl.isPending}
          className="w-full"
          data-testid="import-button"
        >
          Import
        </Button>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Supported platforms: {SUPPORTED_IMPORT_PLATFORMS}
      </p>
    </div>
  );
}
