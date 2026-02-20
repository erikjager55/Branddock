"use client";

import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Pencil, Copy, Archive, Trash2 } from "lucide-react";

interface CampaignOverflowMenuProps {
  onEdit?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  isArchived?: boolean;
}

export function CampaignOverflowMenu({
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  isArchived,
}: CampaignOverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border py-1 z-20">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
          )}
          {onArchive && (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Archive className="h-3.5 w-3.5" /> {isArchived ? "Unarchive" : "Archive"}
            </button>
          )}
          {onDelete && (
            <>
              <div className="border-t my-1" />
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
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
