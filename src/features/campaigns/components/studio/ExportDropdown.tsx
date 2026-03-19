'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, Image, Film, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/shared';
import { getFormatsForType } from '@/lib/studio/export-formats';
import { useContentStudioStore } from '@/stores/useContentStudioStore';
import {
  exportAsPdf,
  exportAsHtml,
  exportAsText,
  downloadImage,
  sanitizeFilename,
} from '@/lib/studio/export-studio-content';

// ─── Types ─────────────────────────────────────────────

interface ExportDropdownProps {
  title: string;
  contentType: string;
  campaignTitle: string;
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

export function ExportDropdown({ title, contentType, campaignTitle, contentTab }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
