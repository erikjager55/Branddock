"use client";

import { useRef, useEffect } from "react";
import {
  MoreVertical,
  Pencil,
  Copy,
  Download,
  Trash2,
  Lock,
  Unlock,
} from "lucide-react";
import { useBrandAssetDetailStore } from "../store/useBrandAssetDetailStore";
import { useDuplicateAsset } from "../hooks/useBrandAssetDetail";
import type { BrandAssetDetail } from "../types/brand-asset-detail.types";

interface AssetOverflowMenuProps {
  asset: BrandAssetDetail;
  onToggleLock: () => void;
  isLocked: boolean;
}

export function AssetOverflowMenu({
  asset,
  onToggleLock,
  isLocked,
}: AssetOverflowMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const showMenu = useBrandAssetDetailStore((s) => s.showOverflowMenu);
  const setShowMenu = useBrandAssetDetailStore((s) => s.setShowOverflowMenu);
  const setIsEditing = useBrandAssetDetailStore((s) => s.setIsEditing);
  const setShowDelete = useBrandAssetDetailStore((s) => s.setShowDeleteDialog);
  const duplicateAsset = useDuplicateAsset(asset.id);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu, setShowMenu]);

  const actions = [
    {
      label: "Edit Content",
      icon: Pencil,
      disabled: isLocked,
      onClick: () => {
        setIsEditing(true);
        setShowMenu(false);
      },
    },
    {
      label: "Duplicate",
      icon: Copy,
      onClick: () => {
        duplicateAsset.mutate();
        setShowMenu(false);
      },
    },
    {
      label: "Export",
      icon: Download,
      onClick: () => setShowMenu(false),
    },
    {
      label: isLocked ? "Unlock" : "Lock",
      icon: isLocked ? Unlock : Lock,
      onClick: () => {
        onToggleLock();
        setShowMenu(false);
      },
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: () => {
        setShowDelete(true);
        setShowMenu(false);
      },
      danger: true,
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreVertical className="w-5 h-5 text-gray-500" />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                action.danger
                  ? "text-red-600 hover:bg-red-50"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
