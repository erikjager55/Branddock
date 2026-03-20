'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, Image, Film, FileSpreadsheet, ClipboardCheck, History } from 'lucide-react';
import { Button } from '@/components/shared';
import { getFormatsForType } from '@/lib/studio/export-formats';
import { useContentStudioStore } from '@/stores/useContentStudioStore';
import {
  exportAsPdf,
  exportAsHtml,
  exportAsText,
  downloadImage,
  sanitizeFilename,
  exportVersionHistoryPdf,
} from '@/lib/studio/export-studio-content';
import { exportQualityReportPdf } from '../../utils/exportQualityReportPdf';
import { useQualityScore, useImproveSuggestions, useVersions } from '../../hooks/studio.hooks';

// ─── Types ─────────────────────────────────────────────

interface ExportDropdownProps {
  title: string;
  contentType: string;
  campaignTitle: string;
  contentTab: string | null;
  deliverableId: string;
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

export function ExportDropdown({ title, contentType, campaignTitle, contentTab, deliverableId }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: qualityData } = useQualityScore(deliverableId);
  const { data: improveData } = useImproveSuggestions(deliverableId);
  const { data: versionsData } = useVersions(deliverableId);

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
    const store = useContentStudioStore.getState();
    const ctx = {
      title,
      contentType,
      campaignTitle,
      textContent: store.textContent,
      imageUrls: store.imageUrls,
      videoUrl: store.videoUrl,
    };

    switch (formatId) {
      case 'pdf':
        exportAsPdf(ctx);
        break;
      case 'html':
        exportAsHtml(ctx);
        break;
      case 'txt':
        exportAsText(ctx);
        break;
      case 'jpeg':
      case 'png':
      case 'webp':
        // Download first image
        if (ctx.imageUrls.length > 0) {
          downloadImage(ctx.imageUrls[0], `${sanitizeFilename(title)}.${formatId}`);
        }
        break;
      case 'mp4':
      case 'webm':
        if (ctx.videoUrl) {
          downloadImage(ctx.videoUrl, `${sanitizeFilename(title)}.${formatId}`);
        }
        break;
      default:
        exportAsText(ctx);
    }

    setIsOpen(false);
  };

  const handleVersionHistory = () => {
    const versions = Array.isArray(versionsData) ? versionsData : [];
    if (versions.length === 0) return;
    exportVersionHistoryPdf({
      deliverableTitle: title,
      campaignTitle,
      contentType,
      versions,
    });
    setIsOpen(false);
  };

  const handleQualityReport = () => {
    if (!qualityData) return;
    const store = useContentStudioStore.getState();
    exportQualityReportPdf({
      deliverableTitle: title,
      campaignTitle,
      contentType,
      quality: qualityData,
      suggestions: improveData?.suggestions ?? [],
      potentialScore: improveData?.potentialScore ?? null,
      checklistItems: store.checklistItems,
    });
    setIsOpen(false);
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

          {/* Quality Report separator + items */}
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={handleQualityReport}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ClipboardCheck className="w-4 h-4 text-gray-400" />
            <span className="flex-1 text-left">Quality Report</span>
            <span className="text-xs text-gray-400">.pdf</span>
          </button>
          {Array.isArray(versionsData) && versionsData.length > 0 && (
            <button
              onClick={handleVersionHistory}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <History className="w-4 h-4 text-gray-400" />
              <span className="flex-1 text-left">Version History</span>
              <span className="text-xs text-gray-400">.pdf</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ExportDropdown;
