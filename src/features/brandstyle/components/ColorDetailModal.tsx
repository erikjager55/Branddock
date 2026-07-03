"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check } from "lucide-react";
import { Modal, Badge } from "@/components/shared";
import type { StyleguideColor } from "../types/brandstyle.types";

interface ColorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  color: StyleguideColor | null;
  /** Fase E — caller mag tag-mutaties opvangen om de styleguide-state te
   *  vernieuwen na een usage-toggle. */
  onTagsChanged?: () => void;
}

/** Fase E — usage-tags die user via toggles kan setten/clearen. Subset
 *  van ColorUsageTag uit color-usage-extractor. Brand-relevante hero-roles. */
const TOGGLEABLE_USAGE_TAGS = [
  { key: "hero-bg", i18n: "heroBg" },
  { key: "heading-text", i18n: "headingText" },
  { key: "button-bg", i18n: "buttonBg" },
  { key: "link", i18n: "link" },
] as const;

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

export function ColorDetailModal({ isOpen, onClose, color, onTagsChanged }: ColorDetailModalProps) {
  const { t } = useTranslation("brandstyle");
  // Lokale tag-state om optimistic toggles te tonen zonder wachten op
  // server-roundtrip. Reset wanneer color-prop verandert.
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [savingTag, setSavingTag] = useState<string | null>(null);
  useEffect(() => {
    setLocalTags(color?.tags ?? []);
  }, [color]);

  if (!color) return null;

  const toggleUsageTag = async (tagKey: string) => {
    const fullTag = `usage:${tagKey}`;
    const next = localTags.includes(fullTag)
      ? localTags.filter((t) => t !== fullTag)
      : [...localTags, fullTag];
    setLocalTags(next);
    setSavingTag(tagKey);
    try {
      const res = await fetch(`/api/brandstyle/colors/${color.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: next }),
      });
      if (!res.ok) {
        // Rollback bij fout
        setLocalTags(color.tags ?? []);
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        console.warn("[color-tags] update failed:", data.error);
      } else {
        onTagsChanged?.();
      }
    } catch (err) {
      setLocalTags(color.tags ?? []);
      console.warn("[color-tags] network error:", err);
    } finally {
      setSavingTag(null);
    }
  };

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
            <CopyButton label={t("colors.detail.hex")} value={color.hex} />
            {color.rgb && <CopyButton label={t("colors.detail.rgb")} value={color.rgb} />}
            {color.hsl && <CopyButton label={t("colors.detail.hsl")} value={color.hsl} />}
            {color.cmyk && <CopyButton label={t("colors.detail.cmyk")} value={color.cmyk} />}
          </div>

          {/* Accessibility */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              {t("colors.detail.accessibility")}
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{t("colors.detail.onWhite")}</span>
                <ContrastBadge level={color.contrastWhite} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{t("colors.detail.onBlack")}</span>
                <ContrastBadge level={color.contrastBlack} />
              </div>
            </div>
          </div>

          {/* Tags */}
          {color.tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                {t("colors.detail.tags")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {color.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fase E — Usage-override toggles. User kan auto-detected
              usage-tags overrulen wanneer de scraper het verkeerd had. */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              {t("colors.detail.useInGenerated")}
            </p>
            <div className="space-y-1.5">
              {TOGGLEABLE_USAGE_TAGS.map(({ key, i18n }) => {
                const label = t(`colors.detail.usageTags.${i18n}`);
                const hint = t(`colors.detail.usageTags.${i18n}Hint`);
                const fullTag = `usage:${key}`;
                const enabled = localTags.includes(fullTag);
                const busy = savingTag === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleUsageTag(key)}
                    disabled={busy}
                    className={`w-full flex items-start justify-between gap-3 px-3 py-2 rounded-md border text-left text-xs transition-colors ${
                      enabled
                        ? "border-primary-300 bg-primary-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    } ${busy ? "opacity-50" : ""}`}
                    title={hint}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${enabled ? "text-primary-900" : "text-gray-700"}`}>
                        {label}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{hint}</div>
                    </div>
                    <span
                      className={`flex-shrink-0 w-9 h-5 rounded-full transition-colors relative ${
                        enabled ? "bg-primary-500" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          enabled ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          {color.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                {t("colors.detail.notes")}
              </p>
              <p className="text-sm text-gray-600">{color.notes}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
