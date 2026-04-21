// =============================================================
// Component Screenshotter — Fase 5 / Sprint 4
//
// For each of the 7 component types, finds matching elements on a
// rendered page via Playwright, captures their **computed** styles
// (source of truth — what the user actually sees) and takes a PNG
// screenshot of each element. Uploads the screenshots via the
// storage provider and returns a list of DetectedComponent records
// with `screenshotUrl` populated.
//
// This is significantly more accurate than the static DOM-based
// extractor in component-extractor.ts because:
//   1. Computed styles resolve CSS variables, media queries, and
//      cascade — no need to re-implement the browser's CSS engine.
//   2. Actual rendered screenshots capture states the static extractor
//      can't (hover/focus not covered, but base state yes).
//   3. Works for Tailwind / CSS-in-JS / runtime-styled components.
//
// Gated by env var `BRANDSTYLE_COMPONENT_SCREENSHOTS=1`. Requires
// Playwright chromium binary. Budget per scan: ~35 screenshots
// (7 types × max 5 each), ~20KB PNG each, ~700KB total storage.
// =============================================================

import type {
  DetectedComponent,
  ComponentType,
  ExtractedComponentStyles,
} from "./component-extractor";
import { getStorageProvider } from "@/lib/storage";

export function isComponentScreenshotsEnabled(): boolean {
  return process.env.BRANDSTYLE_COMPONENT_SCREENSHOTS === "1";
}

/** Component + its raw screenshot buffer. The buffer stays in-memory so
 *  the Vision enricher can batch-send to Claude without re-downloading. */
export interface ScreenshotedComponent extends DetectedComponent {
  screenshotBuffer: Buffer;
}

/** Max elements per type to screenshot. Keeps total storage + time bounded. */
const MAX_PER_TYPE = 6;
/** Global maximum wall-clock budget for all screenshots combined.
 *  Raised to 180s for multi-page flow — each page takes ~10-20s of
 *  Playwright time (nav + eval + screenshots + upload). */
const TIMEOUT_MS = 180_000;

interface TypeMatcher {
  type: ComponentType;
  selectors: string[];
  /** Build a display label from class names + optional visible text content.
   *  Text is only captured for BUTTON / STATUS_CHIP (see candidate collector). */
  labelFn: (classes: string[], text?: string) => string;
}

