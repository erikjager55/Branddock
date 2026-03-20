'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/shared';

/** Download All Data button — triggers full workspace JSON export */
export function DataExportSection() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/workspace/export');
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
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-50">
          <Download className="w-5 h-5 text-teal-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">Download All Data</h3>
          <p className="mt-1 text-sm text-gray-500">
            Export all your workspace data as a single JSON file. Includes brand assets,
            personas, products, campaigns, trends, strategies, and more.
          </p>
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            isLoading={isExporting}
            onClick={handleExport}
            className="mt-3"
          >
            {isExporting ? 'Exporting...' : 'Download All Data'}
          </Button>
        </div>
      </div>
    </div>
  );
}
