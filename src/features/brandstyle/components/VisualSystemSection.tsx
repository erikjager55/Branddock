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
  const profile = styleguide.visualLanguage as VisualLanguageProfile | null;
  const updateDL = useUpdateSection("design-language");

  return (
    <div data-testid="visual-system-section" className="space-y-8">
      {/* Summary banner */}
      {profile?.summary && (
        <div className="rounded-lg border border-teal-200 bg-teal-50/30 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Visual System Summary</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{profile.summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 1: Foundations ── */}
      <SectionHeader title="Foundations" description="Core visual DNA detected from website CSS" />
      {profile ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FoundationCard icon={CornerDownRight} title="Corners & Edges">
            <CornerRadiusPreview radiusPx={profile.cornerRadius.radiusPx} />
            <Param label="Style" value={profile.cornerRadius.dominant} />
            <Param label="Radius" value={`${profile.cornerRadius.radiusPx}px`} />
            <Param label="Consistency" value={profile.cornerRadius.consistency} />
          </FoundationCard>

          <FoundationCard icon={Layers} title="Shadows & Depth">
            <ShadowPreview style={profile.shadow.style} />
            <Param label="Shadow" value={profile.shadow.style} />
            <Param label="Elevation" value={profile.shadow.elevation} />
            <Param label="Depth" value={profile.depth.dimensionality} />
            {profile.depth.glassmorphism && <Param label="Glassmorphism" value="Detected" />}
          </FoundationCard>

          <FoundationCard icon={Square} title="Lines & Borders">
            <LinePreview borders={profile.line.borders} />
            <Param label="Borders" value={profile.line.borders} />
            <Param label="Dividers" value={profile.line.dividers} />
            <Param label="Decorative" value={profile.line.decorativeLines ? "Yes" : "No"} />
          </FoundationCard>

          <FoundationCard icon={Shapes} title="Shape Language">
            <ShapePreview primary={profile.shape.primary} angularity={profile.shape.angularity} />
            <Param label="Primary" value={profile.shape.primary} />
            <Param label="Angularity" value={`${profile.shape.angularity}/10`} />
            <Param label="Symmetry" value={profile.shape.symmetry} />
          </FoundationCard>

          <FoundationCard icon={Maximize} title="Visual Weight">
            <Param label="Overall" value={profile.weight.overall} />
            <Param label="Text Density" value={profile.weight.textDensity} />
            <Param label="Ornaments" value={profile.weight.ornamentLevel} />
          </FoundationCard>
        </div>
      ) : (
        <EmptyFoundations />
      )}

      {/* ── Section 2: Spacing & Layout ── */}
      <SectionHeader title="Spacing & Layout" description="Grid system, spacing scale, and whitespace philosophy" />
      <SpacingLayoutCard
        profile={profile}
        layoutData={(styleguide.layoutPrinciples ?? {}) as LayoutPrinciplesData}
        canEdit={canEdit}
        updateSection={updateDL}
      />

      {/* ── Section 3: Elements & Patterns ── */}
      <SectionHeader title="Elements & Patterns" description="Graphic elements, patterns, textures, and iconography" />
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
      <SectionHeader title="Effects & Application" description="Gradients, color application, and component patterns" />
      <GradientsCard
        gradients={(styleguide.gradientsEffects ?? []) as GradientDefinition[]}
        canEdit={canEdit}
        updateSection={updateDL}
      />
      {profile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FoundationCard icon={Palette} title="Color Application">
            <Param label="Buttons" value={profile.colorApplication.buttonStyle} />
            <Param label="Backgrounds" value={profile.colorApplication.backgroundApproach} />
            <Param label="Accents" value={profile.colorApplication.accentUsage} />
            <Param label="Gradients" value={profile.colorApplication.gradientPresence} />
          </FoundationCard>
          <FoundationCard icon={LayoutGrid} title="Component Patterns">
            <Param label="Cards" value={profile.components.cardStyle} />
            <Param label="Buttons" value={profile.components.buttonShape} />
            <Param label="Inputs" value={profile.components.inputStyle} />
            <Param label="Spacing System" value={profile.components.spacingSystem} />
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
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
      <Layers className="mx-auto h-10 w-10 text-gray-300 mb-3" />
      <h3 className="text-sm font-semibold text-gray-900 mb-1">No Visual Foundations Detected</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto">
        Re-analyze your website to detect corners, shadows, spacing, depth, and shape language from the CSS.
      </p>
    </div>
  );
}

function PromptPreview({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">AI Generation Instructions</h4>
        <button type="button" onClick={handleCopy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-md p-3 break-words">{value}</p>
      <p className="mt-2 text-[10px] text-gray-400">
        This text is automatically injected into all AI generation prompts when &quot;Save for AI&quot; is enabled.
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
        <div className="flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-teal-600" /><h4 className="text-sm font-semibold text-gray-900">Spacing & Layout</h4></div>
        {canEdit && !isEditing && <button type="button" onClick={startEdit} className="p-1 text-gray-400 hover:text-primary transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>}
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
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">Grid System</label><input value={edit.gridSystem ?? ""} onChange={(e) => setEdit((p) => ({ ...p, gridSystem: e.target.value }))} placeholder="e.g. 12-column grid, 24px gutters" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">Spacing Scale</label><input value={edit.spacingScale ?? ""} onChange={(e) => setEdit((p) => ({ ...p, spacingScale: e.target.value }))} placeholder="e.g. 4px base (4/8/12/16/24/32)" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">Whitespace Philosophy</label><textarea value={edit.whitespacePhilosophy ?? ""} onChange={(e) => setEdit((p) => ({ ...p, whitespacePhilosophy: e.target.value }))} rows={2} placeholder="e.g. Generous whitespace for premium feel" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <TagEditor label="Composition Rules" items={edit.compositionRules ?? []} onChange={(v) => setEdit((p) => ({ ...p, compositionRules: v }))} placeholder="e.g. Asymmetric layouts preferred" />
          <div className="flex gap-2 pt-1"><Button variant="primary" size="sm" onClick={save} isLoading={updateSection.isPending}>Save</Button><Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button></div>
        </div>
      ) : (
        <div className="space-y-3">
          {layoutData.gridSystem && <div><p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Grid System</p><p className="text-sm text-gray-700">{layoutData.gridSystem}</p></div>}
          {layoutData.spacingScale && <div><p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Spacing Scale</p><p className="text-sm text-gray-700">{layoutData.spacingScale}</p></div>}
          {layoutData.whitespacePhilosophy && <div><p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Whitespace Philosophy</p><p className="text-sm text-gray-700">{layoutData.whitespacePhilosophy}</p></div>}
          {(layoutData.compositionRules?.length ?? 0) > 0 && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Composition Rules</p><TagDisplay items={layoutData.compositionRules ?? []} /></div>}
        </div>
      )}
    </Card>
  );
}

// ── Graphic Elements Card ──

function GraphicElementsCard({ data, donts, canEdit, updateSection }: { data: GraphicElementsData; donts: string[]; canEdit: boolean; updateSection: ReturnType<typeof useUpdateSection> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState<GraphicElementsData>({});
  const startEdit = useCallback(() => { setEdit({ brandShapes: [...(data.brandShapes ?? [])], decorativeElements: [...(data.decorativeElements ?? [])], visualDevices: [...(data.visualDevices ?? [])], usageNotes: data.usageNotes ?? "" }); setIsEditing(true); }, [data]);
  const save = () => { updateSection.mutate({ graphicElements: edit }, { onSuccess: () => setIsEditing(false) }); };
  const hasContent = data.brandShapes?.length || data.decorativeElements?.length || data.visualDevices?.length || data.usageNotes;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2"><Shapes className="w-4 h-4 text-teal-600" /><h4 className="text-sm font-semibold text-gray-900">Graphic Elements</h4></div>
        {canEdit && !isEditing && <button type="button" onClick={startEdit} className="p-1 text-gray-400 hover:text-primary transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>}
      </div>
      {isEditing ? (
        <div className="space-y-4">
          <TagEditor label="Brand Shapes" items={edit.brandShapes ?? []} onChange={(v) => setEdit((p) => ({ ...p, brandShapes: v }))} placeholder="e.g. Rounded rectangle" />
          <TagEditor label="Decorative Elements" items={edit.decorativeElements ?? []} onChange={(v) => setEdit((p) => ({ ...p, decorativeElements: v }))} placeholder="e.g. Dotted lines" />
          <TagEditor label="Visual Devices" items={edit.visualDevices ?? []} onChange={(v) => setEdit((p) => ({ ...p, visualDevices: v }))} placeholder="e.g. Pull quotes" />
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">Usage Notes</label><textarea value={edit.usageNotes ?? ""} onChange={(e) => setEdit((p) => ({ ...p, usageNotes: e.target.value }))} rows={2} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div className="flex gap-2 pt-1"><Button variant="primary" size="sm" onClick={save} isLoading={updateSection.isPending}>Save</Button><Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button></div>
        </div>
      ) : (
        <div className="space-y-3">
          {(data.brandShapes?.length ?? 0) > 0 && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Brand Shapes</p><TagDisplay items={data.brandShapes ?? []} /></div>}
          {(data.decorativeElements?.length ?? 0) > 0 && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Decorative Elements</p><TagDisplay items={data.decorativeElements ?? []} /></div>}
          {(data.visualDevices?.length ?? 0) > 0 && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Visual Devices</p><TagDisplay items={data.visualDevices ?? []} /></div>}
          {data.usageNotes && <p className="text-sm text-gray-600">{data.usageNotes}</p>}
          {!hasContent && <p className="text-sm text-gray-400">No graphic elements defined yet.</p>}
        </div>
      )}
      {!isEditing && (
        <div className="mt-4">
          <EditableStringList title="Don'ts" items={donts} canEdit={canEdit} isSaving={updateSection.isPending} placeholder="Add a graphic element don't..." onSave={(items) => updateSection.mutate({ graphicElementsDonts: items })}>
            {(items) => items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{items.map((d, i) => <div key={i} className="flex items-start gap-2 text-sm text-gray-600 p-3 bg-red-50 rounded-lg"><X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />{d}</div>)}</div>
            ) : <p className="text-sm text-gray-400">No don&apos;ts defined yet.</p>}
          </EditableStringList>
        </div>
      )}
    </Card>
  );
}

// ── Patterns & Textures Card ──

function PatternsCard({ data, canEdit, updateSection }: { data: PatternsTexturesData; canEdit: boolean; updateSection: ReturnType<typeof useUpdateSection> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState<PatternsTexturesData>({});
  const startEdit = useCallback(() => { setEdit({ patterns: [...(data.patterns ?? [])], textures: [...(data.textures ?? [])], backgrounds: [...(data.backgrounds ?? [])], usageNotes: data.usageNotes ?? "" }); setIsEditing(true); }, [data]);
  const save = () => { updateSection.mutate({ patternsTextures: edit }, { onSuccess: () => setIsEditing(false) }); };
  const hasContent = data.patterns?.length || data.textures?.length || data.backgrounds?.length || data.usageNotes;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-teal-600" /><h4 className="text-sm font-semibold text-gray-900">Patterns & Textures</h4></div>
        {canEdit && !isEditing && <button type="button" onClick={startEdit} className="p-1 text-gray-400 hover:text-primary transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>}
      </div>
      {isEditing ? (
        <div className="space-y-4">
          <TagEditor label="Patterns" items={edit.patterns ?? []} onChange={(v) => setEdit((p) => ({ ...p, patterns: v }))} placeholder="e.g. Herringbone" />
          <TagEditor label="Textures" items={edit.textures ?? []} onChange={(v) => setEdit((p) => ({ ...p, textures: v }))} placeholder="e.g. Paper grain" />
          <TagEditor label="Backgrounds" items={edit.backgrounds ?? []} onChange={(v) => setEdit((p) => ({ ...p, backgrounds: v }))} placeholder="e.g. Soft gradient" />
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">Usage Notes</label><textarea value={edit.usageNotes ?? ""} onChange={(e) => setEdit((p) => ({ ...p, usageNotes: e.target.value }))} rows={2} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div className="flex gap-2 pt-1"><Button variant="primary" size="sm" onClick={save} isLoading={updateSection.isPending}>Save</Button><Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button></div>
        </div>
      ) : (
        <div className="space-y-3">
          {(data.patterns?.length ?? 0) > 0 && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Patterns</p><TagDisplay items={data.patterns ?? []} /></div>}
          {(data.textures?.length ?? 0) > 0 && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Textures</p><TagDisplay items={data.textures ?? []} /></div>}
          {(data.backgrounds?.length ?? 0) > 0 && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1.5">Backgrounds</p><TagDisplay items={data.backgrounds ?? []} /></div>}
          {data.usageNotes && <p className="text-sm text-gray-600">{data.usageNotes}</p>}
          {!hasContent && <p className="text-sm text-gray-400">No patterns or textures defined yet.</p>}
        </div>
      )}
    </Card>
  );
}

// ── Iconography Card ──

const ICON_STYLES = [{ value: "line", label: "Line" }, { value: "fill", label: "Fill" }, { value: "duo-tone", label: "Duo-tone" }, { value: "custom", label: "Custom" }];

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
  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState<IconographyStyleData>({});
  const startEdit = useCallback(() => { setEdit({ style: data.style ?? "", strokeWeight: data.strokeWeight ?? "", cornerRadius: data.cornerRadius ?? "", sizing: data.sizing ?? "", colorUsage: data.colorUsage ?? "", usageNotes: data.usageNotes ?? "" }); setIsEditing(true); }, [data]);
  const save = () => { updateSection.mutate({ iconographyStyle: edit }, { onSuccess: () => setIsEditing(false) }); };
  const hasContent = data.style || data.strokeWeight || data.sizing || data.usageNotes;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2"><PenTool className="w-4 h-4 text-teal-600" /><h4 className="text-sm font-semibold text-gray-900">Iconography</h4></div>
        {canEdit && !isEditing && <button type="button" onClick={startEdit} className="p-1 text-gray-400 hover:text-primary transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>}
      </div>
      {isEditing ? (
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">Icon Style</label><select value={edit.style ?? ""} onChange={(e) => setEdit((p) => ({ ...p, style: e.target.value }))} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"><option value="">Select a style...</option>{ICON_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">Stroke Weight</label><input value={edit.strokeWeight ?? ""} onChange={(e) => setEdit((p) => ({ ...p, strokeWeight: e.target.value }))} placeholder="e.g. 1.5px" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">Corner Radius</label><input value={edit.cornerRadius ?? ""} onChange={(e) => setEdit((p) => ({ ...p, cornerRadius: e.target.value }))} placeholder="e.g. 2px" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">Sizing</label><input value={edit.sizing ?? ""} onChange={(e) => setEdit((p) => ({ ...p, sizing: e.target.value }))} placeholder="e.g. 16/20/24/32px" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="text-xs font-medium text-gray-500 mb-1 block">Color Usage</label><input value={edit.colorUsage ?? ""} onChange={(e) => setEdit((p) => ({ ...p, colorUsage: e.target.value }))} placeholder="e.g. Single color" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          </div>
          <div className="flex gap-2 pt-1"><Button variant="primary" size="sm" onClick={save} isLoading={updateSection.isPending}>Save</Button><Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button></div>
        </div>
      ) : (
        <div className="space-y-3">
          <IconSpecPreview style={data.style} strokeWeight={data.strokeWeight} cornerRadius={data.cornerRadius} sizing={data.sizing} />
          {data.style && <Badge variant="info">{ICON_STYLES.find((s) => s.value === data.style)?.label ?? data.style}</Badge>}
          <div className="grid grid-cols-2 gap-4">
            {data.strokeWeight && <div><p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Stroke Weight</p><p className="text-sm text-gray-700">{data.strokeWeight}</p></div>}
            {data.cornerRadius && <div><p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Corner Radius</p><p className="text-sm text-gray-700">{data.cornerRadius}</p></div>}
            {data.sizing && <div><p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Sizing</p><p className="text-sm text-gray-700">{data.sizing}</p></div>}
            {data.colorUsage && <div><p className="text-xs font-medium text-gray-500 uppercase mb-0.5">Color Usage</p><p className="text-sm text-gray-700">{data.colorUsage}</p></div>}
          </div>
          {!hasContent && <p className="text-sm text-gray-400">No iconography style defined yet.</p>}
        </div>
      )}
      {!isEditing && (
        <div className="mt-4">
          <EditableStringList title="Don'ts" items={donts} canEdit={canEdit} isSaving={updateSection.isPending} placeholder="Add an iconography don't..." onSave={(items) => updateSection.mutate({ iconographyDonts: items })}>
            {(items) => items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{items.map((d, i) => <div key={i} className="flex items-start gap-2 text-sm text-gray-600 p-3 bg-red-50 rounded-lg"><X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />{d}</div>)}</div>
            ) : <p className="text-sm text-gray-400">No don&apos;ts defined yet.</p>}
          </EditableStringList>
        </div>
      )}
    </Card>
  );
}

// ── Gradients Card ──

const GRADIENT_TYPES = [{ value: "linear", label: "Linear" }, { value: "radial", label: "Radial" }, { value: "conic", label: "Conic" }];

function gradientCss(g: GradientDefinition): string {
  const colorStr = g.colors.join(", ");
  if (g.type === "radial") return `radial-gradient(circle, ${colorStr})`;
  if (g.type === "conic") return `conic-gradient(${colorStr})`;
  return `linear-gradient(${g.angle ?? "90deg"}, ${colorStr})`;
}

function GradientsCard({ gradients, canEdit, updateSection }: { gradients: GradientDefinition[]; canEdit: boolean; updateSection: ReturnType<typeof useUpdateSection> }) {
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
        <div className="flex items-center gap-2"><Blend className="w-4 h-4 text-teal-600" /><h4 className="text-sm font-semibold text-gray-900">Gradients & Effects</h4>{gradients.length > 0 && <Badge variant="default">{gradients.length}</Badge>}</div>
        {canEdit && !isEditing && gradients.length > 0 && <button type="button" onClick={startEdit} className="p-1 text-gray-400 hover:text-primary transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>}
      </div>
      {display.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {display.map((g, i) => (
            <div key={`${g.name}-${i}`} className="relative group rounded-lg border border-gray-200 overflow-hidden">
              <div className="h-16 w-full" style={{ background: gradientCss(g) }} />
              <div className="p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-gray-900 truncate min-w-0">{g.name}</p><Badge variant="default">{g.type}</Badge></div>
                <p className="text-xs text-gray-500 mt-0.5">{g.colors.join(" → ")}</p>
                {g.usage && <p className="text-xs text-gray-500 mt-1">{g.usage}</p>}
              </div>
              {isEditing && <button type="button" onClick={() => setEditGradients((p) => p.filter((_, idx) => idx !== i))} className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-gray-400">No gradients defined yet.</p>}

      {isEditing && (
        <div className="mt-4 space-y-3">
          {showForm ? (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500 mb-1 block">Name</label><input value={newG.name} onChange={(e) => setNewG((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Primary CTA" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
                <div><label className="text-xs font-medium text-gray-500 mb-1 block">Type</label><select value={newG.type} onChange={(e) => setNewG((p) => ({ ...p, type: e.target.value }))} className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">{GRADIENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium text-gray-500 mb-1 block">Color 1</label><div className="flex items-center gap-2"><input type="color" value={newG.colors[0]} onChange={(e) => setNewG((p) => ({ ...p, colors: [e.target.value, ...p.colors.slice(1)] }))} className="h-8 w-8 rounded cursor-pointer" /><span className="text-xs text-gray-500">{newG.colors[0]}</span></div></div>
                <div><label className="text-xs font-medium text-gray-500 mb-1 block">Color 2</label><div className="flex items-center gap-2"><input type="color" value={newG.colors[1] ?? "#ffffff"} onChange={(e) => setNewG((p) => ({ ...p, colors: [p.colors[0], e.target.value, ...p.colors.slice(2)] }))} className="h-8 w-8 rounded cursor-pointer" /><span className="text-xs text-gray-500">{newG.colors[1]}</span></div></div>
                {newG.type === "linear" && <div><label className="text-xs font-medium text-gray-500 mb-1 block">Angle</label><input value={newG.angle ?? ""} onChange={(e) => setNewG((p) => ({ ...p, angle: e.target.value }))} placeholder="90deg" className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>}
              </div>
              {newG.name && <div className="h-10 w-full rounded-md" style={{ background: gradientCss(newG) }} />}
              <div className="flex gap-2"><Button variant="primary" size="sm" onClick={addGradient}>Add</Button><Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button></div>
            </div>
          ) : <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 transition-colors"><Plus className="w-4 h-4" />Add gradient</button>}
          <div className="flex gap-2 pt-1"><Button variant="primary" size="sm" onClick={save} isLoading={updateSection.isPending}>Save</Button><Button variant="secondary" size="sm" onClick={() => { setIsEditing(false); setShowForm(false); }}>Cancel</Button></div>
        </div>
      )}
      {canEdit && !isEditing && gradients.length === 0 && <div className="mt-3"><button type="button" onClick={startEdit} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 transition-colors"><Plus className="w-4 h-4" />Add gradients</button></div>}
    </Card>
  );
}

// ── Grid Preview ──

function GridPreview({ gridSystem }: { gridSystem?: string }) {
  if (!gridSystem) return null;
  const colMatch = gridSystem.match(/(\d+)\s*-?\s*col/i);
  const columns = colMatch ? parseInt(colMatch[1], 10) : 12;
  const safeColumns = Math.max(1, Math.min(columns, 24));
  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-3">
      <div className="flex gap-1 h-12">
        {Array.from({ length: safeColumns }, (_, i) => <div key={i} className="flex-1 rounded-sm" style={{ backgroundColor: "#0d948820" }} />)}
      </div>
      <p className="text-[10px] text-gray-400 text-right mt-1.5">{safeColumns} columns</p>
    </div>
  );
}