// Mirrors the 7 matchers from component-extractor.ts — kept here to avoid
// cross-importing private matcher state and because label heuristics can
// diverge (computed styles tell us more than class names alone).
const TYPE_MATCHERS: TypeMatcher[] = [
  {
    type: "BUTTON",
    // Selectors ordered most-specific → least-specific. shadcn/ui, Radix,
    // and HeadlessUI primitives expose data-slot attributes that are far
    // more reliable than class-name heuristics. We also accept `a` tags
    // with button-like classes since many sites render CTAs as links.
    selectors: [
      "button",
      "[role=button]",
      "[data-slot=button]",
      "[data-radix-collection-item][role=button]",
      "a.btn",
      "a.button",
      "a[class*=button]",
      "a[class*=btn]",
      "a[class*=Button]",
      "[class*=btn-]",
      "input[type=submit]",
      "input[type=button]",
      // Heuristic catch-all: pure-Tailwind / utility-styled anchors don't
      // carry any "button"/"btn" keyword in their class names (Napking's
      // "Neem contact op" is just `<a class="px-4 py-3 rounded-xl bg-primary
      // text-white">`). Including `a[href]` here lets the scoring pass
      // recognise these by their visual properties (solid bg + padding +
      // rounded + reasonable button size) while filtering out plain
      // navigation links via the score threshold.
      "a[href]",
    ],
    labelFn: (classes, text) => {
      const cls = classes.join(" ").toLowerCase();
      let base = "Button";
      if (/primary|cta|main/.test(cls)) base = "Primary Button";
      else if (/secondary|ghost|outline/.test(cls)) base = "Secondary Button";
      else if (/danger|destructive/.test(cls)) base = "Danger Button";
      // Surface the CTA copy if it's short and distinctive. "Primary
      // Button" alone is useless when a page has 5 variants — "Primary
      // Button — Get Started" is immediately recognisable.
      if (text && text.length > 0 && text.length <= 30) {
        return `${base} — "${text}"`;
      }
      return base;
    },
  },
  {
    type: "FORM_INPUT",
    selectors: [
      "input[type=text]",
      "input[type=email]",
      "input[type=search]",
      "input[type=tel]",
      "input[type=number]",
      "input[type=url]",
      "input[type=password]",
      "textarea",
      "select",
      "[data-slot=input]",
      "[data-slot=textarea]",
      "[data-slot=select]",
    ],
    labelFn: (classes) => {
      const cls = classes.join(" ").toLowerCase();
      if (/search/.test(cls)) return "Search Input";
      return "Form Input";
    },
  },
  {
    type: "STATUS_CHIP",
    selectors: [
      ".badge",
      ".chip",
      ".tag",
      ".pill",
      "[class*=status-]",
      "[class*=badge-]",
      "[class*=Badge]",
      "[data-slot=badge]",
      "[data-radix-toast]",
    ],
    labelFn: (_classes, text) => {
      if (text && text.length > 0 && text.length <= 25) {
        return `Status Chip — "${text}"`;
      }
      return "Status Chip";
    },
  },
  {
    type: "PRODUCT_CARD",
    selectors: [
      ".card",
      "article.product",
      "[class*=product-card]",
      "[class*=item-card]",
      "[data-slot=card]",
    ],
    labelFn: () => "Card",
  },
  {
    type: "FEATURE_ICON",
    selectors: ["svg[class*=icon]", ".icon", "[class*=feature-icon]"],
    labelFn: () => "Feature Icon",
  },
  {
    type: "TOP_NAVIGATION",
    selectors: ["header nav", "nav", "[role=navigation]"],
    labelFn: () => "Top Navigation",
  },
  {
    type: "QUOTE_BLOCK",
    selectors: ["blockquote", "[class*=quote]", "[class*=testimonial]"],
    labelFn: () => "Quote Block",
  },
];

/** Style properties we read via getComputedStyle inside the browser. */
const READ_PROPS = [
  "background-color",
  "color",
  "border",
  "border-radius",
  "padding",
  "font-size",
  "font-weight",
  "box-shadow",
  "text-transform",
  "display",
] as const;

export interface ScreenshotExtraction {
  type: ComponentType;
  label: string;
  classes: string[];
  extractedStyles: Record<string, string>;
  screenshotUrl: string;
  confidence: number;
}

/**
 * Open the URL in headless Chromium, find components per type, capture
 * computed styles + element screenshots. Uploads screenshots via the
 * storage provider and returns enriched DetectedComponent records.
 *
 * Runs the browser session once, not per-type — cold launch ~1-2s so
 * re-launching per matcher would be expensive.
 */
export async function extractComponentsWithScreenshots(
  url: string,
  workspaceId: string,
): Promise<ScreenshotedComponent[]> {
  return extractComponentsFromPages([url], workspaceId);
}

/**
 * Sprint 6D: multi-page variant. Launches chromium ONCE and reuses
 * the same tab to visit each URL in order. Components are collected
 * across all pages and merged via a shared cross-page dedup set
 * (same size-bucket+bg hash) so the same Primary CTA captured on
 * both the homepage and the contact page only shows up once.
 *
 * Per-type MAX_PER_TYPE still applies to the final merged list —
 * a site with many buttons won't flood the output just because we
 * visit more pages.
 */
