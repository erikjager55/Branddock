"use client";

import { useState, useCallback } from "react";
import { CheckCircle, X, Pencil, Eye, Lightbulb, ImageOff, Plus, Camera } from "lucide-react";
import { Card, Button, Badge } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { EditableStringList } from "./EditableStringList";
import { useUpdateSection } from "../hooks/useBrandstyleHooks";
import type { BrandStyleguide, PhotographyStyle, BrandImage } from "../types/brandstyle.types";

/** Context label mapping */
const CONTEXT_LABELS: Record<BrandImage['context'], string> = {
  hero: 'Hero',
  lifestyle: 'Lifestyle',
  product: 'Product',
  team: 'Team',
  general: 'General',
};

const CONTEXT_COLORS: Record<BrandImage['context'], string> = {
  hero: 'bg-blue-100 text-blue-700',
  lifestyle: 'bg-emerald-100 text-emerald-700',
  product: 'bg-purple-100 text-purple-700',
  team: 'bg-amber-100 text-amber-700',
  general: 'bg-gray-100 text-gray-700',
};

/** Parse "OBSERVED:" or "RECOMMENDED:" prefix from a guideline string */
function parseGuidelinePrefix(text: string): { prefix: "observed" | "recommended" | null; content: string } {
  const upper = text.trimStart().toUpperCase();
  if (upper.startsWith("OBSERVED:")) return { prefix: "observed", content: text.replace(/^OBSERVED:\s*/i, "") };
  if (upper.startsWith("RECOMMENDED:")) return { prefix: "recommended", content: text.replace(/^RECOMMENDED:\s*/i, "") };
  return { prefix: null, content: text };
}

/** Visual badge for OBSERVED/RECOMMENDED guidelines */
function GuidelineBadge({ type }: { type: "observed" | "recommended" }) {
  if (type === "observed") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-600 flex-shrink-0">
        <Eye className="w-3 h-3" />
        Observed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-600 flex-shrink-0">
      <Lightbulb className="w-3 h-3" />
      Recommended
    </span>
  );
}

// ─── Brand Images Grid ───────────────────────────────

interface BrandImageCardProps {
  image: BrandImage;
  isEditing: boolean;
  onRemove: () => void;
}

