"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Modal, Badge } from "@/components/shared";
import type { StyleguideColor } from "../types/brandstyle.types";

interface ColorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  color: StyleguideColor | null;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-mono text-gray-900">{value}</p>
      </div>
      <button
        onClick={handleCopy}
        className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}

function ContrastBadge({ level }: { level: string | null }) {
  if (!level) return null;
  const variant = level === "AAA" ? "success" : level === "AA" ? "info" : "danger";
  return <Badge variant={variant} size="sm">{level}</Badge>;
}

export function ColorDetailModal({ isOpen, onClose, color }: ColorDetailModalProps) {
  if (!color) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={color.name} size="md" data-testid="color-detail-modal">
      <div className="flex gap-6">
        {/* Left: color swatch */}
        <div className="w-1/2">
          <div
            className="w-full aspect-square rounded-xl border border-gray-200"
            style={{ backgroundColor: color.hex }}
          />
        </div>

        {/* Right: info panel */}
        <div className="w-1/2 space-y-4">
          {/* Color values */}
          <div className="space-y-1 divide-y divide-gray-100">
            <CopyButton label="HEX" value={color.hex} />
            {color.rgb && <CopyButton label="RGB" value={color.rgb} />}
            {color.hsl && <CopyButton label="HSL" value={color.hsl} />}
            {color.cmyk && <CopyButton label="CMYK" value={color.cmyk} />}
          </div>

          {/* Accessibility */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Accessibility
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">On White</span>
                <ContrastBadge level={color.contrastWhite} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">On Black</span>
                <ContrastBadge level={color.contrastBlack} />
              </div>
            </div>
          </div>

          {/* Tags */}
          {color.tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {color.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {color.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Notes
              </p>
              <p className="text-sm text-gray-600">{color.notes}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
