"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Pencil,
  X,
  Plus,
  Trash2,
  Shapes,
  Layers,
  PenTool,
  Blend,
  LayoutGrid,
  Copy,
  Check,
  Sparkles,
  CornerDownRight,
  Square,
  Maximize,
  Palette,
} from "lucide-react";
import { Card, Button, Badge } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { EditableStringList } from "./EditableStringList";
import { SystemScalesSection } from "./SystemScalesSection";
import { useUpdateSection } from "../hooks/useBrandstyleHooks";
import type {
  BrandStyleguide,
  GraphicElementsData,
  PatternsTexturesData,
  IconographyStyleData,
  GradientDefinition,
  LayoutPrinciplesData,
} from "../types/brandstyle.types";
import type { VisualLanguageProfile } from "@/lib/brandstyle/visual-language.types";

// ═══════════════════════════════════════════════════════════════
// Visual System Section — merged Design Language + Visual Language
// 4 sections: Foundations, Spacing & Layout, Elements & Patterns, Effects & Application
// ═══════════════════════════════════════════════════════════════

interface VisualSystemSectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

export function VisualSystemSection({ styleguide, canEdit }: VisualSystemSectionProps) {
  const { t } = useTranslation("brandstyle");
  const profile = styleguide.visualLanguage as VisualLanguageProfile | null;
  const updateDL = useUpdateSection("design-language");

  return (
    <div data-testid="visual-system-section" className="space-y-8">
      {/* DESIGN.md system scales — bovenaan voor developer-facing overzicht */}
      <SystemScalesSection styleguide={styleguide} />

      {/* Summary banner */}
      {profile?.summary && (
        <div className="rounded-lg border border-teal-200 bg-teal-50/30 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{t("visualSystem.summaryTitle")}</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{profile.summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 1: Foundations ── */}
      <SectionHeader title={t("visualSystem.sections.foundationsTitle")} description={t("visualSystem.sections.foundationsDesc")} />
      {profile ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FoundationCard icon={CornerDownRight} title={t("visualSystem.cards.cornersEdges")}>
            <CornerRadiusPreview radiusPx={profile.cornerRadius.radiusPx} />
            <Param label={t("visualSystem.params.style")} value={profile.cornerRadius.dominant} />
            <Param label={t("visualSystem.params.radius")} value={`${profile.cornerRadius.radiusPx}px`} />
            <Param label={t("visualSystem.params.consistency")} value={profile.cornerRadius.consistency} />
          </FoundationCard>

          <FoundationCard icon={Layers} title={t("visualSystem.cards.shadowsDepth")}>
            <ShadowPreview style={profile.shadow.style} />
            <Param label={t("visualSystem.params.shadow")} value={profile.shadow.style} />
            <Param label={t("visualSystem.params.elevation")} value={profile.shadow.elevation} />
            <Param label={t("visualSystem.params.depth")} value={profile.depth.dimensionality} />
            {profile.depth.glassmorphism && <Param label={t("visualSystem.params.glassmorphism")} value={t("visualSystem.detected")} />}
          </FoundationCard>

          <FoundationCard icon={Square} title={t("visualSystem.cards.linesBorders")}>
            <LinePreview borders={profile.line.borders} />
            <Param label={t("visualSystem.params.borders")} value={profile.line.borders} />
            <Param label={t("visualSystem.params.dividers")} value={profile.line.dividers} />
            <Param label={t("visualSystem.params.decorative")} value={profile.line.decorativeLines ? t("visualSystem.yes") : t("visualSystem.no")} />
          </FoundationCard>

          <FoundationCard icon={Shapes} title={t("visualSystem.cards.shapeLanguage")}>
            <ShapePreview primary={profile.shape.primary} angularity={profile.shape.angularity} />
            <Param label={t("visualSystem.params.primary")} value={profile.shape.primary} />
            <Param label={t("visualSystem.params.angularity")} value={`${profile.shape.angularity}/10`} />
            <Param label={t("visualSystem.params.symmetry")} value={profile.shape.symmetry} />
          </FoundationCard>

          <FoundationCard icon={Maximize} title={t("visualSystem.cards.visualWeight")}>
            <Param label={t("visualSystem.params.overall")} value={profile.weight.overall} />
            <Param label={t("visualSystem.params.textDensity")} value={profile.weight.textDensity} />
            <Param label={t("visualSystem.params.ornaments")} value={profile.weight.ornamentLevel} />
          </FoundationCard>
        </div>
      ) : (
        <EmptyFoundations />
      )}

      {/* ── Section 2: Spacing & Layout ── */}
      <SectionHeader title={t("visualSystem.sections.spacingLayoutTitle")} description={t("visualSystem.sections.spacingLayoutDesc")} />
      <SpacingLayoutCard
        profile={profile}
        layoutData={(styleguide.layoutPrinciples ?? {}) as LayoutPrinciplesData}
        canEdit={canEdit}
        updateSection={updateDL}
      />

      {/* ── Section 3: Elements & Patterns ── */}
      <SectionHeader title={t("visualSystem.sections.elementsTitle")} description={t("visualSystem.sections.elementsDesc")} />
      <GraphicElementsCard
        data={(styleguide.graphicElements ?? {}) as GraphicElementsData}
        donts={styleguide.graphicElementsDonts ?? []}
        canEdit={canEdit}
        updateSection={updateDL}
      />
      <PatternsCard
        data={(styleguide.patternsTextures ?? {}) as PatternsTexturesData}
        canEdit={canEdit}
        updateSection={updateDL}
      />
      <IconographyCard
        data={(styleguide.iconographyStyle ?? {}) as IconographyStyleData}
        donts={styleguide.iconographyDonts ?? []}
        canEdit={canEdit}
        updateSection={updateDL}
      />

      {/* ── Section 4: Effects & Application ── */}
      <SectionHeader title={t("visualSystem.sections.effectsTitle")} description={t("visualSystem.sections.effectsDesc")} />
      <GradientsCard
        gradients={(styleguide.gradientsEffects ?? []) as GradientDefinition[]}
        canEdit={canEdit}
        updateSection={updateDL}
      />
      {profile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FoundationCard icon={Palette} title={t("visualSystem.cards.colorApplication")}>
            <Param label={t("visualSystem.params.buttons")} value={profile.colorApplication.buttonStyle} />
            <Param label={t("visualSystem.params.backgrounds")} value={profile.colorApplication.backgroundApproach} />
            <Param label={t("visualSystem.params.accents")} value={profile.colorApplication.accentUsage} />
            <Param label={t("visualSystem.params.gradients")} value={profile.colorApplication.gradientPresence} />
          </FoundationCard>
          <FoundationCard icon={LayoutGrid} title={t("visualSystem.cards.componentPatterns")}>
            <Param label={t("visualSystem.params.cards")} value={profile.components.cardStyle} />
            <Param label={t("visualSystem.params.buttons")} value={profile.components.buttonShape} />
            <Param label={t("visualSystem.params.inputs")} value={profile.components.inputStyle} />
            <Param label={t("visualSystem.params.spacingSystem")} value={profile.components.spacingSystem} />
          </FoundationCard>
        </div>
      )}

      {/* Prompt Fragment */}
      {profile?.promptFragment && <PromptPreview value={profile.promptFragment} />}

      {/* Single Save for AI toggle */}
      <AiContentBanner section="visual-language" savedForAi={styleguide.visualLanguageSavedForAi} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Visual Preview Components
// ═══════════════════════════════════════════════════════════════

function CornerRadiusPreview({ radiusPx }: { radiusPx: number }) {
  const r = Math.min(radiusPx, 20);
  return (
    <div className="flex items-center justify-center gap-4 p-3 bg-gray-50 rounded-lg mb-2">
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="4" y="4" width="40" height="40" rx={r} ry={r} fill="none" stroke="#0d9488" strokeWidth="2" />
      </svg>
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="4" y="4" width="40" height="28" rx={r} ry={r} fill="#0d948820" stroke="#0d9488" strokeWidth="1.5" />
        <rect x="4" y="36" width="40" height="8" rx={Math.min(r, 4)} ry={Math.min(r, 4)} fill="#0d948815" stroke="#0d9488" strokeWidth="1" />
      </svg>
      <span className="text-xs font-mono text-gray-500">{radiusPx}px</span>
    </div>
  );
}

function ShadowPreview({ style }: { style: string }) {
  const shadowMap: Record<string, string> = {
    none: "none",
    subtle: "0 1px 3px rgba(0,0,0,0.08)",
    medium: "0 4px 12px rgba(0,0,0,0.12)",
    bold: "0 8px 24px rgba(0,0,0,0.18)",
    colored: "0 4px 14px rgba(13,148,136,0.25)",
  };
  const shadow = shadowMap[style] ?? shadowMap.subtle;
  return (
    <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg mb-2">
      <div
        className="w-24 h-14 bg-white rounded-lg"
        style={{ boxShadow: shadow }}
      />
    </div>
  );
}

function LinePreview({ borders }: { borders: string }) {
  const widthMap: Record<string, number> = { none: 0, thin: 1, medium: 2, thick: 3 };
  const w = widthMap[borders] ?? 1;
  if (w === 0) return null;
  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg mb-2">
      <div style={{ height: w, backgroundColor: "#d1d5db" }} />
      <div style={{ height: w, backgroundColor: "#0d9488", opacity: 0.5 }} />
    </div>
  );
}

function ShapePreview({ primary, angularity }: { primary: string; angularity: number }) {
  const isOrganic = primary === "organic" || angularity < 4;
  const r = isOrganic ? 12 : angularity > 7 ? 0 : 4;
  return (
    <div className="flex items-center justify-center gap-4 p-3 bg-gray-50 rounded-lg mb-2">
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="14" fill="#0d948815" stroke="#0d9488" strokeWidth="1.5" />
      </svg>
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
        <rect x="4" y="4" width="28" height="28" rx={r} fill="#0d948815" stroke="#0d9488" strokeWidth="1.5" />
      </svg>
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
        <polygon points="18,4 32,32 4,32" fill="#0d948815" stroke="#0d9488" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function SpacingScalePreview({ gridBase }: { gridBase: number | null | undefined }) {
  const base = gridBase ?? 8;
  const steps = [1, 2, 3, 4, 6, 8].map((m) => m * base);
  return (
    <div className="flex items-end gap-1.5 p-3 bg-gray-50 rounded-lg mb-2">
      {steps.map((size) => (
        <div key={size} className="flex flex-col items-center gap-1">
          <div className="bg-teal-200 rounded-sm" style={{ width: Math.min(size, 48), height: Math.min(size, 48) }} />
          <span className="text-[9px] text-gray-400 font-mono">{size}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Layout Sub-Components
// ═══════════════════════════════════════════════════════════════

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="pt-2">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
  );
}

function FoundationCard({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-teal-600" />
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      </div>
      {children}
    </Card>
  );
}

function Param({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 capitalize">{value}</span>
    </div>
  );
}

function EmptyFoundations() {
  const { t } = useTranslation("brandstyle");
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
      <Layers className="mx-auto h-10 w-10 text-gray-300 mb-3" />
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{t("visualSystem.emptyFoundationsTitle")}</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto">
        {t("visualSystem.emptyFoundationsBody")}
      </p>
    </div>
  );
}

function PromptPreview({ value }: { value: string }) {
  const { t } = useTranslation("brandstyle");
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t("visualSystem.promptTitle")}</h4>
        <button type="button" onClick={handleCopy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          {copied ? t("actions.copied") : t("actions.copy")}
        </button>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-md p-3 break-words">{value}</p>
      <p className="mt-2 text-[10px] text-gray-400">
        {t("visualSystem.promptHint")}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Editable Card Components (from Design Language)
// ═══════════════════════════════════════════════════════════════

// ── Tag helpers ──

function TagEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [newItem, setNewItem] = useState("");
  const addItem = () => {
    const trimmed = newItem.trim();
    if (trimmed && !items.includes(trimmed)) { onChange([...items, trimmed]); setNewItem(""); }
  };
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1.5 block">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {item}
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} placeholder={placeholder} className="flex-1 text-sm px-3 py-1.5 border border-dashed border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
        <button type="button" onClick={addItem} className="p-1 text-gray-400 hover:text-primary"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function TagDisplay({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => <Badge key={`${item}-${i}`} variant="default">{item}</Badge>)}
    </div>
  );
}

// ── Spacing & Layout Card ──

function SpacingLayoutCard({ profile, layoutData, canEdit, updateSection }: {
  profile: VisualLanguageProfile | null;
  layoutData: LayoutPrinciplesData;
  canEdit: boolean;
  updateSection: ReturnType<typeof useUpdateSection>;
}) {
  const { t } = useTranslation("brandstyle");
  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState<LayoutPrinciplesData>({});

  const startEdit = useCallback(() => {
    setEdit({
      gridSystem: layoutData.gridSystem ?? "",
      spacingScale: layoutData.spacingScale ?? "",
      whitespacePhilosophy: layoutData.whitespacePhilosophy ?? "",
      compositionRules: [...(layoutData.compositionRules ?? [])],
      usageNotes: layoutData.usageNotes ?? "",
    });
    setIsEditing(true);
  }, [layoutData]);

  const save = () => {
    updateSection.mutate({ layoutPrinciples: edit }, { onSuccess: () => setIsEditing(false) });
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-teal-600" /><h4 className="text-sm font-semibold text-gray-900">{t("visualSystem.spacingLayout.title")}</h4></div>
        {canEdit && !isEditing && <button type="button" onClick={startEdit} className="p-1 text-gray-400 hover:text-primary transition-colors" title={t("actions.edit")}><Pencil className="w-3.5 h-3.5" /></button>}
      </div>

      {/* Visual Language metrics */}
      {profile && (
        <div className="mb-4">
          <SpacingScalePreview gridBase={profile.space.sectionSpacing === "tight" ? 4 : profile.space.sectionSpacing === "generous" ? 12 : 8} />
          <div className="grid grid-cols-3 gap-3 mt-2">
            <Param label="Density" value={profile.space.density} />
            <Param label="Whitespace" value={`${Math.round(profile.space.whitespaceRatio * 100)}%`} />
            <Param label="Spacing" value={profile.space.sectionSpacing} />
          </div>
        </div>
      )}

      {/* Grid preview */}
      {layoutData.gridSystem && <GridPreview gridSystem={layoutData.gridSystem} />}

      {isEditing ? (
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("visualSystem.spacingLayout.gridSystem")}</label><input value={edit.gridSystem ?? ""} onChange={(e) => setEdit((p) => ({ ...p, gridSystem: e.target.value }))} placeholder={t("visualSystem.spacingLayout.gridPlaceholder")} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("visualSystem.spacingLayout.spacingScale")}</label><input value={edit.spacingScale ?? ""} onChange={(e) => setEdit((p) => ({ ...p, spacingScale: e.target.value }))} placeholder={t("visualSystem.spacingLayout.scalePlaceholder")} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("visualSystem.spacingLayout.whitespacePhilosophy")}</label><textarea value={edit.whitespacePhilosophy ?? ""} onChange={(e) => setEdit((p) => ({ ...p, whitespacePhilosophy: e.target.value }))} rows={2} placeholder={t("visualSystem.spacingLayout.whitespacePlaceholder")} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <TagEditor label={t("visualSystem.spacingLayout.compositionRules")} items={edit.compositionRules ?? []} onChange={(v) => setEdit((p) => ({ ...p, compositionRules: v }))} placeholder={t("visualSystem.spacingLayout.compositionPlaceholder")} />
          <div className="flex gap-2 pt-1"><Button variant="primary" size="sm" onClick={save} isLoading={updateSection.isPending}>{t("actions.save")}</Button><Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>{t("actions.cancel")}</Button></div>
        </div>
      ) : (
        <div className="space-y-3">
          {layoutData.gridSystem && <div><p className="text-xs font-medium text-gray-500 uppercase mb-0.5">{t("visualSystem.spacingLayout.gridSystem")}</p><p className="text-sm text-gray-700">{layoutData.gridSystem}</p></div>}
          {layoutData.spacingScale && <div><p className="text-xs font-medium text-gray-500 uppercase mb-0.5">{t("visualSystem.spacingLayout.spacingScale")}</p><p className="text-sm text-gray-700">{layoutData.spacingScale}</p></div>}
          {layoutData.whitespacePhilosophy && <div><p className="text-xs font-medium text-gray-500 uppercase mb-0.5">{t("visualSystem.spacingLayout.whitespacePhilosophy")}</p><p className="text-sm text-gray-700">{layoutData.whitespacePhilosophy}</p></div>}
          {(layoutData.compositionRules?.length ?? 0) > 0 && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1.5">{t("visualSystem.spacingLayout.compositionRules")}</p><TagDisplay items={layoutData.compositionRules ?? []} /></div>}
        </div>
      )}
    </Card>
  );
}

// ── Graphic Elements Card ──

function GraphicElementsCard({ data, donts, canEdit, updateSection }: { data: GraphicElementsData; donts: string[]; canEdit: boolean; updateSection: ReturnType<typeof useUpdateSection> }) {
  const { t } = useTranslation("brandstyle");
  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState<GraphicElementsData>({});
  const startEdit = useCallback(() => { setEdit({ brandShapes: [...(data.brandShapes ?? [])], decorativeElements: [...(data.decorativeElements ?? [])], visualDevices: [...(data.visualDevices ?? [])], usageNotes: data.usageNotes ?? "" }); setIsEditing(true); }, [data]);
  const save = () => { updateSection.mutate({ graphicElements: edit }, { onSuccess: () => setIsEditing(false) }); };
  const hasContent = data.brandShapes?.length || data.decorativeElements?.length || data.visualDevices?.length || data.usageNotes;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2"><Shapes className="w-4 h-4 text-teal-600" /><h4 className="text-sm font-semibold text-gray-900">{t("visualSystem.graphic.title")}</h4></div>
        {canEdit && !isEditing && <button type="button" onClick={startEdit} className="p-1 text-gray-400 hover:text-primary transition-colors" title={t("actions.edit")}><Pencil className="w-3.5 h-3.5" /></button>}
      </div>
      {isEditing ? (
        <div className="space-y-4">
          <TagEditor label={t("visualSystem.graphic.brandShapes")} items={edit.brandShapes ?? []} onChange={(v) => setEdit((p) => ({ ...p, brandShapes: v }))} placeholder={t("visualSystem.graphic.brandShapesPlaceholder")} />
          <TagEditor label={t("visualSystem.graphic.decorativeElements")} items={edit.decorativeElements ?? []} onChange={(v) => setEdit((p) => ({ ...p, decorativeElements: v }))} placeholder={t("visualSystem.graphic.decorativePlaceholder")} />
          <TagEditor label={t("visualSystem.graphic.visualDevices")} items={edit.visualDevices ?? []} onChange={(v) => setEdit((p) => ({ ...p, visualDevices: v }))} placeholder={t("visualSystem.graphic.visualDevicesPlaceholder")} />
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("common.usageNotes")}</label><textarea value={edit.usageNotes ?? ""} onChange={(e) => setEdit((p) => ({ ...p, usageNotes: e.target.value }))} rows={2} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div className="flex gap-2 pt-1"><Button variant="primary" size="sm" onClick={save} isLoading={updateSection.isPending}>{t("actions.save")}</Button><Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>{t("actions.cancel")}</Button></div>
        </div>
      ) : (
        <div className="space-y-3">
          {(data.brandShapes?.length ?? 0) > 0 && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1.5">{t("visualSystem.graphic.brandShapes")}</p><TagDisplay items={data.brandShapes ?? []} /></div>}
          {(data.decorativeElements?.length ?? 0) > 0 && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1.5">{t("visualSystem.graphic.decorativeElements")}</p><TagDisplay items={data.decorativeElements ?? []} /></div>}
          {(data.visualDevices?.length ?? 0) > 0 && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1.5">{t("visualSystem.graphic.visualDevices")}</p><TagDisplay items={data.visualDevices ?? []} /></div>}
          {data.usageNotes && <p className="text-sm text-gray-600">{data.usageNotes}</p>}
          {!hasContent && <p className="text-sm text-gray-400">{t("visualSystem.graphic.empty")}</p>}
        </div>
      )}
      {!isEditing && (
        <div className="mt-4">
          <EditableStringList title={t("visualSystem.dontsTitle")} items={donts} canEdit={canEdit} isSaving={updateSection.isPending} placeholder={t("visualSystem.graphic.dontsPlaceholder")} onSave={(items) => updateSection.mutate({ graphicElementsDonts: items })}>
            {(items) => items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{items.map((d, i) => <div key={i} className="flex items-start gap-2 text-sm text-gray-600 p-3 bg-red-50 rounded-lg"><X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />{d}</div>)}</div>
            ) : <p className="text-sm text-gray-400">{t("common.noDontsYet")}</p>}
          </EditableStringList>
        </div>
      )}
    </Card>
  );
}

// ── Patterns & Textures Card ──

function PatternsCard({ data, canEdit, updateSection }: { data: PatternsTexturesData; canEdit: boolean; updateSection: ReturnType<typeof useUpdateSection> }) {
  const { t } = useTranslation("brandstyle");
  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState<PatternsTexturesData>({});
  const startEdit = useCallback(() => { setEdit({ patterns: [...(data.patterns ?? [])], textures: [...(data.textures ?? [])], backgrounds: [...(data.backgrounds ?? [])], usageNotes: data.usageNotes ?? "" }); setIsEditing(true); }, [data]);
  const save = () => { updateSection.mutate({ patternsTextures: edit }, { onSuccess: () => setIsEditing(false) }); };
  const hasContent = data.patterns?.length || data.textures?.length || data.backgrounds?.length || data.usageNotes;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-teal-600" /><h4 className="text-sm font-semibold text-gray-900">{t("visualSystem.patterns.title")}</h4></div>
        {canEdit && !isEditing && <button type="button" onClick={startEdit} className="p-1 text-gray-400 hover:text-primary transition-colors" title={t("actions.edit")}><Pencil className="w-3.5 h-3.5" /></button>}
      </div>
      {isEditing ? (
        <div className="space-y-4">
          <TagEditor label={t("visualSystem.patterns.patterns")} items={edit.patterns ?? []} onChange={(v) => setEdit((p) => ({ ...p, patterns: v }))} placeholder={t("visualSystem.patterns.patternsPlaceholder")} />
          <TagEditor label={t("visualSystem.patterns.textures")} items={edit.textures ?? []} onChange={(v) => setEdit((p) => ({ ...p, textures: v }))} placeholder={t("visualSystem.patterns.texturesPlaceholder")} />
          <TagEditor label={t("visualSystem.patterns.backgrounds")} items={edit.backgrounds ?? []} onChange={(v) => setEdit((p) => ({ ...p, backgrounds: v }))} placeholder={t("visualSystem.patterns.backgroundsPlaceholder")} />
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("common.usageNotes")}</label><textarea value={edit.usageNotes ?? ""} onChange={(e) => setEdit((p) => ({ ...p, usageNotes: e.target.value }))} rows={2} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div className="flex gap-2 pt-1"><Button variant="primary" size="sm" onClick={save} isLoading={updateSection.isPending}>{t("actions.save")}</Button><Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>{t("actions.cancel")}</Button></div>
        </div>
      ) : (
        <div className="space-y-3">
          {(data.patterns?.length ?? 0) > 0 && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1.5">{t("visualSystem.patterns.patterns")}</p><TagDisplay items={data.patterns ?? []} /></div>}
          {(data.textures?.length ?? 0) > 0 && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1.5">{t("visualSystem.patterns.textures")}</p><TagDisplay items={data.textures ?? []} /></div>}
          {(data.backgrounds?.length ?? 0) > 0 && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1.5">{t("visualSystem.patterns.backgrounds")}</p><TagDisplay items={data.backgrounds ?? []} /></div>}
          {data.usageNotes && <p className="text-sm text-gray-600">{data.usageNotes}</p>}
          {!hasContent && <p className="text-sm text-gray-400">{t("visualSystem.patterns.empty")}</p>}
        </div>
      )}
    </Card>
  );
}

// ── Iconography Card ──

const ICON_STYLE_VALUES = ["line", "fill", "duo-tone", "custom"] as const;
const ICON_STYLE_KEY: Record<string, string> = { line: "line", fill: "fill", "duo-tone": "duoTone", custom: "custom" };

function IconSpecPreview({ style, strokeWeight, cornerRadius, sizing }: { style?: string; strokeWeight?: string; cornerRadius?: string; sizing?: string }) {
  if (!style && !strokeWeight) return null;
  const sw = parseFloat(strokeWeight?.match(/([\d.]+)/)?.[1] ?? "1.5");
  const cr = parseFloat(cornerRadius?.match(/([\d.]+)/)?.[1] ?? "0");
  const isFilled = style === "fill";
  const isDuoTone = style === "duo-tone";
  const strokeColor = "#6b7280";
  const fillColor = "#14b8a6";
  const shared = { stroke: isFilled ? "none" : strokeColor, strokeWidth: isFilled ? 0 : sw, fill: isFilled ? fillColor : isDuoTone ? `${fillColor}33` : "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-3">
      <div className="flex items-end justify-center gap-6">
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r={16 - sw / 2} {...shared} /></svg>
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><rect x={4 + sw / 2} y={4 + sw / 2} width={32 - sw} height={32 - sw} rx={Math.min(cr, 12)} ry={Math.min(cr, 12)} {...shared} /></svg>
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><polygon points="20,4 36,36 4,36" {...shared} /></svg>
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><polygon points="20,3 24.5,15 37,15 27,23 30.5,36 20,28 9.5,36 13,23 3,15 15.5,15" {...shared} /></svg>
      </div>
    </div>
  );
}

function IconographyCard({ data, donts, canEdit, updateSection }: { data: IconographyStyleData; donts: string[]; canEdit: boolean; updateSection: ReturnType<typeof useUpdateSection> }) {
  const { t } = useTranslation("brandstyle");
  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState<IconographyStyleData>({});
  const startEdit = useCallback(() => { setEdit({ style: data.style ?? "", strokeWeight: data.strokeWeight ?? "", cornerRadius: data.cornerRadius ?? "", sizing: data.sizing ?? "", colorUsage: data.colorUsage ?? "", usageNotes: data.usageNotes ?? "" }); setIsEditing(true); }, [data]);
  const save = () => { updateSection.mutate({ iconographyStyle: edit }, { onSuccess: () => setIsEditing(false) }); };
  const hasContent = data.style || data.strokeWeight || data.sizing || data.usageNotes;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2"><PenTool className="w-4 h-4 text-teal-600" /><h4 className="text-sm font-semibold text-gray-900">{t("visualSystem.iconography.title")}</h4></div>
        {canEdit && !isEditing && <button type="button" onClick={startEdit} className="p-1 text-gray-400 hover:text-primary transition-colors" title={t("actions.edit")}><Pencil className="w-3.5 h-3.5" /></button>}
      </div>
      {isEditing ? (
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("visualSystem.iconography.iconStyle")}</label><select value={edit.style ?? ""} onChange={(e) => setEdit((p) => ({ ...p, style: e.target.value }))} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"><option value="">{t("visualSystem.iconography.selectStyle")}</option>{ICON_STYLE_VALUES.map((v) => <option key={v} value={v}>{t(`visualSystem.iconography.styles.${ICON_STYLE_KEY[v]}`)}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("visualSystem.iconography.strokeWeight")}</label><input value={edit.strokeWeight ?? ""} onChange={(e) => setEdit((p) => ({ ...p, strokeWeight: e.target.value }))} placeholder={t("visualSystem.iconography.strokeWeightPlaceholder")} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("visualSystem.iconography.cornerRadius")}</label><input value={edit.cornerRadius ?? ""} onChange={(e) => setEdit((p) => ({ ...p, cornerRadius: e.target.value }))} placeholder={t("visualSystem.iconography.cornerRadiusPlaceholder")} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("visualSystem.iconography.sizing")}</label><input value={edit.sizing ?? ""} onChange={(e) => setEdit((p) => ({ ...p, sizing: e.target.value }))} placeholder={t("visualSystem.iconography.sizingPlaceholder")} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("visualSystem.iconography.colorUsage")}</label><input value={edit.colorUsage ?? ""} onChange={(e) => setEdit((p) => ({ ...p, colorUsage: e.target.value }))} placeholder={t("visualSystem.iconography.colorUsagePlaceholder")} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          </div>
          <div className="flex gap-2 pt-1"><Button variant="primary" size="sm" onClick={save} isLoading={updateSection.isPending}>{t("actions.save")}</Button><Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>{t("actions.cancel")}</Button></div>
        </div>
      ) : (
        <div className="space-y-3">
          <IconSpecPreview style={data.style} strokeWeight={data.strokeWeight} cornerRadius={data.cornerRadius} sizing={data.sizing} />
          {data.style && <Badge variant="info">{ICON_STYLE_KEY[data.style] ? t(`visualSystem.iconography.styles.${ICON_STYLE_KEY[data.style]}`) : data.style}</Badge>}
          <div className="grid grid-cols-2 gap-4">
            {data.strokeWeight && <div><p className="text-xs font-medium text-gray-500 uppercase mb-0.5">{t("visualSystem.iconography.strokeWeight")}</p><p className="text-sm text-gray-700">{data.strokeWeight}</p></div>}
            {data.cornerRadius && <div><p className="text-xs font-medium text-gray-500 uppercase mb-0.5">{t("visualSystem.iconography.cornerRadius")}</p><p className="text-sm text-gray-700">{data.cornerRadius}</p></div>}
            {data.sizing && <div><p className="text-xs font-medium text-gray-500 uppercase mb-0.5">{t("visualSystem.iconography.sizing")}</p><p className="text-sm text-gray-700">{data.sizing}</p></div>}
            {data.colorUsage && <div><p className="text-xs font-medium text-gray-500 uppercase mb-0.5">{t("visualSystem.iconography.colorUsage")}</p><p className="text-sm text-gray-700">{data.colorUsage}</p></div>}
          </div>
          {!hasContent && <p className="text-sm text-gray-400">{t("visualSystem.iconography.empty")}</p>}
        </div>
      )}
      {!isEditing && (
        <div className="mt-4">
          <EditableStringList title={t("visualSystem.dontsTitle")} items={donts} canEdit={canEdit} isSaving={updateSection.isPending} placeholder={t("visualSystem.iconography.dontsPlaceholder")} onSave={(items) => updateSection.mutate({ iconographyDonts: items })}>
            {(items) => items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{items.map((d, i) => <div key={i} className="flex items-start gap-2 text-sm text-gray-600 p-3 bg-red-50 rounded-lg"><X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />{d}</div>)}</div>
            ) : <p className="text-sm text-gray-400">{t("common.noDontsYet")}</p>}
          </EditableStringList>
        </div>
      )}
    </Card>
  );
}