function BrandImageCard({ image, isEditing, onRemove }: BrandImageCardProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-[3/2]">
      {hasError ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
          <ImageOff className="w-8 h-8 mb-1" />
          <span className="text-xs">Failed to load</span>
        </div>
      ) : (
        <img
          src={image.url}
          alt={image.alt || 'Brand image'}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      )}

      {/* Context badge */}
      <div className="absolute bottom-1.5 left-1.5">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${CONTEXT_COLORS[image.context]}`}>
          {CONTEXT_LABELS[image.context]}
        </span>
      </div>

      {/* Delete overlay in edit mode */}
      {isEditing && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          title="Remove image"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Add Image Form ──────────────────────────────────

interface AddImageFormProps {
  onAdd: (image: BrandImage) => void;
  onCancel: () => void;
}

function AddImageForm({ onAdd, onCancel }: AddImageFormProps) {
  const [url, setUrl] = useState('');
  const [context, setContext] = useState<BrandImage['context']>('general');

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      return;
    }
    onAdd({ url: trimmed, alt: null, context });
    setUrl('');
    setContext('general');
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <select
          value={context}
          onChange={(e) => setContext(e.target.value as BrandImage['context'])}
          className="text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="hero">Hero</option>
          <option value="lifestyle">Lifestyle</option>
          <option value="product">Product</option>
          <option value="team">Team</option>
          <option value="general">General</option>
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

// ─── Main Component ──────────────────────────────────

interface ImagerySectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

export function ImagerySection({ styleguide, canEdit }: ImagerySectionProps) {
  const photoStyle = styleguide.photographyStyle as PhotographyStyle | null;
  const brandImages = (styleguide.brandImages ?? []) as BrandImage[];
  const updateImagery = useUpdateSection("imagery");

  const [isEditingStyle, setIsEditingStyle] = useState(false);
  const [editMood, setEditMood] = useState("");
  const [editSubjects, setEditSubjects] = useState("");
  const [editComposition, setEditComposition] = useState("");

  const [isEditingImages, setIsEditingImages] = useState(false);
  const [editImages, setEditImages] = useState<BrandImage[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const startEditImages = useCallback(() => {
    setEditImages([...brandImages]);
    setIsEditingImages(true);
    setShowAddForm(false);
  }, [brandImages]);

  const cancelEditImages = () => {
    setIsEditingImages(false);
    setShowAddForm(false);
  };

  const saveImages = () => {
    updateImagery.mutate(
      { brandImages: editImages.length > 0 ? editImages : null },
      { onSuccess: () => {
        setIsEditingImages(false);
        setShowAddForm(false);
      }},
    );
  };

  const removeImage = (index: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addImage = (image: BrandImage) => {
    setEditImages((prev) => [...prev, image]);
    setShowAddForm(false);
  };

  const startEditStyle = () => {
    setEditMood(photoStyle?.mood ?? "");
    setEditSubjects(photoStyle?.subjects ?? "");
    setEditComposition(photoStyle?.composition ?? "");
    setIsEditingStyle(true);
  };

  const cancelEditStyle = () => {
    setIsEditingStyle(false);
  };

  const saveStyle = () => {
    updateImagery.mutate(
      {
        photographyStyle: {
          mood: editMood.trim() || undefined,
          subjects: editSubjects.trim() || undefined,
          composition: editComposition.trim() || undefined,
        },
      },
      { onSuccess: () => setIsEditingStyle(false) }
    );
  };

  const displayImages = isEditingImages ? editImages : brandImages;

  return (
    <div data-testid="imagery-section" className="space-y-6">
      {/* Brand Images */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Camera className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">Brand Images</h3>
            {brandImages.length > 0 && (
              <Badge variant="default">{brandImages.length}</Badge>
            )}
          </div>
          {canEdit && !isEditingImages && brandImages.length > 0 && (
            <button
              onClick={startEditImages}
              className="p-1 text-gray-400 hover:text-primary transition-colors flex-shrink-0"
              title="Edit images"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {displayImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {displayImages.map((img, i) => (
              <BrandImageCard
                key={`${img.url}-${i}`}
                image={img}
                isEditing={isEditingImages}
                onRemove={() => removeImage(i)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No brand images were found during analysis.</p>
        )}

        {/* Edit mode controls */}
        {isEditingImages && (
          <div className="mt-4 space-y-3">
            {showAddForm ? (
              <AddImageForm
                onAdd={addImage}
                onCancel={() => setShowAddForm(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add image
              </button>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" onClick={saveImages} isLoading={updateImagery.isPending}>
                Save
              </Button>
              <Button variant="secondary" size="sm" onClick={cancelEditImages}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Show add button even without edit mode when no images exist */}
        {canEdit && !isEditingImages && brandImages.length === 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={startEditImages}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add images manually
            </button>
          </div>
        )}
      </Card>

      {/* Photography */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 truncate min-w-0">Photography Style</h3>
          {canEdit && !isEditingStyle && (
            <button
              onClick={startEditStyle}
              className="p-1 text-gray-400 hover:text-primary transition-colors flex-shrink-0"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isEditingStyle ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Mood</label>
              <input
                value={editMood}
                onChange={(e) => setEditMood(e.target.value)}
                placeholder="e.g. Warm, inviting"
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Subjects</label>
              <input
                value={editSubjects}
                onChange={(e) => setEditSubjects(e.target.value)}
                placeholder="e.g. People, products, environments"
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Composition</label>
              <input
                value={editComposition}
                onChange={(e) => setEditComposition(e.target.value)}
                placeholder="e.g. Rule of thirds, natural framing"
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" onClick={saveStyle} isLoading={updateImagery.isPending}>
                Save
              </Button>
              <Button variant="secondary" size="sm" onClick={cancelEditStyle}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {photoStyle && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                {photoStyle.mood && (() => {
                  const { prefix, content } = parseGuidelinePrefix(photoStyle.mood);
                  return (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Mood</p>
                      {prefix && <div className="mb-1"><GuidelineBadge type={prefix} /></div>}
                      <p className="text-sm text-gray-700">{content}</p>
                    </div>
                  );
                })()}
                {photoStyle.subjects && (() => {
                  const { prefix, content } = parseGuidelinePrefix(photoStyle.subjects);
                  return (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Subjects</p>
                      {prefix && <div className="mb-1"><GuidelineBadge type={prefix} /></div>}
                      <p className="text-sm text-gray-700">{content}</p>
                    </div>
                  );
                })()}
                {photoStyle.composition && (() => {
                  const { prefix, content } = parseGuidelinePrefix(photoStyle.composition);
                  return (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Composition</p>
                      {prefix && <div className="mb-1"><GuidelineBadge type={prefix} /></div>}
                      <p className="text-sm text-gray-700">{content}</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}

        {!isEditingStyle && (
          <EditableStringList
            title="Photography Guidelines"
            items={styleguide.photographyGuidelines}
            canEdit={canEdit}
            isSaving={updateImagery.isPending}
            placeholder="Add a photography guideline..."
            onSave={(items) => updateImagery.mutate({ photographyGuidelines: items })}
          >
            {(items) =>
              items.length > 0 ? (
                <ul className="space-y-3">
                  {items.map((g, i) => {
                    const { prefix, content } = parseGuidelinePrefix(g);
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-col gap-1">
                          {prefix && <GuidelineBadge type={prefix} />}
                          <span>{content}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No photography guidelines yet.</p>
              )
            }
          </EditableStringList>
        )}
      </Card>

      {/* Illustration */}
      <Card>
        <EditableStringList
          title="Illustration Guidelines"
          items={styleguide.illustrationGuidelines}
          canEdit={canEdit}
          isSaving={updateImagery.isPending}
          placeholder="Add an illustration guideline..."
          onSave={(items) => updateImagery.mutate({ illustrationGuidelines: items })}
        >
          {(items) =>
            items.length > 0 ? (
              <ul className="space-y-3">
                {items.map((g, i) => {
                  const { prefix, content } = parseGuidelinePrefix(g);
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div className="flex flex-col gap-1">
                        {prefix && <GuidelineBadge type={prefix} />}
                        <span>{content}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No illustration guidelines yet.</p>
            )
          }
        </EditableStringList>
      </Card>

      {/* Don'ts */}
      <Card>
        <EditableStringList
          title="Don'ts"
          items={styleguide.imageryDonts}
          canEdit={canEdit}
          isSaving={updateImagery.isPending}
          placeholder="Add an imagery don't..."
          onSave={(items) => updateImagery.mutate({ imageryDonts: items })}
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
              <p className="text-sm text-gray-400">No imagery don&apos;ts defined yet.</p>
            )
          }
        </EditableStringList>
      </Card>

      <AiContentBanner section="imagery" savedForAi={styleguide.imagerySavedForAi} />
    </div>
  );
}
