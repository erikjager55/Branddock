/**
 * AddContentModal — lightweight entry point for content creation.
 *
 * Only one question: existing campaign or new format?
 * - Existing campaign → navigate to campaign detail (add content there)
 * - New format → name it, then start wizard (strategy + concept pipeline)
 */

"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Megaphone, FolderOpen, Sparkles } from "lucide-react";
import { Modal, Input, Badge, Button } from "@/components/shared";
import { useCampaigns } from "../../hooks";

// ─── Types ─────────────────────────────────────────────────

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-selected campaign (skips selection, goes straight to campaign detail) */
  campaignId?: string;
  campaignName?: string;
  /** Navigate to campaign detail to add content there */
  onSelectCampaign?: (campaignId: string) => void;
  /** Start wizard for a new format */
  onStartWizard?: (formatName: string) => void;
}

// ─── Component ─────────────────────────────────────────────

export function AddContentModal({
  isOpen,
  onClose,
  campaignId: preSelectedCampaignId,
  onSelectCampaign,
  onStartWizard,
}: AddContentModalProps) {
  const { t } = useTranslation('campaigns-core');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isNewFormat, setIsNewFormat] = useState(false);
  const [formatName, setFormatName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: campaigns } = useCampaigns();

  // If pre-selected, skip modal entirely
  useEffect(() => {
    if (isOpen && preSelectedCampaignId) {
      onSelectCampaign?.(preSelectedCampaignId);
      onClose();
    }
  }, [isOpen, preSelectedCampaignId, onSelectCampaign, onClose]);

  const resetAndClose = useCallback(() => {
    setSelectedCampaignId(null);
    setIsNewFormat(false);
    setFormatName("");
    setError(null);
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    if (isNewFormat) {
      if (!formatName.trim()) return;
      resetAndClose();
      onStartWizard?.(formatName.trim());
    } else if (selectedCampaignId) {
      resetAndClose();
      onSelectCampaign?.(selectedCampaignId);
    }
  }, [isNewFormat, formatName, selectedCampaignId, resetAndClose, onStartWizard, onSelectCampaign]);

  const canConfirm = isNewFormat
    ? formatName.trim().length > 0
    : !!selectedCampaignId;

  // Don't render if pre-selected campaign (handled by useEffect)
  if (preSelectedCampaignId) return null;

  const campaignList = campaigns?.campaigns ?? [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title={t('addContent.title')}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={resetAndClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            {t('actions.cancel')}
          </button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {isNewFormat ? t('addContent.createFormat') : t('actions.continue')}
          </Button>
        </div>
      }
    >
      <div className="space-y-1 max-h-[50vh] overflow-y-auto rounded-lg border border-gray-200 p-2">
        {/* Existing campaigns + formats */}
        {campaignList.map((c) => {
          const isActive = selectedCampaignId === c.id && !isNewFormat;
          const isFormat = (c.type as string) === "CONTENT";
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => { setSelectedCampaignId(c.id); setIsNewFormat(false); }}
              style={isActive ? { backgroundColor: "#f0fdfa", borderColor: "#0d9488" } : undefined}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                isActive ? "font-medium text-teal-800" : "border-transparent text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                {isFormat
                  ? <Sparkles className="w-4 h-4 text-violet-500 flex-shrink-0" />
                  : <Megaphone className="w-4 h-4 text-teal-500 flex-shrink-0" />
                }
                <span className="truncate">{c.title}</span>
              </span>
              <Badge variant={isFormat ? "default" : "teal"} size="sm">
                {isFormat ? t('addContent.badge.format') : t('addContent.badge.campaign')}
              </Badge>
            </button>
          );
        })}

        {/* Create new format */}
        <div className="border-t border-gray-100 mt-1 pt-1">
          <button
            type="button"
            onClick={() => { setSelectedCampaignId(null); setIsNewFormat(true); }}
            style={isNewFormat ? { backgroundColor: "#f0fdfa", borderColor: "#0d9488" } : undefined}
            className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border text-sm transition-colors ${
              isNewFormat ? "font-medium text-teal-800" : "border-transparent text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Plus className="w-4 h-4" />
            {t('addContent.createNewFormat')}
          </button>

          {isNewFormat && (
            <div className="px-3 pt-2 pb-1">
              <Input
                value={formatName}
                onChange={(e) => setFormatName(e.target.value)}
                placeholder={t('addContent.formatNamePlaceholder')}
                required
              />
              <p className="text-xs text-gray-400 mt-1.5">
                {t('addContent.formatHelp')}
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-3" role="alert">{error}</p>
      )}
    </Modal>
  );
}
