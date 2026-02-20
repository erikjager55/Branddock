'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Copy, Share2, Trash2 } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────

interface StudioContextMenuProps {
  onDuplicate: () => void;
  onShare: () => void;
  onDelete: () => void;
}

// ─── Component ─────────────────────────────────────────

export function StudioContextMenu({ onDuplicate, onShare, onDelete }: StudioContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
        aria-label="More actions"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1">
          <button
            onClick={() => handleAction(onDuplicate)}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Copy className="w-4 h-4 text-gray-400" />
            Duplicate
          </button>
          <button
            onClick={() => handleAction(onShare)}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4 text-gray-400" />
            Share
          </button>
          <button
            onClick={() => handleAction(onDelete)}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default StudioContextMenu;
