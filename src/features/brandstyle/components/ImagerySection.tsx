"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, X, Pencil, Eye, Lightbulb } from "lucide-react";
import { Card, Button } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { EditableStringList } from "./EditableStringList";
import { useUpdateSection } from "../hooks/useBrandstyleHooks";
import type { BrandStyleguide, PhotographyStyle } from "../types/brandstyle.types";
import { BrandStyleAnchorsPanel } from "@/components/brand-foundation/BrandStyleAnchorsPanel";
import { HeroLogoOverlayPanel } from "@/components/brand-foundation/HeroLogoOverlayPanel";

/** Parse "OBSERVED:" or "RECOMMENDED:" prefix from a guideline string */
function parseGuidelinePrefix(text: string): { prefix: "observed" | "recommended" | null; content: string } {
  const upper = text.trimStart().toUpperCase();
  if (upper.startsWith("OBSERVED:")) return { prefix: "observed", content: text.replace(/^OBSERVED:\s*/i, "") };
  if (upper.startsWith("RECOMMENDED:")) return { prefix: "recommended", content: text.replace(/^RECOMMENDED:\s*/i, "") };
  return { prefix: null, content: text };
}

/** Visual badge for OBSERVED/RECOMMENDED guidelines */
function GuidelineBadge({ type }: { type: "observed" | "recommended" }) {
  const { t } = useTranslation("brandstyle");
  if (type === "observed") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-600 flex-shrink-0">
        <Eye className="w-3 h-3" />
        {t("imagery.observed")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-600 flex-shrink-0">
      <Lightbulb className="w-3 h-3" />
      {t("imagery.recommended")}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────

interface ImagerySectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

export function ImagerySection({ styleguide, canEdit }: ImagerySectionProps) {
  const { t } = useTranslation("brandstyle");
  const photoStyle = styleguide.photographyStyle as PhotographyStyle | null;
  const updateImagery = useUpdateSection("imagery");

  const [isEditingStyle, setIsEditingStyle] = useState(false);
  const [editMood, setEditMood] = useState("");
  const [editSubjects, setEditSubjects] = useState("");
  const [editComposition, setEditComposition] = useState("");

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

  return (
    <div data-testid="imagery-section" className="space-y-6">
      {/* Brand-style anchors — AI image-gen style-references */}
      <BrandStyleAnchorsPanel />

      {/* W5 L-Fase 3 — opt-in: echt merklogo op de hero-afbeelding */}
      <HeroLogoOverlayPanel />

      {/* Photography */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 truncate min-w-0">{t("imagery.photoStyleTitle")}</h3>
          {canEdit && !isEditingStyle && (
            <button
              onClick={startEditStyle}
              className="p-1 text-gray-400 hover:text-primary transition-colors flex-shrink-0"
              title={t("actions.edit")}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isEditingStyle ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t("imagery.mood")}</label>
              <input
                value={editMood}
                onChange={(e) => setEditMood(e.target.value)}
                placeholder={t("imagery.moodPlaceholder")}
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t("imagery.subjects")}</label>
              <input
                value={editSubjects}
                onChange={(e) => setEditSubjects(e.target.value)}
                placeholder={t("imagery.subjectsPlaceholder")}
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t("imagery.composition")}</label>
              <input
                value={editComposition}
                onChange={(e) => setEditComposition(e.target.value)}
                placeholder={t("imagery.compositionPlaceholder")}
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" onClick={saveStyle} isLoading={updateImagery.isPending}>
                {t("actions.save")}
              </Button>
              <Button variant="secondary" size="sm" onClick={cancelEditStyle}>
                {t("actions.cancel")}
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
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">{t("imagery.mood")}</p>
                      {prefix && <div className="mb-1"><GuidelineBadge type={prefix} /></div>}
                      <p className="text-sm text-gray-700">{content}</p>
                    </div>
                  );
                })()}
                {photoStyle.subjects && (() => {
                  const { prefix, content } = parseGuidelinePrefix(photoStyle.subjects);
                  return (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">{t("imagery.subjects")}</p>
                      {prefix && <div className="mb-1"><GuidelineBadge type={prefix} /></div>}
                      <p className="text-sm text-gray-700">{content}</p>
                    </div>
                  );
                })()}
                {photoStyle.composition && (() => {
                  const { prefix, content } = parseGuidelinePrefix(photoStyle.composition);
                  return (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">{t("imagery.composition")}</p>
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
            title={t("imagery.photoGuidelinesTitle")}
            items={styleguide.photographyGuidelines}
            canEdit={canEdit}
            isSaving={updateImagery.isPending}
            placeholder={t("imagery.photoGuidelinesPlaceholder")}
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
                <p className="text-sm text-gray-400">{t("imagery.photoGuidelinesEmpty")}</p>
              )
            }
          </EditableStringList>
        )}
      </Card>

      {/* Illustration */}
      <Card>
        <EditableStringList
          title={t("imagery.illustrationTitle")}
          items={styleguide.illustrationGuidelines}
          canEdit={canEdit}
          isSaving={updateImagery.isPending}
          placeholder={t("imagery.illustrationPlaceholder")}
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
              <p className="text-sm text-gray-400">{t("imagery.illustrationEmpty")}</p>
            )
          }
        </EditableStringList>
      </Card>

      {/* Don'ts */}
      <Card>
        <EditableStringList
          title={t("imagery.dontsTitle")}
          items={styleguide.imageryDonts}
          canEdit={canEdit}
          isSaving={updateImagery.isPending}
          placeholder={t("imagery.dontsPlaceholder")}
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
              <p className="text-sm text-gray-400">{t("imagery.dontsEmpty")}</p>
            )
          }
        </EditableStringList>
      </Card>

      <AiContentBanner section="imagery" savedForAi={styleguide.imagerySavedForAi} />
    </div>
  );
}
