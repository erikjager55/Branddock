"use client";

import { useState, useCallback } from "react";
import { CheckCircle, X, ImageOff, Pencil, Plus } from "lucide-react";
import { Card, Button } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { EditableStringList } from "./EditableStringList";
import { useUpdateSection } from "../hooks/useBrandstyleHooks";
import type { BrandStyleguide, LogoVariation } from "../types/brandstyle.types";

const LOGO_TYPE_OPTIONS = ["primary", "horizontal", "vertical", "icon", "monochrome", "reversed"] as const;

interface LogoSectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

/** Renders a single logo variation with image loading + error fallback */
function LogoCard({
  variation,
  isEditing,
  onRemove,
}: {
  variation: LogoVariation;
  isEditing: boolean;
  onRemove: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative group border border-gray-100 rounded-lg p-4 flex flex-col items-center gap-3">
      <div className="w-full aspect-[3/2] bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
        {variation.url && !imgError ? (
          <img
            src={variation.url}
            alt={variation.name}
            className="max-w-full max-h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-300">
            <ImageOff className="h-8 w-8" />
            <span className="text-xs">{variation.type}</span>
          </div>
        )}
      </div>
      <div className="text-center">
        <span className="text-sm font-medium text-gray-900">{variation.name}</span>
        <span className="block text-xs text-gray-400 mt-0.5">{variation.type}</span>
      </div>

      {/* Delete overlay in edit mode */}
      {isEditing && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          title="Remove logo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/** Inline form for adding a new logo variation */
function AddLogoForm({ onAdd, onCancel }: { onAdd: (logo: LogoVariation) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<string>("primary");

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) return;
    try {
      new URL(trimmedUrl);
    } catch {
      return;
    }
    onAdd({ name: trimmedName, url: trimmedUrl, type });
    setName("");
    setUrl("");
    setType("primary");
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Logo name"
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/logo.svg"
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {LOGO_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={handleSubmit}>
          Add
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function LogoSection({ styleguide, canEdit }: LogoSectionProps) {
  const variations = (styleguide.logoVariations ?? []) as LogoVariation[];
  const updateLogo = useUpdateSection("logo");

  const [isEditingLogos, setIsEditingLogos] = useState(false);
  const [editLogos, setEditLogos] = useState<LogoVariation[]>([]);
  const [showAddLogoForm, setShowAddLogoForm] = useState(false);

  const startEditLogos = useCallback(() => {
    setEditLogos([...variations]);
    setIsEditingLogos(true);
    setShowAddLogoForm(false);
  }, [variations]);

  const cancelEditLogos = () => {
    setIsEditingLogos(false);
    setShowAddLogoForm(false);
  };

  const saveLogos = () => {
    updateLogo.mutate(
      { logoVariations: editLogos.length > 0 ? editLogos : null },
      {
        onSuccess: () => {
          setIsEditingLogos(false);
          setShowAddLogoForm(false);
        },
      },
    );
  };

  const removeLogo = (index: number) => {
    setEditLogos((prev) => prev.filter((_, i) => i !== index));
  };

  const addLogo = (logo: LogoVariation) => {
    setEditLogos((prev) => [...prev, logo]);
    setShowAddLogoForm(false);
  };

  const displayLogos = isEditingLogos ? editLogos : variations;

  return (
    <div data-testid="logo-section" className="space-y-6">
      {/* Logo Variations */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 truncate min-w-0">Logo Variations</h3>
          {canEdit && !isEditingLogos && (
            <button
              onClick={startEditLogos}
              className="p-1 text-gray-400 hover:text-primary transition-colors flex-shrink-0"
              title="Edit logos"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {displayLogos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {displayLogos.map((v, i) => (
              <LogoCard
                key={`${v.url}-${i}`}
                variation={v}
                isEditing={isEditingLogos}
                onRemove={() => removeLogo(i)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <ImageOff className="h-8 w-8 mb-2" />
            <p className="text-sm">No logos detected during analysis.</p>
            <p className="text-xs mt-1">
              Consider adding structured logo markup (JSON-LD, og:image, or img with alt=&quot;logo&quot;)
            </p>
          </div>
        )}

        {/* Edit mode controls */}
        {isEditingLogos && (
          <div className="mt-4 space-y-3">
            {showAddLogoForm ? (
              <AddLogoForm onAdd={addLogo} onCancel={() => setShowAddLogoForm(false)} />
            ) : (
              <button
                type="button"
                onClick={() => setShowAddLogoForm(true)}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add logo
              </button>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" onClick={saveLogos} isLoading={updateLogo.isPending}>
                Save
              </Button>
              <Button variant="secondary" size="sm" onClick={cancelEditLogos}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Show add button even without edit mode when no logos exist */}
        {canEdit && !isEditingLogos && variations.length === 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={startEditLogos}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add logos manually
            </button>
          </div>
        )}
      </Card>

      {/* Usage Guidelines */}
      <Card>
        <EditableStringList
          title="Usage Guidelines"
          items={styleguide.logoGuidelines}
          canEdit={canEdit}
          isSaving={updateLogo.isPending}
          placeholder="Add a guideline..."
          onSave={(items) => updateLogo.mutate({ logoGuidelines: items })}
        >
          {(items) =>
            items.length > 0 ? (
              <ul className="space-y-2">
                {items.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No usage guidelines yet.</p>
            )
          }
        </EditableStringList>
      </Card>

      {/* Don'ts */}
      <Card>
        <EditableStringList
          title="Don'ts"
          items={styleguide.logoDonts}
          canEdit={canEdit}
          isSaving={updateLogo.isPending}
          placeholder="Add a don't..."
          onSave={(items) => updateLogo.mutate({ logoDonts: items })}
        >
          {(items) =>
            items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-600 p-3 bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    {d}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No don&apos;ts defined yet.</p>
            )
          }
        </EditableStringList>
      </Card>

      <AiContentBanner section="logo" savedForAi={styleguide.logoSavedForAi} />
    </div>
  );
}