export async function extractComponentsFromPages(
  urls: string[],
  workspaceId: string,
): Promise<ScreenshotedComponent[]> {
  if (urls.length === 0) return [];
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (err) {
    throw new Error(
      `Component screenshots unavailable: playwright not installed (${err instanceof Error ? err.message : String(err)})`,
    );
  }

  const deadline = Date.now() + TIMEOUT_MS;
  const storage = getStorageProvider();
  const browser = await chromium.launch({ headless: true });

  // Cross-page dedup: seen hashes per type. A primary CTA rendered
  // with the same size+bg on multiple pages collapses to one entry.
  const crossPageSeen = new Map<ComponentType, Set<string>>();
  for (const m of TYPE_MATCHERS) crossPageSeen.set(m.type, new Set());
  // Index from `${type}|${sizeHash}` → position in `out` so cross-page
  // duplicates can boost the original entry's confidence.
  const typeHashToIdx = new Map<string, number>();

  try {
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();

    const out: ScreenshotedComponent[] = [];

    for (const pageUrl of urls) {
      if (Date.now() > deadline) {
        console.warn("[component-screenshotter] Time budget exhausted before visiting all pages");
        break;
      }
      try {
        await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 30_000 });
      } catch (gotoErr) {
        console.warn(
          `[component-screenshotter] Failed to load ${pageUrl}: ${gotoErr instanceof Error ? gotoErr.message : String(gotoErr)}`,
        );
        continue;
      }

    for (const matcher of TYPE_MATCHERS) {
      if (Date.now() > deadline) {
        console.warn("[component-screenshotter] Time budget exhausted, stopping early");
        break;
      }

      // Collect candidates across ALL selectors (no early exit), then rank
      // by quality score and take the top MAX_PER_TYPE.
      //
      // Old bug: per-selector loop bailed at picks.length >= MAX, which
      // meant generic `button` (matches hamburger/search toggles on any
      // site) filled all 5 slots before Elementor/shadcn-style selectors
      // (`a[class*=button]`, `[data-slot=button]`) ever ran. Real CTAs
      // with meaningful text were never reached.
      //
      // New flow:
      //   1. Iterate every selector, collect up to HARD_CAP candidates.
      //   2. Per candidate: rect + styles + text + size-bucket/bg hash.
      //   3. Score each on brand-relevance signals (see scoreCandidate).
      //   4. Dedup by size-bucket+bg (variant identity).
      //   5. Sort by score desc, return top args.max.
      const candidates = await page.evaluate(
        (args: { selectors: string[]; readProps: string[]; max: number; type: string }) => {
          const HARD_CAP = 80; // raw candidates before scoring/dedup

          interface Raw {
            el: Element;
            classes: string[];
            styles: Record<string, string>;
            rect: { width: number; height: number; top: number };
            text: string;
            tagName: string;
          }

          const raws: Raw[] = [];
          const elementSeen = new Set<Element>(); // dedup across selectors

          for (const sel of args.selectors) {
            if (raws.length >= HARD_CAP) break;
            let nodes: Element[];
            try {
              nodes = Array.from(document.querySelectorAll(sel));
            } catch {
              continue;
            }
            for (const el of nodes) {
              if (raws.length >= HARD_CAP) break;
              if (elementSeen.has(el)) continue;
              elementSeen.add(el);

              const cs = window.getComputedStyle(el);
              const styles: Record<string, string> = {};
              for (const prop of args.readProps) {
                const value = cs.getPropertyValue(prop).trim();
                if (value && value !== "none" && value !== "normal") {
                  styles[prop] = value;
                }
              }
              if (Object.keys(styles).length < 3) continue;

              const rect = el.getBoundingClientRect();
              if (rect.width < 10 || rect.height < 10) continue;

              const raw = (el.textContent ?? "").trim().replace(/\s+/g, " ");
              const text = raw.slice(0, 40);

              const classes = (el.getAttribute("class") ?? "")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 6);

              raws.push({
                el,
                classes,
                styles,
                rect: { width: rect.width, height: rect.height, top: rect.top },
                text,
                tagName: el.tagName.toLowerCase(),
              });
            }
          }

          // Score each candidate on how likely it is to be a real branded
          // component (not a utility toggle or hidden element).
          function scoreCandidate(r: Raw, type: string): number {
            let s = 0;
            const w = r.rect.width;
            const h = r.rect.height;
            const hasText = r.text.length > 0;
            const bg = (r.styles["background-color"] || "").replace(/\s+/g, "");
            const hasSolidBg =
              bg.length > 0 &&
              bg !== "transparent" &&
              !bg.endsWith(",0)") && // rgba(…,0) transparent
              !bg.endsWith(",0.0)");
            const hasBorder = !!(r.styles["border"] || r.styles["border-radius"]);
            const hasShadow = !!r.styles["box-shadow"];
            const hasPadding = !!r.styles["padding"];

            // Penalty: icon-only utility element (no text + tiny footprint).
            // These are almost always hamburger toggles, search icons,
            // social-share glyphs — not brand components.
            if (!hasText && w * h < 2500) s -= 3;

            if (type === "BUTTON") {
              // Hard gate: a button must render with either a solid
              // background OR a visible border/radius. A plain text anchor
              // inherits none of these and should not be classified as a
              // button, even if it sits in a nav. This eliminates all the
              // utility text links Napking-style sites ship.
              if (!hasSolidBg && !hasBorder) return -999;
              if (hasText) s += 3;
              if (w >= 80 && w <= 420 && h >= 32 && h <= 80) s += 2;
              if (hasSolidBg) s += 2;
              if (hasBorder) s += 1;
              if (hasPadding) s += 1;
              // Classes that strongly suggest CTA — Elementor, shadcn, etc.
              const cls = r.classes.join(" ").toLowerCase();
              if (/\bcta\b|\bprimary\b|\belementor-button\b|\bwp-block-button\b/.test(cls)) s += 2;
              // Penalty: excessively wide elements (full-width nav/hero wrap)
              if (w > 600) s -= 1;
            } else if (type === "STATUS_CHIP") {
              if (hasText) s += 3;
              if (w >= 40 && w <= 200 && h >= 20 && h <= 48) s += 2;
              if (hasSolidBg) s += 2;
              if (r.text.length <= 25) s += 1;
            } else if (type === "FORM_INPUT") {
              if (r.tagName === "input" || r.tagName === "textarea" || r.tagName === "select") s += 3;
              if (w >= 150 && h >= 32 && h <= 80) s += 2;
              if (hasBorder) s += 2;
            } else if (type === "PRODUCT_CARD") {
              if (w >= 200 && w <= 500 && h >= 200) s += 3;
              if (hasShadow) s += 2;
              if (hasBorder) s += 1;
              if (hasText && r.text.length >= 20) s += 1;
            } else if (type === "FEATURE_ICON") {
              if (r.tagName === "svg" || r.tagName === "i") s += 2;
              if (w >= 16 && w <= 80 && h >= 16 && h <= 80) s += 3;
              // Don't penalise tiny-no-text for icons — that's expected.
              // Revert the earlier penalty.
              if (!hasText && w * h < 2500) s += 3;
            } else if (type === "TOP_NAVIGATION") {
              if (w >= 800) s += 3;
              if (r.rect.top < 200) s += 2;
              if (hasText) s += 1;
            } else if (type === "QUOTE_BLOCK") {
              if (r.tagName === "blockquote") s += 3;
              if (hasText && r.text.length >= 20) s += 2;
            }

            // General quality: richer styles = more intentionally designed.
            s += Math.min(Object.keys(r.styles).length - 3, 3) * 0.5;
            return s;
          }

          const scored = raws.map((r) => ({
            raw: r,
            score: scoreCandidate(r, args.type),
          }));
          scored.sort((a, b) => b.score - a.score);

          // Dedup by size-bucket + bg AFTER scoring so the best variant
          // wins when two elements share a hash.
          const seen = new Set<string>();
          const finals: Raw[] = [];
          for (const { raw: r, score } of scored) {
            if (score <= 0) continue; // reject net-negative candidates
            const widthBucket = Math.round(r.rect.width / 20) * 20;
            const heightBucket = Math.round(r.rect.height / 10) * 10;
            const bg = (r.styles["background-color"] || "transparent").replace(/\s+/g, "");
            const hash = `${widthBucket}x${heightBucket}|${bg}`;
            if (seen.has(hash)) continue;
            seen.add(hash);
            finals.push(r);
            if (finals.length >= args.max) break;
          }

          // Tag surviving elements so the server can re-locate them for the screenshot.
          return finals.map((r, idx) => {
            const tag = `brandstyle-snap-${Math.random().toString(36).slice(2, 10)}-${idx}`;
            r.el.setAttribute("data-brandstyle-snap", tag);
            const widthBucket = Math.round(r.rect.width / 20) * 20;
            const heightBucket = Math.round(r.rect.height / 10) * 10;
            const bg = (r.styles["background-color"] || "transparent").replace(/\s+/g, "");
            return {
              classes: r.classes,
              styles: r.styles,
              text: r.text,
              tag,
              sizeHash: `${widthBucket}x${heightBucket}|${bg}`,
            };
          });
        },
        {
          selectors: matcher.selectors,
          readProps: [...READ_PROPS],
          max: MAX_PER_TYPE,
          type: matcher.type,
        },
      );

      // Re-find each tagged element and screenshot it.
      for (let i = 0; i < candidates.length; i++) {
        if (Date.now() > deadline) break;
        const cand = candidates[i];
        if (!cand.tag) continue;
        // Cross-page dedup: a Primary CTA captured on both the
        // homepage and the contact page has the same size+bg hash,
        // so we skip the second occurrence. We boost the first one's
        // confidence via typeHashToIdx so it reflects that it recurs
        // across multiple pages (strong brand signal).
        const seenSet = crossPageSeen.get(matcher.type)!;
        if (seenSet.has(cand.sizeHash)) {
          const existingIdx = typeHashToIdx.get(`${matcher.type}|${cand.sizeHash}`);
          if (existingIdx !== undefined && out[existingIdx]) {
            out[existingIdx].confidence = Math.min(out[existingIdx].confidence + 0.1, 1);
          }
          continue;
        }
        seenSet.add(cand.sizeHash);

        try {
          const locator = page.locator(`[data-brandstyle-snap="${cand.tag}"]`).first();
          const buffer = await locator.screenshot({ type: "png", timeout: 5000 });

          const fileName = `component-${matcher.type.toLowerCase()}-${Date.now()}-${i}.png`;
          const result = await storage.upload(buffer, {
            workspaceId,
            fileName,
            contentType: "image/png",
            generateThumbnail: false,
          });

          typeHashToIdx.set(`${matcher.type}|${cand.sizeHash}`, out.length);
          out.push({
            type: matcher.type,
            label: matcher.labelFn(cand.classes, cand.text),
            selector: matcher.selectors.join(", "),
            classes: cand.classes,
            extractedStyles: normaliseStyles(cand.styles),
            previewHtml: null,
            confidence: computeConfidence(cand.styles),
            screenshotUrl: result.url,
            screenshotBuffer: buffer,
          });
        } catch (err) {
          console.warn(
            `[component-screenshotter] Failed to capture ${matcher.type} #${i}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
    } // end of `for (const pageUrl of urls)` loop

    // Post-filter 1: drop "components" with no visible styling — just
    // text on a default block counts as nothing. Buttons / chips / cards
    // / inputs MUST have at least one of: solid background, visible
    // border, or a non-zero border-radius. This kills the common
    // STATUS_CHIP false-positives where a whole hero SECTION gets
    // matched because its container div happened to have `.status-*`
    // on a descendant.
    const hasVisibleStyling = (c: ScreenshotedComponent): boolean => {
      const s = c.extractedStyles;
      const bg = (s.background ?? "").replace(/\s+/g, "");
      const solidBg =
        bg.length > 0 && bg !== "transparent" && !bg.endsWith(",0)") && !bg.endsWith(",0.0)");
      const radiusPx = parseFloat((s.borderRadius ?? "0").replace(/[^0-9.]/g, ""));
      const hasRadius = Number.isFinite(radiusPx) && radiusPx > 0;
      const borderStr = (s.border ?? "").toLowerCase();
      const hasBorder = borderStr.length > 0 && !borderStr.startsWith("0px") && borderStr !== "none";
      // Status chips / buttons / cards: must look styled.
      if (c.type === "BUTTON" || c.type === "STATUS_CHIP" || c.type === "PRODUCT_CARD" || c.type === "FORM_INPUT") {
        return solidBg || hasRadius || hasBorder;
      }
      // Icons, nav, quotes — don't require visible styling (a nav is
      // structural, icons are SVG, quotes are typographic).
      return true;
    };
    const styled = out.filter((c) => {
      if (hasVisibleStyling(c)) return true;
      console.log(
        `[component-screenshotter] Dropping unstyled ${c.type} "${c.label}" (no bg / border / radius)`,
      );
      return false;
    });

    // Post-filter 2: style-fingerprint dedup — two cards with identical
    // visual tokens (bg + borderRadius + padding + fontSize + fontWeight
    // + boxShadow) are the SAME component, regardless of what Vision
    // labelled them. Keep the one with highest confidence; drop the
    // rest. Previously duplicates survived cross-page dedup because
    // slightly different rendered sizes hashed to different buckets.
    const fingerprintOf = (c: ScreenshotedComponent): string => {
      const s = c.extractedStyles;
      return [
        c.type,
        (s.background ?? "").replace(/\s+/g, ""),
        s.borderRadius ?? "",
        s.padding ?? "",
        s.fontSize ?? "",
        s.fontWeight ?? "",
        (s.boxShadow ?? "").replace(/\s+/g, " ").trim(),
        (s.border ?? "").replace(/\s+/g, " ").trim(),
      ].join("|");
    };
    const byFingerprint = new Map<string, ScreenshotedComponent>();
    for (const c of styled) {
      const fp = fingerprintOf(c);
      const existing = byFingerprint.get(fp);
      if (!existing || c.confidence > existing.confidence) {
        byFingerprint.set(fp, c);
      }
    }
    const deduped = Array.from(byFingerprint.values());

    // Cap per-type to MAX_PER_TYPE — a link-heavy site with many
    // subpages could otherwise accumulate many variants; we want the
    // top few per type (already confidence-sorted by insertion order
    // + cross-page bumps).
    const perTypeCount = new Map<ComponentType, number>();
    const capped: ScreenshotedComponent[] = [];
    // Sort so higher-confidence entries (repeated on multiple pages)
    // survive the cap first.
    const sorted = [...deduped].sort((a, b) => b.confidence - a.confidence);
    for (const c of sorted) {
      const count = perTypeCount.get(c.type) ?? 0;
      if (count >= MAX_PER_TYPE) continue;
      perTypeCount.set(c.type, count + 1);
      capped.push(c);
    }

    return capped;
  } finally {
    await browser.close();
  }
}


function normaliseStyles(styles: Record<string, string>): ExtractedComponentStyles {
  return {
    background: styles["background-color"] || styles["background"],
    color: styles["color"],
    border: styles["border"],
    borderRadius: styles["border-radius"],
    padding: styles["padding"],
    fontSize: styles["font-size"],
    fontWeight: styles["font-weight"],
    boxShadow: styles["box-shadow"],
    textTransform: styles["text-transform"],
    display: styles["display"],
  };
}

function computeConfidence(styles: Record<string, string>): number {
  const relevant = Object.keys(styles).length;
  // Computed styles always yield many props, so we cap higher here than the
  // DOM extractor would. 3-property minimum ensures the element was genuinely
  // styled (not a plain div).
  return Math.min(0.5 + relevant * 0.05, 1);
}
