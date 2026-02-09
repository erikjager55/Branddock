"use client";

import { useState } from "react";
import {
  Download,
  Copy,
  Check,
  X,
  Image as ImageIcon,
  Sparkles,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";

// ── Data ──

const SECTIONS = [
  { label: "Logo", value: "logo" },
  { label: "Colors", value: "colors" },
  { label: "Typography", value: "typography" },
  { label: "Tone of Voice", value: "tone" },
  { label: "Imagery", value: "imagery" },
];

const LOGO_VARIANTS = [
  { name: "Primary Logo", desc: "Full color logo for light backgrounds" },
  { name: "Icon Mark", desc: "Standalone icon for small spaces" },
  { name: "Scale Only", desc: "Wordmark without icon" },
];

const LOGO_DONTS = [
  "Don't stretch or distort the logo",
  "Don't change the logo colors",
  "Don't add effects like shadows or gradients",
  "Don't rotate or flip the logo",
  "Don't place on busy backgrounds without contrast",
];

const LOGO_GUIDELINES = [
  "Minimum clear space equal to the height of the 'B'",
  "Use primary green logo on light backgrounds",
  "Use white logo on dark or colored backgrounds",
  "Minimum size: 24px height for digital, 10mm for print",
];

const COLORS = [
  { name: "Primary Green", hex: "#10B981", rgb: "16, 185, 129", hsl: "160, 84%, 39%", cmyk: "91, 0, 30, 27", tags: ["Primary", "CTA", "Success"], wcagAA: true, wcagAAA: false },
  { name: "Dark Slate", hex: "#1F2937", rgb: "31, 41, 55", hsl: "215, 28%, 17%", cmyk: "44, 25, 0, 78", tags: ["Text", "Background"], wcagAA: true, wcagAAA: true },
  { name: "Electric Blue", hex: "#5252E3", rgb: "82, 82, 227", hsl: "240, 72%, 61%", cmyk: "64, 64, 0, 11", tags: ["Secondary", "Links"], wcagAA: true, wcagAAA: false },
  { name: "Peach Pink", hex: "#FECFBD", rgb: "254, 207, 189", hsl: "17, 98%, 87%", cmyk: "0, 18, 26, 0", tags: ["Accent", "Highlight"], wcagAA: false, wcagAAA: false },
  { name: "Orange Red", hex: "#FF6B48", rgb: "255, 107, 72", hsl: "11, 100%, 64%", cmyk: "0, 58, 72, 0", tags: ["Destructive", "Warning"], wcagAA: true, wcagAAA: false },
  { name: "Lime Yellow", hex: "#F9FD48", rgb: "249, 253, 72", hsl: "61, 98%, 64%", cmyk: "2, 0, 72, 1", tags: ["Highlight", "Promo"], wcagAA: false, wcagAAA: false },
];

const COLOR_DONTS = [
  "Don't use primary green on green backgrounds",
  "Don't mix more than 3 brand colors in one layout",
  "Don't use low-contrast color combinations for text",
  "Don't alter the opacity of brand colors below 60%",
  "Don't create new color variations without approval",
];

const TYPE_SCALE = [
  { name: "H1", size: "36px", weight: "700", preview: "Heading One" },
  { name: "H2", size: "30px", weight: "600", preview: "Heading Two" },
  { name: "H3", size: "24px", weight: "600", preview: "Heading Three" },
  { name: "H4", size: "20px", weight: "600", preview: "Heading Four" },
  { name: "Body", size: "16px", weight: "400", preview: "Body text for paragraphs" },
  { name: "Small", size: "14px", weight: "400", preview: "Small text and captions" },
];

const CONTENT_GUIDELINES = [
  "Be clear and concise — avoid jargon unless speaking to technical audiences",
  "Lead with benefits, not features",
  "Use active voice over passive voice",
  "Address the reader directly with 'you' and 'your'",
];

const WRITING_GUIDELINES = [
  "Sentence case for headings (not Title Case)",
  "Oxford comma in lists",
  "Numbers: spell out one through nine, use numerals for 10+",
  "Em dashes — no spaces around them",
];

const TONE_DOS = [
  { do: "We help you build a brand that resonates.", dont: "Our platform leverages AI synergies for brand optimization." },
  { do: "Get started in minutes with our guided setup.", dont: "Utilize our onboarding paradigm for rapid deployment." },
  { do: "Your brand consistency improved by 40%.", dont: "Brand metric enhancement facilitated via algorithmic processes." },
];

const PHOTO_GUIDELINES = [
  "Use authentic, natural photography over stock photos",
  "Ensure diverse representation in all imagery",
  "Maintain consistent lighting and color grading",
  "Prefer candid shots over posed compositions",
];

const ILLUSTRATION_GUIDELINES = [
  "Use flat, minimal illustration style",
  "Primary green as the dominant illustration color",
  "Consistent line weight of 2px across all icons",
  "Rounded corners on all geometric shapes",
];

const IMAGERY_DONTS = [
  "Don't use heavily filtered or overly saturated photos",
  "Don't use clip art or low-resolution images",
  "Don't combine photography with illustration in the same context",
  "Don't use images that conflict with brand values",
  "Don't crop faces or important elements awkwardly",
];

// ── Component ──

export default function BrandStyleguidePage() {
  const [activeSection, setActiveSection] = useState("logo");
  const [selectedColor, setSelectedColor] = useState<typeof COLORS[0] | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const scrollTo = (section: string) => {
    setActiveSection(section);
    document.getElementById(`section-${section}`)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-dark">Brand Styleguide</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-3 h-3 text-primary" />
              </div>
              <span className="text-xs text-text-dark/40">Created by Erik Jager</span>
              <span className="text-xs text-text-dark/20">|</span>
              <span className="text-xs text-text-dark/40">Updated Feb 5, 2026</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">Analyze Next</Button>
          <Button variant="secondary" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>Export PDF</Button>
        </div>
      </div>

      {/* Jump-Link Tabs */}
      <Tabs
        tabs={SECTIONS}
        activeTab={activeSection}
        onChange={scrollTo}
        variant="underline"
        className="mb-8"
      />

      {/* === LOGO === */}
      <section id="section-logo" className="mb-10">
        <h2 className="text-lg font-semibold text-text-dark mb-4">Logo</h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {LOGO_VARIANTS.map((v) => (
            <Card key={v.name} padding="lg" className="text-center">
              <div className="aspect-[3/2] rounded-md bg-background-dark border border-border-dark flex items-center justify-center mb-3">
                <ImageIcon className="w-10 h-10 text-text-dark/15" />
              </div>
              <p className="text-sm font-medium text-text-dark">{v.name}</p>
              <p className="text-xs text-text-dark/40">{v.desc}</p>
            </Card>
          ))}
        </div>

        <Card padding="lg" className="mb-4">
          <h3 className="text-sm font-semibold text-text-dark mb-3">Usage Guidelines</h3>
          <div className="space-y-2">
            {LOGO_GUIDELINES.map((g) => (
              <div key={g} className="flex items-start gap-2 text-sm text-text-dark/70">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {g}
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="mb-4">
          <h3 className="text-sm font-semibold text-text-dark mb-3">Don&apos;ts</h3>
          <div className="space-y-2">
            {LOGO_DONTS.map((d) => (
              <div key={d} className="flex items-start gap-2 text-sm text-text-dark/70">
                <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                {d}
              </div>
            ))}
          </div>
        </Card>

        <AiBanner />
      </section>

      {/* === COLORS === */}
      <section id="section-colors" className="mb-10">
        <h2 className="text-lg font-semibold text-text-dark mb-4">Colors</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {COLORS.map((c) => (
            <Card
              key={c.hex}
              padding="none"
              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => setSelectedColor(c)}
            >
              <div className="h-20" style={{ backgroundColor: c.hex }} />
              <div className="p-3">
                <p className="text-xs font-semibold text-text-dark">{c.name}</p>
                <p className="text-xs text-text-dark/40 font-mono">{c.hex}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card padding="lg" className="mb-4">
          <h3 className="text-sm font-semibold text-text-dark mb-3">Don&apos;ts</h3>
          <div className="space-y-2">
            {COLOR_DONTS.map((d) => (
              <div key={d} className="flex items-start gap-2 text-sm text-text-dark/70">
                <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                {d}
              </div>
            ))}
          </div>
        </Card>

        <AiBanner />
      </section>

      {/* === TYPOGRAPHY === */}
      <section id="section-typography" className="mb-10">
        <h2 className="text-lg font-semibold text-text-dark mb-4">Typography</h2>

        <Card padding="lg" className="mb-6">
          <h3 className="text-sm font-semibold text-text-dark mb-2">Inter — Primary Font</h3>
          <p className="text-sm text-text-dark/40 mb-4">Used for all headings, body, and UI text</p>
          <p className="text-2xl text-text-dark/60 mb-1" style={{ fontFamily: "Inter" }}>
            ABCDEFGHIJKLMNOPQRSTUVWXYZ
          </p>
          <p className="text-2xl text-text-dark/60 mb-1" style={{ fontFamily: "Inter" }}>
            abcdefghijklmnopqrstuvwxyz
          </p>
          <p className="text-2xl text-text-dark/60" style={{ fontFamily: "Inter" }}>
            0123456789 !@#$%&amp;*()
          </p>
        </Card>

        <Card padding="lg" className="mb-4">
          <h3 className="text-sm font-semibold text-text-dark mb-4">Type Scale</h3>
          <div className="space-y-0">
            {TYPE_SCALE.map((t) => (
              <div key={t.name} className="flex items-center gap-4 py-3 border-b border-border-dark last:border-0">
                <span className="text-xs font-mono text-text-dark/40 w-12">{t.name}</span>
                <span className="text-xs text-text-dark/40 w-14">{t.size}</span>
                <span className="text-xs text-text-dark/40 w-10">{t.weight}</span>
                <span className="text-text-dark flex-1" style={{ fontSize: t.size, fontWeight: Number(t.weight) }}>
                  {t.preview}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <AiBanner />
      </section>

      {/* === TONE OF VOICE === */}
      <section id="section-tone" className="mb-10">
        <h2 className="text-lg font-semibold text-text-dark mb-4">Tone of Voice</h2>

        <Card padding="lg" className="mb-4">
          <h3 className="text-sm font-semibold text-text-dark mb-3">Content Guidelines</h3>
          <div className="space-y-2">
            {CONTENT_GUIDELINES.map((g) => (
              <div key={g} className="flex items-start gap-2 text-sm text-text-dark/70">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {g}
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="mb-4">
          <h3 className="text-sm font-semibold text-text-dark mb-3">Writing Guidelines</h3>
          <div className="space-y-2">
            {WRITING_GUIDELINES.map((g) => (
              <div key={g} className="flex items-start gap-2 text-sm text-text-dark/70">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {g}
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="mb-4">
          <h3 className="text-sm font-semibold text-text-dark mb-4">Do / Don&apos;t Examples</h3>
          <div className="space-y-4">
            {TONE_DOS.map((ex, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-300">Do</span>
                  </div>
                  <p className="text-sm text-text-dark/70">{ex.do}</p>
                </div>
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <X className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs font-medium text-red-300">Don&apos;t</span>
                  </div>
                  <p className="text-sm text-text-dark/70">{ex.dont}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <AiBanner />
      </section>

      {/* === IMAGERY === */}
      <section id="section-imagery" className="mb-10">
        <h2 className="text-lg font-semibold text-text-dark mb-4">Imagery</h2>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-text-dark/15" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-text-dark mb-3">Photography Guidelines</h3>
            <div className="space-y-2">
              {PHOTO_GUIDELINES.map((g) => (
                <div key={g} className="flex items-start gap-2 text-sm text-text-dark/70">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  {g}
                </div>
              ))}
            </div>
          </Card>
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-text-dark mb-3">Illustration Guidelines</h3>
            <div className="space-y-2">
              {ILLUSTRATION_GUIDELINES.map((g) => (
                <div key={g} className="flex items-start gap-2 text-sm text-text-dark/70">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  {g}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card padding="lg" className="mb-4">
          <h3 className="text-sm font-semibold text-text-dark mb-3">Don&apos;ts</h3>
          <div className="space-y-2">
            {IMAGERY_DONTS.map((d) => (
              <div key={d} className="flex items-start gap-2 text-sm text-text-dark/70">
                <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                {d}
              </div>
            ))}
          </div>
        </Card>

        <AiBanner />
      </section>

      {/* Color Detail Modal */}
      <Modal
        open={!!selectedColor}
        onClose={() => setSelectedColor(null)}
        title={selectedColor?.name ?? ""}
        size="lg"
      >
        {selectedColor && (
          <div>
            <div className="h-32 rounded-lg mb-4" style={{ backgroundColor: selectedColor.hex }} />
            <div className="space-y-3 mb-4">
              {[
                { label: "HEX", value: selectedColor.hex },
                { label: "RGB", value: selectedColor.rgb },
                { label: "HSL", value: selectedColor.hsl },
                { label: "CMYK", value: selectedColor.cmyk },
              ].map((field) => (
                <div key={field.label} className="flex items-center justify-between py-2 border-b border-border-dark">
                  <span className="text-xs font-medium text-text-dark/40">{field.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-text-dark">{field.value}</span>
                    <button
                      onClick={() => handleCopy(field.value, field.label)}
                      className="p-1 rounded text-text-dark/30 hover:text-text-dark transition-colors"
                    >
                      {copiedField === field.label ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {selectedColor.tags.map((tag) => (
                <Badge key={tag} variant="default" size="sm">{tag}</Badge>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-dark/40">WCAG AA</span>
                {selectedColor.wcagAA ? (
                  <Badge variant="success" size="sm">Pass</Badge>
                ) : (
                  <Badge variant="error" size="sm">Fail</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-dark/40">WCAG AAA</span>
                {selectedColor.wcagAAA ? (
                  <Badge variant="success" size="sm">Pass</Badge>
                ) : (
                  <Badge variant="error" size="sm">Fail</Badge>
                )}
              </div>
            </div>

            <Tabs
              tabs={[
                { label: "Info", value: "info" },
                { label: "Notes", value: "notes" },
                { label: "Comments", value: "comments" },
              ]}
              activeTab="info"
              onChange={() => {}}
              variant="underline"
              className="mt-4 mb-3"
            />
            <p className="text-sm text-text-dark/50">
              {selectedColor.name} is used as a {selectedColor.tags[0]?.toLowerCase()} color throughout the brand. Apply it consistently across all digital and print materials.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── AI Banner sub-component ──

function AiBanner() {
  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <span className="text-sm text-emerald-300">This styleguide is used for AI content generation</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">Discard</Button>
        <Button variant="primary" size="sm">Save Changes</Button>
      </div>
    </div>
  );
}
