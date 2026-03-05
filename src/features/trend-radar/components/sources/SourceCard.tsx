'use client';

import { ExternalLink, MoreVertical, Pause, Play, Pencil, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/shared';
import { SOURCE_STATUS_CONFIG } from '../../constants/trend-radar-constants';
import type { TrendSourceWithMeta } from '../../types/trend-radar.types';

interface SourceCardProps {
  source: TrendSourceWithMeta;
  onEdit: (id: string) => void;
  onTogglePause: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SourceCard({ source, onEdit, onTogglePause, onDelete }: SourceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const statusConfig = SOURCE_STATUS_CONFIG[source.status];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const trendCount = source._count?.detectedTrends ?? 0;
  const lastChecked = source.lastCheckedAt
    ? new Date(source.lastCheckedAt).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <Card hoverable className="relative">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConfig.dotColor}`} />
            <h3 className="text-sm font-semibold text-gray-900 truncate">{source.name}</h3>
          </div>

          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-10 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                <button
                  onClick={() => { onEdit(source.id); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => { onTogglePause(source.id); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {source.isActive ? (
                    <><Pause className="w-3.5 h-3.5" /> Pause</>
                  ) : (
                    <><Play className="w-3.5 h-3.5" /> Resume</>
                  )}
                </button>
                <button
                  onClick={() => { onDelete(source.id); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* URL */}
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-600 truncate mb-3"
        >
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{source.url}</span>
        </a>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{trendCount} trend{trendCount !== 1 ? 's' : ''} detected</span>
          <span>Last: {lastChecked}</span>
        </div>

        {/* Status badge */}
        <div className="mt-3">
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
          {source.category && (
            <span className="ml-1.5 inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {source.category}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
