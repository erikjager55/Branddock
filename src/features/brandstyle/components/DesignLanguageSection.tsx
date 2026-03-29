"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
import { Card, Button, Badge } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { EditableStringList } from "./EditableStringList";
import { useUpdateSection } from "../hooks/useBrandstyleHooks";
import type {
  BrandStyleguide,
  GraphicElementsData,
  PatternsTexturesData,
  IconographyStyleData,
  GradientDefinition,
  LayoutPrinciplesData,
} from "../types/brandstyle.types";

// ─── Helpers ────────────────────────────────────────────

/** Editable pill tags with add/remove */
function TagEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [newItem, setNewItem] = useState("");

  const addItem = () => {
    const trimmed = newItem.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setNewItem("");
    }
  };

  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1.5 block">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
          placeholder={placeholder}
          className="flex-1 text-sm px-3 py-1.5 border border-dashed border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button type="button" onClick={addItem} className="p-1 text-gray-400 hover:text-primary">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/** Read-only tag display */
function TagDisplay({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Badge key={`${item}-${i}`} variant="default">{item}</Badge>
      ))}
    </div>
  );
}

/** Parse a numeric value from a CSS-like string (e.g. "1.5px" → 1.5) */
function parseNumericValue(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const match = value.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : fallback;
}

/** Visual preview of iconography spec with 4 geometric SVG shapes */
function IconSpecPreview({
  style,
  strokeWeight,
  cornerRadius,
  sizing,
}: {
  style?: string;
  strokeWeight?: string;
  cornerRadius?: string;
  sizing?: string;
}) {
  if (!style && !strokeWeight) return null;

  const sw = parseNumericValue(strokeWeight, 1.5);
  const cr = parseNumericValue(cornerRadius, 0);
  const isFilled = style === "fill";
  const isDuoTone = style === "duo-tone";

  const strokeColor = "#6b7280"; // gray-500
  const fillColor = "#14b8a6"; // primary-500

  const sharedStroke = {
    stroke: isFilled ? "none" : strokeColor,
    strokeWidth: isFilled ? 0 : sw,
    fill: isFilled ? fillColor : isDuoTone ? `${fillColor}33` : "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  // Parse sizing string for size indicators (e.g. "16/20/24/32px" or "16-32px")
  const sizeNumbers: number[] = [];
  if (sizing) {
    const matches = sizing.match(/\d+/g);
    if (matches) {
      for (const m of matches) {
        const n = parseInt(m, 10);
        if (n > 0 && n <= 128) sizeNumbers.push(n);
      }
    }
  }
  const displaySizes = sizeNumbers.length >= 2
    ? sizeNumbers.slice(0, 4)
    : [16, 20, 24, 32];

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-3">
      <div className="flex items-end justify-center gap-6">
        {/* Circle */}
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r={16 - sw / 2} {...sharedStroke} />
        </svg>
        {/* Rounded square */}
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
          <rect
            x={4 + sw / 2}
            y={4 + sw / 2}
            width={32 - sw}
            height={32 - sw}
            rx={Math.min(cr, 12)}
            ry={Math.min(cr, 12)}
            {...sharedStroke}
          />
        </svg>
        {/* Triangle */}
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
          <polygon points="20,4 36,36 4,36" {...sharedStroke} />
        </svg>
        {/* Star (5-point) */}
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
          <polygon
            points="20,3 24.5,15 37,15 27,23 30.5,36 20,28 9.5,36 13,23 3,15 15.5,15"
            {...sharedStroke}
          />
        </svg>
      </div>
      {/* Sizing indicators */}
      <div className="flex items-end justify-center gap-3 mt-3">
        {displaySizes.map((size, i) => {
          const dotSize = 4 + i * 3;
          return (
            <div key={size} className="flex flex-col items-center gap-1">
              <div
                className="rounded-full bg-gray-300"
                style={{ width: dotSize, height: dotSize }}
              />
              <span className="text-[10px] text-gray-400">{size}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Visual preview of the grid column system */
function GridPreview({ gridSystem }: { gridSystem?: string }) {
  if (!gridSystem) return null;

  const colMatch = gridSystem.match(/(\d+)\s*-?\s*col/i);
  const columns = colMatch ? parseInt(colMatch[1], 10) : 12;
  const safeColumns = Math.max(1, Math.min(columns, 24));

  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-3">
      <div className="flex gap-1 h-12">
        {Array.from({ length: safeColumns }, (_, i) => (
          <div key={i} className="flex-1 bg-primary-100 rounded-sm" />
        ))}
      </div>
      <p className="text-[10px] text-gray-400 text-right mt-1.5">
        {safeColumns} columns
      </p>
    </div>
  );
}

const ICON_STYLES = [
  { value: "line", label: "Line" },
  { value: "fill", label: "Fill" },
  { value: "duo-tone", label: "Duo-tone" },
  { value: "custom", label: "Custom" },
];

const GRADIENT_TYPES = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
  { value: "conic", label: "Conic" },
];

// ─── Main Component ─────────────────────────────────────

interface DesignLanguageSectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

export function DesignLanguageSection({ styleguide, canEdit }: DesignLanguageSectionProps) {
  const updateSection = useUpdateSection("design-language");

  // Default string arrays that may be undefined for existing records
  const graphicElementsDonts = styleguide.graphicElementsDonts ?? [];
  const iconographyDonts = styleguide.iconographyDonts ?? [];

  // ─── Graphic Elements state ───
  const graphicData = (styleguide.graphicElements ?? {}) as GraphicElementsData;
  const [isEditingGraphic, setIsEditingGraphic] = useState(false);
  const [editGraphic, setEditGraphic] = useState<GraphicElementsData>({});

  const startEditGraphic = useCallback(() => {
    setEditGraphic({
      brandShapes: [...(graphicData.brandShapes ?? [])],
      decorativeElements: [...(graphicData.decorativeElements ?? [])],
      visualDevices: [...(graphicData.visualDevices ?? [])],
      usageNotes: graphicData.usageNotes ?? "",
    });
    setIsEditingGraphic(true);
  }, [graphicData]);

  const saveGraphic = () => {
    updateSection.mutate(
      { graphicElements: editGraphic },
      { onSuccess: () => setIsEditingGraphic(false) },
    );
  };

  // ─── Patterns & Textures state ───
  const patternsData = (styleguide.patternsTextures ?? {}) as PatternsTexturesData;
  const [isEditingPatterns, setIsEditingPatterns] = useState(false);
  const [editPatterns, setEditPatterns] = useState<PatternsTexturesData>({});

  const startEditPatterns = useCallback(() => {
    setEditPatterns({
      patterns: [...(patternsData.patterns ?? [])],
      textures: [...(patternsData.textures ?? [])],
      backgrounds: [...(patternsData.backgrounds ?? [])],
      usageNotes: patternsData.usageNotes ?? "",
    });
    setIsEditingPatterns(true);
  }, [patternsData]);

  const savePatterns = () => {
    updateSection.mutate(
      { patternsTextures: editPatterns },
      { onSuccess: () => setIsEditingPatterns(false) },
    );
  };

  // ─── Iconography state ───
  const iconData = (styleguide.iconographyStyle ?? {}) as IconographyStyleData;
  const [isEditingIcon, setIsEditingIcon] = useState(false);
  const [editIcon, setEditIcon] = useState<IconographyStyleData>({});

  const startEditIcon = useCallback(() => {
    setEditIcon({
      style: iconData.style ?? "",
      strokeWeight: iconData.strokeWeight ?? "",
      cornerRadius: iconData.cornerRadius ?? "",
      sizing: iconData.sizing ?? "",
      colorUsage: iconData.colorUsage ?? "",
      usageNotes: iconData.usageNotes ?? "",
    });
    setIsEditingIcon(true);
  }, [iconData]);

  const saveIcon = () => {
    updateSection.mutate(
      { iconographyStyle: editIcon },
      { onSuccess: () => setIsEditingIcon(false) },
    );
  };

  // ─── Gradients & Effects state ───
  const gradients = (styleguide.gradientsEffects ?? []) as GradientDefinition[];
  const [isEditingGradients, setIsEditingGradients] = useState(false);
  const [editGradients, setEditGradients] = useState<GradientDefinition[]>([]);
  const [showGradientForm, setShowGradientForm] = useState(false);
  const [newGradient, setNewGradient] = useState<GradientDefinition>({
    name: "", type: "linear", colors: ["#000000", "#ffffff"], angle: "90deg", usage: "",
  });

  const startEditGradients = useCallback(() => {
    setEditGradients(gradients.map((g) => ({ ...g, colors: [...g.colors] })));
    setIsEditingGradients(true);
    setShowGradientForm(false);
  }, [gradients]);

  const addGradient = () => {
    if (!newGradient.name.trim()) return;
    setEditGradients((prev) => [...prev, { ...newGradient, name: newGradient.name.trim() }]);
    setNewGradient({ name: "", type: "linear", colors: ["#000000", "#ffffff"], angle: "90deg", usage: "" });
    setShowGradientForm(false);
  };

  const removeGradient = (index: number) => {
    setEditGradients((prev) => prev.filter((_, i) => i !== index));
  };

  const saveGradients = () => {
    updateSection.mutate(
      { gradientsEffects: editGradients.length > 0 ? editGradients : null },
      { onSuccess: () => { setIsEditingGradients(false); setShowGradientForm(false); } },
    );
  };

  // ─── Layout Principles state ───
  const layoutData = (styleguide.layoutPrinciples ?? {}) as LayoutPrinciplesData;
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [editLayout, setEditLayout] = useState<LayoutPrinciplesData>({});

  const startEditLayout = useCallback(() => {
    setEditLayout({
      gridSystem: layoutData.gridSystem ?? "",
      spacingScale: layoutData.spacingScale ?? "",
      whitespacePhilosophy: layoutData.whitespacePhilosophy ?? "",
      compositionRules: [...(layoutData.compositionRules ?? [])],
      usageNotes: layoutData.usageNotes ?? "",
    });
    setIsEditingLayout(true);
  }, [layoutData]);

  const saveLayout = () => {
    updateSection.mutate(
      { layoutPrinciples: editLayout },
      { onSuccess: () => setIsEditingLayout(false) },
    );
  };

  /** Build CSS gradient string for preview */
  const gradientCss = (g: GradientDefinition): string => {
    const colorStr = g.colors.join(", ");
    if (g.type === "radial") return `radial-gradient(circle, ${colorStr})`;
    if (g.type === "conic") return `conic-gradient(${colorStr})`;
    return `linear-gradient(${g.angle ?? "90deg"}, ${colorStr})`;
  };

  const displayGradients = isEditingGradients ? editGradients : gradients;

  return (
    <div data-testid="design-language-section" className="space-y-6">

      {/* ─── Card 1: Graphic Elements ─── */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Shapes className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">Graphic Elements</h3>
          </div>
          {canEdit && !isEditingGraphic && (
            <button onClick={startEditGraphic} className="p-1 text-gray-400 hover:text-primary transition-colors flex-shrink-0" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isEditingGraphic ? (
          <div className="space-y-4">
            <TagEditor label="Brand Shapes" items={editGraphic.brandShapes ?? []} onChange={(v) => setEditGraphic((p) => ({ ...p, brandShapes: v }))} placeholder="e.g. Rounded rectangle, Circle motif" />
            <TagEditor label="Decorative Elements" items={editGraphic.decorativeElements ?? []} onChange={(v) => setEditGraphic((p) => ({ ...p, decorativeElements: v }))} placeholder="e.g. Dotted lines, Wave patterns" />
            <TagEditor label="Visual Devices" items={editGraphic.visualDevices ?? []} onChange={(v) => setEditGraphic((p) => ({ ...p, visualDevices: v }))} placeholder="e.g. Highlight boxes, Pull quotes" />
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Usage Notes</label>
              <textarea
                value={editGraphic.usageNotes ?? ""}
                onChange={(e) => setEditGraphic((p) => ({ ...p, usageNotes: e.target.value }))}
                rows={2}
                placeholder="How and when to use these elements..."
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" onClick={saveGraphic} isLoading={updateSection.isPending}>Save</Button>
              <Button variant="secondary" size="sm" onClick={() => setIsEditingGraphic(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {(graphicData.brandShapes?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Brand Shapes</p>
                <TagDisplay items={graphicData.brandShapes ?? []} />
              </div>
            )}
            {(graphicData.decorativeElements?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Decorative Elements</p>
                <TagDisplay items={graphicData.decorativeElements ?? []} />
              </div>
            )}
            {(graphicData.visualDevices?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Visual Devices</p>
                <TagDisplay items={graphicData.visualDevices ?? []} />
              </div>
            )}
            {graphicData.usageNotes && (
              <p className="text-sm text-gray-600">{graphicData.usageNotes}</p>
            )}
            {!(graphicData.brandShapes?.length || graphicData.decorativeElements?.length || graphicData.visualDevices?.length || graphicData.usageNotes) && (
              <p className="text-sm text-gray-400">No graphic elements defined yet.</p>
            )}
          </div>
        )}

        {/* Don'ts */}
        {!isEditingGraphic && (
          <div className="mt-4">
            <EditableStringList
              title="Don'ts"
              items={graphicElementsDonts}
              canEdit={canEdit}
              isSaving={updateSection.isPending}
              placeholder="Add a graphic element don't..."
              onSave={(items) => updateSection.mutate({ graphicElementsDonts: items })}
            >
              {(items) =>
                items.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-600 p-3 bg-red-50 rounded-lg">
                        <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        {d}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No graphic element don&apos;ts defined yet.</p>
                )
              }
            </EditableStringList>
          </div>
        )}
      </Card>

      {/* ─── Card 2: Patterns & Textures ─── */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">Patterns & Textures</h3>
          </div>
          {canEdit && !isEditingPatterns && (
            <button onClick={startEditPatterns} className="p-1 text-gray-400 hover:text-primary transition-colors flex-shrink-0" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isEditingPatterns ? (
          <div className="space-y-4">
            <TagEditor label="Patterns" items={editPatterns.patterns ?? []} onChange={(v) => setEditPatterns((p) => ({ ...p, patterns: v }))} placeholder="e.g. Herringbone, Grid overlay" />
            <TagEditor label="Textures" items={editPatterns.textures ?? []} onChange={(v) => setEditPatterns((p) => ({ ...p, textures: v }))} placeholder="e.g. Paper grain, Noise" />
            <TagEditor label="Backgrounds" items={editPatterns.backgrounds ?? []} onChange={(v) => setEditPatterns((p) => ({ ...p, backgrounds: v }))} placeholder="e.g. Soft gradient wash, Solid neutral" />
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Usage Notes</label>
              <textarea
                value={editPatterns.usageNotes ?? ""}
                onChange={(e) => setEditPatterns((p) => ({ ...p, usageNotes: e.target.value }))}
                rows={2}
                placeholder="When and where to apply these..."
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" onClick={savePatterns} isLoading={updateSection.isPending}>Save</Button>
              <Button variant="secondary" size="sm" onClick={() => setIsEditingPatterns(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {(patternsData.patterns?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Patterns</p>
                <TagDisplay items={patternsData.patterns ?? []} />
              </div>
            )}
            {(patternsData.textures?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Textures</p>
                <TagDisplay items={patternsData.textures ?? []} />
              </div>
            )}
            {(patternsData.backgrounds?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Backgrounds</p>
                <TagDisplay items={patternsData.backgrounds ?? []} />
              </div>
            )}
            {patternsData.usageNotes && (
              <p className="text-sm text-gray-600">{patternsData.usageNotes}</p>
            )}
            {!(patternsData.patterns?.length || patternsData.textures?.length || patternsData.backgrounds?.length || patternsData.usageNotes) && (
              <p className="text-sm text-gray-400">No patterns or textures defined yet.</p>
            )}
          </div>
        )}
      </Card>

      {/* ─── Card 3: Iconography ─── */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <PenTool className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">Iconography</h3>
          </div>
          {canEdit && !isEditingIcon && (
            <button onClick={startEditIcon} className="p-1 text-gray-400 hover:text-primary transition-colors flex-shrink-0" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isEditingIcon ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Icon Style</label>
              <select
                value={editIcon.style ?? ""}
                onChange={(e) => setEditIcon((p) => ({ ...p, style: e.target.value }))}
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a style...</option>
                {ICON_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Stroke Weight</label>
                <input value={editIcon.strokeWeight ?? ""} onChange={(e) => setEditIcon((p) => ({ ...p, strokeWeight: e.target.value }))} placeholder="e.g. 1.5px" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Corner Radius</label>
                <input value={editIcon.cornerRadius ?? ""} onChange={(e) => setEditIcon((p) => ({ ...p, cornerRadius: e.target.value }))} placeholder="e.g. 2px" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Sizing</label>
                <input value={editIcon.sizing ?? ""} onChange={(e) => setEditIcon((p) => ({ ...p, sizing: e.target.value }))} placeholder="e.g. 16/20/24/32px" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Color Usage</label>
                <input value={editIcon.colorUsage ?? ""} onChange={(e) => setEditIcon((p) => ({ ...p, colorUsage: e.target.value }))} placeholder="e.g. Single color, inherit text color" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Usage Notes</label>
              <textarea value={editIcon.usageNotes ?? ""} onChange={(e) => setEditIcon((p) => ({ ...p, usageNotes: e.target.value }))} rows={2} placeholder="Icon usage guidelines..." className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" onClick={saveIcon} isLoading={updateSection.isPending}>Save</Button>
              <Button variant="secondary" size="sm" onClick={() => setIsEditingIcon(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <IconSpecPreview
              style={iconData.style}
              strokeWeight={iconData.strokeWeight}
              cornerRadius={iconData.cornerRadius}
              sizing={iconData.sizing}
            />
            {iconData.style && (
              <div className="flex items-center gap-2">
                <Badge variant="info">{ICON_STYLES.find((s) => s.value === iconData.style)?.label ?? iconData.style}</Badge>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {iconData.strokeWeight && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Stroke Weight</p>
                  <p className="text-sm text-gray-700">{iconData.strokeWeight}</p>
                </div>
              )}
              {iconData.cornerRadius && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Corner Radius</p>
                  <p className="text-sm text-gray-700">{iconData.cornerRadius}</p>
                </div>
              )}
              {iconData.sizing && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Sizing</p>
                  <p className="text-sm text-gray-700">{iconData.sizing}</p>
                </div>
              )}
              {iconData.colorUsage && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Color Usage</p>
                  <p className="text-sm text-gray-700">{iconData.colorUsage}</p>
                </div>
              )}
            </div>
            {iconData.usageNotes && (
              <p className="text-sm text-gray-600">{iconData.usageNotes}</p>
            )}
            {!(iconData.style || iconData.strokeWeight || iconData.sizing || iconData.usageNotes) && (
              <p className="text-sm text-gray-400">No iconography style defined yet.</p>
            )}
          </div>
        )}

        {/* Don'ts */}
        {!isEditingIcon && (
          <div className="mt-4">
            <EditableStringList
              title="Don'ts"
              items={iconographyDonts}
              canEdit={canEdit}
              isSaving={updateSection.isPending}
              placeholder="Add an iconography don't..."
              onSave={(items) => updateSection.mutate({ iconographyDonts: items })}
            >
              {(items) =>
                items.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-600 p-3 bg-red-50 rounded-lg">
                        <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        {d}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No iconography don&apos;ts defined yet.</p>
                )
              }
            </EditableStringList>
          </div>
        )}
      </Card>

      {/* ─── Card 4: Gradients & Effects ─── */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Blend className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">Gradients & Effects</h3>
            {gradients.length > 0 && <Badge variant="default">{gradients.length}</Badge>}
          </div>
          {canEdit && !isEditingGradients && gradients.length > 0 && (
            <button onClick={startEditGradients} className="p-1 text-gray-400 hover:text-primary transition-colors flex-shrink-0" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {displayGradients.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayGradients.map((g, i) => (
              <div key={`${g.name}-${i}`} className="relative group rounded-lg border border-gray-200 overflow-hidden">
                <div
                  className="h-16 w-full"
                  style={{ background: gradientCss(g) }}
                />
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate min-w-0">{g.name}</p>
                    <Badge variant="default">{g.type}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{g.colors.join(" → ")}</p>
                  {g.angle && g.type === "linear" && (
                    <p className="text-xs text-gray-400">{g.angle}</p>
                  )}
                  {g.usage && (
                    <p className="text-xs text-gray-500 mt-1">{g.usage}</p>
                  )}
                </div>
                {isEditingGradients && (
                  <button
                    type="button"
                    onClick={() => removeGradient(i)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Remove gradient"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No gradients defined yet.</p>
        )}

        {/* Edit mode controls */}
        {isEditingGradients && (
          <div className="mt-4 space-y-3">
            {showGradientForm ? (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
                    <input value={newGradient.name} onChange={(e) => setNewGradient((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Primary CTA Gradient" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
                    <select value={newGradient.type} onChange={(e) => setNewGradient((p) => ({ ...p, type: e.target.value }))} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                      {GRADIENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Color 1</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={newGradient.colors[0]} onChange={(e) => setNewGradient((p) => ({ ...p, colors: [e.target.value, ...p.colors.slice(1)] }))} className="h-8 w-8 rounded cursor-pointer" />
                      <span className="text-xs text-gray-500">{newGradient.colors[0]}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Color 2</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={newGradient.colors[1] ?? "#ffffff"} onChange={(e) => setNewGradient((p) => ({ ...p, colors: [p.colors[0], e.target.value, ...p.colors.slice(2)] }))} className="h-8 w-8 rounded cursor-pointer" />
                      <span className="text-xs text-gray-500">{newGradient.colors[1]}</span>
                    </div>
                  </div>
                  {newGradient.type === "linear" && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Angle</label>
                      <input value={newGradient.angle ?? ""} onChange={(e) => setNewGradient((p) => ({ ...p, angle: e.target.value }))} placeholder="90deg" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                  )}
                </div>
                {newGradient.name && (
                  <div className="h-10 w-full rounded-md" style={{ background: gradientCss(newGradient) }} />
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Usage</label>
                  <input value={newGradient.usage ?? ""} onChange={(e) => setNewGradient((p) => ({ ...p, usage: e.target.value }))} placeholder="e.g. CTA buttons, hero backgrounds" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={addGradient}>Add</Button>
                  <Button variant="secondary" size="sm" onClick={() => setShowGradientForm(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowGradientForm(true)}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add gradient
              </button>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" onClick={saveGradients} isLoading={updateSection.isPending}>Save</Button>
              <Button variant="secondary" size="sm" onClick={() => { setIsEditingGradients(false); setShowGradientForm(false); }}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Show add button when no gradients exist and not editing */}
        {canEdit && !isEditingGradients && gradients.length === 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={startEditGradients}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add gradients
            </button>
          </div>
        )}
      </Card>

      {/* ─── Card 5: Layout Principles ─── */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <LayoutGrid className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">Layout Principles</h3>
          </div>
          {canEdit && !isEditingLayout && (
            <button onClick={startEditLayout} className="p-1 text-gray-400 hover:text-primary transition-colors flex-shrink-0" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isEditingLayout ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Grid System</label>
              <input value={editLayout.gridSystem ?? ""} onChange={(e) => setEditLayout((p) => ({ ...p, gridSystem: e.target.value }))} placeholder="e.g. 12-column grid, 24px gutters" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Spacing Scale</label>
              <input value={editLayout.spacingScale ?? ""} onChange={(e) => setEditLayout((p) => ({ ...p, spacingScale: e.target.value }))} placeholder="e.g. 4px base unit (4/8/12/16/24/32/48/64)" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Whitespace Philosophy</label>
              <textarea value={editLayout.whitespacePhilosophy ?? ""} onChange={(e) => setEditLayout((p) => ({ ...p, whitespacePhilosophy: e.target.value }))} rows={2} placeholder="e.g. Generous whitespace to convey premium feel..." className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Usage Notes</label>
              <textarea value={editLayout.usageNotes ?? ""} onChange={(e) => setEditLayout((p) => ({ ...p, usageNotes: e.target.value }))} rows={2} placeholder="Additional layout guidelines..." className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <TagEditor
              label="Composition Rules"
              items={editLayout.compositionRules ?? []}
              onChange={(v) => setEditLayout((p) => ({ ...p, compositionRules: v }))}
              placeholder="e.g. Asymmetric layouts preferred"
            />
            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" onClick={saveLayout} isLoading={updateSection.isPending}>Save</Button>
              <Button variant="secondary" size="sm" onClick={() => setIsEditingLayout(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <GridPreview gridSystem={layoutData.gridSystem} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {layoutData.gridSystem && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Grid System</p>
                  <p className="text-sm text-gray-700">{layoutData.gridSystem}</p>
                </div>
              )}
              {layoutData.spacingScale && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Spacing Scale</p>
                  <p className="text-sm text-gray-700">{layoutData.spacingScale}</p>
                </div>
              )}
              {layoutData.whitespacePhilosophy && (
                <div className="sm:col-span-3">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Whitespace Philosophy</p>
                  <p className="text-sm text-gray-700">{layoutData.whitespacePhilosophy}</p>
                </div>
              )}
            </div>
            {(layoutData.compositionRules?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Composition Rules</p>
                <ul className="space-y-1.5">
                  {(layoutData.compositionRules ?? []).map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-primary-500 mt-0.5">&#8226;</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {layoutData.usageNotes && (
              <p className="text-sm text-gray-600">{layoutData.usageNotes}</p>
            )}
            {!(layoutData.gridSystem || layoutData.spacingScale || layoutData.whitespacePhilosophy || layoutData.compositionRules?.length || layoutData.usageNotes) && (
              <p className="text-sm text-gray-400">No layout principles defined yet.</p>
            )}
          </div>
        )}
      </Card>

      {/* Save for AI banner */}
      <AiContentBanner section="design-language" savedForAi={styleguide.designLanguageSavedForAi ?? false} />
    </div>
  );
}