// ── Gradients Card ──

const GRADIENT_TYPE_VALUES = ["linear", "radial", "conic"] as const;

function gradientCss(g: GradientDefinition): string {
  const colorStr = g.colors.join(", ");
  if (g.type === "radial") return `radial-gradient(circle, ${colorStr})`;
  if (g.type === "conic") return `conic-gradient(${colorStr})`;
  return `linear-gradient(${g.angle ?? "90deg"}, ${colorStr})`;
}

// Verbeterplan Fase F (palette-framework-cleanup): de analyzer genereert bij
// géén observed gradients "RECOMMENDED:"-gradients uit het palet. Die ogen
// zonder markering als echte merk-gradients (user-feedback: effects gebruiken
// kleuren die niet op de site voorkomen). Detecteer de provenance uit de
// usage-prefix en toon een expliciete "Aanbevolen"-badge.
function isRecommendedGradient(g: GradientDefinition): boolean {
  return /^\s*recommended\b/i.test(g.usage ?? "");
}
function stripRecommendedPrefix(usage: string): string {
  return usage.replace(/^\s*recommended:?\s*/i, "").trim();
}

function GradientsCard({ gradients, canEdit, updateSection }: { gradients: GradientDefinition[]; canEdit: boolean; updateSection: ReturnType<typeof useUpdateSection> }) {
  const { t } = useTranslation("brandstyle");
  const [isEditing, setIsEditing] = useState(false);
  const [editGradients, setEditGradients] = useState<GradientDefinition[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newG, setNewG] = useState<GradientDefinition>({ name: "", type: "linear", colors: ["#000000", "#ffffff"], angle: "90deg", usage: "" });

  const startEdit = useCallback(() => { setEditGradients(gradients.map((g) => ({ ...g, colors: [...g.colors] }))); setIsEditing(true); setShowForm(false); }, [gradients]);
  const addGradient = () => { if (!newG.name.trim()) return; setEditGradients((p) => [...p, { ...newG, name: newG.name.trim() }]); setNewG({ name: "", type: "linear", colors: ["#000000", "#ffffff"], angle: "90deg", usage: "" }); setShowForm(false); };
  const save = () => { updateSection.mutate({ gradientsEffects: editGradients.length > 0 ? editGradients : null }, { onSuccess: () => { setIsEditing(false); setShowForm(false); } }); };
  const display = isEditing ? editGradients : gradients;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2"><Blend className="w-4 h-4 text-teal-600" /><h4 className="text-sm font-semibold text-gray-900">{t("visualSystem.gradients.title")}</h4>{gradients.length > 0 && <Badge variant="default">{gradients.length}</Badge>}</div>
        {canEdit && !isEditing && gradients.length > 0 && <button type="button" onClick={startEdit} className="p-1 text-gray-400 hover:text-primary transition-colors" title={t("actions.edit")}><Pencil className="w-3.5 h-3.5" /></button>}
      </div>
      {display.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {display.map((g, i) => (
            <div key={`${g.name}-${i}`} className="relative group rounded-lg border border-gray-200 overflow-hidden">
              <div className="h-16 w-full" style={{ background: gradientCss(g) }} />
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate min-w-0">{g.name}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isRecommendedGradient(g) && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700" title={t("visualSystem.gradients.recommendedTitle")}>{t("visualSystem.gradients.recommended")}</span>
                    )}
                    <Badge variant="default">{g.type}</Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{g.colors.join(" → ")}</p>
                {g.usage && <p className="text-xs text-gray-500 mt-1">{isRecommendedGradient(g) ? stripRecommendedPrefix(g.usage) : g.usage}</p>}
              </div>
              {isEditing && <button type="button" onClick={() => setEditGradients((p) => p.filter((_, idx) => idx !== i))} className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600" title={t("visualSystem.gradients.remove")}><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-gray-400">{t("visualSystem.gradients.empty")}</p>}

      {isEditing && (
        <div className="mt-4 space-y-3">
          {showForm ? (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("visualSystem.gradients.name")}</label><input value={newG.name} onChange={(e) => setNewG((p) => ({ ...p, name: e.target.value }))} placeholder={t("visualSystem.gradients.namePlaceholder")} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
                <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("visualSystem.gradients.type")}</label><select value={newG.type} onChange={(e) => setNewG((p) => ({ ...p, type: e.target.value }))} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">{GRADIENT_TYPE_VALUES.map((v) => <option key={v} value={v}>{t(`visualSystem.gradients.types.${v}`)}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("visualSystem.gradients.color1")}</label><div className="flex items-center gap-2"><input type="color" value={newG.colors[0]} onChange={(e) => setNewG((p) => ({ ...p, colors: [e.target.value, ...p.colors.slice(1)] }))} className="h-8 w-8 rounded cursor-pointer" /><span className="text-xs text-gray-500">{newG.colors[0]}</span></div></div>
                <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("visualSystem.gradients.color2")}</label><div className="flex items-center gap-2"><input type="color" value={newG.colors[1] ?? "#ffffff"} onChange={(e) => setNewG((p) => ({ ...p, colors: [p.colors[0], e.target.value, ...p.colors.slice(2)] }))} className="h-8 w-8 rounded cursor-pointer" /><span className="text-xs text-gray-500">{newG.colors[1]}</span></div></div>
                {newG.type === "linear" && <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t("visualSystem.gradients.angle")}</label><input value={newG.angle ?? ""} onChange={(e) => setNewG((p) => ({ ...p, angle: e.target.value }))} placeholder={t("visualSystem.gradients.anglePlaceholder")} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>}
              </div>
              {newG.name && <div className="h-10 w-full rounded-md" style={{ background: gradientCss(newG) }} />}
              <div className="flex gap-2"><Button variant="primary" size="sm" onClick={addGradient}>{t("actions.add")}</Button><Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>{t("actions.cancel")}</Button></div>
            </div>
          ) : <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 transition-colors"><Plus className="w-4 h-4" />{t("visualSystem.gradients.addGradient")}</button>}
          <div className="flex gap-2 pt-1"><Button variant="primary" size="sm" onClick={save} isLoading={updateSection.isPending}>{t("actions.save")}</Button><Button variant="secondary" size="sm" onClick={() => { setIsEditing(false); setShowForm(false); }}>{t("actions.cancel")}</Button></div>
        </div>
      )}
      {canEdit && !isEditing && gradients.length === 0 && <div className="mt-3"><button type="button" onClick={startEdit} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 transition-colors"><Plus className="w-4 h-4" />{t("visualSystem.gradients.addGradients")}</button></div>}
    </Card>
  );
}

// ── Grid Preview ──

function GridPreview({ gridSystem }: { gridSystem?: string }) {
  const { t } = useTranslation("brandstyle");
  if (!gridSystem) return null;
  const colMatch = gridSystem.match(/(\d+)\s*-?\s*col/i);
  const columns = colMatch ? parseInt(colMatch[1], 10) : 12;
  const safeColumns = Math.max(1, Math.min(columns, 24));
  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-3">
      <div className="flex gap-1 h-12">
        {Array.from({ length: safeColumns }, (_, i) => <div key={i} className="flex-1 rounded-sm" style={{ backgroundColor: "#0d948820" }} />)}
      </div>
      <p className="text-[10px] text-gray-400 text-right mt-1.5">{t("visualSystem.gridColumns", { count: safeColumns })}</p>
    </div>
  );
}
