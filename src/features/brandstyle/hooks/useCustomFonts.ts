"use client";

import { useEffect } from "react";
import type { StyleguideFontData } from "../types/brandstyle.types";

/**
 * Injects `@font-face` rules for uploaded fonts into the document head so previews
 * and type samples can use the real brand font. DETECTED fonts without an uploaded
 * file are skipped — `TypographySection` should fall back to Google Fonts for those.
 *
 * The hook de-duplicates on fileUrl: multiple calls with the same URLs reuse the
 * existing <style> tag and only rewrite when the URL list changes.
 */
export function useCustomFonts(fonts: StyleguideFontData[] | undefined) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const uploaded = (fonts ?? []).filter(
      (f) => f.source === "UPLOADED" && f.fileUrl && f.fontFamily,
    );
    if (uploaded.length === 0) return;

    const styleId = "brandstyle-custom-fonts";
    let tag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement("style");
      tag.id = styleId;
      document.head.appendChild(tag);
    }

    const rules = uploaded
      .map((f) => {
        const format =
          f.fileType === "woff2" ? "woff2" :
          f.fileType === "woff" ? "woff" :
          f.fileType === "ttf" ? "truetype" :
          f.fileType === "otf" ? "opentype" :
          "truetype";
        const weight = f.weight?.trim() || "400";
        const style = f.style?.trim() || "normal";
        return `@font-face {
  font-family: "${escapeCss(f.fontFamily!)}";
  src: url("${escapeUrl(f.fileUrl!)}") format("${format}");
  font-weight: ${weight};
  font-style: ${style};
  font-display: swap;
}`;
      })
      .join("\n\n");

    tag.textContent = rules;

    // Do not remove the tag on unmount: font rules are global and we want them
    // to persist across tab switches within the styleguide.
  }, [fonts]);
}

function escapeCss(value: string): string {
  return value.replace(/["\\]/g, (c) => "\\" + c);
}

function escapeUrl(url: string): string {
  return url.replace(/["\s]/g, (c) => encodeURIComponent(c));
}
