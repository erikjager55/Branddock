'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, MoreVertical, Pencil, Copy, Trash2, MessageCircle, BookOpen } from 'lucide-react';
import { Card, Badge } from '@/components/shared';
import { EXPLORATION_AI_MODELS } from '@/lib/ai/exploration/config.types';
import type { ExplorationConfigData } from '@/lib/ai/exploration/config.types';

// ─── Props ──────────────────────────────────────────────────

interface ConfigCardProps {
  config: ExplorationConfigData;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

// ─── Component ──────────────────────────────────────────────

export function ConfigCard({ config, onSelect, onDuplicate, onDelete }: ConfigCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const model = EXPLORATION_AI_MODELS.find((m) => m.id === config.model);
  const dimensionCount = Array.isArray(config.dimensions) ? config.dimensions.length : 0;
  const displayLabel = config.label || `${config.itemType}${config.itemSubType ? ` → ${config.itemSubType}` : ''}`;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  return (
    <Card
      hoverable
      padding="none"
      onClick={onSelect}
      className="group relative"
    >
      <div className="p-4">
        {/* Top row: icon + label + badges */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              config.isActive ? 'bg-teal-50' : 'bg-gray-100'
            }`}>
              <Bot className={`w-5 h-5 ${config.isActive ? 'text-teal-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{displayLabel}</h3>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                {config.itemType}{config.itemSubType ? ` / ${config.itemSubType}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config.isActive ? 'success' : 'default'} size="sm">
              {config.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {/* Overflow menu */}
            <div ref={menuRef} className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onSelect();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDuplicate();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Duplicate
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="font-medium">{model?.label ?? config.model}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <MessageCircle className="w-3 h-3" />
            <span>{dimensionCount} dimensions</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <BookOpen className="w-3 h-3" />
            <span>temp {config.temperature.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
