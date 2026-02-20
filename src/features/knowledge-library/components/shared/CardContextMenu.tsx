'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Pencil, Download, Archive, Trash2 } from 'lucide-react';

interface CardContextMenuProps {
  onEdit?: () => void;
  onDownload?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

export function CardContextMenu({ onEdit, onDownload, onArchive, onDelete }: CardContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        data-testid="context-menu-button"
        className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div data-testid="context-menu-dropdown" className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          {onDownload && (
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(); setIsOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </button>
          )}
          {onArchive && (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(); setIsOpen(false); }}
              data-testid="context-menu-archive"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
          )}
          {onDelete && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }}
                data-testid="context-menu-delete"
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
