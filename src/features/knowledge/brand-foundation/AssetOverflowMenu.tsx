"use client";

import { Dropdown, DropdownEntry } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/Button";
import {
  MoreVertical,
  Edit,
  RefreshCw,
  Copy,
  Download,
  Trash2,
  Lock,
  Unlock,
  Check,
} from "lucide-react";
import { AssetStatus } from "@/types/brand-asset";
import { useState } from "react";

interface AssetOverflowMenuProps {
  assetId: string;
  assetName: string;
  currentStatus: AssetStatus;
  isLocked: boolean;
  onStatusChange: (status: AssetStatus) => void;
  onLockToggle: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
}

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ACTIVE", label: "Active" },
  { value: "VALIDATED", label: "Validated" },
];

export function AssetOverflowMenu({
  assetId,
  assetName,
  currentStatus,
  isLocked,
  onStatusChange,
  onLockToggle,
  onDelete,
  onDuplicate,
  onExport,
}: AssetOverflowMenuProps) {
  const [statusSubmenuOpen, setStatusSubmenuOpen] = useState(false);

  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }
    // Default: JSON download
    const blob = new Blob(
      [JSON.stringify({ id: assetId, name: assetName }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${assetName.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDuplicate = async () => {
    if (onDuplicate) {
      onDuplicate();
      return;
    }
    try {
      await fetch(`/api/brand-assets/${assetId}/duplicate`, {
        method: "POST",
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to duplicate:", error);
    }
  };

  const items: DropdownEntry[] = [
    {
      label: "Change Status",
      icon: <RefreshCw className="w-4 h-4" />,
      onClick: () => setStatusSubmenuOpen(!statusSubmenuOpen),
    },
    {
      label: "Duplicate Asset",
      icon: <Copy className="w-4 h-4" />,
      onClick: handleDuplicate,
    },
    {
      label: "Export JSON",
      icon: <Download className="w-4 h-4" />,
      onClick: handleExport,
    },
    {
      label: isLocked ? "Unlock Asset" : "Lock Asset",
      icon: isLocked ? (
        <Unlock className="w-4 h-4" />
      ) : (
        <Lock className="w-4 h-4" />
      ),
      onClick: onLockToggle,
    },
    "separator",
    {
      label: "Delete Asset",
      icon: <Trash2 className="w-4 h-4" />,
      danger: true,
      onClick: onDelete,
    },
  ];

  return (
    <div className="relative">
      <Dropdown
        trigger={
          <Button variant="ghost" size="sm" className="!p-2">
            <MoreVertical className="w-4 h-4" />
          </Button>
        }
        items={items}
        align="right"
      />

      {/* Status submenu (simple inline for now) */}
      {statusSubmenuOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border border-border-dark bg-surface-dark shadow-lg p-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onStatusChange(opt.value);
                setStatusSubmenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded text-text-dark hover:bg-background-dark transition-colors"
            >
              {currentStatus === opt.value && (
                <Check className="w-3.5 h-3.5 text-primary" />
              )}
              <span className={currentStatus === opt.value ? "font-medium" : ""}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
