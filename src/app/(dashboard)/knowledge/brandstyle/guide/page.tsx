"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Copy,
  Check,
  X,
  Image as ImageIcon,
  Sparkles,
  Pencil,
  Upload,
  Trash2,
  Save,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/utils/date";
import {
  getContrastRatio,
  meetsWCAG,
  getTextColor,
} from "@/lib/utils/color-contrast";
import {
  useBrandStyleguide,
  useUpdateStyleguide,
  useExportPdf,
  type StyleguideColorData,
  type StyleguideLogoData,
  type TypeScaleItem,
  type ExamplePhrase,
} from "@/hooks/api/useBrandstyle";
import { useToast } from "@/hooks/useToast";

// ─── Section IDs ──────────────────────────────────────────────
const SECTIONS = [
  { id: "logo", label: "Logo", icon: "🖼️" },
  { id: "colors", label: "Colors", icon: "🎨" },
  { id: "typography", label: "Typography", icon: "Aa" },
  { id: "tone", label: "Tone of Voice", icon: "💬" },
  { id: "imagery", label: "Imagery", icon: "🖼️" },
] as const;

// ─── Main Page ────────────────────────────────────────────────
export default function BrandStyleguidePage() {
  const router = useRouter();
  const toast = useToast();
  const { data: apiData, isLoading } = useBrandStyleguide();
  const updateStyleguide = useUpdateStyleguide();
  const exportPdf = useExportPdf();

  const styleguide = apiData?.data ?? null;

  const [activeSection, setActiveSection] = useState("logo");
  const [selectedColor, setSelectedColor] = useState<StyleguideColorData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Edit state per section
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [dirtySection, setDirtySection] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<Record<string, unknown>>({});

  // ─── IntersectionObserver for scroll tracking ──────────────
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id.replace("section-", ""));
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isLoading]);

  const registerRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) sectionRefs.current.set(id, el);
    },
    []
  );

  const scrollTo = (section: string) => {
    setActiveSection(section);
    document
      .getElementById(`section-${section}`)
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCopy = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExportPdf = async () => {
    await exportPdf.mutateAsync();
    toast.info("PDF export is coming soon", "This feature is under development");
    if (styleguide) console.log("Styleguide data:", styleguide);
  };

  const startEdit = (section: string) => {
    setEditingSection(section);
    setDirtySection(null);
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setDirtySection(null);
    setEditBuffer({});
  };

  const handleSaveSection = async (sectionKey: string, data: Record<string, unknown>) => {
    try {
      await updateStyleguide.mutateAsync(data);
      toast.success("Changes saved");
      setEditingSection(null);
      setDirtySection(null);
      setEditBuffer({});
    } catch {
      toast.error("Failed to save changes");
    }
  };

  // ─── Loading state ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-[900px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-surface-dark rounded w-1/3" />
          <div className="h-64 bg-surface-dark rounded" />
          <div className="h-48 bg-surface-dark rounded" />
        </div>
      </div>
    );
  }

  if (!styleguide) {
    return (
      <div className="max-w-[900px] mx-auto text-center py-12">
        <h2 className="text-xl font-semibold text-text-dark mb-2">
          No styleguide yet
        </h2>
        <p className="text-text-dark/60 mb-4">
          Analyze a website or upload a PDF to generate your brand styleguide.
        </p>
        <Button
          variant="primary"
          onClick={() => router.push("/knowledge/brandstyle")}
        >
          Go to Analyzer
        </Button>
      </div>
    );
  }

  // ─── Data extraction ──────────────────────────────────────
  const logos = styleguide.logos ?? [];
  const colors = styleguide.colors ?? [];
  const typeScale = (styleguide.typeScale ?? []) as TypeScaleItem[];
  const contentGuidelines = (styleguide.contentGuidelines ?? []) as string[];
  const writingGuidelines = (styleguide.writingGuidelines ?? []) as string[];
  const examplePhrases = (styleguide.examplePhrases ?? []) as ExamplePhrase[];
  const photographyGuidelines = (styleguide.photographyGuidelines ?? []) as string[];
  const illustrationGuidelines = (styleguide.illustrationGuidelines ?? []) as string[];
  const imageryDonts = (styleguide.imageryDonts ?? []) as string[];
  const logoUsageGuidelines = (styleguide.logoUsageGuidelines ?? []) as string[];
  const logoDonts = (styleguide.logoDonts ?? []) as string[];
  const colorDonts = (styleguide.colorDonts ?? []) as string[];

  // Group colors by category
  const colorsByCategory = colors.reduce(
    (acc, c) => {
      const cat = c.category || "PRIMARY";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(c);
      return acc;
    },
    {} as Record<string, StyleguideColorData[]>
  );

  const doExamples = examplePhrases.filter((p) => p.type === "DO");
  const dontExamples = examplePhrases.filter((p) => p.type === "DONT");

  return (
    <div className="max-w-[900px] mx-auto">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">🎨</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-dark">
              Brand Styleguide
            </h1>
            <p className="text-sm text-text-dark/40">
              Extracted from your brand style
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/knowledge/brandstyle?reanalyze=true")}
          >
            Analyze Past
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportPdf}
            disabled={exportPdf.isPending}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Metadata bar */}
      <div className="flex items-center gap-2 mb-6">
        <Check className="w-4 h-4 text-primary" />
        <span className="text-sm text-primary font-medium">
          Analysis Complete
        </span>
        <span className="text-text-dark/30">&bull;</span>
        <span className="text-sm text-text-dark/40">
          {new Date(styleguide.updatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      {/* ─── Sticky Tab Navigation ─── */}
      <div className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-sm border-b border-border-dark mb-8 -mx-1 px-1">
        <div className="flex items-center gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                activeSection === s.id
                  ? "border-primary text-text-dark"
                  : "border-transparent text-text-dark/40 hover:text-text-dark/60"
              )}
            >
              <span className="text-xs">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ LOGO SECTION ═══ */}
      <section id="section-logo" ref={registerRef("section-logo")} className="mb-10">
        <SectionHeader
          title="Logo"
          editing={editingSection === "logo"}
          onEdit={() => startEdit("logo")}
          onCancel={cancelEdit}
          extra={
            <Button variant="ghost" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
              Download All
            </Button>
          }
        />

        <div className="grid grid-cols-3 gap-4 mb-6">
          {logos.map((logo) => (
            <Card key={logo.id} padding="lg" className="text-center">
              <div
                className="aspect-[3/2] rounded-md border border-border-dark flex items-center justify-center mb-3"
                style={{ backgroundColor: logo.backgroundColor || "#f5f5f5" }}
              >
                <ImageIcon
                  className="w-10 h-10"
                  style={{
                    color: getTextColor(logo.backgroundColor || "#f5f5f5") + "33",
                  }}
                />
              </div>
              <p className="text-sm font-medium text-text-dark">{logo.label}</p>
              <p className="text-xs text-text-dark/40">{logo.description}</p>
            </Card>
          ))}
        </div>

        {logoUsageGuidelines.length > 0 && (
          <Card padding="lg" className="mb-4">
            <h3 className="text-sm font-semibold text-text-dark mb-3">
              Usage Guidelines
            </h3>
            <div className="space-y-2">
              {logoUsageGuidelines.map((g, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-text-dark/70">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  {g}
                </div>
              ))}
            </div>
          </Card>
        )}

        {logoDonts.length > 0 && (
          <DontsList items={logoDonts} className="mb-4" />
        )}

        <AiContentBanner
          visible={dirtySection === "logo"}
          onSave={() => handleSaveSection("logo", editBuffer)}
          onDiscard={cancelEdit}
          saving={updateStyleguide.isPending}
        />
      </section>

      {/* ═══ COLORS SECTION ═══ */}
      <section id="section-colors" ref={registerRef("section-colors")} className="mb-10">
        <SectionHeader
          title="Colors"
          editing={editingSection === "colors"}
          onEdit={() => startEdit("colors")}
          onCancel={cancelEdit}
        />

        {Object.entries(colorsByCategory).map(([category, catColors]) => (
          <div key={category} className="mb-6">
            <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-3">
              {category}
            </p>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {catColors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedColor(c)}
                  className="rounded-lg overflow-hidden border border-border-dark hover:ring-2 hover:ring-primary/50 transition-all text-left"
                >
                  <div className="h-16" style={{ backgroundColor: c.hex }} />
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-text-dark">
                      {c.name}
                    </p>
                    <p className="text-xs text-text-dark/40 font-mono">
                      {c.hex}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {colorDonts.length > 0 && (
          <DontsList items={colorDonts} className="mb-4" />
        )}

        <AiContentBanner
          visible={dirtySection === "colors"}
          onSave={() => handleSaveSection("colors", editBuffer)}
          onDiscard={cancelEdit}
          saving={updateStyleguide.isPending}
        />
      </section>

      {/* ═══ TYPOGRAPHY SECTION ═══ */}
      <section id="section-typography" ref={registerRef("section-typography")} className="mb-10">
        <SectionHeader
          title="Typography"
          editing={editingSection === "typography"}
          onEdit={() => startEdit("typography")}
          onCancel={cancelEdit}
        />

        {/* Primary Font Display */}
        {styleguide.primaryFont && (
          <Card padding="lg" className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="default" size="sm">
                {styleguide.primaryFont}
              </Badge>
              <span className="text-xs text-text-dark/40">Primary Font</span>
            </div>
            <p
              className="text-2xl text-text-dark/60 mb-1 leading-relaxed"
              style={{ fontFamily: styleguide.primaryFont }}
            >
              ABCDEFGHIJKLMNOPQRSTUVWXYZ
            </p>
            <p
              className="text-2xl text-text-dark/60 mb-1 leading-relaxed"
              style={{ fontFamily: styleguide.primaryFont }}
            >
              abcdefghijklmnopqrstuvwxyz
            </p>
            <p
              className="text-2xl text-text-dark/60 leading-relaxed"
              style={{ fontFamily: styleguide.primaryFont }}
            >
              0123456789 !@#$%&amp;*()
            </p>
          </Card>
        )}

        {styleguide.secondaryFont && (
          <Card padding="lg" className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="default" size="sm">
                {styleguide.secondaryFont}
              </Badge>
              <span className="text-xs text-text-dark/40">Secondary Font</span>
            </div>
            <p
              className="text-2xl text-text-dark/60 mb-1 leading-relaxed"
              style={{ fontFamily: styleguide.secondaryFont }}
            >
              ABCDEFGHIJKLMNOPQRSTUVWXYZ
            </p>
            <p
              className="text-2xl text-text-dark/60 mb-1 leading-relaxed"
              style={{ fontFamily: styleguide.secondaryFont }}
            >
              abcdefghijklmnopqrstuvwxyz
            </p>
            <p
              className="text-2xl text-text-dark/60 leading-relaxed"
              style={{ fontFamily: styleguide.secondaryFont }}
            >
              0123456789
            </p>
          </Card>
        )}

        {/* Type Scale */}
        {typeScale.length > 0 && (
          <Card padding="lg" className="mb-4">
            <h3 className="text-sm font-semibold text-text-dark mb-4">
              Type Scale
            </h3>
            <div className="space-y-0">
              {typeScale.map((t) => (
                <div
                  key={t.level}
                  className="flex items-center gap-4 py-3 border-b border-border-dark last:border-0"
                >
                  <span className="text-xs font-mono text-text-dark/40 w-12">
                    {t.level}
                  </span>
                  <span className="text-xs text-text-dark/40 w-14">
                    {t.size}
                  </span>
                  <span className="text-xs text-text-dark/40 w-10">
                    {t.weight}
                  </span>
                  <span className="text-xs text-text-dark/40 w-10">
                    {t.lineHeight}
                  </span>
                  <span
                    className="text-text-dark flex-1"
                    style={{
                      fontSize: t.size,
                      fontWeight: Number(t.weight),
                      lineHeight: t.lineHeight,
                      fontFamily: styleguide.primaryFont || "Inter",
                    }}
                  >
                    {t.preview}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <AiContentBanner
          visible={dirtySection === "typography"}
          onSave={() => handleSaveSection("typography", editBuffer)}
          onDiscard={cancelEdit}
          saving={updateStyleguide.isPending}
        />
      </section>

      {/* ═══ TONE OF VOICE SECTION ═══ */}
      <section id="section-tone" ref={registerRef("section-tone")} className="mb-10">
        <SectionHeader
          title="Tone of Voice"
          editing={editingSection === "tone"}
          onEdit={() => startEdit("tone")}
          onCancel={cancelEdit}
        />

        {contentGuidelines.length > 0 && (
          <Card padding="lg" className="mb-4">
            <h3 className="text-sm font-semibold text-text-dark mb-3">
              Content Guidelines
            </h3>
            <div className="space-y-2">
              {contentGuidelines.map((g, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-text-dark/70">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  {g}
                </div>
              ))}
            </div>
          </Card>
        )}

        {writingGuidelines.length > 0 && (
          <Card padding="lg" className="mb-4">
            <h3 className="text-sm font-semibold text-text-dark mb-3">
              Writing Guidelines
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {writingGuidelines.map((g, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-text-dark/70">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  {g}
                </div>
              ))}
            </div>
          </Card>
        )}

        {examplePhrases.length > 0 && (
          <Card padding="lg" className="mb-4">
            <h3 className="text-sm font-semibold text-text-dark mb-4">
              Example Phrases
            </h3>
            <div className="space-y-3">
              {doExamples.map((ex, i) => (
                <div
                  key={`do-${i}`}
                  className="flex items-center gap-3 border-l-[3px] border-emerald-500 bg-emerald-500/5 px-4 py-2.5 rounded-r-md"
                >
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <p className="text-sm text-text-dark/70">
                    &ldquo;{ex.text}&rdquo;
                  </p>
                </div>
              ))}
              {dontExamples.map((ex, i) => (
                <div
                  key={`dont-${i}`}
                  className="flex items-center gap-3 border-l-[3px] border-red-500 bg-red-500/5 px-4 py-2.5 rounded-r-md"
                >
                  <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-text-dark/70">
                    &ldquo;{ex.text}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <AiContentBanner
          visible={dirtySection === "tone"}
          onSave={() => handleSaveSection("tone", editBuffer)}
          onDiscard={cancelEdit}
          saving={updateStyleguide.isPending}
        />
      </section>

      {/* ═══ IMAGERY SECTION ═══ */}
      <section id="section-imagery" ref={registerRef("section-imagery")} className="mb-10">
        <SectionHeader
          title="Imagery Guidelines"
          editing={editingSection === "imagery"}
          onEdit={() => startEdit("imagery")}
          onCancel={cancelEdit}
          extra={
            <Button variant="ghost" size="sm" leftIcon={<Upload className="w-3.5 h-3.5" />}>
              Upload
            </Button>
          }
        />

        {/* Photography Examples */}
        <h3 className="text-sm font-semibold text-text-dark mb-3">
          Photography Style
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border-dark overflow-hidden"
            >
              <div className="h-28 bg-surface-dark flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-text-dark/15" />
              </div>
              <div className="py-2 text-center">
                <p className="text-xs text-text-dark/40">Example {i}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {photographyGuidelines.length > 0 && (
            <Card padding="lg">
              <h3 className="text-sm font-semibold text-text-dark mb-3">
                Photography Guidelines
              </h3>
              <div className="space-y-2">
                {photographyGuidelines.map((g, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-text-dark/70">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {g}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {illustrationGuidelines.length > 0 && (
            <Card padding="lg">
              <h3 className="text-sm font-semibold text-text-dark mb-3">
                Illustration Guidelines
              </h3>
              <div className="space-y-2">
                {illustrationGuidelines.map((g, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-text-dark/70">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {g}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {imageryDonts.length > 0 && (
          <DontsList items={imageryDonts} className="mb-4" />
        )}

        <AiContentBanner
          visible={dirtySection === "imagery"}
          onSave={() => handleSaveSection("imagery", editBuffer)}
          onDiscard={cancelEdit}
          saving={updateStyleguide.isPending}
        />
      </section>

      {/* ─── Color Detail Modal ─── */}
      {selectedColor && (
        <ColorDetailModal
          color={selectedColor}
          onClose={() => setSelectedColor(null)}
          onCopy={handleCopy}
          copiedField={copiedField}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function SectionHeader({
  title,
  editing,
  onEdit,
  onCancel,
  extra,
}: {
  title: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-text-dark">{title}</h2>
      <div className="flex items-center gap-2">
        {extra}
        {editing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            leftIcon={<X className="w-3.5 h-3.5" />}
          >
            Cancel
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            leftIcon={<Pencil className="w-3.5 h-3.5" />}
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

function DontsList({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-text-dark mb-3">
        Don&apos;ts
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((d, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 min-w-[120px] rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center"
          >
            <X className="w-5 h-5 text-red-400" />
            <span className="text-xs text-red-300">{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiContentBanner({
  visible,
  onSave,
  onDiscard,
  saving,
}: {
  visible: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  if (!visible) {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <span className="text-sm text-emerald-300">
          This styleguide is used for AI content generation
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <span className="text-sm text-emerald-300">
          This styleguide is used for AI content generation
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onDiscard}>
          Discard
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={saving}
          leftIcon={saving ? undefined : <Save className="w-3.5 h-3.5" />}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function ColorDetailModal({
  color,
  onClose,
  onCopy,
  copiedField,
}: {
  color: StyleguideColorData;
  onClose: () => void;
  onCopy: (value: string, field: string) => void;
  copiedField: string | null;
}) {
  const [activeTab, setActiveTab] = useState<"info" | "notes" | "comments">(
    "info"
  );

  const textColor = getTextColor(color.hex);
  const contrastWhite = getContrastRatio(color.hex, "#ffffff");
  const contrastBlack = getContrastRatio(color.hex, "#000000");

  const colorFormats = [
    { label: "HEX", value: color.hex },
    { label: "RGB", value: color.rgb || "—" },
    { label: "HSL", value: color.hsl || "—" },
    { label: "CMYK", value: color.cmyk || "—" },
  ];

  const tags = (color.tags ?? []) as string[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-background-dark border border-border-dark rounded-xl max-w-2xl w-full mx-4 overflow-hidden flex"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left panel — color swatch */}
        <div
          className="w-[40%] p-6 flex flex-col justify-between min-h-[400px]"
          style={{ backgroundColor: color.hex }}
        >
          <p
            className="text-lg font-semibold"
            style={{ color: textColor }}
          >
            {color.name}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCopy(color.hex, "swatch")}
              className="p-1.5 rounded-md transition-colors"
              style={{
                color: textColor,
                backgroundColor: textColor + "15",
              }}
            >
              {copiedField === "swatch" ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-[60%] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-text-dark">
              Color Information
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded text-text-dark/30 hover:text-text-dark transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4 border-b border-border-dark">
            {(
              [
                { id: "info", label: "Information", icon: "ℹ️" },
                { id: "notes", label: "Notes", icon: "📝" },
                { id: "comments", label: "Comments", icon: "💬" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-text-dark"
                    : "border-transparent text-text-dark/40"
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "info" && (
            <>
              {/* Color formats */}
              <div className="space-y-0 mb-4">
                {colorFormats.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center justify-between py-2 border-b border-border-dark"
                  >
                    <span className="text-xs font-medium text-text-dark/40">
                      {f.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-text-dark">
                        {f.value}
                      </span>
                      {f.value !== "—" && (
                        <button
                          onClick={() => onCopy(f.value, f.label)}
                          className="p-1 rounded text-text-dark/30 hover:text-text-dark transition-colors"
                        >
                          {copiedField === f.label ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="default" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Accessibility */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide">
                  Accessibility
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-dark/60">
                      White contrast:
                    </span>
                    <Badge
                      variant={meetsWCAG(contrastWhite, "AA") ? "success" : "error"}
                      size="sm"
                    >
                      AA {meetsWCAG(contrastWhite, "AA") ? "✓" : "✗"}
                    </Badge>
                    <Badge
                      variant={meetsWCAG(contrastWhite, "AAA") ? "success" : "error"}
                      size="sm"
                    >
                      AAA {meetsWCAG(contrastWhite, "AAA") ? "✓" : "✗"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-dark/60">
                      Black contrast:
                    </span>
                    <Badge
                      variant={meetsWCAG(contrastBlack, "AA") ? "success" : "error"}
                      size="sm"
                    >
                      AA {meetsWCAG(contrastBlack, "AA") ? "✓" : "✗"}
                    </Badge>
                    <Badge
                      variant={meetsWCAG(contrastBlack, "AAA") ? "success" : "error"}
                      size="sm"
                    >
                      AAA {meetsWCAG(contrastBlack, "AAA") ? "✓" : "✗"}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-text-dark/30">
                  Ratio: {contrastWhite.toFixed(1)}:1 (white) ·{" "}
                  {contrastBlack.toFixed(1)}:1 (black)
                </p>
              </div>
            </>
          )}

          {activeTab === "notes" && (
            <div>
              <textarea
                className="w-full rounded-lg border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/30 focus:outline-none focus:ring-2 focus:ring-primary"
                rows={6}
                placeholder="Add usage notes for this color..."
                defaultValue={color.notes || ""}
              />
            </div>
          )}

          {activeTab === "comments" && (
            <p className="text-sm text-text-dark/40 py-6 text-center">
              Comments coming soon
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
