'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared';
import { normaliseUserUrl, INVALID_URL_MESSAGE } from '@/lib/utils/normalise-url';
import { useKnowledgeLibraryStore } from '@/stores/useKnowledgeLibraryStore';
import { useImportUrl } from '../../hooks';
import { SUPPORTED_IMPORT_PLATFORMS } from '../../constants/library-constants';

interface SmartImportTabProps {
  onSwitchToManual: () => void;
}

export function SmartImportTab({ onSwitchToManual }: SmartImportTabProps) {
  const { t } = useTranslation('knowledge-library');
  const store = useKnowledgeLibraryStore();
  const importUrl = useImportUrl();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    setError(null);
    const normalised = normaliseUserUrl(url);
    if (!normalised) {
      setError(INVALID_URL_MESSAGE);
      return;
    }
    if (normalised !== url) setUrl(normalised);

    importUrl
      .mutateAsync({ url: normalised })
      .then((data) => {
        store.setImportedMetadata(data);
        store.setSelectedResourceType(data.detectedType);
        onSwitchToManual();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('smartImport.importFailed'));
      });
  };

  return (
    <div className="flex flex-col items-center py-8 px-4">
      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <Sparkles className="h-6 w-6 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('smartImport.title')}</h3>
      <p className="text-sm text-gray-500 mb-6 text-center">
        {t('smartImport.subtitle')}
      </p>

      <div className="w-full space-y-3">
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          data-testid="import-url-input"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder={t('smartImport.urlPlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && handleImport()}
        />
        {error && (
          <p data-testid="import-error" className="text-xs text-red-500">{error}</p>
        )}
        <Button
          variant="primary"
          onClick={handleImport}
          isLoading={importUrl.isPending}
          className="w-full"
          data-testid="import-button"
        >
          {t('smartImport.importButton')}
        </Button>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        {t('smartImport.supportedPlatforms', { platforms: SUPPORTED_IMPORT_PLATFORMS })}
      </p>
    </div>
  );
}
