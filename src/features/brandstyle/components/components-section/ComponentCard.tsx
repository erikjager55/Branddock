"use client";

import { useState } from "react";
import { Trash2, Copy, Check, Image as ImageIcon } from "lucide-react";
import type { StyleguideComponentData, ComponentTypeKey } from "../../types/brandstyle.types";
import { useDeleteComponent } from "../../hooks/useBrandstyleHooks";

interface ComponentCardProps {
  component: StyleguideComponentData;
  canEdit: boolean;
}

export function ComponentCard({ component, canEdit }: ComponentCardProps) {
  const deleteMut = useDeleteComponent();
  const styles = component.extractedStyles ?? {};
  const [copied, setCopied] = useState<"css" | "tailwind" | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const handleDelete = () => {
    if (window.confirm(`Remove "${component.label}"?`)) {
      deleteMut.mutate(component.id);
    }
  };

  const copy = async (text: string, kind: "css" | "tailwind") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard API denied — silently no-op (browser shows own warning)
    }
  };

  const cssSnippet = buildCssSnippet(styles);
  const tailwindSnippet = buildTailwindSnippet(styles);
  // Vision-enricher labels often embed the real button copy between
  // quotes (e.g. `Primary Button — "Neem contact op"`). Extract that so
  // the live preview shows the actual CTA text rather than "Button".
  const sampleText = extractSampleText(component.label);

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white" data-testid={`component-card-${component.id}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{component.label}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {typeof component.confidence === "number"
              ? `${Math.round(component.confidence * 100)}% confidence`
              : "—"}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMut.isPending}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
            aria-label="Remove component"
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Live HTML preview rendered from the extracted tokens — the
          tokens are the source of truth, so what renders here is
          exactly what the tokens describe. Screenshots are kept as
          optional "original" reference, not the primary display. */}
      <ComponentPreview
        type={component.type}
        label={component.label}
        styles={styles}
        sampleText={sampleText}
      />

      {/* Copy snippets */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => copy(cssSnippet, "css")}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-colors"
          title="Copy CSS"
        >
          {copied === "css" ? (
            <>
              <Check className="h-3 w-3 text-emerald-600" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> CSS
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => copy(tailwindSnippet, "tailwind")}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-colors"
          title="Copy best-effort Tailwind classes"
        >
          {copied === "tailwind" ? (
            <>
              <Check className="h-3 w-3 text-emerald-600" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Tailwind
            </>
          )}
        </button>
        {component.screenshotUrl && (
          <button
            type="button"
            onClick={() => setShowOriginal((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-colors ml-auto"
            title="Show the original Playwright screenshot for reference"
          >
            <ImageIcon className="h-3 w-3" />
            {showOriginal ? "Hide original" : "Original"}
          </button>
        )}
      </div>

      {/* Original screenshot reference (collapsed by default) */}
      {showOriginal && component.screenshotUrl && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">
            Original on source site
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={component.screenshotUrl}
            alt={component.label}
            className="max-w-full max-h-[120px] object-contain"
          />
        </div>
      )}

      {/* Tokens */}
      <dl className="mt-3 space-y-1 text-[11px]">
        {Object.entries(styles).map(([key, value]) =>
          value ? (
            <div key={key} className="flex items-start gap-2">
              <dt className="text-gray-500 font-medium min-w-[100px] flex-shrink-0">{key}</dt>
              <dd className="text-gray-700 font-mono break-all">{String(value)}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </div>
  );
}

// ─── Live preview ─────────────────────────────────────────────

function ComponentPreview({
  type,
  label,
  styles,
  sampleText,
}: {
  type: ComponentTypeKey;
  label: string;
  styles: Record<string, string | undefined>;
  sampleText: string | null;
}) {
  // The extractor groups <input>, <textarea>, and <select> all under
  // FORM_INPUT. Infer the real sub-type from the Vision-refined label so
  // "Multi-line textarea" actually renders as a textarea instead of a
  // single-line input.
  const labelLower = label.toLowerCase();
  const isTextarea = /textarea|multi-line|multiline|message|paragraph/.test(labelLower);
  const isSelect = /select|dropdown|combobox/.test(labelLower);
  const style: React.CSSProperties = {
    background: styles.background,
    color: styles.color,
    border: styles.border,
    borderRadius: styles.borderRadius,
    padding: styles.padding,
    fontSize: styles.fontSize,
    fontWeight: styles.fontWeight as React.CSSProperties["fontWeight"],
    boxShadow: styles.boxShadow,
    textTransform: styles.textTransform as React.CSSProperties["textTransform"],
    display: "inline-block",
  };

  const containerClass =
    "p-4 bg-gray-50 border border-gray-100 rounded flex items-center justify-center min-h-[80px]";

  switch (type) {
    case "BUTTON":
      return (
        <div className={containerClass}>
          <button type="button" style={style} className="cursor-default">
            {sampleText ?? "Button"}
          </button>
        </div>
      );
    case "FORM_INPUT":
      if (isTextarea) {
        return (
          <div className={containerClass}>
            <textarea
              placeholder={sampleText ?? "Your message…"}
              readOnly
              rows={4}
              style={{ ...style, display: "inline-block", width: "240px", resize: "none" }}
            />
          </div>
        );
      }
      if (isSelect) {
        return (
          <div className={containerClass}>
            <select
              disabled
              defaultValue=""
              style={{ ...style, display: "inline-block", width: "220px" }}
            >
              <option value="" disabled>
                {sampleText ?? "Select an option"}
              </option>
            </select>
          </div>
        );
      }
      return (
        <div className={containerClass}>
          <input
            type="text"
            placeholder={sampleText ?? "Sample input"}
            readOnly
            style={{ ...style, display: "inline-block", width: "220px" }}
          />
        </div>
      );
    case "STATUS_CHIP":
      return (
        <div className={containerClass}>
          <span style={{ ...style, fontSize: styles.fontSize ?? "11px" }}>
            {sampleText ?? "Status"}
          </span>
        </div>
      );
    case "QUOTE_BLOCK":
      return (
        <div className={containerClass}>
          <blockquote
            style={{
              ...style,
              display: "block",
              maxWidth: "280px",
              fontStyle: "italic",
              textAlign: "left",
            }}
          >
            &quot;{sampleText ?? "A memorable customer quote that fits the brand voice."}&quot;
          </blockquote>
        </div>
      );
    case "FEATURE_ICON":
      return (
        <div className={containerClass}>
          <div
            style={{
              ...style,
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ★
          </div>
        </div>
      );
    case "TOP_NAVIGATION":
      return (
        <div className={containerClass + " w-full"}>
          <nav style={{ ...style, display: "flex", gap: "16px", alignItems: "center", width: "100%" }}>
            <span style={{ fontWeight: 600 }}>Brand</span>
            <span>Home</span>
            <span>About</span>
            <span>Contact</span>
          </nav>
        </div>
      );
    case "PRODUCT_CARD":
      return (
        <div className={containerClass}>
          <div
            style={{
              ...style,
              display: "block",
              width: 200,
              padding: styles.padding ?? "16px",
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {sampleText ?? "Product name"}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.7 }}>€ 39,00</div>
          </div>
        </div>
      );
    default:
      return <div className={containerClass}>—</div>;
  }
}

// ─── Label parsing + snippet builders ────────────────────────

/** Extract the CTA copy embedded in a Vision-refined label like:
 *     "Primary Button — "Neem contact op""
 *     'Primary emerald CTA — "Get Started"'
 *     'Status chip — "New"'
 *  Returns the quoted segment, or null if the label is a plain type name. */
function extractSampleText(label: string): string | null {
  if (!label) return null;
  // Match "…" or '…' or “…” (smart quotes)
  const match = label.match(/["'\u201c\u2018]([^"'\u201d\u2019]{1,60})["'\u201d\u2019]/);
  if (match && match[1]) {
    const text = match[1].trim();
    if (text.length > 0) return text;
  }
  return null;
}

function buildCssSnippet(styles: Record<string, string | undefined>): string {
  const lines: string[] = [];
  const emit = (cssName: string, value: string | undefined) => {
    if (value && value !== "none" && value !== "normal") {
      lines.push(`  ${cssName}: ${value};`);
    }
  };
  emit("background", styles.background);
  emit("color", styles.color);
  emit("border", styles.border);
  emit("border-radius", styles.borderRadius);
  emit("padding", styles.padding);
  emit("font-size", styles.fontSize);
  emit("font-weight", styles.fontWeight);
  emit("box-shadow", styles.boxShadow);
  emit("text-transform", styles.textTransform);
  if (styles.display) emit("display", styles.display);
  return `.brand-component {\n${lines.join("\n") || "  /* no tokens extracted */"}\n}`;
}

/** Map common extracted token values to the closest Tailwind utility.
 *  Best-effort — arbitrary values get the `[value]` escape hatch. */
function buildTailwindSnippet(styles: Record<string, string | undefined>): string {
  const classes: string[] = [];
  if (styles.background) {
    const hex = styles.background.match(/#([0-9a-f]{3,8})/i);
    if (hex) classes.push(`bg-[${hex[0]}]`);
    else classes.push(`bg-[${styles.background.replace(/\s+/g, "_")}]`);
  }
  if (styles.color) {
    const hex = styles.color.match(/#([0-9a-f]{3,8})/i);
    if (hex) classes.push(`text-[${hex[0]}]`);
  }
  if (styles.borderRadius) {
    const px = pxFromCss(styles.borderRadius);
    if (px === 0) classes.push("rounded-none");
    else if (px != null && px <= 4) classes.push("rounded-sm");
    else if (px != null && px <= 6) classes.push("rounded");
    else if (px != null && px <= 8) classes.push("rounded-md");
    else if (px != null && px <= 12) classes.push("rounded-lg");
    else if (px != null && px <= 16) classes.push("rounded-xl");
    else if (px != null && px <= 24) classes.push("rounded-2xl");
    else if (px != null) classes.push(`rounded-[${styles.borderRadius.trim()}]`);
  }
  if (styles.padding) {
    classes.push(`p-[${styles.padding.replace(/\s+/g, "_")}]`);
  }
  if (styles.fontSize) {
    classes.push(`text-[${styles.fontSize}]`);
  }
  if (styles.fontWeight) {
    const w = parseInt(styles.fontWeight, 10);
    if (!Number.isNaN(w)) {
      if (w <= 300) classes.push("font-light");
      else if (w <= 400) classes.push("font-normal");
      else if (w <= 500) classes.push("font-medium");
      else if (w <= 600) classes.push("font-semibold");
      else if (w <= 700) classes.push("font-bold");
      else classes.push("font-extrabold");
    }
  }
  if (styles.boxShadow && styles.boxShadow !== "none") {
    classes.push("shadow");
  }
  return classes.join(" ") || "/* no tokens extracted */";
}

function pxFromCss(value: string): number | null {
  const m = value.match(/([0-9]*\.?[0-9]+)\s*px/);
  if (!m) return null;
  return parseFloat(m[1]);
}
