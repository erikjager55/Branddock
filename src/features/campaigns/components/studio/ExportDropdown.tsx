'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, Image, Film, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/shared';
import { getFormatsForType } from '@/lib/studio/export-formats';
import { useExport } from '../../hooks/studio.hooks';

// ─── Types ─────────────────────────────────────────────

interface ExportDropdownProps {
  deliverableId: string;
  contentTab: string | null;
}

// ─── Icon mapping ──────────────────────────────────────

function getFormatIcon(formatId: string) {
  switch (formatId) {
    case 'jpeg':
    case 'png':
    case 'webp':
      return Image;
    case 'mp4':
    case 'webm':
      return Film;
    case 'pptx':
      return FileSpreadsheet;
    default:
      return FileText;
  }
}

// ─── Component ─────────────────────────────────────────

export function ExportDropdown({ deliverableId, contentTab }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exportMutation = useExport(deliverableId);

  const rawFormats = getFormatsForType(contentTab);
  const formats = Array.isArray(rawFormats) ? rawFormats : [];

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleExport = (formatId: string) => {
    exportMutation.mutate(
      { format: formatId },
      {
        onSuccess: (data) => {
          // Open download URL
          window.open(data.downloadUrl, '_blank');
          setIsOpen(false);
        },
      }
    );
  };

  return (
    <div data-testid="export-dropdown" className="relative" ref={dropdownRef}>
      <Button
        data-testid="export-button"
        variant="secondary"
        size="sm"
        icon={Download}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Export
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1">
          {formats.map((fmt) => {
            const FormatIcon = getFormatIcon(fmt.id);
            return (
              <button
                key={fmt.id}
                onClick={() => handleExport(fmt.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FormatIcon className="w-4 h-4 text-gray-400" />
                <span className="flex-1 text-left">{fmt.label}</span>
                <span className="text-xs text-gray-400">{fmt.extension}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ExportDropdown;
