'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Button } from '@/components/shared';

/** Download All Data button — triggers full workspace JSON export */
export function DataExportSection() {
  const { t } = useTranslation('settings-account');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/workspace/export');
      // M2 gates this endpoint behind owner/admin — surface an accurate message
      // instead of the generic "try again" (retrying never helps a viewer/member).
      if (res.status === 403) {
        alert(t('dataExport.forbidden'));
        return;
      }
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from Content-Disposition header or use default
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^"]+)"?/);
      link.download = match?.[1] ?? 'branddock-workspace-export.json';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[DataExportSection] Export failed:', error);
      alert(t('dataExport.failed'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-50">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">{t('dataExport.title')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('dataExport.description')}</p>
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            isLoading={isExporting}
            onClick={handleExport}
            className="mt-3"
          >
            {isExporting ? t('dataExport.exporting') : t('dataExport.title')}
          </Button>
        </div>
      </div>
    </div>
  );
}
